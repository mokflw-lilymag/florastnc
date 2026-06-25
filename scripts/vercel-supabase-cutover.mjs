#!/usr/bin/env node
/**
 * Vercel Supabase env backup + swap + redeploy
 * Uses local Vercel CLI auth token (not committed).
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const authPath = path.join(os.homedir(), 'AppData', 'Roaming', 'com.vercel.cli', 'Data', 'auth.json');
const token = JSON.parse(fs.readFileSync(authPath, 'utf8')).token;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const migrationEnv = fs.readFileSync(path.join(ROOT, '.env.migration.local'), 'utf8');
const g = (k) => migrationEnv.match(new RegExp(`^${k}=(.+)$`, 'm'))?.[1]?.trim();

const TARGET = {
  NEXT_PUBLIC_SUPABASE_URL: g('TARGET_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: g('TARGET_ANON_KEY'),
  SUPABASE_SERVICE_ROLE_KEY: g('TARGET_SERVICE_ROLE_KEY'),
};
const SOURCE = {
  NEXT_PUBLIC_SUPABASE_URL: g('SOURCE_SUPABASE_URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: '', // not in migration file — filled from Vercel pull
  SUPABASE_SERVICE_ROLE_KEY: g('SOURCE_SERVICE_ROLE_KEY'),
};

const SUPABASE_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY'];

async function api(url, opts = {}) {
  const r = await fetch(url, { ...opts, headers: { ...headers, ...opts.headers } });
  const text = await r.text();
  let body;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!r.ok) throw new Error(`${r.status} ${url}: ${typeof body === 'string' ? body : JSON.stringify(body).slice(0, 500)}`);
  return body;
}

async function findProductionProject() {
  if (process.env.VERCEL_PROJECT_ID) {
    return {
      projectId: process.env.VERCEL_PROJECT_ID,
      projectName: process.env.VERCEL_PROJECT_NAME || 'override',
      teamId: process.env.VERCEL_TEAM_ID || null,
      domains: [],
    };
  }

  const teams = await api('https://api.vercel.com/v2/teams?limit=20');
  const teamIds = ['', ...(teams.teams || []).map((t) => t.id)];

  for (const teamId of teamIds) {
    const q = teamId ? `?teamId=${teamId}&limit=50` : '?limit=50';
    const { projects } = await api(`https://api.vercel.com/v9/projects${q}`);
    for (const p of projects || []) {
      try {
        const domains = await api(`https://api.vercel.com/v9/projects/${p.id}/domains${teamId ? `?teamId=${teamId}` : ''}`);
        const names = (domains.domains || []).map((d) => d.name);
        if (names.includes('floxync.com') || names.includes('www.floxync.com')) {
          return { projectId: p.id, projectName: p.name, teamId: teamId || null, domains: names };
        }
      } catch { /* skip */ }
    }
  }

  // fallback: project serving floxync.com via domain config API
  try {
    const cfg = await api('https://api.vercel.com/v6/domains/floxync.com/config');
    if (cfg.projectId) {
      return { projectId: cfg.projectId, projectName: cfg.name || 'unknown', teamId: cfg.teamId || null, domains: ['floxync.com'] };
    }
  } catch { /* ignore */ }

  throw new Error('Could not find Vercel project for floxync.com');
}

async function listEnv(projectId, teamId) {
  const q = teamId ? `?teamId=${teamId}` : '';
  return api(`https://api.vercel.com/v10/projects/${projectId}/env${q}`);
}

async function upsertEnv(projectId, teamId, key, value, environments = ['production', 'preview', 'development']) {
  const q = teamId ? `?teamId=${teamId}` : '';
  const existing = await listEnv(projectId, teamId);
  const found = (existing.envs || []).find((e) => e.key === key);

  if (found) {
    await api(`https://api.vercel.com/v1/projects/${projectId}/env/${found.id}${q}`, {
      method: 'PATCH',
      body: JSON.stringify({ value, target: environments, type: found.type || 'encrypted' }),
    });
    return 'updated';
  }

  await api(`https://api.vercel.com/v10/projects/${projectId}/env${q}`, {
    method: 'POST',
    body: JSON.stringify({ key, value, type: 'encrypted', target: environments }),
  });
  return 'created';
}

async function redeploy(projectId, teamId) {
  const q = teamId ? `?teamId=${teamId}` : '';
  const deployments = await api(`https://api.vercel.com/v6/deployments${q}&projectId=${projectId}&limit=1&target=production`);
  const dep = deployments.deployments?.[0];
  if (!dep?.uid) throw new Error('No production deployment found to redeploy');

  return api(`https://api.vercel.com/v13/deployments${q}`, {
    method: 'POST',
    body: JSON.stringify({
      name: dep.name,
      deploymentId: dep.uid,
      target: 'production',
    }),
  });
}

const cmd = process.argv[2] || 'backup';

if (cmd === 'backup') {
  const proj = await findProductionProject();
  console.log('Project:', proj.projectName, proj.projectId, proj.domains.join(', '));
  const envs = await listEnv(proj.projectId, proj.teamId);
  const backupDir = path.join(__dirname, 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const out = { project: proj, backedUpAt: new Date().toISOString(), vars: {} };
  for (const key of SUPABASE_KEYS) {
    const e = (envs.envs || []).find((x) => x.key === key);
    out.vars[key] = e ? { id: e.id, target: e.target, type: e.type, value: e.value ?? '(encrypted — pull via dashboard if needed)' } : null;
  }
  const file = path.join(backupDir, `vercel_supabase_env_backup_${stamp}.json`);
  fs.writeFileSync(file, JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(backupDir, '_latest_vercel_backup.json'), JSON.stringify(out, null, 2));
  console.log('Backup saved:', file);
  for (const key of SUPABASE_KEYS) {
    const v = out.vars[key]?.value;
    const preview = typeof v === 'string' && v.startsWith('http') ? v : (typeof v === 'string' ? v.slice(0, 20) + '...' : v);
    console.log(`  ${key}:`, preview ?? 'MISSING');
  }
} else if (cmd === 'swap') {
  const proj = await findProductionProject();
  console.log('Swapping env on', proj.projectName);
  for (const key of SUPABASE_KEYS) {
    const r = await upsertEnv(proj.projectId, proj.teamId, key, TARGET[key]);
    console.log(`  ${key}: ${r}`);
  }
  console.log('Done. Run: node scripts/vercel-supabase-cutover.mjs redeploy');
} else if (cmd === 'redeploy') {
  const proj = await findProductionProject();
  console.log('Redeploying production for', proj.projectName);
  const d = await redeploy(proj.projectId, proj.teamId);
  console.log('Deployment:', d.url || d.id || JSON.stringify(d).slice(0, 200));
} else if (cmd === 'status') {
  const proj = await findProductionProject();
  const envs = await listEnv(proj.projectId, proj.teamId);
  console.log('Project:', proj.projectName);
  for (const key of SUPABASE_KEYS) {
    const e = (envs.envs || []).find((x) => x.key === key);
    const v = e?.value ?? 'MISSING';
    console.log(key + ':', typeof v === 'string' && v.includes('supabase.co') ? v : (v === 'MISSING' ? v : '(set)'));
  }
} else {
  console.error('Usage: backup | swap | redeploy | status');
  process.exit(1);
}
