import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import joblib

# 1. โหลดข้อมูลจาก dataset.csv ที่อัปเดตแล้ว
df = pd.read_csv('dataset.csv')

# 2. แปลงข้อมูลที่เป็นข้อความให้เป็นตัวเลข (Encoding)
le_category = LabelEncoder()
le_mood = LabelEncoder() # เปลี่ยนจาก le_traveler เป็น le_mood

df['category_encoded'] = le_category.fit_transform(df['category'])
df['trip_mood_encoded'] = le_mood.fit_transform(df['trip_mood']) # ใช้คอลัมน์ trip_mood

# 3. กำหนดfeatures (ตัวแปรต้น) และ target (ผลลัพธ์ที่ต้องการทำนาย)
X = df[['budget', 'time_hours', 'category_encoded', 'trip_mood_encoded']]
y = df['place_name']

# 4. เทรนโมเดล (Machine Learning Model)
model = RandomForestClassifier(random_state=42)
model.fit(X, y)

# 5. บันทึกโมเดลและตัวแปลงข้อมูลเก็บไว้ใช้ใน main.py
joblib.dump(model, 'recommender_model.pkl')
joblib.dump(le_category, 'category_encoder.pkl')
joblib.dump(le_mood, 'mood_encoder.pkl') # บันทึก mood encoder

print("เทรนโมเดลใหม่ (Trip Mood) สำเร็จเรียบร้อยแล้วครับ!")