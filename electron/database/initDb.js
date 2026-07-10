const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

function initLocalDb(dbPath) {
  // Ensure directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const { app } = require('electron');
  const isDev = !app.isPackaged;
  const db = new Database(dbPath, isDev ? { verbose: console.log } : {});
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

  // ─── Phase A: 상품·재고·설정·거래처·배송비·매장 ───
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      name TEXT NOT NULL,
      main_category TEXT,
      mid_category TEXT,
      price INTEGER,
      stock INTEGER,
      supplier TEXT,
      code TEXT,
      status TEXT,
      extra_data TEXT,
      supplier_id TEXT,
      is_portfolio INTEGER,
      image_url TEXT,
      branch TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      name TEXT NOT NULL,
      main_category TEXT NOT NULL,
      mid_category TEXT,
      unit TEXT,
      spec TEXT,
      price REAL,
      stock REAL,
      supplier TEXT,
      memo TEXT,
      color TEXT,
      supplier_id TEXT,
      current_stock REAL,
      safety_stock REAL,
      description TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
    CREATE TABLE IF NOT EXISTS system_settings (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      data TEXT NOT NULL,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      name TEXT NOT NULL,
      contact TEXT,
      email TEXT,
      address TEXT,
      business_number TEXT,
      memo TEXT,
      supplier_type TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
    CREATE TABLE IF NOT EXISTS delivery_fees_by_region (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      region_name TEXT NOT NULL,
      fee REAL,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
    CREATE TABLE IF NOT EXISTS tenants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      plan TEXT,
      created_at TEXT,
      subscription_start TEXT,
      subscription_end TEXT,
      status TEXT,
      can_receive_orders INTEGER,
      partner_category TEXT,
      partner_description TEXT,
      partner_region TEXT,
      logo_url TEXT,
      portfolio_url TEXT,
      portfolio_gdrive_id TEXT,
      is_premium INTEGER,
      gdrive_bouquet_id TEXT,
      gdrive_basket_id TEXT,
      gdrive_wreath_id TEXT,
      gdrive_plant_id TEXT,
      gdrive_orchid_id TEXT,
      gdrive_condolence_id TEXT,
      contact_phone TEXT,
      address TEXT,
      organization_id TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
  `);

  // ─── Phase B: 발주·정산·포인트·협력·외주·이관 ───
  db.exec(`
    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      supplier_id TEXT,
      material_id TEXT,
      name TEXT,
      status TEXT NOT NULL,
      total_price REAL NOT NULL,
      quantity REAL NOT NULL,
      scheduled_date TEXT,
      purchase_date TEXT,
      payment_method TEXT,
      expense_id TEXT,
      notes TEXT,
      batch_id TEXT,
      batch_name TEXT,
      main_category TEXT,
      mid_category TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
    CREATE TABLE IF NOT EXISTS daily_settlements (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      date TEXT NOT NULL,
      previous_vault_balance REAL NOT NULL,
      cash_sales_today REAL NOT NULL,
      delivery_cost_cash_today REAL NOT NULL,
      cash_expense_today REAL NOT NULL,
      vault_deposit REAL NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
    CREATE TABLE IF NOT EXISTS point_transactions (
      id TEXT PRIMARY KEY,
      tenant_id TEXT NOT NULL,
      customer_id TEXT NOT NULL,
      amount INTEGER NOT NULL,
      type TEXT NOT NULL,
      source TEXT NOT NULL,
      description TEXT,
      related_id TEXT,
      created_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
    CREATE TABLE IF NOT EXISTS partners (
      id TEXT PRIMARY KEY,
      tenant_id TEXT,
      target_tenant_id TEXT,
      name TEXT NOT NULL,
      category TEXT,
      contact_person TEXT,
      contact TEXT,
      email TEXT,
      address TEXT,
      business_number TEXT,
      bank_account TEXT,
      default_margin_percent REAL,
      is_verified INTEGER,
      memo TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
    CREATE TABLE IF NOT EXISTS external_orders (
      id TEXT PRIMARY KEY,
      sender_tenant_id TEXT,
      receiver_tenant_id TEXT,
      receiver_partner_id TEXT,
      origin_order_id TEXT,
      status TEXT,
      total_amount REAL NOT NULL,
      fulfillment_amount REAL NOT NULL,
      sender_profit REAL NOT NULL,
      platform_fee REAL NOT NULL,
      order_data TEXT,
      notes TEXT,
      hide_customer_info INTEGER,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
    CREATE TABLE IF NOT EXISTS order_transfers (
      id TEXT PRIMARY KEY,
      original_order_id TEXT NOT NULL,
      order_branch_id TEXT NOT NULL,
      order_branch_name TEXT NOT NULL,
      process_branch_id TEXT NOT NULL,
      process_branch_name TEXT NOT NULL,
      transfer_date TEXT,
      transfer_reason TEXT,
      transfer_by TEXT,
      transfer_by_user TEXT,
      status TEXT NOT NULL,
      amount_split TEXT NOT NULL,
      original_order_amount INTEGER NOT NULL,
      notes TEXT,
      accepted_at TEXT,
      accepted_by TEXT,
      rejected_at TEXT,
      rejected_by TEXT,
      completed_at TEXT,
      completed_by TEXT,
      cancelled_at TEXT,
      cancelled_by TEXT,
      created_at TEXT,
      updated_at TEXT,
      sync_status TEXT DEFAULT 'synced',
      last_sync_time TEXT
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_products_tenant ON products(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_materials_tenant ON materials(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_system_settings_tenant ON system_settings(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_suppliers_tenant ON suppliers(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_delivery_fees_tenant ON delivery_fees_by_region(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_purchases_tenant ON purchases(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_daily_settlements_tenant ON daily_settlements(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_point_transactions_tenant ON point_transactions(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_partners_tenant ON partners(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_external_orders_sender ON external_orders(sender_tenant_id);
    CREATE INDEX IF NOT EXISTS idx_external_orders_receiver ON external_orders(receiver_tenant_id);
    CREATE INDEX IF NOT EXISTS idx_order_transfers_order_branch ON order_transfers(order_branch_id);
    CREATE INDEX IF NOT EXISTS idx_order_transfers_process_branch ON order_transfers(process_branch_id);
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS local_meta (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  console.log("Local SQLite database initialized at", dbPath);
  return db;
}

module.exports = { initLocalDb };
