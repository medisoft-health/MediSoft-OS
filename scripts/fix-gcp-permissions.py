#!/usr/bin/env python3
"""
Fix GCP Permissions for MediSoft
- Add DICOM Store Admin role
- Verify Healthcare API dataset exists
- Create DICOM store if needed
- Create Consent store if needed
"""
import json
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

# Configuration
PROJECT = "gen-lang-client-0619493108"
LOCATION = "me-central1"
DATASET = "medisoft-health"
SERVICE_ACCOUNT = "medisoft-healthcare@gen-lang-client-0619493108.iam.gserviceaccount.com"

BASE_URL = f"https://healthcare.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}/datasets/{DATASET}"

# Authenticate
creds = service_account.Credentials.from_service_account_file(
    '/home/ubuntu/medisoft-app/gcp-credentials.json',
    scopes=['https://www.googleapis.com/auth/cloud-platform', 'https://www.googleapis.com/auth/cloud-healthcare']
)
creds.refresh(Request())
headers = {
    'Authorization': f'Bearer {creds.token}',
    'Content-Type': 'application/json'
}

print("=" * 60)
print("MediSoft GCP Permissions & Resources Fix")
print("=" * 60)

# 1. Check if dataset exists
print("\n[1] Checking Healthcare API dataset...")
resp = requests.get(BASE_URL, headers=headers)
print(f"    Dataset status: {resp.status_code}")
if resp.status_code == 200:
    print(f"    ✅ Dataset '{DATASET}' exists in {LOCATION}")
elif resp.status_code == 404:
    print(f"    ❌ Dataset not found. Creating...")
    create_resp = requests.post(
        f"https://healthcare.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}/datasets",
        headers=headers,
        params={"datasetId": DATASET}
    )
    print(f"    Create result: {create_resp.status_code} - {create_resp.text[:200]}")
else:
    print(f"    Error: {resp.text[:500]}")

# 2. Check/Create DICOM Store
print("\n[2] Checking DICOM Store...")
dicom_url = f"{BASE_URL}/dicomStores/medisoft-dicom-store"
resp = requests.get(dicom_url, headers=headers)
print(f"    DICOM Store status: {resp.status_code}")
if resp.status_code == 200:
    print(f"    ✅ DICOM Store exists")
    print(f"    Details: {json.dumps(resp.json(), indent=2)[:300]}")
elif resp.status_code == 404:
    print(f"    ❌ DICOM Store not found. Creating...")
    create_resp = requests.post(
        f"{BASE_URL}/dicomStores",
        headers=headers,
        params={"dicomStoreId": "medisoft-dicom-store"},
        json={}
    )
    print(f"    Create result: {create_resp.status_code}")
    if create_resp.status_code in [200, 201]:
        print(f"    ✅ DICOM Store created successfully")
    else:
        print(f"    Error: {create_resp.text[:300]}")
else:
    print(f"    Error: {resp.text[:500]}")

# 3. Check/Create Consent Store
print("\n[3] Checking Consent Store...")
consent_url = f"{BASE_URL}/consentStores/medisoft-consent-store"
resp = requests.get(consent_url, headers=headers)
print(f"    Consent Store status: {resp.status_code}")
if resp.status_code == 200:
    print(f"    ✅ Consent Store exists")
elif resp.status_code == 404:
    print(f"    ❌ Consent Store not found. Creating...")
    create_resp = requests.post(
        f"{BASE_URL}/consentStores",
        headers=headers,
        params={"consentStoreId": "medisoft-consent-store"},
        json={
            "defaultConsentTtl": "31536000s",  # 1 year
            "enableConsentCreateOnUpdate": True
        }
    )
    print(f"    Create result: {create_resp.status_code}")
    if create_resp.status_code in [200, 201]:
        print(f"    ✅ Consent Store created successfully")
    else:
        print(f"    Error: {create_resp.text[:300]}")
else:
    print(f"    Error: {resp.text[:500]}")

# 4. Set IAM policy on the dataset to give our SA full healthcare access
print("\n[4] Setting IAM policy on dataset...")
iam_url = f"{BASE_URL}:getIamPolicy"
resp = requests.post(iam_url, headers=headers, json={})
print(f"    Get IAM Policy status: {resp.status_code}")

if resp.status_code == 200:
    policy = resp.json()
    print(f"    Current policy version: {policy.get('version', 'N/A')}")
    
    # Add required roles
    required_roles = [
        "roles/healthcare.datasetAdmin",
        "roles/healthcare.dicomStoreAdmin",
        "roles/healthcare.fhirStoreAdmin",
        "roles/healthcare.consentStoreAdmin",
        "roles/healthcare.dicomEditor",
    ]
    
    bindings = policy.get("bindings", [])
    member = f"serviceAccount:{SERVICE_ACCOUNT}"
    
    for role in required_roles:
        # Check if role already exists
        found = False
        for binding in bindings:
            if binding.get("role") == role:
                if member not in binding.get("members", []):
                    binding["members"].append(member)
                found = True
                break
        if not found:
            bindings.append({"role": role, "members": [member]})
    
    policy["bindings"] = bindings
    
    # Set the updated policy
    set_url = f"{BASE_URL}:setIamPolicy"
    set_resp = requests.post(set_url, headers=headers, json={"policy": policy})
    print(f"    Set IAM Policy status: {set_resp.status_code}")
    if set_resp.status_code == 200:
        print(f"    ✅ IAM Policy updated successfully!")
        print(f"    Added roles: {', '.join(required_roles)}")
    else:
        print(f"    Error: {set_resp.text[:500]}")
else:
    print(f"    ⚠️  Cannot get IAM policy (status {resp.status_code})")
    print(f"    Response: {resp.text[:500]}")
    print(f"    This likely means the dataset doesn't exist yet or SA lacks permissions.")

# 5. Test DICOM Store access
print("\n[5] Testing DICOM Store access...")
test_url = f"{dicom_url}/dicomWeb/studies"
resp = requests.get(test_url, headers=headers)
print(f"    DICOM QIDO-RS status: {resp.status_code}")
if resp.status_code == 200:
    print(f"    ✅ DICOM Store accessible! DICOMweb working.")
elif resp.status_code == 204:
    print(f"    ✅ DICOM Store accessible (empty - no studies yet)")
else:
    print(f"    ❌ DICOM Store access issue: {resp.text[:300]}")

# 6. Test FHIR Store access
print("\n[6] Testing FHIR Store access...")
fhir_url = f"{BASE_URL}/fhirStores/medisoft-fhir-store/fhir/Patient"
resp = requests.get(fhir_url, headers=headers)
print(f"    FHIR Patient search status: {resp.status_code}")
if resp.status_code == 200:
    data = resp.json()
    total = data.get("total", len(data.get("entry", [])))
    print(f"    ✅ FHIR Store accessible! Found {total} patients.")
else:
    print(f"    Status: {resp.text[:300]}")

# 7. Test Consent Store access
print("\n[7] Testing Consent Store access...")
consent_test_url = f"{consent_url}/consents"
resp = requests.get(consent_test_url, headers=headers)
print(f"    Consent Store list status: {resp.status_code}")
if resp.status_code == 200:
    print(f"    ✅ Consent Store accessible!")
else:
    print(f"    Status: {resp.text[:300]}")

print("\n" + "=" * 60)
print("Done! Summary:")
print("=" * 60)
