import React from 'react';
import ThemeToggleBtn from './ThemeToggleBtn';

export default function AiInputScreen({
  categories,
  selectedPrefs,
  toggleSelection,
  moodOptions,
  tripMoods,
  toggleMoodSelection,
  budget,
  setBudget,
  timeHours,
  setTimeHours,
  timeUnit,
  setTimeUnit,
  getLocation,
  gpsStatus,
  handleProcessAI,
  isLoading,
  onBackToHome,
  theme,
  toggleTheme,
}) {
  const isFormValid =
    selectedPrefs.length > 0 &&
    tripMoods.length > 0 &&
    budget &&
    timeHours &&
    !isLoading;

  return (
    <div className="home-root-wrapper fade-in">
      {/* Top Nav */}
      <header className="home-top-nav">
        <div className="home-nav-brand" onClick={onBackToHome} style={{ cursor: 'pointer' }}>
          <div className="home-logo-badge">
            <svg width="34" height="34" viewBox="0 0 64 64" fill="none">
              <circle cx="44" cy="30" r="5.5" fill="#f59e0b" />
              <path d="M12 50C18 45 42 45 52 50C44 52 20 52 12 50Z" fill="#3a5a40" />
              <path d="M31 48C30.5 40 33 28 32 21C31 21 34 21 34.5 22C35 28 33 40 34 48H31Z" fill="#5c4033" />
              <path d="M33 21C33 13 31 10 28 8C33 11 36 15 33 21Z" fill="#1b4332" />
              <path d="M33 21C33 13 36 10 39 8C35 11 34 15 33 21Z" fill="#2d6a4f" />
              <circle cx="33" cy="21" r="2.5" fill="#1b4332" />
            </svg>
          </div>
          <div className="home-brand-text">
            <span className="brand-title">ระบบแนะนำสถานที่ท่องเที่ยว</span>
            <span className="brand-subtitle">จังหวัดสุราษฎร์ธานี</span>
          </div>
        </div>

        <div className="home-nav-actions">
          <button
            type="button"
            className="home-logout-pill-btn"
            onClick={onBackToHome}
            style={{ background: '#334155' }}
          >
            <span>← กลับหน้าหลัก</span>
          </button>
          <ThemeToggleBtn theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="home-main-container" style={{ maxWidth: '860px' }}>
        {/* Header Hero Card */}
        <section className="onboarding-main-card" style={{ padding: '36px 32px 30px 32px', marginBottom: '24px' }}>
          <div className="onboarding-header-area">
            <div className="ai-mascot-avatar-wrapper">
              <div className="ai-avatar-circle">
                <span className="ai-avatar-emoji">🤖</span>
                <span className="ai-sparkle-dot">✨</span>
              </div>
              <div className="ai-avatar-pulse-ring" />
            </div>

            <div className="onboarding-step-pill">
              <span className="step-dot" />
              <span>AI Trip Planner • ปรับแต่งเงื่อนไขการเดินทาง</span>
            </div>

            <h1 className="onboarding-greeting-title">ให้ AI ช่วยจัดทริปเฉพาะคุณ 🗺️</h1>
            <p className="onboarding-greeting-sub">
              ระบุสไตล์ บรรยากาศ งบประมาณ และเวลาที่คุณมี เพื่อให้ระบบ AI คำนวณเส้นทางและสถานที่ที่คุ้มค่าที่สุด
            </p>
          </div>

          {/* Section 1: Categories Selector */}
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px 0', color: '#123e2f' }} className="brand-title">
              1. สไตล์สถานที่ท่องเที่ยวที่คุณสนใจ (เลือกได้หลายข้อ) *
            </h3>
            <div className="pref-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              {categories.map((item) => {
                const isSelected = selectedPrefs.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggleSelection(item.id)}
                    className={`quick-action-btn ${isSelected ? 'active-chip' : ''}`}
                    style={{
                      padding: '12px 14px',
                      borderRadius: '14px',
                      textAlign: 'center',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      background: isSelected ? '#123e2f' : (theme === 'dark' ? '#1f2732' : '#f8fafc'),
                      color: isSelected ? '#ffffff' : (theme === 'dark' ? '#cbd5e1' : '#334155'),
                      border: isSelected ? '1.5px solid #10b981' : `1.5px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
                      boxShadow: isSelected ? '0 4px 14px rgba(18,62,47,0.25)' : 'none',
                      transition: 'all 0.2s',
                    }}
                  >
                    {item.label}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Trip Moods */}
          <div style={{ textAlign: 'left', marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, margin: '0 0 10px 0', color: '#123e2f' }} className="brand-title">
              2. บรรยากาศและฟีลลิ่งของทริปนี้ (Trip Moods) *
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {moodOptions.map((mood) => {
                const isSelected = tripMoods.includes(mood.id);
                return (
                  <div
                    key={mood.id}
                    onClick={() => toggleMoodSelection(mood.id)}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '14px',
                      cursor: 'pointer',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      background: isSelected ? '#ea580c' : (theme === 'dark' ? '#1f2732' : '#f8fafc'),
                      color: isSelected ? '#ffffff' : (theme === 'dark' ? '#cbd5e1' : '#334155'),
                      border: isSelected ? '1.5px solid #fdba74' : `1.5px solid ${theme === 'dark' ? '#334155' : '#e2e8f0'}`,
                      boxShadow: isSelected ? '0 4px 14px rgba(234,88,12,0.25)' : 'none',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{mood.label}</span>
                    {isSelected && <span>✓</span>}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 3: GPS Location */}
          <div style={{ textAlign: 'left', marginBottom: '24px', padding: '18px 20px', borderRadius: '18px', background: theme === 'dark' ? '#131922' : '#f0fdf4', border: `1.5px dashed ${theme === 'dark' ? '#2d6a4f' : '#86efac'}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h4 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#166534' }} className="brand-title">
                  📍 คำนวณระยะทางจากจุดที่คุณอยู่ (Point-to-Point)
                </h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '12px', color: '#64748b' }}>
                  อนุญาตให้ระบบเข้าถึงพิกัดเพื่อจัดลำดับสถานที่ที่ใกล้คุณที่สุดก่อน
                </p>
              </div>
              <button
                type="button"
                className="btn-approve-action"
                style={{ padding: '8px 16px', fontSize: '13px', borderRadius: '12px' }}
                onClick={getLocation}
              >
                📍 ดึงพิกัดปัจจุบัน
              </button>
            </div>
            {gpsStatus && (
              <p style={{ margin: '10px 0 0 0', fontSize: '12.5px', fontWeight: 600, color: gpsStatus.includes('❌') ? '#ef4444' : '#166534' }}>
                {gpsStatus}
              </p>
            )}
          </div>

          {/* Section 4: Budget and Time */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '28px', textAlign: 'left' }}>
            <div className="form-field-group">
              <label className="form-input-label">💰 งบประมาณต่อคน (บาท) *</label>
              <input
                type="number"
                placeholder="เช่น 1500"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                className="merchant-text-input"
                required
              />
            </div>

            <div className="form-field-group">
              <label className="form-input-label">⏱️ เวลาที่มีสำหรับทริปนี้ *</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="number"
                  placeholder="เช่น 6"
                  value={timeHours}
                  onChange={(e) => setTimeHours(e.target.value)}
                  className="merchant-text-input"
                  style={{ flex: 1 }}
                  required
                />
                <select
                  value={timeUnit}
                  onChange={(e) => setTimeUnit(e.target.value)}
                  className="merchant-select-input"
                  style={{ width: '110px' }}
                >
                  <option value="hours">ชั่วโมง</option>
                  <option value="days">วัน</option>
                  <option value="weeks">สัปดาห์</option>
                </select>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="onboarding-footer-action">
            <button
              type="button"
              className={`onboarding-submit-btn ${isFormValid ? 'btn-active' : 'btn-inactive'}`}
              onClick={handleProcessAI}
              disabled={!isFormValid}
            >
              <span>{isLoading ? '🤖 AI กำลังประมวลผลจัดทริป...' : 'เริ่มประมวลผลค้นหาสถานที่ ✨'}</span>
            </button>
            <button
              type="button"
              className="quick-action-btn"
              style={{ marginTop: '12px', border: 'none', background: 'none', color: '#64748b', textDecoration: 'underline' }}
              onClick={onBackToHome}
            >
              ยกเลิกและกลับหน้าหลัก
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
