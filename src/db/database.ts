import * as SQLite from 'expo-sqlite';
import { INITIAL_SCHEMA, AGUSTIN_SEED_SQL, DB_NAME } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;
let isInitialized = false;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const db = await SQLite.openDatabaseAsync(DB_NAME);
      if (!isInitialized) {
        await initDatabase(db);
      }
      return db;
    })();
  }
  return dbPromise;
}

let hasSyncedPlanPrices = false;

export async function ensureSchemaMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(purchases);');
    const hasEntryType = tableInfo.some((col) => col.name === 'entry_type');
    if (!hasEntryType) {
      await db.execAsync("ALTER TABLE purchases ADD COLUMN entry_type TEXT DEFAULT 'purchase';");
    }
    await db.execAsync('CREATE INDEX IF NOT EXISTS idx_purchases_type ON purchases(entry_type);');
  } catch (err) {
    console.warn('Schema migration warning:', err);
  }
}

export async function syncPlanPricesToProducts(dbInstance?: SQLite.SQLiteDatabase): Promise<void> {
  try {
    const db = dbInstance || (await getDatabase());
    await ensureSchemaMigrations(db);

    const planItems = await db.getAllAsync<MonthlyPlanItem>(
      'SELECT * FROM monthly_plan_items'
    );
    if (!planItems || planItems.length === 0) return;

    for (const item of planItems) {
      if (!item.name || item.estimated_unit_price <= 0) continue;

      let prod = await db.getFirstAsync<Product>(
        'SELECT * FROM products WHERE LOWER(TRIM(name)) = LOWER(TRIM(?))',
        item.name
      );

      if (!prod) {
        const res = await db.runAsync(
          'INSERT INTO products (name, category, unit, notes) VALUES (?, ?, ?, ?)',
          item.name.trim(),
          item.category || 'General',
          item.unit_desc || '1 u',
          item.notes || null
        );
        prod = {
          id: res.lastInsertRowId,
          name: item.name.trim(),
          category: item.category || 'General',
          unit: item.unit_desc || '1 u',
          image_uri: null,
          notes: item.notes || null,
          created_at: '',
          updated_at: '',
        };
      }

      const existingPurchase = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM purchases WHERE product_id = ? LIMIT 1',
        prod.id
      );

      if (!existingPurchase) {
        await db.runAsync(
          `INSERT INTO purchases (
            product_id, unit_price, quantity, total_amount, currency, purchase_date, store, buyer, status, settlement_id, entry_type, notes
          ) VALUES (?, ?, 1, 0, 'ARS', ?, 'Plan Mensual', 'Parents', 'settled', NULL, 'reference', ?)`,
          prod.id,
          item.estimated_unit_price,
          '2026-09-30 12:00:00',
          'Precio registrado del plan mensual'
        );
      }
    }
  } catch (err) {
    console.warn('Sync plan prices warning:', err);
  }
}

export async function initDatabase(db: SQLite.SQLiteDatabase): Promise<void> {
  if (isInitialized) return;
  try {
    await db.execAsync(INITIAL_SCHEMA);
  } catch (err) {
    console.warn('Database initialization warning:', err);
  }

  try {
    await ensureSchemaMigrations(db);
  } catch (migErr) {
    console.warn('Database schema migration warning:', migErr);
  }

  try {
    await syncPlanPricesToProducts(db);
    hasSyncedPlanPrices = true;
  } catch (err) {
    console.warn('Sync plan prices warning:', err);
  }
  isInitialized = true;
}

/**
 * Loads Agustín's personal template ($850.000 September settlement + 11 habitual items).
 * Kept separate so public releases can remain empty and customized per device.
 */
export async function seedAgustinPersonalData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(AGUSTIN_SEED_SQL);
}

