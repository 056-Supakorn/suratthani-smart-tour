import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import './Login.css';
import LoginScreen from './components/LoginScreen';
import RegisterScreen from './components/RegisterScreen';
import MerchantAddPoiScreen from './components/MerchantAddPoiScreen';
import OnboardingScreen from './components/OnboardingScreen';
import HomeScreen from './components/HomeScreen';
import AdminScreen from './components/AdminScreen';

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
      : (initialRole === 'business' 
          ? 'merchant-add-poi' 
          : (!initialPref ? 'onboarding' : 'home'))
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
          const response = await axios.get(`http://127.0.0.1:8000/get_home_places?pref=${lastPref || ''}`);
          let places = [];
          if (response.data.status === 'success') {
            places = response.data.places;
          }
          const merchantPlaces = JSON.parse(localStorage.getItem('merchantPlaces') || '[]');
          if (merchantPlaces.length > 0) {
            places = [...merchantPlaces, ...places];
          }
          setHomePlaces(places);
        } catch (error) {
          console.error("ดึงข้อมูลสถานที่ล้มเหลว", error);
          const merchantPlaces = JSON.parse(localStorage.getItem('merchantPlaces') || '[]');
          if (merchantPlaces.length > 0) {
            setHomePlaces(merchantPlaces);
          }
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

  const handleLogin = async () => {
    if (!inputName.trim() || !inputEmail.trim()) {
      alert('กรุณากรอกชื่อ และอีเมลให้ครบถ้วนครับ');
      return;
    }
    setIsLoggingIn(true);
    try {
      const lowerEmail = inputEmail.trim().toLowerCase();
      const lowerName = inputName.trim().toLowerCase();
      const storedRole = localStorage.getItem('userRole');

      // 🛡️ เช็คว่าเป็น Admin หรือไม่
      if (lowerEmail.includes('admin') || lowerName.includes('admin') || storedRole === 'admin') {
        localStorage.setItem('userName', inputName.trim());
        localStorage.setItem('userEmail', inputEmail.trim());
        localStorage.setItem('userRole', 'admin');
        setCurrentScreen('admin');
        setIsLoggingIn(false);
        return;
      }

      const response = await axios.post('http://127.0.0.1:8000/login_user', { name: inputName.trim(), email: inputEmail.trim() });
      if (response.data.status === 'name_mismatch') {
        alert(response.data.message);
        setIsLoggingIn(false);
        return; 
      }
      localStorage.setItem('userName', inputName.trim());
      localStorage.setItem('userEmail', inputEmail.trim());

      if (storedRole === 'business') {
        setCurrentScreen('merchant-add-poi');
      } else if (response.data.status === 'returning_user') {
        localStorage.setItem('userPref', response.data.pref);
        setLastPref(response.data.pref);
        setCurrentScreen('home'); 
      } else {
        setCurrentScreen('onboarding'); 
      }
    } catch (error) {
      // Fallback for offline / demo mode
      const lowerEmail = inputEmail.trim().toLowerCase();
      const lowerName = inputName.trim().toLowerCase();
      const storedRole = localStorage.getItem('userRole');

      localStorage.setItem('userName', inputName.trim());
      localStorage.setItem('userEmail', inputEmail.trim());

      if (lowerEmail.includes('admin') || lowerName.includes('admin') || storedRole === 'admin') {
        localStorage.setItem('userRole', 'admin');
        setCurrentScreen('admin');
      } else if (storedRole === 'business') {
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
      await axios.post('http://127.0.0.1:8000/save_user', { name: localStorage.getItem('userName'), email: localStorage.getItem('userEmail'), preferences: prefsString });
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
      const response = await axios.post('http://127.0.0.1:8000/recommend', {
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
  };

  const handleViewDetail = (place, fromScreen) => {
    setSelectedAttraction(place);
    setPreviousScreen(fromScreen);
    setCurrentScreen('detail');
  };

  const openVRMode = (place) => {
    setCurrentVrPlace(place);
    setVrMode(true);
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
      {currentScreen !== 'login' && currentScreen !== 'register' && currentScreen !== 'merchant-add-poi' && currentScreen !== 'onboarding' && currentScreen !== 'home' && currentScreen !== 'admin' && (
        <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', height: 0, zIndex: 1001 }}>
          <button className="theme-toggle-btn" onClick={toggleTheme} title="สลับโหมดสว่าง/มืด" style={{ position: 'absolute', top: '20px', right: '15px' }}>
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      )}

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
          onGoToAdmin={() => {
            setInputName('ผู้ดูแลระบบ');
            setInputEmail('admin@surat.go.th');
            localStorage.setItem('userName', 'ผู้ดูแลระบบ');
            localStorage.setItem('userEmail', 'admin@surat.go.th');
            localStorage.setItem('userRole', 'admin');
            setCurrentScreen('admin');
          }}
        />
      )}

      {currentScreen === 'register' && (
        <RegisterScreen
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
        <div className="home-container fade-in">
          <div className="content-wrapper" style={{ margin: '0 auto', maxWidth: '1000px', paddingTop: '30px' }}>
            <div style={{ marginBottom: '25px', textAlign: 'center' }}>
              <h2 style={{ fontSize: '24px', margin: 0, color: textMain }}>🔍 ค้นหาสถานที่</h2>
            </div>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '35px', backgroundColor: bgSummary, padding: '20px', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
              <div style={{ flex: 1, margin: 0, position: 'relative' }}>
                <span style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', fontSize: '18px' }}>🔍</span>
                <input 
                  type="text" placeholder="ค้นหาสถานที่, อำเภอ หรือหมวดหมู่..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: '100%', padding: '15px 15px 15px 45px', borderRadius: '12px', border: `1px solid ${theme === 'dark' ? '#444' : '#ccc'}`, backgroundColor: theme === 'dark' ? '#121212' : '#f9f9f9', color: textMain, fontSize: '16px', boxSizing: 'border-box', outline: 'none' }}
                />
              </div>
              <button 
                style={{ backgroundColor: '#4285F4', color: 'white', border: 'none', borderRadius: '12px', padding: '0 24px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer', boxShadow: '0 4px 10px rgba(66, 133, 244, 0.3)', transition: 'transform 0.2s' }}
              >
                ค้นหา
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: `2px solid ${theme === 'dark' ? '#333' : '#eee'}`, paddingBottom: '15px' }}>
              <h2 style={{ fontSize: '20px', margin: 0, color: textMain }}>ผลการค้นหาสำหรับ: <span style={{ color: '#1DB954' }}>"{searchQuery}"</span></h2>
              <span style={{ backgroundColor: theme === 'dark' ? '#333' : '#e0e0e0', padding: '5px 15px', borderRadius: '20px', fontSize: '14px', color: textMain, fontWeight: 'bold' }}>พบ {filteredPlaces.length} รายการ</span>
            </div>
            <div className="attraction-grid">
              {filteredPlaces.length > 0 ? (
                filteredPlaces.map(place => (
                  <div key={place.id} className="attraction-card" style={{ cursor: 'pointer' }} onClick={() => handleViewDetail(place, 'search-results')}>
                    <img src={place.image} alt={place.name} className="attraction-img" style={{ backgroundColor: '#e2e8f0' }} onError={(e) => { e.target.onerror = null; e.target.src = ''; }} />
                    <div style={{ padding: '20px' }}>
                      <span className="tag">{place.tag}</span>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: textMain }}>{place.name}</h3>
                      <p style={{ fontSize: '12px', color: textMuted, margin: '0 0 15px 0' }}>📍 {place.location}</p>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="btn" style={{ backgroundColor: '#1DB954', color: 'white', padding: '10px', fontSize: '13px', flex: 1, borderRadius: '12px', border: 'none' }}>รายละเอียด</button>
                        <button className="btn" onClick={(e) => { e.stopPropagation(); openVRMode(place); }} style={{ backgroundColor: '#333', color: 'white', padding: '10px', fontSize: '13px', flex: 1, borderRadius: '12px', border: 'none' }}>🕶️ VR 360°</button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', width: '100%', padding: '60px 0', backgroundColor: bgSummary, borderRadius: '20px', marginTop: '20px' }}>
                  <span style={{ fontSize: '40px', display: 'block', marginBottom: '15px' }}>🧐</span>
                  <h3 style={{ color: textMain, margin: '0 0 10px 0' }}>ไม่พบสถานที่ที่คุณค้นหา</h3>
                  <p style={{ color: textMuted, margin: 0 }}>ลองค้นหาด้วยคำอื่น เช่น ชื่ออำเภอ, ชื่อสถานที่ หรือหมวดหมู่</p>
                </div>
              )}
            </div>
            <button 
              className="btn btn-outline" onClick={() => { setSearchQuery(''); setCurrentScreen('home'); }} 
              style={{ width: '100%', marginTop: '30px', padding: '16px', fontSize: '16px', borderRadius: '20px', border: `2px solid ${textMuted}`, color: textMain, backgroundColor: 'transparent', cursor: 'pointer' }}
            >
              ← กลับหน้าแรก
            </button>
          </div>
        </div>
      )}

      {currentScreen === 'ai-input' && (
        <div className="app-container fade-in">
          <div className="content-wrapper">
            <h1 style={{ fontSize: '30px', marginBottom: '10px', color: textMain }}>ให้ฉันช่วยแนะนำคุณ 🤖</h1>
            <p style={{ color: textMuted, marginBottom: '30px' }}>เลือกสไตล์ที่ชอบ (เลือกได้หลายอัน) และระบุข้อมูลการเดินทาง</p>
            <div className="pref-grid">
              {categories.map((item) => (
                <div key={item.id} className="card" onClick={() => toggleSelection(item.id)}
                  style={{ backgroundColor: selectedPrefs.includes(item.id) ? '#1DB954' : bgCard, color: selectedPrefs.includes(item.id) ? 'white' : textMuted, border: `2px solid ${selectedPrefs.includes(item.id) ? '#1ed760' : (theme === 'dark' ? 'transparent' : '#ddd')}`, cursor: 'pointer' }}>
                  {item.label}
                </div>
              ))}
            </div>
            <div style={{ marginTop: '35px' }}>
              <label className="ai-input-label" style={{ color: textMuted, marginBottom: '15px' }}>✨ สไตล์บรรยากาศของทริปนี้ (เลือกได้หลายอัน)</label>
              <div className="pref-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                {moodOptions.map((mood) => (
                  <div key={mood.id} className="card" onClick={() => toggleMoodSelection(mood.id)}
                    style={{ backgroundColor: tripMoods.includes(mood.id) ? '#4285F4' : bgCard, color: tripMoods.includes(mood.id) ? 'white' : textMuted, border: `2px solid ${tripMoods.includes(mood.id) ? '#3367d6' : (theme === 'dark' ? '#333' : '#ccc')}`, cursor: 'pointer', padding: '15px 10px' }}>
                    {mood.label}
                  </div>
                ))}
              </div>
            </div>
            <div style={{ backgroundColor: bgCard, padding: '20px', borderRadius: '15px', marginTop: '30px', border: `2px dashed ${theme === 'dark' ? '#444' : '#1DB954'}` }}>
              <h3 style={{ color: textMain, margin: '0 0 10px 0', fontSize: '18px' }}>📍 จัดเรียงเส้นทางจากจุดที่คุณอยู่</h3>
              <p style={{ fontSize: '13px', color: textMuted, marginBottom: '15px' }}>อนุญาตให้ระบบเข้าถึงตำแหน่ง เพื่อให้ระบบคำนวณว่าคุณควรไปจุดไหนก่อน</p>
              <button onClick={getLocation} style={{ background: '#4285F4', color: 'white', padding: '12px 20px', border: 'none', borderRadius: '10px', width: '100%', fontWeight: 'bold', cursor: 'pointer' }}>ดึงตำแหน่งพิกัดปัจจุบัน</button>
              {gpsStatus && <p style={{ color: gpsStatus.includes('❌') ? '#ff4444' : '#1DB954', fontSize: '14px', marginTop: '10px', fontWeight: 'bold', textAlign: 'center' }}>{gpsStatus}</p>}
            </div>
            <div className="ai-input-container" style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', marginTop: '20px' }}>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <label className="ai-input-label" style={{ display: 'block', marginBottom: '8px', color: textMuted }}>💰 งบประมาณ (บาท)</label>
                <input type="number" className="ai-input" placeholder="เช่น 1500" value={budget} onChange={(e) => setBudget(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '12px', boxSizing: 'border-box', backgroundColor: bgCard, color: textMain, border: `2px solid ${theme === 'dark' ? '#333' : '#ddd'}` }} />
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <label className="ai-input-label" style={{ display: 'block', marginBottom: '8px', color: textMuted }}>⏱️ เวลาที่มี (ชั่วโมง)</label>
                <input type="number" className="ai-input" placeholder="เช่น 6" value={timeHours} onChange={(e) => setTimeHours(e.target.value)} style={{ width: '100%', padding: '15px', borderRadius: '12px', boxSizing: 'border-box', backgroundColor: bgCard, color: textMain, border: `2px solid ${theme === 'dark' ? '#333' : '#ddd'}` }} />
              </div>
            </div>
            <button className={`btn ${selectedPrefs.length > 0 && tripMoods.length > 0 && budget && timeHours ? 'btn-primary' : 'btn-disabled'}`} onClick={handleProcessAI} disabled={selectedPrefs.length === 0 || tripMoods.length === 0 || !budget || !timeHours || isLoading} style={{ width: '100%', padding: '15px', fontSize: '16px', marginTop: '20px' }}>
              {isLoading ? 'กำลังวิเคราะห์ข้อมูล...' : 'เริ่มประมวลผลค้นหาสถานที่'}
            </button>
            <button className="btn btn-outline" style={{ width: '100%', marginTop: '10px' }} onClick={() => setCurrentScreen('home')}>ยกเลิกและกลับหน้าหลัก</button>
          </div>
        </div>
      )}

      {currentScreen === 'ai-result' && (
        <div className="home-container fade-in" style={{ paddingBottom: '100px' }}>
          <div className="content-wrapper" style={{ margin: '0 auto', maxWidth: '1000px', paddingTop: '40px' }}>
            <h2 style={{ color: textMain, textAlign: 'center', marginBottom: '10px', fontSize: '28px' }}>🗺️ สถานที่แนะนำของคุณ</h2>
            <p style={{ textAlign: 'center', color: textMuted, marginBottom: '30px' }}>คลิกปุ่ม ➕ ด้านล่างรูปภาพ เพื่อเลือกสถานที่เข้าสู่แผนการเดินทางของคุณ</p>
            
            <div style={{ backgroundColor: bgCard, padding: '20px', borderRadius: '15px', marginBottom: '30px', border: `1px solid ${theme === 'dark' ? '#333' : '#eee'}`, display: 'flex', flexWrap: 'wrap', gap: '15px' }}>
              <div style={{ flex: '1 1 45%' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: textMuted }}>💰 งบประมาณ</p>
                <p style={{ margin: 0, color: textMain, fontWeight: 'bold' }}>{budget} บาท</p>
              </div>
              <div style={{ flex: '1 1 45%' }}>
                <p style={{ margin: '0 0 5px 0', fontSize: '13px', color: textMuted }}>⏱️ เวลาที่มี</p>
                <p style={{ margin: 0, color: textMain, fontWeight: 'bold' }}>{timeHours} ชั่วโมง</p>
              </div>
            </div>

            <div style={{ padding: '20px', backgroundColor: bgSummary, borderRadius: '20px' }}>
              {aiRoute.length > 0 ? (
                Object.entries(
                  aiRoute.reduce((acc, place) => {
                    const tag = place.tag || 'ทั่วไป';
                    if (!acc[tag]) acc[tag] = [];
                    acc[tag].push(place);
                    return acc;
                  }, {})
                )
                .map(([tag, places]) => {
                  // 🌟 จำกัดการแสดงผลแต่ละหมวดหมู่ไม่เกิน 6 สถานที่
                  const sortedPlaces = [...places].sort((a, b) => (a.distance_km || 9999) - (b.distance_km || 9999)).slice(0, 6);
                  return [tag, sortedPlaces];
                })
                .map(([tag, sortedPlaces]) => (
                  <div key={tag} style={{ marginBottom: '40px' }}>
                    <h3 style={{ fontSize: '20px', color: textMain, borderBottom: `2px solid ${theme === 'dark' ? '#333' : '#eee'}`, paddingBottom: '10px', marginBottom: '20px' }}>
                      🏷️ หมวดหมู่: <span style={{ color: '#1DB954' }}>{tag}</span> (แนะนำ {sortedPlaces.length} แห่ง)
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px' }}>
                      {sortedPlaces.map((place) => {
                        const isSelected = selectedTripPlaces.some(p => p.id === place.id);
                        return (
                          <div key={place.id} style={{ backgroundColor: bgCard, borderRadius: '16px', overflow: 'hidden', boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.08)', cursor: 'pointer', border: `2px solid ${isSelected ? '#1DB954' : (theme === 'dark' ? '#333' : '#eaeaea')}`, transition: 'all 0.2s' }} onClick={() => handleViewDetail(place, 'ai-result')}>
                            <div style={{ position: 'relative' }}>
                              <img src={place.image} alt={place.name} style={{ width: '100%', height: '200px', objectFit: 'cover', backgroundColor: '#e2e8f0' }} onError={(e) => { e.target.onerror = null; e.target.src = ''; }} />
                            </div>
                            <div style={{ padding: '20px' }}>
                              <h3 style={{ margin: '0 0 10px 0', fontSize: '18px', color: textMain }}>{place.name}</h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: textMuted, backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f8fafc', padding: '12px', borderRadius: '10px', marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span>📌</span> <span>{place.location}</span></div>
                                {place.distance_km !== undefined && (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: `1px dashed ${theme === 'dark' ? '#444' : '#ccc'}`, paddingTop: '8px', marginTop: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e53935', fontWeight: 'bold' }}><span>🚗</span> <span>ห่างจากคุณ {place.distance_km} กม.</span></div>
                                  </div>
                                )}
                              </div>
                              
                              {/* 🌟 ปุ่มสำหรับกดเลือกเพิ่มลงทริป */}
                              <button 
                                onClick={(e) => { e.stopPropagation(); togglePlaceSelection(place); }}
                                style={{ width: '100%', padding: '12px', borderRadius: '10px', border: 'none', fontWeight: 'bold', fontSize: '14px', cursor: 'pointer', backgroundColor: isSelected ? '#ff4444' : '#1DB954', color: 'white', transition: 'background-color 0.2s' }}
                              >
                                {isSelected ? '❌ นำออกจากทริป' : '➕ เพิ่มลงทริป'}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p style={{ color: textMuted, textAlign: 'center' }}>ไม่พบสถานที่ที่แนะนำ</p>
              )}
            </div>
            
            <button className="btn btn-outline" style={{ marginTop: '30px', width: '100%' }} onClick={() => setCurrentScreen('ai-input')}>ค้นหาใหม่</button>
          </div>

          {/* 🌟 แถบเมนูลอยด้านล่างสำหรับยืนยันการจัดทริป */}
          <div style={{ position: 'fixed', bottom: 0, left: 0, width: '100%', backgroundColor: bgSummary, padding: '20px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'center', zIndex: 1000, borderTop: `1px solid ${theme === 'dark' ? '#333' : '#eee'}` }}>
            <div style={{ maxWidth: '1000px', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, color: textMuted, fontSize: '14px' }}>สถานที่ที่เลือก</p>
                <h3 style={{ margin: 0, color: textMain, fontSize: '20px' }}>{selectedTripPlaces.length} แห่ง</h3>
              </div>
              <button 
                onClick={generateFinalRoute}
                disabled={selectedTripPlaces.length === 0}
                style={{ backgroundColor: selectedTripPlaces.length > 0 ? '#4285F4' : '#ccc', color: 'white', border: 'none', padding: '14px 30px', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: selectedTripPlaces.length > 0 ? 'pointer' : 'not-allowed', boxShadow: selectedTripPlaces.length > 0 ? '0 4px 12px rgba(66, 133, 244, 0.4)' : 'none' }}
              >
                สร้างแผนการเดินทาง 🚀
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🌟 หน้าจอใหม่: แสดงผลเส้นทางสุดท้ายที่จัดเรียงจุดต่อจุดแล้ว */}
      {currentScreen === 'final-route' && (
        <div className="home-container fade-in">
          <div className="content-wrapper" style={{ margin: '0 auto', maxWidth: '1000px', paddingTop: '40px', paddingBottom: '50px' }}>
            <h2 style={{ color: textMain, textAlign: 'center', marginBottom: '30px', fontSize: '28px' }}>🚗 แผนการเดินทางของคุณ</h2>
            
            <div style={{ padding: '20px', backgroundColor: bgSummary, borderRadius: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
                {finalRoutePlan.map((place, index) => (
                  <div key={place.id} style={{ display: 'flex', backgroundColor: bgCard, borderRadius: '16px', overflow: 'hidden', boxShadow: theme === 'dark' ? '0 4px 12px rgba(0,0,0,0.5)' : '0 4px 12px rgba(0,0,0,0.08)', cursor: 'pointer', border: `1px solid ${theme === 'dark' ? '#333' : '#eaeaea'}` }} onClick={() => handleViewDetail(place, 'final-route')}>
                    
                    <div style={{ position: 'relative', width: '30%' }}>
                      <img src={place.image} alt={place.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.onerror = null; e.target.src = ''; }} />
                      <span style={{ position: 'absolute', top: '10px', left: '10px', backgroundColor: '#1DB954', color: 'white', padding: '5px 12px', borderRadius: '20px', fontSize: '14px', fontWeight: 'bold' }}>
                        📍 จุดที่ {index + 1}
                      </span>
                    </div>

                    <div style={{ padding: '20px', width: '70%' }}>
                      <h3 style={{ margin: '0 0 10px 0', fontSize: '20px', color: textMain }}>{place.name}</h3>
                      <p style={{ fontSize: '13px', color: textMuted, margin: '0 0 10px 0' }}>📌 {place.location}</p>
                      
                      {place.route_distance !== undefined && (
                        <div style={{ backgroundColor: theme === 'dark' ? '#1e1e1e' : '#f8fafc', padding: '10px', borderRadius: '10px', display: 'flex', gap: '15px' }}>
                          <span style={{ color: '#e53935', fontSize: '14px', fontWeight: 'bold' }}>🚗 ห่างจากจุดก่อนหน้า: {round(place.route_distance, 1)} กม.</span>
                          <span style={{ color: '#1DB954', fontSize: '14px', fontWeight: 'bold' }}>⏱️ ใช้เวลา: {calculateEstimatedTime(place.route_distance)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button className="btn btn-outline" style={{ marginTop: '30px', width: '100%' }} onClick={() => setCurrentScreen('ai-result')}>← กลับไปแก้ไขสถานที่</button>
            <button className="btn btn-outline" style={{ marginTop: '10px', width: '100%', borderColor: 'transparent' }} onClick={() => setCurrentScreen('home')}>กลับหน้าแรก</button>
          </div>
        </div>
      )}

      {currentScreen === 'detail' && selectedAttraction && (
        <div className="home-container fade-in" style={{ paddingBottom: '50px' }}>
          <div className="content-wrapper" style={{ margin: '0 auto', maxWidth: '800px', paddingTop: '40px' }}>
            <div style={{ backgroundColor: bgSummary, borderRadius: '20px', overflow: 'hidden', boxShadow: theme === 'light' ? '0 10px 30px rgba(0,0,0,0.08)' : '0 10px 30px rgba(0,0,0,0.5)' }}>
              <img src={selectedAttraction.image} alt={selectedAttraction.name} style={{ width: '100%', height: '350px', objectFit: 'cover', backgroundColor: '#e2e8f0' }} onError={(e) => { e.target.onerror = null; e.target.src = ''; }} />
              <div style={{ padding: '30px' }}>
                <span className="tag" style={{ fontSize: '14px', padding: '6px 15px', marginBottom: '15px' }}>{selectedAttraction.tag}</span>
                <h1 style={{ margin: '0 0 20px 0', fontSize: '32px', color: '#1DB954' }}>{selectedAttraction.name}</h1>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', marginBottom: '30px', padding: '20px', backgroundColor: bgCard, borderRadius: '15px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}><span style={{ fontSize: '20px' }}>📍</span><div><strong style={{ color: textMain, display: 'block', marginBottom: '5px' }}>พิกัดสถานที่</strong><span style={{ color: textMuted, fontSize: '15px' }}>{selectedAttraction.location}</span></div></div>
                </div>
                <h3 style={{ color: textMain, marginBottom: '10px', fontSize: '20px' }}>ℹ️ รายละเอียดสถานที่</h3>
                <p style={{ color: textMuted, lineHeight: '1.8', fontSize: '16px', marginBottom: '40px' }}>{selectedAttraction.description}</p>
                <h3 style={{ color: textMain, marginBottom: '15px', fontSize: '20px' }}>🗺️ แผนที่และการเดินทาง</h3>
                <div style={{ borderRadius: '15px', overflow: 'hidden', border: `2px solid ${theme === 'dark' ? '#333' : '#eee'}`, marginBottom: '15px' }}>
                  <iframe title="Google Maps" width="100%" height="350" style={{ border: 0, display: 'block' }} loading="lazy" allowFullScreen src={selectedAttraction.lat && selectedAttraction.lng ? `https://maps.google.com/maps?q=${selectedAttraction.lat},${selectedAttraction.lng}&t=&z=14&ie=UTF8&iwloc=B&output=embed` : `https://maps.google.com/maps?q=${encodeURIComponent(selectedAttraction.name + ' สุราษฎร์ธานี')}&t=&z=14&ie=UTF8&iwloc=B&output=embed`}></iframe>
                </div>
                {/* Rating & Feedback Section (Tourist RBAC) */}
                <div style={{ marginTop: '30px', padding: '20px', backgroundColor: bgCard, borderRadius: '16px', border: `1.5px solid ${theme === 'dark' ? '#333' : '#e2e8f0'}` }}>
                  <h3 style={{ color: textMain, margin: '0 0 8px 0', fontSize: '18px' }}>⭐ ให้คะแนนความพึงพอใจ (Submit Feedback)</h3>
                  <p style={{ color: textMuted, fontSize: '13px', margin: '0 0 16px 0' }}>
                    คะแนนของคุณจะช่วยให้ AI เรียนรู้และจัดทริปได้ตรงใจนักท่องเที่ยวมากยิ่งขึ้น
                  </p>
                  <div style={{ display: 'flex', gap: '8px', fontSize: '26px', cursor: 'pointer', marginBottom: '14px' }}>
                    {['⭐', '⭐', '⭐', '⭐', '⭐'].map((star, idx) => (
                      <span
                        key={idx}
                        onClick={() => alert(`ขอบคุณสำหรับคะแนน ${idx + 1} ดาว! ระบบบันทึกฟีดแบ็กเพื่อพัฒนาการเรียนรู้ของ AI เรียบร้อยแล้วครับ ✨`)}
                        title={`ให้ ${idx + 1} ดาว`}
                        style={{ transition: 'transform 0.15s' }}
                        onMouseEnter={(e) => (e.target.style.transform = 'scale(1.25)')}
                        onMouseLeave={(e) => (e.target.style.transform = 'scale(1)')}
                      >
                        {star}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '24px' }}>
                  <a href={selectedAttraction.lat && selectedAttraction.lng ? `https://www.google.com/maps/search/?api=1&query=${selectedAttraction.lat},${selectedAttraction.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedAttraction.name + ' สุราษฎร์ธานี')}`} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#4285F4', color: 'white', padding: '15px', borderRadius: '12px', textDecoration: 'none', fontWeight: 'bold', fontSize: '15px', transition: 'all 0.3s ease' }}>📍 เปิดแอปนำทาง</a>
                  <button onClick={() => openVRMode(selectedAttraction)} style={{ flex: 1, backgroundColor: '#333', color: 'white', padding: '15px', borderRadius: '12px', border: 'none', fontWeight: 'bold', fontSize: '15px', cursor: 'pointer', transition: 'all 0.3s ease' }}>🕶️ เข้าสู่โหมด VR 360°</button>
                </div>
              </div>
            </div>
            <button className="btn btn-outline" onClick={() => setCurrentScreen(previousScreen)} style={{ width: '100%', marginTop: '30px', padding: '16px', fontSize: '16px', borderRadius: '20px', border: `2px solid ${textMuted}`, color: textMain }}>← ย้อนกลับ</button>
          </div>
        </div>
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