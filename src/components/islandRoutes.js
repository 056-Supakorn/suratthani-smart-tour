import { toPoint } from './googleMapsRoute';

// ท่าเรือ (พิกัดจาก Google Maps)
const PIERS = {
  donsakSeatran: { name: 'ท่าเรือซีทรานเฟอร์รี่ ดอนสัก', lat: 9.3215811, lng: 99.7347602 },
  donsakRaja: { name: 'ท่าเรือราชาเฟอร์รี่ ดอนสัก', lat: 9.3290919, lng: 99.7446863 },
  donsakLomprayah: { name: 'ท่าเรือลมพระยา ดอนสัก', lat: 9.3375237, lng: 99.6815398 },
  nathon: { name: 'ท่าเรือหน้าทอน เกาะสมุย', lat: 9.5362747, lng: 99.9342809 },
  thongSala: { name: 'ท่าเรือท้องศาลา เกาะพะงัน', lat: 9.70889, lng: 99.98377 },
  maeHaad: { name: 'ท่าเรือแม่หาด เกาะเต่า', lat: 10.0847945, lng: 99.8242748 },
  cheowLan: { name: 'ท่าเรือเขื่อนรัชชประภา (เชี่ยวหลาน)', lat: 8.9771424, lng: 98.8203759 },
};

// พื้นที่ที่ต้องนั่งเรือไป (ขอบเขตเป็นกรอบละติจูด/ลองจิจูด)
// parent = พื้นที่ที่ต้องอยู่ก่อนขึ้นเรือ (null = แผ่นดินใหญ่), pier = ท่าเรือที่ขึ้นเรือ (อยู่ใน parent)
// arrival = ท่าเรือที่ลงบนเกาะ (null = ไม่มีถนน นั่งเรือถึงสถานที่เลย เช่น เรือทัวร์)
// เรียงพื้นที่ย่อยไว้ก่อนพื้นที่ที่ครอบอยู่ (เกาะนางยวนอยู่ในกรอบเกาะเต่า)
const ZONES = [
  {
    id: 'nangyuan', name: 'เกาะนางยวน', parent: 'tao',
    box: [10.108, 10.13, 99.8, 99.822],
    pier: PIERS.maeHaad, arrival: null, boat: 'ต่อเรือหางยาว/เรือแท็กซี่จากท่าเรือแม่หาดไปเกาะนางยวน',
  },
  {
    id: 'tao', name: 'เกาะเต่า', parent: null,
    box: [10.04, 10.14, 99.78, 99.87],
    pier: PIERS.donsakLomprayah, arrival: PIERS.maeHaad, boat: 'นั่งเรือจากท่าเรือดอนสักไปท่าเรือแม่หาด เกาะเต่า',
  },
  {
    id: 'phangan', name: 'เกาะพะงัน', parent: null,
    box: [9.65, 9.82, 99.94, 100.1],
    pier: PIERS.donsakRaja, arrival: PIERS.thongSala, boat: 'นั่งเรือข้ามฟากจากท่าเรือดอนสักไปท่าเรือท้องศาลา เกาะพะงัน',
  },
  {
    id: 'samui', name: 'เกาะสมุย', parent: null,
    box: [9.38, 9.61, 99.89, 100.12],
    pier: PIERS.donsakSeatran, arrival: PIERS.nathon, boat: 'นั่งเรือข้ามฟากจากท่าเรือดอนสักไปท่าเรือหน้าทอน เกาะสมุย',
  },
  {
    id: 'angthong', name: 'หมู่เกาะอ่างทอง', parent: 'samui',
    box: [9.55, 9.8, 99.55, 99.8],
    pier: PIERS.nathon, arrival: null, boat: 'นั่งเรือทัวร์จากท่าเรือหน้าทอนไปหมู่เกาะอ่างทอง',
  },
  {
    id: 'cheowlan', name: 'ในอ่างเก็บน้ำเขื่อนเชี่ยวหลาน', parent: null,
    box: [8.98, 9.15, 98.55, 98.8],
    pier: PIERS.cheowLan, arrival: null, boat: 'นั่งเรือหางยาวจากท่าเรือเขื่อนรัชชประภาไปยังสถานที่',
  },
];

