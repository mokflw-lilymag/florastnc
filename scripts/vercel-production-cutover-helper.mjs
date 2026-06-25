#!/usr/bin/env node
/**
 * Production floxync.com Vercel cutover helper.
 * Writes TARGET values to a local file for dashboard paste.
 * Run swap on a specific project when VERCEL_PROJECT_ID + VERCEL_ORG_ID are set.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migration = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => migration.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const target = {
  NEXT_PUBLIC_SUPABASE_URL: g('TARGET_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: g('TARGET_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: g('TARGET_SERVICE_ROLE_KEY'),
};

const outPath = path.join(__dirname, 'backups', 'vercel_target_env_paste.txt');
const lines = [
  '# Vercel → floxync.com (Production) → Settings → Environment Variables',
  '# Replace these 3 variables, then Redeploy Production',
  '',
  `NEXT_PUBLIC_SUPABASE_URL=${target.NEXT_PUBLIC_SUPABASE_URL}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${target.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
  `SUPABASE_SERVICE_ROLE_KEY=${target.SUPABASE_SERVICE_ROLE_KEY}`,
  '',
  '# Rollback: see scripts/backups/vercel_supabase_env_backup.json',
];
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, lines.join('\n'));

console.log('Wrote:', outPath);
console.log('\nManual steps (production domain owner Vercel account):');
console.log('1. vercel.com → floxync.com project → Settings → Environment Variables');
console.log('2. Edit 3 Supabase vars using values in vercel_target_env_paste.txt');
console.log('3. Deployments → latest Production → Redeploy');
console.log('\nNote: Current CLI account (lilymags-projects) does not own floxync.com domain.');
console.log('      Env swap applied to prj_esRUs8uEULhPbgeXWEeJkfK4X0id (staging project only).');
