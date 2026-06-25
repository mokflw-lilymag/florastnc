/**
 * FloXync Electron 동기화 범위 — 테넌트(tenant) 단위
 * - tenant: 로그인 매장 tenant_id만 pull
 * - idle: 로그아웃 — pull 중단, push 대기열 유지
 */

/** @type {import('better-sqlite3').Database | null} */
let dbRef = null;

function bindDb(db) {
  dbRef = db;
}

let syncScope = { mode: 'idle', tenantId: null };
let scopeKey = '';

function getSyncScope() {
  return { ...syncScope };
}

function shouldSkipPull() {
  return syncScope.mode === 'idle' || !syncScope.tenantId;
}

function applyTenantFilter(query) {
  if (shouldSkipPull() || !syncScope.tenantId) return query;
  return query.eq('tenant_id', syncScope.tenantId);
}

function setSyncScope(next) {
  const scope = {
    mode: next?.mode === 'tenant' && next?.tenantId ? 'tenant' : 'idle',
    tenantId: next?.tenantId || null,
  };
  const key = `${scope.mode}|${scope.tenantId || ''}`;
  const changed = key !== scopeKey;
  syncScope = scope;
  scopeKey = key;
  if (changed) {
    console.log('[SyncScope] Updated:', JSON.stringify(syncScope));
  }
  return { changed, scope: getSyncScope() };
}

/** scope 밖 synced 레코드 제거 (pending push 행은 유지) */
function pruneLocalRowsOutsideScope() {
  if (!dbRef) return { orders: 0, customers: 0, simple_expenses: 0 };

  if (syncScope.mode === 'tenant' && syncScope.tenantId) {
    const tenantId = syncScope.tenantId;
    const ordersResult = dbRef
      .prepare(
        `DELETE FROM orders
         WHERE sync_status = 'synced'
           AND tenant_id IS NOT NULL
           AND tenant_id != ?`,
      )
      .run(tenantId);
    const customersResult = dbRef
      .prepare(
        `DELETE FROM customers
         WHERE sync_status = 'synced'
           AND tenant_id IS NOT NULL
           AND tenant_id != ?`,
      )
      .run(tenantId);
    const expensesResult = dbRef
      .prepare(
        `DELETE FROM simple_expenses
         WHERE sync_status = 'synced'
           AND tenant_id IS NOT NULL
           AND tenant_id != ?`,
      )
      .run(tenantId);
    const removed = {
      orders: ordersResult.changes || 0,
      customers: customersResult.changes || 0,
      simple_expenses: expensesResult.changes || 0,
    };
    const total = removed.orders + removed.customers + removed.simple_expenses;
    if (total > 0) {
      console.log(
        `[SyncScope] Pruned other-tenant rows: orders=${removed.orders}, customers=${removed.customers}, expenses=${removed.simple_expenses}`,
      );
    }
    return removed;
  }

  if (syncScope.mode === 'idle') {
    const ordersResult = dbRef
      .prepare(`DELETE FROM orders WHERE sync_status = 'synced'`)
      .run();
    const customersResult = dbRef
      .prepare(`DELETE FROM customers WHERE sync_status = 'synced'`)
      .run();
    const expensesResult = dbRef
      .prepare(`DELETE FROM simple_expenses WHERE sync_status = 'synced'`)
      .run();
    const removed = {
      orders: ordersResult.changes || 0,
      customers: customersResult.changes || 0,
      simple_expenses: expensesResult.changes || 0,
    };
    const total = removed.orders + removed.customers + removed.simple_expenses;
    if (total > 0) {
      console.log(
        `[SyncScope] Pruned synced rows on idle: orders=${removed.orders}, customers=${removed.customers}, expenses=${removed.simple_expenses}`,
      );
    }
    return removed;
  }

  return { orders: 0, customers: 0, simple_expenses: 0 };
}

module.exports = {
  bindDb,
  getSyncScope,
  setSyncScope,
  shouldSkipPull,
  applyTenantFilter,
  pruneLocalRowsOutsideScope,
};
