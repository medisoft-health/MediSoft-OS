#!/usr/bin/env python3
"""Add Phase 5 i18n namespaces (SportClients, SportBody) + a few SportStandalone keys."""
import json, io

EN = {
    "SportClients": {
        "title": "My Trainees",
        "add": "Add",
        "added": "Trainee linked successfully",
        "emailPlaceholder": "Trainee's email",
        "noUser": "No MediSport user found with this email.",
        "selfLink": "You cannot add yourself.",
        "error": "Something went wrong. Please try again.",
        "empty": "No trainees linked yet. Add one by email.",
        "athlete": "Athlete",
        "active": "Active",
        "remove": "Remove",
        "yourCoach": "Your Coach",
        "coach": "Coach",
    },
    "SportBody": {
        "title": "Body Composition",
        "subtitle": "Track and compare your body composition over time",
        "addMeasurement": "Add Measurement",
        "save": "Save",
        "history": "History",
        "empty": "No measurements yet. Add your first one.",
        "needTwo": "Add at least two measurements to see your progress.",
        "date": "Date",
        "weightKg": "Weight (kg)",
        "bodyFatPct": "Body Fat (%)",
        "muscleMassKg": "Muscle (kg)",
        "waterPct": "Water (%)",
        "waistCm": "Waist (cm)",
    },
}

AR = {
    "SportClients": {
        "title": "متدربيّ",
        "add": "إضافة",
        "added": "تم ربط المتدرب بنجاح",
        "emailPlaceholder": "البريد الإلكتروني للمتدرب",
        "noUser": "لا يوجد مستخدم في ميديسبورت بهذا البريد الإلكتروني.",
        "selfLink": "لا يمكنك إضافة نفسك.",
        "error": "حدث خطأ ما. يُرجى المحاولة مرة أخرى.",
        "empty": "لا يوجد متدربون مرتبطون بعد. أضِف متدرباً عبر بريده الإلكتروني.",
        "athlete": "رياضي",
        "active": "نشِط",
        "remove": "إزالة",
        "yourCoach": "مدربك",
        "coach": "المدرب",
    },
    "SportBody": {
        "title": "تكوين الجسم",
        "subtitle": "تتبّع تكوين جسمك وقارِنه عبر الزمن",
        "addMeasurement": "إضافة قياس",
        "save": "حفظ",
        "history": "السجل",
        "empty": "لا توجد قياسات بعد. أضِف أول قياس لك.",
        "needTwo": "أضِف قياسين على الأقل لعرض تقدّمك.",
        "date": "التاريخ",
        "weightKg": "الوزن (كجم)",
        "bodyFatPct": "نسبة الدهون (٪)",
        "muscleMassKg": "العضلات (كجم)",
        "waterPct": "الماء (٪)",
        "waistCm": "الخصر (سم)",
    },
}

# Extra keys appended to existing SportStandalone namespace
EN_STANDALONE_EXTRA = {
    "bodyCompositionDesc": "Track weight, fat & muscle over time",
    "viewHistory": "View History",
}
AR_STANDALONE_EXTRA = {
    "bodyCompositionDesc": "تتبّع الوزن والدهون والعضلات عبر الزمن",
    "viewHistory": "عرض السجل",
}


def merge(path, ns_map, standalone_extra):
    with io.open(path, encoding="utf-8") as f:
        data = json.load(f)
    for ns, keys in ns_map.items():
        data.setdefault(ns, {})
        data[ns].update(keys)
    # standalone extras
    data.setdefault("SportStandalone", {})
    for k, v in standalone_extra.items():
        data["SportStandalone"].setdefault(k, v)
    with io.open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"updated {path}: +{sum(len(v) for v in ns_map.values())} ns keys, +{len(standalone_extra)} standalone")


merge("messages/en.json", EN, EN_STANDALONE_EXTRA)
merge("messages/ar.json", AR, AR_STANDALONE_EXTRA)
print("done")
