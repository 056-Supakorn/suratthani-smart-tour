import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Sent with every Admin-only request; set once after a successful admin login via /login_user.
export const getAdminHeaders = () => {
  let key = '';
  try {
    key = sessionStorage.getItem('adminKey') || '';
  } catch (e) {
    // sessionStorage unavailable (e.g. privacy mode) - request will simply be unauthorized
  }
  return { 'X-Admin-Key': key };
};

// Session token issued by the backend at login/registration. Kept in localStorage next
// to the other login info (userName/userRole), so logout's localStorage.clear() drops it.
const AUTH_TOKEN_KEY = 'authToken';

export const getAuthToken = () => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || '';
  } catch (e) {
    return '';
  }
};

export const setAuthToken = (token) => {
  try {
    if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch (e) {
    // storage unavailable - requests that need login will be rejected and ask to log in again
  }
};

const isApiRequest = (config) => (config.url || '').startsWith(API_BASE_URL);

// Attach the token to every request to our backend, so each call site doesn't have to.
axios.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token && isApiRequest(config)) {
    config.headers = config.headers || {};
    if (!config.headers.Authorization) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Token expired/invalid on a user (non-admin) request -> send the user back to log in.
// Admin requests (X-Admin-Key) handle their own 401 inside AdminScreen.
let redirectingToLogin = false;
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const config = error.config || {};
    const isAdminRequest = (config.url || '').includes('/admin/') || !!config.headers?.['X-Admin-Key'];
    if (error.response?.status === 401 && isApiRequest(config) && !isAdminRequest && !redirectingToLogin) {
      redirectingToLogin = true;
      alert('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่อีกครั้ง');
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        // ignore
      }
      window.location.reload();
    }
    return Promise.reject(error);
  }
);
