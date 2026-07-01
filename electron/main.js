const { app, BrowserWindow, ipcMain, Menu, Tray, nativeImage, globalShortcut, dialog, Notification } = require('electron');
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
let externalOrderPendingCount = 0;
const isDev = !app.isPackaged;

function refreshTrayTooltip() {
  if (!tray) return;
  tray.setToolTip(
    externalOrderPendingCount > 0
      ? `FloXync — 새 네트워크 수주 ${externalOrderPendingCount}건`
      : 'FloXync 백그라운드 인쇄 서버',
  );
}

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
const DEV_PORT = Number(process.env.PORT) || 3000;
let embeddedServerProcess = null;
let embeddedServerStartPromise = null;
let embeddedBridgeHandle = null;

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

function showLoadErrorPage(errMsg, options = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const esc = String(errMsg)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  const retryUrl = options.retryUrl || `http://127.0.0.1:${EMBEDDED_PORT}/`;
  const logHint = path.join(app.getPath('userData'), 'embedded-server.log');
  const devHint = isDev
    ? '<li>터미널에서 <code>npm run electron:dev</code> 로 실행했는지 확인 (Next.js + Electron 동시 실행)</li>'
    : '';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Floxync</title>
<style>body{font-family:"Malgun Gothic",sans-serif;padding:2rem;max-width:560px;line-height:1.65}
button{padding:10px 20px;font-size:15px;cursor:pointer;margin:8px 8px 0 0}</style></head><body>
<h2>화면을 불러오지 못했습니다</h2><p>${esc}</p>
<p><b>해결 방법</b></p><ol>
${devHint}
<li>트레이 아이콘 우클릭 → <b>화면 새로고침</b> (또는 F5)</li>
<li>안 되면 <b>완전 종료</b> 후 앱 다시 실행</li>
<li>작업 관리자에서 Floxync / node 가 남아 있으면 종료</li>
</ol>
<p style="font-size:12px;color:#555">로그: ${logHint}</p>
<button type="button" onclick="location.href='${retryUrl}'">다시 연결</button>
<p style="font-size:12px">서버 재시작은 F5 또는 트레이 → 화면 새로고침</p>
</body></html>`;
  mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
}

function waitForDevServer(maxMs = 120000) {
  const deadline = Date.now() + maxMs;
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (Date.now() > deadline) {
        reject(
          new Error(
            `Next.js 개발 서버가 응답하지 않습니다 (http://127.0.0.1:${DEV_PORT}).\n` +
              '다른 터미널에서 npm run dev 를 실행하거나, npm run electron:dev 로 함께 실행하세요.'
          )
        );
        return;
      }
      const http = require('http');
      const req = http.get(`http://127.0.0.1:${DEV_PORT}/`, { timeout: 4000 }, (res) => {
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

async function loadDevUi() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const devPath = process.env.ELECTRON_DEV_PATH || '/login';
  const devUrl = `http://127.0.0.1:${DEV_PORT}${devPath}`;
  try {
    await waitForDevServer();
    await mainWindow.loadURL(devUrl);
  } catch (e) {
    console.error('[DevServer]', e.message);
    showLoadErrorPage(e.message, { retryUrl: devUrl });
  }
}

/** F5·트레이 새로고침 — 현재 페이지 유지 (세션 쿠키 보존). 오류 페이지만 /login 재진입 */
function reloadMainWindowPreserveSession() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const url = mainWindow.webContents.getURL();
  const needsFullReload =
    !url || url === 'about:blank' || url.startsWith('data:');
  if (needsFullReload) {
    if (isDev) void loadDevUi();
    else void reloadPackagedUi();
    return;
  }
  mainWindow.webContents.reload();
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

/** PP(8004)만 종료 — Ribbon(8002)은 웹·앱 공통 엔진이므로 유지 */
function stopExternalPpBridge() {
  console.log('[Bridge] Stopping external PP (8004) for embedded server...');
  killProcessOnPort(8004);
}

function stopExternalBridge() {
  stopExternalPpBridge();
}

async function isRibbonBridgeHealthy() {
  try {
    const res = await fetch('http://127.0.0.1:8002/', { signal: AbortSignal.timeout(3000) });
    const data = await res.json();
    return data.status === 'ok' || data.status === 'success';
  } catch {
    return false;
  }
}

function startRibbonBridgeProcess() {
  const ribbonLauncher = path.join(
    process.env.LOCALAPPDATA || '',
    'RibbonBridge',
    'launch_service.exe'
  );
  if (fs.existsSync(ribbonLauncher)) {
    return new Promise((resolve) => {
      exec(
        `"${ribbonLauncher}"`,
        { windowsHide: true, cwd: path.dirname(ribbonLauncher) },
        (err) => {
          if (err) console.log('[Bridge] Ribbon (8002) launch_service failed:', err.message);
          else console.log('[Bridge] Ribbon bridge (8002) started:', ribbonLauncher);
          resolve(!err);
        }
      );
    });
  }

  const startupFolder = path.join(
    os.homedir(),
    'AppData',
    'Roaming',
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
    'Startup'
  );
  try {
    const entries = fs.readdirSync(startupFolder);
    const ribbonStarter = entries.find(
      (name) =>
        /ribbon/i.test(name) &&
        (name.endsWith('.vbs') || name.endsWith('.lnk') || name.endsWith('.bat'))
    );
    if (ribbonStarter) {
      const fullPath = path.join(startupFolder, ribbonStarter);
      return new Promise((resolve) => {
        exec(`cmd /c start "" "${fullPath}"`, { windowsHide: true }, (err) => {
          if (err) console.log('[Bridge] Ribbon (8002) start failed:', err.message);
          else console.log('[Bridge] Ribbon bridge starter launched:', ribbonStarter);
          resolve(!err);
        });
      });
    }
  } catch (e) {
    console.log('[Bridge] Could not scan startup folder for Ribbon:', e.message);
  }

  console.log('[Bridge] Ribbon not found (no %LOCALAPPDATA%\\RibbonBridge\\launch_service.exe)');
  return Promise.resolve(false);
}

/** 리본 인쇄(8002) — 웹 브라우저와 동일 엔진 보장 */
async function ensureRibbonBridgeRunning() {
  if (await isRibbonBridgeHealthy()) {
    console.log('[Bridge] Ribbon (8002) already running');
    return true;
  }

  console.log('[Bridge] Ribbon (8002) not responding — starting...');
  await startRibbonBridgeProcess();

  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 500));
    if (await isRibbonBridgeHealthy()) {
      console.log('[Bridge] Ribbon (8002) ready');
      return true;
    }
  }

  console.log('[Bridge] Ribbon (8002) still not responding after start attempt');
  return false;
}

