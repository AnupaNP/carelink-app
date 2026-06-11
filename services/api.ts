import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/config';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('carelink_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/api/auth/login', { email, password }),
  register: (data: { name: string; email: string; password: string; phone?: string }) =>
    api.post('/api/auth/register', data),
  me: () => api.get('/api/auth/me'),
  savePushToken: (push_token: string) =>
    api.patch('/api/auth/push-token', { push_token }),
};

// Elders
export const eldersApi = {
  list: () => api.get('/api/elders'),
  get: (id: string) => api.get(`/api/elders/${id}`),
  create: (data: any) => api.post('/api/elders', data),
  update: (id: string, data: any) => api.put(`/api/elders/${id}`, data),
  delete: (id: string) => api.delete(`/api/elders/${id}`),
  uploadPhoto: async (id: string, uri: string) => {
    const formData = new FormData();
    const filename = uri.split('/').pop() || 'photo.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : 'image/jpeg';
    formData.append('photo', { uri, name: filename, type } as any);
    const token = await AsyncStorage.getItem('carelink_token');
    return axios.post(`${API_BASE_URL}/api/elders/${id}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      timeout: 30000,
    });
  },
};

// Schedules
export const schedulesApi = {
  list: (elder_id: string) => api.get(`/api/schedules?elder_id=${elder_id}`),
  create: (data: any) => api.post('/api/schedules', data),
  update: (id: string, data: any) => api.put(`/api/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/api/schedules/${id}`),
};

// Calls
export const callsApi = {
  list: (elder_id: string) => api.get(`/api/calls?elder_id=${elder_id}`),
  get: (id: string) => api.get(`/api/calls/${id}`),
  simulate: (elder_id: string, scenario: string) =>
    api.post('/api/calls/simulate', { elder_id, scenario }),
};

// Alerts
export const alertsApi = {
  list: (params?: { elder_id?: string; unread_only?: boolean }) =>
    api.get('/api/alerts', { params }),
  markRead: (id: string) => api.patch(`/api/alerts/${id}/read`),
  markAllRead: (elder_id?: string) =>
    api.patch('/api/alerts/read-all', elder_id ? { elder_id } : {}),
};

// Insights
export const insightsApi = {
  get: () => api.get('/api/insights'),
};

// Reports
export const reportsApi = {
  getElderReportUrl: (elderId: string) => `${API_BASE_URL}/api/reports/elder/${elderId}`,
};

export default api;

