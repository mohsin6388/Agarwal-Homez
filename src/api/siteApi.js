import api from './axios.js';

export const siteApi = {
  list: () => api.get('/sites').then((r) => r.data),
  uploadBrochure: ({ siteName, label = '', city = '', location = '', brochure, images = [] }) => {
    const form = new FormData();
    form.append('siteName', siteName);
    if (label) form.append('label', label);
    if (city) form.append('city', city);
    if (location) form.append('location', location);
    if (brochure) form.append('brochure', brochure);
    images.forEach((image) => form.append('images', image));
    return api.post('/sites/brochure', form).then((r) => r.data);
  },
  update: (id, payload) => api.patch(`/sites/${id}`, payload).then((r) => r.data),
  removeBrochure: (id, brochureId) => api.delete(`/sites/${id}/brochures/${brochureId}`).then((r) => r.data),
  removeImage: (id, url) => api.delete(`/sites/${id}/images`, { data: { url } }).then((r) => r.data),
};

export const siteKey = (name) => String(name || '').toLowerCase().replace(/\s+/g, ' ').trim();
