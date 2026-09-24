import React, { useState } from 'react';

// ช่องรหัสผ่านพร้อมปุ่มรูปตา กดเพื่อแสดง/ซ่อนรหัสที่พิมพ์ จะได้ตรวจว่าพิมพ์ถูกไหม
function PasswordInput({ className = 'login-text-input', ...inputProps }) {
  const [visible, setVisible] = useState(false);
  return (
    <>
      <input {...inputProps} type={visible ? 'text' : 'password'} className={className} />
      <button
        type="button"
        className="password-toggle-btn"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
        title={visible ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
      >
        {visible ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"></path>
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"></path>
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"></path>
            <line x1="1" y1="1" x2="23" y2="23"></line>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        )}
      </button>
    </>
  );
}

// ข้อความบอกทันทีว่ารหัสผ่านที่ยืนยันตรงกับรหัสผ่านหรือไม่ (แสดงเมื่อเริ่มพิมพ์ช่องยืนยันแล้ว)
export function PasswordMatchHint({ password, confirmPassword }) {
  if (!confirmPassword) return null;
  const matches = password === confirmPassword;
  return (
    <p className={`password-match-hint ${matches ? 'match' : 'mismatch'}`}>
      {matches ? '✓ รหัสผ่านตรงกัน' : '✗ รหัสผ่านยังไม่ตรงกัน'}
    </p>
  );
}

export default PasswordInput;