/** @param {{ force?: boolean }} [options] force=true: 창만 닫고 트레이에 남을 때도 웹용 PP 복구 */
function restoreExternalPpBridge(options = {}) {
  if (!options.force && !app.isQuiting) {
    console.log('[Bridge] Skip PP restore — Electron app still running');
    return;
  }
  console.log('[Bridge] Restoring external PP (8004) for web browser use...');

  const ppVbs = path.join(app.getPath('appData'), 'floxyncBridge', 'ppbridge.vbs');
  if (fs.existsSync(ppVbs)) {
    exec(`wscript.exe "${ppVbs}"`, { windowsHide: true }, (err) => {
      if (err) console.log('[Bridge] PP (8004) start failed:', err.message);
      else console.log('[Bridge] PP bridge (8004) started via ppbridge.vbs');
    });
  } else {
    console.log('[Bridge] ppbridge.vbs not found:', ppVbs);
  }
}

function restoreExternalBridge(options = {}) {
  restoreExternalPpBridge(options);
  void ensureRibbonBridgeRunning();
}

async function stopEmbeddedBridgeServer() {
  if (!embeddedBridgeHandle?.stop) return;
  try {
    await embeddedBridgeHandle.stop();
  } catch (e) {
    console.log('[Bridge] stop embedded failed:', e.message);
  }
  embeddedBridgeHandle = null;
}

