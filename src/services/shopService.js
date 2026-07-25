import api from './api'
import { saveShops } from './offlineDb'

const shopService = {
  // Backend response shape: { success, message, data: [...] or data: {} }
  getAll: async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('[ShopService] Device offline. Fetching shops from local storage.');
      const cached = JSON.parse(localStorage.getItem('shopnest_offline_shops') || '[]');
      return { success: true, offline: true, data: cached };
    }
    try {
      const res = await api.get('/shops');
      const shopsList = res?.data || [];
      if (Array.isArray(shopsList)) {
        saveShops(shopsList).catch(() => {});
      }
      return res;
    } catch (err) {
      if (!err.response || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        const cached = JSON.parse(localStorage.getItem('shopnest_offline_shops') || '[]');
        return { success: true, offline: true, data: cached };
      }
      throw err;
    }
  },
  getById: (shop_id) => api.get(`/shops/${shop_id}`),
  create: (data) => api.post('/shops', data),
  update: (shop_id, data) => api.put(`/shops/${shop_id}`, data),
  delete: (shop_id) => api.delete(`/shops/${shop_id}`),
  uploadLogo: (shop_id, formData) =>
    api.post(`/shops/${shop_id}/logo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  setActive: (shop_id) => api.patch(`/shops/${shop_id}/active`),
  getActivePreference: () => api.get('/shops/preference/active'),
}

export default shopService