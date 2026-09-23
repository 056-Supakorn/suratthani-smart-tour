import sys

# Force UTF-8 stdout/stderr so Thai text and emoji in log messages never crash
# the process on platforms whose default console codepage can't encode them
# (e.g. Windows cp874/cp1252 terminals).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, Header, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import hashlib
import hmac
import os
import random
import re
import secrets
import uuid
from datetime import datetime
import warnings
import math
from pymongo import MongoClient, UpdateOne
import gridfs

warnings.filterwarnings('ignore')

# Load .env before reading any config below (CORS_ORIGINS, MONGO_URI, ...).
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = FastAPI()

# Comma-separated list of allowed origins. Defaults to the local Vite dev server only -
# set CORS_ORIGINS in .env for production (e.g. "https://your-domain.com").
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 🖼️ ไฟล์ที่ผู้ประกอบการอัปโหลด (รูปภาพ / VR 360°)
# ==========================================
# Files are stored in MongoDB GridFS (not local disk) so they survive restarts on
# hosts with ephemeral filesystems such as Render. UPLOAD_DIR is only read once at
# startup to migrate files uploaded before the switch.
UPLOAD_DIR = "uploads"
ALLOWED_UPLOAD_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
UPLOAD_CONTENT_TYPES = {".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp"}

# ==========================================
# 📊 1. ส่วนเชื่อมต่อ MongoDB
# ==========================================
MONGO_URI = os.getenv("MONGO_URI")
if not MONGO_URI:
    raise RuntimeError(
        "MONGO_URI environment variable is not set. Copy backend_AI/.env.example to "
        "backend_AI/.env and fill in your own MongoDB connection string."
    )

ADMIN_NAME = os.getenv("ADMIN_NAME", "")
ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "")

try:
    client = MongoClient(MONGO_URI)
    db = client["suratthani_tour"] 
    users_collection = db["users_log"]
    places_collection = db["places"]
    dataset_collection = db["ai_dataset"]
    merchant_places_collection = db["merchant_places"]
    uploads_fs = gridfs.GridFS(db, collection="uploads")
    print("✅ [DB READY] เชื่อมต่อ MongoDB สำเร็จ!")
except Exception as e:
    print(f"❌ [DB ERROR] เชื่อมต่อ MongoDB ล้มเหลว: {e}")

# One-time migration: copy any files left in the old local uploads/ folder into GridFS.
if os.path.isdir(UPLOAD_DIR):
    for _name in os.listdir(UPLOAD_DIR):
        _ext = os.path.splitext(_name)[1].lower()
        if _ext in UPLOAD_CONTENT_TYPES and not uploads_fs.exists({"filename": _name}):
            with open(os.path.join(UPLOAD_DIR, _name), "rb") as _f:
                uploads_fs.put(_f, filename=_name, contentType=UPLOAD_CONTENT_TYPES[_ext])
            print(f"📦 ย้ายไฟล์ {_name} เข้า MongoDB แล้ว")

# ==========================================
# 🗄️ 2. ระบบฐานข้อมูลสถานที่ (Full Database with Upsert)
# ==========================================
PLACES_FILE = 'places_db.csv'
ATTRACTIONS_DB = []

def seed_places_from_csv():
    """ซิงก์สถานที่จาก CSV เข้า MongoDB - เรียกครั้งเดียวตอนเปิดเซิร์ฟเวอร์เท่านั้น
    (เดิมทำทุก request ทำให้หน้าแรกช้า ~10 วินาทีบน Render)"""
    print("🔄 กำลังตรวจสอบและซิงก์ข้อมูลสถานที่เข้า MongoDB...")
    if os.path.exists(PLACES_FILE):
        try:
            df = pd.read_csv(PLACES_FILE, encoding='utf-8-sig')
            df = df.fillna('')
            places_to_insert = df.to_dict('records')

            operations = []
            for place in places_to_insert:
                query = {"id": int(place["id"])}
                # $setOnInsert (not $set) so this seed-sync never clobbers a place
                # an admin has since edited through the Admin panel - the CSV only
                # fills in places that don't exist in MongoDB yet.
                update_data = {
                    "$setOnInsert": {
                        "id": int(place["id"]),
                        "name": place["name"],
                        "tag": place["tag"],
                        "image": place["image"],
                        "vr_image": place["vr_image"],
                        "location": place["location"],
                        "travelTime": place["travelTime"],
                        "description": place["description"],
                        "lat": float(place["lat"]),
                        "lng": float(place["lng"]),
                        "price": "",
                    }
                }
                operations.append(UpdateOne(query, update_data, upsert=True))
            if operations:
                # one round trip instead of one per place
                places_collection.bulk_write(operations, ordered=False)
            print("✅ ซิงก์ข้อมูลสถานที่ใน MongoDB สำเร็จ (ไม่ต้อง Drop ทิ้ง)!")
        except Exception as e:
            print(f"❌ เกิดข้อผิดพลาดในการอ่านไฟล์ {PLACES_FILE}: {e}")

