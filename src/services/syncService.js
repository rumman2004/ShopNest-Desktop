/**
 * ShopNest Background Synchronization Daemon & Network Monitor
 * Manages bi-directional data flow between remote cloud REST API and local offline database.
 */
import { 
  initDb, 
  saveProducts, 
  saveShops, 
  getPendingSales, 
  markSaleSynced, 
  getOfflineStats 
} from './offlineDb';
import productService from './productService';
import shopService from './shopService';
import salesService from './salesService';

let syncInterval = null;
let isSyncing = false;
let listeners = [];

const state = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  pendingSalesCount: 0,
  syncedSalesCount: 0,
  cachedProductsCount: 0,
  lastSyncedAt: null,
  error: null
};

const notifyListeners = () => {
  listeners.forEach(fn => fn({ ...state }));
};

/**
 * Subscribe UI components to background sync status events.
 */
export const subscribeSyncStatus = (fn) => {
  listeners.push(fn);
  fn({ ...state });
  return () => {
    listeners = listeners.filter(l => l !== fn);
  };
};

/**
 * Update stats and broadcast to listeners.
 */
export const refreshOfflineStats = async () => {
  const stats = await getOfflineStats();
  state.pendingSalesCount = stats.pendingSalesCount;
  state.syncedSalesCount = stats.syncedSalesCount;
  state.cachedProductsCount = stats.cachedProductsCount;
  notifyListeners();
  return stats;
};

/**
 * Trigger an immediate synchronization cycle.
 */
export const triggerSync = async (shopId) => {
  if (isSyncing) return;
  if (!state.isOnline) {
    console.log('[SyncEngine] Network offline. Skipping sync cycle.');
    await refreshOfflineStats();
    return;
  }

  isSyncing = true;
  state.isSyncing = true;
  state.error = null;
  notifyListeners();

  console.log('[SyncEngine] Starting background synchronization cycle...');

  try {
    // 1. Sync pending offline sales to Cloud API
    const pendingSales = await getPendingSales();
    if (pendingSales.length > 0) {
      console.log(`[SyncEngine] Found ${pendingSales.length} pending offline sales to sync.`);
      for (const sale of pendingSales) {
        try {
          const payload = typeof sale.payload_json === 'string' 
            ? JSON.parse(sale.payload_json) 
            : sale.payload_json;
            
          const res = await salesService.checkout(sale.shop_id, payload);
          const serverTxId = res?.data?.sale_id || res?.data?.id || 'synced-' + Date.now();
          
          await markSaleSynced(sale.uuid, serverTxId);
          console.log(`[SyncEngine] Successfully synced sale ${sale.uuid} -> Server ID ${serverTxId}`);
        } catch (err) {
          console.warn(`[SyncEngine] Could not sync sale ${sale.uuid}. Will retry next cycle:`, err.message);
        }
      }
    }

    // Only fetch from protected cloud APIs if the user is currently authenticated
    const hasToken = typeof localStorage !== 'undefined' && localStorage.getItem('token');

    // 2. Mirror latest Products from Cloud API (if shopId is available and logged in)
    if (shopId && hasToken) {
      try {
        const productsRes = await productService.getAll(shopId);
        const productList = productsRes?.data || productsRes?.data?.products || [];
        if (Array.isArray(productList)) {
          await saveProducts(productList);
        }
      } catch (err) {
        console.warn('[SyncEngine] Failed pulling products:', err.message);
      }
    }

    // 3. Mirror Shops list (if logged in)
    if (hasToken) {
      try {
        const shopsRes = await shopService.getAll();
        const shopList = shopsRes?.data || [];
        if (Array.isArray(shopList)) {
          await saveShops(shopList);
        }
      } catch (err) {
        console.warn('[SyncEngine] Failed pulling shops:', err.message);
      }
    }

    state.lastSyncedAt = new Date().toISOString();
    console.log('[SyncEngine] Synchronization cycle completed cleanly.');
  } catch (error) {
    console.error('[SyncEngine] Sync cycle encountered error:', error);
    state.error = error.message || 'Sync failed';
  } finally {
    isSyncing = false;
    state.isSyncing = false;
    await refreshOfflineStats();
  }
};

/**
 * Initialize sync daemon and attach network status event listeners.
 */
export const initSyncEngine = async (shopId, intervalMs = 60000) => {
  await initDb();
  await refreshOfflineStats();

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      console.log('[SyncEngine] Network connection restored! Triggering immediate sync.');
      state.isOnline = true;
      notifyListeners();
      triggerSync(shopId);
    });

    window.addEventListener('offline', () => {
      console.warn('[SyncEngine] Network connection lost. Switching to offline mode.');
      state.isOnline = false;
      notifyListeners();
    });
  }

  // Initial sync attempt
  triggerSync(shopId);

  // Periodic loop
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = setInterval(() => {
    triggerSync(shopId);
  }, intervalMs);

  console.log(`[SyncEngine] Daemon initialized with loop interval of ${intervalMs / 1000}s.`);
};

export const stopSyncEngine = () => {
  if (syncInterval) clearInterval(syncInterval);
  syncInterval = null;
};
