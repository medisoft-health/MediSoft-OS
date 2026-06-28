# MediSoft × Google Health — خطة تنفيذية كاملة

## السياق والهدف

أنت تعمل كـ Senior AI Engineer في شركة MediSoft — نظام تشغيل طبي ذكي (Clinical Operating System). الهدف هو دمج تقنيات Google Health AI في النظام بشكل تدريجي ومنظم. النظام الحالي مبني بـ Next.js + PostgreSQL + Better-Auth ومنشور على Google Cloud VM.

**المنتج:** MediSoft C-OS يتكون من 5 وحدات أساسية:
- **MediScript** — توثيق الجلسة الطبية (أعراض، تشخيص، ملاحظات، علاج)
- **PharmaX** — إدارة الوصفات + كشف التفاعلات الدوائية
- **MediLab** — تحليل نتائج المختبر وتحويلها لـ infographics
- **MediScan** — تحليل الصور الإشعاعية بالذكاء الاصطناعي
- **MediBot** — مساعد ذكي للطبيب (chat + context-aware)

**التقنيات المستهدفة من Google Health:**
- MedGemma (LLM طبي مفتوح المصدر)
- MedASR (تحويل صوت طبي لنص)
- MedSigLIP (تحليل صور طبية)
- TxGemma (تحليل تفاعلات دوائية)
- Cloud Healthcare API (FHIR compliance)
- Google Health API (wearables data)

---

## المرحلة ١: البنية التحتية (أسبوع 1-2)

### الخطوة ١.١: ترقية السيرفر وإعداد Google Cloud

```
المهمة: إعداد بيئة Google Cloud مناسبة لتشغيل ML models

الخطوات:
1. إنشاء مشروع جديد على Google Cloud Console باسم "medisoft-prod"
2. تفعيل الـ APIs التالية:
   - Vertex AI API
   - Cloud Healthcare API
   - Cloud Run API
   - Cloud SQL API
   - Artifact Registry API
3. إنشاء Service Account باسم "medisoft-ai-service" مع الصلاحيات:
   - roles/aiplatform.user
   - roles/healthcare.datasetAdmin
   - roles/run.admin
4. إعداد VPC network مع Private Service Access لـ Cloud SQL
5. إنشاء Cloud SQL (PostgreSQL 16) instance:
   - Tier: db-custom-2-4096 (2 vCPU, 4GB RAM)
   - Storage: 20GB SSD
   - Region: me-central1 (الدمام) أو europe-west1
   - Enable private IP
```

### الخطوة ١.٢: نقل MediSoft لـ Cloud Run

```
المهمة: containerize التطبيق ونشره على Cloud Run

الخطوات:
1. إنشاء Dockerfile:

FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]

2. إنشاء cloudbuild.yaml:

steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'me-central1-docker.pkg.dev/$PROJECT_ID/medisoft/app:$COMMIT_SHA', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'me-central1-docker.pkg.dev/$PROJECT_ID/medisoft/app:$COMMIT_SHA']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args: ['run', 'deploy', 'medisoft-app', '--image', 'me-central1-docker.pkg.dev/$PROJECT_ID/medisoft/app:$COMMIT_SHA', '--region', 'me-central1', '--memory', '2Gi', '--cpu', '2']

3. ربط GitHub repo بـ Cloud Build للنشر التلقائي
4. إعداد Custom Domain على Cloud Run
5. نقل قاعدة البيانات من PostgreSQL المحلي لـ Cloud SQL
```

### الخطوة ١.٣: إعداد Vertex AI Endpoints

```
المهمة: تجهيز endpoints لاستضافة ML models

الخطوات:
1. إنشاء Vertex AI Model Registry
2. تجهيز endpoint لكل model:
   - medisoft-medgemma-endpoint (GPU: NVIDIA T4)
   - medisoft-medsiglip-endpoint (GPU: NVIDIA T4)
   - medisoft-medasr-endpoint (CPU كافي)
3. إعداد autoscaling:
   - Min replicas: 0 (لتوفير التكلفة)
   - Max replicas: 3
   - Scale-up trigger: 60% GPU utilization
4. إعداد VPC peering بين Vertex AI و Cloud Run
```

---

