"""
Enroll remaining test students TE-A-02, TE-A-03, TE-A-04 into Rekognition collection haazri-faces.
"""

import os
import boto3

REGION = 'ap-southeast-2'
BUCKET = 'haazri-photos-203814181447-ap-southeast-2'
COLLECTION = 'haazri-faces'
TEST_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'test-images')

session = boto3.Session(region_name=REGION)
s3 = session.client('s3')
rek = session.client('rekognition')
ddb = session.resource('dynamodb')
students_tbl = ddb.Table('haazri-students')

students = [
    ('TE-A-02', 'student2_ananya.jpg'),
    ('TE-A-03', 'student3_rohan.jpg'),
    ('TE-A-04', 'student4_pooja.jpg')
]

for sid, img_name in students:
    path = os.path.join(TEST_DIR, img_name)
    with open(path, 'rb') as f:
        img_bytes = f.read()

    s3_key = f"enrollment/{sid}/ref.jpg"
    s3.put_object(Bucket=BUCKET, Key=s3_key, Body=img_bytes, ContentType='image/jpeg')

    resp = rek.index_faces(
        CollectionId=COLLECTION,
        Image={'S3Object': {'Bucket': BUCKET, 'Name': s3_key}},
        ExternalImageId=sid,
        MaxFaces=1,
        QualityFilter='AUTO'
    )
    face_id = resp['FaceRecords'][0]['Face']['FaceId']
    print(f"Indexed {sid} ({img_name}) -> FaceId: {face_id}")

    students_tbl.update_item(
        Key={'studentId': sid},
        UpdateExpression='SET enrollmentState = :es, faceIds = :f, photoKeys = :pk',
        ExpressionAttributeValues={
            ':es': 'enrolled',
            ':f': [face_id],
            ':pk': [s3_key]
        }
    )

print("All test students enrolled successfully.")
