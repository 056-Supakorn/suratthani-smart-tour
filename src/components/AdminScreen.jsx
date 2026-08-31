import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, getAdminHeaders } from '../apiConfig';
import ThemeToggleBtn from './ThemeToggleBtn';

export default function AdminScreen({
  theme,
  toggleTheme,
  onLogout,
  onViewAsTourist,
}) {
  const [activeTab, setActiveTab] = useState('moderation'); // 'moderation' | 'pois' | 'vr-assets' | 'users' | 'dashboard'

  const [merchants, setMerchants] = useState([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState(true);
  const [merchantsError, setMerchantsError] = useState('');
  const [needsReauth, setNeedsReauth] = useState(false);
  const [expandedMerchantId, setExpandedMerchantId] = useState(null);

  // ---- Manage POIs (curated attractions database) ----
  const emptyPoiForm = {
    name: '',
    tag: 'ธรรมชาติ',
    location: '',
    travelTime: '',
    price: '',
    description: '',
    lat: '',
    lng: '',
    image: '',
    vr_image: '',
  };
  const [places, setPlaces] = useState([]);
  const [isLoadingPlaces, setIsLoadingPlaces] = useState(true);
  const [placesError, setPlacesError] = useState('');
  const [expandedPlaceId, setExpandedPlaceId] = useState(null);
  const [showPlaceForm, setShowPlaceForm] = useState(false);
  const [editingPlaceId, setEditingPlaceId] = useState(null);
  const [poiForm, setPoiForm] = useState(emptyPoiForm);
  const [isSavingPlace, setIsSavingPlace] = useState(false);

  const loadPlaces = async () => {
    setIsLoadingPlaces(true);
    setPlacesError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/places`, {
        headers: getAdminHeaders(),
      });
      if (response.data.status === 'success') {
        setPlaces(response.data.places);
      }
    } catch (error) {
      setPlacesError('ไม่สามารถโหลดฐานข้อมูลสถานที่ได้ กรุณาตรวจสอบการเชื่อมต่อหรือสิทธิ์ผู้ดูแลระบบ');
    } finally {
      setIsLoadingPlaces(false);
    }
  };

  const openAddPlaceForm = () => {
    setEditingPlaceId(null);
    setPoiForm(emptyPoiForm);
    setIsSavingPlace(false);
    setShowPlaceForm(true);
  };

  const openEditPlaceForm = (place) => {
    setEditingPlaceId(place.id);
    setPoiForm({
      name: place.name || '',
      tag: place.tag || 'ธรรมชาติ',
      location: place.location || '',
      travelTime: place.travelTime || '',
      price: place.price || '',
      description: place.description || '',
      lat: String(place.lat ?? ''),
      lng: String(place.lng ?? ''),
      image: place.image || '',
      vr_image: place.vr_image || '',
    });
    setIsSavingPlace(false);
    setShowPlaceForm(true);
  };

  const cancelPlaceForm = () => {
    setShowPlaceForm(false);
    setEditingPlaceId(null);
    setPoiForm(emptyPoiForm);
  };

  const handleSavePlace = async (e) => {
    e.preventDefault();
    if (!poiForm.name.trim()) {
      alert('กรุณากรอกชื่อสถานที่');
      return;
    }
    setIsSavingPlace(true);
    try {
      const payload = {
        ...poiForm,
        name: poiForm.name.trim(),
        lat: parseFloat(poiForm.lat) || 0,
        lng: parseFloat(poiForm.lng) || 0,
      };
      const response = editingPlaceId
        ? await axios.put(`${API_BASE_URL}/admin/places/${editingPlaceId}`, payload, {
            headers: getAdminHeaders(),
          })
        : await axios.post(`${API_BASE_URL}/admin/places`, payload, {
            headers: getAdminHeaders(),
          });
      if (response.data.status === 'success') {
        cancelPlaceForm();
        await loadPlaces();
      } else {
        alert(response.data.message || 'บันทึกไม่สำเร็จ');
      }
    } catch (error) {
      alert('ไม่สามารถบันทึกข้อมูลสถานที่ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSavingPlace(false);
    }
  };

  useEffect(() => {
    loadPlaces();
  }, []);

  const loadMerchants = async () => {
    setIsLoadingMerchants(true);
    setMerchantsError('');
    setNeedsReauth(false);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/merchant_places`, {
        headers: getAdminHeaders(),
      });
      if (response.data.status === 'success') {
        setMerchants(response.data.places);
      }
    } catch (error) {
      if (error.response && error.response.status === 401) {
        setNeedsReauth(true);
        setMerchantsError('เซสชันผู้ดูแลระบบหมดอายุหรือยังไม่ได้ยืนยันตัวตนในเบราว์เซอร์นี้ กรุณาเข้าสู่ระบบผู้ดูแลระบบอีกครั้ง');
      } else {
        setMerchantsError('ไม่สามารถโหลดรายชื่อผู้ประกอบการได้ กรุณาตรวจสอบการเชื่อมต่อ');
      }
    } finally {
      setIsLoadingMerchants(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, []);

  const updateMerchantStatus = async (id, status, reason = '') => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/merchant_places/${id}/status`,
        { status, reason },
        { headers: getAdminHeaders() }
      );
      if (response.data.status === 'success') {
        setMerchants((prev) =>
          prev.map((m) => (m.id === id ? { ...m, status, rejectReason: reason } : m))
        );
      } else {
        alert(response.data.message || 'เกิดข้อผิดพลาดในการอัปเดตสถานะ');
      }
    } catch (error) {
      alert('ไม่สามารถอัปเดตสถานะได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const [usersList, setUsersList] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    setUsersError('');
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/users`, {
        headers: getAdminHeaders(),
      });
      if (response.data.status === 'success') {
        setUsersList(response.data.users);
      }
    } catch (error) {
      setUsersError('ไม่สามารถโหลดรายชื่อผู้ใช้งานได้ กรุณาตรวจสอบการเชื่อมต่อหรือสิทธิ์ผู้ดูแลระบบ');
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleApprove = async (id) => {
    await updateMerchantStatus(id, 'approved');
    alert('✅ อนุมัติผู้ประกอบการเรียบร้อยแล้ว! ข้อมูลร้านจะแสดงผลในระบบแนะนำทันที');
  };

  const handleReject = async (id) => {
    const reason = prompt('กรุณาระบุเหตุผลในการปฏิเสธ (เช่น เอกสารไม่ชัดเจน):', 'เอกสารใบอนุญาตไม่ครบถ้วน');
    if (reason !== null) {
      await updateMerchantStatus(id, 'rejected', reason);
      alert('❌ ปฏิเสธคำขอเรียบร้อยแล้ว');
    }
  };

  const toggleUserStatus = async (email, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'suspended' : 'active';
    try {
      const response = await axios.post(
        `${API_BASE_URL}/admin/users/${encodeURIComponent(email)}/status`,
        { status: newStatus },
        { headers: getAdminHeaders() }
      );
      if (response.data.status === 'success') {
        setUsersList((prev) =>
          prev.map((u) => (u.email === email ? { ...u, status: newStatus } : u))
        );
      } else {
        alert(response.data.message || 'เกิดข้อผิดพลาด');
      }
    } catch (error) {
      alert('ไม่สามารถอัปเดตสถานะผู้ใช้งานได้ กรุณาลองใหม่');
    }
  };

  const touristCount = usersList.filter((u) => u.role === 'tourist').length;

  const pendingCount = merchants.filter((m) => m.status === 'pending').length;
  const approvedCount = merchants.filter((m) => m.status === 'approved').length;

  return (
    <div className={`admin-portal-wrapper ${theme}-theme fade-in`}>
      {/* ================= ADMIN TOP BAR ================= */}
      <header className="admin-header-bar">
        <div className="admin-header-brand">
          <div className="admin-shield-icon">🛡️</div>
          <div>
            <h1 className="admin-header-title">ระบบควบคุมส่วนกลางสำหรับผู้ดูแลระบบ (Admin Center)</h1>
            <p className="admin-header-sub">Surat Thani Smart Tour - Platform Governance & Moderation</p>
          </div>
        </div>

        <div className="admin-header-actions">
          <ThemeToggleBtn theme={theme} toggleTheme={toggleTheme} />
          <button
            type="button"
            className="admin-tourist-view-btn"
            onClick={onViewAsTourist}
          >
            🎒 สลับไปหน้าบ้าน (มุมมองนักท่องเที่ยว)
          </button>
          <button
            type="button"
            className="admin-logout-btn"
            onClick={onLogout}
          >
            🚪 ออกจากระบบ
          </button>
        </div>
      </header>

      <main className="admin-main-content">
        {/* ================= STATS CARDS ROW ================= */}
        <section className="admin-stats-grid">
          <div className="admin-stat-card">
            <div className="stat-card-icon" style={{ background: '#dcfce7', color: '#166534' }}>👥</div>
            <div className="stat-card-info">
              <span className="stat-label">นักท่องเที่ยวในระบบ</span>
              <h3 className="stat-value">{touristCount} <span className="stat-unit">คน</span></h3>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="stat-card-icon" style={{ background: '#e0e7ff', color: '#3730a3' }}>🏪</div>
            <div className="stat-card-info">
              <span className="stat-label">ผู้ประกอบการทั้งหมด</span>
              <h3 className="stat-value">{merchants.length} <span className="stat-unit">แห่ง</span></h3>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="stat-card-icon" style={{ background: '#fef3c7', color: '#92400e' }}>⏳</div>
            <div className="stat-card-info">
              <span className="stat-label">รอการอนุมัติร้านค้า</span>
              <h3 className="stat-value" style={{ color: pendingCount > 0 ? '#d97706' : '#166534' }}>
                {pendingCount} <span className="stat-unit">คำขอ</span>
              </h3>
            </div>
          </div>

          <div className="admin-stat-card">
            <div className="stat-card-icon" style={{ background: '#f3e8ff', color: '#6b21a8' }}>📍</div>
            <div className="stat-card-info">
              <span className="stat-label">สถานที่ท่องเที่ยว & POI</span>
              <h3 className="stat-value">{places.length} <span className="stat-unit">แห่ง</span></h3>
            </div>
          </div>
        </section>

        {/* ================= ADMIN TABS (5 RBAC MODULES) ================= */}
        <div className="admin-tabs-nav">
          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'moderation' ? 'active' : ''}`}
            onClick={() => setActiveTab('moderation')}
          >
            <span>🛡️ 1. ตรวจสอบและอนุมัติร้านค้า (Moderation)</span>
            {pendingCount > 0 && <span className="tab-pending-count">{pendingCount}</span>}
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'pois' ? 'active' : ''}`}
            onClick={() => setActiveTab('pois')}
          >
            <span>📍 2. จัดการข้อมูลสถานที่ (Manage POIs)</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'vr-assets' ? 'active' : ''}`}
            onClick={() => setActiveTab('vr-assets')}
          >
            <span>🕶️ 3. จัดการทรัพยากร VR & Hotspots</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <span>👥 4. การจัดการผู้ใช้งาน (User Management)</span>
          </button>

          <button
            type="button"
            className={`admin-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            <span>📊 5. รายงานสถิติและ AI Dashboard</span>
          </button>
        </div>

        {/* ================= TAB 1: MODERATION ================= */}
        {activeTab === 'moderation' && (
          <section className="admin-table-card fade-in">
            <div className="table-header-row">
              <div>
                <h2 className="table-title">รายชื่อผู้ประกอบการที่ยื่นขอเปิดร้านค้า</h2>
                <p className="table-desc">ตรวจสอบเอกสารทะเบียนพาณิชย์และภาพ VR ก่อนอนุมัติ (Approve) เพื่อป้องกันร้านค้าปลอม</p>
              </div>
              <div className="table-filter-pills">
                <span className="filter-badge approved">อนุมัติแล้ว: {approvedCount}</span>
                <span className="filter-badge pending">รอตรวจสอบ: {pendingCount}</span>
                <button type="button" className="btn-recheck-action" onClick={loadMerchants}>
                  🔄 รีเฟรช
                </button>
              </div>
            </div>

            {merchantsError && (
              <div style={{ margin: '0 0 12px 0' }}>
                <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 8px 0' }}>{merchantsError}</p>
                {needsReauth && (
                  <button type="button" className="btn-approve-action" onClick={onLogout}>
                    🔑 เข้าสู่ระบบผู้ดูแลระบบอีกครั้ง
                  </button>
                )}
              </div>
            )}

            {isLoadingMerchants ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>กำลังโหลดข้อมูล...</p>
            ) : merchants.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>ยังไม่มีคำขอเปิดร้านค้าเข้ามาในระบบ</p>
            ) : (
            <div className="admin-table-container">
              <table className="admin-custom-table">
                <thead>
                  <tr>
                    <th>สถานประกอบการ / ชื่อร้าน</th>
                    <th>เจ้าของร้าน / ผู้ติดต่อ</th>
                    <th>ประเภทธุรกิจ</th>
                    <th>เลขทะเบียน / ใบอนุญาต</th>
                    <th>เวลาที่ลงทะเบียน</th>
                    <th>สถานะ</th>
                    <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {merchants.map((merchant) => (
                    <React.Fragment key={merchant.id}>
                    <tr>
                      <td>
                        <div className="merchant-name-cell">
                          <span className="merchant-shop-name">{merchant.businessName || merchant.name}</span>
                          <span className="merchant-shop-phone">📞 {merchant.businessPhone || '-'}</span>
                        </div>
                      </td>
                      <td>
                        <div className="merchant-owner-cell">
                          <span className="owner-name">{merchant.ownerName || '-'}</span>
                          <span className="owner-email">{merchant.ownerEmail}</span>
                        </div>
                      </td>
                      <td>
                        <span className="business-type-tag">{merchant.businessType || merchant.tag}</span>
                      </td>
                      <td>
                        <span className="license-id">{merchant.businessLicense || 'ไม่ระบุ'}</span>
                      </td>
                      <td>
                        <span className="registered-time">{merchant.registeredAt}</span>
                      </td>
                      <td>
                        {merchant.status === 'pending' && (
                          <span className="status-pill status-pending">
                            <span className="dot-pulse" /> รอการอนุมัติ
                          </span>
                        )}
                        {merchant.status === 'approved' && (
                          <span className="status-pill status-approved">
                            ✓ อนุมัติแล้ว
                          </span>
                        )}
                        {merchant.status === 'rejected' && (
                          <span className="status-pill status-rejected" title={merchant.rejectReason}>
                            ✕ ปฏิเสธ
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-buttons-cell">
                          <button
                            type="button"
                            className="btn-recheck-action"
                            onClick={() =>
                              setExpandedMerchantId(expandedMerchantId === merchant.id ? null : merchant.id)
                            }
                          >
                            {expandedMerchantId === merchant.id ? '🔼 ซ่อน' : '🔽 ดูรายละเอียด'}
                          </button>
                          {merchant.status === 'pending' ? (
                            <>
                              <button
                                type="button"
                                className="btn-approve-action"
                                onClick={() => handleApprove(merchant.id)}
                                title="อนุมัติร้านค้านี้"
                              >
                                ✅ อนุมัติ
                              </button>
                              <button
                                type="button"
                                className="btn-reject-action"
                                onClick={() => handleReject(merchant.id)}
                                title="ปฏิเสธคำขอ"
                              >
                                ❌ ปฏิเสธ
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className="btn-recheck-action"
                              onClick={() =>
                                updateMerchantStatus(
                                  merchant.id,
                                  merchant.status === 'approved' ? 'pending' : 'approved'
                                )
                              }
                            >
                              🔄 สลับสถานะ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expandedMerchantId === merchant.id && (
                      <tr>
                        <td colSpan={7}>
                          <div className="my-place-card-details">
                            <p><b>ชื่อสถานที่:</b> {merchant.name}</p>
                            <p><b>หมวดหมู่:</b> {merchant.tag}</p>
                            <p><b>อำเภอ:</b> {merchant.location || '-'}</p>
                            <p><b>เวลาทำการ:</b> {merchant.travelTime || '-'}</p>
                            <p><b>ค่าเข้าสถานที่:</b> {merchant.price ? merchant.price : 'ฟรี'}</p>
                            <p><b>รายละเอียด:</b> {merchant.description || '-'}</p>
                            <p><b>พิกัด GPS:</b> {merchant.lat}, {merchant.lng}</p>
                            <p><b>เบอร์โทรศัพท์:</b> {merchant.businessPhone || '-'}</p>
                            {merchant.status === 'rejected' && (
                              <p><b>เหตุผลที่ถูกปฏิเสธ:</b> {merchant.rejectReason || 'ไม่ระบุ'}</p>
                            )}
                            {merchant.image && (
                              <img src={merchant.image} alt={merchant.name} className="image-preview-thumb" />
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </section>
        )}

        {/* ================= TAB 2: MANAGE POIS ================= */}
        {activeTab === 'pois' && (
          <section className="admin-table-card fade-in">
            <div className="table-header-row">
              <div>
                <h2 className="table-title">ฐานข้อมูลสถานที่ท่องเที่ยวทั้งหมดในระบบ ({places.length} แห่ง)</h2>
                <p className="table-desc">เพิ่ม, แก้ไข หรือดูรายละเอียดสถานที่ท่องเที่ยวในระบบ</p>
              </div>
              <button type="button" className="btn-add-new-place" onClick={openAddPlaceForm}>
                ➕ เพิ่มสถานที่ใหม่ (Add POI)
              </button>
            </div>

            {placesError && (
              <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 12px 0' }}>{placesError}</p>
            )}

            {showPlaceForm && (
              <form onSubmit={handleSavePlace} className="merchant-card-form" style={{ marginBottom: '20px' }}>
                <h3 className="form-section-title" style={{ fontSize: '17px' }}>
                  {editingPlaceId ? '✏️ แก้ไขข้อมูลสถานที่' : '➕ เพิ่มสถานที่ใหม่'}
                </h3>
                <div className="merchant-form-grid" style={{ marginTop: '12px' }}>
                  <div className="form-field-group">
                    <label className="form-input-label">ชื่อสถานที่ *</label>
                    <input
                      type="text"
                      value={poiForm.name}
                      onChange={(e) => setPoiForm({ ...poiForm, name: e.target.value })}
                      className="merchant-text-input"
                      required
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-input-label">หมวดหมู่</label>
                    <select
                      value={poiForm.tag}
                      onChange={(e) => setPoiForm({ ...poiForm, tag: e.target.value })}
                      className="merchant-select-input"
                    >
                      <option value="วัด">⛩️ วัดและศาสนสถาน</option>
                      <option value="ธรรมชาติ">⛰️ ธรรมชาติและจุดชมวิว</option>
                      <option value="ทะเล">🏝️ ทะเลและกิจกรรมทางน้ำ</option>
                      <option value="ชุมชน">🛶 แหล่งท่องเที่ยววิถีชุมชน</option>
                      <option value="คาเฟ่">☕ คาเฟ่และเบเกอรี่</option>
                      <option value="ร้านอาหาร">🍲 ร้านอาหารพื้นบ้าน / ซีฟู้ด</option>
                    </select>
                  </div>
                  <div className="form-field-group">
                    <label className="form-input-label">อำเภอ / ที่ตั้ง</label>
                    <input
                      type="text"
                      value={poiForm.location}
                      onChange={(e) => setPoiForm({ ...poiForm, location: e.target.value })}
                      placeholder="เช่น อ.พนม"
                      className="merchant-text-input"
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-input-label">เวลาทำการ / เวลาเดินทาง</label>
                    <input
                      type="text"
                      value={poiForm.travelTime}
                      onChange={(e) => setPoiForm({ ...poiForm, travelTime: e.target.value })}
                      placeholder="เช่น 1 ชั่วโมง"
                      className="merchant-text-input"
                    />
                  </div>
                  <div className="form-field-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-input-label">ค่าเข้าสถานที่ (โดยประมาณ)</label>
                    <input
                      type="text"
                      value={poiForm.price}
                      onChange={(e) => setPoiForm({ ...poiForm, price: e.target.value })}
                      placeholder="เช่น 50 บาท/คน (เว้นว่างไว้ = ฟรี)"
                      className="merchant-text-input"
                    />
                  </div>
                </div>

                <div className="form-field-group" style={{ marginTop: '16px' }}>
                  <label className="form-input-label">รายละเอียด</label>
                  <textarea
                    rows="3"
                    value={poiForm.description}
                    onChange={(e) => setPoiForm({ ...poiForm, description: e.target.value })}
                    className="merchant-textarea-input"
                  />
                </div>

                <div className="gps-inputs-row" style={{ marginTop: '16px' }}>
                  <div className="form-field-group">
                    <label className="form-input-label">Latitude</label>
                    <input
                      type="text"
                      value={poiForm.lat}
                      onChange={(e) => setPoiForm({ ...poiForm, lat: e.target.value })}
                      className="merchant-text-input"
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-input-label">Longitude</label>
                    <input
                      type="text"
                      value={poiForm.lng}
                      onChange={(e) => setPoiForm({ ...poiForm, lng: e.target.value })}
                      className="merchant-text-input"
                    />
                  </div>
                </div>

                <div className="form-two-col" style={{ marginTop: '16px' }}>
                  <div className="form-field-group">
                    <label className="form-input-label">URL รูปภาพ</label>
                    <input
                      type="text"
                      value={poiForm.image}
                      onChange={(e) => setPoiForm({ ...poiForm, image: e.target.value })}
                      placeholder="https://..."
                      className="merchant-text-input"
                    />
                  </div>
                  <div className="form-field-group">
                    <label className="form-input-label">URL ภาพ VR 360°</label>
                    <input
                      type="text"
                      value={poiForm.vr_image}
                      onChange={(e) => setPoiForm({ ...poiForm, vr_image: e.target.value })}
                      placeholder="/vr_images/... หรือ https://..."
                      className="merchant-text-input"
                    />
                  </div>
                </div>

                <div className="form-action-footer" style={{ marginTop: '24px', gap: '10px' }}>
                  <button type="submit" className="merchant-save-btn" disabled={isSavingPlace}>
                    {isSavingPlace ? 'กำลังบันทึก...' : editingPlaceId ? '💾 บันทึกการแก้ไข' : '💾 เพิ่มสถานที่'}
                  </button>
                  <button type="button" className="cancel-edit-btn" onClick={cancelPlaceForm}>
                    ยกเลิก
                  </button>
                </div>
              </form>
            )}

            {isLoadingPlaces ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>กำลังโหลดข้อมูล...</p>
            ) : (
              <div className="admin-places-quick-list">
                {places.map((place, index) => (
                  <div key={place.id} className="place-item-card" style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="place-num">{String(index + 1).padStart(2, '0')}</span>
                      <div style={{ flex: 1 }}>
                        <h4 className="place-item-title">{place.name}</h4>
                        <p className="place-item-sub">
                          {place.location || '-'} • หมวดหมู่: {place.tag || '-'} • พิกัด: {place.lat}, {place.lng}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="btn-recheck-action"
                        onClick={() => setExpandedPlaceId(expandedPlaceId === place.id ? null : place.id)}
                      >
                        {expandedPlaceId === place.id ? '🔼 ซ่อน' : '🔽 ดูรายละเอียด'}
                      </button>
                      <button type="button" className="btn-approve-action" onClick={() => openEditPlaceForm(place)}>
                        ✏️ แก้ไข
                      </button>
                    </div>
                    {expandedPlaceId === place.id && (
                      <div className="my-place-card-details" style={{ marginTop: '12px' }}>
                        <p><b>ค่าเข้าสถานที่:</b> {place.price ? place.price : 'ฟรี'}</p>
                        <p><b>เวลาทำการ:</b> {place.travelTime || '-'}</p>
                        <p><b>รายละเอียด:</b> {place.description || '-'}</p>
                        {place.image && (
                          <img src={place.image} alt={place.name} className="image-preview-thumb" />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ================= TAB 3: VR ASSETS ================= */}
        {activeTab === 'vr-assets' && (() => {
          const approvedMerchants = merchants.filter((m) => m.status === 'approved');
          const vrEnabledPlaces = [...places, ...approvedMerchants]
            .filter((p) => p.vr_image)
            .sort((a, b) => (b.vrViews || 0) - (a.vrViews || 0));
          const totalVrViews = vrEnabledPlaces.reduce((sum, p) => sum + (p.vrViews || 0), 0);

          return (
            <section className="admin-table-card fade-in">
              <div className="table-header-row">
                <div>
                  <h2 className="table-title">ทรัพยากรภาพเสมือนจริง VR 360° ({vrEnabledPlaces.length} สถานที่)</h2>
                  <p className="table-desc">ยอดชม VR รวมทั้งระบบ: {totalVrViews} ครั้ง • เรียงตามยอดชมมากไปน้อย</p>
                </div>
              </div>

              {vrEnabledPlaces.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b' }}>ยังไม่มีสถานที่ที่เปิดใช้งาน VR 360°</p>
              ) : (
                <div className="admin-places-quick-list">
                  {vrEnabledPlaces.map((place, index) => (
                    <div key={place.id} className="place-item-card">
                      <span className="place-num">{String(index + 1).padStart(2, '0')}</span>
                      <div style={{ flex: 1 }}>
                        <h4 className="place-item-title">{place.name}</h4>
                        <p className="place-item-sub">{place.location || '-'} • หมวดหมู่: {place.tag || '-'}</p>
                      </div>
                      <span className="place-status-active">👁️ {place.vrViews || 0} ครั้ง</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })()}

        {/* ================= TAB 4: USER MANAGEMENT ================= */}
        {activeTab === 'users' && (
          <section className="admin-table-card fade-in">
            <div className="table-header-row">
              <div>
                <h2 className="table-title">การจัดการผู้ใช้งานและสิทธิการเข้าถึง (User Access Management)</h2>
                <p className="table-desc">ตรวจสอบบัญชีผู้ใช้งาน, สิทธิ Role, และระงับบัญชีเมื่อมีคำร้องเรียน</p>
              </div>
            </div>

            {usersError && (
              <p style={{ color: '#dc2626', fontSize: '13px', margin: '0 0 12px 0' }}>{usersError}</p>
            )}

            {isLoadingUsers ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>กำลังโหลดข้อมูล...</p>
            ) : usersList.length === 0 ? (
              <p style={{ fontSize: '13px', color: '#64748b' }}>ยังไม่มีผู้ใช้งานในระบบ</p>
            ) : (
            <div className="admin-table-container">
              <table className="admin-custom-table">
                <thead>
                  <tr>
                    <th>ชื่อผู้ใช้งาน</th>
                    <th>อีเมล</th>
                    <th>บทบาท (Role)</th>
                    <th>การสร้างทริป</th>
                    <th>สถานะบัญชี</th>
                    <th style={{ textAlign: 'center' }}>จัดการสิทธิ</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u) => (
                    <tr key={u.email}>
                      <td><b>{u.name}</b></td>
                      <td>{u.email}</td>
                      <td>
                        <span className="business-type-tag">
                          {u.role === 'tourist' ? '🎒 นักท่องเที่ยว' : '🏪 ผู้ประกอบการ'}
                        </span>
                      </td>
                      <td>{u.tripsCreated || 0} ทริป</td>
                      <td>
                        <span className={`status-pill ${u.status === 'active' ? 'status-approved' : 'status-rejected'}`}>
                          {u.status === 'active' ? 'ปกติ (Active)' : 'ถูกระงับ (Suspended)'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={u.status === 'active' ? 'btn-reject-action' : 'btn-approve-action'}
                          onClick={() => toggleUserStatus(u.email, u.status)}
                        >
                          {u.status === 'active' ? '🚫 ระงับการใช้งาน' : '✓ ปลดระงับ'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            )}
          </section>
        )}

        {/* ================= TAB 5: DASHBOARD & AI ================= */}
        {activeTab === 'dashboard' && (() => {
          const approvedMerchants = merchants.filter((m) => m.status === 'approved');
          const allPlaces = [...places, ...approvedMerchants];
          const categoryMeta = {
            'ทะเล': { emoji: '🌊', color: '#0ea5e9' },
            'ธรรมชาติ': { emoji: '⛰️', color: '#059669' },
            'ร้านอาหาร': { emoji: '🦞', color: '#f97316' },
            'คาเฟ่': { emoji: '☕', color: '#db2777' },
            'วัด': { emoji: '⛩️', color: '#d97706' },
            'ชุมชน': { emoji: '🛶', color: '#7c3aed' },
          };
          const categoryStats = {};
          allPlaces.forEach((p) => {
            const tag = p.tag || 'อื่นๆ';
            if (!categoryStats[tag]) categoryStats[tag] = { tripAdds: 0, count: 0 };
            categoryStats[tag].tripAdds += p.tripAdds || 0;
            categoryStats[tag].count += 1;
          });
          const maxTripAdds = Math.max(1, ...Object.values(categoryStats).map((s) => s.tripAdds));
          const sortedCategories = Object.entries(categoryStats).sort((a, b) => b[1].tripAdds - a[1].tripAdds);

          return (
            <section className="admin-table-card fade-in">
              <h2 className="table-title">📊 รายงานสถิติภาพรวมตามหมวดหมู่สถานที่</h2>
              <p className="table-desc">จำนวนครั้งจริงที่นักท่องเที่ยวเพิ่มสถานที่แต่ละหมวดหมู่ลงในทริป (สร้างเส้นทางสำเร็จ)</p>

              {sortedCategories.length === 0 ? (
                <p style={{ fontSize: '13px', color: '#64748b' }}>ยังไม่มีข้อมูลการใช้งาน</p>
              ) : (
                <div className="analytics-grid-preview">
                  {sortedCategories.map(([tag, stats]) => {
                    const meta = categoryMeta[tag] || { emoji: '📍', color: '#64748b' };
                    const widthPct = Math.max(Math.round((stats.tripAdds / maxTripAdds) * 100), 4);
                    return (
                      <div className="analytics-bar-card" key={tag}>
                        <span className="bar-label">{meta.emoji} {tag} ({stats.count} สถานที่)</span>
                        <div className="bar-outer">
                          <div className="bar-inner" style={{ width: `${widthPct}%`, background: meta.color }}>
                            {stats.tripAdds} ทริป
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })()}
      </main>
    </div>
  );
}
