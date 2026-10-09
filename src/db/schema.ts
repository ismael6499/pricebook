export const DB_NAME = 'pricebook.db';
export const DB_VERSION = 1;

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

-- Seed Agustín's habitual monthly basket items
INSERT OR IGNORE INTO monthly_plan_items (id, name, category, unit_desc, estimated_unit_price, estimated_monthly_qty, estimated_monthly_total, notes) VALUES
  (1, 'Milanesas', 'Meat & Fish', '1 porción / día', 5000.0, 31, 155000.0, '$5.000 x día'),
  (2, 'Brócoli', 'Groceries', '8 paquetes / mes', 7500.0, 8, 60000.0, '$7.000 - $7.500 x paquete'),
  (3, 'Espinaca', 'Groceries', '8 paquetes / mes', 5000.0, 8, 40000.0, '$5.000 x paquete'),
  (4, 'Huevos', 'Groceries', '248 unidades / mes', 362.9, 248, 90000.0, '$7.000 cada 20 huevos'),
  (5, 'Queso', 'Dairy', '4 semanas / mes', 17500.0, 4, 70000.0, '$15.000 - $17.500 x semana'),
  (6, 'Lentejas', 'Groceries', '4 semanas / mes', 6250.0, 4, 25000.0, '$6.000 x semana'),
  (7, 'Manzanas', 'Groceries', '62 unidades (2/día)', 1000.0, 62, 62000.0, '2 x día ($2.000 x día)'),
  (8, 'Banana', 'Groceries', '62 bananas (2/día)', 1000.0, 62, 62000.0, '2 bananas x día'),
  (9, 'Agua (Botellas)', 'Groceries', '93 botellas / mes', 2500.0, 93, 232500.0, '$2.500 c/u botella x 93 u'),
  (10, 'Aceite', 'Groceries', '1 botella / mes', 15000.0, 1, 15000.0, '$15.000 x mes');
`;