## المرحلة ٢: دمج MedGemma في MediBot (أسبوع 3-4)

### الخطوة ٢.١: تحميل وتجهيز MedGemma

```
المهمة: تحميل MedGemma 4B وتشغيله على Vertex AI

الخطوات:
1. تحميل النموذج من HuggingFace:
   - Model: google/medgemma-4b-it (instruction-tuned)
   - Size: ~8GB
   - URL: https://huggingface.co/google/medgemma-4b-it

2. إنشاء serving container:

# Dockerfile.medgemma
FROM nvidia/cuda:12.1-runtime-ubuntu22.04
RUN pip install vllm transformers torch
COPY serve.py /app/serve.py
CMD ["python", "/app/serve.py"]

3. كتابة serve.py:

from vllm import LLM, SamplingParams
from fastapi import FastAPI
import uvicorn

app = FastAPI()
llm = LLM(model="google/medgemma-4b-it", gpu_memory_utilization=0.9)

@app.post("/generate")
async def generate(prompt: str, max_tokens: int = 1024):
    params = SamplingParams(temperature=0.3, max_tokens=max_tokens)
    output = llm.generate([prompt], params)
    return {"response": output[0].outputs[0].text}

uvicorn.run(app, host="0.0.0.0", port=8080)

4. رفع الـ container لـ Artifact Registry
5. Deploy على Vertex AI endpoint مع GPU T4
6. اختبار الـ endpoint:
   curl -X POST https://ENDPOINT_URL/generate \
     -H "Authorization: Bearer $(gcloud auth print-access-token)" \
     -d '{"prompt": "Patient presents with chest pain radiating to left arm..."}'
```

### الخطوة ٢.٢: بناء MediBot Routing Layer

```
المهمة: بناء طبقة توجيه ذكية تختار بين MedGemma و Gemini حسب نوع السؤال

الخطوات:
1. إنشاء ملف server/services/medibot-router.ts:

interface MediBotRequest {
  message: string;
  context: {
    patientId?: string;
    encounterHistory?: string[];
    currentMedications?: string[];
  };
  type: 'clinical' | 'general' | 'drug-interaction' | 'imaging';
}

// Routing logic:
// - clinical questions → MedGemma (أدق في المصطلحات الطبية)
// - general questions → Gemini API (أسرع وأرخص)
// - drug interactions → TxGemma (متخصص)
// - imaging analysis → MedSigLIP (متخصص)

export async function routeMediBotRequest(req: MediBotRequest) {
  const classifier = await classifyIntent(req.message);
  
  switch(classifier.type) {
    case 'clinical':
      return await callMedGemma(req);
    case 'drug-interaction':
      return await callTxGemma(req);
    case 'imaging':
      return await callMedSigLIP(req);
    default:
      return await callGeminiAPI(req);
  }
}

2. إنشاء system prompts مخصصة لكل model:
   - MedGemma: "You are MediBot, a clinical assistant for MediSoft C-OS..."
   - Include patient context (FHIR format) in each request
   - Add safety guardrails (لا يشخص بدون طبيب)

3. إضافة tRPC procedure:

medibot: {
  chat: protectedProcedure
    .input(z.object({
      message: z.string(),
      patientId: z.string().optional(),
      sessionId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const context = await buildPatientContext(input.patientId);
      const response = await routeMediBotRequest({
        message: input.message,
        context,
        type: classifyIntent(input.message),
      });
      await saveToConversationHistory(input.sessionId, input.message, response);
      return { response, sources: response.citations };
    }),
}
```

### الخطوة ٢.٣: FHIR Context Builder

```
المهمة: بناء محول يحول بيانات المريض لصيغة FHIR لإرسالها مع كل request لـ MedGemma

الخطوات:
1. إنشاء server/services/fhir-context.ts:

export function buildFHIRPatientContext(patient: Patient, encounters: Encounter[]) {
  return {
    resourceType: "Bundle",
    type: "collection",
    entry: [
      {
        resource: {
          resourceType: "Patient",
          id: patient.id,
          name: [{ given: [patient.firstName], family: patient.lastName }],
          gender: patient.gender,
          birthDate: patient.dateOfBirth,
        }
      },
      ...encounters.map(enc => ({
        resource: {
          resourceType: "Encounter",
          id: enc.id,
          status: enc.status,
          type: [{ text: enc.encounterType }],
          period: { start: enc.encounterDate },
          reasonCode: enc.diagnosis ? [{ text: enc.diagnosis }] : [],
        }
      })),
      // Add medications, lab results, vitals...
    ]
  };
}

2. هذا الـ context يُرسل مع كل سؤال لـ MedGemma:
   "Given this patient's FHIR record: {context}\n\nDoctor's question: {message}"

3. MedGemma مُدرَّب على FHIR فهيفهم البيانات مباشرة بدون parsing إضافي
```

