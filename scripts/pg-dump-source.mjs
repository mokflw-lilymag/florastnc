#!/usr/bin/env node
/**
 * SOURCE(무료) Supabase → custom-format dump (public, auth, storage)
 * Docker postgres 이미지의 pg_dump 사용
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const envText = fs.readFileSync(path.join(root, '.env.migration.local'), 'utf8');
const g = (k) => envText.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const ref = g('SOURCE_PROJECT_REF');
const password = g('SOURCE_DB_PASSWORD');
const host = 'aws-1-ap-northeast-2.pooler.supabase.com';
const port = '5432';
const user = `postgres.${ref}`;

const backupDir = path.join(__dirname, 'backups');
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const outFile = path.join(backupDir, `floxync_source_${stamp}.dump`);
const dockerOut = `/backups/${path.basename(outFile)}`;

console.log(`Dumping SOURCE ${ref} → ${outFile}`);

const args = [
  'run', '--rm',
  '-v', `${backupDir}:/backups`,
  '-e', `PGPASSWORD=${password}`,
  'postgres:17',
  'pg_dump',
  '-h', host,
  '-p', port,
  '-U', user,
  '-d', 'postgres',
  '--schema=public',
  '--schema=auth',
  '--schema=storage',
  '--no-owner',
  '-Fc',
  '-f', dockerOut,
];

const r = spawnSync('docker', args, { stdio: 'inherit', shell: true });
if (r.status !== 0) {
  console.error('pg_dump failed');
  process.exit(r.status ?? 1);
}

const stat = fs.statSync(outFile);
console.log(`\nDone: ${outFile} (${(stat.size / 1024 / 1024).toFixed(2)} MB)`);
console.log('Latest dump path saved to scripts/backups/_latest_source.dump.txt');
fs.writeFileSync(path.join(backupDir, '_latest_source.dump.txt'), outFile);
