export const toPoint = (lat, lng) => {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  return Number.isFinite(la) && Number.isFinite(ln) ? [la, ln] : null;
};

// ลิงก์เปิดเส้นทางใน Google Maps เริ่มจากตำแหน่งของผู้ใช้ ผ่านทุกจุดตามลำดับ
// ต้องใส่ origin เอง: ถ้าไม่ใส่ Google Maps บนเว็บมือถือจะให้เลือกจุดเริ่มต้นและไม่แสดงเส้นทาง
export function buildGoogleMapsRouteUrl(places, userLat, userLng) {
  const points = places.map((p) => toPoint(p.lat, p.lng)).filter(Boolean).map(([la, ln]) => `${la},${ln}`);
  if (points.length === 0) return null;
  const params = new URLSearchParams({ api: '1' });
  const origin = toPoint(userLat, userLng);
  if (origin) params.set('origin', `${origin[0]},${origin[1]}`);
  params.set('destination', points[points.length - 1]);
  if (points.length > 1) params.set('waypoints', points.slice(0, -1).join('|'));
  params.set('travelmode', 'driving');
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
