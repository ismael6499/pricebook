import * as SQLite from 'expo-sqlite';
import { INITIAL_SCHEMA, DB_NAME } from './schema';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DB_NAME);
    await initDatabase(dbInstance);
  }
  return dbInstance;
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync(INITIAL_SCHEMA);
}

// -------------------------------------------------------------------------
// Types & Interfaces
// -------------------------------------------------------------------------

export interface Category {
  id: number;
  name: string;
  color: string;
  icon: string;
  is_default: number;
  created_at: string;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  unit: string;
  image_uri: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  // Computed fields
  latest_price?: number;
  previous_price?: number;
  price_variation?: number; // % variation vs previous
  last_purchase_date?: string;
  total_purchases_count?: number;
}

export interface Purchase {
  id: number;
  product_id: number;
  product_name?: string;
  unit_price: number;
  quantity: number;
  total_amount: number;
  currency: string;
  usd_rate: number | null;
  purchase_date: string; // ISO string YYYY-MM-DD HH:mm:ss
  store: string | null;
  buyer: string | null;
  status: 'pending' | 'settled';
  settlement_id: number | null;
  notes: string | null;
  created_at: string;
  // Computed fields
  price_variation_vs_previous?: number;
}

export interface Settlement {
  id: number;
  period: string; // YYYY-MM
  total_settled: number;
  purchases_count: number;
  settled_at: string;
  payment_method: string | null;
  notes: string | null;
}

export interface MonthlySummary {
  period: string; // YYYY-MM
  total_spent: number;
  total_pending_to_repay: number;
  total_settled: number;
  pending_count: number;
  settled_count: number;
  previous_month_total: number;
  variation_vs_prev_month: number; // %
  top_increases: Array<{
    product_id: number;
    name: string;
    current_price: number;
    previous_price: number;
    variation_pct: number;
  }>;
}

export interface MonthlyPlanItem {
  id: number;
  name: string;
  category: string;
  unit_desc: string | null;
  estimated_unit_price: number;
  estimated_monthly_qty: number;
  estimated_monthly_total: number;
  notes: string | null;
  created_at: string;
  current_real_price?: number;
  variation_vs_estimate?: number;
}

// -------------------------------------------------------------------------
// Categories CRUD
// -------------------------------------------------------------------------

export async function getCategories(): Promise<Category[]> {
  const db = await getDatabase();
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY name ASC');
}

export async function createCategory(name: string, color: string = '#3B82F6', icon: string = 'pricetag'): Promise<number> {
  const db = await getDatabase();
  const res = await db.runAsync(
    'INSERT INTO categories (name, color, icon) VALUES (?, ?, ?)',
    name.trim(),
    color,
    icon
  );
  return res.lastInsertRowId;
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM categories WHERE id = ? AND is_default = 0', id);
}

// -------------------------------------------------------------------------
// Products CRUD & Computations
// -------------------------------------------------------------------------

export async function getAllProducts(searchQuery: string = '', categoryFilter: string = 'All'): Promise<Product[]> {
  const db = await getDatabase();
  
  let sql = `
    SELECT p.*,
      (SELECT unit_price FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1) as latest_price,
      (SELECT unit_price FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1 OFFSET 1) as previous_price,
      (SELECT purchase_date FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1) as last_purchase_date,
      (SELECT COUNT(*) FROM purchases WHERE product_id = p.id) as total_purchases_count
    FROM products p
    WHERE 1=1
  `;
  const params: any[] = [];

  if (searchQuery.trim().length > 0) {
    sql += ' AND p.name LIKE ?';
    params.push(`%${searchQuery.trim()}%`);
  }

  if (categoryFilter !== 'All') {
    sql += ' AND p.category = ?';
    params.push(categoryFilter);
  }

  sql += ' ORDER BY p.name ASC';

  const rows = await db.getAllAsync<Product>(sql, ...params);

  return rows.map((prod) => {
    let variation = 0;
    if (prod.latest_price && prod.previous_price && prod.previous_price > 0) {
      variation = ((prod.latest_price - prod.previous_price) / prod.previous_price) * 100;
    }
    return {
      ...prod,
      price_variation: Number(variation.toFixed(2)),
    };
  });
}

export async function getProductById(id: number): Promise<Product | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Product>(
    `SELECT p.*,
      (SELECT unit_price FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1) as latest_price,
      (SELECT unit_price FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1 OFFSET 1) as previous_price,
      (SELECT purchase_date FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1) as last_purchase_date,
      (SELECT COUNT(*) FROM purchases WHERE product_id = p.id) as total_purchases_count
     FROM products p
     WHERE p.id = ?`,
    id
  );

  if (!row) return null;

  let variation = 0;
  if (row.latest_price && row.previous_price && row.previous_price > 0) {
    variation = ((row.latest_price - row.previous_price) / row.previous_price) * 100;
  }
  return {
    ...row,
    price_variation: Number(variation.toFixed(2)),
  };
}