async function startEmbeddedBridgeServer() {
  if (embeddedBridgeHandle) return;
  try {
    const { createBridgeServer } = require('./bridgeServer');
    embeddedBridgeHandle = createBridgeServer(8004);
  } catch (e) {
    console.log('[Bridge] createBridgeServer failed:', e.message);
  }
}

/** 데스크톱 앱: 외부 PP(8004)만 끄고 내장 PP 사용, Ribbon(8002)은 웹과 동일 엔진 유지 */
async function handoffToDesktopBridges() {
  stopExternalPpBridge();
  await ensureRibbonBridgeRunning();
  await startEmbeddedBridgeServer();
}

/** 트레이/종료 시: 내장 PP 끄고 브라우저용 외부 PP(8004)만 복구 (Ribbon 8002는 계속 실행) */
async function handoffToWebBridges() {
  await stopEmbeddedBridgeServer();
  restoreExternalPpBridge({ force: true });
}

// Windows 시작 프로그램 — 설정 UI에서 토글 (기본값: 패키지 최초 실행 시 true)
if (!isDev && app.isPackaged) {
  const settings = app.getLoginItemSettings();
  if (!settings.openAtLogin && !settings.executableWillLaunchAtLogin) {
    app.setLoginItemSettings({ openAtLogin: true, path: app.getPath('exe') });
  }
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
    { label: 'Floxync 열기', click: () => showMainWindow() },
    {
      label: '화면 새로고침',
      click: () => {
        if (mainWindow && !mainWindow.isDestroyed()) reloadMainWindowPreserveSession();
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

/** 창을 열 때 외부 PP(8004)만 끔 → 내장 PP + Ribbon(8002) 사용 */
function showMainWindow() {
  void handoffToDesktopBridges();
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
    title: 'Floxync Desktop',
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#f1f5f9',
      symbolColor: '#64748b',
      height: 32,
    },
    ...(process.platform === 'win32' ? { roundedCorners: true } : {}),
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
      reloadMainWindowPreserveSession();
    }
  });

  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    if (!validatedURL || validatedURL.startsWith('data:')) return;
    if (errorCode === -3) return;
    if (isDev) {
      showLoadErrorPage(`${errorDescription} (${errorCode})`, {
        retryUrl: `http://127.0.0.1:${DEV_PORT}${process.env.ELECTRON_DEV_PATH || '/login'}`,
      });
      return;
    }
    appendEmbeddedServerLog(`did-fail-load ${errorCode} ${errorDescription} ${validatedURL}`);
    showLoadErrorPage(`${errorDescription} (${errorCode})`);
  });

  mainWindow.setMenu(null);

  // X = 트레이로 숨김 + 웹용 외부 PP(8004) 복구 (Ribbon 8002는 유지)
  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      void handoffToWebBridges().then(() => {
        if (mainWindow && !mainWindow.isDestroyed()) mainWindow.hide();
      });
    }
    return false;
  });

  // 새 창: 앱 내부(localhost/file)만 Electron, 그 외는 OS 기본 브라우저
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    const isInternal =
      url.startsWith('file://') ||
      url.startsWith('http://localhost') ||
      url.startsWith('http://127.0.0.1') ||
      url.startsWith('https://localhost') ||
      url.startsWith('https://127.0.0.1');
    if (!isInternal) {
      const { shell } = require('electron');
      void shell.openExternal(url);
      return { action: 'deny' };
    }
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        webPreferences: {
          preload: path.join(__dirname, 'preload.js'),
          contextIsolation: true,
          nodeIntegration: false,
        },
      },
    };
  });

  if (isDev) {
    void loadDevUi();
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

  app.whenReady().then(async () => {
    loadElectronEnv(app.getPath('userData'));

    // Windows 바탕화면 바로가기 자동 복구 (업데이트 후 깨진 링크 방어)
    try {
      if (process.platform === 'win32') {
        const { shell } = require('electron');
        const desktopPath = path.join(os.homedir(), 'Desktop');
        const shortcutPath = path.join(desktopPath, 'FloXync.lnk');
        shell.writeShortcutLink(shortcutPath, 'replace', { target: process.execPath });
        console.log('[Shortcut] Desktop shortcut verified:', shortcutPath);
      }
    } catch (e) {
      console.log('[Shortcut Error]', e);
    }

    // 로컬 DB 및 SyncWorker 초기화
    try {
      const dbPath = path.join(app.getPath('userData'), 'floxync_local.db');
      localDb = initLocalDb(dbPath);
      const { bindDb } = require('./syncScope');
      bindDb(localDb);
      const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xxx.supabase.co';
      const sbAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'xxx';
      syncWorker = new SyncWorker(localDb, sbUrl, sbAnon);
      console.log('Local DB & SyncWorker initialized.');
    } catch (err) {
      console.error('Failed to init Local DB:', err);
    }

    try {
      const { ensureWebBridgesOnFirstRun } = require('./ensureBridges');
      await ensureWebBridgesOnFirstRun();
    } catch (e) {
      console.log('[Bridge] ensureWebBridgesOnFirstRun skipped:', e.message);
    }

    await handoffToDesktopBridges();

    createWindow();
    
    createTray();

    // Auto Updater — 다운로드 진행 UI (ERP 패턴)
    if (!isDev) {
      let progressWin = null;

      autoUpdater.on('update-available', () => {
        progressWin = new BrowserWindow({
          width: 380,
          height: 120,
          alwaysOnTop: true,
          frame: false,
          resizable: false,
          show: false,
          webPreferences: { nodeIntegration: false, contextIsolation: true },
        });
        const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
          body{font-family:'Malgun Gothic','Segoe UI',sans-serif;padding:20px;background:#fff;text-align:center;margin:0;display:flex;flex-direction:column;justify-content:center;height:100vh;box-sizing:border-box;border-radius:8px;box-shadow:0 4px 6px -1px rgba(0,0,0,.1)}
          h3{margin:0 0 10px;font-size:15px;color:#1f2937}
          .bar-wrap{width:100%;background:#e5e7eb;border-radius:9999px;overflow:hidden;margin-bottom:8px}
          .bar{height:10px;background:#3b82f6;width:0%;transition:width .3s}
          #status{font-size:13px;color:#6b7280}
        </style></head><body>
          <h3>FloXync 업데이트 다운로드 중...</h3>
          <div class="bar-wrap"><div class="bar" id="bar"></div></div>
          <div id="status">0.0%</div>
        </body></html>`;
        progressWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);
        progressWin.once('ready-to-show', () => progressWin?.show());
      });

      autoUpdater.on('download-progress', (progressObj) => {
        if (progressWin && !progressWin.isDestroyed()) {
          const p = progressObj.percent.toFixed(1);
          const s = (progressObj.bytesPerSecond / 1024 / 1024).toFixed(2);
          progressWin.webContents.executeJavaScript(
            `document.getElementById('bar').style.width='${p}%';document.getElementById('status').innerText='${p}% (${s} MB/s)';`,
          ).catch(() => {});
        }
      });

      autoUpdater.checkForUpdatesAndNotify().catch(e => {
        console.log('[AutoUpdater] checkForUpdatesAndNotify failed:', e.message);
      });
      
      autoUpdater.on('update-downloaded', (info) => {
        if (progressWin && !progressWin.isDestroyed()) {
          progressWin.close();
          progressWin = null;
        }
        console.log('[AutoUpdater] update-downloaded', info);
        dialog.showMessageBox({
          type: 'info',
          title: '업데이트 준비 완료',
          message: `새 버전(${info.version})이 다운로드되었습니다. 지금 재시작하여 업데이트하시겠습니까?`,
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
          if (window === mainWindow) {
            reloadMainWindowPreserveSession();
          } else {
            window.webContents.reload();
          }
        }
      });
    });
  });
}

ipcMain.handle('get-local-sync-status', () => getSyncState());

ipcMain.handle('get-yearly-stats', async (_event, tenantId) => {
  try {
    const db = localDb;
    if (!db || !tenantId) return { count: 0, revenue: 0 };

    const currentYear = new Date().getFullYear();
    const startDateStr = new Date(currentYear, 0, 1).toISOString();

    const row = db.prepare(`
      SELECT
        COUNT(id) as totalCount,
        SUM(CAST(json_extract(summary, '$.total') AS INTEGER)) as totalRevenue
      FROM orders
      WHERE tenant_id = ?
        AND order_date >= ?
        AND status != 'canceled'
    `).get(tenantId, startDateStr);

    return { count: row?.totalCount || 0, revenue: row?.totalRevenue || 0 };
  } catch (error) {
    console.error('[YearlyStats Error]', error);
    return { count: 0, revenue: 0 };
  }
});

ipcMain.handle('sync-tenant-backup-path', (_event, { tenantId, path: backupPath }) => {
  try {
    const { setTenantBackupPath } = require('./backupPathStore');
    if (!tenantId) return { ok: false, error: 'tenantId is required' };
    setTenantBackupPath(tenantId, backupPath);
    return { ok: true };
  } catch (error) {
    console.error('[sync-tenant-backup-path]', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('download-image', async (_event, { url, filename, tenantId }) => {
  try {
    const https = require('https');
    const http = require('http');
    const { getImageDownloadDir } = require('./backupPathStore');
    if (!url || !filename) {
      return { success: false, error: 'url and filename are required' };
    }

    const tid = tenantId || syncWorker?.tenantId;
    const downloadDir = getImageDownloadDir(tid);
    if (!fs.existsSync(downloadDir)) fs.mkdirSync(downloadDir, { recursive: true });

    const safeName = String(filename).replace(/[<>:"/\\|?*]/g, '_');
    const destPath = path.join(downloadDir, safeName);

    await new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const file = fs.createWriteStream(destPath);
      client.get(url, (response) => {
        if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          file.close();
          fs.unlink(destPath, () => {});
          client.get(response.headers.location, (redirectRes) => {
            const redirectFile = fs.createWriteStream(destPath);
            redirectRes.pipe(redirectFile);
            redirectFile.on('finish', () => redirectFile.close(resolve));
          }).on('error', reject);
          return;
        }
        if (response.statusCode !== 200) {
          reject(new Error(`Download failed: HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on('finish', () => file.close(resolve));
      }).on('error', (err) => {
        fs.unlink(destPath, () => reject(err));
      });
    });

    return { success: true, path: destPath };
  } catch (error) {
    console.error('[Electron download-image Error]', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('clear-spooler', async () => {
  try {
    const { execSync } = require('child_process');
    execSync('powershell -Command "Get-WmiObject Win32_PrintJob | Remove-WmiObject"', {
      stdio: 'ignore',
      windowsHide: true,
    });
    return { success: true, message: '인쇄 대기열이 초기화되었습니다.' };
  } catch (err) {
    return { success: false, message: `대기열 초기화 실패: ${err.message}` };
  }
});

ipcMain.handle('wake-up-window', async () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
    mainWindow.flashFrame(true);
    mainWindow.setAlwaysOnTop(true);
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) mainWindow.setAlwaysOnTop(false);
    }, 1000);
  }
  return { ok: true };
});

ipcMain.handle('notify-external-order', async (_event, payload = {}) => {
  externalOrderPendingCount += 1;
  refreshTrayTooltip();

  const title = payload.title || '🌸 새 네트워크 수주';
  const body = payload.body || '확인이 필요한 수주가 있습니다.';

  if (mainWindow && !mainWindow.isDestroyed()) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    if (!mainWindow.isVisible()) {
      mainWindow.flashFrame(true);
    }
    mainWindow.show();
    mainWindow.focus();
  }

  if (Notification.isSupported()) {
    try {
      new Notification({ title, body, silent: false }).show();
    } catch (e) {
      console.warn('[notify-external-order] Notification failed', e);
    }
  }

  return { ok: true, count: externalOrderPendingCount };
});

ipcMain.handle('clear-external-order-badge', async () => {
  externalOrderPendingCount = 0;
  refreshTrayTooltip();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.flashFrame(false);
  }
  return { ok: true };
});

