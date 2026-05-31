#!/usr/bin/env python3
"""
MediSoft — Deploy MedGemma 4B on Vertex AI

Deploys the MedGemma 4B model (google/medgemma-4b-it) to a Vertex AI endpoint
in the me-central1 (Doha) region for real-time medical AI inference.

Prerequisites:
  - google-cloud-aiplatform SDK: pip install google-cloud-aiplatform
  - Service account credentials at /etc/medisoft/credentials/gcp-credentials.json
  - Vertex AI API enabled in the GCP project
  - Sufficient quota for GPU instances in me-central1

Usage:
  export GOOGLE_APPLICATION_CREDENTIALS=/etc/medisoft/credentials/gcp-credentials.json
  python3 scripts/deploy_medgemma.py

Environment Variables:
  GCP_PROJECT_ID          - GCP project ID (default: gen-lang-client-0619493108)
  GCP_LOCATION            - Region for deployment (default: me-central1)
  MEDGEMMA_MACHINE_TYPE   - VM type (default: g2-standard-12)
  MEDGEMMA_ACCELERATOR    - GPU type (default: NVIDIA_L4)
  MEDGEMMA_ACCELERATOR_COUNT - Number of GPUs (default: 1)

After deployment, update .env.local with:
  VERTEX_MEDGEMMA_ENDPOINT=projects/{project}/locations/{location}/endpoints/{endpoint_id}
  USE_VERTEX_MEDGEMMA=true
"""

import os
import sys
import time
from typing import Optional

# ─── Configuration ───────────────────────────────────────────────────────────

PROJECT_ID = os.environ.get("GCP_PROJECT_ID", "gen-lang-client-0619493108")
LOCATION = os.environ.get("GCP_LOCATION", "me-central1")
MACHINE_TYPE = os.environ.get("MEDGEMMA_MACHINE_TYPE", "g2-standard-12")
ACCELERATOR_TYPE = os.environ.get("MEDGEMMA_ACCELERATOR", "NVIDIA_L4")
ACCELERATOR_COUNT = int(os.environ.get("MEDGEMMA_ACCELERATOR_COUNT", "1"))

# MedGemma model from Hugging Face / Model Garden
MEDGEMMA_MODEL_ID = "google/medgemma-4b-it"
MEDGEMMA_SERVING_CONTAINER = "us-docker.pkg.dev/vertex-ai/vertex-vision-model-garden-dockers/pytorch-vllm-serve:20250515_0916_RC00"

ENDPOINT_DISPLAY_NAME = "medisoft-medgemma-4b"
MODEL_DISPLAY_NAME = "medgemma-4b-it"
DEPLOYED_MODEL_DISPLAY_NAME = "medgemma-4b-it-deployed"

# Service account for the endpoint
SERVICE_ACCOUNT = f"medisoft-healthcare@{PROJECT_ID}.iam.gserviceaccount.com"


