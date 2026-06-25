#!/usr/bin/env node
/** Verify Trigger.dev + bridge-app Supabase env alignment with TARGET */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migration = fs.readFileSync(path.join(__dirname, '..', '.env.migration.local'), 'utf8');
const g = (k) => migration.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();
const targetUrl = g('TARGET_SUPABASE_URL');

function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 0) continue;
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim();
  }
  return out;
}

const local = readEnvFile(path.join(__dirname, '..', '.env.local'));
const bridge = readEnvFile(path.join(__dirname, '..', 'bridge-app', '.env'));

console.log('=== Trigger / bridge env check ===\n');
console.log('.env.local NEXT_PUBLIC_SUPABASE_URL:', local.NEXT_PUBLIC_SUPABASE_URL);
console.log('  matches TARGET:', local.NEXT_PUBLIC_SUPABASE_URL === targetUrl ? 'YES' : 'NO');

console.log('bridge-app SUPABASE_URL:', bridge.SUPABASE_URL);
console.log('  matches TARGET:', bridge.SUPABASE_URL === targetUrl ? 'YES' : 'NO');

console.log('\nTrigger.dev project: proj_mhhvmrfusfwjvzavyswp (see trigger.config.ts)');
console.log('→ Trigger.dev dashboard → Project → Environment Variables');
console.log('  Set NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to TARGET values');
console.log('  (same as .env.migration.local TARGET_*)');

const triggerEnv = readEnvFile(path.join(__dirname, '..', '.env.local'));
const triggerOk =
  triggerEnv.NEXT_PUBLIC_SUPABASE_URL === targetUrl &&
  !!triggerEnv.SUPABASE_SERVICE_ROLE_KEY;
console.log('\nLocal .env.local ready for trigger:deploy:', triggerOk ? 'YES' : 'CHECK KEYS');
