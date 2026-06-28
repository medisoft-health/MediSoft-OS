# MediSoft C-OS — خطة الوصول للاستخدام السريري والإطلاق العام

**من:** CTO Office  
**إلى:** Dr. Hamada Ghaith (CEO)  
**التاريخ:** May 31, 2026  
**الموضوع:** Roadmap من MVP إلى Production-Ready Clinical System

---

## الوضع الحالي

MediSoft دلوقتي عند نقطة **8/10** كـ MVP. عشان يوصل لـ **استخدام سريري حقيقي** و**إطلاق عام**، محتاج يعدّي على **4 مراحل** واضحة. كل مرحلة ليها متطلبات محددة.

---

## المرحلة 1: Security Hardening (أسبوع واحد)

> **الهدف:** تأمين النظام بشكل كامل قبل أي بيانات مرضى حقيقية

### 1.1 إجراءات فورية (يوم واحد)

| المهمة | التفاصيل | الأهمية |
|--------|----------|---------|
| **قفل Cloud SQL** | Restrict authorized networks لـ VM IP فقط (`35.227.122.228/32`) | 🔴 حرج |
| **تفعيل Cloud SQL SSL** | إجبار اتصال مشفر بين الـ App والـ Database | 🔴 حرج |
| **تغيير DB password** | كلمة السر الحالية مكتوبة في AGENTS.md — أي حد يقرأ الـ repo يعرفها | 🔴 حرج |
| **حذف test users** | المستخدمين التجريبيين (audit-v3-test, test-audit-v2) لازم يتشالوا | 🟡 مهم |
| **Rotate session secrets** | تغيير JWT_SECRET وأي secrets مكشوفة | 🔴 حرج |

### 1.2 إجراءات أمنية متقدمة (أسبوع)

| المهمة | التفاصيل |
|--------|----------|
| **Data Encryption at Rest** | تفعيل Cloud SQL encryption (مفعّل by default في GCP) — تأكيد فقط |
| **Data Encryption in Transit** | SSL/TLS بين كل الـ components |
| **Audit Log Enhancement** | كل عملية على بيانات مريض تتسجّل (who, what, when, from where) |
| **Session Timeout** | تقليل session lifetime لـ 4 ساعات (مش 12) للبيئة الطبية |
| **2FA للأطباء** | إضافة Two-Factor Authentication (TOTP) — مطلوب في معظم الأنظمة الصحية |
| **IP Whitelisting** | السماح بالدخول من IPs العيادة/المستشفى فقط (اختياري) |
| **Penetration Testing** | اختبار اختراق من طرف ثالث (شركة أمن سيبراني سعودية) |

---

## المرحلة 2: Clinical Validation (2-4 أسابيع)

> **الهدف:** التأكد إن الـ AI بيدي نتائج صحيحة طبياً

### 2.1 AI Accuracy Testing

| الموديول | طريقة الاختبار | المعيار المطلوب |
|----------|---------------|----------------|
| **PharmaX** (Drug Interactions) | مقارنة 100 تفاعل دوائي معروف مع نتائج النظام | ≥95% accuracy |
| **MediLab** (Lab Interpretation) | 50 تحليل مخبري حقيقي يراجعهم طبيب مختبرات | ≥90% accuracy |
| **MediScan** (Imaging) | 30 صورة أشعة يراجعها أخصائي أشعة | ≥85% accuracy (screening) |
| **MediScript** (SOAP Notes) | 20 جلسة صوتية حقيقية يراجعها الطبيب | ≥90% completeness |
| **MediBot** (Clinical Q&A) | 100 سؤال طبي يراجعهم 3 أطباء | ≥90% accuracy |
| **MediPredict** (Early Warning) | مقارنة مع NEWS2/MEWS scores حقيقية | ≥80% sensitivity |

### 2.2 Clinical Workflow Testing

| الاختبار | التفاصيل |
|----------|----------|
| **Pilot مع 3-5 أطباء** | استخدام النظام لمدة أسبوعين مع مرضى حقيقيين (بإشراف) |
| **Time-to-Task** | قياس الوقت لكل عملية (تسجيل مريض، كتابة وصفة، إلخ) |
| **Error Tracking** | تسجيل كل خطأ أو نتيجة غير دقيقة من الـ AI |
| **Physician Feedback** | استبيان رضا الأطباء (SUS Score ≥ 70) |
| **Edge Cases** | اختبار حالات نادرة (حساسية متعددة، تفاعلات 5+ أدوية، أطفال، حوامل) |

### 2.3 Safety Guardrails

