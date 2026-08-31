import sys

# Force UTF-8 stdout/stderr so Thai text and emoji in log messages never crash
# the process on platforms whose default console codepage can't encode them
# (e.g. Windows cp874/cp1252 terminals).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, Header, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import os
import random
import re
import shutil
import uuid
from datetime import datetime
import warnings
import math
from pymongo import MongoClient

warnings.filterwarnings('ignore')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# 🖼️ ไฟล์ที่ผู้ประกอบการอัปโหลด (รูปภาพ / VR 360°)
# ==========================================
UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
ALLOWED_UPLOAD_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

# ==========================================
# 📊 1. ส่วนเชื่อมต่อ MongoDB 
# ==========================================
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

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
    print("✅ [DB READY] เชื่อมต่อ MongoDB สำเร็จ!")
except Exception as e:
    print(f"❌ [DB ERROR] เชื่อมต่อ MongoDB ล้มเหลว: {e}")

# ==========================================
# 🗄️ 2. ระบบฐานข้อมูลสถานที่ (Full Database with Upsert)
# ==========================================
PLACES_FILE = 'places_db.csv'
ATTRACTIONS_DB = []

def load_places_db():
    global ATTRACTIONS_DB
    print("🔄 กำลังตรวจสอบและซิงก์ข้อมูลสถานที่เข้า MongoDB...")
    if os.path.exists(PLACES_FILE):
        try:
            df = pd.read_csv(PLACES_FILE, encoding='utf-8-sig')
            df = df.fillna('')
            places_to_insert = df.to_dict('records')
            
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
                places_collection.update_one(query, update_data, upsert=True)
            print("✅ ซิงก์ข้อมูลสถานที่ใน MongoDB สำเร็จ (ไม่ต้อง Drop ทิ้ง)!")
        except Exception as e:
            print(f"❌ เกิดข้อผิดพลาดในการอ่านไฟล์ {PLACES_FILE}: {e}")
            
    ATTRACTIONS_DB = list(places_collection.find({}, {"_id": 0}))

load_places_db()

CATEGORY_MAP = {"sea": "ทะเล", "mountain": "ธรรมชาติ", "temple": "วัด", "local": "ชุมชน", "cafe": "คาเฟ่", "food": "ร้านอาหาร"}

# ==========================================
# 🧠 3. ระบบ AI Machine Learning
# ==========================================
DATASET_FILE = 'dataset.csv'
ai_model = RandomForestClassifier(n_estimators=100, random_state=42)
le_mood, le_category, le_place = LabelEncoder(), LabelEncoder(), LabelEncoder()
is_ai_ready = False

def train_ai():
    global is_ai_ready
    
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
    user_lat: float = None 
    user_lng: float = None 

class UserInfo(BaseModel):
    name: str
    email: str
    preferences: str

class LoginRequest(BaseModel):
    name: str
    email: str

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

def verify_admin_key(x_admin_key: str = Header(None)):
    if not ADMIN_PASSWORD or x_admin_key != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="ไม่ได้รับอนุญาต (Unauthorized)")

# ==========================================
# 🌐 API Endpoints
# ==========================================

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
    file_path = os.path.join(UPLOAD_DIR, filename)
    with open(file_path, "wb") as f:
        shutil.copyfileobj(file.file, f)
    return {"status": "success", "url": f"/uploads/{filename}"}

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

# ==========================================
# 🗺️ ระบบจัดการฐานข้อมูลสถานที่ท่องเที่ยว (Admin: Manage POIs)
# ==========================================

@app.get("/admin/places")
def admin_list_places(x_admin_key: str = Header(None)):
    verify_admin_key(x_admin_key)
    load_places_db()
    return {"status": "success", "places": ATTRACTIONS_DB}

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
    result = places_collection.update_one({"id": place_id}, {"$set": body.dict()})
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

@app.post("/track/rating")
def track_rating(body: RatingTrack):
    if body.rating < 1 or body.rating > 5:
        return {"status": "error", "message": "คะแนนต้องอยู่ระหว่าง 1-5"}
    find_place_and_increment(body.place_id, {"ratingSum": body.rating, "ratingCount": 1})
    return {"status": "success"}

@app.post("/track/trip_add")
def track_trip_add(body: TripAddTrack):
    for place_id in body.place_ids:
        find_place_and_increment(str(place_id), {"tripAdds": 1})
    if body.owner_email:
        users_collection.update_one({"email": body.owner_email}, {"$inc": {"tripsCreated": 1}})
    return {"status": "success"}

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
    if (
        ADMIN_NAME
        and ADMIN_EMAIL
        and req.name.strip().lower() == ADMIN_NAME.strip().lower()
        and req.email.strip().lower() == ADMIN_EMAIL.strip().lower()
    ):
        return {"status": "admin", "adminKey": ADMIN_PASSWORD}

    try:
        user = users_collection.find_one({"email": req.email.strip()})
        if user:
            if user.get("name") != req.name.strip():
                return {"status": "name_mismatch", "message": f"อีเมลนี้ถูกลงทะเบียนไว้ด้วยชื่อ '{user.get('name')}' แล้ว"}
            return {"status": "returning_user", "pref": user.get("preferences", "")}
        return {"status": "new_user"}
    except Exception:
        return {"status": "new_user"}

@app.post("/save_user")
def save_user(user: UserInfo):
    try:
        existing_user = users_collection.find_one({"email": user.email.strip()})
        if existing_user:
            return {"status": "success", "message": "มีข้อมูลอยู่แล้ว"}
        
        users_collection.insert_one({
            "timestamp": datetime.now(),
            "name": user.name,
            "email": user.email,
            "preferences": user.preferences
        })
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
                        prediction = ai_model.predict([[req.budget, req.time_hours, mood_encoded, cat_encoded]])
                        place_result = le_place.inverse_transform(prediction)[0]
                        recommended_names.add(place_result)
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
        if req.user_lat and req.user_lng:
            remaining = places_data.copy()
            current_lat, current_lng = req.user_lat, req.user_lng
            while remaining:
                nearest_place = min(remaining, key=lambda p: calculate_distance(current_lat, current_lng, float(p['lat']), float(p['lng'])))
                dist = calculate_distance(current_lat, current_lng, float(nearest_place['lat']), float(nearest_place['lng']))
                nearest_place['distance_km'] = round(dist, 1)
                nearest_place['_leg_travel_hours'] = dist / AVG_TRAVEL_SPEED_KMH
                ordered_candidates.append(nearest_place)
                current_lat, current_lng = float(nearest_place['lat']), float(nearest_place['lng'])
                remaining.remove(nearest_place)
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
        }
    except Exception as e:
        return {"status": "error", "message": str(e)}