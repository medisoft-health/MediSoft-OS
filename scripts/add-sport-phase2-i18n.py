#!/usr/bin/env python3
"""
Add MediSport Phase 2 i18n translations for:
- SportFood (Food Logger)
- SportBioAge (Bio-Age Calculator)
- SportActivity (GPS Activity Tracker)
- SportLessons (Micro-Lessons Engine)
"""
import json
import sys

EN_PATH = "messages/en.json"
AR_PATH = "messages/ar.json"

# ─── English Translations ───────────────────────────────────────────

EN_SPORT_FOOD = {
    "title": "Food Logger",
    "subtitle": "Track your nutrition and macros",
    "calories": "Calories",
    "protein": "Protein",
    "carbs": "Carbs",
    "fat": "Fat",
    "water": "Water Intake",
    "todayLog": "Today's Log",
    "addFood": "Add Food",
    "searchPlaceholder": "Search foods (Arabic or English)...",
    "allCategories": "All Categories",
    "emptyLog": "No meals logged today",
    "emptyLogHint": "Tap 'Add Food' to start logging",
    "breakfast": "Breakfast",
    "lunch": "Lunch",
    "dinner": "Dinner",
    "snack": "Snack",
    "portion": "Portion Size",
    "grams": "grams",
    "mealType": "Meal Type",
    "addToLog": "Add to Log",
    "dailyTarget": "Daily Target",
    "remaining": "Remaining",
}

AR_SPORT_FOOD = {
    "title": "سجل الطعام",
    "subtitle": "تتبع تغذيتك والعناصر الغذائية",
    "calories": "السعرات",
    "protein": "البروتين",
    "carbs": "الكربوهيدرات",
    "fat": "الدهون",
    "water": "شرب الماء",
    "todayLog": "سجل اليوم",
    "addFood": "إضافة طعام",
    "searchPlaceholder": "ابحث عن الأطعمة (عربي أو إنجليزي)...",
    "allCategories": "جميع الفئات",
    "emptyLog": "لم يتم تسجيل وجبات اليوم",
    "emptyLogHint": "اضغط 'إضافة طعام' للبدء",
    "breakfast": "الإفطار",
    "lunch": "الغداء",
    "dinner": "العشاء",
    "snack": "وجبة خفيفة",
    "portion": "حجم الحصة",
    "grams": "غرام",
    "mealType": "نوع الوجبة",
    "addToLog": "إضافة للسجل",
    "dailyTarget": "الهدف اليومي",
    "remaining": "المتبقي",
}

# ─── Bio-Age Calculator ─────────────────────────────────────────────

EN_SPORT_BIO_AGE = {
    "title": "Bio-Age Calculator",
    "subtitle": "Discover your biological age",
    "step": "Step",
    "demographics": "Demographics",
    "bodyComposition": "Body Composition",
    "cardiovascularMetabolic": "Cardiovascular & Metabolic",
    "fitnessLifestyle": "Fitness & Lifestyle",
    "age": "Age",
    "sex": "Sex",
    "male": "Male",
    "female": "Female",
    "height": "Height",
    "weight": "Weight",
    "bodyFat": "Body Fat",
    "muscleMass": "Muscle Mass",
    "waist": "Waist",
    "restingHR": "Resting HR",
    "systolicBP": "Systolic BP",
    "diastolicBP": "Diastolic BP",
    "vo2max": "VO2 Max",
    "fastingGlucose": "Fasting Glucose",
    "hba1c": "HbA1c",
    "cholesterol": "Cholesterol",
    "sleepHours": "Sleep (hrs/night)",
    "exerciseMinutes": "Exercise (min/week)",
    "previous": "Previous",
    "next": "Next",
    "calculate": "Calculate Bio-Age",
    "yourBioAge": "Your Biological Age",
    "years": "years",
    "yearsOffset": "years",
    "younger": "younger than chronological",
    "older": "older than chronological",
    "percentile": "Percentile",
    "chronological": "Chronological",
    "biological": "Biological",
    "breakdown": "Domain Breakdown",
    "cardiovascular": "Cardiovascular",
    "metabolic": "Metabolic",
    "fitness": "Fitness",
    "lifestyle": "Lifestyle",
    "recommendations": "Recommendations",
    "recalculate": "Recalculate",
    "exceptional": "Exceptional",
    "excellent": "Excellent",
    "good": "Good",
    "average": "Average",
    "below_average": "Below Average",
    "poor": "Needs Improvement",
    "rec_increase_cardio": "Increase cardiovascular exercise (30+ min, 4x/week) to lower resting heart rate",
    "rec_reduce_sodium": "Reduce sodium intake and manage stress to improve blood pressure",
    "rec_reduce_sugar": "Reduce refined sugar and processed carbs to improve fasting glucose",
    "rec_glycemic_control": "Focus on glycemic control — consider low-GI foods and regular meal timing",
    "rec_reduce_body_fat": "Implement a moderate caloric deficit with strength training to reduce body fat",
    "rec_reduce_waist": "Target visceral fat with HIIT and dietary improvements",
    "rec_improve_vo2max": "Add interval training 2-3x/week to improve VO2 Max",
    "rec_increase_exercise": "Aim for at least 150 minutes of moderate exercise per week",
    "rec_more_sleep": "Prioritize 7-9 hours of quality sleep per night",
    "rec_optimize_sleep": "Optimize sleep quality — avoid oversleeping which may indicate other issues",
}

