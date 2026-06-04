const path = require('path');
const fs = require('fs');

/**
 * Load Supabase / app env for Electron main + sync worker.
 * Packaged apps: resources/.env.local (extraResources) or userData/supabase.env
 */
function loadElectronEnv(userDataPath) {
  const candidates = [
    path.join(__dirname, '..', '.env.local'),
    path.join(process.resourcesPath || '', '.env.local'),
    userDataPath ? path.join(userDataPath, 'supabase.env') : null,
  ].filter(Boolean);

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      require('dotenv').config({ path: envPath, override: false });
      console.log('[Electron Env] Loaded:', envPath);
      return envPath;
    }
  }

  console.warn(
    '[Electron Env] No .env.local found. Sync may fail until supabase.env is placed in userData or app is rebuilt with extraResources.'
  );
  return null;
}

function getSupabaseConfig() {
  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const supabaseKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  const configured =
    /^https?:\/\//.test(supabaseUrl) &&
    supabaseKey.length > 20 &&
    supabaseKey !== 'dummy-key';
  return { supabaseUrl, supabaseKey, configured };
}

module.exports = { loadElectronEnv, getSupabaseConfig };
