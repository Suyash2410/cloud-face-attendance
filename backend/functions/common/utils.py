import json
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    """Encodes DynamoDB Decimal types to int or float."""
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def response(status_code: int, body: any, cors_origin: str = "*"):
    """Format standardized API Gateway HTTP API JSON response."""
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": cors_origin,
            "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type,Authorization,X-Amz-Date,X-Api-Key"
        },
        "body": json.dumps(body, cls=DecimalEncoder)
    }

def get_claims(event):
    """Extract claims from Cognito JWT authorizer."""
    authorizer = event.get('requestContext', {}).get('authorizer', {})
    jwt = authorizer.get('jwt', {})
    claims = jwt.get('claims', {})
    groups = claims.get('cognito:groups', [])
    if isinstance(groups, str):
        groups = [groups]
    role = 'student'
    if 'admin' in groups:
        role = 'admin'
    elif 'teacher' in groups:
        role = 'teacher'
    return {
        'userId': claims.get('sub', 'unknown'),
        'email': claims.get('email', ''),
        'name': claims.get('name', claims.get('email', 'User')),
        'role': role,
        'groups': groups
    }
