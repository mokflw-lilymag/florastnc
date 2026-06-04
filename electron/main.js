const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, globalShortcut, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFile } = require('child_process');
const { exec, spawn } = require('child_process');
const { loadElectronEnv } = require('./loadEnv');
const { getSyncState } = require('./syncState');

const { initLocalDb } = require('./database/initDb');
const { SyncWorker } = require('./sync/syncWorker');

let syncWorker = null;
let localDb = null;
let mainWindow = null;
let tray = null;
const isDev = !app.isPackaged;

function resolveAppIconPath() {
  const candidates = isDev
    ? [
        path.join(__dirname, '..', 'build', 'icon.ico'),
        path.join(__dirname, '..', 'public', 'favicon.ico'),
      ]
    : [
        path.join(process.resourcesPath, 'app-icon.ico'),
        path.join(process.resourcesPath, 'favicon.ico'),
      ];
  return candidates.find((p) => fs.existsSync(p)) || null;
}

const EMBEDDED_PORT = 9003;
let embeddedServerProcess = null;
let embeddedServerStartPromise = null;

function getStandaloneServerPath() {
  const fromResources = path.join(process.resourcesPath, 'next-standalone', 'server.js');
  if (fs.existsSync(fromResources)) return fromResources;
  // 이전 설치본 호환
  return path.join(process.resourcesPath, 'app.asar.unpacked', '.next', 'standalone', 'server.js');
}

function getStandaloneServerCwd() {
  return path.dirname(getStandaloneServerPath());
}

function appendEmbeddedServerLog(line) {
  try {
    const p = path.join(app.getPath('userData'), 'embedded-server.log');
    fs.appendFileSync(p, `[${new Date().toISOString()}] ${line}\n`);
  } catch (_) {}
}

function stopEmbeddedServer() {
  if (embeddedServerProcess && !embeddedServerProcess.killed) {
    try {
      embeddedServerProcess.kill();
    } catch (_) {}
  }
  embeddedServerProcess = null;
  embeddedServerStartPromise = null;
}

function startEmbeddedServer() {
  if (embeddedServerStartPromise) return embeddedServerStartPromise;

  embeddedServerStartPromise = new Promise((resolve, reject) => {
    stopEmbeddedServer();
    const serverPath = getStandaloneServerPath();
    if (!fs.existsSync(serverPath)) {
      embeddedServerStartPromise = null;
      reject(new Error(`내장 서버 파일이 없습니다.\n${serverPath}`));
      return;
    }

    appendEmbeddedServerLog(`spawn ${serverPath}`);
    let logFd = 'ignore';
    try {
      logFd = fs.openSync(path.join(app.getPath('userData'), 'embedded-server.log'), 'a');
    } catch (_) {}

    const serverCwd = getStandaloneServerCwd();
    const staticChunks = path.join(serverCwd, '.next', 'static', 'chunks');
    if (!fs.existsSync(staticChunks)) {
      appendEmbeddedServerLog(`WARN missing static chunks: ${staticChunks}`);
    } else {
      appendEmbeddedServerLog(`static chunks OK (${fs.readdirSync(staticChunks).length} files)`);
    }

    embeddedServerProcess = spawn(process.execPath, [serverPath], {
      cwd: serverCwd,
      env: {
        ...process.env,
        ELECTRON_RUN_AS_NODE: '1',
        PORT: String(EMBEDDED_PORT),
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
      },
      stdio: ['ignore', logFd, logFd],
      windowsHide: true,
    });

    embeddedServerProcess.on('error', (err) => {
      appendEmbeddedServerLog(`spawn error: ${err.message}`);
      embeddedServerStartPromise = null;
      reject(err);
    });
    embeddedServerProcess.on('exit', (code) => {
      appendEmbeddedServerLog(`exit code=${code}`);
      if (code !== 0 && code !== null) embeddedServerStartPromise = null;
    });

    setTimeout(() => resolve(), 300);
  });

  return embeddedServerStartPromise;
}

function waitForEmbeddedServer(maxMs = 90000) {
  const deadline = Date.now() + maxMs;
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (Date.now() > deadline) {
        reject(
          new Error(
            '내장 서버가 응답하지 않습니다. Floxync를 완전 종료 후 다시 실행하거나, 다른 프로그램이 9003 포트를 쓰는지 확인하세요.'
          )
        );
        return;
      }
      const http = require('http');
      const req = http.get(`http://127.0.0.1:${EMBEDDED_PORT}/`, { timeout: 4000 }, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) resolve();
        else setTimeout(poll, 800);
      });
      req.on('error', () => setTimeout(poll, 800));
      req.on('timeout', () => {
        req.destroy();
        setTimeout(poll, 800);
      });
    };
    poll();
  });
}

