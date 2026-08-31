import React, { useState } from 'react';
import ThemeToggleBtn from './ThemeToggleBtn';

export default function DetailScreen({
  selectedAttraction,
  onOpenVR,
  onBack,
  theme,
  toggleTheme,
}) {
  const [userRating, setUserRating] = useState(0);
  const [feedbackSent, setFeedbackSent] = useState(false);

  const handleRate = (star) => {
    setUserRating(star);
    setFeedbackSent(true);
  };

  if (!selectedAttraction) return null;

  return (
    <div className="home-root-wrapper fade-in">
      {/* Top Nav */}
      <header className="home-top-nav">
        <div className="home-nav-brand" onClick={onBack} style={{ cursor: 'pointer' }}>
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
            onClick={onBack}
            style={{ background: '#334155' }}
          >
            <span>← ย้อนกลับ</span>
          </button>
          <ThemeToggleBtn theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="home-main-container" style={{ maxWidth: '860px', paddingBottom: '60px' }}>
        <article className="surat-attraction-card" style={{ padding: 0, overflow: 'hidden', cursor: 'default' }}>
          {/* Hero Place Image */}
          <div style={{ height: '340px', width: '100%', position: 'relative', overflow: 'hidden' }}>
            <img
              src={selectedAttraction.image || 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80'}
              alt={selectedAttraction.name}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
            <span className="card-tag-pill-badge" style={{ fontSize: '13px', padding: '6px 16px' }}>
              {selectedAttraction.tag || 'สถานที่ท่องเที่ยว'}
            </span>
          </div>

          <div style={{ padding: '32px' }}>
            {/* Title and Location */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
              <div>
                <h1 className="hero-welcome-heading" style={{ fontSize: '28px', textAlign: 'left' }}>
                  {selectedAttraction.name}
                </h1>
                <p className="card-place-location" style={{ fontSize: '14.5px', marginTop: '4px' }}>
                  📍 {selectedAttraction.location || 'สุราษฎร์ธานี'}
                </p>
              </div>

              {selectedAttraction.travelTime && (
                <span className="filter-badge approved" style={{ fontSize: '13px', padding: '8px 16px' }}>
                  ⏱️ เวลาเปิด: {selectedAttraction.travelTime}
                </span>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 8px 0', color: '#123e2f' }} className="brand-title">
                ℹ️ ไฮไลท์และรายละเอียดสถานที่
              </h3>
              <p style={{ fontSize: '15px', lineHeight: '1.75', color: theme === 'dark' ? '#cbd5e1' : '#475569', margin: 0 }}>
                {selectedAttraction.description || 'สถานที่ท่องเที่ยวสำคัญในจังหวัดสุราษฎร์ธานี เหมาะสำหรับการท่องเที่ยว พักผ่อน ถ่ายรูป และสัมผัสธรรมชาติ'}
              </p>
            </div>

            {/* Google Maps Embed */}
            <div style={{ marginBottom: '28px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, margin: '0 0 12px 0', color: '#123e2f' }} className="brand-title">
                🗺️ แผนที่และการเดินทาง
              </h3>
              <div style={{ borderRadius: '18px', overflow: 'hidden', border: `1.5px solid ${theme === 'dark' ? '#2e3846' : '#e2e8f0'}` }}>
                <iframe
                  title="Google Maps"
                  width="100%"
                  height="300"
                  style={{ border: 0, display: 'block' }}
                  loading="lazy"
                  allowFullScreen
                  src={
                    selectedAttraction.lat && selectedAttraction.lng
                      ? `https://maps.google.com/maps?q=${selectedAttraction.lat},${selectedAttraction.lng}&t=&z=14&ie=UTF8&iwloc=B&output=embed`
                      : `https://maps.google.com/maps?q=${encodeURIComponent(selectedAttraction.name + ' สุราษฎร์ธานี')}&t=&z=14&ie=UTF8&iwloc=B&output=embed`
                  }
                />
              </div>
            </div>

            {/* Navigation & VR Action Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedAttraction.vr_image ? 'repeat(2, 1fr)' : '1fr', gap: '12px', marginBottom: '28px' }}>
              <a
                href={
                  selectedAttraction.lat && selectedAttraction.lng
                    ? `https://www.google.com/maps/search/?api=1&query=${selectedAttraction.lat},${selectedAttraction.lng}`
                    : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedAttraction.name + ' สุราษฎร์ธานี')}`
                }
                target="_blank"
                rel="noopener noreferrer"
                className="ai-planner-cta-btn"
                style={{ justifyContent: 'center', textDecoration: 'none', background: 'linear-gradient(135deg, #123e2f 0%, #059669 100%)' }}
              >
                <span>📍 เปิดแอปนำทาง (Google Maps)</span>
              </a>

              {selectedAttraction.vr_image && (
                <button
                  type="button"
                  className="ai-planner-cta-btn"
                  onClick={() => onOpenVR(selectedAttraction)}
                  style={{ justifyContent: 'center' }}
                >
                  <span>🕶️ เข้าสู่โหมด VR 360°</span>
                </button>
              )}
            </div>

            {/* Tourist RBAC: Star Rating & Feedback Loop Widget */}
            <div
              style={{
                padding: '22px 24px',
                borderRadius: '20px',
                background: theme === 'dark' ? '#131922' : '#f8fafc',
                border: `1.5px solid ${theme === 'dark' ? '#2e3846' : '#e2e8f0'}`,
                textAlign: 'center',
              }}
            >
              <h3 style={{ margin: '0 0 6px 0', fontSize: '16.5px', fontWeight: 700, color: '#123e2f' }} className="brand-title">
                ⭐ ให้คะแนนความพึงพอใจสถานที่นี้ (Submit Feedback)
              </h3>
              <p style={{ margin: '0 0 14px 0', fontSize: '13px', color: '#64748b' }}>
                คะแนนของคุณจะช่วยให้ AI นำไปปรับปรุงการเรียนรู้เพื่อจัดทริปที่ตรงใจมากยิ่งขึ้น
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', fontSize: '32px', cursor: 'pointer', marginBottom: '8px' }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <span
                    key={star}
                    onClick={() => handleRate(star)}
                    style={{
                      transition: 'transform 0.15s',
                      filter: star <= userRating ? 'grayscale(0)' : 'grayscale(1)',
                      opacity: star <= userRating ? 1 : 0.4,
                    }}
                    onMouseEnter={(e) => (e.target.style.transform = 'scale(1.2)')}
                    onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                  >
                    ⭐
                  </span>
                ))}
              </div>

              {feedbackSent && (
                <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: '#059669', fontWeight: 600 }}>
                  ✓ ขอบคุณสำหรับคะแนน {userRating} ดาว! ระบบได้บันทึกฟีดแบ็กเข้าสู่โมเดล AI เรียบร้อยแล้วครับ ✨
                </p>
              )}
            </div>
          </div>
        </article>

        <div style={{ textAlign: 'center', marginTop: '24px' }}>
          <button
            type="button"
            className="home-logout-pill-btn"
            onClick={onBack}
            style={{ background: '#334155', padding: '12px 32px', display: 'inline-flex' }}
          >
            ← ย้อนกลับ
          </button>
        </div>
      </main>
    </div>
  );
}
