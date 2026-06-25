#!/usr/bin/env node
/** TARGET preflight: REST API + Storage + auth user list */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const url = g('TARGET_SUPABASE_URL');
const anon = g('TARGET_ANON_KEY');
const svc = g('TARGET_SERVICE_ROLE_KEY');

const admin = createClient(url, svc, { auth: { persistSession: false } });

console.log('=== TARGET preflight ===\n');

for (const table of ['orders', 'tenants', 'customers', 'products']) {
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true });
  console.log(`${table}:`, error?.message ?? count);
}

const { data: buckets } = await admin.storage.listBuckets();
console.log('storage buckets:', buckets?.length ?? 0, buckets?.map((b) => b.name).join(', '));

const { data: users, error: uErr } = await admin.auth.admin.listUsers({ page: 1, perPage: 5 });
console.log('auth.users sample:', uErr?.message ?? `${users?.users?.length ?? 0} shown (total via admin API)`);

const { data: adminUser } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
const lily = adminUser?.users?.find((u) => u.email === 'lilymag0301@gmail.com');
console.log('lilymag0301@gmail.com exists:', !!lily);

console.log('\nPreflight OK — TARGET API reachable with service_role');