---

## المرحلة ٣: دمج MedASR في MediScript (أسبوع 5-6)

### الخطوة ٣.١: إعداد MedASR Service

```
المهمة: تشغيل MedASR كـ microservice للإملاء الصوتي الطبي

الخطوات:
1. تحميل MedASR model من Google HAI-DEF
2. إنشاء serving container:

# Dockerfile.medasr
FROM python:3.11-slim
RUN pip install torch torchaudio transformers fastapi uvicorn
COPY medasr_service.py /app/
CMD ["python", "/app/medasr_service.py"]

3. كتابة medasr_service.py:

from transformers import AutoModelForSpeechSeq2Seq, AutoProcessor
from fastapi import FastAPI, UploadFile
import torchaudio
import torch

app = FastAPI()
model = AutoModelForSpeechSeq2Seq.from_pretrained("google/medasr")
processor = AutoProcessor.from_pretrained("google/medasr")

@app.post("/transcribe")
async def transcribe(audio: UploadFile, language: str = "en"):
    audio_bytes = await audio.read()
    # Process audio
    waveform, sample_rate = torchaudio.load(io.BytesIO(audio_bytes))
    if sample_rate != 16000:
        waveform = torchaudio.transforms.Resample(sample_rate, 16000)(waveform)
    
    inputs = processor(waveform.squeeze(), sampling_rate=16000, return_tensors="pt")
    generated_ids = model.generate(**inputs)
    transcription = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
    
    return {
        "text": transcription,
        "language": language,
        "medical_terms": extract_medical_terms(transcription),
    }

4. Deploy على Cloud Run (CPU كافي لـ ASR)
5. إعداد WebSocket connection للـ real-time streaming
```

### الخطوة ٣.٢: دمج الإملاء في MediScript UI

```
المهمة: إضافة زر الميكروفون في واجهة MediScript

الخطوات:
1. إنشاء client/src/components/VoiceDictation.tsx:

- زر ميكروفون (toggle recording)
- عرض النص المُملى في real-time
- خيار "Insert into notes" لإدراج النص في الحقل المطلوب
- مؤشر مستوى الصوت (audio level indicator)
- دعم اللغتين العربية والإنجليزية

2. استخدام Web Audio API لالتقاط الصوت:
   - MediaRecorder API للتسجيل
   - إرسال chunks كل 5 ثواني للـ backend
   - عرض النص progressively

3. إضافة tRPC procedure:

mediscript: {
  transcribe: protectedProcedure
    .input(z.object({
      audioUrl: z.string(), // S3 URL after upload
      language: z.enum(['ar', 'en']),
      encounterId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const result = await callMedASR(input.audioUrl, input.language);
      return {
        text: result.text,
        medicalTerms: result.medical_terms,
        confidence: result.confidence,
      };
    }),
}

4. Post-processing:
   - تصحيح المصطلحات الطبية تلقائياً
   - اقتراح ICD-10 codes من النص
   - تنسيق النص (فقرات، نقاط)
```

---

## المرحلة ٤: دمج MedSigLIP في MediScan (أسبوع 7-8)

### الخطوة ٤.١: إعداد MedSigLIP Service

