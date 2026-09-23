import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../apiConfig';

// Forgot password: request a 6-digit code by email, then set a new password with it.
function ForgotPasswordForm({ initialEmail, onDone, onCancel }) {
  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState(initialEmail || '');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const timer = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const requestCode = async (e) => {
    e && e.preventDefault();
    if (!email.trim()) return;
    setIsBusy(true);
    setError('');
    try {
      const { data } = await axios.post(`${API_BASE_URL}/password_reset/request`, { email: email.trim() });
      if (data.status === 'success') {
        setMessage(data.message);
        setStep('code');
        setCooldown(60);
      } else {
        setError(data.message || 'ส่งรหัสไม่สำเร็จ กรุณาลองใหม่อีกครั้ง');
        if (data.retryAfter) {
          setCooldown(data.retryAfter);
          setStep('code');
        }
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsBusy(false);
    }
  };

  const confirmReset = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^\d{6}$/.test(code.trim())) {
      setError('กรุณากรอกรหัสยืนยัน 6 หลักจากอีเมล');
      return;
    }
    if (newPassword.length < 6) {
      setError('รหัสผ่านใหม่ต้องมีความยาวอย่างน้อย 6 ตัวอักษร');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('รหัสผ่านใหม่ทั้งสองช่องไม่ตรงกัน');
      return;
    }
    setIsBusy(true);
    try {
      const { data } = await axios.post(`${API_BASE_URL}/password_reset/confirm`, {
        email: email.trim(),
        code: code.trim(),
        new_password: newPassword,
      });
      if (data.status === 'success') {
        onDone(email.trim(), data.message);
      } else {
        setError(data.message || 'ตั้งรหัสผ่านใหม่ไม่สำเร็จ');
      }
    } catch (err) {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="login-form-element">
      <div className="login-header-wrapper" style={{ marginBottom: '8px' }}>
        <h2 className="login-heading-2">ลืมรหัสผ่าน</h2>
        <p className="login-heading-desc">
          {step === 'email'
            ? 'กรอกอีเมลที่ใช้สมัคร เราจะส่งรหัสยืนยัน 6 หลักไปให้'
            : 'กรอกรหัสยืนยันจากอีเมล แล้วตั้งรหัสผ่านใหม่'}
        </p>
      </div>

      {step === 'email' ? (
        <form onSubmit={requestCode}>
          <div className="login-form-group">
            <label className="login-field-label"><span>อีเมล</span></label>
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
          {error && <p className="forgot-error-text">{error}</p>}
          <button type="submit" className="login-primary-submit-btn" disabled={!email.trim() || isBusy}>
            <span>{isBusy ? 'กำลังส่งรหัส...' : 'ส่งรหัสยืนยันทางอีเมล'}</span>
          </button>
        </form>
      ) : (
        <form onSubmit={confirmReset}>
          {message && <p className="forgot-info-text">{message}</p>}
          <div className="login-form-group">
            <label className="login-field-label"><span>รหัสยืนยัน 6 หลัก</span></label>
            <div className="login-input-box-wrapper">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="เช่น 123456"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="login-text-input"
                required
              />
            </div>
          </div>
          <div className="login-form-group">
            <label className="login-field-label"><span>รหัสผ่านใหม่</span></label>
            <div className="login-input-box-wrapper">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="อย่างน้อย 6 ตัวอักษร"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="login-text-input"
                required
              />
            </div>
          </div>
          <div className="login-form-group">
            <label className="login-field-label"><span>ยืนยันรหัสผ่านใหม่</span></label>
            <div className="login-input-box-wrapper">
              <input
                type="password"
                autoComplete="new-password"
                placeholder="กรอกรหัสผ่านใหม่อีกครั้ง"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="login-text-input"
                required
              />
            </div>
          </div>
          {error && <p className="forgot-error-text">{error}</p>}
          <button type="submit" className="login-primary-submit-btn" disabled={isBusy}>
            <span>{isBusy ? 'กำลังบันทึก...' : 'ตั้งรหัสผ่านใหม่'}</span>
          </button>
          <button
            type="button"
            className="login-forgot-btn forgot-resend-btn"
            onClick={requestCode}
            disabled={cooldown > 0 || isBusy}
          >
            {cooldown > 0 ? `ขอรหัสใหม่ได้ในอีก ${cooldown} วินาที` : 'ไม่ได้รับรหัส? ส่งรหัสอีกครั้ง'}
          </button>
        </form>
      )}

      <div className="login-register-prompt-box">
        <button type="button" className="login-register-btn-link" onClick={onCancel}>
          ← กลับไปหน้าเข้าสู่ระบบ
        </button>
      </div>
    </div>
  );
}

