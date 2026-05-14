import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
};

export const incidentAPI = {
  getAll: () => api.get('/incidents'),
  getById: (id) => api.get(`/incidents/${id}`),
  create: (data) => api.post('/incidents', data),
  update: (id, data) => api.put(`/incidents/${id}`, data),
  delete: (id) => api.delete(`/incidents/${id}`),
};

export const resourceAPI = {
  getAll: () => api.get('/resources'),
  getById: (id) => api.get(`/resources/${id}`),
  create: (data) => api.post('/resources', data),
  update: (id, data) => api.put(`/resources/${id}`, data),
  delete: (id) => api.delete(`/resources/${id}`),
};

export const shelterAPI = {
  getAll: () => api.get('/shelters'),
  getById: (id) => api.get(`/shelters/${id}`),
  create: (data) => api.post('/shelters', data),
  update: (id, data) => api.put(`/shelters/${id}`, data),
  delete: (id) => api.delete(`/shelters/${id}`),
};

export const volunteerAPI = {
  getAll: () => api.get('/volunteers'),
  getById: (id) => api.get(`/volunteers/${id}`),
  create: (data) => api.post('/volunteers', data),
  update: (id, data) => api.put(`/volunteers/${id}`, data),
  delete: (id) => api.delete(`/volunteers/${id}`),
};

export const supplyAPI = {
  getAll: () => api.get('/supplies'),
  getById: (id) => api.get(`/supplies/${id}`),
  create: (data) => api.post('/supplies', data),
  update: (id, data) => api.put(`/supplies/${id}`, data),
  delete: (id) => api.delete(`/supplies/${id}`),
};

export const evacuationAPI = {
  getAll: () => api.get('/evacuations'),
  getById: (id) => api.get(`/evacuations/${id}`),
  create: (data) => api.post('/evacuations', data),
  update: (id, data) => api.put(`/evacuations/${id}`, data),
  delete: (id) => api.delete(`/evacuations/${id}`),
};

export const damageAssessmentAPI = {
  getAll: () => api.get('/damage-assessments'),
  getById: (id) => api.get(`/damage-assessments/${id}`),
  create: (data) => api.post('/damage-assessments', data),
  update: (id, data) => api.put(`/damage-assessments/${id}`, data),
  delete: (id) => api.delete(`/damage-assessments/${id}`),
};

export const communicationAPI = {
  getAll: () => api.get('/communications'),
  getById: (id) => api.get(`/communications/${id}`),
  create: (data) => api.post('/communications', data),
  update: (id, data) => api.put(`/communications/${id}`, data),
  delete: (id) => api.delete(`/communications/${id}`),
};

export const weatherAlertAPI = {
  getAll: () => api.get('/weather-alerts'),
  getById: (id) => api.get(`/weather-alerts/${id}`),
  create: (data) => api.post('/weather-alerts', data),
  update: (id, data) => api.put(`/weather-alerts/${id}`, data),
  delete: (id) => api.delete(`/weather-alerts/${id}`),
};

export const donationAPI = {
  getAll: () => api.get('/donations'),
  getById: (id) => api.get(`/donations/${id}`),
  create: (data) => api.post('/donations', data),
  update: (id, data) => api.put(`/donations/${id}`, data),
  delete: (id) => api.delete(`/donations/${id}`),
};

export const medicalResourceAPI = {
  getAll: () => api.get('/medical-resources'),
  getById: (id) => api.get(`/medical-resources/${id}`),
  create: (data) => api.post('/medical-resources', data),
  update: (id, data) => api.put(`/medical-resources/${id}`, data),
  delete: (id) => api.delete(`/medical-resources/${id}`),
};

export const searchRescueAPI = {
  getAll: () => api.get('/search-rescue'),
  getById: (id) => api.get(`/search-rescue/${id}`),
  create: (data) => api.post('/search-rescue', data),
  update: (id, data) => api.put(`/search-rescue/${id}`, data),
  delete: (id) => api.delete(`/search-rescue/${id}`),
};

export const infrastructureAPI = {
  getAll: () => api.get('/infrastructure'),
  getById: (id) => api.get(`/infrastructure/${id}`),
  create: (data) => api.post('/infrastructure', data),
  update: (id, data) => api.put(`/infrastructure/${id}`, data),
  delete: (id) => api.delete(`/infrastructure/${id}`),
};

export const threatAnalysisAPI = {
  getAll: () => api.get('/threat-analysis'),
  getById: (id) => api.get(`/threat-analysis/${id}`),
  create: (data) => api.post('/threat-analysis', data),
  update: (id, data) => api.put(`/threat-analysis/${id}`, data),
  delete: (id) => api.delete(`/threat-analysis/${id}`),
};

export const aiAPI = {
  analyzeThreat: (data) => api.post('/ai/analyze-threat', data),
  generateEvacuationPlan: (data) => api.post('/ai/generate-evacuation-plan', data),
  assessDamage: (data) => api.post('/ai/assess-damage', data),
  predictWeather: (data) => api.post('/ai/predict-weather', data),
  optimizeResources: (data) => api.post('/ai/optimize-resources', data),
  generateReport: (data) => api.post('/ai/generate-report', data),
  triageMedical: (data) => api.post('/ai/triage-medical', data),
  searchStrategy: (data) => api.post('/ai/search-strategy', data),
};

export const mapAPI = {
  getGeo: (params = {}) => api.get('/map/geo', { params }),
  getBounds: () => api.get('/map/bounds'),
};

export const briefingAPI = {
  generate: () => api.post('/briefing/commander'),
  recent: (limit = 10) => api.get('/briefing/recent', { params: { limit } }),
};

export const externalDataAPI = {
  usgsEarthquakes: (minMag = 2.5) => api.get('/external-data/usgs-earthquakes', { params: { minMag } }),
  noaaAlerts: (area) => api.get('/external-data/noaa-alerts', { params: area ? { area } : {} }),
  importNoaaAlerts: (area) => api.post('/external-data/import-noaa-alerts', area ? { area } : {}),
};

export const mutualAidAPI = {
  list: (params = {}) => api.get('/mutual-aid', { params }),
  create: (data) => api.post('/mutual-aid', data),
  delete: (id) => api.delete(`/mutual-aid/${id}`),
  match: () => api.post('/mutual-aid/match'),
};

export const aarAPI = {
  list: (params = {}) => api.get('/aar', { params }),
  start: (incident_id) => api.post('/aar/start', { incident_id }),
  approve: (id, data) => api.post(`/aar/${id}/approve`, data),
  finalize: (id) => api.post(`/aar/${id}/finalize`),
  exportUrl: (id) => `/api/aar/${id}/export`,
};

export default api;
