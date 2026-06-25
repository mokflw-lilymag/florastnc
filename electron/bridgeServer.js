const http = require('http');
const path = require('path');
const { getInstalledPrinterNames, sortPrinterNamesForUi } = require('./printerNames');
const { getSupabaseConfig } = require('./loadEnv');
const { createClient } = require('@supabase/supabase-js');
const { generateHtmlReceipt } = require('./printEngine');
const { printReceiptHtml: executeReceiptPrint } = require('./receiptPrint');
const { app } = require('electron');

const POLL_INTERVAL_MS = 12_000;
const MAX_JOBS_PER_POLL = 2;
const MAX_JOB_AGE_MS = 4 * 60 * 60 * 1000;

function createBridgeServer(port = 8004) {
  let tenantId = null;
  let pollTimer = null;
  let isPolling = false;
  const failedStaleIds = new Set();

  const { supabaseUrl, supabaseKey, configured } = getSupabaseConfig();
  let supabase = null;
  if (configured) {
    try {
      const WebSocket = require('ws');
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
        realtime: { transport: WebSocket },
      });
    } catch (e) {
      supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  const bridgeAssetsPath = app.isPackaged
    ? path.join(process.resourcesPath, 'bridge-assets')
    : path.join(__dirname, '..', 'bridge-assets');

  const processJob = async (job) => {
    const { data: locked } = await supabase
      .from('print_jobs')
      .update({ status: 'processing' })
      .eq('id', job.id)
      .eq('status', 'pending')
      .select('id');
    if (!locked?.length) return;

    try {
      const { data: settingsRow } = await supabase
        .from('system_settings')
        .select('data')
        .eq('id', `settings_${tenantId}`)
        .single();

      const settings = settingsRow ? settingsRow.data : {};
      const normalizedJob = { ...job };
      if (typeof normalizedJob.data === 'string') {
        try { normalizedJob.data = JSON.parse(normalizedJob.data); } catch (_) {}
      }
      if (!normalizedJob.data && typeof normalizedJob.payload === 'string') {
        try { normalizedJob.data = JSON.parse(normalizedJob.payload); } catch (_) {}
      }

      const htmlStr = generateHtmlReceipt(normalizedJob, settings, bridgeAssetsPath, '', '');
      const printerName = settings.printerName || settings.posPrinterName || '';
      if (!printerName) {
        throw new Error(
          `프린터 이름이 설정되지 않았습니다. 웹 설정(환경설정 → 프린터)에서 프린터를 선택해주세요. (tenant: ${tenantId})`
        );
      }
      console.log(`[Bridge] Job ${job.id} | type=${normalizedJob.job_type} | printer=${printerName}`);
      await executeReceiptPrint(htmlStr, printerName, {
        appIsPackaged: app.isPackaged,
        resourcesPath: process.resourcesPath,
        logFn: (msg) => console.log(`[Bridge][Print] ${msg}`),
        receiptPrinterType: normalizedJob.job_type || 'pos',
      });
      await supabase.from('print_jobs').update({ status: 'completed' }).eq('id', job.id);
    } catch (jobErr) {
      console.error(`[Bridge] Job ${job.id} failed:`, jobErr);
      await supabase
        .from('print_jobs')
        .update({ status: 'failed', error_message: jobErr.message })
        .eq('id', job.id);
    }
  };

  const pollOnce = async () => {
    if (!supabase || !tenantId || isPolling) return;
    isPolling = true;
    try {
      const { data: pendingJobs, error: fetchError } = await supabase
        .from('print_jobs')
        .select('*')
        .eq('status', 'pending')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: true })
        .limit(50);

      if (fetchError || !pendingJobs?.length) return;

      const cutoff = Date.now() - MAX_JOB_AGE_MS;
      const staleJobs = pendingJobs.filter((j) => {
        const created = j.created_at ? new Date(j.created_at).getTime() : 0;
        return created < cutoff && !failedStaleIds.has(j.id);
      });
      if (staleJobs.length) {
        const staleIds = staleJobs.map((j) => j.id);
        const { error } = await supabase.from('print_jobs').delete().in('id', staleIds);
        if (error) staleIds.forEach((id) => failedStaleIds.add(id));
      }

      const fresh = pendingJobs.filter((j) => {
        const created = j.created_at ? new Date(j.created_at).getTime() : 0;
        return created >= cutoff;
      });

      for (const job of fresh.slice(0, MAX_JOBS_PER_POLL)) {
        await processJob(job);
      }
    } catch (err) {
      console.error('[Bridge] Polling error:', err);
    } finally {
      isPolling = false;
    }
  };

  const startPolling = () => {
    if (!supabase || !tenantId) return;
    if (pollTimer) clearInterval(pollTimer);
    void pollOnce();
    pollTimer = setInterval(() => void pollOnce(), POLL_INTERVAL_MS);
  };

  const server = http.createServer(async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }

    const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);

    if (url.pathname === '/api/version') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ version: '1.0.0', status: 'ok', hasSupabase: !!supabase }));
    }

    if (url.pathname === '/set_tenant') {
      const newTenantId = url.searchParams.get('id');
      if (newTenantId && newTenantId !== tenantId) {
        tenantId = newTenantId;
        console.log('[Bridge] Tenant set to:', tenantId);
        startPolling();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, tenantId }));
    }

    if (url.pathname === '/printers') {
      try {
        const names = await getInstalledPrinterNames();
        const sorted = sortPrinterNamesForUi ? sortPrinterNamesForUi(names) : names;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ printers: sorted }));
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ error: e.message }));
      }
    }

    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not Found' }));
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`[Bridge] Embedded Server listening on http://127.0.0.1:${port}`);
  });

  server.on('error', (err) => {
    console.log(`[Bridge] Port ${port} listen error:`, err.message);
  });

  return server;
}

module.exports = { createBridgeServer };
