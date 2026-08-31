import React, { useState } from 'react';
import ThemeToggleBtn from './ThemeToggleBtn';

export default function HomeScreen({
  userName,
  userRole,
  lastPref,
  homePlaces,
  searchQuery,
  setSearchQuery,
  onSearch,
  onStartAiTrip,
  onViewDetail,
  onOpenVR,
  onLogout,
  onReturnToRolePortal,
  theme,
  toggleTheme,
}) {
  const [favorites, setFavorites] = useState({});

  const effectiveRole = userRole || localStorage.getItem('userRole');

  const toggleFavorite = (e, placeId) => {
    e.stopPropagation();
    setFavorites((prev) => ({
      ...prev,
      [placeId]: !prev[placeId],
    }));
  };

  // Fallback high-res curated photos for attractions if image URL is empty or broken
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
    if (tag.includes('ชุมชน')) {
      return 'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80';
    }
    return 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80';
  };

  // Format Location string cleanly (e.g. "อ.ไชยา, สุราษฎร์ธานี")
  const formatLocation = (loc) => {
    if (!loc) return 'สุราษฎร์ธานี';
    if (loc.includes('สุราษฎร์ธานี')) return loc;
    return `${loc}, สุราษฎร์ธานี`;
  };

  // Calculate or display approximate distance
  const getDistanceText = (place, index) => {
    if (place.distance_km) {
      return `ระยะทาง ${place.distance_km} กม.`;
    }
    const defaultDistances = [35, 42, 67, 18, 25, 54, 80, 15, 62, 48, 28, 90];
    const dist = defaultDistances[index % defaultDistances.length];
    return `ระยะทาง ${dist} กม.`;
  };

  const displayName = userName || localStorage.getItem('userName') || 'สมชาย';

  return (
    <div className="home-root-wrapper fade-in">
      {/* ================= 1. TOP NAVIGATION BAR ================= */}
      <header className="home-top-nav">
        <div className="home-nav-brand">
          <div className="home-logo-badge">
            <svg width="34" height="34" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="44" cy="30" r="5.5" fill="#f59e0b" />
              <path d="M12 50C18 45 42 45 52 50C44 52 20 52 12 50Z" fill="#3a5a40" />
              <path d="M31 48C30.5 40 33 28 32 21C31 21 34 21 34.5 22C35 28 33 40 34 48H31Z" fill="#5c4033" />
              <path d="M33 21C33 13 31 10 28 8C33 11 36 15 33 21Z" fill="#1b4332" />
              <path d="M33 21C33 13 36 10 39 8C35 11 34 15 33 21Z" fill="#2d6a4f" />
              <path d="M32 21C26 17 18 19 14 24C19 21 28 22 32 21Z" fill="#1b4332" />
              <path d="M34 21C40 17 48 19 52 24C47 21 38 22 34 21Z" fill="#1b4332" />
              <circle cx="33" cy="21" r="2.5" fill="#1b4332" />
            </svg>
          </div>
          <div className="home-brand-text">
            <span className="brand-title">ระบบแนะนำสถานที่ท่องเที่ยว</span>
            <span className="brand-subtitle">จังหวัดสุราษฎร์ธานี</span>
          </div>
        </div>

        <div className="home-nav-actions">
          {effectiveRole === 'admin' && (
            <button
              type="button"
              className="home-role-switch-btn admin-badge"
              onClick={() => onReturnToRolePortal && onReturnToRolePortal('admin')}
              title="กลับสู่ระบบผู้ดูแลระบบ (Admin Portal)"
            >
              <span>🛡️ กลับสู่ Admin Portal</span>
            </button>
          )}

          {effectiveRole === 'business' && (
            <button
              type="button"
              className="home-role-switch-btn business-badge"
              onClick={() => onReturnToRolePortal && onReturnToRolePortal('business')}
              title="กลับสู่ระบบผู้ประกอบการ (Business Portal)"
            >
              <span>🏪 กลับสู่ระบบร้านค้า</span>
            </button>
          )}

          <button
            type="button"
            className="home-logout-pill-btn"
            onClick={onLogout}
            title="ออกจากระบบ"
          >
            <span className="logout-icon">📙</span>
            <span>ออกจากระบบ</span>
          </button>

          <ThemeToggleBtn theme={theme} toggleTheme={toggleTheme} />
        </div>
      </header>

      <main className="home-main-container">
        {/* ================= 2. HERO PANORAMIC BANNER ================= */}
        <section className="home-hero-panorama">
          <div className="hero-panorama-bg" />
          <div className="hero-panorama-overlay" />
          
          <div className="hero-panorama-content">
            <h1 className="hero-welcome-heading">
              สวัสดีคุณ <span className="hero-name-text">{displayName}!</span> <span className="wave-hand">👋</span>
            </h1>
            <p className="hero-welcome-subheading">
              ยินดีต้อนรับสู่ระบบแนะนำสถานที่ท่องเที่ยวจังหวัดสุราษฎร์ธานี
            </p>
          </div>

          {/* Bottom Left Floating Badge */}
          <div className="hero-location-floating-tag">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>สุราษฎร์ธานี เมืองแห่งธรรมชาติ</span>
          </div>
        </section>

        {/* ================= 3. AI TRIP PLANNER BANNER CARD ================= */}
        <section className="home-ai-planner-card">
          {/* Subtle Map SVG trail backdrop */}
          <div className="ai-planner-backdrop-trail" />

          <div className="ai-planner-left">
            <div className="ai-planner-robot-avatar">
              <div className="ai-robot-head">
                <span className="robot-face">🤖</span>
                <span className="robot-glow-stars">✨</span>
              </div>
            </div>
            <div className="ai-planner-texts">
              <h2 className="ai-planner-title">ให้ AI จัดทริปให้คุณ</h2>
              <p className="ai-planner-desc">
                ระบบจะวางแผนสถานที่ท่องเที่ยวที่เหมาะกับคุณ พร้อมงบประมาณ เวลา และสไตล์ที่ชอบ
              </p>
            </div>
          </div>

          <button
            type="button"
            className="ai-planner-cta-btn"
            onClick={onStartAiTrip}
          >
            <span>เริ่มแนะนำเลย</span>
            <span className="cta-sparkle">✨</span>
          </button>
        </section>

        {/* ================= 4. FLOATING SEARCH BAR ================= */}
        <section className="home-search-bar-wrap">
          <div className="home-search-pill-box">
            <div className="search-input-inner">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="search-pill-icon">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSearch();
                }}
                placeholder="ค้นหาสถานที่, อำเภอ หรือหมวดหมู่..."
                className="search-pill-input"
              />
            </div>
            <button
              type="button"
              className="search-pill-submit-btn"
              onClick={onSearch}
            >
              ค้นหา
            </button>
          </div>
        </section>

        {/* ================= 5. POPULAR ATTRACTIONS SECTION ================= */}
        <section className="home-attractions-section">
          <div className="section-title-wrapper">
            <h2 className="section-main-title">สถานที่ท่องเที่ยวยอดนิยม</h2>
            <p className="section-sub-title">
              {lastPref ? `(แนะนำตามสไตล์คุณ)` : '(ไฮไลท์และแลนด์มาร์กห้ามพลาด)'}
            </p>
          </div>

          {/* Cards Grid */}
          <div className="attraction-cards-grid-3col">
            {homePlaces && homePlaces.length > 0 ? (
              homePlaces.slice(0, 12).map((place, index) => {
                const isFav = favorites[place.id];
                const imgSrc = getPlaceImage(place);
                const tagLabel = place.tag || 'ธรรมชาติ';

                return (
                  <div
                    key={place.id || index}
                    className="surat-attraction-card"
                    onClick={() => onViewDetail(place, 'home')}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') onViewDetail(place, 'home');
                    }}
                  >
                    {/* Card Image Area */}
                    <div className="card-photo-container">
                      <img
                        src={imgSrc}
                        alt={place.name}
                        className="card-photo-img"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?auto=format&fit=crop&w=800&q=80';
                        }}
                      />

                      {/* Top Left Tag Badge */}
                      <span className="card-tag-pill-badge">
                        {tagLabel === 'sea' || tagLabel === 'ทะเล' ? 'เกาะ/ทะเล' : tagLabel}
                      </span>

                      {/* Top Right Heart Favorite Button */}
                      <button
                        type="button"
                        className={`card-heart-btn ${isFav ? 'is-favorited' : ''}`}
                        onClick={(e) => toggleFavorite(e, place.id)}
                        title={isFav ? 'เลิกบันทึกรายการโปรด' : 'บันทึกรายการโปรด'}
                      >
                        {isFav ? '❤️' : '♡'}
                      </button>
                    </div>

                    {/* Card Content Area */}
                    <div className="card-info-body">
                      <h3 className="card-place-title" title={place.name}>
                        {place.name}
                      </h3>
                      <p className="card-place-location">
                        {formatLocation(place.location)}
                      </p>

                      {/* Card Bottom Meta Row */}
                      <div className="card-bottom-row">
                        <div className="distance-pill-badge">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                            <circle cx="12" cy="10" r="3"></circle>
                          </svg>
                          <span>{getDistanceText(place, index)}</span>
                        </div>

                        <div className="card-action-btns-wrap">
                          {place.vr_image && (
                            <button
                              type="button"
                              className="card-vr-pill-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenVR(place);
                              }}
                              title="ดูภาพเสมือนจริง 360°"
                            >
                              🕶️ VR
                            </button>
                          )}
                          <button
                            type="button"
                            className="card-detail-pill-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              onViewDetail(place, 'home');
                            }}
                          >
                            ดูรายละเอียด
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="loading-places-placeholder">
                <span className="loading-spinner-emoji">🌴</span>
                <p>กำลังโหลดสถานที่ท่องเที่ยวสุราษฎร์ธานี...</p>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Decorative leaf watermarks at bottom */}
      <div className="home-leaf-decor leaf-bottom-left" />
      <div className="home-leaf-decor leaf-bottom-right" />
    </div>
  );
}
