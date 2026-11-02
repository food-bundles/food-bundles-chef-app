-- Migration 001: Initial schema
-- All kitchen-owned tables require kitchenId for isolation.

CREATE TABLE IF NOT EXISTS kitchens (
  id TEXT PRIMARY KEY NOT NULL,
  chef_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  cuisine_type TEXT,
  seating_capacity INTEGER,
  is_archived INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY NOT NULL,
  kitchen_id TEXT NOT NULL REFERENCES kitchens(id),
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  category TEXT,
  sku TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_items (
  id TEXT PRIMARY KEY NOT NULL,
  kitchen_id TEXT NOT NULL REFERENCES kitchens(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  price_rwf REAL NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY NOT NULL,
  kitchen_id TEXT NOT NULL REFERENCES kitchens(id),
  menu_item_id TEXT NOT NULL REFERENCES menu_items(id),
  menu_item_name TEXT NOT NULL,
  portions INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
  id TEXT PRIMARY KEY NOT NULL,
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  ingredient_name TEXT NOT NULL,
  quantity_per_portion REAL NOT NULL,
  unit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sales_records (
  id TEXT PRIMARY KEY NOT NULL,
  kitchen_id TEXT NOT NULL REFERENCES kitchens(id),
  menu_item_id TEXT NOT NULL,
  menu_item_name TEXT NOT NULL,
  date TEXT NOT NULL,
  portions_sold INTEGER NOT NULL,
  price_rwf REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_items (
  id TEXT PRIMARY KEY NOT NULL,
  kitchen_id TEXT NOT NULL REFERENCES kitchens(id),
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  ingredient_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity_on_hand REAL NOT NULL DEFAULT 0,
  daily_use_rate REAL NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY NOT NULL,
  kitchen_id TEXT NOT NULL REFERENCES kitchens(id),
  stock_item_id TEXT NOT NULL REFERENCES stock_items(id),
  ingredient_name TEXT NOT NULL,
  delta REAL NOT NULL,
  reason TEXT NOT NULL,
  reference_id TEXT,
  recorded_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY NOT NULL,
  kitchen_id TEXT NOT NULL REFERENCES kitchens(id),
  status TEXT NOT NULL DEFAULT 'draft',
  total_rwf REAL NOT NULL DEFAULT 0,
  placed_at TEXT,
  expected_delivery_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS order_line_items (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES orders(id),
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price_rwf REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY NOT NULL,
  kitchen_id TEXT NOT NULL REFERENCES kitchens(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  supplier_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  scheduled_at TEXT,
  completed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS delivery_line_items (
  id TEXT PRIMARY KEY NOT NULL,
  delivery_id TEXT NOT NULL REFERENCES deliveries(id),
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  unit TEXT NOT NULL,
  ordered_quantity REAL NOT NULL,
  accepted_quantity REAL,
  actual_price_amount REAL,
  actual_price_currency TEXT,
  reference_price_amount REAL,
  reference_price_currency TEXT,
  reference_price_date TEXT,
  quality_score INTEGER,
  quality_json TEXT,
  decision TEXT,
  discrepancy_reason TEXT,
  photo_uri TEXT
);
