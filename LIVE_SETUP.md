# Haazri - Cloud Face Attendance System (Live AWS Deployment Guide)

This guide documents the architecture, exact commands, credentials setup, verification scripts, and troubleshooting analysis for running **Haazri** in **REAL Live Mode** on AWS.

---

## 1. Live Deployment Information

| Parameter | Live Value |
| :--- | :--- |
| **AWS Region** | `ap-southeast-2` (Sydney) *(Authorized by Org SCP `p-dwjbd35x`)* |
| **CloudFormation Stack** | `haazri` (Status: `CREATE_COMPLETE`) |
| **Cognito User Pool ID** | `ap-southeast-2_mMIaH0rtE` |
| **Cognito Client ID** | `651cibgpsmps0cpi9r48id7cgr` |
| **HTTP API Gateway URL** | `https://h5clkgl1yk.execute-api.ap-southeast-2.amazonaws.com` |
| **S3 Photos Bucket** | `haazri-photos-203814181447-ap-southeast-2` |
| **Rekognition Collection** | `haazri-faces` |
| **Frontend Web App** | `http://localhost:3000/` |

---

## 2. Live Cloud Architecture

- **Cognito User Pool**: Dedicated role groups (`admin`, `teacher`, `student`) with permanent password authorization via `USER_PASSWORD_AUTH`.
- **API Gateway & Lambda**: HTTP API Gateway with CORS routing to 7 serverless functions running Python 3.12:
  - `AuthFunction`: `/me` (Decodes Cognito JWT claims for role routing).
  - `StudentsFunction`: `/students`, `/students/{id}/photos/presign`, `/students/{id}/enroll`, `/students/{id}/faces`, `/students/import`, `/students/{id}/portal`.
  - `ClassesFunction`: `/classes` (CRUD and teacher-specific queries).
  - `SessionsFunction`: `/sessions`, `/sessions/presign`, `/sessions/process`, `/sessions/{id}/confirm`, `/sessions/{id}/attendance/{studentId}`, `/sessions/{id}/assign-face`.
  - `AnalyticsFunction`: `/analytics/overview`, `/analytics/trend`, `/analytics/status-split`, `/analytics/subjects`, `/analytics/heatmap`, `/analytics/defaulters`, `/analytics/confidence`.
  - `SettingsFunction`: `/settings`, `/audit`, `/notifications`, `/alerts/shortage/run`.
  - `AlertsFunction`: Daily EventBridge cron (`cron(0 14 * * ? *)`) checking attendance against statutory cutoff.
- **Biometric Face Recognition**:
  - AWS Rekognition collection: `haazri-faces`.
  - Quality check via `DetectFaces` (`Brightness >= 30`, `Sharpness >= 30`, 1 frontal face).
  - Face cropping with Pillow 12.2.0 binary layer (20% outer bounding box padding).
  - Vector search via `SearchFacesByImage` (`matched >= 90%`, `review 80-89%`, `unknown < 80%`).
  - Perceptual `dHash` duplicate photo detection across historical sessions.
- **DynamoDB Tables**: `haazri-students`, `haazri-classes`, `haazri-sessions`, `haazri-attendance`, `haazri-audit`, `haazri-settings`.
- **S3 Bucket**: Encrypted, block public access enabled, 30-day lifecycle expiration.

---

## 3. Working Commands Reference

### Deploy Infrastructure
```powershell
cd f:\Projects\Cloud\infra
sam build
sam deploy --stack-name haazri --capabilities CAPABILITY_IAM --region ap-southeast-2 --resolve-s3 --no-confirm-changeset
```

### Initialize Database & Rekognition Collection
```powershell
cd f:\Projects\Cloud
python scripts/create_collection.py ap-southeast-2 haazri-faces
python scripts/seed.py --region ap-southeast-2
python scripts/create_users.py
```

### Run Live Tests & Verifications
```powershell
python scripts/verify_live.py
python scripts/test_pipeline.py
python scripts/test_live_session_api.py
python scripts/test_live_cognito_auth.py
```

### Start Frontend Application
```powershell
cd f:\Projects\Cloud\frontend
npm run dev
# App is available at http://localhost:3000/
```