```
المهمة: تشغيل MedSigLIP لتحليل الصور الطبية

الخطوات:
1. تحميل النموذج:
   - URL: https://developers.google.com/health-ai-developer-foundations/medsiglip
   - يدعم: X-ray, CT, MRI, Dermoscopy, Ophthalmology

2. إنشاء inference service:

from transformers import AutoModel, AutoProcessor
from fastapi import FastAPI, UploadFile
from PIL import Image
import torch

app = FastAPI()
model = AutoModel.from_pretrained("google/medsiglip")
processor = AutoProcessor.from_pretrained("google/medsiglip")

@app.post("/analyze")
async def analyze_image(image: UploadFile, modality: str, clinical_question: str = ""):
    img = Image.open(io.BytesIO(await image.read()))
    
    # Zero-shot classification with medical prompts
    candidate_labels = get_labels_for_modality(modality)
    inputs = processor(
        text=candidate_labels,
        images=img,
        return_tensors="pt",
        padding=True
    )
    
    outputs = model(**inputs)
    probs = outputs.logits_per_image.softmax(dim=1)
    
    # Generate findings
    findings = []
    for label, prob in zip(candidate_labels, probs[0]):
        if prob > 0.3:
            findings.append({"finding": label, "confidence": prob.item()})
    
    return {
        "findings": sorted(findings, key=lambda x: x["confidence"], reverse=True),
        "modality_detected": modality,
        "recommendations": generate_recommendations(findings),
    }

3. Deploy على Vertex AI endpoint مع GPU T4
4. إعداد DICOM viewer integration (Cornerstone.js)
```

### الخطوة ٤.٢: بناء MediScan Pipeline

```
المهمة: بناء pipeline كامل من رفع الصورة حتى التقرير النهائي

الخطوات:
1. Pipeline Flow:
   Upload Image → Validate DICOM/JPEG → Detect Modality → 
   MedSigLIP Analysis → MedGemma Report Generation → 
   Doctor Review → Final Report (PDF)

2. إنشاء server/services/mediscan-pipeline.ts:

export async function analyzeScan(input: {
  imageUrl: string;
  patientId: string;
  modality: 'xray' | 'ct' | 'mri' | 'dermoscopy' | 'ophthalmology';
  clinicalQuestion?: string;
}) {
  // Step 1: MedSigLIP image analysis
  const imageFindings = await callMedSigLIP(input.imageUrl, input.modality);
  
  // Step 2: MedGemma report generation
  const patientContext = await buildFHIRPatientContext(input.patientId);
  const report = await callMedGemma({
    prompt: `Based on these imaging findings: ${JSON.stringify(imageFindings)}
             Patient context: ${JSON.stringify(patientContext)}
             Clinical question: ${input.clinicalQuestion || 'General assessment'}
             
             Generate a structured radiology report with:
             1. Findings (for doctor - technical)
             2. Patient summary (simple language)
             3. Recommendations
             4. Urgency level (routine/urgent/critical)`,
  });
  
  // Step 3: Save to database
  await saveScanResult({
    patientId: input.patientId,
    imageUrl: input.imageUrl,
    findings: imageFindings,
    report: report,
    status: 'pending_review', // Doctor must approve
  });
  
  return { findings: imageFindings, report, status: 'pending_review' };
}

3. Frontend: DICOM viewer + AI overlay
   - Cornerstone.js لعرض DICOM
   - Overlay layer لتحديد المناطق المشبوهة
   - Side panel للتقرير + اقتراحات
```

---

## المرحلة ٥: دمج TxGemma في PharmaX (أسبوع 9-10)

### الخطوة ٥.١: تعزيز كشف التفاعلات الدوائية

```
المهمة: إضافة TxGemma كطبقة ذكاء اصطناعي فوق DrugBank/OpenFDA

الخطوات:
1. Architecture:
   Doctor writes prescription → PharmaX checks:
   Layer 1: DrugBank API (known interactions - fast)
   Layer 2: OpenFDA (adverse events - fast)
   Layer 3: TxGemma (complex/novel interactions - AI)
   
   If Layer 1 & 2 find nothing → Layer 3 analyzes
   If Layer 3 finds risk → Alert doctor with explanation

2. إنشاء server/services/pharmax-ai.ts:

export async function checkDrugInteractions(prescription: {
  medications: Array<{ name: string; dose: string; frequency: string }>;
  patientProfile: { age: number; weight: number; conditions: string[]; currentMeds: string[] };
}) {
  // Layer 1: DrugBank (fast, known interactions)
  const knownInteractions = await checkDrugBank(prescription.medications);
  
  // Layer 2: OpenFDA (adverse events)
  const adverseEvents = await checkOpenFDA(prescription.medications);
  
  // Layer 3: TxGemma (AI analysis for complex cases)
  if (knownInteractions.length === 0 || prescription.medications.length > 3) {
    const aiAnalysis = await callTxGemma({
      medications: prescription.medications,
      patientProfile: prescription.patientProfile,
      query: "Analyze potential drug-drug and drug-condition interactions. Consider pharmacokinetics and patient-specific factors.",
    });
    
    return {
      knownInteractions,
      adverseEvents,
      aiAnalysis,
      overallRisk: calculateRiskScore(knownInteractions, adverseEvents, aiAnalysis),
      alternatives: aiAnalysis.suggestedAlternatives,
    };
  }
  
  return { knownInteractions, adverseEvents, aiAnalysis: null, overallRisk: 'low' };
}

3. UI: Traffic light system
   - 🟢 Green: No interactions found
   - 🟡 Yellow: Minor interactions (proceed with caution)
   - 🔴 Red: Critical interaction (must change medication)
   - Each alert shows: What's the problem + Why + Alternative suggestion
```

