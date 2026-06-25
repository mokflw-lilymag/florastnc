#!/usr/bin/env node
/** TARGET auth login diagnostic */
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
const email = process.argv[2] || 'lilymag0301@gmail.com';
const passwords = process.argv.slice(3).length
  ? process.argv.slice(3)
  : ['FloxyncMigrate2026!']; // only test temp if no args — user should pass real pw locally

const admin = createClient(url, svc, { auth: { persistSession: false } });
const client = createClient(url, anon, { auth: { persistSession: false } });

console.log('TARGET', url);
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
const user = list?.users?.find((u) => u.email === email);
console.log('User found:', !!user, user?.id, 'confirmed:', user?.email_confirmed_at ? 'yes' : 'no');

for (const pw of passwords) {
  const { data, error } = await client.auth.signInWithPassword({ email, password: pw });
  console.log(`signIn password "${pw.slice(0, 3)}***":`, error?.message ?? `OK session=${!!data.session}`);
  if (data.session) {
    const authed = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
      auth: { persistSession: false },
    });
    const o = await authed.from('orders').select('id', { count: 'exact', head: true });
    console.log('  orders as user:', o.error?.message ?? o.count);
  }
}