| الإجراء | التفاصيل |
|---------|----------|
| **AI Disclaimer** | رسالة واضحة: "هذا اقتراح AI — القرار النهائي للطبيب" على كل output |
| **Confidence Scoring** | كل نتيجة AI تظهر نسبة الثقة (High/Medium/Low) |
| **Human-in-the-Loop** | الطبيب لازم يوافق على كل وصفة/تشخيص قبل الحفظ |
| **Override Logging** | لو الطبيب رفض اقتراح AI، يتسجّل السبب |
| **Kill Switch** | زرار يوقف كل الـ AI features فوراً لو حصلت مشكلة |

---

## المرحلة 3: Regulatory Compliance (4-8 أسابيع)

> **الهدف:** الامتثال للقوانين السعودية والدولية

### 3.1 Saudi PDPL (نظام حماية البيانات الشخصية)

| المتطلب | الحالة | المطلوب |
|---------|--------|---------|
| **موافقة المريض** | ⚠️ Consent Management API موجود | تفعيل UI واضح للموافقة |
| **حق الوصول** | ❌ غير موجود | صفحة "بياناتي" للمريض يشوف كل بياناته |
| **حق الحذف** | ❌ غير موجود | آلية حذف بيانات المريض بالكامل |
| **حق التصحيح** | ❌ غير موجود | المريض يقدر يطلب تعديل بياناته |
| **إشعار الاختراق** | ❌ غير موجود | آلية إبلاغ SDAIA خلال 72 ساعة |
| **Data Residency** | ✅ GCP me-central1 (الدوحة) | قريب — محتاج me-west1 (الدمام) لو متاح |
| **DPO (مسؤول حماية بيانات)** | ❌ غير معيّن | تعيين شخص مسؤول |

### 3.2 HIPAA Compliance (لو عاوز السوق الأمريكي)

| المتطلب | الحالة | المطلوب |
|---------|--------|---------|
| **BAA مع Google** | ❌ | توقيع Business Associate Agreement مع GCP |
| **Access Controls** | ✅ Role-based (admin/physician) | إضافة nurse, receptionist roles |
| **Audit Trail** | ✅ audit_log table | تعزيز بـ IP, device, action details |
| **Minimum Necessary** | ⚠️ | كل role يشوف بس البيانات اللي يحتاجها |
| **Breach Notification** | ❌ | آلية إبلاغ خلال 60 يوم |

### 3.3 Saudi FDA (SFDA) — لو النظام يُصنّف كـ Medical Device Software

| المتطلب | التفاصيل |
|---------|----------|
| **تصنيف المنتج** | تحديد هل MediSoft يُصنّف كـ SaMD (Software as Medical Device) |
| **IEC 62304** | معيار دورة حياة برمجيات الأجهزة الطبية |
| **ISO 14971** | إدارة المخاطر للأجهزة الطبية |
| **Clinical Evidence** | دراسة سريرية تثبت فعالية وأمان النظام |
| **QMS** | نظام إدارة جودة (ISO 13485) |

> **ملاحظة مهمة:** لو MediSoft يُستخدم كـ **أداة مساعدة للطبيب** (Decision Support) وليس كـ **أداة تشخيص مستقلة**، قد لا يحتاج تصنيف SFDA. محتاج استشارة قانونية متخصصة.

---

## المرحلة 4: Production Readiness (2-3 أسابيع)

> **الهدف:** النظام يتحمّل مستخدمين حقيقيين بدون مشاكل

### 4.1 Infrastructure Scaling

| المهمة | التفاصيل | الأولوية |
|--------|----------|---------|
| **Load Balancer** | Google Cloud Load Balancer أمام الـ VM | 🔴 |
| **Auto-scaling** | Cloud Run أو GKE عشان يتحمّل الضغط | 🟡 |
| **CDN** | Cloud CDN للـ static assets | 🟡 |
| **Redis Cache** | تقليل DB queries المتكررة | 🟡 |
| **Database Read Replicas** | لو عدد المستخدمين > 100 | 🟢 |
| **Separate DB for Analytics** | عشان الـ queries الثقيلة ما تأثر على الـ app | 🟢 |

### 4.2 Monitoring & Alerting

| الأداة | الغرض | التكلفة |
|--------|-------|---------|
| **UptimeRobot** | مراقبة uptime + تنبيه SMS/Email | مجاني |
| **Google Cloud Monitoring** | CPU, Memory, Disk, Network | مجاني (basic) |
| **Sentry** | Error tracking + stack traces | مجاني (5K events/month) |
| **Cloud Logging** | Centralized logs | مشمول في GCP |
| **PagerDuty/OpsGenie** | On-call alerting للطوارئ | $9/user/month |

### 4.3 Performance Optimization

| المهمة | التأثير |
|--------|---------|
| **Database indexing** | تسريع queries (خاصة patients search) |
| **API response caching** | تقليل Gemini API calls المتكررة |
| **Image optimization** | Lazy loading + WebP للـ scans |
| **Connection pooling tuning** | ضبط حسب الـ load الفعلي |
| **Load testing** | K6 أو Artillery — هدف: 100 concurrent users |

