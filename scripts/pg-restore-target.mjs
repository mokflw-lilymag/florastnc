#!/usr/bin/env node
/**
 * TARGET(유료) Supabase ← pg_restore (SOURCE dump)
 * 사전: TARGET DB 비밀번호를 .env.migration.local 의 TARGET_DB_PASSWORD 에 설정
 *      TARGET 기존 REST 마이그레이션 데이터는 덮어씁니다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envText = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => envText.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const ref = g('TARGET_PROJECT_REF');
const password = g('TARGET_DB_PASSWORD') ?? g('SOURCE_DB_PASSWORD');
const host = 'aws-1-ap-northeast-2.pooler.supabase.com';
const port = '5432';
const user = `postgres.${ref}`;

const dumpPath = process.argv[2]
  ?? fs.readFileSync(path.join(__dirname, 'backups', '_latest_source.dump.txt'), 'utf8').trim();

if (!fs.existsSync(dumpPath)) {
  console.error('Dump file not found:', dumpPath);
  process.exit(1);
}

console.log('Testing TARGET connection...');
const test = new Client({ host, port: Number(port), user, password, database: 'postgres', ssl: { rejectUnauthorized: false } });
try {
  await test.connect();
  const r = await test.query('SELECT count(*)::int AS n FROM public.tenants');
  console.log(`TARGET connected (current tenants=${r.rows[0].n})`);
  await test.end();
} catch (e) {
  console.error('TARGET connection failed:', e.message.split('\n')[0]);
  console.error('\n→ Supabase 대시보드에서 **유료 프로젝트(ubroyskoxaixstgaralk)** Database Settings → Reset password');
  console.error('→ .env.migration.local 에 TARGET_DB_PASSWORD=... 추가 후 다시 실행');
  process.exit(1);
}

const backupDir = path.dirname(dumpPath);
const dockerDump = `/backups/${path.basename(dumpPath)}`;

console.log(`\nRestoring ${dumpPath} → TARGET ${ref}`);
console.log('(pg_restore --clean --if-exists --no-owner --no-acl)\n');

const args = [
  'run', '--rm',
  '-v', `${backupDir}:/backups`,
  '-e', `PGPASSWORD=${password}`,
  'postgres:17',
  'pg_restore',
  '-h', host,
  '-p', port,
  '-U', user,
  '-d', 'postgres',
  '--clean',
  '--if-exists',
  '--no-owner',
  '--no-acl',
  '-Fc',
  dockerDump,
];

const r = spawnSync('docker', args, { stdio: 'inherit', shell: true });
if (r.status !== 0) {
  console.warn('\npg_restore exited with errors (일부 extension/권한 경고는 정상일 수 있음)');
}

console.log('\nPost-restore row counts:');
const c = new Client({ host, port: Number(port), user, password, database: 'postgres', ssl: { rejectUnauthorized: false } });
await c.connect();
for (const q of [
  'SELECT count(*)::int n FROM public.tenants',
  'SELECT count(*)::int n FROM public.orders',
  'SELECT count(*)::int n FROM auth.users',
]) {
  const row = await c.query(q);
  console.log(' ', q.match(/FROM (\S+)/)[1], '=', row.rows[0].n);
}
await c.end();
