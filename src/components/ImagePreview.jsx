import React, { useState } from 'react';

// A pasted Google Images result (google.com/imgres?...&imgurl=...) is a web page, not a
// picture - pull the real image address out of its `imgurl` parameter instead.
export function cleanImageUrl(value) {
  const trimmed = (value || '').trim();
  try {
    const url = new URL(trimmed);
    const realImage = url.searchParams.get('imgurl');
    if (/(^|\.)google\./.test(url.hostname) && realImage) return realImage;
  } catch (e) {
    // not an absolute URL (e.g. /images/...) - keep as typed
  }
  return trimmed;
}

// Preview thumbnail that warns right away when the link doesn't load as an image,
// instead of silently showing a broken picture after the place is saved.
export default function ImagePreview({ src, alt, style }) {
  const [failedSrc, setFailedSrc] = useState(null);

  if (!src) return null;
  if (failedSrc === src) {
    return (
      <p className="upload-status-hint image-preview-error">
        ⚠️ ไม่สามารถแสดงรูปจากลิงก์นี้ได้ (อาจเป็นลิงก์หน้าเว็บ ไม่ใช่ลิงก์รูปภาพโดยตรง หรือเว็บต้นทางไม่อนุญาตให้นำรูปไปแสดง)
        กรุณาบันทึกรูปลงเครื่องแล้วอัปโหลดเป็นไฟล์แทน
      </p>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="image-preview-thumb"
      style={style}
      onError={() => setFailedSrc(src)}
    />
  );
}
