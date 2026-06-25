#!/usr/bin/env node
/**
 * SOURCE → TARGET auth.users encrypted_password 동기화
 * pg_restore 후 admin API로 비번이 덮어씌워진 경우 원래 해시 복구
 */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

async function connect(ref) {
  const c = new pg.Client({
    host: 'aws-1-ap-northeast-2.pooler.supabase.com',
    port: 5432,
    user: `postgres.${ref}`,
    password: g(ref === g('SOURCE_PROJECT_REF') ? 'SOURCE_DB_PASSWORD' : 'TARGET_DB_PASSWORD'),
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  return c;
}

const dryRun = process.argv.includes('--dry-run');
const src = await connect(g('SOURCE_PROJECT_REF'));
const tgt = await connect(g('TARGET_PROJECT_REF'));

const { rows: sourceUsers } = await src.query(
  'SELECT id, email, encrypted_password FROM auth.users ORDER BY email',
);
const { rows: targetUsers } = await tgt.query(
  'SELECT id, email, encrypted_password FROM auth.users ORDER BY email',
);

const targetById = new Map(targetUsers.map((u) => [u.id, u]));
let updated = 0;
let skipped = 0;

for (const su of sourceUsers) {
  const tu = targetById.get(su.id);
  if (!tu) {
    console.warn('SKIP missing on TARGET:', su.email);
    skipped++;
    continue;
  }
  if (su.encrypted_password === tu.encrypted_password) {
    skipped++;
    continue;
  }
  console.log('UPDATE', su.email);
  if (!dryRun) {
    await tgt.query(
      'UPDATE auth.users SET encrypted_password = $1, updated_at = now() WHERE id = $2',
      [su.encrypted_password, su.id],
    );
  }
  updated++;
}

console.log(`\nDone: ${updated} updated, ${skipped} unchanged/missing${dryRun ? ' (dry-run)' : ''}`);
await src.end();
await tgt.end();
