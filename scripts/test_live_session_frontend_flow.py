import base64
import json
import urllib.request
import os

API_URL = "https://h5clkgl1yk.execute-api.ap-southeast-2.amazonaws.com"
IMG_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'frontend', 'public', 'demo-classroom-1.jpg')

with open(IMG_PATH, 'rb') as f:
    b64_data = base64.b64encode(f.read()).decode('utf-8')

data_url = f"data:image/jpeg;base64,{b64_data}"

payload = {
    'classId': 'CLS-102',
    'date': '2026-10-22',
    'slot': '11:15 - 12:15 PM',
    'photos': [data_url],
    'isDemo': True
}

print(f"Calling POST {API_URL}/sessions with base64 DataURL (length: {len(data_url)})...")

req = urllib.request.Request(
    f"{API_URL}/sessions",
    data=json.dumps(payload).encode('utf-8'),
    headers={'Content-Type': 'application/json'},
    method='POST'
)

try:
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        print("Success! HTTP", resp.status)
        print("Session ID:", res.get('sessionId'))
        print("Stats:", res.get('stats'))
        print("Detected faces:", len(res.get('detectedFaces', [])))
        for f in res.get('detectedFaces', []):
            print(f"  Face {f['faceId']}: status={f['status']}, name={f.get('matchedStudentName')}, conf={f.get('confidence')}%")
        print("Roster records:", len(res.get('records', [])))
        for r in res.get('records', []):
            print(f"  {r['rollNumber']}: {r['studentName']} -> {r['status']} ({r['confidence']}%)")
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}: {e.read().decode('utf-8')}")
except Exception as ex:
    print("Error:", ex)