function showLoadErrorPage(errMsg) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const esc = String(errMsg)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const logHint = path.join(app.getPath('userData'), 'embedded-server.log');
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Floxync</title>
<style>body{font-family:"Malgun Gothic",sans-serif;padding:2rem;max-width:560px;line-height:1.65}
button{padding:10px 20px;font-size:15px;cursor:pointer;margin:8px 8px 0 0}</style></head><body>
<h2>화면을 불러오지 못했습니다</h2><p>${esc}</p>
<p><b>해결 방법</b></p><ol>
<li>트레이 아이콘 우클릭 → <b>화면 새로고침</b> (또는 F5)</li>
<li>안 되면 <b>완전 종료</b> 후 앱 다시 실행</li>
<li>작업 관리자에서 Floxync / node 가 남아 있으면 종료</li>
</ol>
<p style="font-size:12px;color:#555">로그: ${logHint}</p>
<button type="button" onclick="location.href='http://127.0.0.1:${EMBEDDED_PORT}/'">다시 연결</button>
<p style="font-size:12px">서버 재시작은 F5 또는 트레이 → 화면 새로고침</p>
</body></html>`;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

async function loadPackagedUi() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  try {
    await startEmbeddedServer();
    await waitForEmbeddedServer();
    await mainWindow.loadURL(`http://127.0.0.1:${EMBEDDED_PORT}/login`);
    appendEmbeddedServerLog('UI loadURL OK');
  } catch (e) {
    console.error('[EmbeddedServer]', e.message);
    appendEmbeddedServerLog(`UI load fail: ${e.message}`);
    showLoadErrorPage(e.message);
  }
}

function reloadPackagedUi() {
  embeddedServerStartPromise = null;
  stopEmbeddedServer();
  return loadPackagedUi();
}

function getPrintLogPath() {
  return path.join(app.getPath('userData'), 'print.log');
}

/** 포트를 LISTEN 중인 프로세스 종료 (외부 브릿지 8002/8004) */
function killProcessOnPort(port) {
  const ps = [
    `$conns = Get-NetTCPConnection -LocalPort ${port} -State Listen -ErrorAction SilentlyContinue`,
    `if ($conns) { $conns | Where-Object { $_.OwningProcess -ne ${process.pid} } | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue } }`,
  ].join('; ');
  exec(
    `powershell -NoProfile -ExecutionPolicy Bypass -Command "${ps}"`,
    { windowsHide: true },
    (err) => {
      if (err) {
        console.log(`[Bridge] port ${port}: no listener or kill skipped`, err.message);
      } else {
        console.log(`[Bridge] port ${port}: external listener stopped`);
      }
    }
  );
}

function stopExternalBridge() {
  console.log('[Bridge] Stopping external PP (8004)...');
  killProcessOnPort(8004);
}

/** @param {{ force?: boolean }} [options] force=true: 창만 닫고 트레이에 남을 때도 웹 브릿지 복구 */
function restoreExternalBridge(options = {}) {
  if (!options.force && !app.isQuiting) {
    console.log('[Bridge] Skip restore — Electron app still running');
    return;
  }
  console.log('[Bridge] Restoring external PP bridge for web browser use...');

  const ppVbs = path.join(app.getPath('appData'), 'floxyncBridge', 'ppbridge.vbs');
  if (fs.existsSync(ppVbs)) {
    exec(`wscript.exe "${ppVbs}"`, { windowsHide: true }, (err) => {
      if (err) console.log('[Bridge] PP (8004) start failed:', err.message);
      else console.log('[Bridge] PP bridge (8004) started via ppbridge.vbs');
    });
  } else {
    console.log('[Bridge] ppbridge.vbs not found:', ppVbs);
  }
  
  // 리본 브릿지(8002)는 윈도우앱 켜질 때 끄지 않으므로, 닫을 때 다시 살릴 필요가 없습니다.
}

// Set auto-start on boot for Windows
if (!isDev) {
  app.setLoginItemSettings({
    openAtLogin: true,
    path: app.getPath('exe'),
  });
}

// [Phase 5] Legacy Bridge Daemons removed.

function createTray() {
  const iconPath = resolveAppIconPath();

  try {
    tray = iconPath ? new Tray(iconPath) : new Tray(nativeImage.createEmpty());
  } catch (e) {
    // Fallback if no icon
    const icon = nativeImage.createEmpty();
    tray = new Tray(icon);
  }
  
  const contextMenu = Menu.buildFromTemplate([
    { label: '릴리맥 ERP 열기', click: () => showMainWindow() },
    {
      label: '화면 새로고침',
      click: () => {
        if (!isDev && mainWindow && !mainWindow.isDestroyed()) reloadPackagedUi();
        else if (mainWindow && !mainWindow.isDestroyed()) mainWindow.reload();
      },
    },
    { type: 'separator' },
    { label: '완전 종료', click: () => { 
        app.isQuiting = true;
        app.quit(); 
      } 
    }
  ]);
  
  tray.setToolTip('Floxync 백그라운드 인쇄 서버');
  tray.setContextMenu(contextMenu);
  
  tray.on('double-click', () => showMainWindow());
}

/** ERP 창을 열 때는 외부 8002/8004 끔 → Electron 인쇄·충돌 방지 */
function showMainWindow() {
  stopExternalBridge();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
  }
}