export default function LoginScreen({
  inputEmail,
  setInputEmail,
  inputPassword,
  setInputPassword,
  isLoggingIn,
  handleLogin,
  theme,
  toggleTheme,
  onGoToRegister,
}) {
  const [rememberMe, setRememberMe] = useState(true);
  const [showForgot, setShowForgot] = useState(false);
  const [notice, setNotice] = useState('');

  const handleSubmit = (e) => {
    e && e.preventDefault && e.preventDefault();
    if (rememberMe) {
      localStorage.setItem('rememberMe', 'true');
    } else {
      localStorage.removeItem('rememberMe');
    }
    handleLogin();
  };

  const handleSocialLogin = (provider) => {
    alert(`เข้าสู่ระบบด้วย ${provider} กำลังอยู่ในช่วงพัฒนา ขออภัยในความไม่สะดวกครับ`);
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setNotice('');
    setShowForgot(true);
  };

  const handleResetDone = (email, message) => {
    setInputEmail(email);
    setInputPassword('');
    setNotice(message);
    setShowForgot(false);
  };

  return (
    <div className="login-root-container">
      <div className="login-card-container">
        {/* ================= LEFT PANEL: LOGIN FORM ================= */}
        <div className="login-left-panel">
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

          {/* Logo & Header */}
          <div className="login-header-wrapper">
            <div className="login-logo-badge">
              <svg width="48" height="48" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Sun */}
                <circle cx="44" cy="30" r="5.5" fill="#f59e0b" />
                <circle cx="44" cy="22" r="1" fill="#f59e0b" />
                <circle cx="44" cy="38" r="1" fill="#f59e0b" />
                <circle cx="36" cy="30" r="1" fill="#f59e0b" />
                <circle cx="52" cy="30" r="1" fill="#f59e0b" />
                <circle cx="38.5" cy="24.5" r="1" fill="#f59e0b" />
                <circle cx="49.5" cy="35.5" r="1" fill="#f59e0b" />
                <circle cx="38.5" cy="35.5" r="1" fill="#f59e0b" />
                <circle cx="49.5" cy="24.5" r="1" fill="#f59e0b" />

                {/* Island / Sand Base */}
                <path d="M12 50C18 45 42 45 52 50C44 52 20 52 12 50Z" fill="#3a5a40" />
                <path d="M16 48.5C22 46 38 46 48 48.5C40 50 24 50 16 48.5Z" fill="#588157" />

                {/* Palm Trunk */}
                <path d="M31 48C30.5 40 33 28 32 21C31 21 34 21 34.5 22C35 28 33 40 34 48H31Z" fill="#5c4033" />
                
                {/* Palm Leaves */}
                {/* Top Center Frond */}
                <path d="M33 21C33 13 31 10 28 8C33 11 36 15 33 21Z" fill="#1b4332" />
                <path d="M33 21C33 13 36 10 39 8C35 11 34 15 33 21Z" fill="#2d6a4f" />
                
                {/* Left Fronds */}
                <path d="M32 21C26 17 18 19 14 24C19 21 28 22 32 21Z" fill="#1b4332" />
                <path d="M32 22C24 23 18 29 16 34C20 29 27 27 32 22Z" fill="#2d6a4f" />

                {/* Right Fronds */}
                <path d="M34 21C40 17 48 19 52 24C47 21 38 22 34 21Z" fill="#1b4332" />
                <path d="M34 22C42 23 48 29 50 34C46 29 39 27 34 22Z" fill="#2d6a4f" />

                {/* Center Core */}
                <circle cx="33" cy="21" r="2.5" fill="#1b4332" />
              </svg>
            </div>

            <h1 className="login-heading-1">ระบบแนะนำสถานที่ท่องเที่ยว</h1>
            <h2 className="login-heading-2">ในจังหวัดสุราษฎร์ธานี</h2>
            <p className="login-heading-desc">กรุณากรอกข้อมูลของคุณเพื่อเข้าใช้งานระบบ</p>
          </div>

          {showForgot ? (
            <ForgotPasswordForm
              initialEmail={inputEmail}
              onDone={handleResetDone}
              onCancel={() => setShowForgot(false)}
            />
          ) : (
          <>
          {notice && <p className="forgot-info-text">{notice}</p>}
          {/* Form */}
          <form onSubmit={handleSubmit} className="login-form-element">
            {/* Input Email */}
            <div className="login-form-group">
              <label className="login-field-label">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-label-icon">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
                <span>อีเมล (เพื่อยืนยันตัวตน)</span>
              </label>
              <div className="login-input-box-wrapper">
                <input
                  type="email"
                  placeholder="example@email.com"
                  value={inputEmail}
                  onChange={(e) => setInputEmail(e.target.value)}
                  className="login-text-input"
                  required
                />
                <span className="login-field-suffix-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"></path>
                  </svg>
                </span>
              </div>
            </div>

            {/* Input Password */}
            <div className="login-form-group">
              <label className="login-field-label">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="login-label-icon">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>รหัสผ่าน</span>
              </label>
              <div className="login-input-box-wrapper">
                <input
                  type="password"
                  placeholder="รหัสผ่านของคุณ"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  className="login-text-input"
                />
              </div>
            </div>

            {/* Options Row */}
            <div className="login-options-row">
              <label className="login-remember-container" onClick={() => setRememberMe(!rememberMe)}>
                <span className={`login-custom-checkbox ${rememberMe ? 'checked' : ''}`}>
                  {rememberMe && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  )}
                </span>
                <span className="login-remember-text">จดจำฉันไว้ในระบบ</span>
              </label>

              <button
                type="button"
                className="login-forgot-btn"
                onClick={handleForgotPassword}
              >
                ลืมรหัสผ่าน?
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="login-primary-submit-btn"
              disabled={!inputEmail.trim() || isLoggingIn}
            >
              <span>{isLoggingIn ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" className="login-send-icon">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </form>

          {/* Registration Link Prompt */}
          <div className="login-register-prompt-box">
            <span className="login-register-prompt-text">ยังไม่มีบัญชีผู้ใช้งาน?</span>
            <button
              type="button"
              className="login-register-btn-link"
              onClick={onGoToRegister}
            >
              ลงทะเบียนเข้าใช้งานที่นี่ ✨
            </button>
          </div>
          </>
          )}

          {/* Security Note Footer */}
          <div className="login-security-footer">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            <span>ข้อมูลของคุณปลอดภัยและถูกเก็บเป็นความลับ</span>
          </div>

        </div>

        {/* ================= RIGHT PANEL: INTERACTIVE PHOTO & MAP ================= */}
        <div className="login-right-panel">
          <div className="login-image-layer" />
          <div className="login-image-overlay" />

          {/* PIN 1: เกาะสมุย (Top-Left Island Pin) */}
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

          {/* PIN 2: ระยะทาง 1.2 km (Right Center Trail Pin) */}
          <div className="login-map-pin pin-distance">
            <div className="pin-card-pill">
              <div className="pin-icon-circle pin-icon-hotel">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 4v16"></path>
                  <path d="M2 8h18a2 2 0 0 1 2 2v10"></path>
                  <path d="M2 17h20"></path>
                  <path d="M6 8v9"></path>
                </svg>
              </div>
              <div className="pin-text-block">
                <span className="pin-title">1.2 km</span>
                <span className="pin-subtitle-multiline">จากที่พักของคุณ</span>
                <span className="pin-subtitle-multiline">ไปยังจุดหมาย</span>
              </div>
            </div>
            <div className="pin-distance-stem">
              <div className="pin-target-dot" />
            </div>
          </div>

          {/* PIN 3: หาดเฉวง (Bottom Left Beach Pin) */}
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
