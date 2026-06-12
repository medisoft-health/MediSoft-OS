#!/usr/bin/env python3
"""Phase 6 i18n: add SportLab namespace + SportClients progress keys (AR classical + EN)."""
import json, sys

EN = {
    "SportLab": {
        "title": "Lab Results History",
        "addReport": "Add Report",
        "reportTitle": "Report title",
        "date": "Date",
        "seasonPhase": "Season phase",
        "phase_pre_season": "Pre-season",
        "phase_in_season": "In-season",
        "phase_off_season": "Off-season",
        "phase_recovery": "Recovery",
        "value": "Value",
        "save": "Save report",
        "compareTitle": "Comparison: first vs latest report",
        "marker": "Biomarker",
        "first": "First",
        "latest": "Latest",
        "change": "Change",
        "range": "Athlete range",
        "inRange": "In range",
        "outOfRange": "Out of range",
        "needTwo": "Add at least two reports to compare.",
        "history": "Reports History",
        "empty": "No lab reports yet.",
        "markersCount": "markers",
    },
    "SportClientsProgress": {
        "progress": "Progress",
        "noProgress": "No data yet.",
        "weight": "Weight (kg)",
        "bodyFat": "Body fat",
        "bioAge": "Bio-age",
        "activities7d": "Activities (7d)",
        "meals7d": "Meals (7d)",
        "noLab": "No lab reports yet.",
    },
}

AR = {
    "SportLab": {
        "title": "سجل التحاليل المخبرية",
        "addReport": "إضافة تقرير",
        "reportTitle": "عنوان التقرير",
        "date": "التاريخ",
        "seasonPhase": "مرحلة الموسم",
        "phase_pre_season": "ما قبل الموسم",
        "phase_in_season": "أثناء الموسم",
        "phase_off_season": "خارج الموسم",
        "phase_recovery": "مرحلة التعافي",
        "value": "القيمة",
        "save": "حفظ التقرير",
        "compareTitle": "المقارنة: التقرير الأول مقابل الأحدث",
        "marker": "المؤشر الحيوي",
        "first": "الأول",
        "latest": "الأحدث",
        "change": "التغير",
        "range": "النطاق الرياضي",
        "inRange": "ضمن النطاق",
        "outOfRange": "خارج النطاق",
        "needTwo": "أضف تقريرين على الأقل لإجراء المقارنة.",
        "history": "سجل التقارير",
        "empty": "لا توجد تقارير تحاليل بعد.",
        "markersCount": "مؤشرات",
    },
    "SportClientsProgress": {
        "progress": "التقدم",
        "noProgress": "لا توجد بيانات بعد.",
        "weight": "الوزن (كجم)",
        "bodyFat": "نسبة الدهون",
        "bioAge": "العمر البيولوجي",
        "activities7d": "الأنشطة (٧ أيام)",
        "meals7d": "الوجبات (٧ أيام)",
        "noLab": "لا توجد تقارير تحاليل بعد.",
    },
}

def merge(path, additions):
    d = json.load(open(path, encoding="utf-8"))
    # SportLab is a new namespace
    d.setdefault("SportLab", {}).update(additions["SportLab"])
    # progress keys go INTO existing SportClients namespace
    d.setdefault("SportClients", {}).update(additions["SportClientsProgress"])
    json.dump(d, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    print("updated", path, "-> SportLab keys:", len(d["SportLab"]),
          "| SportClients keys:", len(d["SportClients"]))

merge("messages/en.json", EN)
merge("messages/ar.json", AR)
print("done")