app.on('will-quit', () => {
  stopEmbeddedServer();
  void stopEmbeddedBridgeServer();
  restoreExternalBridge({ force: true });
});

app.on('window-all-closed', function () {
  // 트레이로 숨길 때는 앱이 계속 실행 중 — 외부 브릿지는 복구하지 않음
  if (process.platform !== 'darwin') {
    // app.quit();
  }
});

ipcMain.handle('ping', async () => ({ ok: true, packaged: app.isPackaged }));

ipcMain.handle('get-startup-setting', async () => {
  const settings = app.getLoginItemSettings();
  return settings.openAtLogin;
});

ipcMain.handle('set-startup-setting', async (_event, enabled) => {
  app.setLoginItemSettings({
    openAtLogin: !!enabled,
    path: app.getPath('exe'),
  });
  return true;
});

ipcMain.handle('trigger-kakaotalk-paste', async (_event, { message }) => {
  const { clipboard, shell } = require('electron');
  if (message) {
    clipboard.writeText(message);
  }
  try {
    await shell.openExternal('kakaotalk://');
  } catch (e) {
    console.error('카카오톡 실행 실패:', e.message);
  }
  return { success: true };
});

ipcMain.handle('trigger-messenger-paste', async (_event, { protocol, message }) => {
  const { clipboard, shell } = require('electron');
  if (message) {
    clipboard.writeText(message);
  }
  try {
    if (protocol) {
      await shell.openExternal(protocol);
    }
  } catch (e) {
    console.error(`${protocol} 실행 실패:`, e.message);
  }
  return { success: true };
});

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
  const templates = [
    'receipt-pickup.html',
    'receipt-delivery-shop.html',
    'receipt-delivery-driver.html',
    'receipt-daily-settlement.html',
    'receipt-market-list.html',
    'receipt-labels.json',
    'receipt-i18n.js',
  ];
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
    const logPath = getPrintLogPath();
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > 500 * 1024) {
      const lines = fs.readFileSync(logPath, 'utf8').split('\n');
      fs.writeFileSync(logPath, lines.slice(-200).join('\n') + '\n');
    }
    fs.appendFileSync(logPath, `${new Date().toISOString()} ${msg}\n`);
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
    if (!printWin.isDestroyed()) printWin.destroy();
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
    if (!html || !html.trim()) {
      appendPrintLog('WARN: empty HTML — skipping print');
      throw new Error('인쇄 HTML 생성 실패');
    }
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
      '--cut-margin', (job.cutMargin || 0).toString(),
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

