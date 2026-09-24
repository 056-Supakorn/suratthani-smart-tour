export const toPoint = (lat, lng) => {
  const la = parseFloat(lat);
  const ln = parseFloat(lng);
  return Number.isFinite(la) && Number.isFinite(ln) ? [la, ln] : null;
};

// ลิงก์เปิดเส้นทางใน Google Maps เริ่มจากตำแหน่งปัจจุบันของผู้ใช้ ผ่านทุกจุดตามลำดับ
export function buildGoogleMapsRouteUrl(places) {
  const points = places.map((p) => toPoint(p.lat, p.lng)).filter(Boolean).map(([la, ln]) => `${la},${ln}`);
  if (points.length === 0) return null;
  const params = new URLSearchParams({ api: '1', destination: points[points.length - 1], travelmode: 'driving' });
  if (points.length > 1) params.set('waypoints', points.slice(0, -1).join('|'));
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
