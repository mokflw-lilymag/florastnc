#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const token = env.match(/^SUPABASE_ACCESS_TOKEN=(.+)$/m)[1].trim();
const ref = env.match(/^TARGET_PROJECT_REF=(.+)$/m)?.[1]?.trim() ?? 'ubroyskoxaixstgaralk';

async function q(sql) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(t);
  return JSON.parse(t);
}

const audits = {
  functions: `SELECT proname AS name FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' ORDER BY 1`,
  policies: `SELECT tablename, policyname FROM pg_policies WHERE schemaname='public' ORDER BY tablename, policyname`,
  triggers: `SELECT event_object_schema AS schema, event_object_table AS table_name, trigger_name FROM information_schema.triggers WHERE event_object_schema IN ('public','auth') ORDER BY 1,2,3`,
  extensions: `SELECT extname FROM pg_extension ORDER BY 1`,
  rls_enabled: `SELECT relname AS table_name, relrowsecurity AS rls_on FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND relrowsecurity ORDER BY 1`,
  storage_policies: `SELECT tablename, policyname FROM pg_policies WHERE schemaname='storage' ORDER BY tablename, policyname`,
  tables_without_rls: `SELECT c.relname AS table_name FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind='r' AND NOT c.relrowsecurity ORDER BY 1`,
};

for (const [label, sql] of Object.entries(audits)) {
  const rows = await q(sql);
  console.log(`\n=== ${label} (${rows.length}) ===`);
  for (const row of rows.slice(0, 80)) console.log(' ', JSON.stringify(row));
  if (rows.length > 80) console.log(`  ... +${rows.length - 80} more`);
}
