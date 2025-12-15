import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - token ekle
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // Admin route'ları için adminToken kullan
      // /admin, /ssids, /traffic/logs, /traffic/stats admin endpoint'leri
      const isAdminRoute = config.url?.includes('/admin') || 
                          config.url?.includes('/ssids') ||
                          (config.url?.includes('/traffic') && (config.url?.includes('/logs') || config.url?.includes('/stats')));
      const token = isAdminRoute 
        ? localStorage.getItem('adminToken') 
        : localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      console.log(`API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
        hasToken: !!token,
        isAdminRoute,
        tokenType: isAdminRoute ? 'adminToken' : 'token'
      });
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - hata yönetimi
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, response.status);
    return response;
  },
  (error) => {
    console.error('API Error:', {
      url: error.config?.url,
      method: error.config?.method,
      code: error.code,
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
    
    // Network error kontrolü
    if (!error.response) {
      // ECONNREFUSED, Network Error, timeout vb.
      if (error.code === 'ECONNREFUSED' || error.message === 'Network Error' || error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        console.error('Backend sunucusuna bağlanılamıyor:', error.message, error.code);
        error.networkError = true;
      }
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      console.log('401/403 Unauthorized - Token temizleniyor');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('token');
        localStorage.removeItem('adminToken');
        // Yönlendirme işlemini sayfa component'lerine bırak
        // Burada sadece token'ı temizliyoruz
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: { phone: string; password: string; macAddress?: string }) =>
    api.post('/auth/login', data),
  validateTCKN: (tckn: string, birthDate: string) =>
    api.post('/auth/validate-tckn', { tckn, birthDate }),
  sendOTP: (phone: string, userId?: number) =>
    api.post('/auth/send-otp', { phone, userId }),
  verifyOTP: (phone: string, code: string, userId: number) =>
    api.post('/auth/verify-otp', { phone, code, userId }),
  adminLogin: (email: string, password: string) =>
    api.post('/auth/admin-login', { email, password }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/user/profile'),
  getSession: () => api.get('/user/session'),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: any) => api.get('/admin/users', { params }),
  getUser: (id: number) => api.get(`/admin/users/${id}`),
  updateUser: (id: number, data: any) => api.put(`/admin/users/${id}`, data),
  blockUser: (id: number) => api.post(`/admin/users/${id}/block`),
  unblockUser: (id: number) => api.post(`/admin/users/${id}/unblock`),
  setQuota: (id: number, data: any) =>
    api.post(`/admin/users/${id}/set-quota`, data),
  verifyManual: (id: number) => api.post(`/admin/users/${id}/verify-manual`),
  approveUser: (id: number) => api.post(`/admin/users/${id}/approve`),
  rejectUser: (id: number) => api.post(`/admin/users/${id}/reject`),
  getLogs: (params?: any) => api.get('/admin/logs', { params }),
  exportLogs: (params?: any) =>
    api.get('/admin/logs/export', { params, responseType: 'blob' }),
  getMacList: (params?: any) => api.get('/admin/mac-list', { params }),
  addMacToList: (data: any) => api.post('/admin/mac-list', data),
  // Web Traffic API
  getWebTrafficLogs: (params?: any) => api.get('/traffic/logs', { params }),
  getWebTrafficStats: (params?: any) => api.get('/traffic/stats', { params }),
  // SSID API
  getSSIDs: () => api.get('/ssids'),
  getSSID: (ssid: string) => api.get(`/ssids/${ssid}`),
  getPublicSSIDs: () => api.get('/ssids/public'),
  createSSID: (data: any) => api.post('/ssids', data),
  updateSSID: (id: number, data: any) => api.put(`/ssids/${id}`, data),
  deleteSSID: (id: number) => api.delete(`/ssids/${id}`),
  uploadSSIDBackground: (id: number, file: File) => {
    const formData = new FormData();
    formData.append('backgroundImage', file);
    return api.post(`/ssids/${id}/background`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
};

export default api;

