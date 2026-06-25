const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initLocalDb(dbPath) {
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(dbPath, { verbose: console.log });
  db.pragma('journal_mode = WAL');

  // Create tables mimicking Supabase, with added sync_status fields
  
  // 1. Branches
  db.exec(`
    CREATE TABLE IF NOT EXISTS branches (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      name TEXT UNIQUE NOT NULL,
      type TEXT,
      address TEXT,
      phone TEXT,
      manager TEXT,
      business_number TEXT,
      employee_count INTEGER,
      delivery_fees TEXT, -- JSON
      surcharges TEXT, -- JSON
      account TEXT,
      seeded INTEGER DEFAULT 0,
      extra_data TEXT, -- JSON
      created_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
  `);

  // 2. Orders
  db.exec(`
    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      order_number TEXT,
      status TEXT DEFAULT 'processing',
      receipt_type TEXT,
      branch_id TEXT,
      branch_name TEXT,
      order_date TEXT,
      orderer TEXT, -- JSON
      delivery_info TEXT, -- JSON
      pickup_info TEXT, -- JSON
      summary TEXT, -- JSON
      payment TEXT, -- JSON
      items TEXT, -- JSON
      memo TEXT,
      transfer_info TEXT, -- JSON
      actual_delivery_cost INTEGER,
      extra_data TEXT, -- JSON
      outsource_info TEXT, -- JSON
      actual_delivery_cost_cash INTEGER,
      delivery_cost_status TEXT,
      delivery_cost_updated_at TEXT,
      delivery_cost_updated_by TEXT,
      delivery_cost_reason TEXT,
      delivery_profit INTEGER,
      created_at TEXT,
      updated_at TEXT,
      completed_at TEXT,
      completed_by TEXT,
      completionphotourl TEXT,
      sync_status TEXT DEFAULT 'pending_insert',
      last_sync_time TEXT
    );
  `);

  // sync_queue — query-db 로컬 쓰기 → 클라우드 push
  db.exec(`
    CREATE TABLE IF NOT EXISTS sync_queue (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      action TEXT NOT NULL,
      table_name TEXT NOT NULL,
      record_id TEXT,
      payload TEXT,
      timestamp TEXT NOT NULL
    );
  `);

  // 3. Print Jobs
  db.exec(`
    CREATE TABLE IF NOT EXISTS print_jobs (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      printer_id TEXT,
      branch_id TEXT,
      document_type TEXT,
      document_data TEXT,
      status TEXT DEFAULT 'pending',
      error_message TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'pending_insert',
      last_sync_time TEXT
    );
  `);

  // 4. Customers
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      name TEXT NOT NULL,
      contact TEXT NOT NULL,
      company_name TEXT,
      department TEXT,
      address TEXT,
      email TEXT,
      grade TEXT DEFAULT '신규',
      memo TEXT,
      points INTEGER DEFAULT 0,
      type TEXT DEFAULT 'personal',
      birthday TEXT,
      wedding_anniversary TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
  `);

  // migration columns (기존 DB 호환)
  const orderMigrations = [
    `ALTER TABLE orders ADD COLUMN message TEXT`,
    `ALTER TABLE orders ADD COLUMN actual_delivery_payment_method TEXT`,
    `ALTER TABLE orders ADD COLUMN actual_delivery_payment_status TEXT`,
    `ALTER TABLE orders ADD COLUMN alimtalk_status TEXT DEFAULT 'not_sent'`,
    `ALTER TABLE orders ADD COLUMN alimtalk_sent_at TEXT`,
    `ALTER TABLE orders ADD COLUMN alimtalk_error TEXT`,
    `ALTER TABLE orders ADD COLUMN delivery_provider TEXT`,
    `ALTER TABLE orders ADD COLUMN delivery_tracking_id TEXT`,
    `ALTER TABLE orders ADD COLUMN delivery_provider_status TEXT`,
    `ALTER TABLE orders ADD COLUMN delivery_provider_fee INTEGER`,
    `ALTER TABLE orders ADD COLUMN delivery_tracking_url TEXT`,
    `ALTER TABLE orders ADD COLUMN source TEXT`,
    `ALTER TABLE orders ADD COLUMN pos_transaction_id TEXT`,
    `ALTER TABLE orders ADD COLUMN attribution_campaign_id TEXT`,
    `ALTER TABLE orders ADD COLUMN cancel_reason TEXT`,
    `ALTER TABLE orders ADD COLUMN cancelled_at TEXT`,
    `ALTER TABLE orders ADD COLUMN cancelled_by TEXT`,
    `ALTER TABLE orders ADD COLUMN delivery_proof_url TEXT`,
    `ALTER TABLE orders ADD COLUMN receipt_proof_url TEXT`,
  ];
  for (const sql of orderMigrations) {
    try { db.exec(sql); } catch (_) {}
  }

  const customerMigrations = [
    `ALTER TABLE customers ADD COLUMN is_deleted INTEGER DEFAULT 0`,
    `ALTER TABLE customers ADD COLUMN marketing_consent INTEGER DEFAULT 0`,
    `ALTER TABLE customers ADD COLUMN total_spent INTEGER DEFAULT 0`,
    `ALTER TABLE customers ADD COLUMN order_count INTEGER DEFAULT 0`,
    `ALTER TABLE customers ADD COLUMN last_order_date TEXT`,
    `ALTER TABLE customers ADD COLUMN extra_data TEXT`,
  ];
  for (const sql of customerMigrations) {
    try { db.exec(sql); } catch (_) {}
  }

  // simple_expenses — Electron 오프라인 sync
  db.exec(`
    CREATE TABLE IF NOT EXISTS simple_expenses (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      expense_date TEXT,
      amount REAL,
      category TEXT,
      sub_category TEXT,
      description TEXT,
      supplier TEXT,
      quantity REAL,
      unit_price REAL,
      tenant_name TEXT,
      receipt_url TEXT,
      receipt_file_name TEXT,
      inventory_updates TEXT,
      extra_data TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_orders_tenant_date ON orders(tenant_id, order_date);
    CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
    CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_simple_expenses_tenant_date ON simple_expenses(tenant_id, expense_date);
  `);

  // expenses — 지출관리(receipt_url) Electron 월별 백업용 pull-only sync
  db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      category TEXT,
      sub_category TEXT,
      amount REAL,
      description TEXT,
      expense_date TEXT,
      payment_method TEXT,
      related_order_id TEXT,
      supplier_id TEXT,
      material_id TEXT,
      quantity REAL,
      unit TEXT,
      receipt_url TEXT,
      receipt_file_id TEXT,
      storage_provider TEXT,
      purchase_id TEXT,
      related_branch_material_request_id TEXT,
      created_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_expenses_tenant_date ON expenses(tenant_id, expense_date);
  `);

  // legacy single-column migrations
  try {
    db.exec(`ALTER TABLE orders ADD COLUMN completionphotourl TEXT`);
  } catch (_) {}

  console.log("Local SQLite database initialized at", dbPath);
  return db;
}

module.exports = { initLocalDb };
