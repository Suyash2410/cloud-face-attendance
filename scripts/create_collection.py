"""
Ensure the AWS Rekognition collection 'haazri-faces' exists in region ap-south-1.
"""

import sys
import boto3
from botocore.exceptions import ClientError

def ensure_collection(collection_id='haazri-faces', region='ap-south-1'):
    client = boto3.client('rekognition', region_name=region)
    print(f"Checking Rekognition collection '{collection_id}' in region {region}...")
    try:
        resp = client.describe_collection(CollectionId=collection_id)
        print(f"[OK] Collection '{collection_id}' exists. Face count: {resp.get('FaceCount', 0)}, ARN: {resp.get('CollectionARN')}")
        return True
    except ClientError as e:
        code = e.response.get('Error', {}).get('Code')
        if code == 'ResourceNotFoundException':
            print(f"Collection '{collection_id}' not found. Creating it now...")
            create_resp = client.create_collection(CollectionId=collection_id)
            print(f"[CREATED] Collection created successfully! ARN: {create_resp.get('CollectionArn')}")
            return True
        else:
            print(f"[ERROR] Failed to check/create collection: {e}")
            return False

if __name__ == '__main__':
    region = sys.argv[1] if len(sys.argv) > 1 else 'ap-south-1'
    collection = sys.argv[2] if len(sys.argv) > 2 else 'haazri-faces'
    success = ensure_collection(collection, region)
    sys.exit(0 if success else 1)
