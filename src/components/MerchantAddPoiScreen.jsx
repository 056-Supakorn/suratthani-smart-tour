import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../apiConfig';
import ThemeToggleBtn from './ThemeToggleBtn';

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
  const ownerEmail = localStorage.getItem('userEmail') || '';
  const ownerName = localStorage.getItem('userName') || '';

  const [activeTab, setActiveTab] = useState('manage-poi'); // 'manage-poi' | 'dashboard' | 'vr-assets'
  const [editingPlaceId, setEditingPlaceId] = useState(null);
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
  const [price, setPrice] = useState('');
  const [lat, setLat] = useState('9.5356');
  const [lng, setLng] = useState('99.9356');
  const [imageUrl, setImageUrl] = useState('');
  const [imageMode, setImageMode] = useState('url'); // 'url' | 'upload'
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [vrImageUrl, setVrImageUrl] = useState('');
  const [vrMode, setVrMode] = useState('preset'); // 'preset' | 'upload'
  const [isUploadingVr, setIsUploadingVr] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [savedAction, setSavedAction] = useState('create'); // 'create' | 'edit'

  const [myPlaces, setMyPlaces] = useState([]);
  const [isLoadingMyPlaces, setIsLoadingMyPlaces] = useState(true);
  const [expandedPlaceId, setExpandedPlaceId] = useState(null);

  const latestSubmission = myPlaces[0] || null;
  const myStatus = editingPlaceId ? 'pending' : (latestSubmission ? latestSubmission.status : 'none');
  const myRejectReason = latestSubmission ? latestSubmission.rejectReason || '' : '';

  const fetchMyPlaces = async () => {
    if (!ownerEmail) return;
    setIsLoadingMyPlaces(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/merchant/places`, {
        params: { owner_email: ownerEmail },
      });
      if (response.data.status === 'success') {
        setMyPlaces(response.data.places);
      }
    } catch (error) {
      // ignore - list simply stays empty, banner falls back to default pending copy
    } finally {
      setIsLoadingMyPlaces(false);
    }
  };

  useEffect(() => {
    fetchMyPlaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await axios.post(`${API_BASE_URL}/merchant/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (response.data.status === 'success') {
      return `${API_BASE_URL}${response.data.url}`;
    }
    throw new Error(response.data.message || 'อัปโหลดไฟล์ไม่สำเร็จ');
  };

  const handleImageFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      setImageUrl(await uploadFile(file));
    } catch (err) {
      alert(err.message || 'อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleVrFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingVr(true);
    try {
      setVrImageUrl(await uploadFile(file));
    } catch (err) {
      alert(err.message || 'อัปโหลดไฟล์ VR ไม่สำเร็จ กรุณาลองใหม่');
    } finally {
      setIsUploadingVr(false);
    }
  };

  // Real analytics aggregated from this merchant's own submitted places
  const totalVrViews = myPlaces.reduce((sum, p) => sum + (p.vrViews || 0), 0);
  const totalTripAdds = myPlaces.reduce((sum, p) => sum + (p.tripAdds || 0), 0);
  const totalRatingSum = myPlaces.reduce((sum, p) => sum + (p.ratingSum || 0), 0);
  const totalRatingCount = myPlaces.reduce((sum, p) => sum + (p.ratingCount || 0), 0);
  const approvedPlacesCount = myPlaces.filter((p) => p.status === 'approved').length;
  const merchantStats = {
    vrViews: totalVrViews,
    tripAdds: totalTripAdds,
    avgRating: totalRatingCount > 0 ? (totalRatingSum / totalRatingCount).toFixed(1) : '-',
    totalReviews: totalRatingCount,
    approvedPlaces: approvedPlacesCount,
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
      const finalImage = imageUrl || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80';
      const payload = {
        ownerEmail,
        ownerName,
        businessName: placeName.trim(),
        businessType: businessTypeInitial,
        businessLicense: userData.businessLicense || '',
        businessPhone: userData.businessPhone || '',
        name: placeName.trim(),
        tag: tag,
        location: district,
        travelTime: travelTime,
        price: price.trim(),
        description: description.trim(),
        lat: parseFloat(lat) || 9.5356,
        lng: parseFloat(lng) || 99.9356,
        image: finalImage,
        // no VR chosen -> fall back to the storefront photo itself
        vr_image: vrImageUrl || finalImage,
      };

      const response = editingPlaceId
        ? await axios.put(`${API_BASE_URL}/merchant/places/${editingPlaceId}`, payload)
        : await axios.post(`${API_BASE_URL}/merchant/places`, payload);

      if (response.data.status === 'success') {
        setSavedAction(editingPlaceId ? 'edit' : 'create');
        setSavedSuccess(true);
        setEditingPlaceId(null);
        await fetchMyPlaces();
      } else {
        alert(response.data.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    } catch (err) {
      alert('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่ภายหลัง');
    } finally {
      setIsSaving(false);
    }
  };

  const startEditPlace = (place) => {
    setEditingPlaceId(place.id);
    setPlaceName(place.name || '');
    setTag(place.tag || 'คาเฟ่');
    setDistrict(place.location || 'อำเภอเกาะสมุย');
    setDescription(place.description || '');
    setTravelTime(place.travelTime || '');
    setPrice(place.price || '');
    setLat(String(place.lat ?? '9.5356'));
    setLng(String(place.lng ?? '99.9356'));
    setImageUrl(place.image || '');
    setImageMode('url');
    setVrImageUrl(place.vr_image && place.vr_image !== place.image ? place.vr_image : '');
    setVrMode('preset');
    setSavedSuccess(false);
    setIsSaving(false);
    setActiveTab('manage-poi');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEditPlace = () => {
    setEditingPlaceId(null);
    setPlaceName(businessNameInitial);
    setTag('คาเฟ่');
    setDistrict('อำเภอเกาะสมุย');
    setDescription('');
    setTravelTime('08:30 - 20:00 น.');
    setPrice('');
    setLat('9.5356');
    setLng('99.9356');
    setImageUrl('');
    setImageMode('url');
    setVrImageUrl('');
    setVrMode('preset');
    setIsSaving(false);
  };

  const handleDeletePlace = async (place) => {
    if (!window.confirm(`ต้องการลบ "${place.name}" ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`)) return;
    try {
      const response = await axios.delete(`${API_BASE_URL}/merchant/places/${place.id}`, {
        params: { owner_email: ownerEmail },
      });
      if (response.data.status === 'success') {
        if (editingPlaceId === place.id) cancelEditPlace();
        await fetchMyPlaces();
      } else {
        alert(response.data.message || 'ลบไม่สำเร็จ');
      }
    } catch (err) {
      alert('ไม่สามารถลบรายการนี้ได้ กรุณาลองใหม่ภายหลัง');
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
          <ThemeToggleBtn theme={theme} toggleTheme={toggleTheme} />
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
            {myStatus === 'approved' ? (
              <span className="status-pill status-approved">✓ อนุมัติแล้ว (Approved)</span>
            ) : myStatus === 'rejected' ? (
              <span className="status-pill status-rejected">✕ ถูกปฏิเสธ (Rejected)</span>
            ) : myStatus === 'none' ? (
              <span className="status-badge-pending">ยังไม่ได้ส่งข้อมูลสถานที่</span>
            ) : (
              <span className="status-badge-pending">
                <span className="pulse-dot" /> รอการอนุมัติ (Pending Verification)
              </span>
            )}
            <p className="status-banner-desc">
              {myStatus === 'approved' && (
                <>ร้าน <b>"{latestSubmission?.name}"</b> ผ่านการตรวจสอบแล้ว และแสดงผลบนหน้าแรกให้นักท่องเที่ยวเห็นแล้วครับ</>
              )}
              {myStatus === 'rejected' && (
                <>คำขอของร้าน <b>"{latestSubmission?.name}"</b> ถูกปฏิเสธ เหตุผล: {myRejectReason || 'ไม่ระบุ'} กรุณาแก้ไขข้อมูลแล้วส่งใหม่อีกครั้ง</>
              )}
              {myStatus === 'none' && (
                <>กรอกแบบฟอร์มด้านล่างเพื่อส่งข้อมูลสถานที่แรกของคุณให้ผู้ดูแลระบบตรวจสอบ</>
              )}
              {myStatus === 'pending' && (
                <>ระบบได้รับข้อมูลร้าน <b>"{latestSubmission?.name || placeName}"</b> แล้ว
                ทีมงานผู้ดูแลระบบกำลังตรวจสอบข้อมูลเพื่อเปิดใช้งานการแสดงผลอย่างเป็นทางการ</>
              )}
            </p>
          </div>
          <div className="status-banner-meta">
            <span>เลขทะเบียน: {userData.businessLicense || '-'}</span>
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
                  <h4 className="success-title">
                    {savedAction === 'edit' ? 'บันทึกการแก้ไขเรียบร้อยแล้ว!' : 'ส่งข้อมูลสถานที่เรียบร้อยแล้ว!'}
                  </h4>
                  <p className="success-desc">
                    {savedAction === 'edit'
                      ? 'ข้อมูลที่แก้ไขถูกส่งให้ผู้ดูแลระบบตรวจสอบใหม่อีกครั้งแล้ว'
                      : 'ข้อมูลสถานที่ของคุณถูกส่งให้ผู้ดูแลระบบตรวจสอบแล้ว เมื่อได้รับการอนุมัติจะแสดงผลให้นักท่องเที่ยวเห็นทันที'}
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

                {/* Field 5: Entrance Price */}
                <div className="form-field-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-input-label">ค่าเข้าสถานที่ (โดยประมาณ)</label>
                  <input
                    type="text"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="เช่น 50 บาท/คน (เว้นว่างไว้ = ฟรี)"
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
                  <label className="form-input-label">รูปภาพหน้าร้าน / ปกสถานที่</label>
                  <div className="mode-toggle-row">
                    <button
                      type="button"
                      className={`mode-toggle-btn ${imageMode === 'url' ? 'active' : ''}`}
                      onClick={() => setImageMode('url')}
                    >
                      🔗 ใส่ URL
                    </button>
                    <button
                      type="button"
                      className={`mode-toggle-btn ${imageMode === 'upload' ? 'active' : ''}`}
                      onClick={() => setImageMode('upload')}
                    >
                      📁 อัปโหลดจากเครื่อง
                    </button>
                  </div>
                  {imageMode === 'url' ? (
                    <input
                      key="image-url-input"
                      type="url"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      placeholder="https://... (เว้นว่างไว้จะใช้ภาพอัตโนมัติ)"
                      className="merchant-text-input"
                    />
                  ) : (
                    <input
                      key="image-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      disabled={isUploadingImage}
                      className="merchant-text-input"
                    />
                  )}
                  {isUploadingImage && <p className="upload-status-hint">⏳ กำลังอัปโหลด...</p>}
                  {imageUrl && (
                    <img src={imageUrl} alt="ตัวอย่างรูปภาพหน้าร้าน" className="image-preview-thumb" />
                  )}
                </div>

                <div className="form-field-group">
                  <label className="form-input-label">ไฟล์ภาพเสมือนจริง VR 360° (ไม่บังคับ)</label>
                  <div className="mode-toggle-row">
                    <button
                      type="button"
                      className={`mode-toggle-btn ${vrMode === 'preset' ? 'active' : ''}`}
                      onClick={() => setVrMode('preset')}
                    >
                      🖼️ เลือกจากตัวอย่าง
                    </button>
                    <button
                      type="button"
                      className={`mode-toggle-btn ${vrMode === 'upload' ? 'active' : ''}`}
                      onClick={() => setVrMode('upload')}
                    >
                      📁 อัปโหลดของคุณเอง
                    </button>
                  </div>
                  {vrMode === 'preset' ? (
                    <select
                      key="vr-preset-select"
                      value={vrImageUrl}
                      onChange={(e) => setVrImageUrl(e.target.value)}
                      className="merchant-select-input"
                    >
                      <option value="">-- ไม่ระบุ (ใช้ภาพหน้าร้านแทน) --</option>
                      <option value="/vr_images/clocktower.jpg">🌅 วิวพาโนรามา หอนาฬิกาเมืองสุราษฎร์ธานี</option>
                      <option value="/vr_images/brige.jpg">🌉 วิวพาโนรามา สะพานศรีสุราษฎร์ 360°</option>
                    </select>
                  ) : (
                    <input
                      key="vr-upload-input"
                      type="file"
                      accept="image/*"
                      onChange={handleVrFileChange}
                      disabled={isUploadingVr}
                      className="merchant-text-input"
                    />
                  )}
                  {isUploadingVr && <p className="upload-status-hint">⏳ กำลังอัปโหลด...</p>}
                  <p className="upload-status-hint">หากไม่ระบุ ระบบจะใช้ภาพหน้าร้านของคุณแสดงแทนอัตโนมัติ</p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="form-action-footer" style={{ marginTop: '24px', gap: '10px' }}>
                <button
                  type="submit"
                  className="merchant-save-btn"
                  disabled={isSaving || isUploadingImage || isUploadingVr}
                >
                  {isSaving
                    ? 'กำลังบันทึกข้อมูล...'
                    : editingPlaceId
                    ? '💾 บันทึกการแก้ไข'
                    : '💾 บันทึกข้อมูลและอัปเดตสถานที่'}
                </button>
                {editingPlaceId && (
                  <button type="button" className="cancel-edit-btn" onClick={cancelEditPlace}>
                    ยกเลิกการแก้ไข
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* ================= TAB 1b: MY PLACES LIST ================= */}
        {activeTab === 'manage-poi' && (
          <div className="merchant-card-form fade-in">
            <h2 className="form-section-title">📋 รายการสถานที่ของคุณ</h2>
            <p className="form-section-desc">
              ตรวจสอบสถานะคำขอ ดูรายละเอียด แก้ไข หรือลบสถานที่ที่คุณเพิ่มไว้
            </p>

            {isLoadingMyPlaces ? (
              <p className="upload-status-hint">กำลังโหลดข้อมูล...</p>
            ) : myPlaces.length === 0 ? (
              <p className="upload-status-hint">คุณยังไม่ได้เพิ่มสถานที่ใดๆ</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {myPlaces.map((place) => (
                  <div key={place.id} className="review-item-card my-place-card">
                    <div className="my-place-card-header">
                      <div>
                        <h4 className="my-place-card-title">{place.name}</h4>
                        <div className="my-place-card-meta">
                          <span className="business-type-tag">{place.tag}</span>
                          {place.status === 'pending' && (
                            <span className="status-pill status-pending">
                              <span className="dot-pulse" /> รอการอนุมัติ
                            </span>
                          )}
                          {place.status === 'approved' && (
                            <span className="status-pill status-approved">✓ อนุมัติแล้ว</span>
                          )}
                          {place.status === 'rejected' && (
                            <span className="status-pill status-rejected">✕ ถูกปฏิเสธ</span>
                          )}
                        </div>
                      </div>
                      <div className="action-buttons-cell">
                        <button
                          type="button"
                          className="btn-recheck-action"
                          onClick={() => setExpandedPlaceId(expandedPlaceId === place.id ? null : place.id)}
                        >
                          {expandedPlaceId === place.id ? '🔼 ซ่อนรายละเอียด' : '🔽 ดูรายละเอียด'}
                        </button>
                        <button type="button" className="btn-approve-action" onClick={() => startEditPlace(place)}>
                          ✏️ แก้ไข
                        </button>
                        <button type="button" className="btn-reject-action" onClick={() => handleDeletePlace(place)}>
                          🗑️ ลบ
                        </button>
                      </div>
                    </div>

                    {expandedPlaceId === place.id && (
                      <div className="my-place-card-details">
                        <p><b>อำเภอ:</b> {place.location || '-'}</p>
                        <p><b>เวลาทำการ:</b> {place.travelTime || '-'}</p>
                        <p><b>ค่าเข้าสถานที่:</b> {place.price ? place.price : 'ฟรี'}</p>
                        <p><b>รายละเอียด:</b> {place.description || '-'}</p>
                        <p><b>พิกัด GPS:</b> {place.lat}, {place.lng}</p>
                        <p><b>เวลาที่ส่งข้อมูล:</b> {place.registeredAt}</p>
                        {place.status === 'rejected' && (
                          <p><b>เหตุผลที่ถูกปฏิเสธ:</b> {place.rejectReason || 'ไม่ระบุ'}</p>
                        )}
                        {place.image && (
                          <img src={place.image} alt={place.name} className="image-preview-thumb" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
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
                <div className="stat-card-icon" style={{ background: '#f3e8ff', color: '#6b21a8' }}>✅</div>
                <div className="stat-card-info">
                  <span className="stat-label">สถานที่ที่อนุมัติแล้ว</span>
                  <h3 className="stat-value" style={{ color: '#059669' }}>{merchantStats.approvedPlaces} <span className="stat-unit">แห่ง</span></h3>
                </div>
              </div>
            </div>

            <p className="upload-status-hint" style={{ marginTop: '20px' }}>
              ตัวเลขทั้งหมดคำนวณจากสถานที่ที่คุณส่งเข้าระบบทั้ง {myPlaces.length} รายการ อัปเดตทันทีเมื่อมีคนชม VR, เพิ่มลงทริป หรือให้คะแนน
            </p>
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
