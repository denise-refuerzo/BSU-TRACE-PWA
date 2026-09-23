import Swal from 'sweetalert2';
import axios from 'axios';

// Replace line 4 in api.js:
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://bsu-trace-pwa.onrender.com';
const API = axios.create({
  baseURL: API_BASE_URL,
});
let logoutPromptActive = false;
const inFlightGets = new Map();

export default API;

const performAuthenticatedFetch = async (url, options = {}) => {
  const token = localStorage.getItem('token');
  
  // Form the full URL if a relative path is passed
  const targetUrl = url.startsWith('http')
    ? url
    : `${API_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;

  // Attach the Authorization header automatically
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    'Authorization': token ? `Bearer ${token}` : ''
  };

  const response = await fetch(targetUrl, { ...options, headers });
  
  // Clone the response to read it for the interceptor 
  // without locking the data stream for your components.
  const clonedResponse = response.clone();
  
  let data = null;
  try { data = await clonedResponse.json(); } catch { /* Empty and non-JSON responses are valid. */ }

  // Handles concurrent login, inactivity expiry, and absolute session expiry.
  if (response.status === 401 && data?.forceLogout) {
    if (!logoutPromptActive) {
      logoutPromptActive = true;
      localStorage.clear();
      Swal.fire({
        title: 'Session Expired',
        text: data.error || 'Your session is no longer valid. Please sign in again.',
        icon: 'warning',
        confirmButtonColor: '#800000',
        allowOutsideClick: false
      }).then(() => {
        window.location.href = '/login';
      });
    }
  }

  // Return the raw response object so res.json() and res.ok function perfectly in your views
  return response;
};

export const fetchWithAuth = async (url, options = {}) => {
  const method = String(options.method || 'GET').toUpperCase();
  if (method !== 'GET') return performAuthenticatedFetch(url, options);
  const key = `${localStorage.getItem('token') || ''}:${url}`;
  if (!inFlightGets.has(key)) {
    inFlightGets.set(key, performAuthenticatedFetch(url, options).finally(() => inFlightGets.delete(key)));
  }
  const response = await inFlightGets.get(key);
  return response.clone();
};

export const endSession = async () => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      await fetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }
      });
    } catch { /* Local cleanup must still complete if the server is unavailable. */ }
  }
  localStorage.clear();
  sessionStorage.removeItem('bsu_pwa_banner_dismissed');
};
