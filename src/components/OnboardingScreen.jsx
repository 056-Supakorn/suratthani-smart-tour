import React from 'react';

export default function OnboardingScreen({
  categories,
  onboardingPrefs,
  toggleOnboardingSelection,
  handleCompleteOnboarding,
  theme,
  toggleTheme,
}) {
  const userName = localStorage.getItem('userName') || 'นักท่องเที่ยว';

  const selectAll = () => {
    categories.forEach((cat) => {
      if (!onboardingPrefs.includes(cat.id)) {
        toggleOnboardingSelection(cat.id);
      }
    });
  };

  const clearAll = () => {
    onboardingPrefs.forEach((id) => {
      toggleOnboardingSelection(id);
    });
  };

  const categoryDetails = [
    {
      id: 'sea',
      label: 'ทะเลและหมู่เกาะ',
      icon: '🏝️',
      tag: 'Sea & Islands',
      sub: 'เกาะสมุย, เกาะพะงัน, เกาะเต่า, ดำน้ำดูปะการัง',
      gradient: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
      accentColor: '#0284c7',
    },
    {
      id: 'mountain',
      label: 'ธรรมชาติและภูเขา',
      icon: '⛰️',
      tag: 'Nature & Parks',
      sub: 'เขาสก, กุ้ยหลินเมืองไทย, ล่องแพเขื่อนเชี่ยวหลาน',
      gradient: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
      accentColor: '#059669',
    },
    {
      id: 'temple',
      label: 'วัดและวัฒนธรรม',
      icon: '⛩️',
      tag: 'Culture & Temple',
      sub: 'พระบรมธาตุไชยา, เจดีย์ลอยฟ้า, ศาลหลักเมือง',
      gradient: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
      accentColor: '#d97706',
    },
    {
      id: 'local',
      label: 'วิถีชีวิตชุมชน',
      icon: '🛶',
      tag: 'Local & Village',
      sub: 'คลองร้อยสาย, โฮมสเตย์บางใบไม้, ล่องเรือชมหิ่งห้อย',
      gradient: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
      accentColor: '#ea580c',
    },
    {
      id: 'cafe',
      label: 'คาเฟ่สไตล์ชิคๆ',
      icon: '☕',
      tag: 'Cafe & Photo',
      sub: 'คาเฟ่ริมหาด, วิวภูเขา, ถ่ายรูปเช็คอินสวยๆ',
      gradient: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
      accentColor: '#db2777',
    },
    {
      id: 'food',
      label: 'ร้านอาหารพื้นบ้าน Unseen',
      icon: '🦞',
      tag: 'Local Dining',
      sub: 'หอยนางรมสุราษฎร์, อาหารปักษ์ใต้แท้ๆ, ซีฟู้ดสด',
      gradient: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)',
      accentColor: '#7c3aed',
    },
  ];

  return (
    <div className="onboarding-root-container">
      {/* Background Decorative Glows */}
      <div className="onboarding-ambient-glow glow-top-left" />
      <div className="onboarding-ambient-glow glow-bottom-right" />

      <div className="onboarding-main-card">
        {/* Top Theme Button */}
        <button
          type="button"
          className="onboarding-theme-toggle"
          onClick={toggleTheme}
          title={theme === 'dark' ? 'สลับโหมดสว่าง' : 'สลับโหมดมืด'}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
          )}
        </button>

        {/* AI Travel Assistant Avatar & Greeting */}
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
            <span>ขั้นตอนที่ 1 จาก 1 • ตั้งค่าความชอบส่วนตัว</span>
          </div>

          <h1 className="onboarding-greeting-title">
            สวัสดีคุณ <span className="user-name-highlight">{userName}</span>! 👋
          </h1>
          <p className="onboarding-greeting-sub">
            เพื่อให้ระบบ AI สามารถจัดเรียงและแนะนำสถานที่ท่องเที่ยวสุราษฎร์ธานีได้ตรงใจคุณมากที่สุด
            <br />
            กรุณาเลือก <b>"สไตล์การเที่ยวที่คุณชอบ"</b> (เลือกได้มากกว่า 1 ข้อ)
          </p>
        </div>

        {/* Toolbar: Counter & Quick Selection */}
        <div className="onboarding-toolbar-row">
          <div className="selected-counter-badge">
            <span className="counter-icon">🎯</span>
            <span>เลือกแล้ว <b>{onboardingPrefs.length}</b> จาก {categories.length} สไตล์</span>
          </div>

          <div className="quick-actions-group">
            <button
              type="button"
              className="quick-action-btn"
              onClick={selectAll}
            >
              ✓ เลือกทั้งหมด
            </button>
            {onboardingPrefs.length > 0 && (
              <button
                type="button"
                className="quick-action-btn clear-btn"
                onClick={clearAll}
              >
                ✕ ล้างที่เลือก
              </button>
            )}
          </div>
        </div>

        {/* Categories Grid */}
        <div className="onboarding-pref-grid">
          {categoryDetails.map((item) => {
            const isSelected = onboardingPrefs.includes(item.id);
            return (
              <div
                key={item.id}
                className={`onboarding-pref-card ${isSelected ? 'selected' : ''}`}
                onClick={() => toggleOnboardingSelection(item.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleOnboardingSelection(item.id);
                  }
                }}
              >
                {/* Active Checkmark Pill */}
                <div className={`card-check-indicator ${isSelected ? 'active' : ''}`}>
                  {isSelected ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <div className="card-uncheck-circle" />
                  )}
                </div>

                {/* Card Icon & Tag */}
                <div className="card-top-meta">
                  <div
                    className="card-icon-bubble"
                    style={{
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.04)',
                    }}
                  >
                    {item.icon}
                  </div>
                  <span className="card-category-tag">{item.tag}</span>
                </div>

                {/* Card Main Info */}
                <div className="card-body-meta">
                  <h3 className="card-pref-title">{item.label}</h3>
                  <p className="card-pref-sub">{item.sub}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Button Section */}
        <div className="onboarding-footer-action">
          <button
            type="button"
            className={`onboarding-submit-btn ${onboardingPrefs.length > 0 ? 'btn-active' : 'btn-inactive'}`}
            onClick={handleCompleteOnboarding}
            disabled={onboardingPrefs.length === 0}
          >
            <span>{onboardingPrefs.length > 0 ? 'บันทึกและเริ่มต้นจัดทริป ✨' : 'กรุณาเลือกอย่างน้อย 1 ข้อ'}</span>
            {onboardingPrefs.length > 0 && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            )}
          </button>

          <p className="onboarding-secure-hint">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>ข้อมูลนี้จะถูกนำไปใช้วิเคราะห์และปรับแต่งผลลัพธ์การแนะนำเฉพาะคุณ</span>
          </p>
        </div>
      </div>
    </div>
  );
}
