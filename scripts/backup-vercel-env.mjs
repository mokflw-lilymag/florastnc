#!/usr/bin/env node
/** Save SOURCE Supabase env backup for Vercel rollback */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migration = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => migration.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const backup = {
  backedUpAt: new Date().toISOString(),
  note: 'Rollback values for Vercel Production. SOURCE anon key: copy from Supabase dashboard mheqfhiyfsgnsglvxdrn if not listed.',
  vars: {
    NEXT_PUBLIC_SUPABASE_URL: g('SOURCE_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: '(get from SOURCE project Settings → API → anon public)',
    SUPABASE_SERVICE_ROLE_KEY: g('SOURCE_SERVICE_ROLE_KEY'),
  },
  targetForCutover: {
    NEXT_PUBLIC_SUPABASE_URL: g('TARGET_SUPABASE_URL'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: g('TARGET_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: g('TARGET_SERVICE_ROLE_KEY'),
  },
};

const dir = path.join(__dirname, 'backups');
fs.mkdirSync(dir, { recursive: true });
const file = path.join(dir, 'vercel_supabase_env_backup.json');
fs.writeFileSync(file, JSON.stringify(backup, null, 2));
fs.writeFileSync(path.join(dir, '_latest_vercel_backup.json'), JSON.stringify(backup, null, 2));
console.log('Saved:', file);
console.log('SOURCE URL:', backup.vars.NEXT_PUBLIC_SUPABASE_URL);
console.log('TARGET URL:', backup.targetForCutover.NEXT_PUBLIC_SUPABASE_URL);