export async function createProduct(data: {
  name: string;
  category?: string;
  unit?: string;
  notes?: string;
  image_uri?: string | null;
}): Promise<number> {
  const db = await getDatabase();
  const res = await db.runAsync(
    `INSERT INTO products (name, category, unit, notes, image_uri) VALUES (?, ?, ?, ?, ?)`,
    data.name.trim(),
    data.category || 'General',
    data.unit || '1 u',
    data.notes || null,
    data.image_uri || null
  );
  return res.lastInsertRowId;
}

export async function updateProduct(id: number, data: {
  name: string;
  category?: string;
  unit?: string;
  notes?: string | null;
  image_uri?: string | null;
}): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE products 
     SET name = ?, category = ?, unit = ?, notes = ?, image_uri = ?, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    data.name.trim(),
    data.category || 'General',
    data.unit || '1 u',
    data.notes || null,
    data.image_uri !== undefined ? data.image_uri : null,
    id
  );
}

export async function deleteProduct(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM products WHERE id = ?', id);
}

// -------------------------------------------------------------------------
// Purchases CRUD
// -------------------------------------------------------------------------

export async function getPurchases(options?: {
  productId?: number;
  status?: 'pending' | 'settled' | 'all';
  monthPeriod?: string; // YYYY-MM
  limit?: number;
}): Promise<Purchase[]> {
  const db = await getDatabase();
  let sql = `
    SELECT pu.*, pr.name as product_name
    FROM purchases pu
    JOIN products pr ON pu.product_id = pr.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (options?.productId) {
    sql += ' AND pu.product_id = ?';
    params.push(options.productId);
  }

  if (options?.status && options.status !== 'all') {
    sql += ' AND pu.status = ?';
    params.push(options.status);
  }

  if (options?.monthPeriod) {
    sql += ' AND pu.purchase_date LIKE ?';
    params.push(`${options.monthPeriod}%`);
  }

  sql += ' ORDER BY pu.purchase_date DESC, pu.id DESC';

  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  return db.getAllAsync<Purchase>(sql, ...params);
}

export async function createPurchase(data: {
  product_id: number;
  unit_price: number;
  quantity?: number;
  purchase_date?: string;
  store?: string;
  buyer?: string;
  notes?: string;
  status?: 'pending' | 'settled';
  currency?: string;
  usd_rate?: number | null;
}): Promise<number> {
  const db = await getDatabase();
  const qty = data.quantity && data.quantity > 0 ? data.quantity : 1;
  const total = Number((data.unit_price * qty).toFixed(2));
  const dateStr = data.purchase_date || new Date().toISOString().replace('T', ' ').substring(0, 19);

  const res = await db.runAsync(
    `INSERT INTO purchases (product_id, unit_price, quantity, total_amount, currency, usd_rate, purchase_date, store, buyer, status, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    data.product_id,
    data.unit_price,
    qty,
    total,
    data.currency || 'ARS',
    data.usd_rate ?? null,
    dateStr,
    data.store?.trim() || null,
    data.buyer?.trim() || 'Parents',
    data.status || 'pending',
    data.notes?.trim() || null
  );

  return res.lastInsertRowId;
}

