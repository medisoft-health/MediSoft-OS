#!/usr/bin/env python3
"""
Wait for MedGemma model upload and deploy to endpoint.
"""
import json
import time
import requests
from google.oauth2 import service_account
from google.auth.transport.requests import Request

creds = service_account.Credentials.from_service_account_file(
    '/home/ubuntu/medisoft-app/gcp-credentials.json',
    scopes=['https://www.googleapis.com/auth/cloud-platform']
)
creds.refresh(Request())
headers = {'Authorization': f'Bearer {creds.token}', 'Content-Type': 'application/json'}

PROJECT = 'gen-lang-client-0619493108'
PROJECT_NUM = '292608733638'
LOCATION = 'us-central1'
BASE_URL = f"https://{LOCATION}-aiplatform.googleapis.com/v1"

# Step 1: Check model upload operation
MODEL_OP = f"projects/{PROJECT_NUM}/locations/{LOCATION}/models/6448521897452765184/operations/4642546380651364352"
print("=== Step 1: Check model upload status ===")
op_url = f"{BASE_URL}/{MODEL_OP}"
resp = requests.get(op_url, headers=headers)
print(f"Status: {resp.status_code}")
op_data = resp.json()
print(json.dumps(op_data, indent=2)[:500])

if op_data.get("done"):
    model_name = op_data.get("response", {}).get("model", "")
    print(f"\n✅ Model uploaded: {model_name}")
else:
    # Wait for it
    print("\nWaiting for model upload...")
    for i in range(24):
        time.sleep(5)
        resp = requests.get(op_url, headers=headers)
        op_data = resp.json()
        if op_data.get("done"):
            model_name = op_data.get("response", {}).get("model", "")
            print(f"\n✅ Model uploaded: {model_name}")
            break
        print(f"  ... waiting ({(i+1)*5}s)")
    else:
        print("Model upload still in progress. Checking models list...")
        # List models to find it
        models_url = f"{BASE_URL}/projects/{PROJECT}/locations/{LOCATION}/models"
        models_resp = requests.get(models_url, headers=headers)
        print(f"Models list: {models_resp.status_code}")
        print(models_resp.text[:1000])
        model_name = ""

# Step 2: List all models
print("\n=== Step 2: List all models ===")
models_url = f"{BASE_URL}/projects/{PROJECT}/locations/{LOCATION}/models"
models_resp = requests.get(models_url, headers=headers)
print(f"Status: {models_resp.status_code}")
models_data = models_resp.json()
print(json.dumps(models_data, indent=2)[:1500])

# Step 3: If model exists, create endpoint and deploy
if models_data.get("models"):
    model = models_data["models"][0]
    model_name = model["name"]
    print(f"\nFound model: {model_name}")
    
    # Create endpoint
    print("\n=== Step 3: Create Endpoint ===")
    ep_body = {
        "displayName": "medgemma-endpoint",
        "description": "MedGemma 4B IT for MediSoft"
    }
    ep_url = f"{BASE_URL}/projects/{PROJECT}/locations/{LOCATION}/endpoints"
    ep_resp = requests.post(ep_url, headers=headers, json=ep_body)
    print(f"Create endpoint: {ep_resp.status_code}")
    print(ep_resp.text[:500])
    
    if ep_resp.status_code == 200:
        ep_op = ep_resp.json()
        ep_op_name = ep_op.get("name", "")
        
        # Wait for endpoint
        print("Waiting for endpoint creation...")
        endpoint_name = ""
        for i in range(12):
            time.sleep(5)
            check_resp = requests.get(f"{BASE_URL}/{ep_op_name}", headers=headers)
            if check_resp.status_code == 200:
                check_data = check_resp.json()
                if check_data.get("done"):
                    endpoint_name = check_data.get("response", {}).get("name", "")
                    print(f"✅ Endpoint created: {endpoint_name}")
                    break
            print(f"  ... ({(i+1)*5}s)")
        
        if endpoint_name:
            # Deploy model to endpoint with T4 GPU
            print("\n=== Step 4: Deploy model to endpoint ===")
            deploy_body = {
                "deployedModel": {
                    "model": model_name,
                    "displayName": "medgemma-4b-deployed",
                    "dedicatedResources": {
                        "machineSpec": {
                            "machineType": "n1-standard-8",
                            "acceleratorType": "NVIDIA_TESLA_T4",
                            "acceleratorCount": 1
                        },
                        "minReplicaCount": 1,
                        "maxReplicaCount": 1
                    }
                }
            }
            
            deploy_url = f"{BASE_URL}/{endpoint_name}:deployModel"
            deploy_resp = requests.post(deploy_url, headers=headers, json=deploy_body)
            print(f"Deploy status: {deploy_resp.status_code}")
            print(f"Response: {deploy_resp.text[:800]}")
            
            if deploy_resp.status_code == 200:
                print("\n✅ Model deployment initiated!")
                print("NOTE: Deployment takes 10-20 minutes to complete.")
                print(f"Endpoint: {endpoint_name}")
                
                # Extract endpoint ID for .env.local
                ep_id = endpoint_name.split("/")[-1]
                print(f"\nAdd to .env.local:")
                print(f"VERTEX_MEDGEMMA_ENDPOINT=projects/{PROJECT}/locations/{LOCATION}/endpoints/{ep_id}")
                print(f"USE_VERTEX_MEDGEMMA=true")
            else:
                print(f"\n❌ Deployment failed. Likely GPU quota issue.")
                print("You need to request GPU quota from Google Cloud Console.")
else:
    print("\nNo models found yet. Upload may still be in progress.")
