#!/usr/bin/env node
/**
 * Floxync cross-project Supabase migration helper.
 * Usage:
 *   node scripts/supabase-migrate.mjs test
 *   node scripts/supabase-migrate.mjs inventory
 *   node scripts/supabase-migrate.mjs apply-schema
 *   node scripts/supabase-migrate.mjs copy-data
 *   node scripts/supabase-migrate.mjs copy-storage
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvFile(path.join(ROOT, '.env.migration.local'));

const SOURCE_URL = process.env.SOURCE_SUPABASE_URL;
const SOURCE_KEY = process.env.SOURCE_SERVICE_ROLE_KEY;
const TARGET_URL = process.env.TARGET_SUPABASE_URL;
const TARGET_KEY = process.env.TARGET_SERVICE_ROLE_KEY;
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

const SOURCE_REF = SOURCE_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const TARGET_REF = TARGET_URL?.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];

function requireEnv() {
  const missing = [];
  if (!SOURCE_URL) missing.push('SOURCE_SUPABASE_URL');
  if (!SOURCE_KEY) missing.push('SOURCE_SERVICE_ROLE_KEY');
  if (!TARGET_URL) missing.push('TARGET_SUPABASE_URL');
  if (!TARGET_KEY) missing.push('TARGET_SERVICE_ROLE_KEY');
  if (missing.length) {
    console.error('Missing env:', missing.join(', '));
    process.exit(1);
  }
}

async function mgmtQuery(projectRef, sql) {
  if (!ACCESS_TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN required for SQL execution');
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`Mgmt API ${projectRef} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

const SCHEMA_FILES = [
  'supabase_schema.sql',
  'supabase_pos_schema.sql',
  'supabase_marketing_schema.sql',
  'supabase_delivery_schema.sql',
  'supabase/organization_schema.sql',
  'supabase/org_work_tenant_context.sql',
  'supabase/organization_catalog_schema.sql',
  'supabase/organization_announcements_schema.sql',
  'supabase/organization_announcement_comments_schema.sql',
  'supabase/organization_announcement_reads_schema.sql',
  'supabase/organization_announcements_board_migration.sql',
  'supabase/shop_integrations_schema.sql',
  'supabase/point_transactions_schema_v2.sql',
  'supabase/point_transactions_balance_after.sql',
  'supabase/revenue_engine_schema.sql',
  'supabase/branch_material_requests_schema.sql',
  'supabase/branch_material_request_fulfillment.sql',
  'supabase/design_studio_gallery_templates.sql',
  'supabase/design_studio_gallery_add_upload.sql',
  'supabase/tenant_master_seed_audit_schema.sql',
  'supabase/tenants_plan_free_vs_ribbon_only.sql',
  'supabase/platform_config_schema.sql',
  'supabase/platform_config_partner_orders_flag.sql',
  'supabase/test_user_applications_schema.sql',
  'supabase/support_faq_schema.sql',
  'supabase/ai_messaging_schema_update.sql',
  'supabase/products_delete_policy.sql',
  'supabase/storage_buckets.sql',
  'supabase/rls_audit_fix.sql',
];

async function cmdTest() {
  requireEnv();
  const source = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false } });
  const target = createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: false } });

  const { count: srcTenants, error: srcErr } = await source.from('tenants').select('*', { count: 'exact', head: true });
  if (srcErr) throw new Error(`Source tenants: ${srcErr.message}`);

  const { error: tgtErr } = await target.from('tenants').select('*', { count: 'exact', head: true });
  const tgtOk = !tgtErr || tgtErr.code === 'PGRST205' || tgtErr.message.includes('does not exist');

  console.log('Connection OK');
  console.log(`  SOURCE ${SOURCE_REF}: tenants table reachable (${srcTenants ?? 0} rows)`);
  console.log(`  TARGET ${TARGET_REF}: ${tgtErr ? `not ready (${tgtErr.code}: ${tgtErr.message})` : 'tenants table exists'}`);

  if (ACCESS_TOKEN) {
    try {
      const rows = await mgmtQuery(TARGET_REF, "SELECT current_database() AS db, version() AS pg");
      console.log(`  TARGET SQL API: OK (${rows[0]?.db})`);
    } catch (e) {
      console.log(`  TARGET SQL API: ${e.message}`);
    }
  } else {
    console.log('  TARGET SQL API: skipped (no SUPABASE_ACCESS_TOKEN)');
  }
}

async function listPublicTables(projectRef) {
  const sql = `
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name;
  `;
  const rows = await mgmtQuery(projectRef, sql);
  return rows.map((r) => r.table_name);
}

async function countTable(projectRef, table) {
  try {
    const rows = await mgmtQuery(projectRef, `SELECT COUNT(*)::bigint AS c FROM public."${table.replace(/"/g, '""')}"`);
    return Number(rows[0]?.c ?? 0);
  } catch {
    return null;
  }
}

async function inventoryViaRest(label, url, key, probeTables) {
  const client = createClient(url, key, { auth: { persistSession: false } });
  console.log(`\n=== ${label} (REST) ===`);
  let found = 0;
  for (const t of probeTables) {
    const { count, error } = await client.from(t).select('*', { count: 'exact', head: true });
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('does not exist')) continue;
      console.log(`  ${t}: error (${error.code})`);
      continue;
    }
    found++;
    console.log(`  ${t}: ${count ?? 0}`);
  }
  console.log(`Reachable tables: ${found}`);
}

async function cmdInventory() {
  requireEnv();
  const probe = [...new Set([...DATA_TABLE_ORDER, 'branches', 'materials', 'partners', 'material_requests'])];

  await inventoryViaRest(`SOURCE ${SOURCE_REF}`, SOURCE_URL, SOURCE_KEY, probe);

  if (!ACCESS_TOKEN) {
    console.log('\nTARGET management inventory skipped (no SUPABASE_ACCESS_TOKEN)');
    await inventoryViaRest(`TARGET ${TARGET_REF}`, TARGET_URL, TARGET_KEY, probe);
    return;
  }

  console.log(`\n=== TARGET ${TARGET_REF} (Management API) ===`);
  try {
    const tables = await listPublicTables(TARGET_REF);
    console.log(`Tables: ${tables.length}`);
    for (const t of tables) {
      const c = await countTable(TARGET_REF, t);
      console.log(`  ${t}: ${c ?? 'error'}`);
    }
  } catch (e) {
    console.log(`Management API failed: ${e.message}`);
    await inventoryViaRest(`TARGET ${TARGET_REF}`, TARGET_URL, TARGET_KEY, probe);
  }
}

async function mgmtExec(projectRef, sql, label) {
  process.stdout.write(`  ${label} ... `);
  try {
    await mgmtQuery(projectRef, sql);
    console.log('OK');
    return true;
  } catch (e) {
    console.log('FAIL');
    console.error(`    ${e.message.split('\n')[0]}`);
    return false;
  }
}

async function cmdApplyGeneratedSchema() {
  requireEnv();
  if (!ACCESS_TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN required');

  const sqlPath = path.join(__dirname, '_generated_public_schema.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error('Run: node scripts/generate-schema-from-openapi.mjs first');
  }
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const chunks = sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
  console.log(`Applying ${chunks.length} DDL chunks to TARGET ${TARGET_REF}...`);
  let ok = 0;
  let fail = 0;
  for (const chunk of chunks) {
    const stmt = chunk.endsWith(';') ? chunk : chunk + ';';
    const label = stmt.slice(0, 60).replace(/\s+/g, ' ');
    if (await mgmtExec(TARGET_REF, stmt, label)) ok++;
    else fail++;
  }
  console.log(`Generated schema: ${ok} OK, ${fail} failed`);
}

async function cmdApplySchema() {
  requireEnv();
  if (!ACCESS_TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN required for apply-schema');

  console.log(`Applying ${SCHEMA_FILES.length} SQL files to TARGET ${TARGET_REF}...`);
  for (const rel of SCHEMA_FILES) {
    const full = path.join(ROOT, rel);
    if (!fs.existsSync(full)) {
      console.warn(`  SKIP missing: ${rel}`);
      continue;
    }
    const sql = fs.readFileSync(full, 'utf8');
    await mgmtExec(TARGET_REF, sql, rel);
  }
  console.log('Schema apply done.');
}

/** Tables created in live DB but not in repo SQL dumps — copy order respects FK roughly */
const DATA_TABLE_ORDER = [
  'tenants',
  'organizations',
  'organization_members',
  'profiles',
  'customers',
  'products',
  'delivery_fees_by_region',
  'orders',
  'print_jobs',
  'simple_expenses',
  'partners',
  'materials',
  'supplier_suggestions',
  'fixed_cost_templates',
  'point_transactions',
  'store_settings',
  'shop_settings',
  'shop_integrations',
  'pos_integrations',
  'pos_transactions',
  'custom_fonts',
  'custom_phrases',
  'subscriptions',
  'chat_rooms',
  'chat_messages',
  'support_faq',
  'platform_config',
  'marketing_campaigns',
  'marketing_attributions',
  'customer_anniversaries',
  'revenue_autopilot_settings',
  'marketing_drafts',
  'tenant_postiz_integrations',
  'marketing_scheduled_posts',
  'branch_material_requests',
  'branch_material_request_lines',
  'organization_catalog_items',
  'organization_announcements',
  'organization_announcement_comments',
  'organization_announcement_reads',
  'design_gallery_themes',
  'design_gallery_assets',
  'tenant_master_seed_audit',
  'test_user_applications',
  'user_credentials',
];

