import sys

# Force UTF-8 stdout/stderr so Thai text and emoji in log messages never crash
# the process on platforms whose default console codepage can't encode them
# (e.g. Windows cp874/cp1252 terminals).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import os
import random
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
                update_data = {
                    "$set": {
                        "id": int(place["id"]),
                        "name": place["name"],
                        "tag": place["tag"],
                        "image": place["image"],
                        "vr_image": place["vr_image"],
                        "location": place["location"],
                        "travelTime": place["travelTime"],
                        "description": place["description"],
                        "lat": float(place["lat"]),
                        "lng": float(place["lng"])
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

class AdminLoginRequest(BaseModel):
    email: str
    password: str

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

class MerchantPlaceStatusUpdate(BaseModel):
    status: str
    reason: str = ""

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

@app.post("/login_admin")
def login_admin(req: AdminLoginRequest):
    if not ADMIN_EMAIL or not ADMIN_PASSWORD:
        return {"status": "error", "message": "ยังไม่ได้ตั้งค่าบัญชีผู้ดูแลระบบบนเซิร์ฟเวอร์ (ADMIN_EMAIL/ADMIN_PASSWORD)"}
    if req.email.strip().lower() == ADMIN_EMAIL.strip().lower() and req.password == ADMIN_PASSWORD:
        return {"status": "success"}
    return {"status": "error", "message": "อีเมลหรือรหัสผ่านไม่ถูกต้อง"}

@app.post("/login_user")
def login_user(req: LoginRequest):
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

        route_plan = []
        
        # 5. ให้ GPS จัดเรียงทั้งหมดจากจุดที่ใกล้ที่สุดไปไกลที่สุด
        if req.user_lat and req.user_lng:
            current_lat, current_lng = req.user_lat, req.user_lng
            while places_data:
                nearest_place = min(places_data, key=lambda p: calculate_distance(current_lat, current_lng, float(p['lat']), float(p['lng'])))
                
                dist_from_user = calculate_distance(req.user_lat, req.user_lng, float(nearest_place['lat']), float(nearest_place['lng']))
                nearest_place['distance_km'] = round(dist_from_user, 1)
                
                route_plan.append(nearest_place)
                
                current_lat, current_lng = float(nearest_place['lat']), float(nearest_place['lng'])
                places_data.remove(nearest_place)
        else:
            route_plan = places_data

        return {"status": "success", "route": route_plan}
    except Exception as e:
        return {"status": "error", "message": str(e)}