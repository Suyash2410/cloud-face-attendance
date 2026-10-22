"""
Haazri AWS DynamoDB Database Seeder (Live Mode)
Populates Students, Classes, Settings in AWS DynamoDB.
Usage: python scripts/seed.py --region ap-south-1
"""

import boto3
import csv
import os
import argparse
from datetime import datetime

def seed_database(region='ap-south-1'):
    print(f"Connecting to DynamoDB in region {region}...")
    dynamodb = boto3.resource('dynamodb', region_name=region)

    students_table = dynamodb.Table('haazri-students')
    classes_table = dynamodb.Table('haazri-classes')
    settings_table = dynamodb.Table('haazri-settings')

    # 1. Seed default system settings
    print("Seeding system settings...")
    settings_table.put_item(
        Item={
            'id': 'global',
            'matchThreshold': 90,
            'reviewThreshold': 80,
            'shortageThreshold': 75,
            'editWindowHours': 24,
            'photoRetentionDays': 30,
            'collegeName': 'Veermata Jijabai Technological Institute (VJTI)',
            'weeklyDigestEnabled': True
        }
    )

    # 2. Seed Sample Students from CSV
    csv_path = os.path.join(os.path.dirname(__file__), 'sample_students.csv')
    seeded_students = []
    if os.path.exists(csv_path):
        print(f"Seeding sample students from {csv_path}...")
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                roll = row['rollNumber'].strip()
                item = {
                    'studentId': roll,
                    'rollNumber': roll,
                    'name': row['name'].strip(),
                    'email': row['email'].strip(),
                    'division': row['division'].strip(),
                    'year': int(row.get('year', 3)),
                    'phone': row.get('phone', '').strip(),
                    'enrollmentState': 'not_enrolled',
                    'faceIds': [],
                    'photoKeys': [],
                    'createdAt': datetime.utcnow().isoformat() + 'Z'
                }
                students_table.put_item(Item=item)
                seeded_students.append(item)
        print(f"Seeded {len(seeded_students)} students.")

    # 3. Seed Classes
    print("Seeding academic classes...")
    tea_ids = [s['studentId'] for s in seeded_students if s['division'] == 'TE-A']
    teb_ids = [s['studentId'] for s in seeded_students if s['division'] == 'TE-B']
    tec_ids = [s['studentId'] for s in seeded_students if s['division'] == 'TE-C']

    classes = [
        {
            'classId': 'CLS-101',
            'subject': 'Cloud Computing',
            'division': 'TE-C',
            'year': 3,
            'teacherId': 't-2',
            'teacherName': 'Prof. Sunita Kulkarni',
            'studentIds': tec_ids,
            'schedule': 'Mon, Wed 10:00 AM',
            'totalSessions': 0
        },
        {
            'classId': 'CLS-102',
            'subject': 'Database Systems',
            'division': 'TE-A',
            'year': 3,
            'teacherId': 't-1',
            'teacherName': 'Dr. Rajesh Sharma',
            'studentIds': tea_ids,
            'schedule': 'Tue, Thu 11:15 AM',
            'totalSessions': 0
        },
        {
            'classId': 'CLS-103',
            'subject': 'Computer Networks',
            'division': 'TE-B',
            'year': 3,
            'teacherId': 't-3',
            'teacherName': 'Dr. Amit Verma',
            'studentIds': teb_ids,
            'schedule': 'Mon, Fri 02:00 PM',
            'totalSessions': 0
        }
    ]

    for c in classes:
        classes_table.put_item(Item=c)

    print(f"Seeded {len(classes)} classes.")
    print("Live Mode database seeded successfully.")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description="Seed Haazri DynamoDB tables")
    parser.add_argument('--region', default='ap-south-1', help='AWS Region')
    args = parser.parse_args()
    seed_database(args.region)
