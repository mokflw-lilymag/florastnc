#!/usr/bin/env node
/**
 * Set login passwords on TARGET after REST migration (admin API).
 * Usage:
 *   node scripts/auth-set-passwords.mjs --email you@example.com --password 'YourPass123!'
 *   node scripts/auth-set-passwords.mjs --all --password 'TempPass2026!'   # all 26 users
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const target = createClient(g('TARGET_SUPABASE_URL'), g('TARGET_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = process.argv.slice(2);
const all = args.includes('--all');
const emailIdx = args.indexOf('--email');
const passIdx = args.indexOf('--password');
const email = emailIdx >= 0 ? args[emailIdx + 1] : null;
const password = passIdx >= 0 ? args[passIdx + 1] : null;

if (!password || (!all && !email)) {
  console.error('Usage: --email x@y.com --password pass  OR  --all --password pass');
  process.exit(1);
}

let page = 1;
const users = [];
while (true) {
  const { data, error } = await target.auth.admin.listUsers({ page, perPage: 100 });
  if (error) throw error;
  users.push(...(data.users ?? []));
  if ((data.users?.length ?? 0) < 100) break;
  page++;
}

const targets = all ? users : users.filter((u) => u.email?.toLowerCase() === email.toLowerCase());
if (!targets.length) {
  console.error('No matching users');
  process.exit(1);
}

for (const u of targets) {
  const { error } = await target.auth.admin.updateUserById(u.id, { password });
  console.log(error ? `FAIL ${u.email}: ${error.message}` : `OK ${u.email}`);
}

console.log(`Done (${targets.length} users). Login at floxync.com with new password.`);