export async function clearPersonalData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM purchases;
    DELETE FROM settlements;
    DELETE FROM products;
    DELETE FROM monthly_plan_items;
  `);
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
  entry_type?: 'purchase' | 'reference';
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

export async function getCategoriesWithCount(): Promise<Array<Category & { product_count: number }>> {
  const db = await getDatabase();
  return db.getAllAsync<Category & { product_count: number }>(`
    SELECT c.*, COUNT(p.id) as product_count
    FROM categories c
    LEFT JOIN products p ON p.category = c.name
    GROUP BY c.id
    ORDER BY c.name ASC
  `);
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

export async function updateCategory(
  id: number,
  data: { name: string; color?: string; icon?: string }
): Promise<void> {
  const db = await getDatabase();
  const oldCategory = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', id);
  if (!oldCategory) return;
  const newName = data.name.trim();
  const newColor = data.color || oldCategory.color;
  const newIcon = data.icon || oldCategory.icon;

  await db.runAsync(
    'UPDATE categories SET name = ?, color = ?, icon = ? WHERE id = ?',
    newName,
    newColor,
    newIcon,
    id
  );

  // If name changed, migrate products that had old category name
  if (oldCategory.name !== newName) {
    await db.runAsync('UPDATE products SET category = ? WHERE category = ?', newName, oldCategory.name);
  }
}

export async function deleteCategory(id: number): Promise<void> {
  const db = await getDatabase();
  const category = await db.getFirstAsync<Category>('SELECT * FROM categories WHERE id = ?', id);
  if (!category || category.is_default === 1) return;

  // Safely reassign associated products to 'General' before deleting
  await db.runAsync("UPDATE products SET category = 'General' WHERE category = ?", category.name);
  await db.runAsync('DELETE FROM categories WHERE id = ?', id);
}

// -------------------------------------------------------------------------
// Products CRUD & Computations
// -------------------------------------------------------------------------

export async function getAllProducts(searchQuery: string = '', categoryFilter: string = 'All'): Promise<Product[]> {
  const db = await getDatabase();
  if (!hasSyncedPlanPrices) {
    await syncPlanPricesToProducts(db);
    hasSyncedPlanPrices = true;
  }
  
  let sql = `
    SELECT p.*,
      COALESCE(
        (SELECT unit_price FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1),
        (SELECT estimated_unit_price FROM monthly_plan_items WHERE LOWER(TRIM(name)) = LOWER(TRIM(p.name)) LIMIT 1)
      ) as latest_price,
      (SELECT unit_price FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1 OFFSET 1) as previous_price,
      COALESCE(
        (SELECT purchase_date FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1),
        (SELECT created_at FROM monthly_plan_items WHERE LOWER(TRIM(name)) = LOWER(TRIM(p.name)) LIMIT 1)
      ) as last_purchase_date,
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
  if (!hasSyncedPlanPrices) {
    await syncPlanPricesToProducts(db);
    hasSyncedPlanPrices = true;
  }
  const row = await db.getFirstAsync<Product>(
    `SELECT p.*,
      COALESCE(
        (SELECT unit_price FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1),
        (SELECT estimated_unit_price FROM monthly_plan_items WHERE LOWER(TRIM(name)) = LOWER(TRIM(p.name)) LIMIT 1)
      ) as latest_price,
      (SELECT unit_price FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1 OFFSET 1) as previous_price,
      COALESCE(
        (SELECT purchase_date FROM purchases WHERE product_id = p.id ORDER BY purchase_date DESC LIMIT 1),
        (SELECT created_at FROM monthly_plan_items WHERE LOWER(TRIM(name)) = LOWER(TRIM(p.name)) LIMIT 1)
      ) as last_purchase_date,
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
  timeRange?: 'day' | 'week' | 'month' | 'custom' | 'all';
  customDays?: number;
  entryType?: 'purchase' | 'reference' | 'all';
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

  if (options?.entryType && options.entryType !== 'all') {
    sql += ' AND pu.entry_type = ?';
    params.push(options.entryType);
  }

  if (options?.monthPeriod) {
    sql += ' AND pu.purchase_date LIKE ?';
    params.push(`${options.monthPeriod}%`);
  } else if (options?.timeRange && options.timeRange !== 'all') {
    const now = new Date();
    if (options.timeRange === 'day') {
      const todayStr = now.toISOString().substring(0, 10);
      sql += ' AND pu.purchase_date >= ?';
      params.push(`${todayStr} 00:00:00`);
    } else if (options.timeRange === 'week') {
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      sql += ' AND pu.purchase_date >= ?';
      params.push(sevenDaysAgo.toISOString().replace('T', ' ').substring(0, 19));
    } else if (options.timeRange === 'month') {
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      sql += ' AND pu.purchase_date >= ?';
      params.push(startOfMonth.toISOString().replace('T', ' ').substring(0, 19));
    } else if (options.timeRange === 'custom') {
      const days = options.customDays && options.customDays > 0 ? options.customDays : 30;
      const customPast = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      sql += ' AND pu.purchase_date >= ?';
      params.push(customPast.toISOString().replace('T', ' ').substring(0, 19));
    }
  }

  sql += ' ORDER BY pu.purchase_date DESC, pu.id DESC';

  if (options?.limit) {
    sql += ' LIMIT ?';
    params.push(options.limit);
  }

  return db.getAllAsync<Purchase>(sql, ...params);
}

export interface SpendingStats {
  totalSpent: number;
  totalOwedPending: number;
  purchasesCount: number;
  referenceCount: number;
  daysCount: number;
  avgPerDay: number;
  avgPerWeek: number;
  avgPerMonth: number;
}

export function computeSpendingStats(
  purchases: Purchase[],
  timeRange: 'day' | 'week' | 'month' | 'custom' | 'all' = 'all',
  customDays: number = 30
): SpendingStats {
  let totalSpent = 0;
  let totalOwedPending = 0;
  let purchasesCount = 0;
  let referenceCount = 0;

  purchases.forEach((p) => {
    if (p.entry_type === 'reference') {
      referenceCount++;
    } else {
      totalSpent += p.total_amount;
      purchasesCount++;
      if (p.status === 'pending') {
        totalOwedPending += p.total_amount;
      }
    }
  });

  let days = 30;
  if (timeRange === 'day') days = 1;
  else if (timeRange === 'week') days = 7;
  else if (timeRange === 'month') days = 30;
  else if (timeRange === 'custom') days = Math.max(1, customDays);
  else {
    if (purchases.length > 1) {
      const earliest = new Date(purchases[purchases.length - 1].purchase_date).getTime();
      const latest = new Date(purchases[0].purchase_date).getTime();
      const diffDays = Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24));
      days = Math.max(1, diffDays);
    } else {
      days = 1;
    }
  }

  const avgPerDay = totalSpent / days;
  const avgPerWeek = avgPerDay * 7;
  const avgPerMonth = avgPerDay * 30;

  return {
    totalSpent: Number(totalSpent.toFixed(2)),
    totalOwedPending: Number(totalOwedPending.toFixed(2)),
    purchasesCount,
    referenceCount,
    daysCount: days,
    avgPerDay: Number(avgPerDay.toFixed(2)),
    avgPerWeek: Number(avgPerWeek.toFixed(2)),
    avgPerMonth: Number(avgPerMonth.toFixed(2)),
  };
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
  entry_type?: 'purchase' | 'reference';
}): Promise<number> {
  const db = await getDatabase();
  const entryType = data.entry_type || 'purchase';
  const qty = data.quantity && data.quantity > 0 ? data.quantity : 1;
  // For price check reference, total_amount is 0 so it never adds to debt!
  const total = entryType === 'reference' ? 0 : Number((data.unit_price * qty).toFixed(2));
  const dateStr = data.purchase_date || new Date().toISOString().replace('T', ' ').substring(0, 19);

  const res = await db.runAsync(
    `INSERT INTO purchases (product_id, unit_price, quantity, total_amount, currency, usd_rate, purchase_date, store, buyer, status, settlement_id, entry_type, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
    data.product_id,
    data.unit_price,
    qty,
    total,
    data.currency || 'ARS',
    data.usd_rate ?? null,
    dateStr,
    data.store?.trim() || null,
    data.buyer?.trim() || 'Parents',
    entryType === 'reference' ? 'settled' : (data.status || 'pending'),
    entryType,
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
    // Only count real purchases, ignore price reference checks
    if (p.entry_type !== 'reference') {
      totalSpent += p.total_amount;
      if (p.status === 'pending') {
        totalPending += p.total_amount;
        pendingCount++;
      } else {
        totalSettled += p.total_amount;
        settledCount++;
      }
    }
  });

  // Previous month total spent
  const prevResult = await db.getFirstAsync<{ prev_total: number | null }>(
    `SELECT SUM(total_amount) as prev_total FROM purchases WHERE purchase_date LIKE ? AND entry_type != 'reference'`,
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