function createWindow() {
  const iconPath = resolveAppIconPath();
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'Floxync',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0A0F0D',
      symbolColor: '#ffffff',
      height: 40
    },
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type === 'keyDown' && input.key === 'F12') {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
    if (input.type === 'keyDown' && input.key === 'F5') {
      event.preventDefault();
      if (isDev) mainWindow.reload();
      else reloadPackagedUi();
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (isDev || !validatedURL || validatedURL.startsWith('data:')) return;
    if (errorCode === -3) return;
    appendEmbeddedServerLog(`did-fail-load ${errorCode} ${errorDescription} ${validatedURL}`);
    showLoadErrorPage(`${errorDescription} (${errorCode})`);
  });

  mainWindow.setMenu(null);

  // X = 트레이로 숨김 + 웹용 PP/Ribbon 브릿지(8004/8002) 다시 켬
  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      restoreExternalBridge({ force: true });
      mainWindow.hide();
    }
    return false;
  });

  // 새 창(target="_blank")이 열릴 때도 preload.js를 주입하여 native(electron) 브릿지 연동이 되게 함
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false
        }
      }
    };
  });

  if (isDev) {
    const devPath = process.env.ELECTRON_DEV_PATH || '/login';
    mainWindow.loadURL(`http://localhost:3000${devPath}`);
    // mainWindow.webContents.openDevTools(); // 주석 처리하여 자동으로 뜨지 않게 함
  } else {
    loadPackagedUi();
  }
}

// Single instance lock for tray app
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      showMainWindow();
    }
  });

  app.whenReady().then(() => {
    loadElectronEnv(app.getPath('userData'));

    // 로컬 DB 및 SyncWorker 초기화
    try {
      const dbPath = path.join(app.getPath('userData'), 'floxync_local.db');
      localDb = initLocalDb(dbPath);
      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xxx.supabase.co';
      const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'xxx';
      syncWorker = new SyncWorker(localDb, sbUrl, sbAnon);
      console.log('Local DB & SyncWorker initialized.');
    } catch (err) {
      console.error('Failed to init Local DB:', err);
    }

    try {
      const { ensureWebBridgesOnFirstRun } = require('./ensureBridges');
      ensureWebBridgesOnFirstRun();
    } catch (e) {
      console.log('[Bridge] ensureWebBridgesOnFirstRun skipped:', e.message);
    }

    stopExternalBridge();
    
    // 내장 8004 브릿지 서버 시작
    try {
      const { createBridgeServer } = require('./bridgeServer');
      createBridgeServer(8004);
    } catch (e) {
      console.log('[Bridge] createBridgeServer failed:', e.message);
    }

    createWindow();
    
    createTray();

    // Auto Updater 설정
    if (!isDev) {
      autoUpdater.checkForUpdatesAndNotify().catch(e => {
        console.log('[AutoUpdater] checkForUpdatesAndNotify failed:', e.message);
      });
      
      autoUpdater.on('update-downloaded', (info) => {
        console.log('[AutoUpdater] update-downloaded', info);
        // 다운로드 완료 시, 다이얼로그로 업데이트 설치 여부 묻기
        dialog.showMessageBox({
          type: 'info',
          title: '업데이트 가능',
          message: '새로운 버전이 다운로드되었습니다. 지금 재시작하여 업데이트하시겠습니까?',
          buttons: ['지금 재시작', '나중에 (앱 종료 시)']
        }).then((result) => {
          if (result.response === 0) {
            autoUpdater.quitAndInstall();
          }
        });
      });
    }

    app.on('activate', function () {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
      else showMainWindow();
    });
    
    app.on('browser-window-created', (event, window) => {
      window.webContents.on('before-input-event', (event, input) => {
        if (input.type === 'keyDown' && input.key === 'F12') {
          window.webContents.toggleDevTools();
          event.preventDefault();
        }
        if (input.type === 'keyDown' && input.key === 'F5') {
          event.preventDefault();
          if (isDev) window.reload();
          else reloadPackagedUi();
        }
      });
    });
  });
}

ipcMain.handle('get-local-sync-status', () => getSyncState());

app.on('will-quit', () => {
  stopEmbeddedServer();
  restoreExternalBridge({ force: true });
});

app.on('window-all-closed', function () {
  // 트레이로 숨길 때는 앱이 계속 실행 중 — 외부 브릿지는 복구하지 않음
  if (process.platform !== 'darwin') {
    // app.quit();
  }
});

ipcMain.handle('ping', async () => ({ ok: true, packaged: app.isPackaged }));

ipcMain.handle('get-print-log', async () => {
  const logPath = getPrintLogPath();
  const userData = app.getPath('userData');
  try {
    if (!fs.existsSync(logPath)) {
      return { path: logPath, userData, content: '(아직 인쇄 로그 없음)' };
    }
    const content = fs.readFileSync(logPath, 'utf8');
    const lines = content.split('\n');
    return { path: logPath, userData, content: lines.slice(-40).join('\n') };
  } catch (e) {
    return { path: logPath, userData, content: `로그 읽기 실패: ${e.message}` };
  }
});

ipcMain.handle('open-print-log-folder', async () => {
  const { shell } = require('electron');
  await shell.openPath(app.getPath('userData'));
  return { path: getPrintLogPath() };
});

ipcMain.handle('get-bridge-assets-path', async () => {
  const exists = fs.existsSync(bridgeAssetsPath);
  const templates = ['receipt-pickup.html', 'receipt-delivery-shop.html', 'receipt-delivery-driver.html'];
  const missing = templates.filter((t) => !fs.existsSync(path.join(bridgeAssetsPath, t)));
  return { path: bridgeAssetsPath, exists, missing };
});

const {
  getInstalledPrinterNames,
  sortPrinterNamesForUi,
} = require('./printerNames');

