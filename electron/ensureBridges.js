const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { app } = require('electron');

function readBundleStamp() {
  try {
    return fs.readFileSync(path.join(app.getPath('userData'), 'bridge-bundle.version'), 'utf8').trim();
  } catch {
    return '';
  }
}

function writeBundleStamp(version) {
  try {
    fs.writeFileSync(path.join(app.getPath('userData'), 'bridge-bundle.version'), version, 'utf8');
  } catch (e) {
    console.log('[Bridge] could not write bundle stamp:', e.message);
  }
}

function runCmd(cmd, label) {
  return new Promise((resolve) => {
    exec(cmd, { windowsHide: true }, (err, stdout, stderr) => {
      if (err) console.log(`[Bridge] ${label} failed:`, err.message, stderr || '');
      else console.log(`[Bridge] ${label} OK`);
      resolve(!err);
    });
  });
}

/**
 * 설치본 첫 실행·앱 버전 업데이트 시 웹용 PP/Ribbon 브릿지를 resources 에서 재설치
 */
async function ensureWebBridgesOnFirstRun() {
  if (!app.isPackaged) return;

  const instDir = path.dirname(process.execPath);
  const appVersion = app.getVersion();
  const needsRefresh = readBundleStamp() !== appVersion;

  const ppVbs = path.join(app.getPath('appData'), 'floxyncBridge', 'ppbridge.vbs');
  const ribbonLauncher = path.join(process.env.LOCALAPPDATA || '', 'RibbonBridge', 'launch_service.exe');
  const ppCmd = path.join(process.resourcesPath, 'install-pp-bridge.cmd');
  const ribbonCmd = path.join(process.resourcesPath, 'install-ribbon-bridge.cmd');

  if ((needsRefresh || !fs.existsSync(ppVbs)) && fs.existsSync(ppCmd)) {
    console.log('[Bridge] Installing/upgrading PP bridge...');
    await runCmd(`"${ppCmd}" "${instDir}"`, 'PP bridge install');
  }

  if ((needsRefresh || !fs.existsSync(ribbonLauncher)) && fs.existsSync(ribbonCmd)) {
    console.log('[Bridge] Installing/upgrading Ribbon bridge...');
    await runCmd(`"${ribbonCmd}" "${instDir}"`, 'Ribbon bridge install');
  }

  if (fs.existsSync(ribbonLauncher)) {
    await runCmd(`"${ribbonLauncher}"`, 'Ribbon bridge start');
  }

  writeBundleStamp(appVersion);
}

module.exports = { ensureWebBridgesOnFirstRun };
