import React from 'react';
import ThemeToggleBtn from './ThemeToggleBtn';

export default function AiResultScreen({
  aiRoute,
  selectedTripPlaces,
  togglePlaceSelection,
  generateFinalRoute,
  budget,
  timeHours,
  timeUnit,
  estimatedCost,
  estimatedTimeHours,
  budgetWarning,
  onViewDetail,
  onResetSearch,
  onBackToHome,
  theme,
  toggleTheme,
}) {
  const getPlaceImage = (place) => {
    if (place.image && place.image.trim() !== '' && !place.image.startsWith('/images/')) {
      return place.image;
    }
    const tag = (place.tag || '').toLowerCase();
    const name = (place.name || '').toLowerCase();

    if (name.includes('แหลมโพธิ์') || name.includes('พุมเรียง')) {
      return 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('แหลมทราย') || tag.includes('ทะเล') || tag.includes('เกาะ')) {
      return 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80';
    }
    if (name.includes('เขาสก') || name.includes('เชี่ยวหลาน') || name.includes('รัชชประภา') || name.includes('จุดชมวิว')) {
      return 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=800&q=80';
    }
    if (tag.includes('วัด')) {
      return 'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=800&q=80';
    }
    if (tag.includes('คาเฟ่')) {
      return 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=800&q=80';
    }
    if (tag.includes('ร้านอาหาร') || tag.includes('อาหาร')) {
      return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80';
  };

  const categorizedData = Object.entries(
    aiRoute.reduce((acc, place) => {
      const tag = place.tag || 'ทั่วไป';
      if (!acc[tag]) acc[tag] = [];
      acc[tag].push(place);
      return acc;
    }, {})
  ).map(([tag, places]) => {
    const sorted = [...places].sort((a, b) => (a.distance_km || 9999) - (b.distance_km || 9999)).slice(0, 6);
    return [tag, sorted];
  });

  return (
    <div className="home-root-wrapper fade-in" style={{ paddingBottom: '120px' }}>
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
            onClick={onResetSearch}
            style={{ background: '#334155' }}
          >
            <span>🔍 ค้นหาเงื่อนไขใหม่</span>
          </button>
          <ThemeToggleBtn theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="home-main-container">
        {/* Results Header Card */}
        <section className="home-ai-planner-card" style={{ marginBottom: '28px', padding: '24px 32px' }}>
          <div className="ai-planner-left">
            <div className="ai-planner-robot-avatar" style={{ background: 'rgba(255,255,255,0.18)' }}>
              <span className="robot-face">🎯</span>
            </div>
            <div className="ai-planner-texts">
              <h2 className="ai-planner-title">สถานที่ที่ AI แนะนำสำหรับคุณ</h2>
              <p className="ai-planner-desc">
                คลิกปุ่ม <b>"➕ เพิ่มลงทริป"</b> เพื่อเลือกสถานที่เข้าสู่แผนการเดินทาง แล้วระบบจะคำนวณเส้นทางจุดต่อจุดให้ทันที
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', zIndex: 2, flexWrap: 'wrap' }}>
            <span className="filter-badge approved" style={{ background: '#ffffff', color: '#123e2f', fontWeight: 700 }}>
              💰 งบประมาณ: {budget} บ. (ใช้จริง {estimatedCost} บ.)
            </span>
            <span className="filter-badge approved" style={{ background: '#ffffff', color: '#123e2f', fontWeight: 700 }}>
              ⏱️ เวลา: {timeHours} {timeUnit === 'days' ? 'วัน' : timeUnit === 'weeks' ? 'สัปดาห์' : 'ชม.'} (ใช้จริง {estimatedTimeHours} ชม.)
            </span>
          </div>

          {budgetWarning && (
            <div
              style={{
                marginTop: '14px',
                background: 'rgba(255,255,255,0.9)',
                color: '#92400e',
                borderRadius: '14px',
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: 600,
                zIndex: 2,
              }}
            >
              ⚠️ {budgetWarning}
            </div>
          )}
        </section>

        {/* Categorized Attractions */}
        {categorizedData.length > 0 ? (
          categorizedData.map(([tag, sortedPlaces]) => (
            <section key={tag} style={{ marginBottom: '36px' }}>
              <div className="section-title-wrapper" style={{ textAlign: 'left', marginBottom: '16px' }}>
                <h3 className="section-main-title" style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🏷️ หมวดหมู่:</span>
                  <span style={{ color: '#059669' }}>{tag}</span>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>(แนะนำ {sortedPlaces.length} แห่ง)</span>
                </h3>
              </div>

              <div className="attraction-cards-grid-3col">
                {sortedPlaces.map((place) => {
                  const isSelected = selectedTripPlaces.some((p) => p.id === place.id);
                  const imgSrc = getPlaceImage(place);

                  return (
                    <div
                      key={place.id}
                      className={`surat-attraction-card ${isSelected ? 'selected-trip-card' : ''}`}
                      onClick={() => onViewDetail(place, 'ai-result')}
                      style={{
                        border: isSelected ? '2px solid #10b981' : undefined,
                        boxShadow: isSelected ? '0 10px 30px rgba(16, 185, 129, 0.25)' : undefined,
                      }}
                    >
                      <div className="card-photo-container">
                        <img src={imgSrc} alt={place.name} className="card-photo-img" loading="lazy" />
                        <span className="card-tag-pill-badge">{tag}</span>
                        {isSelected && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '12px',
                              right: '12px',
                              background: '#10b981',
                              color: '#fff',
                              borderRadius: '20px',
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                              zIndex: 2,
                            }}
                          >
                            ✓ เลือกแล้ว
                          </span>
                        )}
                      </div>

                      <div className="card-info-body">
                        <h3 className="card-place-title" title={place.name}>{place.name}</h3>
                        <p className="card-place-location">{place.location || 'สุราษฎร์ธานี'}</p>

                        {place.distance_km !== undefined && (
                          <div className="distance-pill-badge" style={{ marginBottom: '14px', width: 'fit-content' }}>
                            <span>🚗 ห่างจากคุณ {place.distance_km} กม.</span>
                          </div>
                        )}

                        <div className="card-action-btns-wrap" style={{ width: '100%' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              togglePlaceSelection(place);
                            }}
                            style={{
                              width: '100%',
                              padding: '10px',
                              borderRadius: '12px',
                              border: 'none',
                              fontFamily: 'Prompt, sans-serif',
                              fontSize: '13px',
                              fontWeight: 700,
                              cursor: 'pointer',
                              background: isSelected ? '#ef4444' : 'linear-gradient(135deg, #123e2f 0%, #059669 100%)',
                              color: '#ffffff',
                              boxShadow: isSelected ? '0 4px 12px rgba(239,68,68,0.3)' : '0 4px 12px rgba(5,150,105,0.3)',
                              transition: 'all 0.2s',
                            }}
                          >
                            {isSelected ? '❌ นำออกจากทริป' : '➕ เพิ่มลงทริป'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        ) : (
          <div className="loading-places-placeholder">
            <span className="loading-spinner-emoji">🤖</span>
            <h3>ไม่พบสถานที่ที่ตรงกับเงื่อนไข</h3>
            <p>ลองปรับเพิ่มงบประมาณ หรือเพิ่มเวลาที่มีในการท่องเที่ยวครับ</p>
          </div>
        )}
      </main>

      {/* Floating Bottom Trip Confirmation Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          padding: '16px 24px',
          boxSizing: 'border-box',
          background: theme === 'dark' ? 'rgba(25, 33, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(12px)',
          borderTop: `1px solid ${theme === 'dark' ? '#2e3846' : '#e2e8f0'}`,
          boxShadow: '0 -8px 24px rgba(0,0,0,0.08)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div style={{ maxWidth: '1140px', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={{ fontSize: '12.5px', color: '#64748b' }}>สถานที่ที่คุณเลือกเข้าทริป:</span>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: selectedTripPlaces.length > 0 ? '#059669' : '#64748b' }}>
              {selectedTripPlaces.length} แห่ง {selectedTripPlaces.length > 0 ? '✓' : ''}
            </h3>
          </div>

          <button
            type="button"
            className="ai-planner-cta-btn"
            disabled={selectedTripPlaces.length === 0}
            onClick={generateFinalRoute}
            style={{
              opacity: selectedTripPlaces.length > 0 ? 1 : 0.4,
              cursor: selectedTripPlaces.length > 0 ? 'pointer' : 'not-allowed',
            }}
          >
            <span>สร้างแผนการเดินทางจุดต่อจุด</span>
            <span>🚀</span>
          </button>
        </div>
      </div>
    </div>
  );
}
