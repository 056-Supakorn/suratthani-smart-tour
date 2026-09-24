import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL, getAuthToken, setAuthToken } from './apiConfig';
import { useSessionState, readSessionState, clearSessionState } from './sessionState';
import './App.css';
import './Login.css';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import MerchantAddPoiScreen from './components/MerchantAddPoiScreen';
import OnboardingScreen from './components/OnboardingScreen';
import HomeScreen from './components/HomeScreen';
import AdminScreen from './components/AdminScreen';
import SearchResultsScreen from './components/SearchResultsScreen';
import AiInputScreen from './components/AiInputScreen';
import AiResultScreen from './components/AiResultScreen';
import FinalRouteScreen from './components/FinalRouteScreen';
import DetailScreen from './components/DetailScreen';

// หมวดหมู่สถานที่
const categories = [
  { id: 'sea', label: 'ทะเลและหมู่เกาะ' },
  { id: 'mountain', label: 'ธรรมชาติและภูเขา' },
  { id: 'temple', label: 'วัดและวัฒนธรรม' },
  { id: 'local', label: 'วิถีชีวิตชุมชน' },
  { id: 'cafe', label: 'คาเฟ่สไตล์ชิคๆ' },
  { id: 'food', label: 'ร้านอาหารพื้นบ้าน Unseen' }
];

// ตัวเลือกอารมณ์การเที่ยว (Trip Moods)
const moodOptions = [
  { id: 'chill', label: '🌿 เน้นพักผ่อน / ชิลๆ' },
  { id: 'adventure', label: '⛰️ ผจญภัย / ลุยๆ' },
  { id: 'culture', label: '⛩️ วัฒนธรรม / ประวัติศาสตร์' },
  { id: 'social', label: '📸 สายคาเฟ่ / ถ่ายรูป' }
];

// ข้อความของตัวแสดงภาพ VR (Pannellum) เป็นภาษาไทย แทนข้อความ error ภาษาอังกฤษ
const VR_VIEWER_STRINGS_TH = {
  loadButtonLabel: 'แตะเพื่อ<br>โหลดภาพ VR 360°',
  loadingLabel: 'กำลังโหลด...',
  bylineLabel: 'โดย %s',
  noPanoramaError: 'ขออภัย ยังไม่มีภาพ VR ของสถานที่นี้ในขณะนี้',
  fileAccessError: 'ขออภัย ยังไม่มีภาพ VR ของสถานที่นี้ในขณะนี้',
  malformedURLError: 'ขออภัย ลิงก์ภาพ VR ของสถานที่นี้ไม่ถูกต้อง',
  iOS8WebGLError: 'อุปกรณ์นี้ไม่รองรับการแสดงภาพ VR 360°',
  genericWebGLError: 'เบราว์เซอร์นี้ไม่รองรับการแสดงภาพ VR 360° กรุณาลองเปิดด้วย Chrome หรือ Safari เวอร์ชันล่าสุด',
  textureSizeError: 'ภาพ VR นี้ใหญ่เกินกว่าที่อุปกรณ์นี้รองรับ กรุณาลองเปิดจากอุปกรณ์อื่น',
  unknownError: 'เกิดข้อผิดพลาดในการแสดงภาพ VR กรุณาลองใหม่อีกครั้ง',
};

// หน้าที่ต้องเข้าสู่ระบบก่อน และหน้าที่ต้องมีข้อมูลประกอบ (ใช้ตรวจตอนกู้คืนหน้าหลังรีเฟรช)
const LOGGED_OUT_SCREENS = ['login', 'register'];
const TOURIST_SCREENS = ['onboarding', 'home', 'search-results', 'ai-input', 'ai-result', 'final-route', 'detail'];