---

## المرحلة ٦: FHIR Compliance + Cloud Healthcare API (أسبوع 11-12)

### الخطوة ٦.١: تحويل قاعدة البيانات لمعيار FHIR

```
المهمة: جعل بيانات MediSoft متوافقة مع معيار FHIR R4

الخطوات:
1. Mapping الجداول الحالية لـ FHIR Resources:
   - patients → Patient resource
   - encounters → Encounter resource
   - prescriptions → MedicationRequest resource
   - lab_results → Observation resource (laboratory)
   - vitals → Observation resource (vital-signs)
   - scans → ImagingStudy resource

2. إنشاء FHIR API layer (server/services/fhir/):
   - fhir-patient.ts
   - fhir-encounter.ts
   - fhir-medication.ts
   - fhir-observation.ts
   - fhir-imaging.ts

3. تفعيل Cloud Healthcare API:
   gcloud healthcare datasets create medisoft-dataset --location=me-central1
   gcloud healthcare fhir-stores create medisoft-fhir \
     --dataset=medisoft-dataset \
     --location=me-central1 \
     --version=R4

4. Sync strategy:
   - Primary: PostgreSQL (fast reads/writes)
   - Secondary: Cloud Healthcare FHIR Store (compliance + interoperability)
   - Sync: Event-driven (on create/update → push to FHIR store)

5. Benefits:
   - تبادل البيانات مع أي مستشفى يدعم FHIR
   - متوافق مع متطلبات وزارة الصحة السعودية
   - جاهز لربط Nphies (التأمين الصحي)
```

---

## المرحلة ٧: Google Health API — Wearables (أسبوع 13-14)

### الخطوة ٧.١: دمج بيانات الأجهزة القابلة للارتداء

```
المهمة: جمع بيانات المريض من Fitbit/Pixel Watch/Samsung Health

الخطوات:
1. تسجيل MediSoft كـ OAuth client في Google Health API
2. إنشاء consent flow للمريض (موافقة صريحة)
3. جمع البيانات:
   - Heart rate (resting + active)
   - Sleep quality & duration
   - Steps & activity level
   - SpO2 (oxygen saturation)
   - Stress level

4. إنشاء server/services/wearables.ts:

export async function syncPatientWearableData(patientId: string, googleToken: string) {
  const healthData = await googleHealthAPI.getData({
    token: googleToken,
    dataTypes: ['heart_rate', 'sleep', 'steps', 'spo2'],
    dateRange: { start: lastSyncDate, end: now() },
  });
  
  // Store in vitals table
  await saveWearableVitals(patientId, healthData);
  
  // Generate pre-visit summary
  const summary = await callMedGemma({
    prompt: `Summarize this patient's wearable health data for the past week:
             ${JSON.stringify(healthData)}
             Highlight any concerning trends.`,
  });
  
  return { data: healthData, summary };
}

5. UI: Pre-visit dashboard
   - الطبيب يرى ملخص 7 أيام قبل الجلسة
   - تنبيهات لأي قراءات غير طبيعية
   - رسوم بيانية للاتجاهات (trends)
```

---

## المرحلة ٨: التقديم لبرامج Google (يبدأ فوراً بالتوازي)