const UPSERT_KEY = {
  revenue_autopilot_settings: 'tenant_id',
  organization_members: 'organization_id,user_id',
  wallets: 'tenant_id',
};

async function copyTable(table) {
  const source = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false } });
  const target = createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: false } });

  const pageSize = 500;
  let offset = 0;
  let total = 0;
  const onConflict = UPSERT_KEY[table] ?? 'id';

  while (true) {
    const { data, error } = await source.from(table).select('*').range(offset, offset + pageSize - 1);
    if (error) {
      if (error.code === 'PGRST205' || error.message.includes('does not exist')) return { skipped: true, total: 0 };
      throw new Error(`${table} read: ${error.message}`);
    }
    if (!data?.length) break;

    let batch = data;
    let insErr;
    ({ error: insErr } = await target.from(table).upsert(batch, { onConflict, ignoreDuplicates: false }));
    if (insErr && insErr.message?.includes('Could not find')) {
      const { data: probe } = await target.from(table).select('*').limit(0);
      const allowed = probe !== null ? Object.keys((await source.from(table).select('*').limit(1)).data?.[0] ?? {}) : [];
      // fallback: strip unknown columns using target OpenAPI not available — retry insert without upsert row by row
      for (const row of batch) {
        let attempt = { ...row };
        for (let tries = 0; tries < 5; tries++) {
          const { error: rowErr } = await target.from(table).upsert(attempt, { onConflict, ignoreDuplicates: false });
          if (!rowErr) { total++; break; }
          const m = rowErr.message?.match(/Could not find the '([^']+)' column/);
          if (m) delete attempt[m[1]];
          else throw new Error(`${table} write: ${rowErr.message}`);
        }
      }
    } else if (insErr) {
      throw new Error(`${table} write: ${insErr.message}`);
    } else {
      total += data.length;
    }

    offset += pageSize;
    if (data.length < pageSize) break;
  }
  return { skipped: false, total };
}