def deploy_medgemma():
    """Deploy MedGemma 4B to Vertex AI endpoint."""
    try:
        from google.cloud import aiplatform
    except ImportError:
        print("ERROR: google-cloud-aiplatform not installed.")
        print("Run: pip install google-cloud-aiplatform")
        sys.exit(1)

    print(f"╔══════════════════════════════════════════════════════════════╗")
    print(f"║  MediSoft — MedGemma 4B Vertex AI Deployment               ║")
    print(f"╠══════════════════════════════════════════════════════════════╣")
    print(f"║  Project:     {PROJECT_ID:<44} ║")
    print(f"║  Location:    {LOCATION:<44} ║")
    print(f"║  Model:       {MEDGEMMA_MODEL_ID:<44} ║")
    print(f"║  Machine:     {MACHINE_TYPE:<44} ║")
    print(f"║  Accelerator: {ACCELERATOR_TYPE} x {ACCELERATOR_COUNT:<38} ║")
    print(f"╚══════════════════════════════════════════════════════════════╝")
    print()

    # Initialize Vertex AI
    aiplatform.init(
        project=PROJECT_ID,
        location=LOCATION,
    )

    # ─── Step 1: Check for existing endpoint ─────────────────────────────────
    print("[1/4] Checking for existing MedGemma endpoint...")
    existing_endpoints = aiplatform.Endpoint.list(
        filter=f'display_name="{ENDPOINT_DISPLAY_NAME}"',
    )

    endpoint: Optional[aiplatform.Endpoint] = None
    if existing_endpoints:
        endpoint = existing_endpoints[0]
        print(f"  ✓ Found existing endpoint: {endpoint.resource_name}")
    else:
        print("  → Creating new endpoint...")
        endpoint = aiplatform.Endpoint.create(
            display_name=ENDPOINT_DISPLAY_NAME,
            description="MediSoft MedGemma 4B — Medical AI for radiology, lab interpretation, and clinical Q&A",
        )
        print(f"  ✓ Endpoint created: {endpoint.resource_name}")

    # ─── Step 2: Upload model ────────────────────────────────────────────────
    print("\n[2/4] Uploading MedGemma 4B model...")

    # Check for existing model
    existing_models = aiplatform.Model.list(
        filter=f'display_name="{MODEL_DISPLAY_NAME}"',
    )

    model: Optional[aiplatform.Model] = None
    if existing_models:
        model = existing_models[0]
        print(f"  ✓ Found existing model: {model.resource_name}")
    else:
        print("  → Uploading model from Model Garden (this may take 10-20 minutes)...")
        # vLLM serving container with MedGemma weights
        model = aiplatform.Model.upload(
            display_name=MODEL_DISPLAY_NAME,
            description="MedGemma 4B IT — Google's medical AI model fine-tuned for clinical tasks",
            serving_container_image_uri=MEDGEMMA_SERVING_CONTAINER,
            serving_container_environment_variables={
                "MODEL_ID": MEDGEMMA_MODEL_ID,
                "DEPLOY_SOURCE": "hf",
                "MAX_MODEL_LEN": "8192",
                "DTYPE": "bfloat16",
                "GPU_MEMORY_UTILIZATION": "0.9",
                "MAX_NUM_SEQS": "16",
                "ENABLE_PREFIX_CACHING": "true",
            },
            serving_container_ports=[7080],
            serving_container_predict_route="/v1/chat/completions",
            serving_container_health_route="/health",
        )
        model.wait()
        print(f"  ✓ Model uploaded: {model.resource_name}")

    # ─── Step 3: Deploy model to endpoint ────────────────────────────────────
    print("\n[3/4] Deploying model to endpoint...")
    print(f"  Machine: {MACHINE_TYPE}, GPU: {ACCELERATOR_TYPE} x {ACCELERATOR_COUNT}")
    print("  This may take 15-30 minutes...")

    # Check if already deployed
    deployed_models = endpoint.list_models()
    if deployed_models:
        print(f"  ✓ Model already deployed ({len(deployed_models)} deployment(s))")
    else:
        model.deploy(
            endpoint=endpoint,
            deployed_model_display_name=DEPLOYED_MODEL_DISPLAY_NAME,
            machine_type=MACHINE_TYPE,
            accelerator_type=ACCELERATOR_TYPE,
            accelerator_count=ACCELERATOR_COUNT,
            min_replica_count=1,
            max_replica_count=2,
            traffic_percentage=100,
            service_account=SERVICE_ACCOUNT,
            deploy_request_timeout=3600,
        )
        print(f"  ✓ Model deployed successfully!")

    # ─── Step 4: Verify and output configuration ─────────────────────────────
    print("\n[4/4] Verifying deployment...")

    # Test prediction
    try:
        test_response = endpoint.predict(
            instances=[{
                "messages": [
                    {"role": "user", "content": "What are the common findings in a normal chest X-ray?"}
                ],
                "max_tokens": 100,
            }]
        )
        print("  ✓ Test prediction successful!")
        print(f"  Response preview: {str(test_response.predictions[0])[:100]}...")
    except Exception as e:
        print(f"  ⚠ Test prediction failed (model may still be warming up): {e}")
        print("  → Try again in 5-10 minutes")

    # Output configuration
    endpoint_id = endpoint.resource_name
    print(f"\n{'═' * 64}")
    print(f"  DEPLOYMENT COMPLETE!")
    print(f"{'═' * 64}")
    print(f"\n  Add these to your .env.local:\n")
    print(f"  VERTEX_MEDGEMMA_ENDPOINT={endpoint_id}")
    print(f"  USE_VERTEX_MEDGEMMA=true")
    print(f"  VERTEX_MEDGEMMA_REGION={LOCATION}")
    print(f"\n  Endpoint URL for REST calls:")
    print(f"  https://{LOCATION}-aiplatform.googleapis.com/v1/{endpoint_id}:predict")
    print(f"\n{'═' * 64}")

    return endpoint_id


if __name__ == "__main__":
    # Ensure credentials are set
    cred_path = os.environ.get(
        "GOOGLE_APPLICATION_CREDENTIALS",
        "/etc/medisoft/credentials/gcp-credentials.json",
    )
    if not os.path.exists(cred_path):
        # Try alternative path
        alt_path = os.path.expanduser("~/medisoft-app/gcp-credentials.json")
        if os.path.exists(alt_path):
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = alt_path
        else:
            print(f"ERROR: Credentials not found at {cred_path} or {alt_path}")
            sys.exit(1)
    else:
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path

    endpoint_name = deploy_medgemma()
    print(f"\nDone. Endpoint: {endpoint_name}")
