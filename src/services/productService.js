import api from './api'
import { getLocalProducts, saveProducts } from './offlineDb'

const productService = {
  // GET /shops/:shop_id/products?search=x&category=y
  getAll: async (shopId, params = {}) => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      console.warn('[ProductService] Device offline. Fetching products from local SQLite/storage.');
      const localProducts = await getLocalProducts(shopId, params.search, params.category);
      return { success: true, offline: true, data: { products: localProducts } };
    }
    try {
      const res = await api.get(`/shops/${shopId}/products`, { params });
      // Opportunistically mirror products to offline storage when fetched online
      const productsList = res?.data?.products || res?.data || [];
      if (Array.isArray(productsList)) {
        saveProducts(productsList).catch(() => {});
      }
      return res;
    } catch (err) {
      if (!err.response || err.message === 'Network Error' || err.code === 'ERR_NETWORK') {
        console.warn('[ProductService] Network error. Falling back to local offline inventory.');
        const localProducts = await getLocalProducts(shopId, params.search, params.category);
        return { success: true, offline: true, data: { products: localProducts } };
      }
      throw err;
    }
  },

  // GET /shops/:shop_id/products/:product_id
  getById: (shopId, productId) =>
    api.get(`/shops/${shopId}/products/${productId}`),

  // POST /shops/:shop_id/products
  create: (shopId, data) =>
    api.post(`/shops/${shopId}/products`, data),

  // PUT /shops/:shop_id/products/:product_id
  update: (shopId, productId, data) =>
    api.put(`/shops/${shopId}/products/${productId}`, data),

  // DELETE /shops/:shop_id/products/:product_id
  delete: (shopId, productId) =>
    api.delete(`/shops/${shopId}/products/${productId}`),

  // GET /categories/shop/:shop_id
  getCategories: (shopId) =>
    api.get(`/categories/shop/${shopId}`),

  // Upload image via the existing PUT update route
  // Backend already has upload.single('image') middleware on PUT /:product_id
  uploadImage: (shopId, productId, formData) =>
    api.put(`/shops/${shopId}/products/${productId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
}

export default productService