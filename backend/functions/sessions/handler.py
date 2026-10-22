import os
import io
import json
import boto3
import concurrent.futures
from decimal import Decimal
from datetime import datetime, timedelta
from PIL import Image

s3 = boto3.client('s3')
rekognition = boto3.client('rekognition')
dynamodb = boto3.resource('dynamodb')

SESSIONS_TABLE = os.environ.get('SESSIONS_TABLE', 'haazri-sessions')
ATTENDANCE_TABLE = os.environ.get('ATTENDANCE_TABLE', 'haazri-attendance')
CLASSES_TABLE = os.environ.get('CLASSES_TABLE', 'haazri-classes')
STUDENTS_TABLE = os.environ.get('STUDENTS_TABLE', 'haazri-students')
AUDIT_TABLE = os.environ.get('AUDIT_TABLE', 'haazri-audit')
REKOGNITION_COLLECTION = os.environ.get('REKOGNITION_COLLECTION', 'haazri-faces')
PHOTOS_BUCKET = os.environ.get('PHOTOS_BUCKET')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

def to_dynamo(val):
    """Recursively convert float types to Decimal for DynamoDB serialization."""
    if isinstance(val, float):
        return Decimal(str(round(val, 4)))
    elif isinstance(val, dict):
        return {k: to_dynamo(v) for k, v in val.items()}
    elif isinstance(val, list):
        return [to_dynamo(v) for v in val]
    return val

def response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }

def compute_dhash(image, hash_size=8):
    """Compute difference hash (dHash) to detect duplicate class photos."""
    img = image.convert('L').resize((hash_size + 1, hash_size), Image.Resampling.LANCZOS)
    pixels = list(img.getdata())
    diff = []
    for row in range(hash_size):
        for col in range(hash_size):
            pixel_left = pixels[row * (hash_size + 1) + col]
            pixel_right = pixels[row * (hash_size + 1) + col + 1]
            diff.append(pixel_left > pixel_right)
    decimal_value = 0
    hex_string = []
    for index, value in enumerate(diff):
        if value:
            decimal_value += 2 ** (index % 4)
        if (index % 4) == 3:
            hex_string.append(hex(decimal_value)[2:])
            decimal_value = 0
    return ''.join(hex_string)

def crop_face(image, bounding_box, padding=0.20):
    """Crop face from photo with 20% outer padding."""
    img_width, img_height = image.size
    box_width = bounding_box['Width'] * img_width
    box_height = bounding_box['Height'] * img_height
    box_left = bounding_box['Left'] * img_width
    box_top = bounding_box['Top'] * img_height

    pad_w = box_width * padding
    pad_h = box_height * padding

    left = max(0, int(box_left - pad_w))
    top = max(0, int(box_top - pad_h))
    right = min(img_width, int(box_left + box_width + pad_w))
    bottom = min(img_height, int(box_top + box_height + pad_h))

    cropped = image.crop((left, top, right, bottom))
    buffer = io.BytesIO()
    cropped.save(buffer, format="JPEG", quality=95)
    return buffer.getvalue()

def search_crop_in_collection(crop_bytes):
    """Search face vector in Rekognition collection."""
    try:
        resp = rekognition.search_faces_by_image(
            CollectionId=REKOGNITION_COLLECTION,
            Image={'Bytes': crop_bytes},
            FaceMatchThreshold=80.0,
            MaxFaces=1
        )
        matches = resp.get('FaceMatches', [])
        if matches:
            top_match = matches[0]
            return {
                'matched': True,
                'studentId': top_match['Face']['ExternalImageId'],
                'confidence': round(top_match['Similarity'], 1)
            }
    except Exception as e:
        print(f"Error searching face crop: {e}")
    return {'matched': False, 'confidence': 0.0}

