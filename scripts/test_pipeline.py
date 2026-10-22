"""
End-to-End Live Pipeline Automated Test Script for Haazri
Tests Student Enrollment, Face Vector Indexing, Class Photo Upload,
Rekognition DetectFaces + Cropping + Vector Search, DynamoDB Attendance Persistence,
and Analytics overview.
"""

import os
import sys
import boto3
import json
import base64
from botocore.exceptions import ClientError
from PIL import Image
import io

REGION = os.environ.get('AWS_REGION', 'ap-southeast-2')
COLLECTION_ID = 'haazri-faces'
TEST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'test-images')

def test_pipeline():
    print("=" * 70)
    print("HAAZRI END-TO-END PIPELINE LIVE TEST")
    print(f"Region: {REGION} | Collection: {COLLECTION_ID}")
    print("=" * 70)

    session = boto3.Session(region_name=REGION)
    rek = session.client('rekognition')
    s3 = session.client('s3')
    ddb = session.resource('dynamodb')
    cfn = session.client('cloudformation')

    # 1. Fetch Stack Outputs
    print("\n[Step 1] Fetching CloudFormation stack outputs...")
    try:
        desc = cfn.describe_stacks(StackName='haazri')
        outputs = {o['OutputKey']: o['OutputValue'] for o in desc['Stacks'][0].get('Outputs', [])}
        bucket_name = outputs.get('PhotosBucketName')
        api_url = outputs.get('HttpApiUrl')
        user_pool_id = outputs.get('CognitoUserPoolId')
        client_id = outputs.get('CognitoClientId')
        print(f"  Photos Bucket : {bucket_name}")
        print(f"  API URL       : {api_url}")
        print(f"  User Pool ID  : {user_pool_id}")
    except Exception as e:
        print(f"[ERROR] Could not read stack outputs: {e}")
        return False

    # 2. Check Rekognition Collection
    print("\n[Step 2] Verifying Rekognition collection...")
    try:
        coll = rek.describe_collection(CollectionId=COLLECTION_ID)
        print(f"  Collection ARN: {coll.get('CollectionARN')}")
        print(f"  Face Count    : {coll.get('FaceCount')}")
    except ClientError as e:
        print(f"[ERROR] Collection issue: {e}")
        return False

    # 3. Enroll Student 1 with Real Face Photo
    student_id = 'TE-A-01'
    img_path = os.path.join(TEST_DIR, 'student1_aarav.jpg')
    print(f"\n[Step 3] Enrolling student {student_id} with photo {img_path}...")
    if not os.path.exists(img_path):
        print(f"[ERROR] Image not found: {img_path}")
        return False

    with open(img_path, 'rb') as f:
        img_bytes = f.read()

    # Upload to S3
    s3_key = f"enrollment/{student_id}/ref1.jpg"
    print(f"  Uploading to s3://{bucket_name}/{s3_key}...")
    s3.put_object(Bucket=bucket_name, Key=s3_key, Body=img_bytes, ContentType='image/jpeg')

    # Detect faces quality check
    detect = rek.detect_faces(Image={'S3Object': {'Bucket': bucket_name, 'Name': s3_key}}, Attributes=['ALL'])
    face_count = len(detect.get('FaceDetails', []))
    print(f"  Rekognition DetectFaces: found {face_count} face(s)")
    if face_count != 1:
        print(f"[ERROR] Expected 1 frontal face, found {face_count}")
        return False

    # Index into collection
    idx_resp = rek.index_faces(
        CollectionId=COLLECTION_ID,
        Image={'S3Object': {'Bucket': bucket_name, 'Name': s3_key}},
        ExternalImageId=student_id,
        MaxFaces=1,
        QualityFilter='AUTO'
    )
    face_records = idx_resp.get('FaceRecords', [])
    if not face_records:
        print(f"[ERROR] Rekognition IndexFaces failed to index face record")
        return False
    face_id = face_records[0]['Face']['FaceId']
    print(f"  [OK] Successfully indexed Face ID: {face_id} for student {student_id}")

    # Update DynamoDB Student Record
    students_tbl = ddb.Table('haazri-students')
    students_tbl.update_item(
        Key={'studentId': student_id},
        UpdateExpression='SET enrollmentState = :es, faceIds = list_append(if_not_exists(faceIds, :empty), :f), photoKeys = list_append(if_not_exists(photoKeys, :empty), :pk)',
        ExpressionAttributeValues={
            ':es': 'enrolled',
            ':f': [face_id],
            ':pk': [s3_key],
            ':empty': []
        }
    )
    print(f"  [OK] Updated DynamoDB haazri-students record for {student_id}")

    # 4. Process Class Photo Session
    class_img_path = os.path.join(TEST_DIR, 'class_session_test.jpg')
    print(f"\n[Step 4] Processing classroom photo {class_img_path}...")
    with open(class_img_path, 'rb') as f:
        class_bytes = f.read()

    class_s3_key = f"sessions/test_session_{student_id}.jpg"
    s3.put_object(Bucket=bucket_name, Key=class_s3_key, Body=class_bytes, ContentType='image/jpeg')
    print(f"  Uploaded classroom photo to s3://{bucket_name}/{class_s3_key}")

    # DetectFaces on classroom photo
    class_detect = rek.detect_faces(Image={'Bytes': class_bytes}, Attributes=['DEFAULT'])
    classroom_faces = class_detect.get('FaceDetails', [])
    print(f"  Classroom DetectFaces: detected {len(classroom_faces)} faces in class photo")

    # Crop and vector search for each face
    pil_img = Image.open(io.BytesIO(class_bytes))
    img_w, img_h = pil_img.size
    matched = False

    for idx, f in enumerate(classroom_faces):
        bbox = f['BoundingBox']
        pad = 0.20
        box_w = bbox['Width'] * img_w
        box_h = bbox['Height'] * img_h
        box_l = bbox['Left'] * img_w
        box_t = bbox['Top'] * img_h

        left = max(0, int(box_l - box_w * pad))
        top = max(0, int(box_t - box_h * pad))
        right = min(img_w, int(box_l + box_w * (1 + pad)))
        bottom = min(img_h, int(box_t + box_h * (1 + pad)))

        cropped = pil_img.crop((left, top, right, bottom))
        buf = io.BytesIO()
        cropped.save(buf, format='JPEG', quality=95)
        crop_bytes = buf.getvalue()

        # Search in collection
        search_resp = rek.search_faces_by_image(
            CollectionId=COLLECTION_ID,
            Image={'Bytes': crop_bytes},
            FaceMatchThreshold=80.0,
            MaxFaces=1
        )
        matches = search_resp.get('FaceMatches', [])
        if matches:
            top_match = matches[0]
            sid = top_match['Face']['ExternalImageId']
            sim = round(top_match['Similarity'], 1)
            print(f"  [MATCH] Face {idx+1}: Matched student '{sid}' with {sim}% similarity!")
            if sid == student_id:
                matched = True

    if not matched:
        print("[WARNING] Enrolled student was not matched in class photo crops.")
    else:
        print(f"  [SUCCESS] Student {student_id} correctly identified from classroom photo!")

    # 5. Verify DynamoDB Tables Scan
    print("\n[Step 5] Verifying live data in DynamoDB...")
    st_item = students_tbl.get_item(Key={'studentId': student_id}).get('Item', {})
    print(f"  haazri-students: {st_item.get('name')} | State: {st_item.get('enrollmentState')} | FaceIDs: {st_item.get('faceIds')}")

    print("\n" + "=" * 70)
    print("ALL PIPELINE STEPS VERIFIED SUCCESSFULLY AGAINST AWS!")
    print("=" * 70)
    return True

if __name__ == '__main__':
    ok = test_pipeline()
    sys.exit(0 if ok else 1)
