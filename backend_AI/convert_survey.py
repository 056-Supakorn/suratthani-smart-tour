"""
แปลงคำตอบแบบสอบถาม (Real_data.csv จาก Google Forms) เป็นข้อมูลฝึกโมเดล AI

แต่ละคำตอบมี 2 สถานการณ์ (ไป-กลับ และ ค้างคืน) แต่ละสถานการณ์ให้ งบประมาณ, เวลา, อารมณ์ทริป (เลือกได้หลายข้อ),
หมวดหมู่ที่สนใจ และสถานที่ที่จะไป (พิมพ์เอง) สคริปต์นี้:
  1. จับคู่ข้อความสถานที่ที่พิมพ์เองกับสถานที่ในระบบ (places_db.csv) ด้วยคำสำคัญ ตัดคำตอบที่ไม่ระบุสถานที่
     หรือเป็นสถานที่ที่ระบบไม่มี
  2. คำตอบที่ระบุหลายสถานที่ -> 1 แถวต่อสถานที่ ; เลือกหลายอารมณ์ -> 1 แถวต่ออารมณ์
  3. category ใช้หมวดของสถานที่ที่เลือก (แบบเดียวกับที่ main.py ใช้กรองผู้สมัครตามหมวด)
  4. ตัดค่าผิดปกติ: งบเกิน 20,000 บาท, ไป-กลับเกิน 24 ชม., ค้างคืนน้อยกว่า 24 ชม.

Usage:
    python convert_survey.py   # เขียน survey_dataset.csv และพิมพ์สรุปผลการแปลง
"""
import csv
import os
import re
import sys

import pandas as pd

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SURVEY_FILE = os.path.join(BASE_DIR, "Real_data.csv")
PLACES_FILE = os.path.join(BASE_DIR, "places_db.csv")
OUT_FILE = os.path.join(BASE_DIR, "survey_dataset.csv")

REVERSE_CATEGORY_MAP = {"ทะเล": "sea", "ธรรมชาติ": "mountain", "วัด": "temple", "ชุมชน": "local", "คาเฟ่": "cafe", "ร้านอาหาร": "food"}
MOOD_MAP = {"(Chill)": "chill", "(Adventure)": "adventure", "(Culture)": "culture", "(Social)": "social"}
MAX_BUDGET = 20000

# (regex ของคำที่ผู้ตอบพิมพ์, ชื่อสถานที่ในระบบ) - เรียงตามลำดับที่จะค้นหาในข้อความ
PLACE_PATTERNS = [
    (r"เกาะ?\s*สมุย", "เกาะสมุย (หาดเฉวง)"),
    (r"เ[ขช]า[สศ]ก", "อุทยานแห่งชาติเขาสก"),
    (r"เข[ืี]+[่]?อน|เชื่อน|รัช(ช)?ประภา|เชี่ยวหลาน", "เขื่อนรัชชประภา (เขาสามเกลอ)"),
    (r"ป่าต้นน[่้]?[ำํ]|น้ำราด|น[้]?ำราด|บ้?น\s*น้ำราด", "ป่าต้นน้ำ บ้านน้ำราด"),
    (r"ลำภู\s*คาเฟ่|lamphu", "Lamphu Cafe (ลำภู คาเฟ่ริมน้ำ)"),
    (r"พระบรมธาตุไชยา|วัดพระธาตุ(?!นคร)", "พระบรมธาตุไชยา"),
    (r"พุมเรียง", "แหลมโพธิ์ หาดพุมเรียง"),
    (r"เกาะเต่า", "หาดนางยวน เกาะเต่า"),
    (r"ตลาดศาลเจ้า", "ตลาดศาลเจ้า (สตรีทฟู้ดโต้รุ่ง)"),
    (r"สะพานแขวน\s*เขาพัง", "สะพานแขวนเขาพัง (ภูเขารูปหัวใจ)"),
]


def parse_travel_time_to_hours(text):
    h = re.search(r"(\d+)\s*ชั่วโมง", str(text))
    m = re.search(r"(\d+)\s*นาที", str(text))
    if not h and not m:
        return 0.5
    return round((int(h.group(1)) if h else 0) + (int(m.group(1)) / 60 if m else 0), 2)


def match_places(answer):
    text = str(answer).lower()
    found = []
    for pattern, name in PLACE_PATTERNS:
        if re.search(pattern, text, flags=re.IGNORECASE) and name not in found:
            found.append(name)
    return found


def parse_moods(answer):
    return [code for label, code in MOOD_MAP.items() if label in str(answer)]


def main():
    return build(write=True)


def build(write=False):
    places = pd.read_csv(PLACES_FILE, encoding="utf-8-sig")
    place_info = {r["name"]: r for _, r in places.iterrows()}
    for _, name in PLACE_PATTERNS:
        assert name in place_info, f"ไม่พบสถานที่ '{name}' ใน places_db.csv"

    survey = pd.read_csv(SURVEY_FILE)
    cols = list(survey.columns)
    # คอลัมน์: [เวลาประทับ, ไป-กลับ(งบ, เวลา, อารมณ์, หมวด, สถานที่), ค้างคืน(งบ, เวลา, อารมณ์, หมวด, สถานที่)]
    scenarios = [("ไป-กลับ", cols[1:6], lambda h: 0 < h <= 24), ("ค้างคืน", cols[6:11], lambda h: h >= 24)]

    rows, stats = [], {"answers": 0, "no_place": 0, "outlier": 0, "unmatched": {}}
    for _i, resp in survey.iterrows():
        for scenario, (c_budget, c_time, c_mood, _c_cat, c_place), time_ok in scenarios:
            stats["answers"] += 1
            places_found = match_places(resp[c_place])
            if not places_found:
                stats["no_place"] += 1
                key = str(resp[c_place]).strip()
                stats["unmatched"][key] = stats["unmatched"].get(key, 0) + 1
                continue
            budget, hours = float(resp[c_budget]), float(resp[c_time])
            moods = parse_moods(resp[c_mood])
            if budget <= 0 or budget > MAX_BUDGET or not time_ok(hours) or not moods:
                stats["outlier"] += 1
                continue
            for name in places_found:
                info = place_info[name]
                for mood in moods:
                    rows.append({
                        "budget": int(budget),
                        "time_hours": hours,
                        "category": REVERSE_CATEGORY_MAP[info["tag"]],
                        "trip_mood": mood,
                        "travel_time_from_city": parse_travel_time_to_hours(info["travelTime"]),
                        "place_name": name,
                        "_respondent": int(_i),
                    })

    if not write:
        return rows
    with open(OUT_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["budget", "time_hours", "category", "trip_mood", "travel_time_from_city", "place_name"], extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)

    used = stats["answers"] - stats["no_place"] - stats["outlier"]
    print(f"ผู้ตอบ {len(survey)} คน = {stats['answers']} สถานการณ์")
    print(f"  ใช้ได้ {used} | ไม่ระบุสถานที่/ไม่มีในระบบ {stats['no_place']} | ค่าผิดปกติ {stats['outlier']}")
    print(f"ได้ข้อมูลฝึก {len(rows)} แถว -> {os.path.basename(OUT_FILE)}")
    print(pd.DataFrame(rows)["place_name"].value_counts().to_string())
    print("คำตอบที่จับคู่ไม่ได้:", "; ".join(f"{k} ({v})" for k, v in sorted(stats["unmatched"].items(), key=lambda x: -x[1])))
    return rows


if __name__ == "__main__":
    main()
