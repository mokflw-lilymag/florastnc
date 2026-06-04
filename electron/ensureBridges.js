const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const { app } = require('electron');

/** 설치 마법사 PP 실패 시 첫 실행에서 보완 */
function ensureWebBridgesOnFirstRun() {
  if (!app.isPackaged) return;

  const instDir = path.dirname(process.execPath);
  const ppVbs = path.join(app.getPath('appData'), 'floxyncBridge', 'ppbridge.vbs');
  const ppCmd = path.join(process.resourcesPath, 'install-pp-bridge.cmd');

  if (!fs.existsSync(ppVbs) && fs.existsSync(ppCmd)) {
    console.log('[Bridge] PP missing — running install-pp-bridge.cmd');
    exec(`"${ppCmd}" "${instDir}"`, { windowsHide: true }, (err) => {
      if (err) console.log('[Bridge] PP ensure failed:', err.message);
      else console.log('[Bridge] PP ensure OK');
    });
  }

  const ribbonLauncher = path.join(
    process.env.LOCALAPPDATA || '',
    'RibbonBridge',
    'launch_service.exe'
  );
  const ribbonZip = path.join(process.resourcesPath, 'bridge-installers', 'RibbonBridgePackage.zip');
  const ribbonPs = path.join(process.resourcesPath, 'install-bridges.ps1');

  const ribbonCmd = path.join(process.resourcesPath, 'install-ribbon-bridge.cmd');
  if (!fs.existsSync(ribbonLauncher) && fs.existsSync(ribbonCmd)) {
    console.log('[Bridge] Ribbon missing — running install-ribbon-bridge.cmd');
    exec(`"${ribbonCmd}" "${instDir}"`, { windowsHide: true }, (err) => {
      if (err) console.log('[Bridge] Ribbon ensure failed:', err.message);
    });
  }

  if (fs.existsSync(ribbonLauncher)) {
    exec(`"${ribbonLauncher}"`, { windowsHide: true, cwd: path.dirname(ribbonLauncher) }, () => {});
  }
}

module.exports = { ensureWebBridgesOnFirstRun };
