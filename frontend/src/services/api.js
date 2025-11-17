import axios from 'axios';

// In production (Docker), API is served from same origin
// In development, proxy is configured in package.json
const API_BASE_URL = process.env.REACT_APP_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Endpoints API
export const endpointsAPI = {
  getAll: () => api.get('/api/endpoints'),
  getById: (id) => api.get(`/api/endpoints/${id}`),
  create: (data) => api.post('/api/endpoints', data),
  update: (id, data) => api.put(`/api/endpoints/${id}`, data),
  delete: (id) => api.delete(`/api/endpoints/${id}`),
  triggerCheck: (id) => api.post(`/api/endpoints/${id}/check`),
  getHistory: (id, limit = 100) => api.get(`/api/endpoints/${id}/history`, { params: { limit } })
};

// Settings API
export const settingsAPI = {
  getAll: () => api.get('/api/settings'),
  updateRetention: (days) => api.put('/api/settings/retention', { retention_days: days })
};

export default api;