async function cmdFixSchema() {
  requireEnv();
  if (!ACCESS_TOKEN) throw new Error('SUPABASE_ACCESS_TOKEN required');
  const sql = fs.readFileSync(path.join(__dirname, '_migration_fix_schema.sql'), 'utf8');
  const chunks = sql.split(/;\s*\n/).map((s) => s.trim()).filter((s) => s && !s.startsWith('--'));
  for (const chunk of chunks) {
    const stmt = chunk.endsWith(';') ? chunk : chunk + ';';
    await mgmtExec(TARGET_REF, stmt, stmt.slice(0, 50));
  }
}

async function cmdCopyTables() {
  requireEnv();
  const tables = (process.argv[3] ?? '').split(',').filter(Boolean);
  if (!tables.length) throw new Error('Usage: copy-tables tenants,profiles,...');
  for (const table of tables) {
    process.stdout.write(`  ${table} ... `);
    try {
      const { skipped, total } = await copyTable(table.trim());
      console.log(skipped ? 'skip' : `${total} rows`);
    } catch (e) {
      console.log('FAIL');
      console.error(`    ${e.message}`);
    }
  }
}

async function cmdCopyData() {
  requireEnv();
  const source = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false } });

  // Discover all tables exposed on source REST
  const res = await fetch(`${SOURCE_URL}/rest/v1/`, {
    headers: { apikey: SOURCE_KEY, Authorization: `Bearer ${SOURCE_KEY}`, Accept: 'application/openapi+json' },
  });
  const spec = await res.json();
  const allTables = Object.keys(spec.definitions ?? {}).filter((k) => !k.includes('.'));
  const ordered = [
    ...DATA_TABLE_ORDER.filter((t) => allTables.includes(t)),
    ...allTables.filter((t) => !DATA_TABLE_ORDER.includes(t)),
  ];

  console.log(`Copying data SOURCE → TARGET (${ordered.length} tables)...`);
  for (const table of ordered) {
    process.stdout.write(`  ${table} ... `);
    try {
      const { skipped, total } = await copyTable(table);
      console.log(skipped ? 'skip' : `${total} rows`);
    } catch (e) {
      console.log('FAIL');
      console.error(`    ${e.message}`);
    }
  }
}

