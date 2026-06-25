#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();
const token = g('SUPABASE_ACCESS_TOKEN');
const ref = g('TARGET_PROJECT_REF') ?? 'ubroyskoxaixstgaralk';

const sql = fs.readFileSync(path.join(__dirname, '_fix_db_grants.sql'), 'utf8');
const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: sql }),
});
console.log('grants apply:', r.ok ? 'OK' : await r.text());

const url = g('TARGET_SUPABASE_URL');
const anon = g('TARGET_ANON_KEY');
const svc = g('TARGET_SERVICE_ROLE_KEY');

const admin = createClient(url, svc, { auth: { persistSession: false } });
const { data: signIn, error: signErr } = await admin.auth.signInWithPassword({
  email: 'lilymag0301@gmail.com',
  password: 'FloxyncMigrate2026!',
});
if (signErr) {
  console.log('login test FAIL:', signErr.message);
} else {
  const client = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${signIn.session.access_token}` } },
    auth: { persistSession: false },
  });
  const o = await client.from('orders').select('id', { count: 'exact', head: true });
  const t = await client.from('tenants').select('id', { count: 'exact', head: true });
  console.log('logged-in orders:', o.error?.message ?? o.count);
  console.log('logged-in tenants:', t.error?.message ?? t.count);
}

const svcC = createClient(url, svc, { auth: { persistSession: false } });
for (const table of ['orders', 'tenants', 'customers', 'products']) {
  const { count, error } = await svcC.from(table).select('*', { count: 'exact', head: true });
  console.log(`service ${table}:`, error?.message ?? count);
}