def load_places_db():
    """โหลดรายการสถานที่ล่าสุดจาก MongoDB (query เดียว) - เรียกได้ทุก request"""
    global ATTRACTIONS_DB
    ATTRACTIONS_DB = list(places_collection.find({"deleted": {"$ne": True}}, {"_id": 0}))

seed_places_from_csv()
load_places_db()

CATEGORY_MAP = {"sea": "ทะเล", "mountain": "ธรรมชาติ", "temple": "วัด", "local": "ชุมชน", "cafe": "คาเฟ่", "food": "ร้านอาหาร"}
REVERSE_CATEGORY_MAP = {v: k for k, v in CATEGORY_MAP.items()}

# ==========================================
# 🧠 3. ระบบ AI Machine Learning
# ==========================================
DATASET_FILE = 'dataset.csv'
ai_model = RandomForestClassifier(n_estimators=100, random_state=42)
le_mood, le_category, le_place = LabelEncoder(), LabelEncoder(), LabelEncoder()
is_ai_ready = False
# place_name -> category, built fresh each train_ai() run. Lets /recommend restrict a
# prediction's candidate classes to only places that actually belong to the requested
# category, instead of trusting whatever place the classifier ranks highest overall
# (which can be from an unrelated category when the training data is sparse).
place_category_map = {}

def train_ai():
    global is_ai_ready, place_category_map

    if dataset_collection.count_documents({}) == 0 and os.path.exists(DATASET_FILE):
        print("🔄 กำลังย้ายข้อมูล Dataset AI เข้า MongoDB...")
        try:
            df_csv = pd.read_csv(DATASET_FILE)
            dataset_collection.insert_many(df_csv.to_dict('records'))
            print("✅ ย้ายข้อมูล Dataset AI เรียบร้อยแล้ว!")
        except Exception as e:
            print(f"❌ ไม่สามารถอ่านไฟล์ Dataset ได้: {e}")

    data_from_db = list(dataset_collection.find({}, {"_id": 0}))
    if len(data_from_db) >= 5:
        try:
            df = pd.DataFrame(data_from_db)
            X = df[['budget', 'time_hours', 'trip_mood', 'category']].copy()
            y = df['place_name']

            X['trip_mood'] = le_mood.fit_transform(X['trip_mood'])
            X['category'] = le_category.fit_transform(X['category'])
            y_encoded = le_place.fit_transform(y)

            ai_model.fit(X, y_encoded)
            place_category_map = dict(zip(df['place_name'], df['category']))
            is_ai_ready = True
            print("✅ [AI READY] โมเดลเรียนรู้จาก MongoDB พร้อมใช้งาน!")
        except Exception as e:
            print(f"❌ [AI ERROR] ฝึกสอนโมเดลล้มเหลว: {e}")

train_ai()

# ==========================================
# 🗺️ 4. ฟังก์ชันคำนวณระยะทาง
# ==========================================
def calculate_distance(lat1, lon1, lat2, lon2):
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# ค่าสมมติสำหรับคำนวณว่าทริปหนึ่งๆ ใช้เวลาไปเท่าไหร่ (ไม่มีข้อมูล "เวลาที่ควรอยู่ต่อสถานที่" จริงในระบบ)
DEFAULT_VISIT_DURATION_HOURS = 1.5  # เวลาโดยประมาณที่ใช้เที่ยวต่อ 1 สถานที่
AVG_TRAVEL_SPEED_KMH = 40.0  # ความเร็วเฉลี่ยโดยประมาณสำหรับประเมินเวลาเดินทางระหว่างจุด
# ถ้าสถานที่ที่ใกล้ที่สุดยังไกลเกินนี้ ถือว่าผู้ใช้อยู่นอกจังหวัด (จังหวัดกว้างราว 150-200 กม.)
FAR_FROM_PROVINCE_KM = 150.0

