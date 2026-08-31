import React from 'react';
import ThemeToggleBtn from './ThemeToggleBtn';

export default function FinalRouteScreen({
  finalRoutePlan,
  calculateEstimatedTime,
  onViewDetail,
  onOpenVR,
  onBackToAiResult,
  onBackToHome,
  theme,
  toggleTheme,
}) {
  const round = (val, dec = 1) => Number(Math.round(val + 'e' + dec) + 'e-' + dec);

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
            onClick={onBackToAiResult}
            style={{ background: '#334155' }}
          >
            <span>← ปรับแต่งสถานที่</span>
          </button>
          <ThemeToggleBtn theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="home-main-container" style={{ maxWidth: '900px' }}>
        {/* Header Summary */}
        <section className="home-ai-planner-card" style={{ marginBottom: '24px', padding: '22px 30px' }}>
          <div className="ai-planner-left">
            <div className="ai-planner-robot-avatar">
              <span className="robot-face">🚗</span>
            </div>
            <div className="ai-planner-texts">
              <h2 className="ai-planner-title">แผนการเดินทางจุดต่อจุด (Point-to-Point Itinerary)</h2>
              <p className="ai-planner-desc">
                ระบบได้จัดเรียงลำดับการแวะชมสถานที่ตามระยะทางที่ใกล้และสะดวกที่สุดเรียบร้อยแล้ว
              </p>
            </div>
          </div>
        </section>

        {/* Timeline Itinerary Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', marginBottom: '30px' }}>
          {finalRoutePlan.map((place, index) => (
            <div
              key={place.id || index}
              className="surat-attraction-card"
              style={{
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'stretch',
                padding: 0,
                cursor: 'pointer',
              }}
              onClick={() => onViewDetail(place, 'final-route')}
            >
              {/* Photo Side */}
              <div style={{ width: '32%', minWidth: '180px', position: 'relative', overflow: 'hidden' }}>
                <img
                  src={place.image || 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80'}
                  alt={place.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span
                  style={{
                    position: 'absolute',
                    top: '12px',
                    left: '12px',
                    background: '#123e2f',
                    color: '#ffffff',
                    borderRadius: '20px',
                    padding: '4px 12px',
                    fontSize: '12px',
                    fontWeight: 700,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                >
                  📍 จุดที่ {index + 1}
                </span>
              </div>

              {/* Info Side */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className="card-category-tag" style={{ color: '#059669', fontSize: '12px' }}>{place.tag || 'สถานที่ท่องเที่ยว'}</span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>เวลาแนะนำ: {place.travelTime || '1-2 ชม.'}</span>
                  </div>
                  <h3 className="card-place-title" style={{ fontSize: '18px', marginBottom: '6px' }}>{place.name}</h3>
                  <p className="card-place-location" style={{ marginBottom: '12px' }}>📌 {place.location || 'สุราษฎร์ธานี'}</p>
                </div>

                {place.route_distance !== undefined && (
                  <div
                    style={{
                      background: theme === 'dark' ? '#131922' : '#f0fdf4',
                      border: `1px solid ${theme === 'dark' ? '#2d6a4f' : '#dcfce7'}`,
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '12px',
                    }}
                  >
                    <span style={{ color: '#059669', fontWeight: 700, fontSize: '13px' }}>
                      🚗 ห่างจากจุดก่อนหน้า: {round(place.route_distance, 1)} กม.
                    </span>
                    <span style={{ color: '#123e2f', fontWeight: 600, fontSize: '13px' }} className="brand-title">
                      ⏱️ ประมาณ {calculateEstimatedTime(place.route_distance)}
                    </span>
                  </div>
                )}

                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                  {place.vr_image && (
                    <button
                      type="button"
                      className="card-vr-pill-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenVR(place);
                      }}
                    >
                      🕶️ VR 360°
                    </button>
                  )}
                  <button
                    type="button"
                    className="card-detail-pill-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewDetail(place, 'final-route');
                    }}
                  >
                    ดูรายละเอียดและแผนที่ →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '40px' }}>
          <button
            type="button"
            className="home-logout-pill-btn"
            style={{ background: '#123e2f', padding: '12px 28px', fontSize: '14.5px' }}
            onClick={onBackToHome}
          >
            🏠 เสร็จสิ้นและกลับหน้าหลัก
          </button>
          <button
            type="button"
            className="home-logout-pill-btn"
            style={{ background: '#64748b', padding: '12px 24px', fontSize: '14.5px' }}
            onClick={onBackToAiResult}
          >
            ← ปรับแต่งสถานที่
          </button>
        </div>
      </main>
    </div>
  );
}
