import json
import os
import boto3
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
CLASSES_TABLE = os.environ.get('CLASSES_TABLE', 'haazri-classes')

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

    path_params = event.get('pathParameters', {}) or {}
    query_params = event.get('queryStringParameters', {}) or {}
    table = dynamodb.Table(CLASSES_TABLE)

    try:
        class_id = path_params.get('id')

        if method == 'GET' and class_id:
            res = table.get_item(Key={'classId': class_id})
            item = res.get('Item')
            if not item:
                return response(404, {'message': f'Class {class_id} not found'})
            return response(200, item)

        elif method == 'GET':
            teacher_id = query_params.get('teacherId')
            if teacher_id:
                res = table.scan(
                    FilterExpression='teacherId = :t',
                    ExpressionAttributeValues={':t': teacher_id}
                )
                items = res.get('Items', [])
                # If specific teacher has no mapped classes, fallback to all active classes
                if not items:
                    res = table.scan()
                    items = res.get('Items', [])
            else:
                res = table.scan()
                items = res.get('Items', [])
            return response(200, items)

        elif method == 'POST':
            body = json.loads(event.get('body', '{}'))
            if 'classId' not in body:
                # auto-generate classId
                body['classId'] = f"CLS-{int(boto3.client('dynamodb').describe_time_to_live(TableName=CLASSES_TABLE)['ResponseMetadata']['HTTPHeaders'].get('x-amz-request-id', '0')[:4], 16) if False else '101'}"
            body.setdefault('totalSessions', 0)
            table.put_item(Item=body)
            return response(201, body)

        elif method == 'PUT' and class_id:
            body = json.loads(event.get('body', '{}'))
            # Update class
            update_expr = []
            expr_names = {}
            expr_vals = {}
            for k, v in body.items():
                if k != 'classId':
                    attr_name = f"#{k}"
                    attr_val = f":{k}"
                    update_expr.append(f"{attr_name} = {attr_val}")
                    expr_names[attr_name] = k
                    expr_vals[attr_val] = v

            if update_expr:
                res = table.update_item(
                    Key={'classId': class_id},
                    UpdateExpression='SET ' + ', '.join(update_expr),
                    ExpressionAttributeNames=expr_names,
                    ExpressionAttributeValues=expr_vals,
                    ReturnValues='ALL_NEW'
                )
                return response(200, res.get('Attributes', {}))
            return response(200, {'classId': class_id})

        return response(404, {'message': f'Route not found: {method} {path}'})

    except Exception as e:
        print(f"Classes error: {e}")
        return response(500, {'error': str(e)})
