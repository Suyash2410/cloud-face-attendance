import boto3

iam = boto3.client('iam')
regions = [
    'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
    'ap-south-1', 'ap-south-2', 'ap-southeast-1', 'ap-southeast-2',
    'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
    'eu-central-1', 'eu-west-1', 'eu-west-2', 'eu-west-3', 'eu-north-1',
    'ca-central-1', 'sa-east-1', 'me-south-1', 'af-south-1'
]

print("Testing which regions are allowed by the SCP...")
for r in regions:
    resp = iam.simulate_principal_policy(
        PolicySourceArn="arn:aws:iam::203814181447:user/haazri-deployer",
        ActionNames=["s3:ListAllMyBuckets"],
        ContextEntries=[{
            'ContextKeyName': 'aws:RequestedRegion',
            'ContextKeyValues': [r],
            'ContextKeyType': 'string'
        }]
    )
    decision = resp['EvaluationResults'][0]['EvalDecision']
    allowed_org = resp['EvaluationResults'][0].get('OrganizationsDecisionDetail', {}).get('AllowedByOrganizations')
    print(f"Region {r:<15}: {decision} (AllowedByOrg: {allowed_org})")
    if decision == 'allowed':
        print(f"===> FOUND ALLOWED REGION: {r} <===")
