"""
Test Live Lambda Session Processing via API Gateway.
Uploads classroom photo to S3, calls POST /sessions, and logs detected bounding boxes,
confidences, and attendance results.
"""

import urllib.request
import json
import boto3
import os

API_URL = "https://h5clkgl1yk.execute-api.ap-southeast-2.amazonaws.com"
BUCKET = "haazri-photos-203814181447-ap-southeast-2"
REGION = "ap-southeast-2"
TEST_IMG = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'test-images', 'class_session_test.jpg')

# 1. Upload class photo to S3
s3 = boto3.client('s3', region_name=REGION)
key = "sessions/live_lecture_session_01.jpg"
print(f"Uploading {TEST_IMG} to s3://{BUCKET}/{key}...")
with open(TEST_IMG, 'rb') as f:
    s3.put_object(Bucket=BUCKET, Key=key, Body=f.read(), ContentType='image/jpeg')

# 2. Call POST /sessions
payload = {
    'classId': 'CLS-102',
    'date': '2026-10-22',
    'slot': '11:15 - 12:15 PM',
    'photoKeys': [key]
}

print(f"Invoking Live Lambda via API Gateway {API_URL}/sessions...")
req = urllib.request.Request(
    f"{API_URL}/sessions",
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST'
)

with urllib.request.urlopen(req) as resp:
    data = json.loads(resp.read().decode('utf-8'))

print("\n--- LIVE SESSION PROCESSING RESULT ---")
print(f"Session ID  : {data.get('sessionId')}")
print(f"Class ID    : {data.get('classId')}")
print(f"Stats       : {data.get('stats')}")
print(f"Detected Faces ({len(data.get('detectedFaces', []))} faces):")
for f in data.get('detectedFaces', []):
    print(f"  - Box: {f.get('boundingBox')}")
    print(f"    Status: {f.get('status')} | Match: {f.get('matchedStudentName')} ({f.get('matchedStudentId')}) | Conf: {f.get('confidence')}%")

print(f"\nRoster Attendance Records ({len(data.get('records', []))} students):")
for r in data.get('records', []):
    print(f"  - {r.get('rollNumber'):<10} {r.get('studentName'):<20} Status: {r.get('status'):<8} Conf: {r.get('confidence')}%")
