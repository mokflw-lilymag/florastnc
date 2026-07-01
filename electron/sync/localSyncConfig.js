/**
 * Electron 로컬 SQLite ↔ Supabase 동기화 대상 (Phase A + B)
 */

/** tenant_id + updated_at 증분 pull */
const TENANT_UPDATED_AT_TABLES = [
  // 기존
  'orders',
  'customers',
  'simple_expenses',
  // Phase A
  'products',
  'materials',
  'system_settings',
  'suppliers',
  'delivery_fees_by_region',
  // Phase B
  'purchases',
  'daily_settlements',
  'partners',
];

/** tenant_id + created_at 증분 pull */
const TENANT_CREATED_AT_TABLES = ['expenses', 'point_transactions'];

/** Electron queryDb 오프라인 프록시 대상 */
const OFFLINE_PROXY_TABLES = [
  'orders',
  'customers',
  'simple_expenses',
  'products',
  'materials',
  'system_settings',
  'suppliers',
  'delivery_fees_by_region',
  'tenants',
  'purchases',
  'daily_settlements',
  'point_transactions',
  'partners',
  'external_orders',
  'order_transfers',
  'expenses',
];

function createEmptyMemCursor() {
  const cursor = {};
  for (const t of TENANT_UPDATED_AT_TABLES) cursor[t] = null;
  for (const t of TENANT_CREATED_AT_TABLES) cursor[t] = null;
  cursor.external_orders = null;
  cursor.order_transfers = null;
  return cursor;
}

module.exports = {
  TENANT_UPDATED_AT_TABLES,
  TENANT_CREATED_AT_TABLES,
  OFFLINE_PROXY_TABLES,
  createEmptyMemCursor,
};
