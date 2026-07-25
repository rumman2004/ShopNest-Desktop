import api from './api'
import { queueOfflineSale } from './offlineDb'

const salesService = {
  checkout: async (shopId, data) => {
    // If browser/desktop reports offline, queue immediately
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('[SalesService] Device offline. Queueing sale locally.');
      const offlineSale = await queueOfflineSale(shopId, data);
      return { success: true, offline: true, data: { ...data, sale_id: offlineSale.uuid, id: offlineSale.uuid } };
    }
    try {
      return await api.post('/sales', { shop_id: shopId, ...data });
    } catch (err) {
      // If network error occurs during online check, fallback to offline queue
      if (!err.response || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        console.warn('[SalesService] Network error during checkout. Falling back to offline queue.');
        const offlineSale = await queueOfflineSale(shopId, data);
        return { success: true, offline: true, data: { ...data, sale_id: offlineSale.uuid, id: offlineSale.uuid } };
      }
      throw err;
    }
  },

  getAll: (shopId, params) =>
    api.get(`/sales/shop/${shopId}`, { params }),

  getById: (shopId, id) =>
    api.get(`/sales/${id}`),

  getDailySummary: (shopId, date) =>
    api.get(`/sales/shop/${shopId}/date-range`, {
      params: { start_date: date, end_date: date, limit: 100 }
    }),

  getByDateRange: (shopId, params) =>
    api.get(`/sales/shop/${shopId}/date-range`, { params }),

  getSalesByCashier: (cashierId, params) =>
    api.get(`/sales/cashier/${cashierId}`, { params }),

  getReports: (shopId, params) =>
    api.get(`/reports/dashboard/${shopId}`, { params }),

  exportSales: (shopId, params) =>
    api.get(`/reports/export/sales/${shopId}`, { 
        params: { ...params, format: 'csv' }
    }),
}

export default salesService
