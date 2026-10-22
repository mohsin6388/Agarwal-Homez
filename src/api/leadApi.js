import api from "./axios.js";

export const leadApi = {
  list: (params) => api.get("/leads", { params }).then((r) => r.data),
  get: (id) => api.get(`/leads/${id}`).then((r) => r.data),
  create: (payload) => api.post("/leads", payload).then((r) => r.data),
  update: (id, payload) =>
    api.patch(`/leads/${id}`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/leads/${id}`).then((r) => r.data),
  bulkDelete: (ids) =>
    api.post("/leads/bulk-delete", { ids }).then((r) => r.data),
  updateTags: (id, payload) =>
    api.post(`/leads/${id}/tags`, payload).then((r) => r.data),
  importPreview: (file) => {
    const form = new FormData();
    form.append("file", file);
    return api
      .post("/leads/import/preview", form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data);
  },
  importParseText: (text) =>
    api.post("/leads/import/parse-text", { text }).then((r) => r.data),
  // Big sheets are sent in chunks so one request never hits the body-size limit
  // (which used to drop part of a large upload). Results are merged.
  importConfirm: async (rows, chunkSize = 1000) => {
    const merged = {
      insertedCount: 0,
      skipped: 0,
      invalid: 0,
      leadIds: [],
      existingLeadIds: [],
    };
    let message = "";
    for (let i = 0; i < rows.length; i += chunkSize) {
      const res = await api
        .post("/leads/import/confirm", { rows: rows.slice(i, i + chunkSize) })
        .then((r) => r.data);
      const d = res.data || {};
      merged.insertedCount += d.insertedCount || 0;
      merged.skipped += d.skipped || 0;
      merged.invalid += d.invalid || 0;
      merged.leadIds.push(...(d.leadIds || []));
      merged.existingLeadIds.push(...(d.existingLeadIds || []));
      message = res.message || message;
    }
    return { success: true, message, data: merged };
  },
  startConversations: (leadIds) =>
    api.post("/leads/start-conversations", { leadIds }).then((r) => r.data),
  importFiles: () => api.get("/leads/import-files").then((r) => r.data),
  orderedIds: (params) =>
    api
      .get("/leads", { params: { ...params, idsOnly: 1 } })
      .then((r) => r.data),
  exportUrl: () => `${api.defaults.baseURL}/leads/export`,
};
