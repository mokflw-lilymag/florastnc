#!/usr/bin/env node
/** SOURCE vs TARGET 핵심 테이블 row 수 비교 */
import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envText = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => envText.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

async function client(ref, password) {
  const c = new Client({
    host: 'aws-1-ap-northeast-2.pooler.supabase.com',
    port: 5432,
    user: `postgres.${ref}`,
    password,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  return c;
}

const tables = [
  'tenants', 'orders', 'customers', 'products', 'materials', 'profiles',
  'shop_integrations', 'organization_members', 'user_roles', 'branches',
];

const src = await client(g('SOURCE_PROJECT_REF'), g('SOURCE_DB_PASSWORD'));
const tgt = await client(g('TARGET_PROJECT_REF'), g('TARGET_DB_PASSWORD'));

console.log('Table'.padEnd(28), 'SOURCE', 'TARGET', 'OK?');
console.log('-'.repeat(50));
let allOk = true;
for (const t of tables) {
  const s = (await src.query(`SELECT count(*)::int n FROM public.${t}`)).rows[0].n;
  const u = (await tgt.query(`SELECT count(*)::int n FROM public.${t}`)).rows[0].n;
  const ok = s === u ? '✓' : '✗';
  if (s !== u) allOk = false;
  console.log(t.padEnd(28), String(s).padStart(6), String(u).padStart(6), ok);
}
for (const q of ['auth.users', 'storage.buckets', 'storage.objects']) {
  const [schema, table] = q.split('.');
  const s = (await src.query(`SELECT count(*)::int n FROM ${schema}.${table}`)).rows[0].n;
  const u = (await tgt.query(`SELECT count(*)::int n FROM ${schema}.${table}`)).rows[0].n;
  const ok = s === u ? '✓' : '✗';
  if (s !== u) allOk = false;
  console.log(q.padEnd(28), String(s).padStart(6), String(u).padStart(6), ok);
}
await src.end();
await tgt.end();
console.log(allOk ? '\nAll counts match.' : '\nMismatch detected — review needed.');
