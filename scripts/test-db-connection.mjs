#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Client } from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

async function tryConnect(label, ref, password) {
  const hosts = [
    { host: 'aws-1-ap-northeast-2.pooler.supabase.com', port: 5432, user: `postgres.${ref}` },
    { host: 'aws-1-ap-northeast-2.pooler.supabase.com', port: 6543, user: `postgres.${ref}` },
  ];
  for (const cfg of hosts) {
    const c = new Client({ ...cfg, password, database: 'postgres', ssl: { rejectUnauthorized: false } });
    try {
      await c.connect();
      const r = await c.query('SELECT count(*)::int AS n FROM public.tenants');
      console.log(`OK ${label} ${cfg.host}:${cfg.port} tenants=${r.rows[0].n}`);
      await c.end();
      return { ...cfg, password };
    } catch (e) {
      console.log(`FAIL ${label} ${cfg.host}:${cfg.port} ${e.message.split('\n')[0]}`);
      try { await c.end(); } catch {}
    }
  }
  return null;
}

const srcPw = g('SOURCE_DB_PASSWORD');
const tgtPw = g('TARGET_DB_PASSWORD') ?? srcPw;

console.log('Testing SOURCE', g('SOURCE_PROJECT_REF'));
const src = await tryConnect('SOURCE', g('SOURCE_PROJECT_REF'), srcPw);
console.log('\nTesting TARGET', g('TARGET_PROJECT_REF'));
const tgt = await tryConnect('TARGET', g('TARGET_PROJECT_REF'), tgtPw);

if (!src) {
  console.error('\nSOURCE connection failed. Confirm password reset on FREE project mheqfhiyfsgnsglvxdrn');
  process.exit(1);
}
if (!tgt) {
  console.error('\nTARGET connection failed. Add TARGET_DB_PASSWORD to .env.migration.local (reset on floxync.com project too)');
  process.exit(1);
}
console.log('\nBoth connections OK — ready for pg_dump/restore');
