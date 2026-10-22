"""
Comprehensive Live Mode Verification Script for Haazri
Checks CloudFormation Stack, S3 Bucket, Rekognition Collection, DynamoDB Tables, API Gateway, and Cognito.
Prints a structured PASS/FAIL checklist.
"""

import sys
import os
import boto3
import urllib.request
import json
from botocore.exceptions import ClientError

REGION = os.environ.get('AWS_REGION', 'ap-southeast-2')
STACK_NAME = 'haazri'
COLLECTION_ID = 'haazri-faces'

TABLES = [
    'haazri-students',
    'haazri-classes',
    'haazri-sessions',
    'haazri-attendance',
    'haazri-audit',
    'haazri-settings'
]

def check(name, success, detail=""):
    mark = "[PASS]" if success else "[FAIL]"
    print(f"{mark:<7} {name:<40} {detail}")
    return success

def main():
    print("=" * 70)
    print("HAAZRI LIVE MODE INFRASTRUCTURE VERIFICATION")
    print(f"Region: {REGION} | Stack: {STACK_NAME}")
    print("=" * 70)

    cfn = boto3.client('cloudformation', region_name=REGION)
    s3 = boto3.client('s3', region_name=REGION)
    rek = boto3.client('rekognition', region_name=REGION)
    ddb = boto3.client('dynamodb', region_name=REGION)
    cognito = boto3.client('cognito-idp', region_name=REGION)

    results = []

    # 1. CloudFormation Stack
    try:
        stacks = cfn.describe_stacks(StackName=STACK_NAME).get('Stacks', [])
        if stacks:
            st = stacks[0]
            status = st['StackStatus']
            results.append(check("CloudFormation Stack", status in ['CREATE_COMPLETE', 'UPDATE_COMPLETE'], f"Status: {status}"))
            outputs = {o['OutputKey']: o['OutputValue'] for o in st.get('Outputs', [])}
        else:
            results.append(check("CloudFormation Stack", False, "Stack not found"))
            outputs = {}
    except Exception as e:
        results.append(check("CloudFormation Stack", False, str(e)))
        outputs = {}

    # 2. DynamoDB Tables
    for tbl in TABLES:
        try:
            desc = ddb.describe_table(TableName=tbl)
            t_status = desc['Table']['TableStatus']
            results.append(check(f"DynamoDB: {tbl}", t_status == 'ACTIVE', f"Status: {t_status}"))
        except Exception as e:
            results.append(check(f"DynamoDB: {tbl}", False, str(e)))

    # 3. Rekognition Collection
    try:
        coll = rek.describe_collection(CollectionId=COLLECTION_ID)
        face_count = coll.get('FaceCount', 0)
        results.append(check(f"Rekognition: {COLLECTION_ID}", True, f"Indexed Faces: {face_count}"))
    except Exception as e:
        results.append(check(f"Rekognition: {COLLECTION_ID}", False, str(e)))

    # 4. S3 Bucket
    bucket_name = outputs.get('PhotosBucketName')
    if bucket_name:
        try:
            s3.head_bucket(Bucket=bucket_name)
            results.append(check(f"S3 Photos Bucket: {bucket_name}", True, "Accessible"))
        except Exception as e:
            results.append(check(f"S3 Photos Bucket: {bucket_name}", False, str(e)))
    else:
        results.append(check("S3 Photos Bucket", False, "Output PhotosBucketName not found in stack"))

    # 5. Cognito User Pool
    pool_id = outputs.get('CognitoUserPoolId')
    client_id = outputs.get('CognitoClientId')
    if pool_id:
        try:
            pool = cognito.describe_user_pool(UserPoolId=pool_id)
            p_name = pool['UserPool']['Name']
            results.append(check(f"Cognito User Pool: {p_name}", True, f"Pool ID: {pool_id}"))
        except Exception as e:
            results.append(check(f"Cognito User Pool: {pool_id}", False, str(e)))
    else:
        results.append(check("Cognito User Pool", False, "Output CognitoUserPoolId not found in stack"))

    # 6. HTTP API Gateway Endpoint Health
    api_url = outputs.get('HttpApiUrl')
    if api_url:
        try:
            req = urllib.request.Request(f"{api_url}/settings")
            with urllib.request.urlopen(req, timeout=10) as resp:
                results.append(check("API Gateway /settings", resp.status == 200, f"HTTP {resp.status}"))
        except Exception as e:
            results.append(check("API Gateway /settings", False, str(e)))
    else:
        results.append(check("API Gateway", False, "Output HttpApiUrl not found in stack"))

    print("=" * 70)
    passed = sum(results)
    total = len(results)
    print(f"SUMMARY: {passed}/{total} CHECKS PASSED")
    print("=" * 70)
    sys.exit(0 if passed == total else 1)

if __name__ == '__main__':
    main()