// IPC: Get Printers (Use native Electron API first to avoid encoding issues, fallback to PS)
ipcMain.handle('get-printers', async (event) => {
  try {
    if (event.sender && typeof event.sender.getPrintersAsync === 'function') {
      const printers = await event.sender.getPrintersAsync();
      const names = printers.map(p => p.name || p.displayName).filter(Boolean);
      // If any name is garbled (contains ), fallback to PowerShell
      if (!names.some(n => n.includes(''))) {
        return sortPrinterNamesForUi(names);
      }
    }
  } catch (err) {
    console.error('getPrintersAsync failed:', err);
  }
  
  const names = await getInstalledPrinterNames();
  return sortPrinterNamesForUi(names);
});

const { generateHtmlReceipt } = require('./printEngine');
const { printReceiptHtml } = require('./receiptPrint');

const bridgeAssetsPath = app.isPackaged 
  ? path.join(process.resourcesPath, 'bridge-assets') 
  : path.join(__dirname, '..', 'bridge-assets');

function appendPrintLog(msg) {
  try {
    fs.appendFileSync(getPrintLogPath(), `${new Date().toISOString()} ${msg}\n`);
  } catch (_) {}
}

function injectReceiptPrintStyles(html) {
  return String(html || '').replace(
    '</head>',
    '<style>@page{size:80mm auto;margin:0} html,body{margin:0;padding:0;background:#fff;color:#000;-webkit-print-color-adjust:exact;print-color-adjust:exact}</style></head>'
  );
}

function normalizePrintJob(job) {
  if (!job) return job;
  const normalized = { ...job };
  if (typeof normalized.payload === 'string') {
    try {
      normalized.payload = JSON.parse(normalized.payload);
    } catch (_) {
      normalized.payload = {};
    }
  }
  if (normalized.payload && normalized.order_id && !normalized.payload.orderId) {
    normalized.payload.orderId = normalized.order_id;
  }
  return normalized;
}

function resolveTargetPrinter(settings, job) {
  const posPrinter = settings?.printerName;
  const labelPrinter = settings?.labelPrinterName || posPrinter;
  if (job?.printer_type === 'ribbon') {
    return settings?.ribbonPrinterName || posPrinter;
  }
  // 지점 정책: POS 또는 라벨 중 하나만 활성 → job 종류와 무관하게 선택된 한 대로 출력
  if (settings?.receiptPrinterType === 'label') {
    return labelPrinter || posPrinter;
  }
  return posPrinter || labelPrinter;
}

/** Windows 중복 큐 "(1 복사)" / "(복사 1)" / "(1 COM…)" → 기본 이름 */
function normalizePrinterBase(name) {
  return String(name || '')
    .trim()
    .replace(/\s*\(\s*복사\s*\d+\s*\)\s*$/i, '')
    .replace(/\s*\(\s*\d+\s*복사\s*\)\s*$/i, '')
    .replace(/\s*\(\d+[^)]*\)\s*$/i, '')
    .trim();
}

