#!/usr/bin/env python3
"""
Fix Cloud Healthcare Consent API - use correct snake_case field names
and fix permissions for attribute definitions.
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
CONSENT_STORE = 'medisoft-consent-store'
base = f'https://healthcare.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}/datasets/{DATASET}/consentStores/{CONSENT_STORE}'

# First, add consent-related permissions to the dataset IAM
print("=== Fix IAM: Add consent permissions ===")
dataset_name = f"projects/{PROJECT}/locations/{LOCATION}/datasets/{DATASET}"
iam_url = f"https://healthcare.googleapis.com/v1/{dataset_name}:getIamPolicy"
SA = f"serviceAccount:medisoft-healthcare@{PROJECT}.iam.gserviceaccount.com"

resp = requests.get(iam_url, headers=headers)
if resp.status_code == 200:
    policy = resp.json()
    bindings = policy.get("bindings", [])
    
    # Add consent-related roles
    consent_roles = [
        "roles/healthcare.consentStoreAdmin",
        "roles/healthcare.consentEditor",
    ]
    for role in consent_roles:
        found = False
        for b in bindings:
            if b.get("role") == role:
                if SA not in b.get("members", []):
                    b["members"].append(SA)
                found = True
                break
        if not found:
            bindings.append({"role": role, "members": [SA]})
    
    policy["bindings"] = bindings
    set_resp = requests.post(f"https://healthcare.googleapis.com/v1/{dataset_name}:setIamPolicy", 
                            headers=headers, json={"policy": policy})
    print(f"  IAM update: {set_resp.status_code}")

# Also set IAM on consent store directly
print("\n=== Set Consent Store IAM ===")
cs_iam_url = f"https://healthcare.googleapis.com/v1/{dataset_name}/consentStores/{CONSENT_STORE}:getIamPolicy"
cs_resp = requests.get(cs_iam_url, headers=headers)
print(f"  Get IAM: {cs_resp.status_code}")
if cs_resp.status_code == 200:
    cs_policy = cs_resp.json()
    cs_bindings = cs_policy.get("bindings", [])
    for role in ["roles/healthcare.consentStoreAdmin", "roles/healthcare.consentEditor"]:
        found = False
        for b in cs_bindings:
            if b.get("role") == role:
                if SA not in b.get("members", []):
                    b["members"].append(SA)
                found = True
                break
        if not found:
            cs_bindings.append({"role": role, "members": [SA]})
    cs_policy["bindings"] = cs_bindings
    set_cs = requests.post(f"https://healthcare.googleapis.com/v1/{dataset_name}/consentStores/{CONSENT_STORE}:setIamPolicy",
                          headers=headers, json={"policy": cs_policy})
    print(f"  Set IAM: {set_cs.status_code}")
    if set_cs.status_code == 200:
        print("  ✅ Consent Store IAM updated!")

# Refresh token after IAM changes
import time
time.sleep(2)
creds.refresh(Request())
headers = {'Authorization': f'Bearer {creds.token}', 'Content-Type': 'application/json'}

# Step 1: Create Attribute Definitions
print("\n=== Step 1: Create Attribute Definitions ===")
attributes = [
    {"id": "data_category", "body": {
        "description": "Category of health data",
        "category": "RESOURCE",
        "allowed_values": ["demographics", "vitals", "labs", "imaging", "medications", "notes", "billing"]
    }},
    {"id": "access_purpose", "body": {
        "description": "Purpose of data access",
        "category": "REQUEST",
        "allowed_values": ["treatment", "research", "billing", "quality_improvement", "public_health"]
    }},
]

for attr in attributes:
    resp = requests.post(
        f"{base}/attributeDefinitions",
        headers=headers,
        params={"attribute_definition_id": attr["id"]},
        json=attr["body"]
    )
    print(f"  {attr['id']}: {resp.status_code}")
    if resp.status_code not in [200, 409]:
        print(f"    {resp.text[:200]}")

# Step 2: Create Consent Artifact (correct snake_case format)
print("\n=== Step 2: Create Consent Artifact ===")
artifact_body = {
    "user_signature": {
        "user_id": "patient-ahmed-001",
        "image": {},
        "metadata": {"consent_form_version": "1.0", "language": "ar"}
    }
}
resp = requests.post(f"{base}/consentArtifacts", headers=headers, json=artifact_body)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:400]}")

if resp.status_code == 200:
    artifact = resp.json()
    artifact_name = artifact.get("name", "")
    print(f"✅ Artifact created: {artifact_name}")
    
    # Step 3: Create Consent
    print("\n=== Step 3: Create Consent ===")
    consent_body = {
        "user_id": "patient-ahmed-001",
        "policies": [{
            "resource_attributes": [
                {"attribute_definition_id": "data_category", "values": ["demographics", "vitals", "labs"]}
            ]
        }],
        "consent_artifact": artifact_name,
        "state": "ACTIVE",
        "metadata": {
            "medisoft_consent_id": "consent-001",
            "policy_name": "General Treatment Consent",
            "regulation": "HIPAA"
        }
    }
    resp2 = requests.post(f"{base}/consents", headers=headers, json=consent_body)
    print(f"Status: {resp2.status_code}")
    print(f"Response: {resp2.text[:500]}")
    
    if resp2.status_code == 200:
        consent = resp2.json()
        print(f"✅ Consent created: {consent.get('name', '')}")
    else:
        print("Trying without policies...")
        consent_body2 = {
            "user_id": "patient-ahmed-001",
            "consent_artifact": artifact_name,
            "state": "ACTIVE",
            "metadata": {"medisoft_consent_id": "consent-001"}
        }
        resp2b = requests.post(f"{base}/consents", headers=headers, json=consent_body2)
        print(f"Status: {resp2b.status_code}")
        print(f"Response: {resp2b.text[:500]}")
else:
    # Try minimal artifact
    print("Trying minimal artifact...")
    artifact_body2 = {
        "user_signature": {
            "user_id": "patient-ahmed-001"
        }
    }
    resp = requests.post(f"{base}/consentArtifacts", headers=headers, json=artifact_body2)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:400]}")
    
    if resp.status_code == 200:
        artifact = resp.json()
        artifact_name = artifact.get("name", "")
        print(f"✅ Artifact created: {artifact_name}")
        
        # Create consent
        consent_body = {
            "user_id": "patient-ahmed-001",
            "consent_artifact": artifact_name,
            "state": "ACTIVE",
            "metadata": {"medisoft_consent_id": "consent-001", "regulation": "HIPAA"}
        }
        resp2 = requests.post(f"{base}/consents", headers=headers, json=consent_body)
        print(f"Consent: {resp2.status_code}")
        print(f"Response: {resp2.text[:400]}")

# Final: List everything
print("\n=== Final: List Consents ===")
resp_list = requests.get(f"{base}/consents", headers=headers)
print(f"Status: {resp_list.status_code}")
print(f"Response: {resp_list.text[:500]}")

print("\n=== Final: List Artifacts ===")
resp_art = requests.get(f"{base}/consentArtifacts", headers=headers)
print(f"Status: {resp_art.status_code}")
print(f"Response: {resp_art.text[:500]}")
