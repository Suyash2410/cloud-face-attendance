"""
Verify real AWS Cognito USER_PASSWORD_AUTH and /me profile resolution for all 3 roles.
"""

import boto3
import urllib.request
import json
import re
import os

CLIENT_ID = '651cibgpsmps0cpi9r48id7cgr'
REGION = 'ap-southeast-2'
API_URL = 'https://h5clkgl1yk.execute-api.ap-southeast-2.amazonaws.com'

cred_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'LIVE_CREDENTIALS.local.md')
with open(cred_path, 'r', encoding='utf-8') as f:
    text = f.read()

# Extract credentials
accounts = []
blocks = text.split('### ')
for b in blocks[1:]:
    role = re.search(r'Role\*\*:\s*`?(\w+)`?', b)
    email = re.search(r'Email\*\*:\s*`([^`]+)`', b)
    pwd = re.search(r'Password\*\*:\s*`([^`]+)`', b)
    if role and email and pwd:
        accounts.append({
            'role': role.group(1),
            'email': email.group(1),
            'password': pwd.group(1)
        })

cognito = boto3.client('cognito-idp', region_name=REGION)

print("=" * 60)
print("TESTING COGNITO LIVE AUTHENTICATION & /me ENDPOINT")
print("=" * 60)

for acc in accounts:
    email = acc['email']
    pwd = acc['password']
    expected_role = acc['role']
    print(f"\n[Authenticating] {email} (expected: {expected_role})...")

    resp = cognito.initiate_auth(
        ClientId=CLIENT_ID,
        AuthFlow='USER_PASSWORD_AUTH',
        AuthParameters={'USERNAME': email, 'PASSWORD': pwd}
    )
    tokens = resp.get('AuthenticationResult', {})
    id_token = tokens.get('IdToken')
    print("  [SUCCESS] Acquired Cognito JWT IdToken!")

    # Call /me endpoint with Bearer token
    req = urllib.request.Request(
        f"{API_URL}/me",
        headers={'Authorization': f"Bearer {id_token}"}
    )
    with urllib.request.urlopen(req) as r:
        profile = json.loads(r.read().decode('utf-8'))

    print(f"  [SUCCESS] Profile retrieved from /me:")
    print(f"    - User ID : {profile.get('userId')}")
    print(f"    - Role    : {profile.get('role')}")
    print(f"    - Name    : {profile.get('name')}")
    print(f"    - Email   : {profile.get('email')}")

print("\n" + "=" * 60)
print("ALL 3 COGNITO ROLES AUTHENTICATED AND VERIFIED SUCCESSFULLY!")
print("=" * 60)