### 4.4 Full Arabic Translation

| القسم | Keys المطلوبة | الحالة |
|-------|:------------:|--------|
| Navigation & Common | 329 | ✅ جاهز |
| Patient Pages | ~200 | ❌ محتاج |
| Encounter Pages | ~150 | ❌ محتاج |
| Prescription Pages | ~100 | ❌ محتاج |
| Lab & Scan Pages | ~150 | ❌ محتاج |
| Appointments | ~80 | ❌ محتاج |
| Settings & Profile | ~100 | ❌ محتاج |
| Error Messages | ~50 | ❌ محتاج |
| AI Responses | Dynamic | ⚠️ Gemini يرد بالعربي لو الـ prompt بالعربي |
| **المجموع** | ~1,500+ | ⚠️ محتاج 2-3 أيام شغل |

### 4.5 Mobile App

| الخيار | المدة | التكلفة | الملاحظات |
|--------|-------|---------|----------|
| **PWA (Progressive Web App)** | أسبوع | مجاني | الأسرع — يشتغل من المتصفح كـ app |
| **React Native** | 4-6 أسابيع | متوسطة | Native feel, يحتاج مبرمج mobile |
| **Flutter** | 4-6 أسابيع | متوسطة | Cross-platform, UI ممتاز |
| **Capacitor (Ionic)** | 2 أسابيع | مجاني | يلف الـ web app في native shell |

**توصيتي:** ابدأ بـ **PWA** (أسبوع واحد) — يدي تجربة mobile كويسة بدون تطوير إضافي. بعدين لو محتاج native features (camera, push notifications)، انتقل لـ Capacitor.

---

## 5. Timeline المقترح

```
الأسبوع 1-2:   المرحلة 1 (Security Hardening)
الأسبوع 2-5:   المرحلة 2 (Clinical Validation) — بالتوازي مع المرحلة 3
الأسبوع 3-8:   المرحلة 3 (Regulatory Compliance)
الأسبوع 6-8:   المرحلة 4 (Production Readiness)
الأسبوع 9:     Soft Launch (عيادة واحدة)
الأسبوع 12:    Public Launch
```

**المدة الإجمالية: 8-12 أسبوع (2-3 شهور)**

---

## 6. التكلفة التقديرية

| البند | التكلفة الشهرية | ملاحظات |
|-------|:--------------:|---------|
| **GCP (Cloud SQL + VM + Storage)** | ~$150-300 | حسب الاستخدام |
| **Gemini API** | ~$50-200 | حسب عدد الـ requests |
| **Domain + SSL** | $15/year | موجود |
| **Twilio (SMS/WhatsApp/Voice)** | ~$50-100 | حسب الاستخدام |
| **Sentry (Error Tracking)** | مجاني | 5K events/month |
| **UptimeRobot** | مجاني | Basic plan |
| **Penetration Testing** | $2,000-5,000 (مرة واحدة) | شركة أمن سيبراني |
| **Legal/Regulatory Consultation** | $3,000-10,000 (مرة واحدة) | محامي متخصص في health tech |
| **Clinical Validation Study** | $5,000-15,000 (مرة واحدة) | حسب عدد الأطباء والمرضى |

**التكلفة الشهرية التشغيلية: ~$300-600**  
**التكلفة لمرة واحدة (compliance + testing): ~$10,000-30,000**

---

## 7. أولويات التنفيذ — ماذا تعمل أولاً؟

### هذا الأسبوع (الآن):
1. ✅ قفل Cloud SQL (10 دقايق)
2. ✅ إضافة AI Disclaimer على كل output
3. ✅ تفعيل UptimeRobot
4. ✅ بدء pilot مع 2-3 أطباء

### الأسبوع القادم:
5. إضافة 2FA
6. إضافة Confidence Scoring للـ AI
7. بدء Arabic translation الكامل
8. توصيل Twilio

### خلال شهر:
9. Penetration testing
10. استشارة قانونية (PDPL/SFDA)
11. Load testing
12. PWA للموبايل

---

## 8. توصية CTO النهائية

> **MediSoft عنده أساس تقني ممتاز.** المشكلة مش في الكود — المشكلة في الـ **validation والـ compliance**. الكود جاهز 80%، لكن الـ regulatory والـ clinical validation هما اللي هياخدوا وقت ومال.

**أهم 3 حاجات تعملها دلوقتي:**

1. **قفل الـ Database** — ده أمن مرضى
2. **ابدأ pilot مع أطباء** — feedback حقيقي أهم من أي feature جديدة
3. **استشارة قانونية** — هل محتاج SFDA approval ولا لا؟ ده يحدد الـ timeline كله

---

*Prepared by CTO Office — MediSoft*  
*May 31, 2026*
