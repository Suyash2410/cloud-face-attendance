#!/usr/bin/env bash
# Haazri Live Infrastructure Teardown Script
# WARNING: DO NOT RUN THIS SCRIPT UNLESS YOU INTEND TO DESTROY ALL LIVE RESOURCES.

set -e

REGION="${AWS_REGION:-ap-southeast-2}"
STACK_NAME="haazri"
COLLECTION_ID="haazri-faces"

echo "================================================================="
echo "WARNING: DESTRUCTIVE ACTION"
echo "This will permanently delete all Haazri DynamoDB tables, photos,"
echo "biometric facial vectors, Cognito pools, and API Gateway resources."
echo "================================================================="
read -p "Type 'DELETE-HAAZRI' to proceed: " CONFIRM
if [ "$CONFIRM" != "DELETE-HAAZRI" ]; then
    echo "Aborted."
    exit 1
fi

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
PHOTOS_BUCKET="haazri-photos-${ACCOUNT_ID}-${REGION}"
WEB_BUCKET="haazri-web-${ACCOUNT_ID}-${REGION}"

# 1. Empty S3 Photos Bucket
echo "[1/4] Emptying S3 Photos bucket..."
aws s3 rm "s3://${PHOTOS_BUCKET}" --recursive --region "${REGION}" || true

# 2. Empty S3 Web Bucket
echo "[2/4] Emptying S3 Web bucket..."
aws s3 rm "s3://${WEB_BUCKET}" --recursive --region "${REGION}" || true

# 3. Delete Rekognition Collection
echo "[3/4] Deleting Rekognition collection..."
aws rekognition delete-collection --collection-id "${COLLECTION_ID}" --region "${REGION}" || true

# 4. SAM Delete CloudFormation Stack
echo "[4/4] Deleting CloudFormation stack via sam delete..."
sam delete --stack-name "${STACK_NAME}" --region "${REGION}" --no-prompts

echo "Teardown complete."