### الخطوة ٨.١: Google Cloud for Startups Application

```
المهمة: التقديم للحصول على $350,000 أرصدة مجانية

المتطلبات:
1. شركة مسجلة (CR سعودي أو مصري)
2. موقع إلكتروني (http://35.227.122.228 أو domain)
3. وصف المنتج (500 كلمة)
4. مرحلة التمويل (Pre-seed/Seed)
5. حجم الفريق

الرابط: https://cloud.google.com/startup

نص التقديم المقترح:
"MediSoft is a Clinical Operating System (C-OS) built for healthcare providers 
in the MENA region. Our AI-powered platform integrates patient management, 
clinical documentation (MediScript), prescription safety (PharmaX), lab analysis 
(MediLab), and medical imaging (MediScan) into a unified workflow. We leverage 
Google's Health AI Developer Foundations (MedGemma, MedSigLIP, MedASR) to deliver 
clinician-grade AI assistance. Currently serving early adopters in Saudi Arabia, 
we plan to scale across GCC markets. We need Google Cloud credits to deploy our 
ML models on Vertex AI and ensure HIPAA/FHIR compliance via Cloud Healthcare API."
```

### الخطوة ٨.٢: Growth Academy Application

```
المهمة: التقديم لبرنامج Growth Academy: AI for Health

الرابط: https://startup.google.com/programs/growth-academy/ai-for-health/emea/

نقاط القوة في التقديم:
- AI-first product (MedGemma, MedSigLIP integration)
- MENA market focus (underserved)
- FHIR compliance (interoperability)
- Clear revenue model (SaaS per clinic)
- Traction: working MVP deployed
```

---

## ملخص الجدول الزمني

| الأسبوع | المرحلة | المخرج الرئيسي |
|---------|---------|---------------|
| 1-2 | البنية التحتية | Cloud Run + Cloud SQL + Vertex AI ready |
| 3-4 | MedGemma + MediBot | AI chatbot يفهم السياق الطبي |
| 5-6 | MedASR + MediScript | إملاء صوتي طبي real-time |
| 7-8 | MedSigLIP + MediScan | تحليل صور إشعاعية بالـ AI |
| 9-10 | TxGemma + PharmaX | كشف تفاعلات دوائية ذكي |
| 11-12 | FHIR + Healthcare API | توافق عالمي + تبادل بيانات |
| 13-14 | Wearables | بيانات حيوية مستمرة |
| مستمر | Google Programs | $350K credits + mentorship |

---

## ملاحظات مهمة للتنفيذ

1. **الأمان أولاً:** كل البيانات الطبية مشفرة at-rest و in-transit. لا يتم إرسال بيانات مرضى حقيقيين لأي model بدون anonymization.

2. **Doctor-in-the-loop:** كل مخرجات الـ AI تحتاج موافقة الطبيب قبل الاعتماد. لا يوجد تشخيص تلقائي.

3. **Fallback strategy:** لو أي model فشل أو بطيء، النظام يرجع لـ Gemini API كـ fallback. المريض لا ينتظر أبداً.

4. **Cost management:** نبدأ بـ min-replicas=0 لكل endpoint. الـ models تشتغل فقط لما يكون فيه requests.

5. **Testing:** كل model يتم اختباره على 100+ حالة طبية حقيقية (anonymized) قبل النشر.

6. **Compliance:** نحتاج مراجعة قانونية لاستخدام AI في القرارات الطبية حسب قوانين SFDA (السعودية) و EDA (مصر).

---

## الملفات والروابط المرجعية

| المورد | الرابط |
|--------|--------|
| MedGemma (HuggingFace) | https://huggingface.co/google/medgemma-4b-it |
| MedSigLIP Docs | https://developers.google.com/health-ai-developer-foundations/medsiglip |
| Cloud Healthcare API | https://cloud.google.com/healthcare-api |
| FHIR R4 Specification | https://hl7.org/fhir/R4/ |
| Google Cloud Startups | https://cloud.google.com/startup |
| Growth Academy | https://startup.google.com/programs/growth-academy/ai-for-health/emea/ |
| Open Health Stack | https://developers.google.com/open-health-stack |
| Vertex AI Model Garden | https://cloud.google.com/vertex-ai/docs/model-garden |
