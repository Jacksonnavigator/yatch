import axios from 'axios';
import toast from 'react-hot-toast';

function getCookie(name) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name.replace(/[$()*+.?[\\\]^{|}-]/g, '\\$&')}=([^;]*)`));
  return m ? decodeURIComponent(m[1]) : null;
}

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

// Attach CSRF token for unsafe requests
api.interceptors.request.use(async config => {
  const method = (config.method || 'get').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    const csrf = getCookie('csrf_token');
    if (csrf) config.headers['X-CSRF-Token'] = csrf;
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
        await axios.post('/api/auth/refresh', null, { withCredentials: true });
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
  me: () => api.get('/auth/me'),
  updateMe: d => api.put('/auth/me', d),
  csrf: () => api.get('/auth/csrf'),
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
  deleteImage: filename => api.delete(`/yacht/images/${filename}`),
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