def lambda_handler(event, context):
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    path = event.get('rawPath', '')

    if method == 'OPTIONS':
        return response(200, {'ok': True})
    path_params = event.get('pathParameters', {}) or {}
    session_id = path_params.get('id')
    proxy_val = path_params.get('proxy', '')
    if not session_id and proxy_val:
        session_id = proxy_val.split('/')[0]
    if not session_id and '/sessions/' in path:
        session_id = path.split('/sessions/')[1].split('/')[0]

    sessions_tbl = dynamodb.Table(SESSIONS_TABLE)
    attendance_tbl = dynamodb.Table(ATTENDANCE_TABLE)
    classes_tbl = dynamodb.Table(CLASSES_TABLE)
    students_tbl = dynamodb.Table(STUDENTS_TABLE)

    try:
        # 1. Presigned URLs for class photo upload
        if method == 'POST' and '/presign' in path:
            body = json.loads(event.get('body', '{}'))
            count = body.get('count', 1)
            timestamp = int(datetime.utcnow().timestamp())
            urls = []
            keys = []
            for i in range(count):
                key = f"sessions/{timestamp}-{i+1}.jpg"
                put_url = s3.generate_presigned_url(
                    'put_object',
                    Params={'Bucket': PHOTOS_BUCKET, 'Key': key, 'ContentType': 'image/jpeg'},
                    ExpiresIn=300
                )
                urls.append(put_url)
                keys.append(key)
            return response(200, {'uploadUrls': urls, 'photoKeys': keys, 'bucket': PHOTOS_BUCKET})

        # 2. Process Session: Detect, Crop, Vector Search, Match, Anti-Proxy Check
        elif method == 'POST' and ('/process' in path or (path == '/sessions' and method == 'POST')):
            body = json.loads(event.get('body', '{}'))
            class_id = body.get('classId')
            date_str = body.get('date', datetime.utcnow().strftime('%Y-%m-%d'))
            slot_str = body.get('slot', '10:00 - 11:00 AM')
            photo_keys = body.get('photoKeys', [])
            photo_urls = body.get('photoUrls', []) or body.get('photos', [])

            # Support direct base64 data URLs if uploaded from web UI
            if not photo_keys and photo_urls:
                import base64
                photo_keys = []
                now_ts = int(datetime.utcnow().timestamp())
                for p_i, p_str in enumerate(photo_urls):
                    try:
                        raw = p_str
                        if ',' in raw:
                            raw = raw.split(',', 1)[1]
                        b_data = base64.b64decode(raw)
                        p_key = f"sessions/{now_ts}_{p_i+1}.jpg"
                        s3.put_object(Bucket=PHOTOS_BUCKET, Key=p_key, Body=b_data, ContentType='image/jpeg')
                        photo_keys.append(p_key)
                    except Exception as b64_err:
                        print(f"Base64 decode error for session photo {p_i}: {b64_err}")

            # Get Class Details
            class_item = classes_tbl.get_item(Key={'classId': class_id}).get('Item')
            if not class_item:
                return response(404, {'error': f'Class {class_id} not found'})

            roster_student_ids = class_item.get('studentIds', [])
            subject_name = class_item.get('subject', 'General')
            division = class_item.get('division', 'TE-A')

            # Fetch student profiles for roster
            student_map = {}
            for sid in roster_student_ids:
                st = students_tbl.get_item(Key={'studentId': sid}).get('Item')
                if st:
                    student_map[sid] = st

            current_session_id = session_id or f"SES-{int(datetime.utcnow().timestamp())}"
            detected_faces = []
            matched_student_ids = {}
            photo_hashes = []

            # Process each photo
            for p_idx, p_key in enumerate(photo_keys):
                try:
                    obj = s3.get_object(Bucket=PHOTOS_BUCKET, Key=p_key)
                    img_bytes = obj['Body'].read()
                    image = Image.open(io.BytesIO(img_bytes))

                    # 1. Anti-Proxy perceptual dHash check
                    photo_hash = compute_dhash(image)
                    photo_hashes.append(photo_hash)

                    # Check duplicate photo across confirmed historical sessions (for real custom classroom uploads)
                    is_demo = body.get('isDemo', False)
                    if not is_demo:
                        past_sess = sessions_tbl.scan(
                            FilterExpression='contains(photoHashes, :h) AND #st = :conf',
                            ExpressionAttributeNames={'#st': 'status'},
                            ExpressionAttributeValues={':h': photo_hash, ':conf': 'confirmed'}
                        )
                        dup_items = [it for it in past_sess.get('Items', []) if it.get('sessionId') != current_session_id]
                        if dup_items:
                            return response(400, {
                                'error': 'Anti-Proxy Alert: This exact classroom photo was already submitted for a prior confirmed session.'
                            })

                    # 2. DetectFaces
                    detect_resp = rekognition.detect_faces(Image={'Bytes': img_bytes}, Attributes=['DEFAULT'])
                    face_details = detect_resp.get('FaceDetails', [])

                    # 3. Crop Faces & Parallel Search
                    crops = []
                    for f_idx, f in enumerate(face_details):
                        bbox = f['BoundingBox']
                        crop_bytes = crop_face(image, bbox)
                        crops.append((f_idx, bbox, crop_bytes))

                    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as executor:
                        future_to_crop = {
                            executor.submit(search_crop_in_collection, c[2]): c for c in crops
                        }
                        for future in concurrent.futures.as_completed(future_to_crop):
                            f_idx, bbox, _ = future_to_crop[future]
                            res = future.result()
                            conf = res['confidence']

                            status = 'unknown'
                            matched_sid = None
                            matched_name = None

                            if res['matched']:
                                sid = res['studentId']
                                if sid in student_map:
                                    matched_sid = sid
                                    matched_name = student_map[sid].get('name', sid)
                                    if conf >= 90.0:
                                        status = 'matched'
                                        matched_student_ids[sid] = conf
                                    elif conf >= 80.0:
                                        status = 'review'
                                        if sid not in matched_student_ids:
                                            matched_student_ids[sid] = conf

                            detected_faces.append({
                                'faceId': f"face-{p_idx}-{f_idx}",
                                'boundingBox': {
                                    'top': bbox['Top'],
                                    'left': bbox['Left'],
                                    'width': bbox['Width'],
                                    'height': bbox['Height']
                                },
                                'confidence': conf,
                                'matchedStudentId': matched_sid,
                                'matchedStudentName': matched_name,
                                'status': status,
                                'photoIndex': p_idx
                            })
                except Exception as ex:
                    print(f"Error processing image {p_key}: {ex}")

            # Generate Attendance Records for all roster students
            records = []
            now_iso = datetime.utcnow().isoformat() + 'Z'
            present_count = 0
            absent_count = 0

            for sid in roster_student_ids:
                st = student_map.get(sid, {'name': sid})
                if sid in matched_student_ids:
                    conf = matched_student_ids[sid]
                    status = 'present'
                    present_count += 1
                else:
                    conf = 0
                    status = 'absent'
                    absent_count += 1

                rec = {
                    'sessionId': current_session_id,
                    'studentId': sid,
                    'studentName': st.get('name', sid),
                    'rollNumber': sid,
                    'division': division,
                    'subject': subject_name,
                    'date': date_str,
                    'status': status,
                    'confidence': Decimal(str(conf)),
                    'method': 'face',
                    'markedBy': 'Amazon Rekognition',
                    'markedAt': now_iso
                }
                records.append(rec)
                # Save into DynamoDB Attendance Table
                attendance_tbl.put_item(Item=to_dynamo(rec))

            review_count = len([f for f in detected_faces if f['status'] == 'review'])
            unknown_count = len([f for f in detected_faces if f['status'] == 'unknown'])
            matched_count = len([f for f in detected_faces if f['status'] == 'matched'])

            session_record = {
                'classId': class_id,
                'dateSlot': f"{date_str}#{slot_str}",
                'sessionId': current_session_id,
                'subject': subject_name,
                'division': division,
                'date': date_str,
                'slot': slot_str,
                'photoUrls': photo_urls or photo_keys,
                'photoKeys': photo_keys,
                'photoHashes': photo_hashes,
                'status': 'review',
                'stats': {
                    'totalDetected': len(detected_faces),
                    'matchedCount': matched_count,
                    'reviewCount': review_count,
                    'unknownCount': unknown_count,
                    'presentCount': present_count,
                    'absentCount': absent_count,
                    'rosterCount': len(roster_student_ids)
                },
                'detectedFaces': detected_faces,
                'records': records,
                'createdBy': event.get('requestContext', {}).get('authorizer', {}).get('jwt', {}).get('claims', {}).get('sub', 'faculty'),
                'createdByName': class_item.get('teacherName', 'Faculty'),
                'createdAt': now_iso
            }

            sessions_tbl.put_item(Item=to_dynamo(session_record))
            return response(200, session_record)

        # 3. Manual Attendance Override
        elif method == 'PATCH' and '/attendance/' in path:
            student_id = path.split('/attendance/')[1].split('/')[0]
            body = json.loads(event.get('body', '{}'))
            target_status = body.get('status', 'present')
            reason = body.get('reason')
            if not reason:
                return response(400, {'error': 'A mandatory audit reason is required for manual attendance override'})

            # Update Attendance Record
            attendance_tbl.update_item(
                Key={'sessionId': session_id, 'studentId': student_id},
                UpdateExpression='SET #st = :s, #m = :m, reason = :r, markedAt = :ma',
                ExpressionAttributeNames={'#st': 'status', '#m': 'method'},
                ExpressionAttributeValues={
                    ':s': target_status,
                    ':m': 'manual',
                    ':r': reason,
                    ':ma': datetime.utcnow().isoformat() + 'Z'
                }
            )

            # Query updated session
            sess_items = sessions_tbl.scan(
                FilterExpression='sessionId = :sid',
                ExpressionAttributeValues={':sid': session_id}
            ).get('Items', [])
            sess_item = sess_items[0] if sess_items else None

            if sess_item:
                for r in sess_item.get('records', []):
                    if r.get('studentId') == student_id:
                        r['status'] = target_status
                        r['method'] = 'manual'
                        r['reason'] = reason
                sess_item['stats']['presentCount'] = len([r for r in sess_item['records'] if r['status'] in ['present', 'manual']])
                sess_item['stats']['absentCount'] = len([r for r in sess_item['records'] if r['status'] == 'absent'])
                sessions_tbl.put_item(Item=sess_item)

            return response(200, sess_item or {'status': 'updated'})

        # 4. Assign Unknown Face
        elif method == 'POST' and '/assign-face' in path:
            body = json.loads(event.get('body', '{}'))
            face_id = body.get('faceId')
            student_id = body.get('studentId')

            st = students_tbl.get_item(Key={'studentId': student_id}).get('Item', {})
            st_name = st.get('name', student_id)

            # Update attendance table
            attendance_tbl.update_item(
                Key={'sessionId': session_id, 'studentId': student_id},
                UpdateExpression='SET #st = :s, #m = :m, reason = :r, confidence = :c',
                ExpressionAttributeNames={'#st': 'status', '#m': 'method'},
                ExpressionAttributeValues={
                    ':s': 'present',
                    ':m': 'manual',
                    ':r': 'Assigned from unknown detected face by teacher',
                    ':c': Decimal('90.0')
                }
            )

            # Update session record
            sess_items = sessions_tbl.scan(
                FilterExpression='sessionId = :sid',
                ExpressionAttributeValues={':sid': session_id}
            ).get('Items', [])
            sess_item = sess_items[0] if sess_items else None

            if sess_item:
                for f in sess_item.get('detectedFaces', []):
                    if f.get('faceId') == face_id:
                        f['matchedStudentId'] = student_id
                        f['matchedStudentName'] = st_name
                        f['status'] = 'matched'
                for r in sess_item.get('records', []):
                    if r.get('studentId') == student_id:
                        r['status'] = 'present'
                        r['method'] = 'manual'
                        r['confidence'] = Decimal('90.0')
                sessions_tbl.put_item(Item=sess_item)

            return response(200, sess_item or {'status': 'assigned'})

        # 5. Confirm Session
        elif method == 'POST' and '/confirm' in path:
            sess_items = sessions_tbl.scan(
                FilterExpression='sessionId = :sid',
                ExpressionAttributeValues={':sid': session_id}
            ).get('Items', [])

            if not sess_items:
                return response(404, {'error': f'Session {session_id} not found'})
            sess_item = sess_items[0]

            now = datetime.utcnow()
            deadline = now + timedelta(hours=24)
            sess_item['status'] = 'confirmed'
            sess_item['confirmedAt'] = now.isoformat() + 'Z'
            sess_item['editDeadline'] = deadline.isoformat() + 'Z'

            sessions_tbl.put_item(Item=sess_item)

            # Increment class totalSessions
            try:
                classes_tbl.update_item(
                    Key={'classId': sess_item['classId']},
                    UpdateExpression='ADD totalSessions :one',
                    ExpressionAttributeValues={':one': 1}
                )
            except Exception as ex:
                print(f"Update class totalSessions error: {ex}")

            return response(200, sess_item)

        # 6. List Sessions
        elif method == 'GET' and not session_id:
            query_params = event.get('queryStringParameters', {}) or {}
            class_id = query_params.get('classId')
            if class_id:
                res = sessions_tbl.query(
                    KeyConditionExpression='classId = :c',
                    ExpressionAttributeValues={':c': class_id}
                )
            else:
                res = sessions_tbl.scan()
            items = res.get('Items', [])
            items.sort(key=lambda s: s.get('date', ''), reverse=True)
            return response(200, items)

        # 7. Get Single Session
        elif method == 'GET' and session_id:
            res = sessions_tbl.scan(
                FilterExpression='sessionId = :sid',
                ExpressionAttributeValues={':sid': session_id}
            )
            items = res.get('Items', [])
            if not items:
                return response(404, {'error': f'Session {session_id} not found'})
            return response(200, items[0])

        return response(404, {'message': f'Route not found: {method} {path}'})

    except Exception as e:
        print(f"Sessions pipeline error: {e}")
        return response(500, {'error': str(e)})
