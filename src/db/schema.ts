export const DB_NAME = 'pricebook.db';
export const DB_VERSION = 2;

export const INITIAL_SCHEMA = `
PRAGMA journal_mode = 'wal';
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#3B82F6',
  icon TEXT DEFAULT 'pricetag',
  is_default INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  unit TEXT DEFAULT '1 u',
  image_uri TEXT,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);

CREATE TABLE IF NOT EXISTS settlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  period TEXT NOT NULL,
  total_settled REAL NOT NULL,
  purchases_count INTEGER NOT NULL,
  settled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  payment_method TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_settlements_period ON settlements(period);

CREATE TABLE IF NOT EXISTS purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL,
  unit_price REAL NOT NULL,
  quantity REAL NOT NULL DEFAULT 1.0,
  total_amount REAL NOT NULL,
  currency TEXT DEFAULT 'ARS',
  usd_rate REAL,
  purchase_date TEXT NOT NULL,
  store TEXT,
  buyer TEXT DEFAULT 'Parents',
  status TEXT DEFAULT 'pending',
  settlement_id INTEGER,
  entry_type TEXT DEFAULT 'purchase',
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (settlement_id) REFERENCES settlements(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_purchases_product_id ON purchases(product_id);
CREATE INDEX IF NOT EXISTS idx_purchases_date ON purchases(purchase_date);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);

CREATE TABLE IF NOT EXISTS monthly_plan_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  unit_desc TEXT,
  estimated_unit_price REAL NOT NULL,
  estimated_monthly_qty REAL NOT NULL,
  estimated_monthly_total REAL NOT NULL,
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Seed default categories if empty
INSERT OR IGNORE INTO categories (name, color, icon, is_default) VALUES
  ('Groceries', '#10B981', 'basket', 1),
  ('Dairy', '#3B82F6', 'water', 1),
  ('Cleaning', '#8B5CF6', 'sparkles', 1),
  ('Bakery', '#F59E0B', 'nutrition', 1),
  ('Meat & Fish', '#EF4444', 'restaurant', 1),
  ('General', '#6B7280', 'pricetag', 1);

-- Seed default settings
INSERT OR IGNORE INTO app_settings (key, value) VALUES
  ('theme', 'dark'),
  ('locale', 'en'),
  ('default_currency', 'ARS'),
  ('auto_fetch_usd', 'true');
`;

/**
 * Generic sample template for demonstration and new user onboarding.
 */
export const SAMPLE_SEED_SQL = `
-- Seed Sample Products
INSERT OR IGNORE INTO products (id, name, category, unit, notes) VALUES
  (1, 'Apples', 'Groceries', '1 kg', 'Fresh red apples'),
  (2, 'Milk', 'Dairy', '1 L', 'Whole milk carton'),
  (3, 'Eggs', 'Groceries', '12 units', 'Fresh eggs dozen'),
  (4, 'Bread', 'Bakery', '1 loaf', 'Artisan whole wheat loaf'),
  (5, 'Coffee', 'Groceries', '500g', 'Ground roasted coffee');

-- Seed Sample Monthly Plan Items
INSERT OR IGNORE INTO monthly_plan_items (id, name, category, unit_desc, estimated_unit_price, estimated_monthly_qty, estimated_monthly_total, notes) VALUES
  (1, 'Apples', 'Groceries', '4 kg / month', 2500.0, 4, 10000.0, 'Weekly grocery budget'),
  (2, 'Milk', 'Dairy', '8 L / month', 1800.0, 8, 14400.0, '2 cartons per week'),
  (3, 'Eggs', 'Groceries', '2 packs / month', 3200.0, 2, 6400.0, 'Biweekly dozen'),
  (4, 'Bread', 'Bakery', '4 loaves / month', 2200.0, 4, 8800.0, '1 loaf per week'),
  (5, 'Coffee', 'Groceries', '2 bags / month', 6500.0, 2, 13000.0, 'Monthly coffee beans');
`;

export const AGUSTIN_SEED_SQL = SAMPLE_SEED_SQL;
