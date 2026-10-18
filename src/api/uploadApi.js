import api from './axios.js';

export const uploadApi = {
  image: (file, folder = 'properties/images') => {
    const form = new FormData();
    form.append('image', file);
    form.append('folder', folder);
    return api.post('/uploads/image', form).then((r) => r.data);
  },
};
