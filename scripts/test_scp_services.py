import boto3

iam = boto3.client('iam')
actions = [
    's3:CreateBucket', 's3:ListAllMyBuckets', 's3:PutObject',
    'dynamodb:CreateTable', 'dynamodb:ListTables', 'dynamodb:PutItem',
    'cloudformation:CreateStack', 'cloudformation:ListStacks', 'cloudformation:DescribeStacks',
    'cognito-idp:CreateUserPool', 'cognito-idp:ListUserPools',
    'rekognition:CreateCollection', 'rekognition:DetectFaces', 'rekognition:SearchFacesByImage',
    'lambda:CreateFunction', 'lambda:ListFunctions',
    'apigateway:GET', 'apigateway:POST'
]

for region in ['us-east-1', 'ap-southeast-2', 'ap-south-1']:
    print(f"\n================ REGION: {region} ================")
    for act in actions:
        resp = iam.simulate_principal_policy(
            PolicySourceArn="arn:aws:iam::203814181447:user/haazri-deployer",
            ActionNames=[act],
            ContextEntries=[{
                'ContextKeyName': 'aws:RequestedRegion',
                'ContextKeyValues': [region],
                'ContextKeyType': 'string'
            }]
        )
        res = resp['EvaluationResults'][0]
        decision = res['EvalDecision']
        allowed_org = res.get('OrganizationsDecisionDetail', {}).get('AllowedByOrganizations')
        if decision != 'allowed':
            print(f"  {act:<30}: {decision} (OrgAllowed: {allowed_org})")
        else:
            print(f"  {act:<30}: ALLOWED")
