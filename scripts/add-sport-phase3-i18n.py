#!/usr/bin/env python3
"""Add MediSport Phase 3 i18n keys to en.json and ar.json.

Namespaces:
- SportBuilder  (Coach Program Builder)
- SportCoach    (MediSport Personal Coach)
- SportWada     (WADA Banned Substance Check)
- SportBridge   (Medical Context Bridge)
"""
import json
import os

BASE = os.path.join(os.path.dirname(__file__), "..", "messages")
EN_PATH = os.path.join(BASE, "en.json")
AR_PATH = os.path.join(BASE, "ar.json")

EN = {
    "SportBuilder": {
        "title": "Program Builder",
        "subtitle": "Compose training programs for your trainees",
        "save": "Save",
        "saved": "Saved",
        "programName": "Program Name",
        "programNamePlaceholder": "e.g. Upper Body Strength",
        "startFromTemplate": "Start from a template",
        "daysPerWeek": "days/week",
        "exercises": "Exercises",
        "totalSets": "Total Sets",
        "estCalories": "Est. Calories",
        "sets": "Sets",
        "reps": "Reps",
        "rest": "Rest (s)",
        "addExercise": "Add Exercise",
        "exerciseLibrary": "Exercise Library",
        "searchExercise": "Search exercise...",
        "allGroups": "All",
        "beginner": "Beginner",
        "intermediate": "Intermediate",
        "advanced": "Advanced",
        "goal_muscle_gain": "Muscle Gain",
        "goal_fat_loss": "Fat Loss",
        "goal_strength": "Strength",
        "goal_endurance": "Endurance",
        "goal_general": "General",
        "mg_chest": "Chest",
        "mg_back": "Back",
        "mg_shoulders": "Shoulders",
        "mg_arms": "Arms",
        "mg_legs": "Legs",
        "mg_glutes": "Glutes",
        "mg_core": "Core",
        "mg_full_body": "Full Body",
        "mg_cardio": "Cardio",
    },
    "SportCoach": {
        "title": "MediSport Personal Coach",
        "subtitle": "Personalized nutrition & ideal-weight guidance",
        "yourData": "Your Data",
        "sex": "Sex",
        "male": "Male",
        "female": "Female",
        "age": "Age",
        "height": "Height (cm)",
        "weight": "Weight (kg)",
        "bodyFatOptional": "Body Fat % (optional)",
        "muscleMassOptional": "Muscle Mass kg (optional)",
        "activityLevel": "Activity Level",
        "goal": "Goal",
        "generatePlan": "Generate Plan",
        "idealWeightRange": "Ideal Weight Range",
        "kg": "kg",
        "weeks": "weeks",
        "alreadyIdeal": "Already in ideal range",
        "targetCalories": "Target Calories",
        "hydration": "Hydration",
        "liters": "L",
        "protein": "Protein",
        "carbs": "Carbs",
        "fat": "Fat",
        "kcal": "kcal",
        "mealPlan": "Meal Plan",
        "supplements": "Suggested Supplements",
        "supplementDisclaimer": "Consult a physician before starting any supplement.",
        "tips": "Coach Tips",
        "timing_breakfast": "Breakfast",
        "timing_lunch": "Lunch",
        "timing_dinner": "Dinner",
        "timing_snack": "Snack",
        "timing_pre_workout": "Pre-Workout",
        "timing_post_workout": "Post-Workout",
    },
    "SportWada": {
        "title": "WADA Substance Check",
        "subtitle": "Check if a substance is prohibited in sport",
        "searchPlaceholder": "Search medication or substance...",
        "status_prohibited": "Prohibited",
        "status_prohibited_in_competition": "In-Competition",
        "status_monitored": "Monitored",
        "status_permitted": "Permitted",
        "alternatives": "Alternatives",
        "noResults": "No substances found",
        "disclaimer": "This is an educational reference based on the WADA Prohibited List categories. Always confirm with the latest official WADA Prohibited List and a qualified sports physician before use.",
    },
    "SportBridge": {
        "title": "Medical Context Bridge",
        "subtitle": "Link your MediSoft medical record securely",
        "privacyNote": "You control exactly which medical data is shared. You can revoke access at any time. All data transfer is encrypted and consent-based.",
        "linkRecord": "Link Medical Record",
        "linkDescription": "Enter your MediSoft Medical Record Number (MRN) to securely connect your clinical data.",
        "mrnPlaceholder": "MRN-YYYYMMDD-XXXX",
        "linkButton": "Link Record",
        "linkedTitle": "Record Linked",
        "linkedDesc": "Connected to MRN",
        "shareControls": "Sharing Controls",
        "saveConsents": "Save Preferences",
        "consentsSaved": "Preferences Saved",
        "coachViewTitle": "What your coach can see",
        "nothingShared": "Nothing is currently shared",
        "cat_labResults": "Lab Results",
        "cat_labResults_desc": "Blood tests, biomarkers, panels",
        "cat_vitals": "Vital Signs",
        "cat_vitals_desc": "Heart rate, blood pressure, SpO2",
        "cat_bodyComposition": "Body Composition",
        "cat_bodyComposition_desc": "Muscle mass, body fat percentage",
        "cat_medicalHistory": "Medical History",
        "cat_medicalHistory_desc": "Conditions, allergies, medications",
        "cat_clinicalNotes": "Clinical Notes",
        "cat_clinicalNotes_desc": "Physician notes and recommendations",
    },
}