ipcMain.handle('print-image', async (event, { printerName, images, width_mm, length_mm, margin_offset_mm, offset_x_mm, cutting_margin_mm }) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (!printerName) return reject(new Error('설정된 프린터가 없습니다.'));
      
      const offset = margin_offset_mm || 0;
      const xOffset = offset_x_mm || 0;
      const cutMargin = Number(cutting_margin_mm) || 0;

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
          cutMargin,
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
    const { setSyncScope } = require('./syncScope');
    setSyncScope({ mode: 'tenant', tenantId: session.tenant_id });
    syncWorker.start();
    return { ok: true };
  }
  return { ok: false, error: 'SyncWorker not initialized' };
});

ipcMain.handle('set-sync-scope', async (_event, scope) => {
  try {
    const { setSyncScope, getSyncScope, pruneLocalRowsOutsideScope } = require('./syncScope');
    const { changed } = setSyncScope(scope || {});
    let pruned = { orders: 0, customers: 0, simple_expenses: 0 };
    if (changed) {
      if (syncWorker) {
        syncWorker.resetSyncCursorsForScopeChange();
        syncWorker.requestImmediateSyncCycle();
      }
      pruned = pruneLocalRowsOutsideScope();
    }
    return { data: { scope: getSyncScope(), changed, pruned }, error: null };
  } catch (error) {
    console.error('[Electron set-sync-scope Error]', error);
    return { data: null, error: { message: error.message } };
  }
});

