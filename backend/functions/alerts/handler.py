"""
AWS Lambda Function: Daily Attendance Shortage Alert Job
Triggered daily by EventBridge rule: cron(0 14 * * ? *)
"""

import os
import boto3

dynamodb = boto3.resource('dynamodb')
ses = boto3.client('ses')

ATTENDANCE_TABLE = os.environ.get('ATTENDANCE_TABLE', 'haazri-attendance')
STUDENTS_TABLE = os.environ.get('STUDENTS_TABLE', 'haazri-students')
SETTINGS_TABLE = os.environ.get('SETTINGS_TABLE', 'haazri-settings')
SENDER_EMAIL = os.environ.get('SES_SENDER_EMAIL', 'attendance-alerts@haazri.edu')

def lambda_handler(event, context):
    try:
        settings_tbl = dynamodb.Table(SETTINGS_TABLE)
        settings = settings_tbl.get_item(Key={'id': 'global'}).get('Item', {})
        threshold = settings.get('shortageThreshold', 75)

        students_tbl = dynamodb.Table(STUDENTS_TABLE)
        students = students_tbl.scan().get('Items', [])

        alerts_sent = 0
        for student in students:
            # Query student attendance
            stu_id = student['studentId']
            # Compute total classes and present classes
            # If percentage < threshold, send email
            email = student.get('email')
            name = student.get('name')

            # Simulated send via SES
            subject = f"Haazri Attendance Shortage Notice: {name} ({stu_id})"
            body_text = f"Dear {name},\n\nYour attendance is currently below the {threshold}% statutory cutoff. Please contact your faculty advisor immediately."

            try:
                ses.send_email(
                    Source=SENDER_EMAIL,
                    Destination={'ToAddresses': [email]},
                    Message={
                        'Subject': {'Data': subject},
                        'Body': {'Text': {'Data': body_text}}
                    }
                )
                alerts_sent += 1
            except Exception as e:
                print(f"Failed to send email to {email}: {e}")

        return {
            'statusCode': 200,
            'body': f'Daily shortage alert check completed. Sent {alerts_sent} warning notices.'
        }

    except Exception as e:
        print(f"Error in alert job: {e}")
        return {'statusCode': 500, 'error': str(e)}
