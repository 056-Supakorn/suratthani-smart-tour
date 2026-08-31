import React, { useState } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../apiConfig';

export default function RegisterScreen({
  theme,
  toggleTheme,
  onGoToLogin,
  onRegisterTouristSuccess,
  onRegisterBusinessSuccess,
  initialName = '',
  initialEmail = '',
}) {
  // Role switcher: 'tourist' | 'business'
  const [role, setRole] = useState('tourist');

  // Common form fields
  const [fullName, setFullName] = useState(initialName);
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Tourist-specific fields (Baseline for AI)
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('male');

  // Business-specific fields
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('cafe');
  const [businessLicenseNumber, setBusinessLicenseNumber] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [uploadedDocName, setUploadedDocName] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedDocName(file.name);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Validation
    if (!fullName.trim() || !email.trim() || !password.trim()) {
      setErrorMessage('กรุณากรอกชื่อ-นามสกุล, อีเมล และรหัสผ่านให้ครบถ้วน');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('รหัสผ่านต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }

    if (role === 'tourist') {
      if (!age || parseInt(age) < 1 || parseInt(age) > 120) {
        setErrorMessage('กรุณาระบุอายุที่ถูกต้อง (เพื่อเป็นข้อมูลพื้นฐานสำหรับ AI)');
        return;
      }
    } else if (role === 'business') {
      if (!businessName.trim()) {
        setErrorMessage('กรุณาระบุชื่อสถานประกอบการ/ร้านค้าของคุณ');
        return;
      }
      if (!businessLicenseNumber.trim() && !uploadedDocName) {
        setErrorMessage('กรุณากรอกเลขทะเบียนพาณิชย์ หรือแนบไฟล์เอกสารยืนยันตัวตน');
        return;
      }
      if (!businessPhone.trim()) {
        setErrorMessage('กรุณาระบุเบอร์โทรศัพท์ติดต่อของสถานประกอบการ');
        return;
      }
    }

    setIsLoading(true);

    try {
      // Prepare user data
      const userData = {
        name: fullName.trim(),
        email: email.trim(),
        role: role,
        ...(role === 'tourist'
          ? { age: parseInt(age), gender }
          : {
              businessName: businessName.trim(),
              businessType,
              businessLicense: businessLicenseNumber.trim() || uploadedDocName,
              businessPhone: businessPhone.trim(),
              status: 'pending', // Pending Admin verification
            }),
      };

      // Save to localStorage
      localStorage.setItem('userName', fullName.trim());
      localStorage.setItem('userEmail', email.trim());
      localStorage.setItem('userRole', role);
      localStorage.setItem('userData', JSON.stringify(userData));

      // Attempt to save to backend if available
      try {
        await axios.post(`${API_BASE_URL}/save_user`, {
          name: fullName.trim(),
          email: email.trim(),
          preferences: role === 'tourist' ? `age:${age},gender:${gender}` : `business:${businessType}`,
        });
      } catch (err) {
        // Fallback gracefully if backend is offline
        console.log('Backend sync skipped, stored locally.');
      }

      setIsLoading(false);

      if (role === 'tourist') {
        onRegisterTouristSuccess(userData);
      } else {
        onRegisterBusinessSuccess(userData);
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง');
    }
  };

  return (
    <div className="login-root-container register-screen-root">
      <div className="login-card-container register-card-container">
        {/* ================= LEFT PANEL: REGISTRATION FORM ================= */}
        <div className="login-left-panel register-left-panel">
          {/* Theme Toggle Button */}
          <button
            type="button"
            className="login-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'เปลี่ยนเป็นโหมดสว่าง' : 'เปลี่ยนเป็นโหมดมืด'}
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

          {/* Header */}
          <div className="login-header-wrapper" style={{ marginBottom: '14px' }}>
            <div className="login-logo-badge" style={{ width: '56px', height: '56px', marginBottom: '8px' }}>
              <svg width="40" height="40" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
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
            <h1 className="login-heading-1" style={{ fontSize: '22px' }}>ลงทะเบียนสมาชิกใหม่</h1>
            <p className="login-heading-desc">เลือกประเภทบัญชีของคุณเพื่อเริ่มต้นใช้งานระบบ</p>
          </div>

          {/* ================= ROLE SWITCHER TABS ================= */}
          <div className="role-switcher-container">
            <button
              type="button"
              className={`role-switcher-btn ${role === 'tourist' ? 'active' : ''}`}
              onClick={() => { setRole('tourist'); setErrorMessage(''); }}
            >
              <span className="role-icon">🎒</span>
              <div className="role-btn-texts">
                <span className="role-btn-title">นักท่องเที่ยว</span>
                <span className="role-btn-sub">Tourist</span>
              </div>
            </button>

            <button
              type="button"
              className={`role-switcher-btn ${role === 'business' ? 'active' : ''}`}
              onClick={() => { setRole('business'); setErrorMessage(''); }}
            >
              <span className="role-icon">🏪</span>
              <div className="role-btn-texts">
                <span className="role-btn-title">ผู้ประกอบการ</span>
                <span className="role-btn-sub">Business</span>
              </div>
            </button>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="register-error-banner">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* ================= FORM ================= */}
          <form onSubmit={handleRegister} className="login-form-element register-form-scroll">
            {/* Common: Full Name */}
            <div className="login-form-group">
              <label className="login-field-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-label-icon">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span>ชื่อ-นามสกุล {role === 'business' ? '(ผู้ติดต่อ/เจ้าของร้าน)' : ''}</span>
              </label>
              <div className="login-input-box-wrapper">
                <input
                  type="text"
                  placeholder="เช่น สมชาย ใจดี"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="login-text-input"
                  required
                />
              </div>
            </div>

            {/* Common: Email */}
            <div className="login-form-group">
              <label className="login-field-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-label-icon">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>อีเมล (ใช้สำหรับเข้าสู่ระบบ)</span>
              </label>
              <div className="login-input-box-wrapper">
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-text-input"
                  required
                />
              </div>
            </div>

            {/* Common: Password & Confirm Password side by side */}
            <div className="register-two-col-grid">
              <div className="login-form-group">
                <label className="login-field-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-label-icon">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>รหัสผ่าน</span>
                </label>
                <div className="login-input-box-wrapper">
                  <input
                    type="password"
                    placeholder="อย่างน้อย 6 ตัวอักษร"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="login-text-input"
                    required
                  />
                </div>
              </div>

              <div className="login-form-group">
                <label className="login-field-label">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-label-icon">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                  <span>ยืนยันรหัสผ่าน</span>
                </label>
                <div className="login-input-box-wrapper">
                  <input
                    type="password"
                    placeholder="กรอกรหัสผ่านอีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="login-text-input"
                    required
                  />
                </div>
              </div>
            </div>

            {/* ================= ROLE: TOURIST FIELDS ================= */}
            {role === 'tourist' && (
              <div className="role-fields-section fade-in">
                <div className="role-section-header">
                  <span className="role-section-badge">ข้อมูลสำหรับ Baseline AI 🤖</span>
                </div>

                <div className="register-two-col-grid">
                  {/* Age */}
                  <div className="login-form-group">
                    <label className="login-field-label">
                      <span>🎂 อายุ (ปี)</span>
                    </label>
                    <div className="login-input-box-wrapper">
                      <input
                        type="number"
                        min="1"
                        max="120"
                        placeholder="เช่น 25"
                        value={age}
                        onChange={(e) => setAge(e.target.value)}
                        className="login-text-input"
                        required
                      />
                    </div>
                  </div>

                  {/* Gender */}
                  <div className="login-form-group">
                    <label className="login-field-label">
                      <span>🚻 เพศ</span>
                    </label>
                    <div className="login-input-box-wrapper">
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="login-text-input login-select-input"
                      >
                        <option value="male">ชาย (Male)</option>
                        <option value="female">หญิง (Female)</option>
                        <option value="lgbtq">LGBTQ+ / อื่นๆ</option>
                        <option value="unspecified">ไม่ระบุ</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ================= ROLE: BUSINESS FIELDS ================= */}
            {role === 'business' && (
              <div className="role-fields-section fade-in">
                <div className="role-section-header">
                  <span className="role-section-badge business-badge">ข้อมูลสถานประกอบการและการยืนยันตัวตน 🏛️</span>
                </div>

                {/* Business Name */}
                <div className="login-form-group">
                  <label className="login-field-label">
                    <span>🏢 ชื่อสถานประกอบการ / ชื่อร้าน</span>
                  </label>
                  <div className="login-input-box-wrapper">
                    <input
                      type="text"
                      placeholder="เช่น คาเฟ่ริมหาดสมุย, โฮมสเตย์บ้านดอน"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="login-text-input"
                      required
                    />
                  </div>
                </div>

                <div className="register-two-col-grid">
                  {/* Business Type */}
                  <div className="login-form-group">
                    <label className="login-field-label">
                      <span>🏷️ ประเภทธุรกิจ</span>
                    </label>
                    <div className="login-input-box-wrapper">
                      <select
                        value={businessType}
                        onChange={(e) => setBusinessType(e.target.value)}
                        className="login-text-input login-select-input"
                      >
                        <option value="cafe">☕ คาเฟ่ & เบเกอรี่</option>
                        <option value="food">🍲 ร้านอาหารพื้นบ้าน / ซีฟู้ด</option>
                        <option value="local">🏖️ แหล่งท่องเที่ยวชุมชน / วิถีชีวิต</option>
                        <option value="hotel">🏨 โรงแรม / ที่พัก / รีสอร์ท</option>
                        <option value="tour">🛶 กิจกรรมนำเที่ยว / ดำน้ำ</option>
                        <option value="temple">⛩️ สถานที่ท่องเที่ยวเชิงวัฒนธรรม</option>
                      </select>
                    </div>
                  </div>

                  {/* Phone */}
                  <div className="login-form-group">
                    <label className="login-field-label">
                      <span>📞 เบอร์โทรศัพท์ติดต่อ</span>
                    </label>
                    <div className="login-input-box-wrapper">
                      <input
                        type="tel"
                        placeholder="08X-XXX-XXXX"
                        value={businessPhone}
                        onChange={(e) => setBusinessPhone(e.target.value)}
                        className="login-text-input"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Verification Document / License */}
                <div className="login-form-group">
                  <label className="login-field-label">
                    <span>📑 เลขทะเบียนพาณิชย์ / ใบอนุญาต หรือ แนบเอกสาร (ป้องกันร้านค้าปลอม)</span>
                  </label>
                  <div className="business-verification-box">
                    <input
                      type="text"
                      placeholder="กรอกเลขทะเบียนพาณิชย์ (ถ้ามี)"
                      value={businessLicenseNumber}
                      onChange={(e) => setBusinessLicenseNumber(e.target.value)}
                      className="login-text-input"
                      style={{ marginBottom: '8px' }}
                    />
                    <div className="file-upload-wrapper">
                      <label className="file-upload-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                          <polyline points="17 8 12 3 7 8"></polyline>
                          <line x1="12" y1="3" x2="12" y2="15"></line>
                        </svg>
                        <span>แนบไฟล์เอกสารยืนยัน (PDF, JPG, PNG)</span>
                        <input
                          type="file"
                          accept=".pdf,image/*"
                          onChange={handleFileUpload}
                          style={{ display: 'none' }}
                        />
                      </label>
                      {uploadedDocName && (
                        <span className="uploaded-file-name">✅ {uploadedDocName}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="business-pending-notice">
                  ℹ️ <b>การอนุมัติร้านค้า:</b> เมื่อลงทะเบียนเสร็จ บัญชีของคุณจะมีสถานะ <b>"รอการอนุมัติ (Pending)"</b> โดยคุณสามารถเข้าไปเพิ่มข้อมูลสถานที่และอัปโหลดภาพ VR 360° ได้ทันที
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              className="login-primary-submit-btn"
              disabled={isLoading}
              style={{ marginTop: '14px' }}
            >
              <span>
                {isLoading
                  ? 'กำลังลงทะเบียน...'
                  : role === 'tourist'
                  ? 'ลงทะเบียนนักท่องเที่ยว ✨'
                  : 'ลงทะเบียนผู้ประกอบการ 🚀'}
              </span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="login-send-icon">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>

          {/* Back to Login Link */}
          <div className="register-footer-row">
            <span>มีบัญชีผู้ใช้งานอยู่แล้ว?</span>
            <button
              type="button"
              className="register-login-link-btn"
              onClick={onGoToLogin}
            >
              เข้าสู่ระบบที่นี่
            </button>
          </div>
        </div>

        {/* ================= RIGHT PANEL: INTERACTIVE PHOTO & MAP ================= */}
        <div className="login-right-panel">
          <div className="login-image-layer" />
          <div className="login-image-overlay" />

          {/* PIN 1: เกาะสมุย */}
          <div className="login-map-pin pin-samui">
            <div className="pin-card-pill">
              <div className="pin-icon-circle pin-icon-location">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
              <div className="pin-text-block">
                <span className="pin-title">เกาะสมุย</span>
                <span className="pin-subtitle">สุราษฎร์ธานี</span>
              </div>
            </div>
            <div className="pin-vertical-stem">
              <div className="pin-target-dot" />
            </div>
          </div>

          {/* PIN 2: ผู้ประกอบการและร้านค้า */}
          <div className="login-map-pin pin-distance">
            <div className="pin-card-pill">
              <div className="pin-icon-circle pin-icon-hotel" style={{ background: role === 'business' ? '#0f766e' : '#3b5a45' }}>
                {role === 'business' ? (
                  <span style={{ fontSize: '15px' }}>🏪</span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 4v16"></path>
                    <path d="M2 8h18a2 2 0 0 1 2 2v10"></path>
                    <path d="M2 17h20"></path>
                    <path d="M6 8v9"></path>
                  </svg>
                )}
              </div>
              <div className="pin-text-block">
                <span className="pin-title">{role === 'business' ? 'ระบบจัดการร้านค้า' : '1.2 km'}</span>
                <span className="pin-subtitle-multiline">{role === 'business' ? 'ปักหมุดร้าน & VR 360°' : 'จากที่พักของคุณ'}</span>
                <span className="pin-subtitle-multiline">{role === 'business' ? 'โปรโมตให้นักท่องเที่ยว' : 'ไปยังจุดหมาย'}</span>
              </div>
            </div>
            <div className="pin-distance-stem">
              <div className="pin-target-dot" />
            </div>
          </div>

          {/* PIN 3: หาดเฉวง */}
          <div className="login-map-pin pin-beach">
            <div className="pin-card-pill">
              <div className="pin-icon-circle pin-icon-beach">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20"></path>
                  <path d="M17 5H7a5 5 0 0 0-5 5c0 3 3 5 10 5s10-2 10-5a5 5 0 0 0-5-5z"></path>
                </svg>
              </div>
              <div className="pin-text-block">
                <span className="pin-title">หาดเฉวง</span>
                <span className="pin-subtitle">ชายหาดยอดนิยม</span>
              </div>
            </div>
            <div className="pin-horizontal-stem">
              <div className="pin-target-dot" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