async function listStorageObjects(client, bucket, prefix = '') {
  const out = [];
  const listAt = async (folder) => {
    const { data, error } = await client.storage.from(bucket).list(folder, { limit: 1000 });
    if (error) throw error;
    for (const item of data ?? []) {
      const p = folder ? `${folder}/${item.name}` : item.name;
      if (item.id) out.push(p);
      else await listAt(p);
    }
  };
  await listAt(prefix);
  return out;
}

async function cmdCopyAuth() {
  requireEnv();
  const source = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const target = createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

  let page = 1;
  let total = 0;
  console.log('Copying auth.users SOURCE → TARGET ...');
  while (true) {
    const { data, error } = await source.auth.admin.listUsers({ page, perPage: 100 });
    if (error) throw error;
    const users = data.users ?? [];
    if (!users.length) break;

    for (const u of users) {
      const payload = {
        id: u.id,
        email: u.email,
        phone: u.phone,
        email_confirm: true,
        phone_confirm: !!u.phone_confirmed_at,
        user_metadata: u.user_metadata ?? {},
        app_metadata: u.app_metadata ?? {},
      };
      const { error: createErr } = await target.auth.admin.createUser(payload);
      if (createErr) {
        if (createErr.message?.includes('already been registered') || createErr.status === 422) {
          const { error: updErr } = await target.auth.admin.updateUserById(u.id, {
            email: u.email,
            user_metadata: u.user_metadata ?? {},
            app_metadata: u.app_metadata ?? {},
          });
          if (updErr) console.warn(`  update ${u.email}: ${updErr.message}`);
          else total++;
        } else {
          console.warn(`  skip ${u.email}: ${createErr.message}`);
        }
      } else {
        total++;
      }
    }
    if (users.length < 100) break;
    page++;
  }
  console.log(`Auth users processed: ${total}`);
  console.log('Note: passwords cannot be copied — users must use "Forgot password" after cutover.');
}

async function cmdCopyStorage() {
  requireEnv();
  const source = createClient(SOURCE_URL, SOURCE_KEY, { auth: { persistSession: false } });
  const target = createClient(TARGET_URL, TARGET_KEY, { auth: { persistSession: false } });

  const buckets = ['receipts', 'chat_attachments', 'user-assets', 'org_announcements'];
  for (const bucket of buckets) {
    console.log(`\nBucket: ${bucket}`);
    let paths = [];
    try {
      paths = await listStorageObjects(source, bucket);
    } catch (e) {
      console.log(`  skip (${e.message})`);
      continue;
    }
    console.log(`  files: ${paths.length}`);
    for (const p of paths) {
      const { data: blob, error: dlErr } = await source.storage.from(bucket).download(p);
      if (dlErr) {
        console.warn(`  FAIL download ${p}: ${dlErr.message}`);
        continue;
      }
      const { error: upErr } = await target.storage.from(bucket).upload(p, blob, { upsert: true });
      if (upErr) console.warn(`  FAIL upload ${p}: ${upErr.message}`);
      else process.stdout.write('.');
    }
    console.log('');
  }
}

async function cmdMigrateRest() {
  await cmdApplyGeneratedSchema();
  await cmdApplySchema();
  await cmdCopyAuth();
  await cmdCopyData();
  await cmdCopyStorage();
  console.log('\nREST migration pass complete. Run: node scripts/supabase-migrate.mjs inventory');
}

const cmd = process.argv[2] || 'test';
const handlers = {
  test: cmdTest,
  inventory: cmdInventory,
  'apply-generated-schema': cmdApplyGeneratedSchema,
  'apply-schema': cmdApplySchema,
  'copy-auth': cmdCopyAuth,
  'copy-data': cmdCopyData,
  'copy-storage': cmdCopyStorage,
  'fix-schema': cmdFixSchema,
  'copy-tables': cmdCopyTables,
  'migrate-rest': cmdMigrateRest,
};

(async () => {
  const fn = handlers[cmd];
  if (!fn) {
    console.error(`Unknown command: ${cmd}`);
    console.error('Commands:', Object.keys(handlers).join(', '));
    process.exit(1);
  }
  await fn();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