/** 동일 드라이버의 포트 접미사 큐보다 짧은 기본 이름 우선 (Sumatra 실패 방지) */
function pickCanonicalPrinter(configured, installed) {
  const base = normalizePrinterBase(configured).toLowerCase();
  if (!base || !installed?.length) return null;
  const family = installed.filter(
    (n) => normalizePrinterBase(n).toLowerCase() === base
  );
  if (!family.length) return null;
  const withoutPort = family.filter(
    (n) => !/\(\s*\d+\s*복사\s*\)|\(\s*복사\s*\d+\s*\)|\(\d/i.test(n)
  );
  const pool = withoutPort.length ? withoutPort : family;
  return pool.sort((a, b) => a.length - b.length)[0];
}

function isGarbledPrinterName(name) {
  return /\uFFFD/.test(name) || // replacement char
    /[\x00-\x08\x0e-\x1f]/.test(name);
}

function matchInstalledPrinter(configured, installed) {
  if (!configured) return null;
  const trimmed = String(configured).trim();
  if (!trimmed) return null;
  if (!installed?.length) return null;

  const lower = trimmed.toLowerCase();
  // 저장·선택한 이름이 목록에 있으면 복사 큐 포함 그대로 사용
  const exactCi = installed.find((n) => n.toLowerCase() === lower);
  if (exactCi) return exactCi;
  if (installed.includes(trimmed)) return trimmed;

  if (isGarbledPrinterName(trimmed)) {
    const fixed = pickCanonicalPrinter(trimmed, installed);
    if (fixed) return fixed;
  }

  // 짧은 Windows 드라이버명(포스뱅크 A6S 등)은 부분 문자열 매칭 금지 — "A6S" ⊂ "SAM4S" 오매칭 방지
  if (trimmed.length < 8) return null;

  const fuzzy = installed.filter((n) => {
    const nl = n.toLowerCase();
    return nl.includes(lower) || lower.includes(nl);
  });

  if (fuzzy.length === 1) return fuzzy[0];
  if (fuzzy.length > 1) {
    const exactInFuzzy = fuzzy.find((n) => n.toLowerCase() === lower);
    if (exactInFuzzy) return exactInFuzzy;
    return null;
  }

  // 목록에 없을 때만 동일 드라이버의 기본(짧은) 이름으로 폴백
  const canonical = pickCanonicalPrinter(trimmed, installed);
  if (canonical) return canonical;

  return null;
}

async function printHtmlToDevice(html, configuredPrinter, opts = {}) {
  const receiptPrinterType = opts.receiptPrinterType || 'pos';
  if (!html || html.length < 80) {
    throw new Error(
      `영수증 HTML이 비어 있습니다. 템플릿 경로를 확인하세요: ${bridgeAssetsPath}`
    );
  }

  const tempPath = path.join(os.tmpdir(), `floxync_receipt_${Date.now()}.html`);
  fs.writeFileSync(tempPath, injectReceiptPrintStyles(html), 'utf8');

  const printWin = new BrowserWindow({
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  const cleanup = () => {
    if (!printWin.isDestroyed()) printWin.close();
    try {
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    } catch (_) {}
  };

  try {
    await printWin.loadFile(tempPath);
    await new Promise((r) => setTimeout(r, 2500));

    const installed = await getInstalledPrinterNames();
    let deviceName = matchInstalledPrinter(configuredPrinter, installed);
    if (!deviceName && installed.length > 0) {
      deviceName = installed[0];
      appendPrintLog(`WARN: configured "${configuredPrinter}" not found, using "${deviceName}"`);
    }
    if (!deviceName) {
      throw new Error(
        'Windows에 설치된 프린터가 없거나 이름을 찾을 수 없습니다. [지점 환경설정]에서 프린터를 다시 선택하세요.'
      );
    }

    appendPrintLog(
      `job print → device="${deviceName}" configured="${configuredPrinter}" installed=${installed.length}`
    );

    const printOptions = {
      silent: true,
      deviceName,
      margins: { marginType: 'none' },
      printBackground: true,
    };
    if (receiptPrinterType === 'label') {
      printOptions.pageSize = { width: 80000, height: 150000 };
    }

    await Promise.race([
      new Promise((resolve, reject) => {
        let settled = false;
        const done = (ok, reason) => {
          if (settled) return;
          settled = true;
          if (ok) resolve(true);
          else {
            reject(
              new Error(
                reason ||
                  `프린터 "${deviceName}" 인쇄 실패. 환경설정의 프린터 이름이 Windows [설정→프린터] 목록과 같은지 확인하세요.`
              )
            );
          }
        };

        try {
          const ret = printWin.webContents.print(printOptions, (success, failureReason) => {
            done(success, failureReason);
          });
          if (ret && typeof ret.then === 'function') {
            ret.then(() => done(true, null)).catch((e) => done(false, e?.message));
          }
        } catch (e) {
          done(false, e.message);
        }
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('인쇄 응답 시간 초과(20초). 프린터 전원·연결을 확인하세요.')), 20000)
      ),
    ]);
    await new Promise((r) => setTimeout(r, 3000));
  } finally {
    cleanup();
  }
}

// IPC: Print Job
ipcMain.handle('print-job', async (event, { job, settings, branchName }) => {
  const normalizedJob = normalizePrintJob(job);
  const configuredPrinter = resolveTargetPrinter(settings || {}, normalizedJob);

  if (!configuredPrinter) {
    const err = '설정된 프린터가 없습니다. [지점 환경설정]에서 POS/라벨 프린터를 선택해 주세요.';
    appendPrintLog(`FAIL: ${err}`);
    throw new Error(err);
  }

  const installed = await getInstalledPrinterNames();
  let targetPrinter = matchInstalledPrinter(configuredPrinter, installed);
  if (!targetPrinter && installed.length === 0) {
    appendPrintLog('WARN: 프린터 목록 조회 실패, 설정값 그대로 시도');
    targetPrinter = configuredPrinter;
  }
  if (!targetPrinter) {
    const sample = installed.slice(0, 8).join('\n• ');
    const err = sample
      ? `프린터 "${configuredPrinter}" 가 이 PC에 없습니다.\n\n[지점 환경설정]에서 아래 목록과 똑같이 선택·저장하세요:\n• ${sample}`
      : `프린터 "${configuredPrinter}" 를 찾을 수 없습니다. Windows 프린터 목록을 확인하세요.`;
    appendPrintLog(`FAIL: configured="${configuredPrinter}" installed=${installed.length}`);
    throw new Error(err);
  }
  if (targetPrinter !== configuredPrinter) {
    appendPrintLog(`WARN: matched "${configuredPrinter}" → "${targetPrinter}"`);
  }

  appendPrintLog(
    `ENGINE=v3 mode=${settings?.receiptPrinterType || 'pos'} configured="${configuredPrinter}" resolved="${targetPrinter}" job=${normalizedJob?.job_type}`
  );

  let html = '';
  if (normalizedJob?.printer_type === 'ribbon') {
    html = `
      <html><head><meta charset="UTF-8"></head><body style="margin:0; padding:0; text-align:center;">
        <div style="writing-mode: vertical-rl; text-orientation: upright; font-family: 'Malgun Gothic', sans-serif; font-size: 80px; width: 100px; height: 1800px; padding-top: 50px;">
          ${normalizedJob?.payload?.message?.content || '축하합니다'}
        </div>
      </body></html>
    `;
  } else {
    html = generateHtmlReceipt(
      normalizedJob,
      settings || {},
      bridgeAssetsPath,
      branchName || '',
      ''
    );
    if (settings?.receiptPrinterType === 'label') {
      // 80mm 용지: POS와 동일 폭 — 패딩 대칭 + 본문 블록 가운데 정렬
      html = html
        .replace(/padding:\s*8px\s+16px\s+8px\s+8px/gi, 'padding: 8px')
        .replace(/padding:\s*8px\s+2mm/gi, 'padding: 8px')
        .replace(
          '</head>',
          '<style>body{margin-left:auto!important;margin-right:auto!important;}</style></head>'
        )
        .replace(
          '</body>',
          '<div style="margin-top: 15px; border-top: 1px dashed #000; padding-top: 5px; text-align: center; font-size: 11px; color: #555;">✂ 절취선 ✂</div></body>'
        );
    }
  }

  // 설치본: Sumatra PDF는 “성공”인데 Xprinter에서 빈 출력되는 경우 → Chromium 직접 인쇄 우선
  if (app.isPackaged) {
    try {
      appendPrintLog('ENGINE=v4 native (Chromium → 프린터, Sumatra 생략)');
      await printHtmlToDevice(html, targetPrinter, {
        receiptPrinterType: settings?.receiptPrinterType || 'pos',
      });
      appendPrintLog(`OK native job_type=${normalizedJob?.job_type} printer=${targetPrinter}`);
      return { ok: true, printer: targetPrinter, engine: 'native' };
    } catch (nativeErr) {
      appendPrintLog(`native 실패: ${nativeErr.message} → Sumatra PDF 시도`);
    }
  }

  await printReceiptHtml(html, targetPrinter, {
    appIsPackaged: app.isPackaged,
    resourcesPath: process.resourcesPath,
    receiptPrinterType: settings?.receiptPrinterType || 'pos',
    logFn: (msg) => appendPrintLog(msg),
  });

  appendPrintLog(`OK sumatra job_type=${normalizedJob?.job_type} printer=${targetPrinter}`);
  return { ok: true, printer: targetPrinter, engine: 'sumatra' };
});

let printQueue = [];

setInterval(() => {
  const now = Date.now();
  printQueue = printQueue.filter(q => {
    if ((q.status === 'completed' || q.status === 'error') && now - q.timestampMs > 120000) {
      if (q.tempFiles) {
        q.tempFiles.forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });
      }
      return false;
    }
    return true;
  });
}, 60000);

