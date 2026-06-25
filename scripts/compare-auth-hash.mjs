#!/usr/bin/env node
/** Compare auth password hash SOURCE vs TARGET for one email */
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const env = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => env.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();
const email = process.argv[2] || 'lilymag0301@gmail.com';

async function hash(ref, pw) {
  const c = new pg.Client({
    host: 'aws-1-ap-northeast-2.pooler.supabase.com',
    port: 5432,
    user: `postgres.${ref}`,
    password: pw,
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();
  const r = await c.query(
    'SELECT encrypted_password FROM auth.users WHERE email = $1',
    [email],
  );
  await c.end();
  return r.rows[0]?.encrypted_password?.slice(0, 20) ?? null;
}

const src = await hash(g('SOURCE_PROJECT_REF'), g('SOURCE_DB_PASSWORD'));
const tgt = await hash(g('TARGET_PROJECT_REF'), g('TARGET_DB_PASSWORD'));
console.log('email:', email);
console.log('SOURCE hash prefix:', src);
console.log('TARGET hash prefix:', tgt);
console.log('hashes match:', src === tgt && src !== null);
