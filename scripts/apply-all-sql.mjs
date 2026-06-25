#!/usr/bin/env node
/**
 * Re-apply all repo SQL to TARGET (idempotent where possible).
 * Usage: node scripts/apply-all-sql.mjs [--strict]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const env = fs.readFileSync(path.join(ROOT, '.env.migration.local'), 'utf8');
const token = env.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m)[1].trim();
const ref = env.match(/^TARGET_PROJECT_REF=(.+)$/m)?.[1]?.trim() ?? 'ubroyskoxaixstgaralk';
const strict = process.argv.includes('--strict');

const ORDER = [
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
  'supabase/fixed_cost_templates_schema.sql',
  'supabase/ai_messaging_schema_update.sql',
  'supabase/products_delete_policy.sql',
  'supabase/storage_buckets.sql',
  'supabase/rls_audit_fix.sql',
  'scripts/_migration_fix_schema.sql',
];

const SKIP_ERRORS = [
  'already exists',
  'duplicate key',
  'does not exist',
  'ON CONFLICT',
  'violates not-null constraint',
  'multiple primary keys',
];

async function runSql(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const text = await r.text();
  return { ok: r.ok, text };
}

let ok = 0;
let skipped = 0;
let failed = 0;

for (const rel of ORDER) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    console.log(`SKIP missing ${rel}`);
    continue;
  }
  const sql = fs.readFileSync(full, 'utf8');
  process.stdout.write(`${rel} ... `);
  const { ok: success, text } = await runSql(sql);
  if (success) {
    console.log('OK');
    ok++;
    continue;
  }
  const skippable = SKIP_ERRORS.some((s) => text.includes(s));
  if (skippable && !strict) {
    console.log('SKIP (known)');
    skipped++;
    continue;
  }
  console.log('FAIL');
  console.log(text.slice(0, 500));
  failed++;
  if (strict) process.exit(1);
}

// Restore auth trigger if missing
const triggerSql = `
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
`;
process.stdout.write('auth trigger restore ... ');
const tr = await runSql(triggerSql);
console.log(tr.ok ? 'OK' : `FAIL ${tr.text.slice(0, 200)}`);

console.log(`\nDone: ${ok} OK, ${skipped} skipped, ${failed} failed`);
