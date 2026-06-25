#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const admin = createClient(g('TARGET_SUPABASE_URL'), g('TARGET_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false },
});

const byProvider = {};
let page = 1;
while (true) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  for (const u of data.users) {
    for (const id of u.identities ?? [{ provider: 'email' }]) {
      byProvider[id.provider] = (byProvider[id.provider] ?? 0) + 1;
    }
  }
  if (data.users.length < 100) break;
  page++;
}
console.log('Identity providers on TARGET:', byProvider);

const email = process.argv[2] || 'lilymag0301@gmail.com';
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 100 });
const u = list.users.find((x) => x.email === email);
if (u) {
  console.log('\nUser', email);
  console.log('  identities:', u.identities?.map((i) => i.provider).join(', '));
  console.log('  has email identity:', u.identities?.some((i) => i.provider === 'email'));
}
