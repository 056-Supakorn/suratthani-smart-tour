# 🌴 สุราษฎร์ธานี Smart Tour (Surat Thani Smart Tour Platform)
> ระบบแนะนำสถานที่ท่องเที่ยวและจัดทริปอัจฉริยะจังหวัดสุราษฎร์ธานี ขับเคลื่อนด้วยปัญญาประดิษฐ์ (AI Recommendation) และเทคโนโลยีภาพเสมือนจริง VR 360°

---

## 🌟 จุดเด่นของระบบ (Key Features)

### 1. 🏛️ ระบบสิทธิการใช้งาน 3 บทบาท (Role-Based Access Control - RBAC)
* 🎒 **บทบาทนักท่องเที่ยว (Tourist)**:
  * บันทึกข้อมูลประชากรศาสตร์และตั้งค่าสไตล์การเที่ยว (Preferences Onboarding)
  * ร้องขอการแนะนำเส้นทางตามงบประมาณ (Budget) เวลา (Time) และอารมณ์ทริป (Trip Moods)
  * วางแผนทริปและคำนวณระยะทางแบบจุดต่อจุด (Point-to-Point Haversine)
  * สัมผัสทัศนียภาพเสมือนจริงแบบ VR 360° (Equirectangular Viewer)
  * ให้คะแนนความพึงพอใจและเรตติ้งรีวิว (⭐ Rating & Feedback) เพื่อเป็น Feedback Loop ให้ AI
* 🏪 **บทบาทผู้ประกอบการ (Business / Merchant)**:
  * ลงทะเบียนและแนบหลักฐานยืนยันตัวตน (DBD Registration / Commercial License)
  * จัดการข้อมูลร้านค้า เวลาทำการ คำอธิบายไฮไลท์ และพิกัดแผนที่ GPS สด
  * อัปโหลดสื่อและภาพถ่ายพาโนรามาสำหรับทำ VR 360°
  * แดชบอร์ดสถิติระดับร้านค้า (ยอดวิว VR, จำนวนครั้งที่ถูกเพิ่มลงทริป, คะแนนรีวิวเฉลี่ย)
* 🛡️ **บทบาทผู้ดูแลระบบ (Admin)**:
  * ระบบตรวจสอบและอนุมัติร้านค้า (Moderation & Verification) ป้องกันร้านค้าปลอม
  * ควบคุมฐานข้อมูลสถานที่ท่องเที่ยว 52 แห่งทั่วสุราษฎร์ธานี
  * จัดการทรัพยากรภาพเสมือนจริง VR 360° และจุด Hotspots สาธารณะ
  * การจัดการผู้ใช้งานและสิทธิการเข้าถึง (User Access & Suspension)
  * รายงานสถิติภาพรวมและการเรียนรู้ของ AI (System Analytics)

---

## 🛠️ สถาปัตยกรรมและเทคโนโลยีที่ใช้ (Tech Stack)

* **Frontend**: React 19, Vite, Vanilla CSS Design System (Light & Dark Theme), Pannellum VR 360
* **Backend AI**: Python, FastAPI, Scikit-learn (Random Forest Machine Learning), Pandas, Uvicorn
* **Database**: MongoDB Atlas, CSV Datasets
* **Security**: Role-Based Access Control, Environment Variables, Secret Isolation

---

## 🚀 วิธีการติดตั้งและรันระบบ (Getting Started)

### 1. ติดตั้งและเริ่มทำงานฝั่ง Frontend (React + Vite)
```bash
# ติดตั้ง dependencies
npm install

# รัน Development Server
npm run dev

# Build สำหรับ Production
npm run build
```
เปิดบราวเซอร์ที่: `http://localhost:5174/`

---

### 2. ติดตั้งและเริ่มทำงานฝั่ง Backend (FastAPI + AI)
```bash
cd backend_AI

# สร้าง Virtual Environment
python -m venv venv
venv\Scripts\activate  # บน Windows
# source venv/bin/activate  # บน macOS/Linux

# ติดตั้ง dependencies
pip install fastapi uvicorn pandas scikit-learn pymongo python-dotenv

# คัดลอกไฟล์ Environment Variables
cp .env.example .env

# รัน Backend Server
uvicorn main:app --reload --port 8000
```
API Documentation: `http://127.0.0.1:8000/docs`

---

## 🔒 นโยบายความปลอดภัย (Security Guidelines)

* **ไฟล์ `.env` และ Private Keys (Service Account / Credentials)** ถูกบันทึกไว้ใน `.gitignore` เสมอ ห้ามคอมมิตขึ้น GitHub เด็ดขาด
* สำหรับการ Deploy ให้นำค่า Environment Variables จาก `.env.example` ไปตั้งค่าใน Server / Cloud Provider อย่างปลอดภัย

---

## 📄 ใบอนุญาต (License)
โครงการนี้จัดทำขึ้นเพื่อการท่องเที่ยวอัจฉริยะจังหวัดสุราษฎร์ธานี (Surat Thani Smart Tourism)
