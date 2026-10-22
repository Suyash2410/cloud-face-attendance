import json
import os
import boto3
import base64
from decimal import Decimal

def extract_claims(event):
    """Extract claims from API Gateway authorizer or directly from Bearer JWT token."""
    authorizer = event.get('requestContext', {}).get('authorizer', {})
    claims = authorizer.get('jwt', {}).get('claims')
    if claims:
        return claims

    headers = event.get('headers', {})
    auth_header = headers.get('authorization') or headers.get('Authorization', '')
    if auth_header.startswith('Bearer '):
        token = auth_header[7:].strip()
        parts = token.split('.')
        if len(parts) == 3:
            payload = parts[1] + '=' * (-len(parts[1]) % 4)
            try:
                return json.loads(base64.urlsafe_b64decode(payload).decode('utf-8'))
            except Exception as e:
                print(f"Error parsing token payload: {e}")
    return {}

def lambda_handler(event, context):
    """GET /me: Returns authenticated user profile extracted from Cognito JWT claims."""
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
                'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
            },
            'body': json.dumps({'ok': True})
        }

    claims = extract_claims(event)
    
    groups = claims.get('cognito:groups', [])
    if isinstance(groups, str):
        groups = [groups]
    
    role = 'student'
    if 'admin' in groups:
        role = 'admin'
    elif 'teacher' in groups:
        role = 'teacher'
    elif 'student' in groups:
        role = 'student'

    email = claims.get('email', '')
    name = claims.get('name', email.split('@')[0] if email else 'User')
    user_id = claims.get('sub', 'unknown')
    
    # If student, link studentId if present in custom attribute or derived from roll
    linked_student_id = claims.get('custom:studentId')
    if not linked_student_id and role == 'student':
        linked_student_id = email.split('@')[0].upper()

    user_profile = {
        'userId': user_id,
        'role': role,
        'name': name,
        'email': email,
        'linkedStudentId': linked_student_id,
        'avatarUrl': f"https://api.dicebear.com/7.x/notionists/svg?seed={name}&backgroundColor=f5f0e6"
    }

    return {
        'statusCode': 200,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        },
        'body': json.dumps(user_profile)
    }
