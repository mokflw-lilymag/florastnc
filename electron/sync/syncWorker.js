const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const os = require('os');
const syncConfig = require('../sync-config');
const { getSyncScope, shouldSkipPull, applyTenantFilter } = require('../syncScope');
const { updateSyncState } = require('../syncState');

const LOCAL_ONLY_COLUMNS = new Set(['sync_status', 'last_sync_time']);

class SyncWorker {
  constructor(db, supabaseUrl, supabaseAnonKey) {
    this.db = db;
    this.supabaseUrl = supabaseUrl;
    this.supabaseAnonKey = supabaseAnonKey;
    this.supabase = null;
    this.tenantId = null;
    this.accessToken = null;
    this.syncLoopTimer = null;
    this.immediateSyncTimer = null;
    this.backupInterval = null;
    this.isSyncing = false;
    this.syncCycleCount = 0;
    this.lastSyncWorkAt = Date.now();
    this.memCursor = { orders: null, customers: null, simple_expenses: null };
  }

  configure(session) {
    if (!session?.access_token || !session?.tenant_id) {
      console.error('Invalid session provided to SyncWorker');
      return;
    }
    this.tenantId = session.tenant_id;
    this.accessToken = session.access_token;
    this.supabase = createClient(this.supabaseUrl, this.supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${session.access_token}` } },
    });
    console.log(`SyncWorker configured for tenant: ${this.tenantId}`);
  }

  start() {
    if (!this.supabase || !this.tenantId) {
      console.warn('SyncWorker not configured. Call configure() first.');
      return;
    }
    if (this.syncLoopTimer) return;

    this.scheduleSyncLoop(0);
    this.dailyBackup();
    this.backupInterval = setInterval(() => this.dailyBackup(), 1000 * 60 * 60);
    console.log('[SyncWorker] Adaptive sync loop started.');
  }

  stop() {
    if (this.syncLoopTimer) clearTimeout(this.syncLoopTimer);
    this.syncLoopTimer = null;
    if (this.immediateSyncTimer) clearTimeout(this.immediateSyncTimer);
    this.immediateSyncTimer = null;
    if (this.backupInterval) clearInterval(this.backupInterval);
    this.backupInterval = null;
    this.supabase = null;
    this.tenantId = null;
    this.accessToken = null;
    this.memCursor = { orders: null, customers: null, simple_expenses: null };
    console.log('Sync worker stopped.');
  }

  scheduleSyncLoop(delayMs) {
    if (this.syncLoopTimer) clearTimeout(this.syncLoopTimer);
    this.syncLoopTimer = setTimeout(async () => {
      try {
        const result = await this.runSyncCycle();
        this.scheduleSyncLoop(this.getNextSyncDelayMs(result?.pendingQueue ?? 0));
      } catch (e) {
        console.error('[SyncWorker] Sync error:', e);
        updateSyncState({ lastError: e.message || String(e) });
        this.scheduleSyncLoop(syncConfig.SYNC_INTERVAL_ACTIVE_MS);
      }
    }, delayMs);
  }

  getNextSyncDelayMs(pendingQueue = 0) {
    if (pendingQueue > 0) return syncConfig.SYNC_INTERVAL_ACTIVE_MS;
    const idleMs = Date.now() - this.lastSyncWorkAt;
    return idleMs >= syncConfig.IDLE_THRESHOLD_MS
      ? syncConfig.SYNC_INTERVAL_IDLE_MS
      : syncConfig.SYNC_INTERVAL_ACTIVE_MS;
  }

  requestImmediateSyncCycle() {
    this.lastSyncWorkAt = Date.now();
    if (this.immediateSyncTimer) clearTimeout(this.immediateSyncTimer);
    this.immediateSyncTimer = setTimeout(async () => {
      this.immediateSyncTimer = null;
      try {
        const result = await this.runSyncCycle();
        this.scheduleSyncLoop(this.getNextSyncDelayMs(result?.pendingQueue ?? 0));
      } catch (e) {
        console.error('[SyncWorker] Immediate sync error:', e);
      }
    }, syncConfig.IMMEDIATE_SYNC_DEBOUNCE_MS);
  }

  resetSyncCursorsForScopeChange() {
    this.memCursor = { orders: null, customers: null, simple_expenses: null };
  }

  clearLocalData() {
    console.log('Clearing local SQLite data for security...');
    this.stop();
    try {
      this.db.prepare('DELETE FROM orders').run();
      this.db.prepare('DELETE FROM customers').run();
      this.db.prepare('DELETE FROM simple_expenses').run();
      this.db.prepare('DELETE FROM print_jobs').run();
      this.db.prepare('DELETE FROM branches').run();
      this.db.prepare('DELETE FROM sync_queue').run();
      this.memCursor = { orders: null, customers: null, simple_expenses: null };
      console.log('Local data wiped successfully.');
    } catch (e) {
      console.error('Failed to wipe local data:', e);
    }
  }

  async runSyncCycle() {
    if (this.isSyncing || !this.supabase) return { hadWork: false, pendingQueue: 0 };
    this.isSyncing = true;
    this.syncCycleCount++;

    try {
      const pushedQueue = await this.pushSyncQueue();
      await this.pushOrders();
      await this.pushPrintJobs();

      let pulled = 0;
      if (!shouldSkipPull()) {
        pulled += await this.syncTable('orders');
        pulled += await this.syncTable('customers');
        pulled += await this.syncTable('simple_expenses');
        await this.pullBranches();
      } else {
        console.log('[SyncWorker] Pull skipped (idle scope)');
      }

      let deletedRemoved = 0;
      if (this.syncCycleCount % syncConfig.DELETED_SYNC_ORDERS_EVERY_N === 0) {
        deletedRemoved += await this.syncDeletedRecords('orders');
      }
      if (this.syncCycleCount % syncConfig.DELETED_SYNC_CUSTOMERS_EVERY_N === 0) {
        deletedRemoved += await this.syncDeletedRecords('customers');
      }
      if (this.syncCycleCount % syncConfig.DELETED_SYNC_ORDERS_EVERY_N === 0) {
        deletedRemoved += await this.syncDeletedRecords('simple_expenses');
      }

      const hadWork = pushedQueue > 0 || pulled > 0 || deletedRemoved > 0;
      if (hadWork) this.lastSyncWorkAt = Date.now();

      const pendingQueue = this.db.prepare('SELECT COUNT(*) as c FROM sync_queue').get().c;
      const ordersCount = this.db.prepare('SELECT COUNT(*) as c FROM orders WHERE tenant_id = ?').get(this.tenantId).c;
      const customersCount = this.db.prepare('SELECT COUNT(*) as c FROM customers WHERE tenant_id = ?').get(this.tenantId).c;

      const patch = {
        ordersCount,
        customersCount,
        lastSyncAt: new Date().toISOString(),
        lastError: null,
        syncScope: getSyncScope(),
      };
      updateSyncState(patch);

      try {
        const { BrowserWindow } = require('electron');
        for (const win of BrowserWindow.getAllWindows()) {
          if (!win.isDestroyed()) win.webContents.send('local-sync-status', patch);
        }
      } catch (_) {}

      return { hadWork, pendingQueue };
    } finally {
      this.isSyncing = false;
    }
  }

  async sync() {
    return this.runSyncCycle();
  }

  async pushSyncQueue() {
    const pendingActions = this.db.prepare('SELECT * FROM sync_queue ORDER BY id ASC').all();
    if (!pendingActions.length) return 0;

    for (const action of pendingActions) {
      const { id, action: actionType, table_name, record_id, payload, timestamp } = action;
      let parsedPayload = {};
      if (payload) {
        const raw = JSON.parse(payload);
        for (const key of Object.keys(raw)) {
          if (!LOCAL_ONLY_COLUMNS.has(key)) parsedPayload[key] = raw[key];
        }
      }

      const { data: cloudRecord } = await this.supabase
        .from(table_name)
        .select('updated_at')
        .eq('id', record_id)
        .maybeSingle();

      if (cloudRecord?.updated_at) {
        const cloudTime = new Date(cloudRecord.updated_at).getTime();
        const localTime = new Date(timestamp).getTime();
        if (cloudTime > localTime) {
          this.db.prepare('DELETE FROM sync_queue WHERE id = ?').run(id);
          continue;
        }
      }

      let pushError = null;
      if (actionType === 'INSERT') {
        const { error } = await this.supabase.from(table_name).insert([parsedPayload]);
        pushError = error;
        if (pushError?.code === '23505') {
          const { error: retryError } = await this.supabase.from(table_name).update(parsedPayload).eq('id', record_id);
          pushError = retryError;
        }
      } else if (actionType === 'UPDATE') {
        const { error } = await this.supabase.from(table_name).update(parsedPayload).eq('id', record_id);
        pushError = error;
      } else if (actionType === 'DELETE') {
        const { error } = await this.supabase.from(table_name).delete().eq('id', record_id);
        pushError = error;
      }

      if (!pushError) {
        this.db.prepare('DELETE FROM sync_queue WHERE id = ?').run(id);
        if (record_id) {
          this.db.prepare(`UPDATE ${table_name} SET sync_status = 'synced', last_sync_time = ? WHERE id = ?`)
            .run(new Date().toISOString(), record_id);
        }
      } else {
        console.error(`[SyncWorker] push queue failed:`, pushError);
      }
    }
    return pendingActions.length;
  }

  async syncTable(tableName) {
    let totalRows = 0;
    let lastUpdated = this.memCursor[tableName];
    if (!lastUpdated) {
      const row = this.db
        .prepare(`SELECT MAX(updated_at) as last_updated FROM ${tableName} WHERE sync_status = 'synced' AND tenant_id = ?`)
        .get(this.tenantId);
      lastUpdated = row?.last_updated || '1970-01-01T00:00:00Z';
      if (lastUpdated !== '1970-01-01T00:00:00Z') {
        let dt = new Date(lastUpdated);
        if (dt > new Date()) dt = new Date();
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        if (dt > sevenDaysAgo) dt = sevenDaysAgo;
        else dt.setHours(dt.getHours() - 1);
        lastUpdated = dt.toISOString();
      }
    }

    let isDone = false;
    while (!isDone) {
      let query = this.supabase
        .from(tableName)
        .select('*')
        .gt('updated_at', lastUpdated)
        .order('updated_at', { ascending: true })
        .order('id', { ascending: true })
        .limit(1000);
      query = applyTenantFilter(query);

      const { data, error } = await query;
      if (error) throw new Error(`Supabase fetch error for ${tableName}: ${error.message}`);

      if (data?.length) {
        totalRows += data.length;
        lastUpdated = data[data.length - 1].updated_at;
        const tableInfo = this.db.prepare(`PRAGMA table_info(${tableName})`).all();
        const validColumns = new Set(tableInfo.map((c) => c.name));
        const now = new Date().toISOString();

        const insertMany = this.db.transaction((items) => {
          for (const item of items) {
            const filtered = {};
            for (const key of Object.keys(item)) {
              if (!validColumns.has(key)) continue;
              let val = item[key];
              if (val === undefined) val = null;
              else if (typeof val === 'boolean') val = val ? 1 : 0;
              else if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
              filtered[key] = val;
            }
            filtered.sync_status = 'synced';
            filtered.last_sync_time = now;
            const cols = Object.keys(filtered);
            const placeholders = cols.map(() => '?').join(', ');
            const updateSet = cols.map((c) => `${c} = excluded.${c}`).join(', ');
            const values = cols.map((c) => filtered[c]);
            this.db
              .prepare(
                `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders})
                 ON CONFLICT(id) DO UPDATE SET ${updateSet}`,
              )
              .run(...values);
          }
        });
        insertMany(data);
        isDone = data.length < 1000;
      } else {
        isDone = true;
      }
    }

    this.memCursor[tableName] = lastUpdated;
    return totalRows;
  }

  async syncDeletedRecords(tableName) {
    const localIds = this.db
      .prepare(`SELECT id FROM ${tableName} WHERE sync_status = 'synced' AND tenant_id = ?`)
      .all(this.tenantId)
      .map((r) => r.id);
    if (!localIds.length) return 0;

    const cloudIds = new Set();
    const CHUNK = 200;
    for (let i = 0; i < localIds.length; i += CHUNK) {
      const chunk = localIds.slice(i, i + CHUNK);
      const { data, error } = await this.supabase.from(tableName).select('id').in('id', chunk);
      if (error) return 0;
      for (const row of data || []) cloudIds.add(row.id);
    }

    const deletedIds = localIds.filter((id) => !cloudIds.has(id));
    if (deletedIds.length) {
      const del = this.db.prepare(`DELETE FROM ${tableName} WHERE id = ?`);
      this.db.transaction(() => {
        for (const id of deletedIds) del.run(id);
      })();
    }
    return deletedIds.length;
  }

  async pushOrders() {
    const pendingOrders = this.db
      .prepare(`SELECT * FROM orders WHERE sync_status IN ('pending_insert', 'pending_update') AND tenant_id = ?`)
      .all(this.tenantId);
    if (!pendingOrders.length) return;

    for (const order of pendingOrders) {
      const payload = { ...order };
      delete payload.sync_status;
      delete payload.last_sync_time;
      ['orderer', 'delivery_info', 'pickup_info', 'summary', 'payment', 'items', 'transfer_info', 'extra_data', 'outsource_info', 'message'].forEach((field) => {
        if (payload[field]) {
          try {
            payload[field] = JSON.parse(payload[field]);
          } catch (_) {}
        }
      });

      const { error } = await this.supabase.from('orders').upsert(payload, { onConflict: 'id' });
      if (!error) {
        this.db.prepare(`UPDATE orders SET sync_status = 'synced', last_sync_time = ? WHERE id = ?`)
          .run(new Date().toISOString(), order.id);
      }
    }
  }

  async pushPrintJobs() {
    const pendingJobs = this.db
      .prepare(`SELECT * FROM print_jobs WHERE sync_status IN ('pending_insert', 'pending_update') AND tenant_id = ?`)
      .all(this.tenantId);
    if (!pendingJobs.length) return;

    for (const job of pendingJobs) {
      const payload = { ...job };
      delete payload.sync_status;
      delete payload.last_sync_time;
      if (payload.document_data) {
        try {
          payload.document_data = JSON.parse(payload.document_data);
        } catch (_) {}
      }
      const { error } = await this.supabase.from('print_jobs').upsert(payload, { onConflict: 'id' });
      if (!error) {
        this.db.prepare(`UPDATE print_jobs SET sync_status = 'synced', last_sync_time = ? WHERE id = ?`)
          .run(new Date().toISOString(), job.id);
      }
    }
  }

  async pullBranches() {
    const { data, error } = await this.supabase.from('branches').select('*');
    if (error || !data?.length) return;

    const stmt = this.db.prepare(`
      INSERT INTO branches (
        id, tenant_id, name, type, address, phone, manager, business_number, employee_count,
        delivery_fees, surcharges, account, seeded, extra_data, created_at, sync_status, last_sync_time
      ) VALUES (
        @id, @tenant_id, @name, @type, @address, @phone, @manager, @business_number, @employee_count,
        @delivery_fees, @surcharges, @account, @seeded, @extra_data, @created_at, 'synced', @now
      )
      ON CONFLICT(id) DO UPDATE SET
        tenant_id=excluded.tenant_id, name=excluded.name, sync_status='synced', last_sync_time=excluded.last_sync_time
    `);
    const now = new Date().toISOString();
    this.db.transaction((branches) => {
      for (const b of branches) {
        stmt.run({
          ...b,
          tenant_id: this.tenantId,
          delivery_fees: b.delivery_fees ? JSON.stringify(b.delivery_fees) : null,
          surcharges: b.surcharges ? JSON.stringify(b.surcharges) : null,
          extra_data: b.extra_data ? JSON.stringify(b.extra_data) : null,
          now,
        });
      }
    })(data);
  }

  getBackupData() {
    if (!this.tenantId) return null;
    return {
      backupDate: new Date().toISOString(),
      tenantId: this.tenantId,
      customers: this.db.prepare('SELECT * FROM customers WHERE tenant_id = ?').all(this.tenantId),
      orders: this.db.prepare('SELECT * FROM orders WHERE tenant_id = ?').all(this.tenantId),
      simple_expenses: this.db.prepare('SELECT * FROM simple_expenses WHERE tenant_id = ?').all(this.tenantId),
      branches: this.db.prepare('SELECT * FROM branches WHERE tenant_id = ?').all(this.tenantId),
    };
  }

  dailyBackup() {
    if (!this.tenantId) return;
    try {
      const backupDir = path.join(os.homedir(), 'Documents', 'Floxync_Backups');
      if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
      const today = new Date().toISOString().split('T')[0];
      const backupPath = path.join(backupDir, `floxync_backup_${this.tenantId}_${today}.json`);
      if (!fs.existsSync(backupPath)) {
        const data = this.getBackupData();
        fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
      }
    } catch (e) {
      console.error('Failed to run daily backup:', e);
    }
  }

  async restoreData(dataObj) {
    if (!this.supabase || !this.tenantId) throw new Error('SyncWorker not configured.');
    if (dataObj.tenantId !== this.tenantId) throw new Error('Backup file belongs to a different store.');
    const savedToken = this.accessToken;
    const savedTenant = this.tenantId;
    this.clearLocalData();
    this.configure({ access_token: savedToken, tenant_id: savedTenant });
    this.start();
    if (dataObj.branches?.length) await this.supabase.from('branches').upsert(dataObj.branches);
    if (dataObj.customers?.length) await this.supabase.from('customers').upsert(dataObj.customers);
    if (dataObj.simple_expenses?.length) {
      const parsedExp = dataObj.simple_expenses.map((e) => {
        const p = { ...e };
        ['inventory_updates', 'extra_data'].forEach((f) => {
          if (p[f] && typeof p[f] === 'string') {
            try { p[f] = JSON.parse(p[f]); } catch (_) {}
          }
        });
        return p;
      });
      await this.supabase.from('simple_expenses').upsert(parsedExp);
    }
    if (dataObj.orders?.length) {
      const parsed = dataObj.orders.map((o) => {
        const p = { ...o };
        ['orderer', 'delivery_info', 'pickup_info', 'summary', 'payment', 'items', 'transfer_info', 'extra_data', 'outsource_info', 'message'].forEach((f) => {
          if (p[f]) try { p[f] = JSON.parse(p[f]); } catch (_) {}
        });
        return p;
      });
      await this.supabase.from('orders').upsert(parsed);
    }
    await this.runSyncCycle();
    return true;
  }
}

module.exports = { SyncWorker };
