"""
Create permanent Cognito users for Admin, Teacher, and Student roles in Haazri.
Saves credentials ONLY to LIVE_CREDENTIALS.local.md (gitignored).
"""

import boto3
import secrets
import string
import os

REGION = 'ap-southeast-2'
POOL_ID = 'ap-southeast-2_mMIaH0rtE'
CLIENT_ID = '651cibgpsmps0cpi9r48id7cgr'

def generate_strong_password(length=14):
    chars = string.ascii_letters + string.digits + "!@#$%^&*"
    # Ensure at least 1 upper, 1 lower, 1 digit
    while True:
        pwd = ''.join(secrets.choice(chars) for _ in range(length))
        if any(c.isupper() for c in pwd) and any(c.islower() for c in pwd) and any(c.isdigit() for c in pwd):
            return pwd

def main():
    cognito = boto3.client('cognito-idp', region_name=REGION)

    users = [
        {
            'email': 'admin@haazri.edu',
            'name': 'Dr. Hemant Bhargava',
            'role': 'admin',
            'password': generate_strong_password()
        },
        {
            'email': 'teacher@haazri.edu',
            'name': 'Prof. Sunita Kulkarni',
            'role': 'teacher',
            'password': generate_strong_password()
        },
        {
            'email': 'student@haazri.edu',
            'name': 'Aarav Sharma',
            'role': 'student',
            'password': generate_strong_password(),
            'studentId': 'TE-A-01'
        }
    ]

    print("Creating Cognito users...")
    for u in users:
        email = u['email']
        print(f"Provisioning {email} (Role: {u['role']})...")
        attrs = [
            {'Name': 'email', 'Value': email},
            {'Name': 'email_verified', 'Value': 'true'},
            {'Name': 'name', 'Value': u['name']}
        ]

        try:
            cognito.admin_create_user(
                UserPoolId=POOL_ID,
                Username=email,
                UserAttributes=attrs,
                MessageAction='SUPPRESS'
            )
        except cognito.exceptions.UsernameExistsException:
            print(f"User {email} already exists, updating password...")

        cognito.admin_set_user_password(
            UserPoolId=POOL_ID,
            Username=email,
            Password=u['password'],
            Permanent=True
        )

        cognito.admin_add_user_to_group(
            UserPoolId=POOL_ID,
            Username=email,
            GroupName=u['role']
        )
        print(f"[OK] {email} created and assigned to group '{u['role']}'.")

    # Write to LIVE_CREDENTIALS.local.md
    cred_file = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'LIVE_CREDENTIALS.local.md')
    with open(cred_file, 'w', encoding='utf-8') as f:
        f.write("# Haazri Live Mode Access Credentials\n\n")
        f.write("> **CONFIDENTIAL**: Do not commit this file to version control.\n\n")
        f.write(f"- **Region**: `{REGION}`\n")
        f.write(f"- **Cognito User Pool ID**: `{POOL_ID}`\n")
        f.write(f"- **Cognito App Client ID**: `{CLIENT_ID}`\n\n")
        f.write("## Live User Accounts\n\n")
        for u in users:
            f.write(f"### {u['role'].capitalize()} Account\n")
            f.write(f"- **Name**: {u['name']}\n")
            f.write(f"- **Email**: `{u['email']}`\n")
            f.write(f"- **Password**: `{u['password']}`\n")
            f.write(f"- **Role**: `{u['role']}`\n\n")

    print(f"All live credentials securely saved to {cred_file}")

if __name__ == '__main__':
    main()
