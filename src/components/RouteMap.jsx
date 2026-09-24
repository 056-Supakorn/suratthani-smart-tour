import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { toPoint } from './googleMapsRoute';

const escapeHtml = (text) =>
  String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// แผนที่ OpenStreetMap แสดงหมุดตามลำดับจุดที่ 1, 2, 3... และตำแหน่งของผู้ใช้ (ถ้ามี)
// เส้นเชื่อมเป็นเส้นตรงระหว่างจุด (ไม่ใช่เส้นทางถนนจริง) ตรงกับระยะทางที่แสดงในการ์ด
export default function RouteMap({ places, userLat, userLng }) {
  const containerRef = useRef(null);

  useEffect(() => {
    const map = L.map(containerRef.current, { scrollWheelZoom: false });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    const linePoints = [];
    const userPoint = toPoint(userLat, userLng);
    if (userPoint) {
      L.marker(userPoint, {
        icon: L.divIcon({ className: '', html: '<div class="route-map-user-dot"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
        zIndexOffset: -100,
      }).addTo(map).bindPopup('📍 ตำแหน่งของคุณ');
      linePoints.push(userPoint);
    }

    places.forEach((place, index) => {
      const point = toPoint(place.lat, place.lng);
      if (!point) return;
      L.marker(point, {
        icon: L.divIcon({
          className: '',
          html: `<div class="route-map-pin"><span>${index + 1}</span></div>`,
          iconSize: [32, 40],
          iconAnchor: [16, 40],
          popupAnchor: [0, -36],
        }),
      }).addTo(map).bindPopup(`<b>จุดที่ ${index + 1}</b><br>${escapeHtml(place.name)}`);
      linePoints.push(point);
    });

    if (linePoints.length > 1) {
      L.polyline(linePoints, { color: '#059669', weight: 3, opacity: 0.8, dashArray: '6 8' }).addTo(map);
      map.fitBounds(L.latLngBounds(linePoints), { padding: [36, 36], maxZoom: 15 });
    } else if (linePoints.length === 1) {
      map.setView(linePoints[0], 14);
    } else {
      map.setView([9.1382, 99.3215], 9); // ตัวเมืองสุราษฎร์ธานี
    }

    return () => map.remove();
  }, [places, userLat, userLng]);

  return <div ref={containerRef} className="route-map-container" />;
}