---

## 4. Verification Results

Running `python scripts/verify_live.py` executes an 11-point live infrastructure audit:

```
======================================================================
HAAZRI LIVE MODE INFRASTRUCTURE VERIFICATION
Region: ap-southeast-2 | Stack: haazri
======================================================================
[PASS]  CloudFormation Stack                     Status: CREATE_COMPLETE
[PASS]  DynamoDB: haazri-students                Status: ACTIVE
[PASS]  DynamoDB: haazri-classes                 Status: ACTIVE
[PASS]  DynamoDB: haazri-sessions                Status: ACTIVE
[PASS]  DynamoDB: haazri-attendance              Status: ACTIVE
[PASS]  DynamoDB: haazri-audit                   Status: ACTIVE
[PASS]  DynamoDB: haazri-settings                Status: ACTIVE
[PASS]  Rekognition: haazri-faces                Indexed Faces: 4
[PASS]  S3 Photos Bucket: haazri-photos-203814181447-ap-southeast-2 Accessible
[PASS]  Cognito User Pool: haazri-user-pool      Pool ID: ap-southeast-2_mMIaH0rtE
[PASS]  API Gateway /settings                    HTTP 200
======================================================================
SUMMARY: 11/11 CHECKS PASSED
======================================================================
```

### Live Facial Recognition Results (Lecture Hall Session)
```
--- LIVE SESSION PROCESSING RESULT ---
Session ID  : SES-1792682189
Class ID    : CLS-102 (Database Systems - TE-A)
Stats       : {'totalDetected': 4, 'matchedCount': 4, 'reviewCount': 0, 'unknownCount': 0, 'presentCount': 4, 'absentCount': 1, 'rosterCount': 5}
Detected Faces (4 faces):
  - Box: {'top': 0.3301, 'left': 0.5815, 'width': 0.0859, 'height': 0.1948}
    Status: matched | Match: Rohan Kulkarni (TE-A-03) | Conf: 100.0%
  - Box: {'top': 0.3558, 'left': 0.8212, 'width': 0.0693, 'height': 0.1789}
    Status: matched | Match: Pooja Nair (TE-A-04) | Conf: 100.0%
  - Box: {'top': 0.3270, 'left': 0.3441, 'width': 0.0564, 'height': 0.1308}
    Status: matched | Match: Ananya Patel (TE-A-02) | Conf: 100.0%
  - Box: {'top': 0.3517, 'left': 0.1094, 'width': 0.0809, 'height': 0.1879}
    Status: matched | Match: Aarav Sharma (TE-A-01) | Conf: 100.0%

Roster Attendance Records:
  - TE-A-01    Aarav Sharma         Status: present  Conf: 100%
  - TE-A-02    Ananya Patel         Status: present  Conf: 100%
  - TE-A-03    Rohan Kulkarni       Status: present  Conf: 100%
  - TE-A-04    Pooja Nair           Status: present  Conf: 100%
  - TE-A-05    Vikram Deshmukh      Status: absent   Conf: 0%
```

---

## 5. Troubleshooting & Root Cause Analysis

### 1. AWS Organization Region Lockdown (SCP `p-dwjbd35x`)
- **Symptom**: Every API call in `ap-south-1` failed with `with an explicit deny in a service control policy: arn:aws:organizations::669242775691:policy/o-qy09mc2k5g/service_control_policy/p-dwjbd35x`.
- **Root Cause**: The parent AWS Organization (`669242775691`) enforces a regional compliance SCP. We executed `iam:SimulatePrincipalPolicy` across 20 AWS regions and identified that `ap-south-1` is blocked by the SCP, while `ap-southeast-2` is 100% authorized for all services.
- **Solution**: Deployed infrastructure to `ap-southeast-2` where all 9 services work with full permissions.

### 2. DynamoDB `Float types are not supported`
- **Symptom**: `HTTP 500: Internal Server Error` during `POST /sessions`. CloudWatch logs reported: `Sessions pipeline error: Float types are not supported. Use Decimal types instead`.
- **Root Cause**: Boto3's DynamoDB resource rejects standard Python `float` values (found in Rekognition's bounding box coordinates and confidences).
- **Solution**: Created a recursive serializer `to_dynamo()` in `backend/functions/sessions/handler.py` that converts all floats into `Decimal(str(round(val, 4)))` prior to `put_item`.

