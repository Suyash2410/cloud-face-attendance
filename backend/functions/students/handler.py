import json
import os
import boto3
from decimal import Decimal
from datetime import datetime

dynamodb = boto3.resource('dynamodb')
rekognition = boto3.client('rekognition')
s3 = boto3.client('s3')

STUDENTS_TABLE = os.environ.get('STUDENTS_TABLE', 'haazri-students')
ATTENDANCE_TABLE = os.environ.get('ATTENDANCE_TABLE', 'haazri-attendance')
CLASSES_TABLE = os.environ.get('CLASSES_TABLE', 'haazri-classes')
REKOGNITION_COLLECTION = os.environ.get('REKOGNITION_COLLECTION', 'haazri-faces')
PHOTOS_BUCKET = os.environ.get('PHOTOS_BUCKET')

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

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

def lambda_handler(event, context):
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    path = event.get('rawPath', '')

    if method == 'OPTIONS':
        return response(200, {'ok': True})
    path_params = event.get('pathParameters', {}) or {}
    table = dynamodb.Table(STUDENTS_TABLE)

    try:
        student_id = path_params.get('id')

        # 1. Presigned Upload URL for student photo
        if method == 'POST' and '/photos/presign' in path:
            body = json.loads(event.get('body', '{}'))
            filename = body.get('filename', f'{int(datetime.utcnow().timestamp())}.jpg')
            key = f"enrollment/{student_id}/{filename}"
            
            presigned_url = s3.generate_presigned_url(
                'put_object',
                Params={
                    'Bucket': PHOTOS_BUCKET,
                    'Key': key,
                    'ContentType': body.get('contentType', 'image/jpeg')
                },
                ExpiresIn=300
            )
            return response(200, {
                'uploadUrl': presigned_url,
                'photoKey': key,
                'bucket': PHOTOS_BUCKET
            })

        # 2. Quality Gate & IndexFaces
        elif method == 'POST' and '/enroll' in path:
            body = json.loads(event.get('body', '{}'))
            photo_keys = body.get('photoKeys', [])
            if not photo_keys and body.get('photoKey'):
                photo_keys = [body.get('photoKey')]

            # Support direct base64 data URLs if uploaded from web UI
            photos_data = body.get('photos', [])
            if not photo_keys and photos_data:
                import base64
                photo_keys = []
                now_ts = int(datetime.utcnow().timestamp())
                for p_i, p_str in enumerate(photos_data):
                    try:
                        raw = p_str
                        if ',' in raw:
                            raw = raw.split(',', 1)[1]
                        b_data = base64.b64decode(raw)
                        p_key = f"enrollment/{student_id}/{now_ts}_{p_i+1}.jpg"
                        s3.put_object(Bucket=PHOTOS_BUCKET, Key=p_key, Body=b_data, ContentType='image/jpeg')
                        photo_keys.append(p_key)
                    except Exception as b64_err:
                        print(f"Base64 decode error for photo {p_i}: {b64_err}")

            if not photo_keys:
                return response(400, {'error': 'No valid photoKeys or photos provided for enrollment'})

            indexed_face_ids = []
            for key in photo_keys:
                # Rekognition DetectFaces Quality Check
                detect_resp = rekognition.detect_faces(
                    Image={'S3Object': {'Bucket': PHOTOS_BUCKET, 'Name': key}},
                    Attributes=['ALL']
                )
                details = detect_resp.get('FaceDetails', [])
                if len(details) != 1:
                    return response(400, {
                        'error': f'Quality check failed for {key}: Exactly 1 frontal face must be present (found {len(details)}).'
                    })

                face_qual = details[0].get('Quality', {})
                if face_qual.get('Brightness', 100) < 30 or face_qual.get('Sharpness', 100) < 30:
                    return response(400, {
                        'error': f'Quality check failed for {key}: Face image is too blurry or low contrast.'
                    })

                # Index Face into Rekognition Collection
                index_resp = rekognition.index_faces(
                    CollectionId=REKOGNITION_COLLECTION,
                    Image={'S3Object': {'Bucket': PHOTOS_BUCKET, 'Name': key}},
                    ExternalImageId=student_id,
                    DetectionAttributes=['DEFAULT'],
                    MaxFaces=1,
                    QualityFilter='AUTO'
                )
                records = index_resp.get('FaceRecords', [])
                if records:
                    indexed_face_ids.append(records[0]['Face']['FaceId'])

            now_iso = datetime.utcnow().isoformat() + 'Z'
            # Update DynamoDB Student Record
            table.update_item(
                Key={'studentId': student_id},
                UpdateExpression='SET enrollmentState = :es, faceIds = list_append(if_not_exists(faceIds, :empty), :f), photoKeys = list_append(if_not_exists(photoKeys, :empty), :pk), consentAt = :ca',
                ExpressionAttributeValues={
                    ':es': 'enrolled',
                    ':f': indexed_face_ids,
                    ':pk': photo_keys,
                    ':ca': now_iso,
                    ':empty': []
                }
            )
            updated_student = table.get_item(Key={'studentId': student_id}).get('Item', {})
            return response(200, updated_student)

        # 3. Purge Face Vectors
        elif method == 'DELETE' and '/faces' in path:
            item = table.get_item(Key={'studentId': student_id}).get('Item', {})
            face_ids = item.get('faceIds', [])
            if face_ids:
                try:
                    rekognition.delete_faces(
                        CollectionId=REKOGNITION_COLLECTION,
                        FaceIds=face_ids
                    )
                except Exception as ex:
                    print(f"DeleteFaces warning: {ex}")

            table.update_item(
                Key={'studentId': student_id},
                UpdateExpression='SET enrollmentState = :es, faceIds = :empty, photoKeys = :empty REMOVE consentAt',
                ExpressionAttributeValues={
                    ':es': 'not_enrolled',
                    ':empty': []
                }
            )
            updated = table.get_item(Key={'studentId': student_id}).get('Item', {})
            return response(200, updated)

        # 4. Student Portal Telemetry
        elif method == 'GET' and '/portal' in path:
            student = table.get_item(Key={'studentId': student_id}).get('Item')
            if not student:
                return response(404, {'message': f'Student {student_id} not found'})

            # Query attendance history via GSI on Attendance table
            att_table = dynamodb.Table(ATTENDANCE_TABLE)
            # Scan or query student records
            att_resp = att_table.scan(
                FilterExpression='studentId = :s',
                ExpressionAttributeValues={':s': student_id}
            )
            records = att_resp.get('Items', [])

            # Aggregate by subject
            classes_tbl = dynamodb.Table(CLASSES_TABLE)
            classes = classes_tbl.scan().get('Items', [])
            
            subject_map = {}
            for cls in classes:
                if student_id in cls.get('studentIds', []):
                    subject_map[cls['subject']] = {'present': 0, 'total': 0}

            history = []
            for r in records:
                subj = r.get('subject', 'General')
                if subj not in subject_map:
                    subject_map[subj] = {'present': 0, 'total': 0}
                subject_map[subj]['total'] += 1
                if r.get('status') in ['present', 'manual']:
                    subject_map[subj]['present'] += 1
                history.append({
                    'date': r.get('date', ''),
                    'subject': subj,
                    'status': r.get('status', 'absent'),
                    'method': r.get('method', 'face')
                })

            subjects_list = []
            for subj, data in subject_map.items():
                tot = data['total']
                pres = data['present']
                rate = round((pres / tot) * 100) if tot > 0 else 100
                is_short = rate < 75
                missable = max(0, int((pres - 0.75 * tot) / 0.75)) if not is_short else 0
                needed = max(0, int(round((0.75 * tot - pres) / 0.25))) if is_short else 0
                subjects_list.append({
                    'subject': subj,
                    'present': pres,
                    'total': tot,
                    'rate': rate,
                    'isShortage': is_short,
                    'missable': missable,
                    'needed': needed
                })

            total_sess = sum(s['total'] for s in subjects_list)
            total_pres = sum(s['present'] for s in subjects_list)
            overall_rate = round((total_pres / total_sess) * 100) if total_sess > 0 else 100

            return response(200, {
                'student': student,
                'overallRate': overall_rate,
                'isShortage': overall_rate < 75,
                'subjects': subjects_list,
                'history': history[-20:]
            })

        # 5. Bulk CSV Import
        elif method == 'POST' and '/import' in path:
            body = json.loads(event.get('body', '{}'))
            imported_students = body.get('students', [])
            added = 0
            errors = []
            for idx, s in enumerate(imported_students):
                sid = s.get('studentId')
                if not sid:
                    errors.append(f"Row {idx+1}: Missing studentId")
                    continue
                # Check duplicate
                existing = table.get_item(Key={'studentId': sid}).get('Item')
                if existing:
                    errors.append(f"Row {idx+1}: Duplicate roll number '{sid}'")
                    continue
                s.setdefault('enrollmentState', 'not_enrolled')
                s.setdefault('faceIds', [])
                s.setdefault('photoKeys', [])
                s.setdefault('createdAt', datetime.utcnow().isoformat() + 'Z')
                table.put_item(Item=s)
                added += 1

            return response(200, {'added': added, 'errors': errors})

        # 6. Single Student CRUD
        elif method == 'GET' and student_id:
            res = table.get_item(Key={'studentId': student_id})
            item = res.get('Item')
            if not item:
                return response(404, {'message': f'Student {student_id} not found'})
            return response(200, item)

        elif method == 'GET':
            res = table.scan()
            items = res.get('Items', [])
            return response(200, items)

        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            sid = body.get('studentId')
            if not sid:
                return response(400, {'error': 'studentId is required'})
            existing = table.get_item(Key={'studentId': sid}).get('Item')
            if existing:
                return response(400, {'error': f"Student '{sid}' already exists"})

            body.setdefault('enrollmentState', 'not_enrolled')
            body.setdefault('faceIds', [])
            body.setdefault('photoKeys', [])
            body.setdefault('createdAt', datetime.utcnow().isoformat() + 'Z')
            body.setdefault('avatarUrl', f"https://api.dicebear.com/7.x/notionists/svg?seed={body.get('name', sid)}&backgroundColor=f5f0e6")
            table.put_item(Item=body)
            return response(201, body)

        elif method == 'PUT' and student_id:
            body = json.loads(event.get('body', '{}'))
            update_expr = []
            expr_names = {}
            expr_vals = {}
            for k, v in body.items():
                if k != 'studentId':
                    attr_name = f"#{k}"
                    attr_val = f":{k}"
                    update_expr.append(f"{attr_name} = {attr_val}")
                    expr_names[attr_name] = k
                    expr_vals[attr_val] = v

            if update_expr:
                res = table.update_item(
                    Key={'studentId': student_id},
                    UpdateExpression='SET ' + ', '.join(update_expr),
                    ExpressionAttributeNames=expr_names,
                    ExpressionAttributeValues=expr_vals,
                    ReturnValues='ALL_NEW'
                )
                return response(200, res.get('Attributes', {}))
            return response(200, {'studentId': student_id})

        elif method == 'DELETE' and student_id:
            # Purge face vectors first
            item = table.get_item(Key={'studentId': student_id}).get('Item', {})
            face_ids = item.get('faceIds', [])
            if face_ids:
                try:
                    rekognition.delete_faces(CollectionId=REKOGNITION_COLLECTION, FaceIds=face_ids)
                except Exception as ex:
                    print(f"Error purging faces: {ex}")
            table.delete_item(Key={'studentId': student_id})
            return response(200, {'message': f'Student {student_id} deleted and faces purged'})

        return response(404, {'message': f'Route not found: {method} {path}'})

    except Exception as e:
        print(f"Students error: {e}")
        return response(500, {'error': str(e)})
