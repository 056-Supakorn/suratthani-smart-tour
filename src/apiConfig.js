export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Sent with every Admin-only request; set once after a successful /login_admin call.
export const getAdminHeaders = () => {
  let key = '';
  try {
    key = sessionStorage.getItem('adminKey') || '';
  } catch (e) {
    // sessionStorage unavailable (e.g. privacy mode) - request will simply be unauthorized
  }
  return { 'X-Admin-Key': key };
};
