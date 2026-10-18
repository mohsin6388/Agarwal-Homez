import api from './axios.js';

export const audienceApi = {
  list: () => api.get('/audiences').then((response) => response.data),
  get: (id) => api.get(`/audiences/${id}`).then((response) => response.data),
  remove: (id) => api.delete(`/audiences/${id}`).then((response) => response.data),
  create: (payload) => api.post('/audiences', payload).then((response) => response.data),
  previewFile: (file, addCountryCode = true) => {
    const form = new FormData();
    form.append('file', file);
    form.append('method', 'upload');
    form.append('addCountryCode', String(addCountryCode));
    return api.post('/audiences/preview', form, { headers: { 'Content-Type': 'multipart/form-data' } }).then((response) => response.data);
  },
  previewText: (text, addCountryCode = true) => api.post('/audiences/preview', { method: 'paste', text, addCountryCode }).then((response) => response.data),
  previewLeads: (filter, addCountryCode = true) => api.post('/audiences/preview', { method: 'leads', filter, addCountryCode }).then((response) => response.data),
  sampleSheet: () => api.get('/leads/sample-sheet', { responseType: 'blob' }),
  invalidCsv: (id) => api.get(`/audiences/${id}/invalid.csv`, { responseType: 'blob' }),
};