### 3. Pillow Layer Binary Compatibility
- **Symptom**: Pillow requires C-extension binaries compiled for Amazon Linux 2023 x86_64.
- **Solution**: Downloaded and unpacked a prebuilt `manylinux_2_28_x86_64` wheel for Python 3.12 into `infra/layers/pillow/python/`, packaged as `AWS::Serverless::LayerVersion`.

### 4. Direct Base64 / S3 Presigned Upload Support
- **Symptom**: If the frontend submits raw base64 data URLs without pre-uploading to S3, the backend would fail to locate S3 keys.
- **Solution**: Enhanced both `students` and `sessions` handlers to support dual ingestion: direct S3 object keys OR base64 data URLs (which Lambda decodes and streams directly to S3 before vector search).

### 5. Cognito Claims Resolution in `/me`
- **Symptom**: Calling `GET /me` without an active API Gateway authorizer returned anonymous user defaults.
- **Solution**: Enhanced `AuthFunction` to parse claims from either API Gateway context OR directly decode the base64 payload of the Bearer JWT token from the `Authorization` header.

### 6. Blank Screen After Scanning Classroom Photo
- **Symptom**: In `TakeAttendancePage.tsx`, clicking "Run Face Recognition" caused the entire screen to turn completely blank once processing finished.
- **Root Cause**:
  1. The default sample classroom photo was set to `'/demo-classroom-1.svg'`. AWS Rekognition only accepts JPEG or PNG; SVG causes image parsing errors.
  2. In `frontend/src/api/client.ts`, `api.sessions.create` returned `{ error: ... }` on failure without throwing, which set `session` to an error object.
  3. In `TakeAttendancePage.tsx`, Step 4 rendered `session.records.filter(...)` and `session.stats.matchedCount` without optional chaining or defensive guards, triggering an uncaught `TypeError: Cannot read properties of undefined (reading 'filter')`. In React 18, unhandled exceptions unmount the entire component tree.
- **Solution**:
  1. Provided a real, high-resolution classroom JPEG at `frontend/public/demo-classroom-1.jpg` and converted it to a base64 DataURL on selection.
  2. Enforced strict `if (!res.ok) throw new Error(...)` error handling in `api.sessions`.
  3. Added comprehensive defensive chaining (`session?.records || []`, `(session.detectedFaces || [])`, `session.stats?.matchedCount ?? 0`).
  4. Wrapped the application with a dedicated `<ErrorBoundary>` component in `frontend/src/App.tsx` to display friendly, styled error diagnostics instead of a blank screen.

### 7. Perceptual dHash Duplicate Check Blocking Re-Scans
- **Symptom**: Submitting the classroom photo again returned `HTTP 400: Anti-Proxy Alert: This exact classroom photo was already submitted for a prior session`.
- **Root Cause**: The duplicate check scanned all historical sessions regardless of whether the previous session was confirmed or an unconfirmed/abandoned draft.
- **Solution**: Updated `backend/functions/sessions/handler.py` to only flag duplicates if the prior session has `status = 'confirmed'` and is not the current active session.

### 8. API Gateway Proxy Parameter Routing on `/sessions/{id}/confirm`
- **Symptom**: `POST /sessions/{id}/confirm` threw `HTTP 500: list index out of range`.
- **Root Cause**: CloudFormation defined the route as `/sessions/{proxy+}`, so the path parameter was named `proxy` (e.g., `'SES-123/confirm'`), not `id`. Boto3 query returned empty items and `items[0]` raised an IndexError.
- **Solution**: Updated `session_id` resolution in `backend/functions/sessions/handler.py` to extract from `path_params['proxy']` or split from `rawPath`, with defensive `.get('Items', [])` checks.

---

## 6. Teardown Instructions

To completely destroy all created resources:
```bash
bash scripts/teardown.sh
```
*(Requires explicit typing of `DELETE-HAAZRI` to prevent accidental deletion).*
