/**
 * ShopNest Offline Local Database Service
 * Utilizes @tauri-apps/plugin-sql for native SQLite storage in Desktop mode.
 * Falls back to localStorage / memory in Web development mode for seamless testing.
 */
import { isDesktop } from './tauriBridge';

const DB_NAME = 'sqlite:shopnest_pos.db';
const WEB_STORAGE_KEY_PRODUCTS = 'shopnest_offline_products';
const WEB_STORAGE_KEY_SHOPS = 'shopnest_offline_shops';
const WEB_STORAGE_KEY_SALES = 'shopnest_offline_pending_sales';

let sqliteDbInstance = null;

/**
 * Initialize SQLite database and create required schema tables.
 */
export const initDb = async () => {
  if (isDesktop()) {
    try {
      const Database = await import('@tauri-apps/plugin-sql');
      sqliteDbInstance = await Database.default.load(DB_NAME);

      // Create products table
      await sqliteDbInstance.execute(`
        CREATE TABLE IF NOT EXISTS products (
          product_id INTEGER PRIMARY KEY,
          shop_id INTEGER,
          sku TEXT,
          name TEXT,
          category TEXT,
          price REAL,
          stock_quantity INTEGER,
          image_url TEXT,
          updated_at TEXT
        );
      `);

      // Create shops table
      await sqliteDbInstance.execute(`
        CREATE TABLE IF NOT EXISTS shops (
          shop_id INTEGER PRIMARY KEY,
          name TEXT,
          branch TEXT,
          address TEXT,
          active INTEGER
        );
      `);

      // Create pending sales queue table (Append-Only log)
      await sqliteDbInstance.execute(`
        CREATE TABLE IF NOT EXISTS pending_sales (
          uuid TEXT PRIMARY KEY,
          shop_id INTEGER,
          payload_json TEXT,
          total_amount REAL,
          status TEXT,
          created_at TEXT,
          server_tx_id TEXT
        );
      `);
      console.log('[OfflineDb] Native SQLite schema initialized successfully.');
    } catch (error) {
      console.error('[OfflineDb] Failed to initialize SQLite database:', error);
    }
  } else {
    // Initialize web fallback storage if empty
    if (!localStorage.getItem(WEB_STORAGE_KEY_PRODUCTS)) {
      localStorage.setItem(WEB_STORAGE_KEY_PRODUCTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(WEB_STORAGE_KEY_SHOPS)) {
      localStorage.setItem(WEB_STORAGE_KEY_SHOPS, JSON.stringify([]));
    }
    if (!localStorage.getItem(WEB_STORAGE_KEY_SALES)) {
      localStorage.setItem(WEB_STORAGE_KEY_SALES, JSON.stringify([]));
    }
    console.log('[OfflineDb] Web storage fallback initialized.');
  }
};

/**
 * Mirror product catalogue into local database.
 * Uses upsert logic based on product_id.
 */
export const saveProducts = async (products = []) => {
  if (!products || !products.length) return;

  if (isDesktop() && sqliteDbInstance) {
    for (const p of products) {
      await sqliteDbInstance.execute(
        `INSERT OR REPLACE INTO products 
         (product_id, shop_id, sku, name, category, price, stock_quantity, image_url, updated_at) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          p.product_id || p.id,
          p.shop_id || 0,
          p.sku || '',
          p.name || '',
          p.category || '',
          Number(p.price) || 0,
          Number(p.stock_quantity) || 0,
          p.image_url || '',
          new Date().toISOString()
        ]
      );
    }
  } else {
    // Web fallback
    const current = JSON.parse(localStorage.getItem(WEB_STORAGE_KEY_PRODUCTS) || '[]');
    const map = new Map(current.map(item => [item.product_id, item]));
    products.forEach(p => {
      const pid = p.product_id || p.id;
      map.set(pid, { ...p, product_id: pid });
    });
    localStorage.setItem(WEB_STORAGE_KEY_PRODUCTS, JSON.stringify(Array.from(map.values())));
  }
};

/**
 * Query products from local storage for offline stock checking & POS search.
 */
export const getLocalProducts = async (shopId, search = '', category = '') => {
  if (isDesktop() && sqliteDbInstance) {
    let query = `SELECT * FROM products WHERE 1=1`;
    const params = [];
    if (shopId) {
      query += ` AND shop_id = $${params.length + 1}`;
      params.push(shopId);
    }
    if (search) {
      query += ` AND (name LIKE $${params.length + 1} OR sku LIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }
    if (category && category !== 'All' && category !== '') {
      query += ` AND category = $${params.length + 1}`;
      params.push(category);
    }
    return await sqliteDbInstance.select(query, params);
  } else {
    // Web fallback
    let current = JSON.parse(localStorage.getItem(WEB_STORAGE_KEY_PRODUCTS) || '[]');
    if (shopId) current = current.filter(p => Number(p.shop_id) === Number(shopId));
    if (search) {
      const q = search.toLowerCase();
      current = current.filter(p => p.name?.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q));
    }
    if (category && category !== 'All' && category !== '') {
      current = current.filter(p => p.category === category);
    }
    return current;
  }
};

/**
 * Mirror shop details locally.
 */
export const saveShops = async (shops = []) => {
  if (!shops || !shops.length) return;
  if (isDesktop() && sqliteDbInstance) {
    for (const s of shops) {
      await sqliteDbInstance.execute(
        `INSERT OR REPLACE INTO shops (shop_id, name, branch, address, active) VALUES ($1, $2, $3, $4, $5)`,
        [s.shop_id || s.id, s.name || '', s.branch || '', s.address || '', s.active ? 1 : 0]
      );
    }
  } else {
    localStorage.setItem(WEB_STORAGE_KEY_SHOPS, JSON.stringify(shops));
  }
};

/**
 * Queue a POS transaction locally when offline or for batch syncing.
 */
export const queueOfflineSale = async (shopId, payload) => {
  const uuid = 'offline-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
  const totalAmount = payload.tendered_amount || 0;
  const createdAt = new Date().toISOString();

  // Deduct local stock immediately to prevent double selling offline
  if (payload.items && Array.isArray(payload.items)) {
    for (const item of payload.items) {
      if (isDesktop() && sqliteDbInstance) {
        await sqliteDbInstance.execute(
          `UPDATE products SET stock_quantity = stock_quantity - $1 WHERE product_id = $2`,
          [item.quantity || 1, item.product_id]
        );
      } else {
        const products = JSON.parse(localStorage.getItem(WEB_STORAGE_KEY_PRODUCTS) || '[]');
        const idx = products.findIndex(p => Number(p.product_id) === Number(item.product_id));
        if (idx !== -1) {
          products[idx].stock_quantity = Math.max(0, (products[idx].stock_quantity || 0) - (item.quantity || 1));
          localStorage.setItem(WEB_STORAGE_KEY_PRODUCTS, JSON.stringify(products));
        }
      }
    }
  }

  if (isDesktop() && sqliteDbInstance) {
    await sqliteDbInstance.execute(
      `INSERT INTO pending_sales (uuid, shop_id, payload_json, total_amount, status, created_at, server_tx_id) 
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [uuid, shopId, JSON.stringify(payload), totalAmount, 'PENDING_SYNC', createdAt, '']
    );
  } else {
    const sales = JSON.parse(localStorage.getItem(WEB_STORAGE_KEY_SALES) || '[]');
    sales.push({ uuid, shop_id: shopId, payload_json: JSON.stringify(payload), total_amount: totalAmount, status: 'PENDING_SYNC', created_at: createdAt, server_tx_id: '' });
    localStorage.setItem(WEB_STORAGE_KEY_SALES, JSON.stringify(sales));
  }

  return { uuid, shop_id: shopId, ...payload, status: 'PENDING_SYNC', created_at: createdAt };
};

/**
 * Retrieve all pending sales awaiting synchronization.
 */
export const getPendingSales = async () => {
  if (isDesktop() && sqliteDbInstance) {
    return await sqliteDbInstance.select(`SELECT * FROM pending_sales WHERE status = 'PENDING_SYNC' ORDER BY created_at ASC`);
  } else {
    const sales = JSON.parse(localStorage.getItem(WEB_STORAGE_KEY_SALES) || '[]');
    return sales.filter(s => s.status === 'PENDING_SYNC');
  }
};

/**
 * Mark a queued sale as successfully synced to the cloud.
 */
export const markSaleSynced = async (uuid, serverTxId = 'synced') => {
  if (isDesktop() && sqliteDbInstance) {
    await sqliteDbInstance.execute(
      `UPDATE pending_sales SET status = 'SYNCED', server_tx_id = $1 WHERE uuid = $2`,
      [String(serverTxId), uuid]
    );
  } else {
    const sales = JSON.parse(localStorage.getItem(WEB_STORAGE_KEY_SALES) || '[]');
    const idx = sales.findIndex(s => s.uuid === uuid);
    if (idx !== -1) {
      sales[idx].status = 'SYNCED';
      sales[idx].server_tx_id = String(serverTxId);
      localStorage.setItem(WEB_STORAGE_KEY_SALES, JSON.stringify(sales));
    }
  }
};

/**
 * Get offline storage statistics for UI indicator badges.
 */
export const getOfflineStats = async () => {
  if (isDesktop() && sqliteDbInstance) {
    const pending = await sqliteDbInstance.select(`SELECT COUNT(*) as count FROM pending_sales WHERE status = 'PENDING_SYNC'`);
    const synced = await sqliteDbInstance.select(`SELECT COUNT(*) as count FROM pending_sales WHERE status = 'SYNCED'`);
    const products = await sqliteDbInstance.select(`SELECT COUNT(*) as count FROM products`);
    return {
      pendingSalesCount: pending[0]?.count || 0,
      syncedSalesCount: synced[0]?.count || 0,
      cachedProductsCount: products[0]?.count || 0,
    };
  } else {
    const sales = JSON.parse(localStorage.getItem(WEB_STORAGE_KEY_SALES) || '[]');
    const products = JSON.parse(localStorage.getItem(WEB_STORAGE_KEY_PRODUCTS) || '[]');
    return {
      pendingSalesCount: sales.filter(s => s.status === 'PENDING_SYNC').length,
      syncedSalesCount: sales.filter(s => s.status === 'SYNCED').length,
      cachedProductsCount: products.length,
    };
  }
};
