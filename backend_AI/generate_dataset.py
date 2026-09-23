"""
Generates a much larger AI training dataset by combining every real place in
places_db.csv with plausible budget/time/mood combinations for its category.

Usage:
    python generate_dataset.py            # writes dataset.csv + inserts into MongoDB + retrains live model
    python generate_dataset.py --csv-only # only rewrites dataset.csv, skips MongoDB/retrain
"""
import csv
import json
import os
import random
import re
import sys
import urllib.request

random.seed(42)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PLACES_FILE = os.path.join(BASE_DIR, "places_db.csv")
DATASET_FILE = os.path.join(BASE_DIR, "dataset.csv")

# Same mapping main.py uses to translate a place's Thai "tag" into the
# category id the frontend/API actually sends (sea/mountain/temple/local/cafe/food).
CATEGORY_MAP = {"sea": "ทะเล", "mountain": "ธรรมชาติ", "temple": "วัด", "local": "ชุมชน", "cafe": "คาเฟ่", "food": "ร้านอาหาร"}
REVERSE_CATEGORY_MAP = {v: k for k, v in CATEGORY_MAP.items()}

# Only these 4 mood ids exist in the frontend (App.jsx moodOptions), so synthetic
# rows must stick to them or they'll never be requested by a real user.
# For each category: (budget_min, budget_max, time_min, time_max, plausible_moods)
CATEGORY_PROFILE = {
    "sea":      (1200, 5000, 6, 48, ["adventure", "chill"]),
    "mountain": (300, 2500, 2, 24, ["adventure", "chill"]),
    "temple":   (50, 600, 1, 4, ["culture", "chill"]),
    "local":    (150, 1200, 1, 6, ["culture", "social"]),
    "cafe":     (100, 400, 1, 3, ["social", "chill"]),
    "food":     (150, 600, 1, 3, ["social", "chill"]),
}

ROWS_PER_MOOD = 2  # low-budget/short-time tier + high-budget/long-time tier, each jittered


def parse_travel_time_to_hours(text: str) -> float:
    if not text:
        return 0.5
    hours = 0.0
    h_match = re.search(r"(\d+)\s*ชั่วโมง", text)
    m_match = re.search(r"(\d+)\s*นาที", text)
    if h_match:
        hours += int(h_match.group(1))
    if m_match:
        hours += int(m_match.group(1)) / 60
    return round(hours, 2) if (h_match or m_match) else 0.5


def load_places():
    with open(PLACES_FILE, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def load_existing_dataset_rows():
    if not os.path.exists(DATASET_FILE):
        return [], []
    with open(DATASET_FILE, encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        return rows, reader.fieldnames


def generate_synthetic_rows(places):
    rows = []
    for place in places:
        category = REVERSE_CATEGORY_MAP.get(place["tag"])
        if not category:
            continue
        b_min, b_max, t_min, t_max, moods = CATEGORY_PROFILE[category]
        travel_hours = parse_travel_time_to_hours(place.get("travelTime", ""))
        for mood in moods:
            for tier in range(ROWS_PER_MOOD):
                frac = tier / max(ROWS_PER_MOOD - 1, 1)  # 0.0 = low tier, 1.0 = high tier
                budget = b_min + (b_max - b_min) * frac
                time_hours = t_min + (t_max - t_min) * frac
                budget *= random.uniform(0.9, 1.1)
                time_hours *= random.uniform(0.9, 1.1)
                rows.append({
                    "budget": round(budget),
                    "time_hours": round(time_hours, 1),
                    "category": category,
                    "trip_mood": mood,
                    "travel_time_from_city": travel_hours,
                    "place_name": place["name"],
                })
    return rows


def dedupe_key(row):
    return (str(row["budget"]), str(row["time_hours"]), row["category"], row["trip_mood"], row["place_name"])


def main():
    csv_only = "--csv-only" in sys.argv

    places = load_places()
    existing_rows, fieldnames = load_existing_dataset_rows()
    if not fieldnames:
        fieldnames = ["budget", "time_hours", "category", "trip_mood", "travel_time_from_city", "place_name"]

    synthetic_rows = generate_synthetic_rows(places)

    seen = {dedupe_key(r) for r in existing_rows}
    new_rows = []
    for row in synthetic_rows:
        key = dedupe_key(row)
        if key not in seen:
            seen.add(key)
            new_rows.append(row)

    all_rows = existing_rows + new_rows
    with open(DATASET_FILE, "w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(all_rows)

    print(f"dataset.csv: {len(existing_rows)} -> {len(all_rows)} rows (+{len(new_rows)} new, {len(synthetic_rows) - len(new_rows)} duplicates skipped)")

    if csv_only:
        return

    try:
        from dotenv import load_dotenv
        load_dotenv(os.path.join(BASE_DIR, ".env"))
    except ImportError:
        pass

    mongo_uri = os.getenv("MONGO_URI")
    if not mongo_uri:
        print("MONGO_URI not set, skipping MongoDB insert. Run again after setting it, or use --csv-only.")
        return

    from pymongo import MongoClient
    client = MongoClient(mongo_uri)
    db = client["suratthani_tour"]  # same db name main.py uses
    dataset_collection = db["ai_dataset"]

    existing_db_keys = {dedupe_key(d) for d in dataset_collection.find({}, {"_id": 0})}
    to_insert = [r for r in new_rows if dedupe_key(r) not in existing_db_keys]
    if to_insert:
        dataset_collection.insert_many(to_insert)
    print(f"MongoDB ai_dataset: inserted {len(to_insert)} new rows (collection had {len(existing_db_keys)} already)")

    admin_password = os.getenv("ADMIN_PASSWORD")
    port = os.getenv("PORT", "8000")
    if admin_password:
        try:
            req = urllib.request.Request(
                f"http://127.0.0.1:{port}/admin/retrain",
                headers={"x-admin-key": admin_password},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=10) as resp:
                print("Retrain response:", resp.status, json.loads(resp.read()))
        except Exception as e:
            print(f"Could not reach running server to retrain ({e}). Restart the backend or call /admin/retrain manually.")


if __name__ == "__main__":
    main()
