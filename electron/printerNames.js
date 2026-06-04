const { exec } = require('child_process');
const { requirePrintModule } = require('./printDeps');

function loadPdfToPrinter() {
  return requirePrintModule('pdf-to-printer');
}

/** UI용: Windows "(1 복사)" → "(복사 1)" */
function formatPrinterDisplayName(name) {
  return String(name || '').replace(/\(\s*(\d+)\s*복사\s*\)/gi, '(복사 $1)');
}

async function getPrinterNamesFromPowerShell() {
  return new Promise((resolve) => {
    const { execFile } = require('child_process');
    execFile(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; (Get-Printer).Name | ConvertTo-Json -Compress'
      ],
      { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 },
      (err, stdout) => {
        if (err) return resolve([]);
        try {
          const parsed = JSON.parse(stdout.trim() || '[]');
          const list = Array.isArray(parsed) ? parsed : [parsed];
          return resolve(list.filter(Boolean).map(String));
        } catch {
          return resolve([]);
        }
      }
    );
  });
}

async function getPrinterNamesFromPdfToPrinter() {
  try {
    const ptp = loadPdfToPrinter();
    const printers = await ptp.getPrinters();
    return (printers || [])
      .map((p) => p.name || p.deviceId)
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** 인쇄·매칭용 — UTF-8( PowerShell ) 우선, pdf-to-printer 는 한글 깨짐 */
async function getInstalledPrinterNames() {
  const fromPs = await getPrinterNamesFromPowerShell();
  if (fromPs.length) return fromPs;
  return getPrinterNamesFromPdfToPrinter();
}

function sortPrinterNamesForUi(names) {
  return [...names].sort((a, b) => {
    const aPort = /\(\d+\s*복사\)|\(\d+/i.test(a) ? 1 : 0;
    const bPort = /\(\d+\s*복사\)|\(\d+/i.test(b) ? 1 : 0;
    if (aPort !== bPort) return aPort - bPort;
    return a.localeCompare(b, 'ko');
  });
}

module.exports = {
  formatPrinterDisplayName,
  getInstalledPrinterNames,
  sortPrinterNamesForUi,
};
