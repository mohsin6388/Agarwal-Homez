import api from './axios.js';

export const audienceApi = {
  list: (params) => api.get('/audiences', { params }).then((r) => r.data),
  get: (id) => api.get(`/audiences/${id}`).then((r) => r.data),
  leads: (id, params) => api.get(`/audiences/${id}/leads`, { params }).then((r) => r.data),
  create: (payload) => api.post('/audiences', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/audiences/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/audiences/${id}`).then((r) => r.data),
};