AR_SPORT_BIO_AGE = {
    "title": "حاسبة العمر البيولوجي",
    "subtitle": "اكتشف عمرك البيولوجي الحقيقي",
    "step": "الخطوة",
    "demographics": "البيانات الأساسية",
    "bodyComposition": "تكوين الجسم",
    "cardiovascularMetabolic": "القلب والأوعية والأيض",
    "fitnessLifestyle": "اللياقة ونمط الحياة",
    "age": "العمر",
    "sex": "الجنس",
    "male": "ذكر",
    "female": "أنثى",
    "height": "الطول",
    "weight": "الوزن",
    "bodyFat": "نسبة الدهون",
    "muscleMass": "الكتلة العضلية",
    "waist": "محيط الخصر",
    "restingHR": "نبض الراحة",
    "systolicBP": "الضغط الانقباضي",
    "diastolicBP": "الضغط الانبساطي",
    "vo2max": "السعة الأكسجينية",
    "fastingGlucose": "سكر الصيام",
    "hba1c": "السكر التراكمي",
    "cholesterol": "الكوليسترول",
    "sleepHours": "النوم (ساعات/ليلة)",
    "exerciseMinutes": "التمرين (دقيقة/أسبوع)",
    "previous": "السابق",
    "next": "التالي",
    "calculate": "احسب العمر البيولوجي",
    "yourBioAge": "عمرك البيولوجي",
    "years": "سنة",
    "yearsOffset": "سنة",
    "younger": "أصغر من العمر الزمني",
    "older": "أكبر من العمر الزمني",
    "percentile": "المئين",
    "chronological": "الزمني",
    "biological": "البيولوجي",
    "breakdown": "التحليل التفصيلي",
    "cardiovascular": "القلب والأوعية",
    "metabolic": "الأيض",
    "fitness": "اللياقة",
    "lifestyle": "نمط الحياة",
    "recommendations": "التوصيات",
    "recalculate": "إعادة الحساب",
    "exceptional": "استثنائي",
    "excellent": "ممتاز",
    "good": "جيد",
    "average": "متوسط",
    "below_average": "دون المتوسط",
    "poor": "يحتاج تحسين",
    "rec_increase_cardio": "زد تمارين القلب والأوعية (30+ دقيقة، 4 مرات أسبوعياً) لخفض نبض الراحة",
    "rec_reduce_sodium": "قلل الصوديوم وأدر التوتر لتحسين ضغط الدم",
    "rec_reduce_sugar": "قلل السكريات المكررة والكربوهيدرات المصنعة لتحسين سكر الصيام",
    "rec_glycemic_control": "ركز على التحكم في مستوى السكر — تناول أطعمة منخفضة المؤشر الجلايسيمي",
    "rec_reduce_body_fat": "طبق عجزاً حرارياً معتدلاً مع تمارين القوة لتقليل نسبة الدهون",
    "rec_reduce_waist": "استهدف الدهون الحشوية بتمارين HIIT وتحسين النظام الغذائي",
    "rec_improve_vo2max": "أضف تدريبات متقطعة 2-3 مرات أسبوعياً لتحسين السعة الأكسجينية",
    "rec_increase_exercise": "اهدف لـ 150 دقيقة على الأقل من التمارين المعتدلة أسبوعياً",
    "rec_more_sleep": "أعطِ الأولوية لـ 7-9 ساعات نوم جيد كل ليلة",
    "rec_optimize_sleep": "حسّن جودة النوم — تجنب النوم المفرط الذي قد يشير لمشاكل أخرى",
}

# ─── Activity Tracker ───────────────────────────────────────────────

