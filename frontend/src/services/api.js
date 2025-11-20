import axios from 'axios';

// In production (Docker), API is served from same origin
// In development, proxy is configured in package.json
// In Electron, API is always at localhost:3001
const getAPIBaseURL = () => {
  // Check if running in Electron
  if (window.electron && window.electron.isElectron) {
    return 'http://localhost:3001';
  }
  return process.env.REACT_APP_API_URL || '';
};

const API_BASE_URL = getAPIBaseURL();

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
  getHistory: (id, limit = 100) => api.get(`/api/endpoints/${id}/history`, { params: { limit } }),
  export: (ids = null) => {
    const params = ids ? { ids: ids.join(',') } : {};
    return api.get('/api/endpoints/export', { params });
  },
  import: (data) => api.post('/api/endpoints/import', data)
};

// Settings API
export const settingsAPI = {
  getAll: () => api.get('/api/settings'),
  updateRetention: (days) => api.put('/api/settings/retention', { retention_days: days }),
  updateOpenAI: (settings) => api.put('/api/settings/openai', settings),
  getDefaultPrompt: () => api.get('/api/settings/openai/default-prompt')
};

// Analysis API
export const analysisAPI = {
  analyzeCheckResult: (endpointId, checkResultId) => 
    api.post(`/api/endpoints/${endpointId}/check-results/${checkResultId}/analyze`)
};

export default api;