// ผู้ใช้ที่ล็อกอินไว้ก่อนระบบมี token (หรือล็อกอินแบบออฟไลน์) จะเรียก API ที่ต้องยืนยันตัวตนไม่ได้
// จึงให้ออกจากระบบแล้วล็อกอินใหม่หนึ่งครั้ง (แอดมินใช้ adminKey แยกต่างหาก ไม่ได้รับผลกระทบ)
function dropSessionWithoutToken() {
  if (localStorage.getItem('userName') && localStorage.getItem('userRole') !== 'admin' && !getAuthToken()) {
    localStorage.clear();
    clearSessionState();
  }
}

// เลือกหน้าที่จะแสดงตอนเปิด/รีเฟรช: ใช้หน้าที่บันทึกไว้ถ้ายังใช้ได้ ไม่งั้นใช้หน้าเริ่มต้นตามบทบาท
function resolveInitialScreen() {
  dropSessionWithoutToken();
  const user = localStorage.getItem('userName');
  const pref = localStorage.getItem('userPref');
  const role = localStorage.getItem('userRole');

  const defaultScreen = !user
    ? 'login'
    : role === 'business'
    ? 'merchant-add-poi'
    : role === 'admin'
    ? 'admin'
    : (!pref ? 'onboarding' : 'home');

  const saved = readSessionState('currentScreen', null);
  if (!saved) return defaultScreen;
  if (!user) return LOGGED_OUT_SCREENS.includes(saved) ? saved : 'login';

  const hasData = {
    'detail': !!readSessionState('selectedAttraction', null),
    'ai-result': readSessionState('aiRoute', []).length > 0,
    'final-route': readSessionState('finalRoutePlan', []).length > 0,
  };
  const allowed =
    (saved === 'admin' && role === 'admin') ||
    (saved === 'merchant-add-poi' && role === 'business') ||
    (TOURIST_SCREENS.includes(saved) && hasData[saved] !== false);
  return allowed ? saved : defaultScreen;
}