EN_SPORT_ACTIVITY = {
    "title": "Activity Tracker",
    "subtitle": "Track your workouts with GPS",
    "track": "Track",
    "history": "History",
    "stats": "Stats",
    "running": "Running",
    "walking": "Walking",
    "cycling": "Cycling",
    "swimming": "Swimming",
    "mapReady": "Map ready",
    "mapHint": "Select activity type and press start",
    "live": "LIVE",
    "duration": "Duration",
    "distance": "Distance",
    "calories": "Calories",
    "pace": "Pace",
    "heartRate": "Heart Rate",
    "steps": "Steps",
    "weeklySummary": "Weekly Summary",
    "totalDistance": "Total Distance",
    "totalDuration": "Total Duration",
    "totalCalories": "Total Calories",
    "sessions": "Sessions",
    "weeklyGoal": "Weekly Goals",
    "dailyActivity": "Daily Activity",
}

AR_SPORT_ACTIVITY = {
    "title": "متتبع النشاط",
    "subtitle": "تتبع تمارينك بنظام GPS",
    "track": "تتبع",
    "history": "السجل",
    "stats": "الإحصائيات",
    "running": "الجري",
    "walking": "المشي",
    "cycling": "ركوب الدراجة",
    "swimming": "السباحة",
    "mapReady": "الخريطة جاهزة",
    "mapHint": "اختر نوع النشاط واضغط ابدأ",
    "live": "مباشر",
    "duration": "المدة",
    "distance": "المسافة",
    "calories": "السعرات",
    "pace": "السرعة",
    "heartRate": "نبض القلب",
    "steps": "الخطوات",
    "weeklySummary": "ملخص الأسبوع",
    "totalDistance": "إجمالي المسافة",
    "totalDuration": "إجمالي المدة",
    "totalCalories": "إجمالي السعرات",
    "sessions": "الجلسات",
    "weeklyGoal": "أهداف الأسبوع",
    "dailyActivity": "النشاط اليومي",
}

# ─── Micro-Lessons ──────────────────────────────────────────────────

EN_SPORT_LESSONS = {
    "title": "Micro-Lessons",
    "subtitle": "Learn something new every day",
    "dayStreak": "Day Streak",
    "completed": "Completed",
    "todayLesson": "Today's Lesson",
    "startLesson": "Start Lesson",
    "minutes": "min",
    "all": "All",
    "keyTakeaways": "Key Takeaways",
    "markComplete": "Mark as Complete",
    "beginner": "Beginner",
    "intermediate": "Intermediate",
    "advanced": "Advanced",
}

AR_SPORT_LESSONS = {
    "title": "الدروس المصغرة",
    "subtitle": "تعلم شيئاً جديداً كل يوم",
    "dayStreak": "أيام متتالية",
    "completed": "مكتمل",
    "todayLesson": "درس اليوم",
    "startLesson": "ابدأ الدرس",
    "minutes": "دقيقة",
    "all": "الكل",
    "keyTakeaways": "النقاط الرئيسية",
    "markComplete": "تم الإكمال",
    "beginner": "مبتدئ",
    "intermediate": "متوسط",
    "advanced": "متقدم",
}


def main():
    # Load existing files
    with open(EN_PATH, "r", encoding="utf-8") as f:
        en = json.load(f)
    with open(AR_PATH, "r", encoding="utf-8") as f:
        ar = json.load(f)

    # Add new namespaces
    en["SportFood"] = EN_SPORT_FOOD
    en["SportBioAge"] = EN_SPORT_BIO_AGE
    en["SportActivity"] = EN_SPORT_ACTIVITY
    en["SportLessons"] = EN_SPORT_LESSONS

    ar["SportFood"] = AR_SPORT_FOOD
    ar["SportBioAge"] = AR_SPORT_BIO_AGE
    ar["SportActivity"] = AR_SPORT_ACTIVITY
    ar["SportLessons"] = AR_SPORT_LESSONS

    # Save
    with open(EN_PATH, "w", encoding="utf-8") as f:
        json.dump(en, f, ensure_ascii=False, indent=2)
        f.write("\n")
    with open(AR_PATH, "w", encoding="utf-8") as f:
        json.dump(ar, f, ensure_ascii=False, indent=2)
        f.write("\n")

    # Stats
    total_en = sum(len(v) for v in [EN_SPORT_FOOD, EN_SPORT_BIO_AGE, EN_SPORT_ACTIVITY, EN_SPORT_LESSONS])
    total_ar = sum(len(v) for v in [AR_SPORT_FOOD, AR_SPORT_BIO_AGE, AR_SPORT_ACTIVITY, AR_SPORT_LESSONS])
    print(f"✅ Added {total_en} English keys and {total_ar} Arabic keys across 4 namespaces")
    print(f"   - SportFood: {len(EN_SPORT_FOOD)} keys")
    print(f"   - SportBioAge: {len(EN_SPORT_BIO_AGE)} keys")
    print(f"   - SportActivity: {len(EN_SPORT_ACTIVITY)} keys")
    print(f"   - SportLessons: {len(EN_SPORT_LESSONS)} keys")


if __name__ == "__main__":
    main()