ipcMain.handle('get-queue', () => {
  return printQueue.map(q => ({
    id: q.id,
    status: q.status,
    timestamp: q.timestamp,
    printer: q.printer,
    width: q.width,
    length: q.length,
    segments: q.tempFiles ? q.tempFiles.length : 1
  }));
});

ipcMain.handle('delete-job', (event, id) => {
  const index = printQueue.findIndex(q => q.id === id);
  if (index > -1) {
    const job = printQueue[index];
    if (job.tempFiles) {
      job.tempFiles.forEach(f => { try { if (fs.existsSync(f)) fs.unlinkSync(f); } catch {} });
    }
    printQueue.splice(index, 1);
    return { status: 'success' };
  }
  return { status: 'error', message: 'Not found' };
});

const executeJob = async (job) => {
  job.status = 'printing';
  try {
    let cliPath;
    if (app.isPackaged) {
      cliPath = path.join(process.resourcesPath, 'engine', 'gdi_print_cli.exe');
    } else {
      cliPath = path.join(app.getAppPath(), 'electron', 'engine', 'dist', 'gdi_print_cli.exe');
    }

    if (!fs.existsSync(cliPath)) {
      throw new Error('GDI 인쇄 엔진(gdi_print_cli.exe)을 찾을 수 없습니다.');
    }

    const args = [
      '--printer', job.printer,
      '--width', job.width.toString(),
      '--length', job.length.toString(),
      '--margin', job.margin.toString(),
      '--offset-x', job.xOffset.toString(),
      '--image', ...job.tempFiles
    ];

    await new Promise((res, rej) => {
      execFile(cliPath, args, { windowsHide: true }, (error, stdout, stderr) => {
        if (error) {
          return rej(new Error('인쇄 엔진 오류: ' + (stderr || error.message)));
        }
        res();
      });
    });
    job.status = 'completed';
  } catch (err) {
    job.status = 'error';
    job.error = err.message;
  }
};

ipcMain.handle('retry-job', async (event, id) => {
  const job = printQueue.find(q => q.id === id);
  if (!job) return { status: 'error', message: 'Job not found' };
  executeJob(job); // runs in background
  return { status: 'success' };
});

ipcMain.handle('print-image', async (event, { printerName, images, width_mm, length_mm, margin_offset_mm, offset_x_mm }) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!printerName) return reject(new Error('설정된 프린터가 없습니다.'));
      
      const offset = margin_offset_mm || 0;
      const xOffset = offset_x_mm || 0;

      const tempFilePaths = [];
      try {
        for (let i = 0; i < images.length; i++) {
          const imgData = images[i];
          const base64Data = imgData.replace(/^data:image\/\w+;base64,/, "");
          const tempFilePath = path.join(os.tmpdir(), `ribbon_print_${Date.now()}_${i}.png`);
          fs.writeFileSync(tempFilePath, base64Data, 'base64');
          tempFilePaths.push(tempFilePath);
        }

        const jobId = `job_${Date.now()}`;
        const newJob = {
          id: jobId,
          status: 'printing',
          timestamp: new Date().toISOString(),
          timestampMs: Date.now(),
          printer: printerName,
          width: width_mm,
          length: length_mm,
          margin: offset,
          xOffset: xOffset,
          tempFiles: tempFilePaths
        };
        printQueue.unshift(newJob);
        if (printQueue.length > 20) printQueue.pop();

        executeJob(newJob); // async run

        resolve({ status: 'success', job_id: jobId });
      } catch (err) {
        for (const tempPath of tempFilePaths) {
          try {
            if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          } catch (cleanupErr) {}
        }
        reject(err);
      }
    } catch (e) {
      reject(e);
    }
  });
});