export async function togglePurchaseStatus(id: number, newStatus: 'pending' | 'settled'): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE purchases SET status = ?, settlement_id = CASE WHEN ? = 'pending' THEN NULL ELSE settlement_id END WHERE id = ?`,
    newStatus,
    newStatus,
    id
  );
}

export async function deletePurchase(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM purchases WHERE id = ?', id);
}

// -------------------------------------------------------------------------
// Settlement & Repayment Logic
// -------------------------------------------------------------------------

export async function getMonthlySummary(monthPeriod?: string): Promise<MonthlySummary> {
  const db = await getDatabase();
  const currentPeriod = monthPeriod || new Date().toISOString().substring(0, 7); // 'YYYY-MM'

  // Calculate previous period
  const [yearStr, monthStr] = currentPeriod.split('-');
  const prevDate = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 2, 1);
  const prevPeriod = prevDate.toISOString().substring(0, 7);

  // Current month purchases stats
  const currentPurchases = await db.getAllAsync<Purchase>(
    `SELECT * FROM purchases WHERE purchase_date LIKE ?`,
    `${currentPeriod}%`
  );

  let totalSpent = 0;
  let totalPending = 0;
  let totalSettled = 0;
  let pendingCount = 0;
  let settledCount = 0;

  currentPurchases.forEach((p) => {
    totalSpent += p.total_amount;
    if (p.status === 'pending') {
      totalPending += p.total_amount;
      pendingCount++;
    } else {
      totalSettled += p.total_amount;
      settledCount++;
    }
  });

  // Previous month total spent
  const prevResult = await db.getFirstAsync<{ prev_total: number | null }>(
    `SELECT SUM(total_amount) as prev_total FROM purchases WHERE purchase_date LIKE ?`,
    `${prevPeriod}%`
  );
  const previousMonthTotal = prevResult?.prev_total || 0;

  let variationVsPrev = 0;
  if (previousMonthTotal > 0) {
    variationVsPrev = ((totalSpent - previousMonthTotal) / previousMonthTotal) * 100;
  }

  // Top price increases this month
  const products = await getAllProducts();
  const topIncreases = products
    .filter((p) => (p.price_variation || 0) > 0)
    .sort((a, b) => (b.price_variation || 0) - (a.price_variation || 0))
    .slice(0, 5)
    .map((p) => ({
      product_id: p.id,
      name: p.name,
      current_price: p.latest_price || 0,
      previous_price: p.previous_price || 0,
      variation_pct: p.price_variation || 0,
    }));

  return {
    period: currentPeriod,
    total_spent: Number(totalSpent.toFixed(2)),
    total_pending_to_repay: Number(totalPending.toFixed(2)),
    total_settled: Number(totalSettled.toFixed(2)),
    pending_count: pendingCount,
    settled_count: settledCount,
    previous_month_total: Number(previousMonthTotal.toFixed(2)),
    variation_vs_prev_month: Number(variationVsPrev.toFixed(2)),
    top_increases: topIncreases,
  };
}

export async function settleAllPendingPurchases(
  period: string,
  paymentMethod: string = 'Transfer',
  notes: string = ''
): Promise<{ settlementId: number; amountSettled: number; count: number }> {
  const db = await getDatabase();

  const pendingRows = await db.getAllAsync<{ id: number; total_amount: number }>(
    `SELECT id, total_amount FROM purchases WHERE status = 'pending' AND purchase_date LIKE ?`,
    `${period}%`
  );

  if (pendingRows.length === 0) {
    return { settlementId: 0, amountSettled: 0, count: 0 };
  }

  const totalAmount = pendingRows.reduce((sum, r) => sum + r.total_amount, 0);

  // Insert settlement record
  const res = await db.runAsync(
    `INSERT INTO settlements (period, total_settled, purchases_count, payment_method, notes)
     VALUES (?, ?, ?, ?, ?)`,
    period,
    totalAmount,
    pendingRows.length,
    paymentMethod,
    notes || null
  );

  const settlementId = res.lastInsertRowId;

  // Mark all pending purchases for this period as settled
  await db.runAsync(
    `UPDATE purchases 
     SET status = 'settled', settlement_id = ?
     WHERE status = 'pending' AND purchase_date LIKE ?`,
    settlementId,
    `${period}%`
  );

  return {
    settlementId,
    amountSettled: Number(totalAmount.toFixed(2)),
    count: pendingRows.length,
  };
}

/**
 * Reverts a settlement if the user changed their mind or didn't transfer yet!
 */
export async function revertSettlement(settlementId: number): Promise<void> {
  const db = await getDatabase();
  // Set purchases back to pending
  await db.runAsync(
    `UPDATE purchases SET status = 'pending', settlement_id = NULL WHERE settlement_id = ?`,
    settlementId
  );
  // Delete the settlement record
  await db.runAsync(`DELETE FROM settlements WHERE id = ?`, settlementId);
}

export async function getSettlementsHistory(): Promise<Settlement[]> {
  const db = await getDatabase();
  return db.getAllAsync<Settlement>('SELECT * FROM settlements ORDER BY settled_at DESC');
}

// -------------------------------------------------------------------------
// Settings Key-Value
// -------------------------------------------------------------------------

export async function getSetting(key: string, defaultValue: string = ''): Promise<string> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_settings WHERE key = ?', key);
  return row ? row.value : defaultValue;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', key, value);
}

/**
 * Exports complete database content as a clean JSON object for backup
 */
export async function exportDatabaseToJson(): Promise<any> {
  const db = await getDatabase();
  const [categories, products, purchases, settlements, settings] = await Promise.all([
    db.getAllAsync('SELECT * FROM categories'),
    db.getAllAsync('SELECT * FROM products'),
    db.getAllAsync('SELECT * FROM purchases'),
    db.getAllAsync('SELECT * FROM settlements'),
    db.getAllAsync('SELECT * FROM app_settings'),
  ]);

  return {
    app: 'PriceBook',
    version: 1,
    exported_at: new Date().toISOString(),
    data: {
      categories,
      products,
      purchases,
      settlements,
      settings,
    },
  };
}

/**
 * Restores complete database from a JSON backup object
 */
export async function restoreDatabaseFromJson(backup: any): Promise<void> {
  if (!backup || !backup.data) {
    throw new Error('Invalid backup file structure');
  }
  const db = await getDatabase();
  const { categories, products, purchases, settlements, settings } = backup.data;

  await db.execAsync('PRAGMA foreign_keys = OFF;');
  await db.execAsync('DELETE FROM purchases; DELETE FROM products; DELETE FROM categories; DELETE FROM settlements; DELETE FROM app_settings;');

  for (const c of categories || []) {
    await db.runAsync('INSERT INTO categories (id, name, color, icon, is_default, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      c.id, c.name, c.color, c.icon, c.is_default, c.created_at);
  }

  for (const p of products || []) {
    await db.runAsync('INSERT INTO products (id, name, category, unit, image_uri, notes, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      p.id, p.name, p.category, p.unit, p.image_uri, p.notes, p.created_at, p.updated_at);
  }

  for (const s of settlements || []) {
    await db.runAsync('INSERT INTO settlements (id, period, total_settled, purchases_count, settled_at, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      s.id, s.period, s.total_settled, s.purchases_count, s.settled_at, s.payment_method, s.notes);
  }

  for (const pu of purchases || []) {
    await db.runAsync('INSERT INTO purchases (id, product_id, unit_price, quantity, total_amount, currency, usd_rate, purchase_date, store, buyer, status, settlement_id, notes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      pu.id, pu.product_id, pu.unit_price, pu.quantity, pu.total_amount, pu.currency, pu.usd_rate, pu.purchase_date, pu.store, pu.buyer, pu.status, pu.settlement_id, pu.notes, pu.created_at);
  }

  for (const st of settings || []) {
    await db.runAsync('INSERT INTO app_settings (key, value) VALUES (?, ?)', st.key, st.value);
  }

  await db.execAsync('PRAGMA foreign_keys = ON;');
}

// -------------------------------------------------------------------------
// Monthly Plan / Recurring Basket CRUD
// -------------------------------------------------------------------------

export async function getMonthlyPlanItems(): Promise<MonthlyPlanItem[]> {
  const db = await getDatabase();
  const items = await db.getAllAsync<MonthlyPlanItem>('SELECT * FROM monthly_plan_items ORDER BY estimated_monthly_total DESC');

  const products = await getAllProducts();
  const prodMap = new Map<string, number>();
  products.forEach((p) => {
    if (p.latest_price) prodMap.set(p.name.toLowerCase().trim(), p.latest_price);
  });

  return items.map((item) => {
    const realPrice = prodMap.get(item.name.toLowerCase().trim());
    let variation = 0;
    if (realPrice && item.estimated_unit_price > 0) {
      variation = ((realPrice - item.estimated_unit_price) / item.estimated_unit_price) * 100;
    }
    return {
      ...item,
      current_real_price: realPrice,
      variation_vs_estimate: Number(variation.toFixed(1)),
    };
  });
}

export async function createMonthlyPlanItem(data: {
  name: string;
  category?: string;
  unit_desc?: string;
  estimated_unit_price: number;
  estimated_monthly_qty: number;
  notes?: string;
}): Promise<number> {
  const db = await getDatabase();
  const total = Number((data.estimated_unit_price * data.estimated_monthly_qty).toFixed(2));
  const res = await db.runAsync(
    `INSERT INTO monthly_plan_items (name, category, unit_desc, estimated_unit_price, estimated_monthly_qty, estimated_monthly_total, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    data.name.trim(),
    data.category || 'General',
    data.unit_desc || '',
    data.estimated_unit_price,
    data.estimated_monthly_qty,
    total,
    data.notes || null
  );
  return res.lastInsertRowId;
}

export async function updateMonthlyPlanItem(
  id: number,
  data: {
    name: string;
    category?: string;
    unit_desc?: string;
    estimated_unit_price: number;
    estimated_monthly_qty: number;
    notes?: string;
  }
): Promise<void> {
  const db = await getDatabase();
  const total = Number((data.estimated_unit_price * data.estimated_monthly_qty).toFixed(2));
  await db.runAsync(
    `UPDATE monthly_plan_items
     SET name = ?, category = ?, unit_desc = ?, estimated_unit_price = ?, estimated_monthly_qty = ?, estimated_monthly_total = ?, notes = ?
     WHERE id = ?`,
    data.name.trim(),
    data.category || 'General',
    data.unit_desc || '',
    data.estimated_unit_price,
    data.estimated_monthly_qty,
    total,
    data.notes || null,
    id
  );
}

export async function deleteMonthlyPlanItem(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM monthly_plan_items WHERE id = ?', id);
}
