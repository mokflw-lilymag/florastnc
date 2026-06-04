const http = require('http');
const path = require('path');
const { getInstalledPrinterNames, sortPrinterNamesForUi } = require('./printerNames');
const { getSupabaseConfig } = require('./loadEnv');
const { createClient } = require('@supabase/supabase-js');
const { generateHtmlReceipt } = require('./printEngine');
const { executeReceiptPrint } = require('./receiptPrint');
const { app } = require('electron');

function createBridgeServer(port = 8004) {
  let tenantId = null;
  let pollInterval = null;
  let isPolling = false;

  const { supabaseUrl, supabaseKey, configured } = getSupabaseConfig();
  let supabase = null;
  if (configured) {
    try {
      const WebSocket = require('ws');
      supabase = createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: false },
        realtime: { transport: WebSocket }
      });
    } catch (e) {
      supabase = createClient(supabaseUrl, supabaseKey);
    }
  }

  const bridgeAssetsPath = app.isPackaged 
    ? path.join(process.resourcesPath, 'bridge-assets') 
    : path.join(__dirname, '..', 'bridge-assets');

  const startPolling = () => {
    if (!supabase || !tenantId) return;
    if (pollInterval) clearInterval(pollInterval);
    
    pollInterval = setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        const { data: pendingJobs, error: fetchError } = await supabase
          .from('print_jobs')
          .select('*')
          .eq('status', 'pending')
          .eq('tenant_id', tenantId);

        if (fetchError || !pendingJobs || pendingJobs.length === 0) {
          isPolling = false;
          return;
        }

        for (const job of pendingJobs) {
          await supabase.from('print_jobs').update({ status: 'processing' }).eq('id', job.id);
          
          try {
            // Get settings
            const { data: settingsRow } = await supabase
              .from('system_settings')
              .select('data')
              .eq('id', `settings_${tenantId}`)
              .single();
              
            const settings = settingsRow ? settingsRow.data : {};
            
            // Normalize job
            const normalizedJob = { ...job };
            if (typeof normalizedJob.data === 'string') {
              try { normalizedJob.data = JSON.parse(normalizedJob.data); } catch(_) {}
            }
            if (!normalizedJob.data && typeof normalizedJob.payload === 'string') {
               try { normalizedJob.data = JSON.parse(normalizedJob.payload); } catch(_) {}
            }
            
            const htmlStr = generateHtmlReceipt(
              normalizedJob,
              settings,
              bridgeAssetsPath,
              '',
              ''
            );
            
            await executeReceiptPrint(normalizedJob, settings, htmlStr);
            await supabase.from('print_jobs').update({ status: 'completed' }).eq('id', job.id);
            
          } catch (jobErr) {
            console.error(`[Bridge] Job ${job.id} failed:`, jobErr);
            await supabase.from('print_jobs').update({ status: 'failed', error_log: jobErr.message }).eq('id', job.id);
          }
        }
      } catch (err) {
        console.error('[Bridge] Polling error:', err);
      } finally {
        isPolling = false;
      }
    }, 5000);
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