// 🚀 [Phase 3] Local SQLite Translator & Handler
// const { initDatabase, getDb } = require('./database');
try {
  loadElectronEnv(null);
} catch (_) {}
// initDatabase(app.getPath('userData'));

// 🚀 [Phase 4] Offline Sync & Security Handlers
ipcMain.handle('start-sync', async (event, session) => {
  if (syncWorker) {
    syncWorker.configure(session);
    syncWorker.start(60000); // 1분 주기로 백그라운드 동기화
    return { ok: true };
  }
  return { ok: false, error: 'SyncWorker not initialized' };
});

ipcMain.handle('clear-offline-data', async () => {
  if (syncWorker) {
    syncWorker.clearLocalData();
    return { ok: true };
  }
  return { ok: false };
});

ipcMain.handle('trigger-backup', async () => {
  if (syncWorker) {
    syncWorker.dailyBackup(); // Force daily backup script to run
    const data = syncWorker.getBackupData();
    return { ok: true, data };
  }
  return { ok: false, error: 'SyncWorker not active' };
});

ipcMain.handle('trigger-restore', async (event, backupData) => {
  if (syncWorker) {
    try {
      await syncWorker.restoreData(backupData);
      return { ok: true };
    } catch (error) {
      console.error('Restore failed:', error);
      return { ok: false, error: error.message };
    }
  }
  return { ok: false, error: 'SyncWorker not active' };
});