function App() {
  const initialPref = localStorage.getItem('userPref');

  const [currentScreen, setCurrentScreen] = useSessionState('currentScreen', resolveInitialScreen);
  const [previousScreen, setPreviousScreen] = useSessionState('previousScreen', 'home');

  const [inputName, setInputName] = useSessionState('inputName', '');
  const [inputEmail, setInputEmail] = useSessionState('inputEmail', '');
  const [inputPassword, setInputPassword] = useState('');
  const [onboardingPrefs, setOnboardingPrefs] = useSessionState('onboardingPrefs', []);
  const [selectedPrefs, setSelectedPrefs] = useSessionState('selectedPrefs', []);

  const [tripMoods, setTripMoods] = useSessionState('tripMoods', []);

  const [budget, setBudget] = useSessionState('budget', '');
  const [timeHours, setTimeHours] = useSessionState('timeHours', '');
  const [timeUnit, setTimeUnit] = useSessionState('timeUnit', 'hours'); // 'hours' | 'days' | 'weeks'

  const [searchQuery, setSearchQuery] = useSessionState('searchQuery', '');

  const [userLat, setUserLat] = useSessionState('userLat', null);
  const [userLng, setUserLng] = useSessionState('userLng', null);
  const [gpsStatus, setGpsStatus] = useSessionState('gpsStatus', '');

  const [aiRoute, setAiRoute] = useSessionState('aiRoute', []);
  const [estimatedCost, setEstimatedCost] = useSessionState('estimatedCost', 0);
  const [estimatedTimeHours, setEstimatedTimeHours] = useSessionState('estimatedTimeHours', 0);
  const [budgetWarning, setBudgetWarning] = useSessionState('budgetWarning', null);
  const [farFromProvince, setFarFromProvince] = useSessionState('farFromProvince', false);
  // 🌟 State ใหม่สำหรับเก็บสถานที่ที่ผู้ใช้เลือกเข้าทริป
  const [selectedTripPlaces, setSelectedTripPlaces] = useSessionState('selectedTripPlaces', []);
  const [finalRoutePlan, setFinalRoutePlan] = useSessionState('finalRoutePlan', []);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lastPref, setLastPref] = useState(initialPref);
  const [selectedAttraction, setSelectedAttraction] = useSessionState('selectedAttraction', null);
  const [theme, setTheme] = useSessionState('theme', 'light');
  const [homePlaces, setHomePlaces] = useState([]);
  
  const [vrMode, setVrMode] = useState(false);
  const [currentVrPlace, setCurrentVrPlace] = useState(null);
  const [vrPreparing, setVrPreparing] = useState(false);
  const [vrMissing, setVrMissing] = useState(false);

  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#121212' : '#f4f6f8';
    document.body.style.transition = 'background-color 0.3s ease';
  }, [theme]);

  useEffect(() => {
    if (!vrMode || !currentVrPlace || !window.pannellum) return;
    let viewer = null;
    let cancelled = false;
    const startViewer = () => {
      if (cancelled) return;
      setVrPreparing(false);
      viewer = window.pannellum.viewer('panorama-container', {
        type: 'equirectangular',
        panorama: currentVrPlace.vr_image,
        autoLoad: true,
        autoRotate: -2,
        strings: VR_VIEWER_STRINGS_TH,
      });
    };
    // Check the image loads before starting the viewer: a missing file would otherwise
    // leave the viewer stuck on "loading" (the host answers with the app page, not a 404).
    setVrPreparing(true);
    setVrMissing(false);
    const probe = new Image();
    probe.crossOrigin = 'anonymous';
    probe.onload = startViewer;
    probe.onerror = () => {
      if (cancelled) return;
      setVrPreparing(false);
      setVrMissing(true);
    };
    probe.src = currentVrPlace.vr_image;
    return () => {
      cancelled = true;
      probe.onload = probe.onerror = null;
      try { if (viewer) viewer.destroy(); } catch (e) {}
    };
  }, [vrMode, currentVrPlace]);

  // search-results / ai-result ก็ใช้ homePlaces ด้วย จึงต้องโหลดให้ถ้าผู้ใช้รีเฟรชอยู่ที่หน้านั้น
  const needsHomePlaces =
    currentScreen === 'home' ||
    ((currentScreen === 'search-results' || currentScreen === 'ai-result') && homePlaces.length === 0);

  useEffect(() => {
    if (needsHomePlaces) {
      const fetchHomePlaces = async () => {
        try {
          const response = await axios.get(`${API_BASE_URL}/get_home_places?pref=${lastPref || ''}`);
          if (response.data.status === 'success') {
            setHomePlaces(response.data.places);
          }
        } catch (error) {
          console.error("ดึงข้อมูลสถานที่ล้มเหลว", error);
        }
      };
      fetchHomePlaces();
    }
  }, [currentScreen, lastPref, needsHomePlaces]);

  const getLocation = () => {
    if (!navigator.geolocation) {
      setGpsStatus('เบราว์เซอร์ของคุณไม่รองรับ GPS');
      return;
    }
    setGpsStatus('กำลังดึงตำแหน่งพิกัด...');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLat(position.coords.latitude);
        setUserLng(position.coords.longitude);
        setGpsStatus('📍 รับทราบพิกัดปัจจุบันของคุณแล้ว!');
      },
      (error) => {
        setGpsStatus('❌ ไม่สามารถดึงตำแหน่งได้ (กรุณาอนุญาต Location)');
      }
    );
  };

  const handleLogin = async (overrideEmail) => {
    const emailToUse = (overrideEmail ?? inputEmail).trim();
    if (!emailToUse) {
      alert('กรุณากรอกอีเมลให้ครบถ้วนครับ');
      return;
    }
    setIsLoggingIn(true);
    try {
      const storedRole = localStorage.getItem('userRole');

      const response = await axios.post(`${API_BASE_URL}/login_user`, { email: emailToUse, password: inputPassword });

      if (response.data.status === 'admin') {
        localStorage.setItem('userName', response.data.name || 'ผู้ดูแลระบบ');
        localStorage.setItem('userEmail', emailToUse);
        localStorage.setItem('userRole', 'admin');
        sessionStorage.setItem('adminKey', response.data.adminKey || '');
        setCurrentScreen('admin');
        setIsLoggingIn(false);
        return;
      }

      if (response.data.status === 'invalid_password') {
        alert(response.data.message || 'รหัสผ่านไม่ถูกต้อง');
        setIsLoggingIn(false);
        return;
      }

      if (response.data.status === 'suspended') {
        alert(response.data.message || 'บัญชีนี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        setIsLoggingIn(false);
        return;
      }

      if (response.data.status === 'new_user') {
        alert('ยังไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาลงทะเบียนก่อนเข้าใช้งานครับ');
        setCurrentScreen('register');
        setIsLoggingIn(false);
        return;
      }

      if (response.data.status !== 'returning_user') {
        alert(response.data.message || 'ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง');
        setIsLoggingIn(false);
        return;
      }

      const role = response.data.role || storedRole || 'tourist';
      setAuthToken(response.data.token);
      if (response.data.passwordSet) {
        alert('ตั้งรหัสผ่านสำหรับบัญชีนี้เรียบร้อยแล้ว ครั้งต่อไปกรุณาเข้าสู่ระบบด้วยรหัสผ่านนี้');
      }
      localStorage.setItem('userEmail', emailToUse);
      localStorage.setItem('userName', response.data.userData?.name || emailToUse);
      localStorage.setItem('userRole', role);
      if (response.data.userData) {
        localStorage.setItem('userData', JSON.stringify(response.data.userData));
      }
      localStorage.setItem('userPref', response.data.pref || '');
      setLastPref(response.data.pref || '');

      setCurrentScreen(role === 'business' ? 'merchant-add-poi' : 'home');
    } catch (error) {
      // Fallback for offline / demo mode
      const storedRole = localStorage.getItem('userRole');

      localStorage.setItem('userName', localStorage.getItem('userName') || emailToUse);
      localStorage.setItem('userEmail', emailToUse);

      if (storedRole === 'business') {
        setCurrentScreen('merchant-add-poi');
      } else {
        setCurrentScreen('home');
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleRegisterTouristSuccess = (userData) => {
    setInputName(userData.name);
    setInputEmail(userData.email);
    setCurrentScreen('onboarding');
  };

  const handleRegisterBusinessSuccess = (userData) => {
    setInputName(userData.name);
    setInputEmail(userData.email);
    setCurrentScreen('merchant-add-poi');
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.removeItem('adminKey');
    // ล้างหน้า/ข้อมูลทริปที่บันทึกไว้ แล้วโหลดใหม่ เพื่อไม่ให้ข้อมูลของผู้ใช้คนก่อนค้างอยู่ในแท็บนี้
    clearSessionState();
    window.location.reload();
  };

  const toggleOnboardingSelection = (id) => setOnboardingPrefs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleSelection = (id) => setSelectedPrefs(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleMoodSelection = (id) => setTripMoods(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  const toggleTheme = () => setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));

  // 🌟 ฟังก์ชันเลือก/ยกเลิกสถานที่เข้าทริป
  const togglePlaceSelection = (place) => {
    setSelectedTripPlaces(prev => {
      const isSelected = prev.some(p => p.id === place.id);
      if (isSelected) {
        return prev.filter(p => p.id !== place.id);
      } else {
        return [...prev, place];
      }
    });
  };

  const handleCompleteOnboarding = async () => {
    if (onboardingPrefs.length === 0) return;
    const prefsString = onboardingPrefs.join(',');
    localStorage.setItem('userPref', prefsString);
    setLastPref(prefsString);
    setSelectedPrefs([...onboardingPrefs]); 
    try {
      await axios.post(`${API_BASE_URL}/save_user`, { name: localStorage.getItem('userName'), email: localStorage.getItem('userEmail'), preferences: prefsString });
    } catch (error) {}
    setCurrentScreen('home');
  };

  const TIME_UNIT_TO_HOURS = { hours: 1, days: 24, weeks: 24 * 7 };

  const handleProcessAI = async () => {
    if (selectedPrefs.length === 0 || tripMoods.length === 0 || !budget || !timeHours) {
      alert('กรุณาเลือกหมวดหมู่, อารมณ์ทริป, ระบุงบประมาณ และเวลาให้ครบถ้วนครับ');
      return;
    }
    setIsLoading(true);
    setSelectedTripPlaces([]); // ล้างตะกร้าทริปเก่า
    setBudgetWarning(null);
    try {
      const timeHoursNormalized = parseFloat(timeHours) * (TIME_UNIT_TO_HOURS[timeUnit] || 1);
      const response = await axios.post(`${API_BASE_URL}/recommend`, {
        budget: parseFloat(budget), time_hours: timeHoursNormalized, categories: selectedPrefs, trip_mood: tripMoods.join(', '), user_lat: userLat, user_lng: userLng
      });
      if (response.data.status === 'success') {
        setAiRoute(response.data.route);
        setEstimatedCost(response.data.estimated_cost || 0);
        setEstimatedTimeHours(response.data.estimated_time_hours || 0);
        setBudgetWarning(response.data.budget_warning || null);
        setFarFromProvince(!!response.data.far_from_province);
        localStorage.setItem('userPref', selectedPrefs[0]);
        setLastPref(selectedPrefs[0]);
        setCurrentScreen('ai-result');
      } else {
        alert('เกิดข้อผิดพลาด: ' + response.data.message);
      }
    } catch (error) {
      alert('ไม่สามารถเชื่อมต่อกับ AI ได้');
    } finally {
      setIsLoading(false);
    }
  };

  // 🌟 คำนวณระยะทาง (Haversine) ฝั่ง Frontend เพื่อใช้จัดเรียงเส้นทางแบบจุดต่อจุด
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371.0;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // 🌟 สร้างเส้นทางสุดท้ายหลังจากผู้ใช้เลือกสถานที่เสร็จ
  const generateFinalRoute = () => {
    if (selectedTripPlaces.length === 0) {
      alert('กรุณาเลือกสถานที่อย่างน้อย 1 แห่งเพื่อสร้างแผนการเดินทางครับ');
      return;
    }
    
    let unvisited = [...selectedTripPlaces];
    let route = [];
    let currentLat = userLat;
    let currentLng = userLng;

    if (!currentLat || !currentLng) {
      // หากไม่มี GPS ให้เรียงตามระยะทางที่ Backend คำนวณมาให้ตอนแรก
      route = unvisited.sort((a, b) => (a.distance_km || 0) - (b.distance_km || 0));
    } else {
      // จัดเรียงแบบจุดต่อจุด (Point-to-Point) เริ่มจากผู้ใช้ -> ที่ใกล้สุด -> ที่ใกล้สุดถัดไป
      while (unvisited.length > 0) {
        let nearestIdx = 0;
        let minDist = calculateDistance(currentLat, currentLng, parseFloat(unvisited[0].lat), parseFloat(unvisited[0].lng));
        
        for (let i = 1; i < unvisited.length; i++) {
          let d = calculateDistance(currentLat, currentLng, parseFloat(unvisited[i].lat), parseFloat(unvisited[i].lng));
          if (d < minDist) {
            minDist = d;
            nearestIdx = i;
          }
        }
        
        let nextPlace = unvisited[nearestIdx];
        nextPlace.route_distance = minDist; 
        route.push(nextPlace);
        
        currentLat = parseFloat(nextPlace.lat);
        currentLng = parseFloat(nextPlace.lng);
        unvisited.splice(nearestIdx, 1);
      }
    }
    setFinalRoutePlan(route);
    setCurrentScreen('final-route');

    // ผู้ใช้ถูกระบุจาก token ที่แนบไปอัตโนมัติ
    axios.post(`${API_BASE_URL}/track/trip_add`, {
      place_ids: route.map((p) => p.id),
    }).catch(() => {});
  };

  const handleViewDetail = (place, fromScreen) => {
    setSelectedAttraction(place);
    setPreviousScreen(fromScreen);
    setCurrentScreen('detail');
  };

  const openVRMode = (place) => {
    setCurrentVrPlace(place);
    setVrMode(true);
    axios.post(`${API_BASE_URL}/track/vr_view`, { place_id: place.id }).catch(() => {});
  };

  const calculateEstimatedTime = (distanceKm) => {
    if (distanceKm === undefined || distanceKm === null) return '';
    const estimatedRoadDist = distanceKm * 1.4;
    let speedKmH = 25; 
    if (estimatedRoadDist > 15) speedKmH = 45; 
    if (estimatedRoadDist > 50) speedKmH = 65; 
    const totalMinutes = Math.round((estimatedRoadDist / speedKmH) * 60);
    if (totalMinutes < 5) return 'ประมาณ 5 นาที';
    if (totalMinutes < 60) return `ประมาณ ${totalMinutes} นาที`;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return mins > 0 ? `ประมาณ ${hours} ชม. ${mins} นาที` : `ประมาณ ${hours} ชั่วโมง`;
  };

  // ระยะทางจริงจากตำแหน่ง GPS ของผู้ใช้ (มีเฉพาะเมื่อผู้ใช้กดดึงพิกัดแล้ว ไม่งั้นไม่แสดงตัวเลข)
  const homePlacesWithDistance = homePlaces.map((place) => {
    const lat = parseFloat(place.lat);
    const lng = parseFloat(place.lng);
    if (userLat == null || userLng == null || Number.isNaN(lat) || Number.isNaN(lng)) {
      const { distance_km: _ignored, ...rest } = place;
      return rest;
    }
    return { ...place, distance_km: Math.round(calculateDistance(userLat, userLng, lat, lng) * 10) / 10 };
  });

  const filteredPlaces = homePlacesWithDistance.filter(place => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      (place.name && place.name.toLowerCase().includes(lowerQuery)) ||
      (place.location && place.location.toLowerCase().includes(lowerQuery)) ||
      (place.tag && place.tag.toLowerCase().includes(lowerQuery)) ||
      (place.description && place.description.toLowerCase().includes(lowerQuery))
    );
  });

  const bgCard = theme === 'dark' ? '#282828' : '#ffffff';
  const textMuted = theme === 'dark' ? '#b3b3b3' : '#666666';
  const bgSummary = theme === 'dark' ? '#181818' : '#ffffff';
  const textMain = theme === 'dark' ? 'white' : '#333333';

  return (
    <div className={`app-main ${theme}-theme`}>
      {currentScreen === 'login' && (
        <LoginScreen
          inputEmail={inputEmail}
          setInputEmail={setInputEmail}
          inputPassword={inputPassword}
          setInputPassword={setInputPassword}
          isLoggingIn={isLoggingIn}
          handleLogin={handleLogin}
          theme={theme}
          toggleTheme={toggleTheme}
          onGoToRegister={() => setCurrentScreen('register')}
        />
      )}

      {currentScreen === 'register' && (
        <RegisterScreen
          initialName={inputName}
          initialEmail={inputEmail}
          theme={theme}
          toggleTheme={toggleTheme}
          onGoToLogin={() => setCurrentScreen('login')}
          onRegisterTouristSuccess={handleRegisterTouristSuccess}
          onRegisterBusinessSuccess={handleRegisterBusinessSuccess}
        />
      )}

      {currentScreen === 'merchant-add-poi' && (
        <MerchantAddPoiScreen
          theme={theme}
          toggleTheme={toggleTheme}
          onLogout={handleLogout}
          onViewAsTourist={() => setCurrentScreen('home')}
        />
      )}

      {currentScreen === 'admin' && (
        <AdminScreen
          theme={theme}
          toggleTheme={toggleTheme}
          onLogout={handleLogout}
          onViewAsTourist={() => setCurrentScreen('home')}
        />
      )}

      {currentScreen === 'onboarding' && (
        <OnboardingScreen
          categories={categories}
          onboardingPrefs={onboardingPrefs}
          toggleOnboardingSelection={toggleOnboardingSelection}
          handleCompleteOnboarding={handleCompleteOnboarding}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {/* Global Floating Return Banner for Admin / Business viewing Tourist view */}
      {currentScreen !== 'login' && currentScreen !== 'register' && currentScreen !== 'merchant-add-poi' && currentScreen !== 'admin' && currentScreen !== 'onboarding' && (localStorage.getItem('userRole') === 'admin' || localStorage.getItem('userRole') === 'business') && (
        <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 9990, display: 'flex', gap: '8px', alignItems: 'center' }}>
          {localStorage.getItem('userRole') === 'admin' && (
            <button
              type="button"
              onClick={() => setCurrentScreen('admin')}
              style={{
                background: 'linear-gradient(135deg, #123e2f 0%, #064e3b 100%)',
                color: '#ffffff',
                border: '2px solid #34d399',
                borderRadius: '30px',
                padding: '12px 22px',
                fontSize: '14px',
                fontFamily: 'Prompt, sans-serif',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              title="กลับสู่ระบบผู้ดูแลระบบ"
            >
              <span>🛡️ กลับสู่ระบบผู้ดูแลระบบ (Admin)</span>
              <span style={{ fontSize: '12px' }}>↗</span>
            </button>
          )}

          {localStorage.getItem('userRole') === 'business' && (
            <button
              type="button"
              onClick={() => setCurrentScreen('merchant-add-poi')}
              style={{
                background: 'linear-gradient(135deg, #ea580c 0%, #c2410c 100%)',
                color: '#ffffff',
                border: '2px solid #fed7aa',
                borderRadius: '30px',
                padding: '12px 22px',
                fontSize: '14px',
                fontFamily: 'Prompt, sans-serif',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'transform 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              title="กลับสู่ระบบผู้ประกอบการ"
            >
              <span>🏪 กลับสู่ระบบร้านค้า (Business)</span>
              <span style={{ fontSize: '12px' }}>↗</span>
            </button>
          )}
        </div>
      )}

      {currentScreen === 'home' && (
        <HomeScreen
          userName={localStorage.getItem('userName')}
          userRole={localStorage.getItem('userRole')}
          lastPref={lastPref}
          homePlaces={homePlacesWithDistance}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          onSearch={() => {
            if (searchQuery.trim() !== '') setCurrentScreen('search-results');
          }}
          onStartAiTrip={() => setCurrentScreen('ai-input')}
          onViewDetail={handleViewDetail}
          onOpenVR={openVRMode}
          onLogout={handleLogout}
          onReturnToRolePortal={(role) => {
            if (role === 'admin') setCurrentScreen('admin');
            else if (role === 'business') setCurrentScreen('merchant-add-poi');
          }}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {currentScreen === 'search-results' && (
        <SearchResultsScreen
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          filteredPlaces={filteredPlaces}
          onSearch={() => {
            if (searchQuery.trim() !== '') setCurrentScreen('search-results');
          }}
          onViewDetail={handleViewDetail}
          onOpenVR={openVRMode}
          onBackToHome={() => {
            setSearchQuery('');
            setCurrentScreen('home');
          }}
          onLogout={handleLogout}
          onReturnToRolePortal={(role) => {
            if (role === 'admin') setCurrentScreen('admin');
            else if (role === 'business') setCurrentScreen('merchant-add-poi');
          }}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {currentScreen === 'ai-input' && (
        <AiInputScreen
          categories={categories}
          selectedPrefs={selectedPrefs}
          toggleSelection={toggleSelection}
          moodOptions={moodOptions}
          tripMoods={tripMoods}
          toggleMoodSelection={toggleMoodSelection}
          budget={budget}
          setBudget={setBudget}
          timeHours={timeHours}
          setTimeHours={setTimeHours}
          timeUnit={timeUnit}
          setTimeUnit={setTimeUnit}
          getLocation={getLocation}
          gpsStatus={gpsStatus}
          handleProcessAI={handleProcessAI}
          isLoading={isLoading}
          onBackToHome={() => setCurrentScreen('home')}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {currentScreen === 'ai-result' && (
        <AiResultScreen
          aiRoute={aiRoute}
          homePlaces={homePlacesWithDistance}
          selectedTripPlaces={selectedTripPlaces}
          togglePlaceSelection={togglePlaceSelection}
          generateFinalRoute={generateFinalRoute}
          budget={budget}
          timeHours={timeHours}
          timeUnit={timeUnit}
          estimatedCost={estimatedCost}
          estimatedTimeHours={estimatedTimeHours}
          budgetWarning={budgetWarning}
          farFromProvince={farFromProvince}
          onViewDetail={handleViewDetail}
          onResetSearch={() => setCurrentScreen('ai-input')}
          onBackToHome={() => setCurrentScreen('home')}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {currentScreen === 'final-route' && (
        <FinalRouteScreen
          finalRoutePlan={finalRoutePlan}
          calculateEstimatedTime={calculateEstimatedTime}
          onViewDetail={handleViewDetail}
          onOpenVR={openVRMode}
          onBackToAiResult={() => setCurrentScreen('ai-result')}
          onBackToHome={() => setCurrentScreen('home')}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {currentScreen === 'detail' && selectedAttraction && (() => {
        // ป้อนกลับข้อมูล budget/time/mood ให้เทรน AI เฉพาะตอนที่มาจากผลลัพธ์ทริปที่ AI วางแผนให้จริง
        // (ai-result / final-route) เท่านั้น ไม่ใช่ทุกครั้งที่เคยรันทริปในเซสชันนี้
        const isFromAiTrip = previousScreen === 'ai-result' || previousScreen === 'final-route';
        return (
          <DetailScreen
            selectedAttraction={selectedAttraction}
            onOpenVR={openVRMode}
            onBack={() => setCurrentScreen(previousScreen || 'home')}
            theme={theme}
            toggleTheme={toggleTheme}
            tripBudget={isFromAiTrip && budget ? parseFloat(budget) : null}
            tripTimeHours={isFromAiTrip && timeHours ? parseFloat(timeHours) * (TIME_UNIT_TO_HOURS[timeUnit] || 1) : null}
            tripMoods={isFromAiTrip ? tripMoods : null}
          />
        );
      })()}

      {vrMode && currentVrPlace && (
        <div className="vr-viewer-overlay">
          <div className="vr-viewer-header">
            <div className="vr-viewer-heading">
              <h3 className="vr-viewer-title">🕶️ โหมดโลกเสมือนจริง (VR 360°)</h3>
              <p className="vr-viewer-place" title={currentVrPlace.name}>สถานที่: {currentVrPlace.name}</p>
            </div>
            <button type="button" className="vr-viewer-close-btn" onClick={() => setVrMode(false)}>✕ ปิด</button>
          </div>
          <div className="vr-viewer-body">
            <div id="panorama-container"></div>
            {vrPreparing && <p className="vr-viewer-preparing">⏳ กำลังโหลดภาพ VR 360°...</p>}
            {vrMissing && <p className="vr-viewer-preparing">{VR_VIEWER_STRINGS_TH.fileAccessError}</p>}
          </div>
        </div>
      )}

    </div>
  );
}

// 🌟 Helper function สำหรับปัดเศษทศนิยม
function round(value, precision) {
  var multiplier = Math.pow(10, precision || 0);
  return Math.round(value * multiplier) / multiplier;
}

export default App;