AR = {
    "SportBuilder": {
        "title": "منشئ البرامج",
        "subtitle": "صمّم برامج تدريبية لمتدربيك",
        "save": "حفظ",
        "saved": "تم الحفظ",
        "programName": "اسم البرنامج",
        "programNamePlaceholder": "مثال: قوة الجزء العلوي",
        "startFromTemplate": "ابدأ من قالب جاهز",
        "daysPerWeek": "أيام/أسبوع",
        "exercises": "التمارين",
        "totalSets": "إجمالي المجموعات",
        "estCalories": "السعرات التقديرية",
        "sets": "المجموعات",
        "reps": "التكرارات",
        "rest": "الراحة (ث)",
        "addExercise": "إضافة تمرين",
        "exerciseLibrary": "مكتبة التمارين",
        "searchExercise": "ابحث عن تمرين...",
        "allGroups": "الكل",
        "beginner": "مبتدئ",
        "intermediate": "متوسط",
        "advanced": "متقدم",
        "goal_muscle_gain": "بناء العضلات",
        "goal_fat_loss": "خسارة الدهون",
        "goal_strength": "القوة",
        "goal_endurance": "التحمل",
        "goal_general": "عام",
        "mg_chest": "الصدر",
        "mg_back": "الظهر",
        "mg_shoulders": "الأكتاف",
        "mg_arms": "الذراعين",
        "mg_legs": "الأرجل",
        "mg_glutes": "الألوية",
        "mg_core": "البطن",
        "mg_full_body": "الجسم كامل",
        "mg_cardio": "الكارديو",
    },
    "SportCoach": {
        "title": "المدرب الشخصي ميديسبورت",
        "subtitle": "إرشادات تغذية ووزن مثالي مخصصة لك",
        "yourData": "بياناتك",
        "sex": "الجنس",
        "male": "ذكر",
        "female": "أنثى",
        "age": "العمر",
        "height": "الطول (سم)",
        "weight": "الوزن (كجم)",
        "bodyFatOptional": "نسبة الدهون % (اختياري)",
        "muscleMassOptional": "الكتلة العضلية كجم (اختياري)",
        "activityLevel": "مستوى النشاط",
        "goal": "الهدف",
        "generatePlan": "إنشاء الخطة",
        "idealWeightRange": "نطاق الوزن المثالي",
        "kg": "كجم",
        "weeks": "أسبوع",
        "alreadyIdeal": "ضمن النطاق المثالي بالفعل",
        "targetCalories": "السعرات المستهدفة",
        "hydration": "الترطيب",
        "liters": "لتر",
        "protein": "بروتين",
        "carbs": "كربوهيدرات",
        "fat": "دهون",
        "kcal": "سعرة",
        "mealPlan": "خطة الوجبات",
        "supplements": "المكملات المقترحة",
        "supplementDisclaimer": "استشر طبيباً قبل البدء بأي مكمل غذائي.",
        "tips": "نصائح المدرب",
        "timing_breakfast": "الإفطار",
        "timing_lunch": "الغداء",
        "timing_dinner": "العشاء",
        "timing_snack": "وجبة خفيفة",
        "timing_pre_workout": "قبل التمرين",
        "timing_post_workout": "بعد التمرين",
    },
    "SportWada": {
        "title": "فحص المواد المحظورة (وادا)",
        "subtitle": "تحقق إن كانت المادة محظورة في الرياضة",
        "searchPlaceholder": "ابحث عن دواء أو مادة...",
        "status_prohibited": "محظور",
        "status_prohibited_in_competition": "محظور بالمنافسات",
        "status_monitored": "تحت المراقبة",
        "status_permitted": "مسموح",
        "alternatives": "البدائل",
        "noResults": "لم يتم العثور على مواد",
        "disclaimer": "هذا مرجع تثقيفي مبني على فئات قائمة وادا للمواد المحظورة. تحقق دائماً من القائمة الرسمية الأحدث لوادا واستشر طبيب رياضة مؤهلاً قبل الاستخدام.",
    },
    "SportBridge": {
        "title": "جسر السياق الطبي",
        "subtitle": "اربط سجلك الطبي في ميديسوفت بأمان",
        "privacyNote": "أنت تتحكم بدقة في البيانات الطبية التي تتم مشاركتها. يمكنك إلغاء الوصول في أي وقت. جميع عمليات النقل مشفّرة وقائمة على الموافقة.",
        "linkRecord": "ربط السجل الطبي",
        "linkDescription": "أدخل رقم سجلك الطبي (MRN) في ميديسوفت لربط بياناتك السريرية بأمان.",
        "mrnPlaceholder": "MRN-YYYYMMDD-XXXX",
        "linkButton": "ربط السجل",
        "linkedTitle": "تم ربط السجل",
        "linkedDesc": "متصل بالرقم الطبي",
        "shareControls": "ضوابط المشاركة",
        "saveConsents": "حفظ التفضيلات",
        "consentsSaved": "تم حفظ التفضيلات",
        "coachViewTitle": "ما يمكن لمدربك رؤيته",
        "nothingShared": "لا تتم مشاركة أي بيانات حالياً",
        "cat_labResults": "نتائج المختبر",
        "cat_labResults_desc": "تحاليل الدم والمؤشرات الحيوية",
        "cat_vitals": "العلامات الحيوية",
        "cat_vitals_desc": "النبض وضغط الدم والأكسجين",
        "cat_bodyComposition": "تكوين الجسم",
        "cat_bodyComposition_desc": "الكتلة العضلية ونسبة الدهون",
        "cat_medicalHistory": "التاريخ الطبي",
        "cat_medicalHistory_desc": "الحالات والحساسية والأدوية",
        "cat_clinicalNotes": "الملاحظات السريرية",
        "cat_clinicalNotes_desc": "ملاحظات وتوصيات الطبيب",
    },
}


def merge(path, additions):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    added = 0
    for ns, keys in additions.items():
        if ns not in data:
            data[ns] = {}
        for k, v in keys.items():
            if k not in data[ns]:
                added += 1
            data[ns][k] = v
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    return added


en_added = merge(EN_PATH, EN)
ar_added = merge(AR_PATH, AR)
total = sum(len(v) for v in EN.values())
print(f"EN keys set: {en_added} new, AR keys set: {ar_added} new")
print(f"Total keys per language: {total} across {len(EN)} namespaces")
