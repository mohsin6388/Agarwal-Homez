import api from './axios.js';

export const whatsappApi = {
  status: () => api.get('/whatsapp/status').then((r) => r.data),
  templates: () => api.get('/whatsapp/templates').then((r) => r.data),
  allTemplates: () => api.get('/whatsapp/templates/all').then((r) => r.data),
  templateDrafts: () => api.get('/whatsapp/templates/drafts').then((r) => r.data),
  saveTemplateDraft: (payload) => api.post('/whatsapp/templates/drafts', payload).then((r) => r.data),
  deleteTemplateDraft: (id) => api.delete(`/whatsapp/templates/drafts/${encodeURIComponent(id)}`).then((r) => r.data),
  uploadTemplateHeader: (file) => { const form = new FormData(); form.append('file', file); return api.post('/whatsapp/templates/upload-header', form).then((r) => r.data); },
  createTemplate: (payload) => api.post('/whatsapp/templates', payload).then((r) => r.data),
  deleteTemplate: (name) => api.delete(`/whatsapp/templates/${encodeURIComponent(name)}`).then((r) => r.data),
  sendTest: (phone, text) => api.post('/whatsapp/send-test', { phone, text }).then((r) => r.data),
  sendTestTemplate: (phone) => api.post('/whatsapp/send-test-template', { phone }).then((r) => r.data),
  disconnect: () => api.post('/whatsapp/disconnect').then((r) => r.data),
  reconnect: () => api.post('/whatsapp/reconnect').then((r) => r.data),
};
