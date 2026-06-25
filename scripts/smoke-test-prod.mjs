#!/usr/bin/env node
/** Production / staging smoke test after cutover */
const PROD = process.env.SMOKE_URL || 'https://floxync.com';

async function main() {
  console.log('=== smoke test:', PROD, '===\n');

  const envR = await fetch(`${PROD}/api/check-env`, { signal: AbortSignal.timeout(20000) });
  const envJ = await envR.json();
  console.log('check-env:', envJ);

  const loginR = await fetch(`${PROD}/login`, { signal: AbortSignal.timeout(20000) });
  console.log('login page:', loginR.status, loginR.headers.get('server'));

  // Detect Supabase project from a few static chunks
  const html = await loginR.text();
  const chunks = [...html.matchAll(/\/_next\/static\/chunks\/[^"]+\.js/g)].slice(0, 15).map((m) => m[0]);
  let ref = null;
  for (const c of chunks) {
    try {
      const js = await (await fetch(`${PROD}${c}`, { signal: AbortSignal.timeout(15000) })).text();
      if (js.includes('ubroyskoxaixstgaralk')) { ref = 'TARGET (ubroyskoxaixstgaralk)'; break; }
      if (js.includes('mheqfhiyfsgnsglvxdrn')) { ref = 'SOURCE (mheqfhiyfsgnsglvxdrn)'; break; }
    } catch { /* skip */ }
  }
  console.log('detected Supabase ref in bundles:', ref ?? 'not found in first chunks');

  if (ref?.startsWith('TARGET')) {
    console.log('\nSmoke: production appears on TARGET Supabase');
  } else if (ref?.startsWith('SOURCE')) {
    console.log('\nSmoke: production still on SOURCE — Vercel env swap needed on domain owner account');
  } else {
    console.log('\nSmoke: could not detect ref — verify login manually');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
