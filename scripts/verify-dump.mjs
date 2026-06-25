#!/usr/bin/env node
/** SOURCE vs dump 내 테이블 row 수 빠른 검증 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { Client } from 'pg';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envText = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => envText.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const dumpPath = fs.readFileSync(path.join(__dirname, 'backups', '_latest_source.dump.txt'), 'utf8').trim();
const tables = ['tenants', 'orders', 'customers', 'products', 'materials', 'profiles'];

const c = new Client({
  host: 'aws-1-ap-northeast-2.pooler.supabase.com',
  port: 5432,
  user: `postgres.${g('SOURCE_PROJECT_REF')}`,
  password: g('SOURCE_DB_PASSWORD'),
  database: 'postgres',
  ssl: { rejectUnauthorized: false },
});
await c.connect();

console.log('Live SOURCE counts:');
for (const t of tables) {
  const r = await c.query(`SELECT count(*)::int AS n FROM public.${t}`);
  console.log(`  ${t}: ${r.rows[0].n}`);
}
const au = await c.query('SELECT count(*)::int AS n FROM auth.users');
console.log(`  auth.users: ${au.rows[0].n}`);
await c.end();

console.log(`\nDump file: ${dumpPath} (${(fs.statSync(dumpPath).size / 1024 / 1024).toFixed(2)} MB)`);
const list = spawnSync('docker', [
  'run', '--rm', '-v', `${path.dirname(dumpPath)}:/backups`,
  'postgres:17', 'pg_restore', '-l', `/backups/${path.basename(dumpPath)}`,
], { encoding: 'utf8', shell: true });
const dataLines = list.stdout.split('\n').filter((l) => l.includes('TABLE DATA'));
console.log(`TABLE DATA entries in dump: ${dataLines.length}`);
for (const t of [...tables, 'users']) {
  const hit = dataLines.some((l) => l.includes(t));
  console.log(`  ${t}: ${hit ? 'included' : 'MISSING'}`);
}
