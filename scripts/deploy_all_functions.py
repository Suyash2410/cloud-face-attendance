"""
Deploy all updated Lambda function codes to AWS Lambda in ap-southeast-2.
"""

import boto3
import zipfile
import io

REGION = 'ap-southeast-2'
client = boto3.client('lambda', region_name=REGION)

# Map prefix to file
FUNCTIONS = [
    ('haazri-ClassesFunction', 'backend/functions/classes/handler.py'),
    ('haazri-StudentsFunction', 'backend/functions/students/handler.py'),
    ('haazri-SessionsFunction', 'backend/functions/sessions/handler.py'),
    ('haazri-AnalyticsFunction', 'backend/functions/analytics/handler.py'),
    ('haazri-SettingsFunction', 'backend/functions/settings/handler.py'),
    ('haazri-AuthFunction', 'backend/functions/auth/handler.py')
]

all_funcs = client.list_functions()['Functions']

for prefix, file_path in FUNCTIONS:
    matching = [f['FunctionName'] for f in all_funcs if f['FunctionName'].startswith(prefix)]
    if not matching:
        print(f"No function found matching prefix {prefix}")
        continue
    fn_name = matching[0]
    print(f"Packaging and updating {fn_name} from {file_path}...")

    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as z:
        z.write(file_path, arcname='handler.py')
    zip_bytes = buf.getvalue()

    client.update_function_code(
        FunctionName=fn_name,
        ZipFile=zip_bytes
    )
    print(f"[OK] Updated {fn_name} ({len(zip_bytes)} bytes)")

print("All functions deployed successfully.")