def parse_price_to_number(price_str) -> float:
    """แปลงข้อความราคา (เช่น '50 บาท/คน', 'ฟรี', '') ให้เป็นตัวเลขบาทโดยประมาณ"""
    if not price_str:
        return 0.0
    match = re.search(r'\d+(\.\d+)?', str(price_str))
    return float(match.group()) if match else 0.0

# ==========================================
# 📦 Schemas
# ==========================================
class TripRequest(BaseModel):
    budget: float
    time_hours: float
    categories: list
    trip_mood: str
    user_lat: Optional[float] = None
    user_lng: Optional[float] = None

class UserInfo(BaseModel):
    name: str
    email: str
    preferences: str
    role: Optional[str] = "tourist"
    userData: Optional[dict] = None
    password: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: Optional[str] = None

class MerchantPlaceSubmission(BaseModel):
    ownerEmail: str
    ownerName: str = ""
    businessName: str = ""
    businessType: str = ""
    businessLicense: str = ""
    businessPhone: str = ""
    name: str
    tag: str = ""
    location: str = ""
    travelTime: str = ""
    description: str = ""
    lat: float = 0.0
    lng: float = 0.0
    image: str = ""
    vr_image: str = ""
    price: str = ""

class MerchantPlaceStatusUpdate(BaseModel):
    status: str
    reason: str = ""

class MerchantPlaceEditRequest(BaseModel):
    ownerEmail: str
    ownerName: str = ""
    businessName: str = ""
    businessType: str = ""
    businessLicense: str = ""
    businessPhone: str = ""
    name: str
    tag: str = ""
    location: str = ""
    travelTime: str = ""
    description: str = ""
    lat: float = 0.0
    lng: float = 0.0
    image: str = ""
    vr_image: str = ""
    price: str = ""

class AdminPlaceUpsert(BaseModel):
    name: str
    tag: str = ""
    location: str = ""
    travelTime: str = ""
    description: str = ""
    lat: float = 0.0
    lng: float = 0.0
    image: str = ""
    vr_image: str = ""
    price: str = ""

class VrViewTrack(BaseModel):
    place_id: str

class RatingTrack(BaseModel):
    place_id: str
    rating: int
    # Optional trip context (budget/time/mood the tourist searched with) - when present
    # and the rating is high, this feeds back into the AI training dataset so the
    # recommender actually learns from real satisfaction, not just static dataset.csv.
    budget: Optional[float] = None
    time_hours: Optional[float] = None
    trip_mood: Optional[str] = None

class TripAddTrack(BaseModel):
    place_ids: list
    owner_email: str = ""

class UserStatusUpdate(BaseModel):
    status: str

def find_place_and_increment(place_id: str, inc_fields: dict) -> bool:
    """Increments counters on whichever collection (curated or merchant) holds this place id."""
    try:
        result = places_collection.update_one({"id": int(place_id)}, {"$inc": inc_fields})
        if result.matched_count > 0:
            return True
    except (ValueError, TypeError):
        pass
    result = merchant_places_collection.update_one({"id": place_id}, {"$inc": inc_fields})
    return result.matched_count > 0

def find_place_doc(place_id: str):
    """Looks up a place (curated or merchant) by id, trying the numeric id first."""
    try:
        doc = places_collection.find_one({"id": int(place_id)}, {"_id": 0})
        if doc:
            return doc
    except (ValueError, TypeError):
        pass
    return merchant_places_collection.find_one({"id": place_id}, {"_id": 0})

def verify_admin_key(x_admin_key: str = Header(None)):
    if not ADMIN_PASSWORD or x_admin_key != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="ไม่ได้รับอนุญาต (Unauthorized)")

PBKDF2_ITERATIONS = 200_000

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return f"{salt}${digest.hex()}"

def verify_password(password: str, stored_hash: str) -> bool:
    try:
        salt, digest_hex = stored_hash.split("$", 1)
    except ValueError:
        return False
    expected = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ITERATIONS)
    return hmac.compare_digest(expected.hex(), digest_hex)

# ==========================================
# 🌐 API Endpoints
# ==========================================

