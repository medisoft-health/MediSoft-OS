#!/usr/bin/env python3
"""Fix IAM permissions for DICOM and Consent stores using Healthcare API v1"""
import json
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

creds = service_account.Credentials.from_service_account_file(
    '/home/ubuntu/medisoft-app/gcp-credentials.json',
    scopes=['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/cloud-healthcare']
)
creds.refresh(Request())
headers = {'Authorization': f'Bearer {creds.token}', 'Content-Type': 'application/json'}

PROJECT = 'gen-lang-client-0619493108'
LOCATION = 'me-central1'
DATASET = 'medisoft-health'
SA = 'serviceAccount:medisoft-healthcare@gen-lang-client-0619493108.iam.gserviceaccount.com'

# The dataset-level IAM endpoint
dataset_name = f"projects/{PROJECT}/locations/{LOCATION}/datasets/{DATASET}"

# Try v1 with correct URL format
print("=== Attempt 1: Dataset-level IAM ===")
url = f"https://healthcare.googleapis.com/v1/{dataset_name}:getIamPolicy"
print(f"URL: {url}")
resp = requests.post(url, headers=headers, json={})
print(f"Status: {resp.status_code}")
if resp.status_code != 200:
    # Try without the body
    resp = requests.post(url, headers=headers)
    print(f"Status (no body): {resp.status_code}")
    if resp.status_code != 200:
        # Try GET
        resp = requests.get(url, headers=headers)
        print(f"Status (GET): {resp.status_code}")

print(f"Response: {resp.text[:500]}")

# Try v1beta1
print("\n=== Attempt 2: v1beta1 ===")
url_beta = f"https://healthcare.googleapis.com/v1beta1/{dataset_name}:getIamPolicy"
print(f"URL: {url_beta}")
resp2 = requests.post(url_beta, headers=headers, json={})
print(f"Status: {resp2.status_code}")
print(f"Response: {resp2.text[:500]}")

# Check what permissions we actually have
print("\n=== Attempt 3: testIamPermissions ===")
test_url = f"https://healthcare.googleapis.com/v1/{dataset_name}:testIamPermissions"
test_body = {
    "permissions": [
        "healthcare.datasets.getIamPolicy",
        "healthcare.datasets.setIamPolicy",
        "healthcare.dicomStores.getIamPolicy",
        "healthcare.dicomStores.setIamPolicy",
        "healthcare.dicomStores.dicomWebRead",
        "healthcare.dicomStores.dicomWebWrite",
        "healthcare.consentStores.get",
        "healthcare.consentStores.create",
        "healthcare.consents.create",
        "healthcare.consents.list",
    ]
}
resp3 = requests.post(test_url, headers=headers, json=test_body)
print(f"Status: {resp3.status_code}")
print(f"Response: {json.dumps(resp3.json(), indent=2) if resp3.status_code == 200 else resp3.text[:500]}")

# List all stores in the dataset to confirm they exist
print("\n=== List DICOM Stores ===")
list_url = f"https://healthcare.googleapis.com/v1/{dataset_name}/dicomStores"
resp4 = requests.get(list_url, headers=headers)
print(f"Status: {resp4.status_code}")
print(f"Response: {resp4.text[:500]}")

print("\n=== List Consent Stores ===")
list_url2 = f"https://healthcare.googleapis.com/v1/{dataset_name}/consentStores"
resp5 = requests.get(list_url2, headers=headers)
print(f"Status: {resp5.status_code}")
print(f"Response: {resp5.text[:500]}")
