const { createClient } = require('@supabase/supabase-js');

// Example Sync Worker for Offline-First Architecture
class SyncWorker {
  constructor(db, supabaseUrl, supabaseAnonKey) {
    this.db = db;
    this.supabase = createClient(supabaseUrl, supabaseAnonKey);
    this.syncInterval = null;
    this.isSyncing = false;
  }

  start(intervalMs = 60000) {
    if (this.syncInterval) return;
    this.syncInterval = setInterval(() => this.sync(), intervalMs);
    console.log(`Sync worker started. Running every ${intervalMs}ms.`);
    // Run an initial sync immediately
    this.sync();
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
      console.log('Sync worker stopped.');
    }
  }

  async sync() {
    if (this.isSyncing) return;
    this.isSyncing = true;
    console.log('Starting sync cycle...');

    try {
      // 1. PUSH local changes to Supabase
      await this.pushOrders();
      await this.pushPrintJobs();

      // 2. PULL changes from Supabase to Local
      // (Assuming we want to pull branches and customers, or orders updated by others)
      await this.pullBranches();
      await this.pullCustomers();
      // await this.pullOrders(); // If needed for multi-device sync

      console.log('Sync cycle completed successfully.');
    } catch (error) {
      console.error('Error during sync cycle:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async pushOrders() {
    const pendingOrders = this.db.prepare(`SELECT * FROM orders WHERE sync_status IN ('pending_insert', 'pending_update')`).all();
    if (pendingOrders.length === 0) return;

    for (const order of pendingOrders) {
      // Convert JSON strings back to objects for Supabase
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
    const pendingJobs = this.db.prepare(`SELECT * FROM print_jobs WHERE sync_status IN ('pending_insert', 'pending_update')`).all();
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
        id, name, type, address, phone, manager, business_number, employee_count,
        delivery_fees, surcharges, account, seeded, extra_data, created_at, sync_status, last_sync_time
      ) VALUES (
        @id, @name, @type, @address, @phone, @manager, @business_number, @employee_count,
        @delivery_fees, @surcharges, @account, @seeded, @extra_data, @created_at, 'synced', @now
      )
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, type=excluded.type, address=excluded.address, phone=excluded.phone,
        manager=excluded.manager, business_number=excluded.business_number, employee_count=excluded.employee_count,
        delivery_fees=excluded.delivery_fees, surcharges=excluded.surcharges, account=excluded.account,
        seeded=excluded.seeded, extra_data=excluded.extra_data, sync_status='synced', last_sync_time=excluded.last_sync_time
    `);

    const now = new Date().toISOString();
    this.db.transaction((branches) => {
      for (const b of branches) {
        stmt.run({
          ...b,
          delivery_fees: b.delivery_fees ? JSON.stringify(b.delivery_fees) : null,
          surcharges: b.surcharges ? JSON.stringify(b.surcharges) : null,
          extra_data: b.extra_data ? JSON.stringify(b.extra_data) : null,
          now
        });
      }
    })(data);
  }

  async pullCustomers() {
    // Basic pull (could be optimized with updated_at tracking)
    const { data, error } = await this.supabase.from('customers').select('*');
    if (error) {
      console.error('Failed to pull customers:', error);
      return;
    }

    const stmt = this.db.prepare(`
      INSERT INTO customers (
        id, name, contact, company_name, department, address, email, grade, memo, points,
        type, birthday, wedding_anniversary, created_at, updated_at, sync_status, last_sync_time
      ) VALUES (
        @id, @name, @contact, @company_name, @department, @address, @email, @grade, @memo, @points,
        @type, @birthday, @wedding_anniversary, @created_at, @updated_at, 'synced', @now
      )
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name, contact=excluded.contact, company_name=excluded.company_name, department=excluded.department,
        address=excluded.address, email=excluded.email, grade=excluded.grade, memo=excluded.memo, points=excluded.points,
        type=excluded.type, birthday=excluded.birthday, wedding_anniversary=excluded.wedding_anniversary,
        updated_at=excluded.updated_at, sync_status='synced', last_sync_time=excluded.last_sync_time
    `);

    const now = new Date().toISOString();
    this.db.transaction((customers) => {
      for (const c of customers) {
        stmt.run({ ...c, now });
      }
    })(data);
  }
}

module.exports = { SyncWorker };