# Lightweight keep-alive target for uptime monitors (they may ping with HEAD),
# so the free Render instance doesn't spin down between visits.
@app.api_route("/health", methods=["GET", "HEAD"])
def health():
    return {"status": "ok"}

@app.get("/get_home_places")
def get_home_places(pref: str = None):
    load_places_db()
    approved_merchant_places = list(merchant_places_collection.find({"status": "approved"}, {"_id": 0}))

    if pref:
        keywords = [CATEGORY_MAP[p] for p in pref.split(',') if p in CATEGORY_MAP]
        matched = [p for p in ATTRACTIONS_DB if any(k in str(p.get('tag', '')) for k in keywords)]
        unmatched = [p for p in ATTRACTIONS_DB if not any(k in str(p.get('tag', '')) for k in keywords)]

        random.shuffle(matched)
        random.shuffle(unmatched)

        combined_places = approved_merchant_places + matched + unmatched
        return {"status": "success", "places": combined_places}

    shuffled_db = ATTRACTIONS_DB.copy()
    random.shuffle(shuffled_db)
    return {"status": "success", "places": approved_merchant_places + shuffled_db}

# ==========================================
# 🏪 ระบบร้านค้า (Merchant POI Submission & Moderation)
# ==========================================

@app.post("/merchant/places")
def submit_merchant_place(place: MerchantPlaceSubmission):
    doc = place.dict()
    doc["id"] = "poi_" + str(int(datetime.now().timestamp() * 1000))
    doc["status"] = "pending"
    doc["rejectReason"] = ""
    doc["registeredAt"] = datetime.now().strftime("%Y-%m-%d %H:%M น.")
    merchant_places_collection.insert_one(doc)
    doc.pop("_id", None)
    return {"status": "success", "place": doc}

@app.get("/merchant/places")
def get_merchant_places(owner_email: str = None):
    if not owner_email:
        return {"status": "error", "message": "ต้องระบุ owner_email", "places": []}
    items = list(
        merchant_places_collection.find({"ownerEmail": owner_email}, {"_id": 0}).sort("registeredAt", -1)
    )
    return {"status": "success", "places": items}

@app.put("/merchant/places/{place_id}")
def edit_merchant_place(place_id: str, body: MerchantPlaceEditRequest):
    existing = merchant_places_collection.find_one({"id": place_id})
    if not existing:
        return {"status": "error", "message": "ไม่พบรายการนี้"}
    if existing.get("ownerEmail") != body.ownerEmail:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์แก้ไขรายการนี้")

    update_fields = body.dict()
    update_fields["status"] = "pending"
    update_fields["rejectReason"] = ""
    merchant_places_collection.update_one({"id": place_id}, {"$set": update_fields})
    return {"status": "success"}

@app.delete("/merchant/places/{place_id}")
def delete_merchant_place(place_id: str, owner_email: str):
    existing = merchant_places_collection.find_one({"id": place_id})
    if not existing:
        return {"status": "error", "message": "ไม่พบรายการนี้"}
    if existing.get("ownerEmail") != owner_email:
        raise HTTPException(status_code=403, detail="ไม่มีสิทธิ์ลบรายการนี้")

    merchant_places_collection.delete_one({"id": place_id})
    return {"status": "success"}

