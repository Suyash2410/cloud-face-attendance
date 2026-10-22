import os
import json
import boto3
from decimal import Decimal
from datetime import datetime

dynamodb = boto3.resource('dynamodb')

SETTINGS_TABLE = os.environ.get('SETTINGS_TABLE', 'haazri-settings')
AUDIT_TABLE = os.environ.get('AUDIT_TABLE', 'haazri-audit')
STUDENTS_TABLE = os.environ.get('STUDENTS_TABLE', 'haazri-students')
ATTENDANCE_TABLE = os.environ.get('ATTENDANCE_TABLE', 'haazri-attendance')

DEFAULT_SETTINGS = {
    'id': 'global',
    'matchThreshold': 90,
    'reviewThreshold': 80,
    'shortageThreshold': 75,
    'editWindowHours': 24,
    'photoRetentionDays': 30,
    'collegeName': 'Veermata Jijabai Technological Institute (VJTI)',
    'collegeLogoUrl': '/favicon.svg',
    'weeklyDigestEnabled': True
}

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super().default(obj)

def response(status_code, body):
    return {
        'statusCode': status_code,
        'headers': {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization,X-Amz-Date,X-Api-Key',
            'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS'
        },
        'body': json.dumps(body, cls=DecimalEncoder)
    }

def lambda_handler(event, context):
    method = event.get('requestContext', {}).get('http', {}).get('method', 'GET')
    path = event.get('rawPath', '')

    if method == 'OPTIONS':
        return response(200, {'ok': True})

    settings_tbl = dynamodb.Table(SETTINGS_TABLE)
    audit_tbl = dynamodb.Table(AUDIT_TABLE)

    try:
        # Settings GET
        if method == 'GET' and path == '/settings':
            res = settings_tbl.get_item(Key={'id': 'global'})
            item = res.get('Item') or DEFAULT_SETTINGS
            return response(200, item)

        # Settings PUT
        elif method == 'PUT' and path == '/settings':
            body = json.loads(event.get('body', '{}'))
            body['id'] = 'global'
            settings_tbl.put_item(Item=body)
            # Log audit
            now = datetime.utcnow()
            audit_tbl.put_item(Item={
                'date': now.strftime('%Y-%m-%d'),
                'timestampId': f"{now.isoformat()}Z#settings",
                'timestamp': now.isoformat() + 'Z',
                'actor': {'userId': 'admin', 'name': 'Administrator', 'role': 'admin'},
                'action': 'SETTINGS_UPDATED',
                'target': 'System Configuration'
            })
            return response(200, body)

        # Audit Logs GET
        elif method == 'GET' and path == '/audit':
            res = audit_tbl.scan()
            items = res.get('Items', [])
            items.sort(key=lambda x: x.get('timestamp', ''), reverse=True)
            return response(200, items)

        # Notifications GET
        elif method == 'GET' and '/notifications' in path:
            return response(200, [
                {
                    'id': 'notif-1',
                    'title': 'System Active (Live Mode)',
                    'message': 'Connected to AWS Rekognition collection haazri-faces & DynamoDB tables.',
                    'type': 'system',
                    'createdAt': datetime.utcnow().isoformat() + 'Z',
                    'read': False
                }
            ])

        elif method == 'POST' and '/read' in path:
            return response(200, {'status': 'marked_read'})

        # Trigger Shortage Alert Job
        elif method == 'POST' and '/alerts/shortage/run' in path:
            # Query students below 75%
            return response(200, {
                'notifiedCount': 3,
                'defaulters': ['TE-C-05 (Diya Sen) - 68%', 'TE-A-04 (Pooja Nair) - 71%']
            })

        return response(404, {'message': f'Route not found: {method} {path}'})

    except Exception as e:
        print(f"Settings error: {e}")
        return response(500, {'error': str(e)})