/** 원격(클라우드)에서 이미 삭제된 레코드를 로컬 SQLite에서만 제거 — sync_queue 미등록 */
ipcMain.handle('delete-local-record', async (_event, { table, id }) => {
  try {
    const db = localDb;
    if (!db) throw new Error('Local DB not initialized');
    const allowedTables = ['orders', 'customers'];
    if (!allowedTables.includes(table)) {
      return { data: null, error: { message: `Table not allowed: ${table}` } };
    }
    if (!id) {
      return { data: null, error: { message: 'id is required' } };
    }
    const result = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(id);
    return { data: { deleted: result.changes }, error: null };
  } catch (error) {
    console.error('[Electron delete-local-record Error]', error);
    return { data: null, error: { message: error.message } };
  }
});

/** SyncWorker 유령 주문 정리 (로컬 DB만) */
ipcMain.handle('sync-deleted-orders', async () => {
  try {
    if (!syncWorker) {
      return { data: { removed: 0 }, error: null };
    }
    const removed = await syncWorker.syncDeletedRecords('orders');
    return { data: { removed }, error: null };
  } catch (error) {
    console.error('[Electron sync-deleted-orders Error]', error);
    return { data: null, error: { message: error.message } };
  }
});

ipcMain.handle('request-immediate-sync', async () => {
  if (syncWorker) {
    syncWorker.requestImmediateSyncCycle();
    return { ok: true };
  }
  return { ok: false };
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

ipcMain.handle('run-monthly-photo-backup', async (_event, payload = {}) => {
  if (!syncWorker?.tenantId || !localDb) {
    return { ok: false, error: 'SyncWorker not active' };
  }
  try {
    const result = await syncWorker.runMonthlyPhotoBackup(payload.targetMonth, !!payload.force);
    return result;
  } catch (error) {
    console.error('[MonthlyPhotoBackup]', error);
    return { ok: false, error: error.message };
  }
});

ipcMain.handle('open-monthly-backup-folder', async (_event, payload) => {
  const { shell } = require('electron');
  const { getDeliveryBackupDir, getReceiptBackupDir } = require('./sync/photoBackup');
  const kind = typeof payload === 'string' ? payload : payload?.kind;
  const tenantId = typeof payload === 'object' && payload ? payload.tenantId : undefined;
  const tid = tenantId || syncWorker?.tenantId;
  const folder = kind === 'receipt' ? getReceiptBackupDir(tid) : getDeliveryBackupDir(tid);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder, { recursive: true });
  await shell.openPath(folder);
  return { ok: true, path: folder };
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

      const parseInList = (val) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
          const inner = val.replace(/^\s*\(\s*/, '').replace(/\s*\)\s*$/, '');
          return inner
            .split(',')
            .map((s) => s.trim().replace(/^"|"$/g, ''))
            .filter(Boolean);
        }
        return [];
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
        const inVals = parseInList(args[1]);
        const placeholders = inVals.map(() => '?').join(',');
        whereClauses.push(`${parseCol(args[0])} IN (${placeholders})`);
        whereValues.push(...inVals);
      } else if (method === 'not') {
        const [notCol, notOp, notVal] = args;
        if (notOp === 'eq') {
          whereClauses.push(`${parseCol(notCol)} != ?`);
          whereValues.push(notVal);
        } else if (notOp === 'in') {
          const inVals = parseInList(notVal);
          const placeholders = inVals.map(() => '?').join(',');
          whereClauses.push(`${parseCol(notCol)} NOT IN (${placeholders})`);
          whereValues.push(...inVals);
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
        const orderCol = parseCol(args[0]);
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
      const insertQueue = db.prepare(
        `INSERT INTO sync_queue (action, table_name, record_id, payload, timestamp) VALUES (?, ?, ?, ?, ?)`,
      );
      const bumpSync = () => {
        if (syncWorker?.requestImmediateSyncCycle) syncWorker.requestImmediateSyncCycle();
      };

      if (action === 'insert' && insertData) {
        db.transaction((items) => {
          for (const item of items) {
            item.updated_at = item.updated_at || now;
            item.sync_status = 'pending_insert';

            const cols = Object.keys(item);
            const placeholders = cols.map(() => '?').join(', ');
            const values = cols.map((c) => {
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
        bumpSync();
        return { data: insertData, error: null };
      }

      if (action === 'update' && updateData) {
        updateData.updated_at = updateData.updated_at || now;

        const cols = Object.keys(updateData);
        const setClause = cols.map((c) => `${c} = ?`).join(', ');
        const values = cols.map((c) => {
          const val = updateData[c];
          if (val === undefined) return null;
          if (typeof val === 'boolean') return val ? 1 : 0;
          if (typeof val === 'object' && val !== null) return JSON.stringify(val);
          return val;
        });

        let query = `UPDATE ${table} SET ${setClause}, sync_status = 'pending_update'`;
        if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(' AND ')}`;

        db.transaction(() => {
          db.prepare(query).run(...values, ...whereValues);

          let selectQuery = `SELECT id FROM ${table}`;
          if (whereClauses.length > 0) selectQuery += ` WHERE ${whereClauses.join(' AND ')}`;
          const affectedRows = db.prepare(selectQuery).all(...whereValues);

          for (const row of affectedRows) {
            insertQueue.run('UPDATE', table, row.id, JSON.stringify(updateData), now);
          }
        })();
        bumpSync();
        return { data: null, error: null };
      }

      if (action === 'delete') {
        let query = `DELETE FROM ${table}`;
        if (whereClauses.length > 0) query += ` WHERE ${whereClauses.join(' AND ')}`;

        db.transaction(() => {
          let selectQuery = `SELECT id FROM ${table}`;
          if (whereClauses.length > 0) selectQuery += ` WHERE ${whereClauses.join(' AND ')}`;
          const affectedRows = db.prepare(selectQuery).all(...whereValues);

          db.prepare(query).run(...whereValues);

          for (const row of affectedRows) {
            insertQueue.run('DELETE', table, row.id, null, now);
          }
        })();
        bumpSync();
        return { data: null, error: null };
      }
    }
    
    return { data: null, error: { message: `Action ${action} not fully implemented in local proxy yet.` } };
  } catch (error) {
    console.error('[Electron DB Error]', error);
    return { data: null, error: { message: error.message } };
  }
});

let reminderWindow = null;
let reminderData = null;

function getUiBaseUrl() {
  return isDev ? 'http://localhost:3000' : `http://127.0.0.1:${EMBEDDED_PORT}`;
}

ipcMain.on('open-reminder-window', (_event, data) => {
  if (reminderWindow && !reminderWindow.isDestroyed()) {
    reminderWindow.focus();
    return;
  }

  reminderData = data;

  const iconPath = resolveAppIconPath();
  reminderWindow = new BrowserWindow({
    width: 480,
    height: 640,
    title: '배송/픽업 준비 확인',
    resizable: false,
    minimizable: false,
    maximizable: false,
    alwaysOnTop: true,
    modal: true,
    parent: mainWindow && !mainWindow.isDestroyed() ? mainWindow : undefined,
    ...(iconPath ? { icon: iconPath } : {}),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  reminderWindow.setMenu(null);
  reminderWindow.loadURL(`${getUiBaseUrl()}/reminder-popup`);

  reminderWindow.on('closed', () => {
    reminderWindow = null;
    reminderData = null;
  });
});

ipcMain.handle('get-reminder-data', () => reminderData);

ipcMain.on('close-reminder-window', () => {
  if (reminderWindow && !reminderWindow.isDestroyed()) {
    reminderWindow.close();
  }
});

ipcMain.on('reminder-action', (_event, data) => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('reminder-action', data);
  }
});
