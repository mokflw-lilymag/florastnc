/**
 * FloXync Electron 동기화 범위 — 테넌트(tenant) 단위
 * - tenant: 로그인 매장 tenant_id만 pull
 * - idle: 로그아웃 — pull 중단, push 대기열 유지
 */

const { TENANT_UPDATED_AT_TABLES, TENANT_CREATED_AT_TABLES } = require('./sync/localSyncConfig');

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

function pruneTenantScopedTable(table, tenantId) {
  try {
    return dbRef
      .prepare(
        `DELETE FROM ${table}
         WHERE sync_status = 'synced'
           AND tenant_id IS NOT NULL
           AND tenant_id != ?`,
      )
      .run(tenantId).changes || 0;
  } catch (_) {
    return 0;
  }
}

function pruneSyncedTable(table) {
  try {
    return dbRef.prepare(`DELETE FROM ${table} WHERE sync_status = 'synced'`).run().changes || 0;
  } catch (_) {
    return 0;
  }
}

/** scope 밖 synced 레코드 제거 (pending push 행은 유지) */
function pruneLocalRowsOutsideScope() {
  if (!dbRef) return {};

  const tenantTables = [
    ...new Set([...TENANT_UPDATED_AT_TABLES, ...TENANT_CREATED_AT_TABLES, 'branches']),
  ].filter((t) => !['external_orders', 'order_transfers', 'tenants'].includes(t));

  if (syncScope.mode === 'tenant' && syncScope.tenantId) {
    const tenantId = syncScope.tenantId;
    const removed = {};

    for (const table of tenantTables) {
      removed[table] = pruneTenantScopedTable(table, tenantId);
    }

    try {
      removed.tenants = dbRef
        .prepare(
          `DELETE FROM tenants
           WHERE sync_status = 'synced'
             AND id != ?
             AND id NOT IN (
               SELECT target_tenant_id FROM partners
               WHERE tenant_id = ? AND target_tenant_id IS NOT NULL
             )`,
        )
        .run(tenantId, tenantId).changes || 0;
    } catch (_) {
      removed.tenants = 0;
    }

    try {
      removed.external_orders = dbRef
        .prepare(
          `DELETE FROM external_orders
           WHERE sync_status = 'synced'
             AND sender_tenant_id != ?
             AND receiver_tenant_id != ?`,
        )
        .run(tenantId, tenantId).changes || 0;
    } catch (_) {
      removed.external_orders = 0;
    }

    try {
      removed.order_transfers = dbRef
        .prepare(
          `DELETE FROM order_transfers
           WHERE sync_status = 'synced'
             AND order_branch_id != ?
             AND process_branch_id != ?`,
        )
        .run(tenantId, tenantId).changes || 0;
    } catch (_) {
      removed.order_transfers = 0;
    }

    const total = Object.values(removed).reduce((a, b) => a + b, 0);
    if (total > 0) {
      console.log('[SyncScope] Pruned other-tenant rows:', JSON.stringify(removed));
    }
    return removed;
  }

  if (syncScope.mode === 'idle') {
    const removed = {};
    for (const table of tenantTables) {
      removed[table] = pruneSyncedTable(table);
    }
    for (const table of ['tenants', 'external_orders', 'order_transfers']) {
      removed[table] = pruneSyncedTable(table);
    }
    const total = Object.values(removed).reduce((a, b) => a + b, 0);
    if (total > 0) {
      console.log('[SyncScope] Pruned synced rows on idle:', JSON.stringify(removed));
    }
    return removed;
  }

  return {};
}

module.exports = {
  bindDb,
  getSyncScope,
  setSyncScope,
  shouldSkipPull,
  applyTenantFilter,
  pruneLocalRowsOutsideScope,
};
