import axios from 'axios';
import toast from 'react-hot-toast';

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[$()*+.?[\\\]^{|}-]/g, '\\$&')}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// Cross-domain CSRF: frontend can't always read backend cookies via `document.cookie`.
// We store the token returned from GET /api/auth/csrf and send it in X-CSRF-Token.
let csrfToken = null;

// Jest runs without Vite's `define`, so we must guard against missing identifier.
const RAW_API_BASE_URL =
  (typeof __VITE_API_BASE_URL__ !== 'undefined' && __VITE_API_BASE_URL__ ? __VITE_API_BASE_URL__ : '');

// Backend routes are mounted under `/api`, so normalize the baseURL accordingly.
let normalizedBaseURL = RAW_API_BASE_URL || '/api';
if (normalizedBaseURL !== '/api') {
  // Remove trailing slashes.
  normalizedBaseURL = normalizedBaseURL.replace(/\/+$/, '');
  // Ensure it ends with `/api`.
  if (!normalizedBaseURL.endsWith('/api')) normalizedBaseURL = `${normalizedBaseURL}/api`;
}

const api = axios.create({
  baseURL: normalizedBaseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach CSRF token for unsafe requests
api.interceptors.request.use(async config => {
  const method = (config.method || 'get').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    // Prefer in-memory token primed by /auth/csrf.
    if (csrfToken) {
      config.headers['X-CSRF-Token'] = csrfToken;
    } else {
      // Fallback for same-origin / dev.
      const fromCookie = (() => {
        try {
          return getCookie('csrf_token');
        } catch {
          return null;
        }
      })();
      if (fromCookie) config.headers['X-CSRF-Token'] = fromCookie;
    }
  }
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  res => res,
  async err => {
    const original = err.config;
    if (err.response?.status === 401 && !original._retry) {
      original._retry = true;
      try {
        // Refresh uses httpOnly cookie; no JS token storage.
        await api.post('/auth/refresh', null, { withCredentials: true });
        return api(original);
      } catch {
        window.location.href = '/login';
      }
    }
    // Centralized error toast (can be disabled per-request with _suppressErrorToast)
    if (!original?._suppressErrorToast) {
      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        err.message ||
        'Request failed';
      toast.error(message);
    }
    return Promise.reject(err);
  }
);

// ── Auth ──────────────────────────────────────────────────────────────────
export const authApi = {
  register: d => api.post('/auth/register', d),
  login: d => {
    const form = new URLSearchParams();
    form.append('username', d.email);
    form.append('password', d.password);
    return api.post('/auth/login', form, { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } });
  },
  me: () => api.get('/auth/me', { _suppressErrorToast: true }),
  updateMe: d => api.put('/auth/me', d),
  csrf: () =>
    api.get('/auth/csrf').then(res => {
      if (res?.data?.csrf_token) csrfToken = res.data.csrf_token;
      return res;
    }),
  logout: () => api.post('/auth/logout'),
  requestVerify: () => api.post('/auth/verify/request'),
  verifyEmail: token => api.post('/auth/verify', { token }),
  forgotPassword: email => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post('/auth/reset-password', { token, password }),
};

// ── Yacht ─────────────────────────────────────────────────────────────────
export const yachtApi = {
  get: () => {
    return api.get('/yacht/').then(res => {
      console.log('📡 API GET /yacht/ response:', res.data);
      return res;
    });
  },
  update: d => api.put('/yacht/', d),
  updatePricing: d => api.put('/yacht/pricing', d),
  uploadImage: file => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/yacht/images', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => {
      console.log('📡 API POST /yacht/images response:', res.data);
      return res;
    });
  },
  deleteImage: url => api.delete('/yacht/images', { params: { url } }),
  uploadVideo: file => {
    const fd = new FormData(); fd.append('file', file);
    return api.post('/yacht/videos', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(res => {
      console.log('📡 API POST /yacht/videos response:', res.data);
      return res;
    });
  },
  deleteVideo: filename => api.delete(`/yacht/videos/${filename}`),
  setFeaturedImage: url => api.post('/yacht/featured-image', null, { params: { url } }),
  setFeaturedVideo: url => api.post('/yacht/featured-video', null, { params: { url } }),
  blockDate: d => api.post('/yacht/block', d),
  getAvailability: (year, month) => api.get(`/yacht/availability?year=${year}&month=${month}`),
  listBlockedDates: () => api.get('/yacht/blocked-dates'),
  getExtras: () => api.get('/yacht/extras'),
  createExtra: d => api.post('/yacht/extras', d),
  updateExtra: (id, d) => api.put(`/yacht/extras/${id}`, d),
  deleteExtra: id => api.delete(`/yacht/extras/${id}`),
};

// ── Bookings ──────────────────────────────────────────────────────────────
export const bookingApi = {
  create: d => api.post('/bookings/', d),
  myBookings: () => api.get('/bookings/my'),
  list: (status) => api.get('/bookings/', { params: status ? { status } : {} }),
  get: id => api.get(`/bookings/${id}`),
  updateStatus: (id, d) => api.put(`/bookings/${id}/status`, d),
  delete: id => api.delete(`/bookings/${id}`),
  stats: () => api.get('/bookings/stats/overview'),
};

export default api;
