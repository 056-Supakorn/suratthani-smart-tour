import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from './apiConfig';
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

function App() {
  const initialUser = localStorage.getItem('userName');
  const initialPref = localStorage.getItem('userPref');
  const initialRole = localStorage.getItem('userRole');
  
  const [currentScreen, setCurrentScreen] = useState(
    !initialUser
      ? 'login'
      : initialRole === 'business'
      ? 'merchant-add-poi'
      : initialRole === 'admin'
      ? 'admin'
      : (!initialPref ? 'onboarding' : 'home')
  );
  const [previousScreen, setPreviousScreen] = useState('home');

  const [inputName, setInputName] = useState('');
  const [inputEmail, setInputEmail] = useState('');
  const [onboardingPrefs, setOnboardingPrefs] = useState([]);
  const [selectedPrefs, setSelectedPrefs] = useState([]);
  
  const [tripMoods, setTripMoods] = useState([]); 
  
  const [budget, setBudget] = useState('');
  const [timeHours, setTimeHours] = useState('');
  
  const [searchQuery, setSearchQuery] = useState('');
  
  const [userLat, setUserLat] = useState(null);
  const [userLng, setUserLng] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('');

  const [aiRoute, setAiRoute] = useState([]); 
  // 🌟 State ใหม่สำหรับเก็บสถานที่ที่ผู้ใช้เลือกเข้าทริป
  const [selectedTripPlaces, setSelectedTripPlaces] = useState([]);
  const [finalRoutePlan, setFinalRoutePlan] = useState([]);

  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lastPref, setLastPref] = useState(initialPref);
  const [selectedAttraction, setSelectedAttraction] = useState(null);
  const [theme, setTheme] = useState('light');
  const [homePlaces, setHomePlaces] = useState([]);
  
  const [vrMode, setVrMode] = useState(false);
  const [currentVrPlace, setCurrentVrPlace] = useState(null);

  useEffect(() => {
    document.body.style.backgroundColor = theme === 'dark' ? '#121212' : '#f4f6f8';
    document.body.style.transition = 'background-color 0.3s ease';
  }, [theme]);

  useEffect(() => {
    if (vrMode && currentVrPlace && window.pannellum) {
      const viewer = window.pannellum.viewer('panorama-container', {
        type: 'equirectangular',
        panorama: currentVrPlace.vr_image,
        autoLoad: true,
        autoRotate: -2,
      });
      return () => { try { viewer.destroy(); } catch (e) {} };
    }
  }, [vrMode, currentVrPlace]);

  useEffect(() => {
    if (currentScreen === 'home') {
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
  }, [currentScreen, lastPref]);

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

  const handleLogin = async (overrideName, overrideEmail) => {
    const nameToUse = (overrideName ?? inputName).trim();
    const emailToUse = (overrideEmail ?? inputEmail).trim();
    if (!nameToUse || !emailToUse) {
      alert('กรุณากรอกชื่อ และอีเมลให้ครบถ้วนครับ');
      return;
    }
    setIsLoggingIn(true);
    try {
      const storedRole = localStorage.getItem('userRole');

      const response = await axios.post(`${API_BASE_URL}/login_user`, { name: nameToUse, email: emailToUse });

      if (response.data.status === 'admin') {
        localStorage.setItem('userName', nameToUse);
        localStorage.setItem('userEmail', emailToUse);
        localStorage.setItem('userRole', 'admin');
        sessionStorage.setItem('adminKey', response.data.adminKey || '');
        setCurrentScreen('admin');
        setIsLoggingIn(false);
        return;
      }

      if (response.data.status === 'name_mismatch') {
        alert(response.data.message);
        setIsLoggingIn(false);
        return;
      }

      if (response.data.status === 'new_user') {
        alert('ยังไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาลงทะเบียนก่อนเข้าใช้งานครับ');
        setCurrentScreen('register');
        setIsLoggingIn(false);
        return;
      }

      localStorage.setItem('userName', nameToUse);
      localStorage.setItem('userEmail', emailToUse);

      if (storedRole === 'business') {
        setCurrentScreen('merchant-add-poi');
      } else if (response.data.status === 'returning_user') {
        localStorage.setItem('userPref', response.data.pref);
        setLastPref(response.data.pref);
        setCurrentScreen('home');
      }
    } catch (error) {
      // Fallback for offline / demo mode
      const storedRole = localStorage.getItem('userRole');

      localStorage.setItem('userName', nameToUse);
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

  const DEMO_ACCOUNTS = {
    tourist: { name: 'นักท่องเที่ยว (Demo)', email: 'demo.tourist@suratsmarttour.local' },
    business: { name: 'ผู้ประกอบการ (Demo)', email: 'demo.business@suratsmarttour.local' },
    admin: { name: 'ผู้ดูแลระบบ', email: 'admin@surat.go.th' },
  };

  const handleDemoLogin = (role) => {
    const account = DEMO_ACCOUNTS[role];
    if (!account) return;
    if (role === 'business') {
      localStorage.setItem('userRole', 'business');
    } else if (role === 'tourist') {
      localStorage.removeItem('userRole');
    }
    setInputName(account.name);
    setInputEmail(account.email);
    handleLogin(account.name, account.email);
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
    setInputName(''); setInputEmail(''); setOnboardingPrefs([]); setCurrentScreen('login');
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

  const handleProcessAI = async () => {
    if (selectedPrefs.length === 0 || tripMoods.length === 0 || !budget || !timeHours) {
      alert('กรุณาเลือกหมวดหมู่, อารมณ์ทริป, ระบุงบประมาณ และเวลาให้ครบถ้วนครับ');
      return;
    }
    setIsLoading(true);
    setSelectedTripPlaces([]); // ล้างตะกร้าทริปเก่า
    try {
      const response = await axios.post(`${API_BASE_URL}/recommend`, {
        budget: parseFloat(budget), time_hours: parseFloat(timeHours), categories: selectedPrefs, trip_mood: tripMoods.join(', '), user_lat: userLat, user_lng: userLng
      });
      if (response.data.status === 'success') {
        setAiRoute(response.data.route); 
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

    axios.post(`${API_BASE_URL}/track/trip_add`, {
      place_ids: route.map((p) => p.id),
      owner_email: localStorage.getItem('userEmail') || '',
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

  const filteredPlaces = homePlaces.filter(place => {
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
          inputName={inputName}
          setInputName={setInputName}
          inputEmail={inputEmail}
          setInputEmail={setInputEmail}
          isLoggingIn={isLoggingIn}
          handleLogin={handleLogin}
          theme={theme}
          toggleTheme={toggleTheme}
          onGoToRegister={() => setCurrentScreen('register')}
          onDemoLogin={handleDemoLogin}
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
          homePlaces={homePlaces}
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
          selectedTripPlaces={selectedTripPlaces}
          togglePlaceSelection={togglePlaceSelection}
          generateFinalRoute={generateFinalRoute}
          budget={budget}
          timeHours={timeHours}
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

      {currentScreen === 'detail' && selectedAttraction && (
        <DetailScreen
          selectedAttraction={selectedAttraction}
          onOpenVR={openVRMode}
          onBack={() => setCurrentScreen(previousScreen || 'home')}
          theme={theme}
          toggleTheme={toggleTheme}
        />
      )}

      {vrMode && currentVrPlace && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: '#000', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '15px 20px', backgroundColor: 'rgba(20, 20, 20, 0.9)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
            <div><h3 style={{ color: '#1DB954', margin: 0, fontSize: '18px' }}>🕶️ โหมดโลกเสมือนจริง (VR 360°)</h3><p style={{ color: '#ccc', margin: '5px 0 0 0', fontSize: '12px' }}>สถานที่: {currentVrPlace.name}</p></div>
            <button onClick={() => setVrMode(false)} style={{ background: '#ff4444', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}>✕ ปิด</button>
          </div>
          <div style={{ flex: 1, position: 'relative', width: '100%', height: 'calc(100vh - 70px)', overflow: 'hidden' }}>
            <div id="panorama-container" style={{ width: '100%', height: '100%' }}></div>
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