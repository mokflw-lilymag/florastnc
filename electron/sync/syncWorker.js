const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');

class SyncWorker {
  constructor(db, supabaseUrl, supabaseAnonKey) {
    this.db = db;
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
    this.supabase = null;
    this.tenantId = null;
    this.syncInterval = null;
    this.backupInterval = null;
    this.isSyncing = false;
  }

  configure(session) {
    if (!session || !session.access_token || !session.tenant_id) {
      console.error('Invalid session provided to SyncWorker');
      return;
    }
    this.tenantId = session.tenant_id;
    // RLS Enabled Supabase Client using the user's access token
    this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      }
    });
    console.log(`SyncWorker configured for tenant: ${this.tenantId}`);
  }

  start(intervalMs = 60000) {
    if (!this.supabase || !this.tenantId) {
      console.warn('SyncWorker not configured. Call configure() first.');
      return;
    }
    if (this.syncInterval) return;
    this.syncInterval = setInterval(() => this.sync(), intervalMs);
    console.log(`Sync worker started. Running every ${intervalMs}ms.`);
    
    // Run an initial sync immediately
    this.sync();

    // Trigger daily backup
    this.dailyBackup();
    // Set interval for daily backup check (every 1 hour)
    this.backupInterval = setInterval(() => this.dailyBackup(), 1000 * 60 * 60);
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    if (this.backupInterval) {
      clearInterval(this.backupInterval);
      this.backupInterval = null;
    }
    this.supabase = null;
    this.tenantId = null;
    console.log('Sync worker stopped.');
  }

  clearLocalData() {
    console.log('Clearing local SQLite data for security...');
    this.stop();
    try {
      this.db.prepare('DELETE FROM orders').run();
      this.db.prepare('DELETE FROM customers').run();
      this.db.prepare('DELETE FROM print_jobs').run();
      this.db.prepare('DELETE FROM branches').run();
      console.log('Local data wiped successfully.');
    } catch (e) {
      console.error('Failed to wipe local data:', e);
    }
  }

  async sync() {
    if (this.isSyncing || !this.supabase) return;
    this.isSyncing = true;
    console.log('Starting sync cycle...');

    try {
      // 1. PUSH local changes to Supabase
      await this.pushOrders();
      await this.pushPrintJobs();

      // 2. PULL changes from Supabase to Local
      // With RLS, the server will only return data for this tenantId.
      await this.pullBranches();
      await this.pullCustomers();

      console.log('Sync cycle completed successfully.');
    } catch (error) {
      console.error('Error during sync cycle:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async pushOrders() {
    const pendingOrders = this.db.prepare(`SELECT * FROM orders WHERE sync_status IN ('pending_insert', 'pending_update') AND tenant_id = ?`).all(this.tenantId);
    if (pendingOrders.length === 0) return;

    for (const order of pendingOrders) {
      const payload = { ...order };
      delete payload.sync_status;
      delete payload.last_sync_time;

      ['orderer', 'delivery_info', 'pickup_info', 'summary', 'payment', 'items', 'transfer_info', 'extra_data', 'outsource_info'].forEach(field => {
        if (payload[field]) {
          try { payload[field] = JSON.parse(payload[field]); } catch(e) {}
        }
      });

      const { error } = await this.supabase
        .from('orders')
        .upsert(payload, { onConflict: 'id' });

      if (!error) {
        this.db.prepare(`UPDATE orders SET sync_status = 'synced', last_sync_time = ? WHERE id = ?`)
               .run(new Date().toISOString(), order.id);
      } else {
        console.error(`Failed to sync order ${order.id}:`, error);
      }
    }
  }

  async pushPrintJobs() {
    const pendingJobs = this.db.prepare(`SELECT * FROM print_jobs WHERE sync_status IN ('pending_insert', 'pending_update') AND tenant_id = ?`).all(this.tenantId);
    if (pendingJobs.length === 0) return;

    for (const job of pendingJobs) {
      const payload = { ...job };
      delete payload.sync_status;
      delete payload.last_sync_time;

      if (payload.document_data) {
        try { payload.document_data = JSON.parse(payload.document_data); } catch(e) {}
      }

      const { error } = await this.supabase
        .from('print_jobs')
        .upsert(payload, { onConflict: 'id' });

      if (!error) {
        this.db.prepare(`UPDATE print_jobs SET sync_status = 'synced', last_sync_time = ? WHERE id = ?`)
               .run(new Date().toISOString(), job.id);
      } else {
        console.error(`Failed to sync print_job ${job.id}:`, error);
      }
    }
  }

  async pullBranches() {
    const { data, error } = await this.supabase.from('branches').select('*');
    if (error) {
      console.error('Failed to pull branches:', error);
      return;
    }

    const stmt = this.db.prepare(`
      INSERT INTO branches (
        id, tenant_id, name, type, address, phone, manager, business_number, employee_count,
        delivery_fees, surcharges, account, seeded, extra_data, created_at, sync_status, last_sync_time
      ) VALUES (
        @id, @tenant_id, @name, @type, @address, @phone, @manager, @business_number, @employee_count,
        @delivery_fees, @surcharges, @account, @seeded, @extra_data, @created_at, 'synced', @now
      )
      ON CONFLICT(id) DO UPDATE SET
        tenant_id=excluded.tenant_id, name=excluded.name, type=excluded.type, address=excluded.address, phone=excluded.phone,
        manager=excluded.manager, business_number=excluded.business_number, employee_count=excluded.employee_count,
        delivery_fees=excluded.delivery_fees, surcharges=excluded.surcharges, account=excluded.account,
        seeded=excluded.seeded, extra_data=excluded.extra_data, sync_status='synced', last_sync_time=excluded.last_sync_time
    `);

    const now = new Date().toISOString();
    this.db.transaction((branches) => {
      for (const b of branches) {
        stmt.run({
          ...b,
          tenant_id: this.tenantId, // Ensure local DB marks the correct tenant_id
          delivery_fees: b.delivery_fees ? JSON.stringify(b.delivery_fees) : null,
          surcharges: b.surcharges ? JSON.stringify(b.surcharges) : null,
          extra_data: b.extra_data ? JSON.stringify(b.extra_data) : null,
          now
        });
      }
    })(data);
  }

  async pullCustomers() {
    const { data, error } = await this.supabase.from('customers').select('*');
    if (error) {
      console.error('Failed to pull customers:', error);
      return;
    }

    const stmt = this.db.prepare(`
      INSERT INTO customers (
        id, tenant_id, name, contact, company_name, department, address, email, grade, memo, points,
        type, birthday, wedding_anniversary, created_at, updated_at, sync_status, last_sync_time
      ) VALUES (
        @id, @tenant_id, @name, @contact, @company_name, @department, @address, @email, @grade, @memo, @points,
        @type, @birthday, @wedding_anniversary, @created_at, @updated_at, 'synced', @now
      )
      ON CONFLICT(id) DO UPDATE SET
        tenant_id=excluded.tenant_id, name=excluded.name, contact=excluded.contact, company_name=excluded.company_name, department=excluded.department,
        address=excluded.address, email=excluded.email, grade=excluded.grade, memo=excluded.memo, points=excluded.points,
        type=excluded.type, birthday=excluded.birthday, wedding_anniversary=excluded.wedding_anniversary,
        updated_at=excluded.updated_at, sync_status='synced', last_sync_time=excluded.last_sync_time
    `);

    const now = new Date().toISOString();
    this.db.transaction((customers) => {
      for (const c of customers) {
        stmt.run({ ...c, tenant_id: this.tenantId, now });
      }
    })(data);
  }

  // ==== BACKUP & RESTORE ====

  getBackupData() {
    if (!this.tenantId) return null;
    const customers = this.db.prepare(`SELECT * FROM customers WHERE tenant_id = ?`).all(this.tenantId);
    const orders = this.db.prepare(`SELECT * FROM orders WHERE tenant_id = ?`).all(this.tenantId);
    const branches = this.db.prepare(`SELECT * FROM branches WHERE tenant_id = ?`).all(this.tenantId);
    return {
      backupDate: new Date().toISOString(),
      tenantId: this.tenantId,
      customers,
      orders,
      branches
    };
  }

  dailyBackup() {
    if (!this.tenantId) return;

    try {
      const backupDir = path.join(os.homedir(), 'Documents', 'Floxync_Backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const backupFileName = \`floxync_backup_\${this.tenantId}_\${today}.json\`;
      const backupPath = path.join(backupDir, backupFileName);

      // Check if backup already exists for today
      if (!fs.existsSync(backupPath)) {
        const data = this.getBackupData();
        fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
        console.log(\`Daily backup created: \${backupPath}\`);
      }

      // Cleanup files older than 3 days
      const files = fs.readdirSync(backupDir);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

      for (const file of files) {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (stats.mtime < threeDaysAgo) {
          fs.unlinkSync(filePath);
          console.log(\`Deleted old backup: \${filePath}\`);
        }
      }
    } catch (e) {
      console.error('Failed to run daily backup:', e);
    }
  }

  async restoreData(dataObj) {
    if (!this.supabase || !this.tenantId) throw new Error("SyncWorker not configured.");
    if (dataObj.tenantId !== this.tenantId) throw new Error("Backup file belongs to a different store.");

    console.log("Starting full restore process (Server Reset & Replace)...");
    
    // In a real robust system, we would DELETE ALL matching rows from Supabase first,
    // then INSERT the backup rows.
    // However, if the DB has foreign key constraints or deleting is risky, Upsert is safer.
    // As per user requirement: A방식(전체 덮어쓰기) -> We should clear existing cloud data for this tenant.
    
    // 1. Wipe Cloud Data (RLS ensures we only wipe this tenant's data)
    try {
      await this.supabase.from('print_jobs').delete().neq('id', 'dummy');
      await this.supabase.from('orders').delete().neq('id', 'dummy');
      await this.supabase.from('customers').delete().neq('id', 'dummy');
      await this.supabase.from('branches').delete().neq('id', 'dummy');
    } catch (e) {
      console.error("Cloud wipe failed, continuing to upsert...", e);
    }

    // 2. Wipe Local Data
    this.clearLocalData();

    // 3. Upsert Backup Data to Cloud
    if (dataObj.branches && dataObj.branches.length > 0) {
      await this.supabase.from('branches').upsert(dataObj.branches);
    }
    if (dataObj.customers && dataObj.customers.length > 0) {
      await this.supabase.from('customers').upsert(dataObj.customers);
    }
    if (dataObj.orders && dataObj.orders.length > 0) {
      // Parse JSON fields back to objects before upserting
      const parsedOrders = dataObj.orders.map(o => {
        const p = { ...o };
        ['orderer', 'delivery_info', 'pickup_info', 'summary', 'payment', 'items', 'transfer_info', 'extra_data', 'outsource_info'].forEach(f => {
          if (p[f]) try { p[f] = JSON.parse(p[f]); } catch(e){}
        });
        return p;
      });
      await this.supabase.from('orders').upsert(parsedOrders);
    }

    console.log("Restore completed. Forcing sync...");
    // 4. Force a pull to populate local DB
    await this.sync();
    return true;
  }
}

module.exports = { SyncWorker };
