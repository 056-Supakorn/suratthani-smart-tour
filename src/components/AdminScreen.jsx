import React, { useState, useEffect } from 'react';

export default function AdminScreen({
  theme,
  toggleTheme,
  onLogout,
  onViewAsTourist,
}) {
  const [activeTab, setActiveTab] = useState('moderation'); // 'moderation' | 'pois' | 'vr-assets' | 'users' | 'dashboard'

  // Sample pending and approved merchants list (stored in localStorage)
  const initialMerchants = [
    {
      id: 'm1',
      businessName: 'คาเฟ่ริมหาด สมุย ซันเซ็ท',
      ownerName: 'สมชาย เจริญกิจ',
      email: 'samui.sunset@email.com',
      phone: '081-234-5678',
      businessType: 'คาเฟ่ & เบเกอรี่',
      licenseId: '0845564001234',
      docName: 'DBD_Certificate_2026.pdf',
      registeredAt: '2026-08-31 14:20 น.',
      status: 'pending',
    },
    {
      id: 'm2',
      businessName: 'ร้านอาหารพื้นบ้าน ปากน้ำตาปี ซีฟู้ด',
      ownerName: 'วิภาดา รักษาเกียรติ',
      email: 'tapi.seafood@email.com',
      phone: '089-876-5432',
      businessType: 'ร้านอาหารพื้นบ้าน / ซีฟู้ด',
      licenseId: '0845565009876',
      docName: 'Commercial_Registration.pdf',
      registeredAt: '2026-08-31 11:45 น.',
      status: 'pending',
    },
    {
      id: 'm3',
      businessName: 'โฮมสเตย์ล่องเรือคลองร้อยสาย',
      ownerName: 'ประสิทธิ์ ทองมี',
      email: 'khlong.roisai@email.com',
      phone: '086-555-1234',
      businessType: 'แหล่งท่องเที่ยวชุมชน',
      licenseId: '0845566005544',
      docName: 'Community_Tourism_Permit.pdf',
      registeredAt: '2026-08-30 16:10 น.',
      status: 'approved',
    },
    {
      id: 'm4',
      businessName: 'เชี่ยวหลาน เลค รีสอร์ท แอนด์ ราฟต์',
      ownerName: 'กิตติศักดิ์ พรหมมินทร์',
      email: 'chiewlan.raft@email.com',
      phone: '077-999-888',
      businessType: 'โรงแรม & รีสอร์ท',
      licenseId: '0845563007788',
      docName: 'Hotel_License_2026.pdf',
      registeredAt: '2026-08-29 09:30 น.',
      status: 'approved',
    },
  ];

  const [merchants, setMerchants] = useState(() => {
    const saved = localStorage.getItem('adminMerchantsList');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return initialMerchants;
      }
    }
    return initialMerchants;
  });

  // Sample Users list
  const [usersList, setUsersList] = useState([
    { id: 'u1', name: 'มาทินี โรยนรินทร์', email: 'matinee@gmail.com', role: 'tourist', status: 'active', tripsCreated: 8 },
    { id: 'u2', name: 'ศศิกานต์ แจ่มเหมือน', email: 'sasikarn@gmail.com', role: 'tourist', status: 'active', tripsCreated: 5 },
    { id: 'u3', name: 'สมชาย เจริญกิจ', email: 'samui.sunset@email.com', role: 'business', status: 'pending', tripsCreated: 0 },
    { id: 'u4', name: 'วิภาดา รักษาเกียรติ', email: 'tapi.seafood@email.com', role: 'business', status: 'pending', tripsCreated: 0 },
  ]);

  const handleApprove = (id) => {
    const updated = merchants.map((m) =>
      m.id === id ? { ...m, status: 'approved' } : m
    );
    setMerchants(updated);
    localStorage.setItem('adminMerchantsList', JSON.stringify(updated));
    alert('✅ อนุมัติผู้ประกอบการเรียบร้อยแล้ว! ข้อมูลร้านจะแสดงผลในระบบแนะนำทันที');
  };

  const handleReject = (id) => {
    const reason = prompt('กรุณาระบุเหตุผลในการปฏิเสธ (เช่น เอกสารไม่ชัดเจน):', 'เอกสารใบอนุญาตไม่ครบถ้วน');
    if (reason !== null) {
      const updated = merchants.map((m) =>
        m.id === id ? { ...m, status: 'rejected', rejectReason: reason } : m
      );
      setMerchants(updated);
      localStorage.setItem('adminMerchantsList', JSON.stringify(updated));
      alert('❌ ปฏิเสธคำขอเรียบร้อยแล้ว');
    }
  };

  const toggleUserStatus = (userId) => {
    setUsersList((prev) =>
      prev.map((u) =>
        u.id === userId
          ? { ...u, status: u.status === 'active' ? 'suspended' : 'active' }
          : u
      )
    );
  };

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
          <button
            type="button"
            className="admin-theme-btn"
            onClick={toggleTheme}
            title="สลับโหมดสว่าง/มืด"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
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
              <h3 className="stat-value">1,248 <span className="stat-unit">คน</span></h3>
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
              <h3 className="stat-value">52 <span className="stat-unit">แห่ง</span></h3>
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
              </div>
            </div>

            <div className="admin-table-container">
              <table className="admin-custom-table">
                <thead>
                  <tr>
                    <th>สถานประกอบการ / ชื่อร้าน</th>
                    <th>เจ้าของร้าน / ผู้ติดต่อ</th>
                    <th>ประเภทธุรกิจ</th>
                    <th>เอกสาร / เลขทะเบียนพาณิชย์</th>
                    <th>เวลาที่ลงทะเบียน</th>
                    <th>สถานะ</th>
                    <th style={{ textAlign: 'center' }}>การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {merchants.map((merchant) => (
                    <tr key={merchant.id}>
                      <td>
                        <div className="merchant-name-cell">
                          <span className="merchant-shop-name">{merchant.businessName}</span>
                          <span className="merchant-shop-phone">📞 {merchant.phone}</span>
                        </div>
                      </td>
                      <td>
                        <div className="merchant-owner-cell">
                          <span className="owner-name">{merchant.ownerName}</span>
                          <span className="owner-email">{merchant.email}</span>
                        </div>
                      </td>
                      <td>
                        <span className="business-type-tag">{merchant.businessType}</span>
                      </td>
                      <td>
                        <div className="license-doc-cell">
                          <span className="license-id">ID: {merchant.licenseId}</span>
                          <span className="doc-link-btn" onClick={() => alert(`เปิดเอกสารตรวจสอบ: ${merchant.docName}`)}>
                            📄 {merchant.docName}
                          </span>
                        </div>
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
                          <span className="status-pill status-rejected">
                            ✕ ปฏิเสธ
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <div className="action-buttons-cell">
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
                              onClick={() => {
                                const newStatus = merchant.status === 'approved' ? 'pending' : 'approved';
                                const updated = merchants.map((m) =>
                                  m.id === merchant.id ? { ...m, status: newStatus } : m
                                );
                                setMerchants(updated);
                                localStorage.setItem('adminMerchantsList', JSON.stringify(updated));
                              }}
                            >
                              🔄 สลับสถานะ
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ================= TAB 2: MANAGE POIS ================= */}
        {activeTab === 'pois' && (
          <section className="admin-table-card fade-in">
            <div className="table-header-row">
              <div>
                <h2 className="table-title">ฐานข้อมูลสถานที่ท่องเที่ยวทั้งหมดในระบบ (52 แห่ง)</h2>
                <p className="table-desc">เพิ่ม, ลบ, หรือแก้ไขพิกัด GPS แผนที่ และหมวดหมู่ของสถานที่ท่องเที่ยว</p>
              </div>
              <button
                type="button"
                className="btn-add-new-place"
                onClick={() => alert('เปิดหน้าต่างเพิ่มสถานที่ท่องเที่ยวใหม่')}
              >
                ➕ เพิ่มสถานที่ใหม่ (Add POI)
              </button>
            </div>

            <div className="admin-places-quick-list">
              <div className="place-item-card">
                <span className="place-num">01</span>
                <div>
                  <h4 className="place-item-title">อุทยานธรรมเขานาในหลวง</h4>
                  <p className="place-item-sub">อ.พนม • หมวดหมู่: วัด • พิกัด: 8.8252, 98.8879</p>
                </div>
                <button type="button" className="btn-recheck-action" onClick={() => alert('แก้ไขข้อมูลสถานที่')}>✏️ แก้ไข</button>
              </div>

              <div className="place-item-card">
                <span className="place-num">02</span>
                <div>
                  <h4 className="place-item-title">ป่าต้นน้ำ บ้านน้ำราด</h4>
                  <p className="place-item-sub">อ.คีรีรัฐนิคม • หมวดหมู่: ธรรมชาติ • พิกัด: 8.9248, 98.9836</p>
                </div>
                <button type="button" className="btn-recheck-action" onClick={() => alert('แก้ไขข้อมูลสถานที่')}>✏️ แก้ไข</button>
              </div>

              <div className="place-item-card">
                <span className="place-num">03</span>
                <div>
                  <h4 className="place-item-title">เขื่อนรัชชประภา (เขาสามเกลอ)</h4>
                  <p className="place-item-sub">อ.บ้านตาขุน • หมวดหมู่: ธรรมชาติ • พิกัด: 8.9717, 98.8173</p>
                </div>
                <button type="button" className="btn-recheck-action" onClick={() => alert('แก้ไขข้อมูลสถานที่')}>✏️ แก้ไข</button>
              </div>

              <div className="place-item-card">
                <span className="place-num">04</span>
                <div>
                  <h4 className="place-item-title">แหลมโพธิ์ หาดพุมเรียง</h4>
                  <p className="place-item-sub">อ.ไชยา • หมวดหมู่: ทะเล & ชุมชน • พิกัด: 9.3850, 99.2550</p>
                </div>
                <button type="button" className="btn-recheck-action" onClick={() => alert('แก้ไขข้อมูลสถานที่')}>✏️ แก้ไข</button>
              </div>
            </div>
          </section>
        )}

        {/* ================= TAB 3: VR ASSETS ================= */}
        {activeTab === 'vr-assets' && (
          <section className="admin-table-card fade-in">
            <div className="table-header-row">
              <div>
                <h2 className="table-title">จัดการทรัพยากรภาพเสมือนจริง VR 360° และจุด Hotspots</h2>
                <p className="table-desc">อัปโหลดและเชื่อมโยงภาพพาโนรามา 360 องศาเข้ากับสถานที่ท่องเที่ยวสาธารณะ</p>
              </div>
              <button
                type="button"
                className="btn-add-new-place"
                onClick={() => alert('เปิดเครื่องมือสร้าง Interactive Hotspot')}
              >
                ➕ เพิ่มจุด Hotspot ใหม่
              </button>
            </div>

            <div className="admin-places-quick-list">
              <div className="place-item-card">
                <span className="place-num">VR1</span>
                <div>
                  <h4 className="place-item-title">หอนาฬิกาเมืองสุราษฎร์ธานี 360°</h4>
                  <p className="place-item-sub">ไฟล์: clocktower.jpg • Hotspots: 3 จุด</p>
                </div>
                <span className="place-status-active">เชื่อมโยงแล้ว ✓</span>
              </div>

              <div className="place-item-card">
                <span className="place-num">VR2</span>
                <div>
                  <h4 className="place-item-title">สะพานศรีสุราษฎร์ ปากน้ำตาปี 360°</h4>
                  <p className="place-item-sub">ไฟล์: brige.jpg • Hotspots: 2 จุด</p>
                </div>
                <span className="place-status-active">เชื่อมโยงแล้ว ✓</span>
              </div>
            </div>
          </section>
        )}

        {/* ================= TAB 4: USER MANAGEMENT ================= */}
        {activeTab === 'users' && (
          <section className="admin-table-card fade-in">
            <div className="table-header-row">
              <div>
                <h2 className="table-title">การจัดการผู้ใช้งานและสิทธิการเข้าถึง (User Access Management)</h2>
                <p className="table-desc">ตรวจสอบบัญชีผู้ใช้งาน, สิทธิ Role, และระงับบัญชีเมื่อมีคำร้องเรียน</p>
              </div>
            </div>

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
                    <tr key={u.id}>
                      <td><b>{u.name}</b></td>
                      <td>{u.email}</td>
                      <td>
                        <span className="business-type-tag">
                          {u.role === 'tourist' ? '🎒 นักท่องเที่ยว' : '🏪 ผู้ประกอบการ'}
                        </span>
                      </td>
                      <td>{u.tripsCreated} ทริป</td>
                      <td>
                        <span className={`status-pill ${u.status === 'active' ? 'status-approved' : 'status-rejected'}`}>
                          {u.status === 'active' ? 'ปกติ (Active)' : 'ถูกระงับ (Suspended)'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className={u.status === 'active' ? 'btn-reject-action' : 'btn-approve-action'}
                          onClick={() => toggleUserStatus(u.id)}
                        >
                          {u.status === 'active' ? '🚫 ระงับการใช้งาน' : '✓ ปลดระงับ'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ================= TAB 5: DASHBOARD & AI ================= */}
        {activeTab === 'dashboard' && (
          <section className="admin-table-card fade-in">
            <h2 className="table-title">📊 รายงานสถิติภาพรวมและพฤติกรรมการค้นหา</h2>
            <p className="table-desc">ข้อมูลแนวโน้มความนิยมและสไตล์การท่องเที่ยวของนักท่องเที่ยวในจังหวัดสุราษฎร์ธานี</p>

            <div className="analytics-grid-preview">
              <div className="analytics-bar-card">
                <span className="bar-label">🌊 ทะเลและหมู่เกาะ (เกาะสมุย, เกาะพะงัน, เกาะเต่า)</span>
                <div className="bar-outer"><div className="bar-inner" style={{ width: '85%' }}>85% (1,060 ทริป)</div></div>
              </div>
              <div className="analytics-bar-card">
                <span className="bar-label">⛰️ ธรรมชาติและเขาสก / ล่องแพเขื่อนเชี่ยวหลาน</span>
                <div className="bar-outer"><div className="bar-inner" style={{ width: '74%', background: '#059669' }}>74% (925 ทริป)</div></div>
              </div>
              <div className="analytics-bar-card">
                <span className="bar-label">🦞 ร้านอาหารพื้นบ้านและหอยนางรมปักษ์ใต้</span>
                <div className="bar-outer"><div className="bar-inner" style={{ width: '68%', background: '#f97316' }}>68% (848 ทริป)</div></div>
              </div>
              <div className="analytics-bar-card">
                <span className="bar-label">☕ คาเฟ่ริมหาดและจุดเช็คอินถ่ายรูป</span>
                <div className="bar-outer"><div className="bar-inner" style={{ width: '60%', background: '#db2777' }}>60% (750 ทริป)</div></div>
              </div>
              <div className="analytics-bar-card">
                <span className="bar-label">⛩️ วัดและวัฒนธรรม (พระบรมธาตุไชยา, เจดีย์ลอยฟ้า)</span>
                <div className="bar-outer"><div className="bar-inner" style={{ width: '52%', background: '#d97706' }}>52% (650 ทริป)</div></div>
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