const zoneById = (id) => ZONES.find((z) => z.id === id) || null;

export function findZone(lat, lng) {
  const p = toPoint(lat, lng);
  if (!p) return null;
  return ZONES.find(({ box: [latMin, latMax, lngMin, lngMax] }) =>
    p[0] >= latMin && p[0] <= latMax && p[1] >= lngMin && p[1] <= lngMax) || null;
}

// รายการพื้นที่ตั้งแต่แผ่นดินใหญ่ลงไปจนถึงพื้นที่นี้ เช่น อ่างทอง -> [samui, angthong]
const zoneChain = (zone) => {
  const chain = [];
  for (let z = zone; z; z = zoneById(z.parent)) chain.unshift(z);
  return chain;
};

const pierPoint = (pier) => ({ name: pier.name, lat: pier.lat, lng: pier.lng });

// แบ่งการเดินทางจาก from ไป to เป็นขั้นตอน: ขับรถ (นำทางด้วย Google Maps ได้) และนั่งเรือ (ข้อความบอก)
// from/to = { name, lat, lng }; from.lat ว่างได้ (ไม่รู้ตำแหน่งผู้ใช้ -> ให้ Google Maps ใช้ตำแหน่งปัจจุบัน)
export function planTripLeg(from, to) {
  const fromChain = zoneChain(findZone(from.lat, from.lng));
  const toChain = zoneChain(findZone(to.lat, to.lng));
  let common = 0;
  while (common < fromChain.length && common < toChain.length && fromChain[common] === toChain[common]) common++;

  const steps = [];
  let current = from;
  const driveTo = (target) => {
    const samePlace = current.lat === target.lat && current.lng === target.lng;
    if (!samePlace) steps.push({ type: 'drive', from: current, to: target });
    current = target;
  };

  // ขาออกจากเกาะ (จากพื้นที่ลึกสุดขึ้นมา): ไปท่าเรือบนเกาะ แล้วนั่งเรือกลับไปท่าเรือที่ขึ้นมา
  for (let i = fromChain.length - 1; i >= common; i--) {
    const zone = fromChain[i];
    if (zone.arrival) {
      driveTo(pierPoint(zone.arrival));
      steps.push({ type: 'boat', text: `นั่งเรือจาก${zone.arrival.name}กลับไป${zone.pier.name}` });
    } else {
      steps.push({ type: 'boat', text: `นั่งเรือกลับจาก${zone.name}ไป${zone.pier.name}` });
    }
    current = pierPoint(zone.pier);
  }

  // ขาเข้าเกาะ: ไปท่าเรือที่ขึ้นเรือ แล้วนั่งเรือไปท่าเรือบนเกาะ (หรือถึงสถานที่เลยถ้าไม่มีถนน)
  for (let i = common; i < toChain.length; i++) {
    const zone = toChain[i];
    driveTo(pierPoint(zone.pier));
    steps.push({ type: 'boat', text: zone.boat });
    current = zone.arrival ? pierPoint(zone.arrival) : to;
  }

  if (current !== to) {
    // ทั้งสองจุดอยู่ในพื้นที่เดียวกันที่ไม่มีถนน (เช่น หมู่เกาะอ่างทอง) ไปต่อด้วยเรือ
    const sharedZone = common > 0 && common === toChain.length ? toChain[common - 1] : null;
    if (sharedZone && !sharedZone.arrival) steps.push({ type: 'boat', text: `เดินทางด้วยเรือต่อไปยัง${to.name}` });
    else driveTo(to);
  }
  return steps;
}

// สถานที่ที่ไม่มีถนนเข้าถึง (เช่น เรือทัวร์) ให้เส้นทางรวมใน Google Maps ไปที่ท่าเรือแทน ไม่งั้นทั้งเส้นทางคำนวณไม่ได้
export function roadReachablePoint(place) {
  const zone = findZone(place.lat, place.lng);
  return zone && !zone.arrival ? { lat: zone.pier.lat, lng: zone.pier.lng } : place;
}
