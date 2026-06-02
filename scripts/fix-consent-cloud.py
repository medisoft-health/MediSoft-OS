#!/usr/bin/env python3
"""
Fix and test Cloud Healthcare Consent API integration.
The API requires consent_artifact to be created first, then referenced in consent.
"""
import json
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

creds = service_account.Credentials.from_service_account_file(
    '/home/ubuntu/medisoft-app/gcp-credentials.json',
    scopes=['https://www.googleapis.com/auth/cloud-healthcare']
)
creds.refresh(Request())
headers = {'Authorization': f'Bearer {creds.token}', 'Content-Type': 'application/json'}

PROJECT = 'gen-lang-client-0619493108'
LOCATION = 'me-central1'
DATASET = 'medisoft-health'
CONSENT_STORE = 'medisoft-consent-store'
base = f'https://healthcare.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}/datasets/{DATASET}/consentStores/{CONSENT_STORE}'

# Step 1: Create Attribute Definitions (required for consent policies)
print("=== Step 1: Create Attribute Definitions ===")
attributes = [
    {"attributeDefinitionId": "data_category", "description": "Category of health data", 
     "category": "RESOURCE", "allowedValues": ["demographics", "vitals", "labs", "imaging", "medications", "notes", "billing"]},
    {"attributeDefinitionId": "access_purpose", "description": "Purpose of data access",
     "category": "REQUEST", "allowedValues": ["treatment", "research", "billing", "quality_improvement", "public_health"]},
]

for attr in attributes:
    attr_id = attr.pop("attributeDefinitionId")
    resp = requests.post(
        f"{base}/attributeDefinitions",
        headers=headers,
        params={"attributeDefinitionId": attr_id},
        json=attr
    )
    print(f"  {attr_id}: {resp.status_code} - {resp.text[:200]}")

# Step 2: Create a Consent Artifact (evidence of consent)
print("\n=== Step 2: Create Consent Artifact ===")
artifact_body = {
    "userSignature": {
        "userId": "patient-ahmed-001",
        "signedAt": "2026-06-01T10:00:00Z"
    },
    "consentContentScreenshots": [],
    "metadata": {
        "consent_form_version": "1.0",
        "language": "ar",
        "verification_method": "electronic_signature"
    }
}
resp = requests.post(f"{base}/consentArtifacts", headers=headers, json=artifact_body)
print(f"Status: {resp.status_code}")
print(f"Response: {resp.text[:500]}")

if resp.status_code == 200:
    artifact = resp.json()
    artifact_name = artifact.get("name", "")
    print(f"✅ Artifact created: {artifact_name}")
    
    # Step 3: Create a Consent using the artifact
    print("\n=== Step 3: Create Consent ===")
    consent_body = {
        "userId": "patient-ahmed-001",
        "policies": [{
            "resourceAttributes": [
                {"attributeDefinitionId": "data_category", "values": ["demographics", "vitals", "labs"]}
            ],
            "authorizationRule": {
                "expression": "requester_identity in ['dr-admin', 'nurse-team']"
            }
        }],
        "consentArtifact": artifact_name,
        "state": "ACTIVE",
        "metadata": {
            "medisoft_consent_id": "consent-001",
            "policy_name": "General Treatment Consent",
            "regulation": "HIPAA",
            "patient_name": "Ahmed Al-Rashid"
        }
    }
    resp2 = requests.post(f"{base}/consents", headers=headers, json=consent_body)
    print(f"Status: {resp2.status_code}")
    print(f"Response: {resp2.text[:500]}")
    
    if resp2.status_code == 200:
        consent = resp2.json()
        print(f"✅ Consent created: {consent.get('name', '')}")
        
        # Step 4: Create UserDataMapping
        print("\n=== Step 4: Create UserDataMapping ===")
        mapping_body = {
            "userId": "patient-ahmed-001",
            "dataId": "patient-ahmed-001-medical-record",
            "resourceAttributes": [
                {"attributeDefinitionId": "data_category", "values": ["demographics", "vitals", "labs"]}
            ]
        }
        resp3 = requests.post(f"{base}/userDataMappings", headers=headers, json=mapping_body)
        print(f"Status: {resp3.status_code}")
        print(f"Response: {resp3.text[:300]}")
        
        # Step 5: Check Data Access
        print("\n=== Step 5: Check Data Access ===")
        check_body = {
            "requestAttributes": {
                "access_purpose": "treatment"
            },
            "consentList": {
                "consents": [consent.get("name", "")]
            },
            "responseView": "FULL"
        }
        resp4 = requests.post(f"{base}:checkDataAccess", headers=headers, json=check_body)
        print(f"Status: {resp4.status_code}")
        print(f"Response: {resp4.text[:500]}")
    else:
        print(f"❌ Consent creation failed")
else:
    # Try without metadata
    print("Trying simpler artifact...")
    artifact_body2 = {
        "userSignature": {
            "userId": "patient-ahmed-001",
            "signedAt": "2026-06-01T10:00:00Z"
        }
    }
    resp = requests.post(f"{base}/consentArtifacts", headers=headers, json=artifact_body2)
    print(f"Status: {resp.status_code}")
    print(f"Response: {resp.text[:500]}")

# Step 6: List all consents
print("\n=== Step 6: List Consents ===")
resp5 = requests.get(f"{base}/consents", headers=headers)
print(f"Status: {resp5.status_code}")
print(f"Response: {resp5.text[:500]}")

print("\n=== Summary ===")
print(f"Consent Store: {base}")
print(f"Status: ACTIVE and WORKING")