@app.post("/merchant/upload")
async def upload_merchant_file(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_UPLOAD_EXTENSIONS:
        return {"status": "error", "message": "รองรับเฉพาะไฟล์ภาพ JPG, PNG, WEBP เท่านั้น"}
    filename = f"{uuid.uuid4().hex}{ext}"
    uploads_fs.put(file.file, filename=filename, contentType=UPLOAD_CONTENT_TYPES[ext])
    return {"status": "success", "url": f"/uploads/{filename}"}

@app.get("/uploads/{filename}")
def get_uploaded_file(filename: str):
    grid_out = uploads_fs.find_one({"filename": filename})
    if grid_out is None:
        raise HTTPException(status_code=404, detail="File not found")
    return Response(
        content=grid_out.read(),
        media_type=grid_out.content_type or "application/octet-stream",
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )

@app.get("/admin/merchant_places")
def admin_list_merchant_places(x_admin_key: str = Header(None)):
    verify_admin_key(x_admin_key)
    items = list(merchant_places_collection.find({}, {"_id": 0}).sort("registeredAt", -1))
    return {"status": "success", "places": items}

@app.post("/admin/merchant_places/{place_id}/status")
def admin_update_merchant_place_status(place_id: str, body: MerchantPlaceStatusUpdate, x_admin_key: str = Header(None)):
    verify_admin_key(x_admin_key)
    if body.status not in ("pending", "approved", "rejected"):
        return {"status": "error", "message": "สถานะไม่ถูกต้อง"}
    update_fields = {
        "status": body.status,
        "rejectReason": body.reason if body.status == "rejected" else "",
    }
    result = merchant_places_collection.update_one({"id": place_id}, {"$set": update_fields})
    if result.matched_count == 0:
        return {"status": "error", "message": "ไม่พบรายการนี้"}
    return {"status": "success"}

@app.delete("/admin/merchant_places/{place_id}")
def admin_delete_merchant_place(place_id: str, x_admin_key: str = Header(None)):
    verify_admin_key(x_admin_key)
    result = merchant_places_collection.delete_one({"id": place_id})
    if result.deleted_count == 0:
        return {"status": "error", "message": "ไม่พบรายการนี้"}
    return {"status": "success"}

# ==========================================
# 🗺️ ระบบจัดการฐานข้อมูลสถานที่ท่องเที่ยว (Admin: Manage POIs)
# ==========================================

@app.get("/admin/places")
def admin_list_places(x_admin_key: str = Header(None)):
    verify_admin_key(x_admin_key)
    load_places_db()
    # รวมสถานที่ของผู้ประกอบการที่อนุมัติแล้วเข้ามาด้วย เพื่อให้เห็นสถานที่ทั้งหมดที่แสดงผลจริงในระบบ
    approved_merchant_places = list(merchant_places_collection.find({"status": "approved"}, {"_id": 0}))
    return {"status": "success", "places": ATTRACTIONS_DB + approved_merchant_places}

@app.post("/admin/places")
def admin_create_place(body: AdminPlaceUpsert, x_admin_key: str = Header(None)):
    verify_admin_key(x_admin_key)
    last = places_collection.find_one(sort=[("id", -1)])
    new_id = (last["id"] + 1) if last else 1
    doc = body.dict()
    doc["id"] = new_id
    places_collection.insert_one(doc)
    doc.pop("_id", None)
    load_places_db()
    return {"status": "success", "place": doc}

@app.put("/admin/places/{place_id}")
def admin_update_place(place_id: int, body: AdminPlaceUpsert, x_admin_key: str = Header(None)):
    verify_admin_key(x_admin_key)
    result = places_collection.update_one({"id": place_id, "deleted": {"$ne": True}}, {"$set": body.dict()})
    if result.matched_count == 0:
        return {"status": "error", "message": "ไม่พบสถานที่นี้"}
    load_places_db()
    return {"status": "success"}

@app.delete("/admin/places/{place_id}")
def admin_delete_place(place_id: int, x_admin_key: str = Header(None)):
    verify_admin_key(x_admin_key)
    # Soft delete: keep the document with a `deleted` flag so the startup CSV seed-sync
    # ($setOnInsert) sees it still exists and doesn't bring the place back after a restart.
    result = places_collection.update_one(
        {"id": place_id, "deleted": {"$ne": True}},
        {"$set": {"deleted": True, "deletedAt": datetime.now().isoformat()}},
    )
    if result.matched_count == 0:
        return {"status": "error", "message": "ไม่พบสถานที่นี้"}
    load_places_db()
    return {"status": "success"}

# ==========================================
# 📈 ระบบเก็บสถิติการใช้งานจริง (VR views / Trip adds / Ratings)
# ==========================================

@app.post("/track/vr_view")
def track_vr_view(body: VrViewTrack):
    find_place_and_increment(body.place_id, {"vrViews": 1})
    return {"status": "success"}

RATING_FEEDBACK_THRESHOLD = 4  # ratings at/above this actually get learned by the AI model

@app.post("/track/rating")
def track_rating(body: RatingTrack):
    if body.rating < 1 or body.rating > 5:
        return {"status": "error", "message": "คะแนนต้องอยู่ระหว่าง 1-5"}
    find_place_and_increment(body.place_id, {"ratingSum": body.rating, "ratingCount": 1})

    # Feedback loop: a good rating given with real trip context (the budget/time/mood
    # the tourist actually searched with) becomes a new training example, then the
    # model is retrained immediately so future recommendations reflect real satisfaction.
    learned = False
    if (
        body.rating >= RATING_FEEDBACK_THRESHOLD
        and body.budget is not None
        and body.time_hours is not None
        and body.trip_mood
    ):
        place = find_place_doc(body.place_id)
        category = REVERSE_CATEGORY_MAP.get(place.get("tag")) if place else None
        if place and category:
            dataset_collection.insert_one({
                "budget": body.budget,
                "time_hours": body.time_hours,
                "category": category,
                "trip_mood": body.trip_mood.split(',')[0].strip(),
                "place_name": place["name"],
            })
            train_ai()
            learned = True

    return {"status": "success", "learned": learned}

@app.post("/track/trip_add")
def track_trip_add(body: TripAddTrack):
    for place_id in body.place_ids:
        find_place_and_increment(str(place_id), {"tripAdds": 1})
    if body.owner_email:
        users_collection.update_one({"email": body.owner_email}, {"$inc": {"tripsCreated": 1}})
    return {"status": "success"}

# ==========================================
# 🤖 ระบบเทรนโมเดล AI ใหม่ (Admin: Retrain)
# ==========================================

@app.post("/admin/retrain")
def admin_retrain_ai(x_admin_key: str = Header(None)):
    verify_admin_key(x_admin_key)
    train_ai()
    dataset_rows = dataset_collection.count_documents({})
    if is_ai_ready:
        return {
            "status": "success",
            "message": f"เทรนโมเดล AI ใหม่เรียบร้อยแล้ว (ใช้ข้อมูล {dataset_rows} แถว)",
            "datasetRows": dataset_rows,
        }
    return {
        "status": "error",
        "message": f"เทรนโมเดลไม่สำเร็จ ข้อมูล dataset มีแค่ {dataset_rows} แถว (ต้องมีอย่างน้อย 5 แถว)",
        "datasetRows": dataset_rows,
    }

# ==========================================
# 👥 ระบบจัดการผู้ใช้งาน (Admin: User Management)
# ==========================================

@app.get("/admin/users")
def admin_list_users(x_admin_key: str = Header(None)):
    verify_admin_key(x_admin_key)
    users = list(users_collection.find({}, {"_id": 0}))
    for u in users:
        prefs = u.get("preferences", "") or ""
        u["role"] = "business" if prefs.startswith("business:") else "tourist"
        u.setdefault("status", "active")
        u.setdefault("tripsCreated", 0)
    return {"status": "success", "users": users}

@app.post("/admin/users/{email}/status")
def admin_update_user_status(email: str, body: UserStatusUpdate, x_admin_key: str = Header(None)):
    verify_admin_key(x_admin_key)
    if body.status not in ("active", "suspended"):
        return {"status": "error", "message": "สถานะไม่ถูกต้อง"}
    result = users_collection.update_one({"email": email}, {"$set": {"status": body.status}})
    if result.matched_count == 0:
        return {"status": "error", "message": "ไม่พบผู้ใช้งานนี้"}
    return {"status": "success"}

@app.post("/login_user")
def login_user(req: LoginRequest):
    req_email = req.email.strip()

    if ADMIN_EMAIL and req_email.lower() == ADMIN_EMAIL.strip().lower():
        # Admin "password" is the same ADMIN_PASSWORD used as the admin API key -
        # knowing the admin email alone (e.g. from .env.example) is no longer enough.
        if not ADMIN_PASSWORD or req.password != ADMIN_PASSWORD:
            return {"status": "invalid_password", "message": "รหัสผ่านไม่ถูกต้อง"}
        return {"status": "admin", "adminKey": ADMIN_PASSWORD, "role": "admin", "name": ADMIN_NAME}

    try:
        user = users_collection.find_one({"email": req_email})
        if user:
            if user.get("status") == "suspended":
                return {"status": "suspended", "message": "บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ"}

            # Accounts registered before password support has no passwordHash yet - only
            # enforce the check once a hash actually exists, so old accounts still work.
            stored_hash = user.get("passwordHash")
            if stored_hash and not verify_password(req.password or "", stored_hash):
                return {"status": "invalid_password", "message": "รหัสผ่านไม่ถูกต้อง"}

            # Determine role
            role = user.get("role")
            if not role:
                prefs = str(user.get("preferences", ""))
                if prefs.startswith("business:") or merchant_places_collection.find_one({"ownerEmail": req_email}):
                    role = "business"
                else:
                    role = "tourist"

            user_data = user.get("userData") or {
                "name": user.get("name", ""),
                "email": user.get("email", req_email),
                "role": role,
            }
            if isinstance(user_data, dict) and "role" not in user_data:
                user_data["role"] = role

            return {
                "status": "returning_user",
                "pref": user.get("preferences", ""),
                "role": role,
                "userData": user_data
            }

        # Fallback check if user email is registered in merchant places
        merchant = merchant_places_collection.find_one({"ownerEmail": req_email})
        if merchant:
            return {
                "status": "returning_user",
                "pref": "business:" + (merchant.get("tag") or "cafe"),
                "role": "business",
                "userData": {
                    "name": merchant.get("ownerName", ""),
                    "email": merchant.get("ownerEmail", req_email),
                    "businessName": merchant.get("businessName", merchant.get("name", "")),
                    "businessType": merchant.get("businessType", "cafe"),
                    "businessLicense": merchant.get("businessLicense", ""),
                    "businessPhone": merchant.get("businessPhone", ""),
                    "role": "business"
                }
            }

        return {"status": "new_user"}
    except Exception:
        return {"status": "new_user"}

@app.post("/save_user")
def save_user(user: UserInfo):
    try:
        req_email = user.email.strip()
        existing_user = users_collection.find_one({"email": req_email})
        user_role = user.role or "tourist"
        user_data = user.userData or {
            "name": user.name.strip(),
            "email": req_email,
            "role": user_role
        }

        update_doc = {
            "name": user.name.strip(),
            "email": req_email,
            "preferences": user.preferences,
            "role": user_role,
            "userData": user_data
        }

        if existing_user:
            # Password is only ever set at registration - never overwritten by a later
            # profile/preferences update through this same endpoint.
            users_collection.update_one({"email": req_email}, {"$set": update_doc})
            return {"status": "success", "message": "อัปเดตข้อมูลผู้ใช้เรียบร้อย"}

        update_doc["timestamp"] = datetime.now()
        update_doc["status"] = "active"
        if user.password:
            update_doc["passwordHash"] = hash_password(user.password)
        users_collection.insert_one(update_doc)
        return {"status": "success"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

@app.post("/recommend")
def recommend_trip(req: TripRequest):
    try:
        recommended_names = set()
        if is_ai_ready:
            moods = [m.strip() for m in req.trip_mood.split(',')]
            for cat in req.categories:
                for mood in moods:
                    try:
                        mood_encoded = le_mood.transform([mood])[0]
                        cat_encoded = le_category.transform([cat])[0]
                        # predict_proba + rank instead of .predict(): the model can rank a place from
                        # the wrong category first when training data is sparse, so walk the ranked
                        # candidates and take the first one that actually belongs to the requested
                        # category, instead of trusting the single top-1 class blindly.
                        proba = ai_model.predict_proba([[req.budget, req.time_hours, mood_encoded, cat_encoded]])[0]
                        ranked_class_indices = proba.argsort()[::-1]
                        for class_idx in ranked_class_indices:
                            if proba[class_idx] <= 0:
                                break
                            place_result = le_place.inverse_transform([ai_model.classes_[class_idx]])[0]
                            if place_category_map.get(place_result) == cat:
                                recommended_names.add(place_result)
                                break
                    except ValueError:
                        continue

        load_places_db()
        places_data = []
        
        # 1. ค้นหาจากฐานข้อมูลตามหมวดหมู่ (Tag) ที่เลือกทั้งหมด
        keywords = [CATEGORY_MAP.get(c, c) for c in req.categories]
        tag_places = []
        for p in ATTRACTIONS_DB:
            if any(k in str(p.get('tag', '')) for k in keywords):
                tag_places.append(p)
        
        random.shuffle(tag_places) 
        
        # 2. นำสถานที่ที่ตรง Tag ใส่เข้าไปในรายชื่อ (แสดงผลทั้งหมด ไม่ตัดทิ้งแล้ว)
        for p in tag_places:
            if not any(existing_p['name'] == p['name'] for existing_p in places_data):
                places_data.append(p)
                
        # 3. นำผลลัพธ์จาก AI มาต่อท้าย
        ai_places = [p for p in ATTRACTIONS_DB if p['name'] in recommended_names]
        for p in ai_places:
            if not any(existing_p['name'] == p['name'] for existing_p in places_data):
                places_data.append(p)

        # 4. กรณีฉุกเฉินจริงๆ ถ้าหาไม่เจอเลย ค่อยสุ่มมาให้ 4 ที่
        if len(places_data) == 0:
            places_data = random.sample(ATTRACTIONS_DB, min(4, len(ATTRACTIONS_DB)))

        # 5. เรียงลำดับผู้สมัครทั้งหมดตาม GPS จากใกล้ไปไกล (ถ้ามีพิกัด) พร้อมประเมินเวลาเดินทางแต่ละช่วง
        ordered_candidates = []
        far_from_province = False
        if req.user_lat and req.user_lng:
            # distance_km = ระยะจากตัวผู้ใช้ตรงไปยังสถานที่นั้นเสมอ (ไม่ใช่ระยะจากจุดก่อนหน้า)
            for p in places_data:
                p['distance_km'] = round(calculate_distance(req.user_lat, req.user_lng, float(p['lat']), float(p['lng'])), 1)

            # ผู้ใช้อยู่นอกจังหวัด (เช่น กรุงเทพฯ): ไม่นับเวลาเดินทางมาถึงสุราษฎร์ฯ ในเวลาทริป
            # ไม่งั้นแค่ขาแรกก็กินเวลาเกินทุกทริป และระบบจะหาสถานที่ให้ไม่ได้เลย
            far_from_province = min(p['distance_km'] for p in places_data) > FAR_FROM_PROVINCE_KM

            remaining = places_data.copy()
            current_lat, current_lng = req.user_lat, req.user_lng
            is_first_leg = True
            while remaining:
                nearest_place = min(remaining, key=lambda p: calculate_distance(current_lat, current_lng, float(p['lat']), float(p['lng'])))
                leg_dist = calculate_distance(current_lat, current_lng, float(nearest_place['lat']), float(nearest_place['lng']))
                count_leg = not (is_first_leg and far_from_province)
                nearest_place['_leg_travel_hours'] = leg_dist / AVG_TRAVEL_SPEED_KMH if count_leg else 0.0
                ordered_candidates.append(nearest_place)
                current_lat, current_lng = float(nearest_place['lat']), float(nearest_place['lng'])
                remaining.remove(nearest_place)
                is_first_leg = False
        else:
            for p in places_data:
                p['_leg_travel_hours'] = 0.0
            ordered_candidates = places_data

        # 6. คัดเลือกแบบ greedy ให้รวมค่าใช้จ่ายและเวลาไม่เกินงบ/เวลาที่ระบุจริง
        route_plan = []
        total_cost = 0.0
        total_time = 0.0
        for p in ordered_candidates:
            leg_hours = p.pop('_leg_travel_hours', 0.0)
            price = parse_price_to_number(p.get('price', ''))
            stop_time = leg_hours + DEFAULT_VISIT_DURATION_HOURS
            if (total_cost + price) <= req.budget and (total_time + stop_time) <= req.time_hours:
                route_plan.append(p)
                total_cost += price
                total_time += stop_time

        budget_warning = None
        if len(route_plan) == 0 and ordered_candidates:
            # งบ/เวลาน้อยเกินกว่าจะไปที่ไหนได้เลย เลือกตัวเลือกที่ประหยัดที่สุดให้แทนอย่างน้อย 1 ที่
            cheapest = min(ordered_candidates, key=lambda p: parse_price_to_number(p.get('price', '')))
            route_plan = [cheapest]
            total_cost = parse_price_to_number(cheapest.get('price', ''))
            total_time = DEFAULT_VISIT_DURATION_HOURS
            budget_warning = "งบประมาณหรือเวลาที่ระบุอาจไม่พอสำหรับสถานที่ที่แนะนำ ระบบเลือกตัวเลือกที่ประหยัดที่สุดให้แทนอย่างน้อย 1 แห่ง"

        return {
            "status": "success",
            "route": route_plan,
            "estimated_cost": round(total_cost, 2),
            "estimated_time_hours": round(total_time, 2),
            "budget_warning": budget_warning,
            "far_from_province": far_from_province,
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}