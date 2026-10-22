import boto3
from botocore.exceptions import ClientError

sess = boto3.Session(region_name='ap-south-1')
services = ['s3', 'dynamodb', 'cloudformation', 'cognito-idp', 'rekognition', 'lambda', 'iam', 'ses']

print("Auditing permissions for AWS caller...")
for svc in services:
    try:
        c = sess.client(svc)
        if svc == 's3':
            c.list_buckets()
        elif svc == 'dynamodb':
            c.list_tables()
        elif svc == 'cloudformation':
            c.describe_stacks()
        elif svc == 'cognito-idp':
            c.list_user_pools(MaxResults=10)
        elif svc == 'rekognition':
            c.describe_collection(CollectionId='haazri-faces')
        elif svc == 'lambda':
            c.list_functions()
        elif svc == 'iam':
            c.get_user()
        elif svc == 'ses':
            c.list_identities()
        print(f"[{svc.upper()}]: SUCCESS")
    except ClientError as e:
        err = e.response.get('Error', {})
        code = err.get('Code', 'Unknown')
        msg = err.get('Message', '')
        print(f"[{svc.upper()}]: FAILED ({code}) -> {msg}")
    except Exception as e:
        print(f"[{svc.upper()}]: ERROR -> {e}")
