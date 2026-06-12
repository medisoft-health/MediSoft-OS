#!/usr/bin/env python3
"""Add MediSport Phase 4 (Community / Social) i18n keys to en.json and ar.json."""
import json
import os

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Locate messages files
CANDIDATES = [
    os.path.join(BASE, "messages"),
    os.path.join(BASE, "src", "messages"),
    os.path.join(BASE, "src", "i18n", "messages"),
]
msg_dir = next((d for d in CANDIDATES if os.path.isdir(d)), None)
if not msg_dir:
    raise SystemExit("Could not locate messages directory")

EN = {
    "SportCommunity": {
        "title": "Community",
        "subtitle": "Share your progress and join challenges",
        "tabFeed": "Feed",
        "tabChallenges": "Challenges",
        "composerPlaceholder": "Share an update with the community...",
        "loading": "Loading...",
        "emptyFeed": "No posts yet. Be the first to share!",
        "emptyChallenges": "No active challenges right now.",
        "athlete": "Athlete",
        "joinChallenge": "Join Challenge",
        "completed": "Completed",
    }
}

AR = {
    "SportCommunity": {
        "title": "المجتمع",
        "subtitle": "شارك تقدمك وانضم إلى التحديات",
        "tabFeed": "آخر المنشورات",
        "tabChallenges": "التحديات",
        "composerPlaceholder": "شارك تحديثاً مع المجتمع...",
        "loading": "جارٍ التحميل...",
        "emptyFeed": "لا توجد منشورات بعد. كن أول من يشارك!",
        "emptyChallenges": "لا توجد تحديات نشطة حالياً.",
        "athlete": "رياضي",
        "joinChallenge": "انضم إلى التحدي",
        "completed": "مكتمل",
    }
}


def merge(path, additions):
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    added = 0
    for ns, keys in additions.items():
        data.setdefault(ns, {})
        for k, v in keys.items():
            if k not in data[ns]:
                added += 1
            data[ns][k] = v
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"{os.path.basename(path)}: {added} keys ensured")


merge(os.path.join(msg_dir, "en.json"), EN)
merge(os.path.join(msg_dir, "ar.json"), AR)
print("Phase 4 i18n done.")
