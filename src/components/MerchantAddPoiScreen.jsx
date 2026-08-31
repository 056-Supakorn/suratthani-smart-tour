import React, { useState } from 'react';

export default function MerchantAddPoiScreen({
  theme,
  toggleTheme,
  onLogout,
  onViewAsTourist,
}) {
  const userDataRaw = localStorage.getItem('userData');
  const userData = userDataRaw ? JSON.parse(userDataRaw) : {};
  const businessNameInitial = userData.businessName || 'คาเฟ่ริมหาด สมุย ซันเซ็ท';
  const businessTypeInitial = userData.businessType || 'cafe';

  const [activeTab, setActiveTab] = useState('manage-poi'); // 'manage-poi' | 'dashboard' | 'vr-assets'
  const [placeName, setPlaceName] = useState(businessNameInitial);
  const [tag, setTag] = useState(
    businessTypeInitial === 'cafe'
      ? 'คาเฟ่'
      : businessTypeInitial === 'food'
      ? 'ร้านอาหาร'
      : businessTypeInitial === 'local'
      ? 'ชุมชน'
      : 'ทะเล'
  );
  const [district, setDistrict] = useState('อำเภอเกาะสมุย');
  const [description, setDescription] = useState(
    'คาเฟ่ริมหาดบรรยากาศสุดชิลล์ ชมวิวพระอาทิตย์ตกดิน เสิร์ฟเครื่องดื่มสดชื่น อาหารพื้นบ้าน และเบเกอรี่โฮมเมด'
  );
  const [travelTime, setTravelTime] = useState('08:30 - 20:00 น.');
  const [lat, setLat] = useState('9.5356');
  const [lng, setLng] = useState('99.9356');
  const [imageUrl, setImageUrl] = useState('');
  const [vrImageUrl, setVrImageUrl] = useState('/vr_images/clocktower.jpg');
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Business Analytics Mock Data
  const merchantStats = {
    vrViews: 342,
    tripAdds: 128,
    avgRating: 4.9,
    totalReviews: 46,
    weeklyGrowth: '+18.5%',
  };

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      alert('เบราว์เซอร์ของคุณไม่รองรับ GPS');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        setGpsLoading(false);
      },
      () => {
        alert('ไม่สามารถดึงพิกัด GPS ได้ กรุณาอนุญาต Location Permission');
        setGpsLoading(false);
      }
    );
  };

  const handleSavePlace = async (e) => {
    e.preventDefault();
    if (!placeName.trim() || !description.trim()) {
      alert('กรุณากรอกชื่อสถานที่และรายละเอียดไฮไลท์ของร้านให้ครบถ้วนครับ');
      return;
    }

    setIsSaving(true);
    try {
      const newPlace = {
        id: 'poi_' + Date.now(),
        name: placeName.trim(),
        tag: tag,
        location: district,
        travelTime: travelTime,
        description: description.trim(),
        lat: parseFloat(lat) || 9.5356,
        lng: parseFloat(lng) || 99.9356,
        image: imageUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80',
        vr_image: vrImageUrl || '/vr_images/clocktower.jpg',
      };

      // Store in local storage to augment home places
      const existingCustom = JSON.parse(localStorage.getItem('merchantPlaces') || '[]');
      existingCustom.unshift(newPlace);
      localStorage.setItem('merchantPlaces', JSON.stringify(existingCustom));

      setTimeout(() => {
        setIsSaving(false);
        setSavedSuccess(true);
      }, 600);
    } catch (err) {
      setIsSaving(false);
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  };

  return (
    <div className={`merchant-page-container ${theme}-theme fade-in`}>
      {/* ================= TOP NAVIGATION BAR ================= */}
      <header className="merchant-header-bar">
        <div className="merchant-header-left">
          <div className="merchant-logo-icon">🏪</div>
          <div>
            <h1 className="merchant-title">ระบบสำหรับผู้ประกอบการ (Business Portal)</h1>
            <p className="merchant-sub">สุราษฎร์ธานี Smart Tour - Partner Control Center</p>
          </div>
        </div>

        <div className="merchant-header-actions">
          <button
            type="button"
            className="merchant-theme-btn"
            onClick={toggleTheme}
            title="สลับโหมดสว่าง/มืด"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            type="button"
            className="merchant-tourist-view-btn"
            onClick={onViewAsTourist}
          >
            🎒 สลับไปมุมมองนักท่องเที่ยว
          </button>
          <button
            type="button"
            className="merchant-logout-btn"
            onClick={onLogout}
          >
            🚪 ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="merchant-main-content">
        {/* ================= VERIFICATION STATUS BANNER ================= */}
        <div className="merchant-status-banner">
          <div className="status-banner-left">
            <span className="status-badge-pending">
              <span className="pulse-dot" /> รอการอนุมัติ (Pending Verification)
            </span>
            <p className="status-banner-desc">
              ระบบได้รับเอกสารและข้อมูลร้าน <b>"{placeName}"</b> แล้ว
              ทีมงานผู้ดูแลระบบกำลังตรวจสอบเอกสาร DBD เพื่อเปิดใช้งานการแสดงผลอย่างเป็นทางการ
            </p>
          </div>
          <div className="status-banner-meta">
            <span>เลขทะเบียน: {userData.businessLicense || '0845564001234'}</span>
            <span>สถานะเอกสาร: แนบเรียบร้อย ✓</span>
          </div>
        </div>

        {/* ================= TABS NAVIGATION ================= */}
        <div className="admin-tabs-nav" style={{ marginTop: '20px' }}>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'manage-poi' ? 'active' : ''}`}
            onClick={() => setActiveTab('manage-poi')}
          >
            📍 จัดการข้อมูลสถานที่ (Manage POI)
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 สถิติระดับร้านค้า (Business Dashboard)
          </button>
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'vr-assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('vr-assets')}
          >
            🕶️ จัดการสื่อ & VR 360° (Upload Assets)
          </button>
        </div>

        {/* ================= TAB 1: MANAGE POI FORM ================= */}
        {activeTab === 'manage-poi' && (
          <div className="merchant-card-form fade-in">
            <h2 className="form-section-title">✨ เพิ่มหรือแก้ไขข้อมูลสถานที่ของตนเอง</h2>
            <p className="form-section-desc">
              ข้อมูลนี้จะถูกส่งต่อไปยัง AI เพื่อวิเคราะห์และจับคู่ให้กับนักท่องเที่ยวที่มีสไตล์การท่องเที่ยวตรงกับร้านของคุณ
            </p>

            {savedSuccess && (
              <div className="merchant-success-box">
                <span className="success-icon">🎉</span>
                <div>
                  <h4 className="success-title">บันทึกข้อมูลสถานที่เรียบร้อยแล้ว!</h4>
                  <p className="success-desc">
                    ข้อมูลสถานที่ของคุณพร้อมให้แสดงผลและให้ AI นำไปจัดทริปแล้วครับ
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSavePlace} className="merchant-poi-form">
              <div className="merchant-form-grid">
                {/* Field 1: Place Name */}
                <div className="form-field-group">
                  <label className="form-input-label">ชื่อสถานที่ / ชื่อร้านค้า *</label>
                  <input
                    type="text"
                    value={placeName}
                    onChange={(e) => setPlaceName(e.target.value)}
                    placeholder="เช่น คาเฟ่ริมหาด สมุย ซันเซ็ท"
                    className="merchant-text-input"
                    required
                  />
                </div>

                {/* Field 2: Category Tag */}
                <div className="form-field-group">
                  <label className="form-input-label">หมวดหมู่สถานที่ *</label>
                  <select
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    className="merchant-select-input"
                  >
                    <option value="คาเฟ่">☕ คาเฟ่และเบเกอรี่</option>
                    <option value="ร้านอาหาร">🍲 ร้านอาหารพื้นบ้าน / ซีฟู้ด</option>
                    <option value="ชุมชน">🛶 แหล่งท่องเที่ยววิถีชุมชน / โฮมสเตย์</option>
                    <option value="ทะเล">🏝️ ทะเลและกิจกรรมทางน้ำ</option>
                    <option value="ธรรมชาติ">⛰️ ธรรมชาติและจุดชมวิว</option>
                    <option value="วัด">⛩️ วัดและศาสนสถาน</option>
                  </select>
                </div>

                {/* Field 3: District */}
                <div className="form-field-group">
                  <label className="form-input-label">อำเภอที่ตั้ง *</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="merchant-select-input"
                  >
                    <option value="อำเภอเกาะสมุย">อำเภอเกาะสมุย</option>
                    <option value="อำเภอเกาะพะงัน">อำเภอเกาะพะงัน</option>
                    <option value="อำเภอเมืองสุราษฎร์ธานี">อำเภอเมืองสุราษฎร์ธานี</option>
                    <option value="อำเภอดอนสัก">อำเภอดอนสัก</option>
                    <option value="อำเภอพุนพิน">อำเภอพุนพิน</option>
                    <option value="อำเภอบ้านตาขุน">อำเภอบ้านตาขุน (เขื่อนเชี่ยวหลาน)</option>
                    <option value="อำเภอพนม">อำเภอพนม (อุทยานแห่งชาติเขาสก)</option>
                    <option value="อำเภอไชยา">อำเภอไชยา</option>
                    <option value="อำเภอบ้านนาสาร">อำเภอบ้านนาสาร</option>
                    <option value="อำเภอคีรีรัฐนิคม">อำเภอคีรีรัฐนิคม</option>
                  </select>
                </div>

                {/* Field 4: Operating Hours */}
                <div className="form-field-group">
                  <label className="form-input-label">เวลาทำการ / เวลาเปิด-ปิด</label>
                  <input
                    type="text"
                    value={travelTime}
                    onChange={(e) => setTravelTime(e.target.value)}
                    placeholder="เช่น 08:30 - 20:00 น. (เปิดทุกวัน)"
                    className="merchant-text-input"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="form-field-group" style={{ marginTop: '16px' }}>
                <label className="form-input-label">คำอธิบายและจุดเด่นของสถานที่ (Highlights) *</label>
                <textarea
                  rows="3"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="บอกเล่าบรรยากาศ เมนูเด็ด หรือสิ่งที่นักท่องเที่ยวห้ามพลาด..."
                  className="merchant-textarea-input"
                  required
                />
              </div>

              {/* GPS Coordinates Fetcher */}
              <div className="form-field-group" style={{ marginTop: '16px' }}>
                <div className="gps-label-row">
                  <label className="form-input-label">พิกัดแผนที่ GPS (Latitude, Longitude)</label>
                  <button
                    type="button"
                    className="gps-fetch-btn"
                    onClick={handleGetGps}
                    disabled={gpsLoading}
                  >
                    {gpsLoading ? '⏳ กำลังดึงพิกัด...' : '📍 ดึงตำแหน่งปัจจุบันของฉัน'}
                  </button>
                </div>
                <div className="gps-inputs-row">
                  <input
                    type="text"
                    placeholder="ละติจูด (Latitude)"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    className="merchant-text-input"
                  />
                  <input
                    type="text"
                    placeholder="ลองจิจูด (Longitude)"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    className="merchant-text-input"
                  />
                </div>
              </div>

              {/* Image & VR Presets */}
              <div className="form-two-col" style={{ marginTop: '16px' }}>
                <div className="form-field-group">
                  <label className="form-input-label">URL รูปภาพหน้าร้าน / ปกสถานที่</label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://... (เว้นว่างไว้จะใช้ภาพอัตโนมัติ)"
                    className="merchant-text-input"
                  />
                </div>

                <div className="form-field-group">
                  <label className="form-input-label">ไฟล์ภาพเสมือนจริง VR 360°</label>
                  <select
                    value={vrImageUrl}
                    onChange={(e) => setVrImageUrl(e.target.value)}
                    className="merchant-select-input"
                  >
                    <option value="/vr_images/clocktower.jpg">🌅 วิวพาโนรามา หอนาฬิกาเมืองสุราษฎร์ธานี</option>
                    <option value="/vr_images/brige.jpg">🌉 วิวพาโนรามา สะพานศรีสุราษฎร์ 360°</option>
                  </select>
                </div>
              </div>

              {/* Submit Button */}
              <div className="form-action-footer" style={{ marginTop: '24px' }}>
                <button
                  type="submit"
                  className="merchant-save-btn"
                  disabled={isSaving}
                >
                  {isSaving ? 'กำลังบันทึกข้อมูล...' : '💾 บันทึกข้อมูลและอัปเดตสถานที่'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ================= TAB 2: BUSINESS DASHBOARD ================= */}
        {activeTab === 'dashboard' && (
          <div className="merchant-card-form fade-in">
            <h2 className="form-section-title">📊 สถิติและการเข้าชมสถานที่ของคุณ</h2>
            <p className="form-section-desc">
              ตรวจสอบยอดผู้เข้าชมภาพเสมือนจริง และจำนวนครั้งที่นักท่องเที่ยวนำร้านของคุณไปจัดลงในทริป
            </p>

            <div className="admin-stats-grid" style={{ marginTop: '20px' }}>
              <div className="admin-stat-card">
                <div className="stat-card-icon" style={{ background: '#e0e7ff', color: '#3730a3' }}>👁️</div>
                <div className="stat-card-info">
                  <span className="stat-label">ยอดชมภาพ VR 360°</span>
                  <h3 className="stat-value">{merchantStats.vrViews} <span className="stat-unit">ครั้ง</span></h3>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="stat-card-icon" style={{ background: '#dcfce7', color: '#166534' }}>🗺️</div>
                <div className="stat-card-info">
                  <span className="stat-label">เพิ่มลงแผนการเดินทาง</span>
                  <h3 className="stat-value">{merchantStats.tripAdds} <span className="stat-unit">ทริป</span></h3>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="stat-card-icon" style={{ background: '#fef3c7', color: '#92400e' }}>⭐</div>
                <div className="stat-card-info">
                  <span className="stat-label">คะแนนรีวิวเฉลี่ย</span>
                  <h3 className="stat-value" style={{ color: '#d97706' }}>{merchantStats.avgRating} <span className="stat-unit">/ 5.0</span></h3>
                </div>
              </div>

              <div className="admin-stat-card">
                <div className="stat-card-icon" style={{ background: '#f3e8ff', color: '#6b21a8' }}>📈</div>
                <div className="stat-card-info">
                  <span className="stat-label">การเติบโตรายสัปดาห์</span>
                  <h3 className="stat-value" style={{ color: '#059669' }}>{merchantStats.weeklyGrowth}</h3>
                </div>
              </div>
            </div>

            <div className="merchant-recent-reviews-box" style={{ marginTop: '24px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0' }}>💬 รีวิวล่าสุดจากนักท่องเที่ยว</h3>
              <div className="review-item-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <b>คุณ มาทินี โรยนรินทร์</b>
                  <span style={{ color: '#f59e0b' }}>⭐⭐⭐⭐⭐ 5.0</span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  "กาแฟอร่อยมาก บรรยากาศริมหาดถ่ายรูปสวยสุดๆ ระบบ AI แนะนำได้ตรงใจมากค่ะ"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ================= TAB 3: VR ASSETS UPLOAD ================= */}
        {activeTab === 'vr-assets' && (
          <div className="merchant-card-form fade-in">
            <h2 className="form-section-title">🕶️ อัปโหลดสื่อและภาพเสมือนจริง VR 360°</h2>
            <p className="form-section-desc">
              อัปโหลดภาพพาโนรามาแบบ Equirectangular อัตราส่วน 2:1 เพื่อสร้างประสบการณ์เสมือนจริง 360 องศาให้นักท่องเที่ยว
            </p>

            <div className="vr-upload-dropzone">
              <span style={{ fontSize: '48px' }}>📸</span>
              <h4 style={{ margin: '10px 0 4px 0', fontSize: '16px' }}>ลากไฟล์ภาพ 360° มาวางที่นี่ หรือคลิกเพื่อเลือกไฟล์</h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: '#64748b' }}>
                รองรับไฟล์ JPG, PNG ความละเอียดขั้นต่ำ 4096 x 2048 พิกเซล
              </p>
              <button
                type="button"
                className="admin-tab-btn active"
                style={{ marginTop: '16px' }}
                onClick={() => alert('เลือกไฟล์ภาพ 360° จากอุปกรณ์ของคุณ')}
              >
                📁 เลือกไฟล์จากคอมพิวเตอร์
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
