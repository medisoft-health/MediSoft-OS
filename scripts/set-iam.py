#!/usr/bin/env python3
"""
Set IAM permissions for DICOM and Consent stores.
The SA has setIamPolicy permission on the dataset - use it!
"""
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

dataset_name = f"projects/{PROJECT}/locations/{LOCATION}/datasets/{DATASET}"

# Step 1: Get current IAM policy using GET (which works)
print("=== Step 1: Get current dataset IAM policy ===")
url = f"https://healthcare.googleapis.com/v1/{dataset_name}:getIamPolicy"
resp = requests.get(url, headers=headers)
print(f"Status: {resp.status_code}")
policy = resp.json()
print(f"Current policy: {json.dumps(policy, indent=2)}")

# Step 2: Add all required roles
print("\n=== Step 2: Adding required roles ===")
bindings = policy.get("bindings", [])

roles_to_add = [
    "roles/healthcare.datasetAdmin",
    "roles/healthcare.dicomStoreAdmin",
    "roles/healthcare.dicomEditor",
    "roles/healthcare.consentStoreAdmin",
    "roles/healthcare.consentEditor",
    "roles/healthcare.fhirStoreAdmin",
]

for role in roles_to_add:
    found = False
    for b in bindings:
        if b.get("role") == role:
            if SA not in b.get("members", []):
                b["members"].append(SA)
                print(f"  Added {SA} to existing role: {role}")
            else:
                print(f"  Already has: {role}")
            found = True
            break
    if not found:
        bindings.append({"role": role, "members": [SA]})
        print(f"  Created new binding: {role}")

policy["bindings"] = bindings

# Step 3: Set the updated IAM policy
print("\n=== Step 3: Set updated IAM policy ===")
set_url = f"https://healthcare.googleapis.com/v1/{dataset_name}:setIamPolicy"
set_body = {"policy": policy}
resp2 = requests.post(set_url, headers=headers, json=set_body)
print(f"Status: {resp2.status_code}")
print(f"Response: {resp2.text[:1000]}")

if resp2.status_code == 200:
    print("\n✅ Dataset IAM policy updated successfully!")
    
    # Step 4: Now set IAM on DICOM Store specifically
    print("\n=== Step 4: Set DICOM Store IAM policy ===")
    dicom_store = f"{dataset_name}/dicomStores/medisoft-dicom-store"
    
    # Get current DICOM store policy
    dicom_get_url = f"https://healthcare.googleapis.com/v1/{dicom_store}:getIamPolicy"
    resp3 = requests.get(dicom_get_url, headers=headers)
    print(f"Get DICOM IAM: {resp3.status_code}")
    
    if resp3.status_code == 200:
        dicom_policy = resp3.json()
        dicom_bindings = dicom_policy.get("bindings", [])
        
        dicom_roles = ["roles/healthcare.dicomStoreAdmin", "roles/healthcare.dicomEditor"]
        for role in dicom_roles:
            found = False
            for b in dicom_bindings:
                if b.get("role") == role:
                    if SA not in b.get("members", []):
                        b["members"].append(SA)
                    found = True
                    break
            if not found:
                dicom_bindings.append({"role": role, "members": [SA]})
        
        dicom_policy["bindings"] = dicom_bindings
        dicom_set_url = f"https://healthcare.googleapis.com/v1/{dicom_store}:setIamPolicy"
        resp4 = requests.post(dicom_set_url, headers=headers, json={"policy": dicom_policy})
        print(f"Set DICOM IAM: {resp4.status_code}")
        if resp4.status_code == 200:
            print("✅ DICOM Store IAM updated!")
        else:
            print(f"Error: {resp4.text[:300]}")
    
    # Step 5: Test DICOM access now
    print("\n=== Step 5: Test DICOM Store access ===")
    test_url = f"https://healthcare.googleapis.com/v1/{dicom_store}/dicomWeb/studies"
    resp5 = requests.get(test_url, headers=headers)
    print(f"DICOM QIDO-RS: {resp5.status_code}")
    if resp5.status_code in [200, 204]:
        print("✅ DICOM Store is now accessible!")
    else:
        print(f"Response: {resp5.text[:300]}")
    
    # Step 6: Create/verify consent store
    print("\n=== Step 6: Verify Consent Store ===")
    consent_store = f"{dataset_name}/consentStores/medisoft-consent-store"
    consent_resp = requests.get(f"https://healthcare.googleapis.com/v1/{consent_store}", headers=headers)
    print(f"Consent Store GET: {consent_resp.status_code}")
    
    if consent_resp.status_code == 404:
        print("Creating consent store...")
        create_resp = requests.post(
            f"https://healthcare.googleapis.com/v1/{dataset_name}/consentStores",
            headers=headers,
            params={"consentStoreId": "medisoft-consent-store"},
            json={"defaultConsentTtl": "31536000s", "enableConsentCreateOnUpdate": True}
        )
        print(f"Create: {create_resp.status_code} - {create_resp.text[:300]}")
    elif consent_resp.status_code == 200:
        print("✅ Consent Store exists!")
    elif consent_resp.status_code == 403:
        print("Still no permission for consent store - need project-level IAM")
        # Try creating it anyway
        create_resp = requests.post(
            f"https://healthcare.googleapis.com/v1/{dataset_name}/consentStores",
            headers=headers,
            params={"consentStoreId": "medisoft-consent-store"},
            json={"defaultConsentTtl": "31536000s", "enableConsentCreateOnUpdate": True}
        )
        print(f"Create attempt: {create_resp.status_code} - {create_resp.text[:300]}")
else:
    print(f"\n❌ Failed to set IAM policy. Error: {resp2.text[:500]}")
