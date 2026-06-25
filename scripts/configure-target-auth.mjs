#!/usr/bin/env node
/** TARGET Supabase Auth URL Configuration (Management API) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const ref = g('TARGET_PROJECT_REF');
const token = g('SUPABASE_ACCESS_TOKEN');

const allowList = [
  'https://floxync.com/auth/callback',
  'https://floxync.com/**',
  'http://localhost:3000/auth/callback',
  'http://localhost:3000/**',
].join(',');

const body = {
  site_url: 'https://floxync.com',
  uri_allow_list: allowList,
};

console.log('GET current auth config for', ref);
const getR = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  headers: { Authorization: `Bearer ${token}` },
});
const before = await getR.json();
console.log('  site_url:', before.site_url);
console.log('  URI_ALLOW_LIST:', (before.URI_ALLOW_LIST || before.uri_allow_list || '').slice(0, 120));

console.log('\nPATCH auth config...');
const patchR = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
  method: 'PATCH',
  headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const after = await patchR.json();
if (!patchR.ok) {
  console.error('FAIL', patchR.status, JSON.stringify(after).slice(0, 500));
  process.exit(1);
}
console.log('OK site_url:', after.site_url);
console.log('OK URI_ALLOW_LIST set');