ipcMain.handle('query-db', async (event, { table, astChain }) => {
  try {
    const db = localDb;
    if (!db) throw new Error("Local DB not initialized");
    
    // Default values
    let action = 'select';
    let isSingle = false;
    let limit = null;
    let selectFields = '*';
    let isCount = false;
    let isHead = false;
    
    let whereClauses = [];
    let whereValues = [];
    let orderByClause = '';
    
    let insertData = null;
    let updateData = null;
    let deleteMode = false;
    let rangeOffset = 0;

    // Parse AST Chain
    for (const step of astChain) {
      const { method, args } = step;
      
      const parseCol = (colStr) => {
        if (typeof colStr === 'string' && colStr.includes('->>')) {
          const [jsonCol, jsonKey] = colStr.split('->>');
          return `json_extract(${jsonCol}, '$.${jsonKey}')`;
        }
        return colStr;
      };

      if (method === 'select') {
        selectFields = args[0] || '*';
        if (args[1]?.count === 'exact') isCount = true;
        if (args[1]?.head) isHead = true;
      } else if (method === 'eq') {
        whereClauses.push(`${parseCol(args[0])} = ?`);
        whereValues.push(args[1]);
      } else if (method === 'neq') {
        whereClauses.push(`${parseCol(args[0])} != ?`);
        whereValues.push(args[1]);
      } else if (method === 'gt') {
        whereClauses.push(`${parseCol(args[0])} > ?`);
        whereValues.push(args[1]);
      } else if (method === 'gte') {
        whereClauses.push(`${parseCol(args[0])} >= ?`);
        whereValues.push(args[1]);
      } else if (method === 'lt') {
        whereClauses.push(`${parseCol(args[0])} < ?`);
        whereValues.push(args[1]);
      } else if (method === 'lte') {
        whereClauses.push(`${parseCol(args[0])} <= ?`);
        whereValues.push(args[1]);
      } else if (method === 'in') {
        const placeholders = args[1].map(() => '?').join(',');
        whereClauses.push(`${parseCol(args[0])} IN (${placeholders})`);
        whereValues.push(...args[1]);
      } else if (method === 'not') {
        const [notCol, notOp, notVal] = args;
        if (notOp === 'eq') {
          whereClauses.push(`${parseCol(notCol)} != ?`);
          whereValues.push(notVal);
        } else if (notOp === 'in') {
          const placeholders = notVal.map(() => '?').join(',');
          whereClauses.push(`${parseCol(notCol)} NOT IN (${placeholders})`);
          whereValues.push(...notVal);
        }
      } else if (method === 'range') {
        rangeOffset = args[0];
        limit = args[1] - args[0] + 1;
      } else if (method === 'or') {
        // Parse Supabase .or("col1.eq.val1,col2.gte.val2") — value may contain dots (ISO dates)
        const orStr = args[0];
        const conditions = orStr.split(',');
        const orClauses = [];
        for (let cond of conditions) {
            const m = cond.match(/^(.+?)\.(eq|gte|lte|in)\.(.+)$/);
            if (!m) continue;
            const [, colPart, opPart, rawVal] = m;
            let val = rawVal.replace(/^"/, '').replace(/"$/, '');
            let col = parseCol(colPart);
            if (opPart === 'eq') {
                orClauses.push(`${col} = ?`);
                whereValues.push(val);
            } else if (opPart === 'gte') {
                orClauses.push(`${col} >= ?`);
                whereValues.push(val);
            } else if (opPart === 'lte') {
                orClauses.push(`${col} <= ?`);
                whereValues.push(val);
            } else if (opPart === 'in') {
                // simple in support for or clauses if needed
                const vals = val.replace(/^\(/, '').replace(/\)$/, '').split(',');
                const placeholders = vals.map(() => '?').join(',');
                orClauses.push(`${col} IN (${placeholders})`);
                whereValues.push(...vals);
            }
        }
        if (orClauses.length > 0) {
            whereClauses.push(`(${orClauses.join(' OR ')})`);
        }
      } else if (method === 'order') {
        const orderCol = args[0];
        const isAsc = args[1]?.ascending !== false;
        orderByClause = `ORDER BY ${orderCol} ${isAsc ? 'ASC' : 'DESC'}`;
      } else if (method === 'limit') {
        limit = args[0];
      } else if (method === 'single' || method === 'maybeSingle') {
        isSingle = true;
        limit = 1;
      } else if (method === 'insert') {
        action = 'insert';
        insertData = Array.isArray(args[0]) ? args[0] : [args[0]];
      } else if (method === 'update') {
        action = 'update';
        updateData = args[0];
      } else if (method === 'delete') {
        action = 'delete';
        deleteMode = true;
      }
    }

    // Execute SQLite Query
    if (action === 'select' && !deleteMode) {
      let query = `SELECT ${selectFields} FROM ${table}`;
      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`;
      }
      if (orderByClause) query += ` ${orderByClause}`;
      if (limit != null) query += ` LIMIT ${limit} OFFSET ${rangeOffset}`;
      
      const stmt = db.prepare(query);
      const safeWhereValues = whereValues.map(v => {
        if (v === undefined) return null;
        if (typeof v === 'boolean') return v ? 1 : 0;
        return v;
      });
      const rows = stmt.all(...safeWhereValues);
      
      // Convert JSON strings back to objects (for Supabase compatibility)
      const parsedRows = rows.map(row => {
        const parsed = { ...row };
        for (const key in parsed) {
          if (typeof parsed[key] === 'string' && (parsed[key].startsWith('{') || parsed[key].startsWith('['))) {
            try { parsed[key] = JSON.parse(parsed[key]); } catch (e) {}
          }
        }
        return parsed;
      });

      let finalResult = { data: isSingle ? (parsedRows[0] || null) : parsedRows, error: null };
      if (isCount) finalResult.count = parsedRows.length;
      if (isHead) finalResult.data = null; // head query doesn't return rows

      return finalResult;
    }
    
    // Add logic for INSERT, UPDATE, DELETE
    if (action === 'insert' || action === 'update' || action === 'delete') {
      const now = new Date().toISOString();
      const insertQueue = db.prepare(`INSERT INTO sync_queue (action, table_name, record_id, payload, timestamp) VALUES (?, ?, ?, ?, ?)`);

      if (action === 'insert' && insertData) {
        db.transaction((items) => {
          for (const item of items) {
            item.updated_at = now;
            item._sync_status = 'pending';
            
            const cols = Object.keys(item);
            const placeholders = cols.map(() => '?').join(', ');
            const values = cols.map(c => {
              const val = item[c];
              if (val === undefined) return null;
              if (typeof val === 'boolean') return val ? 1 : 0;
              if (typeof val === 'object' && val !== null) return JSON.stringify(val);
              return val;
            });
            
            db.prepare(`INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders})`).run(...values);
            insertQueue.run('INSERT', table, item.id, JSON.stringify(item), now);
          }
        })(insertData);
        return { data: insertData, error: null };
      }

      if (action === 'update' && updateData) {
        updateData.updated_at = now;
        updateData._sync_status = 'pending';
        
        const cols = Object.keys(updateData);
        const setClause = cols.map(c => `${c} = ?`).join(', ');
        const values = cols.map(c => {
          const val = updateData[c];
          if (val === undefined) return null;
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (typeof val === 'object' && val !== null) return JSON.stringify(val);
          return val;
        });
        
        let query = `UPDATE ${table} SET ${setClause}`;
        if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(' AND ')}`;
        
        db.transaction(() => {
          db.prepare(query).run(...values, ...whereValues);
          
          // To log to sync_queue, we need the affected record IDs. We have to fetch them.
          let selectQuery = `SELECT id FROM ${table}`;
          if (whereClauses.length > 0) selectQuery += ` WHERE ${whereClauses.join(' AND ')}`;
          const affectedRows = db.prepare(selectQuery).all(...whereValues);
          
          for (const row of affectedRows) {
             insertQueue.run('UPDATE', table, row.id, JSON.stringify(updateData), now);
          }
        })();
        return { data: null, error: null };
      }

      if (action === 'delete') {
        let query = `DELETE FROM ${table}`;
        if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(' AND ')}`;
        
        db.transaction(() => {
          // Fetch affected IDs before deleting
          let selectQuery = `SELECT id FROM ${table}`;
          if (whereClauses.length > 0) selectQuery += ` WHERE ${whereClauses.join(' AND ')}`;
          const affectedRows = db.prepare(selectQuery).all(...whereValues);
          
          db.prepare(query).run(...whereValues);
          
          for (const row of affectedRows) {
             insertQueue.run('DELETE', table, row.id, null, now);
          }
        })();
        return { data: null, error: null };
      }
    }
    
    return { data: null, error: { message: `Action ${action} not fully implemented in local proxy yet.` } };
  } catch (error) {
    console.error('[Electron DB Error]', error);
    return { data: null, error: { message: error.message } };
  }
});
