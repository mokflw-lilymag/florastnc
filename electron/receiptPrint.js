/**
 * 웹 PP 브릿지와 동일: HTML → PDF → pdf-to-printer(Sumatra)
 */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { BrowserWindow } = require('electron');
const { requirePrintModule, bridgeAppRoot, resolveModulePath } = require('./printDeps');

const PDF_CLEANUP_DELAY_MS = 12000;
const MIN_PDF_BYTES_WARN = 8000;

/** Electron PDF(file://)만 원격 이미지 제거 — Puppeteer(Chrome)는 dev와 동일하게 유지 */
function prepareHtmlForPrint(html, logFn, { stripRemoteImages = false } = {}) {
  let out = String(html || '');
  if (!stripRemoteImages) return out;
  const hadRemoteImg = /<img[^>]*src=["']https?:\/\//i.test(out);
  if (hadRemoteImg) {
    out = out.replace(/<img[^>]*src=["']https?:\/\/[^"']+["'][^>]*\/?>/gi, '');
    if (logFn) logFn('원격 이미지 제거(Electron PDF 전용)');
  }
  return out;
}

function schedulePdfCleanup(pdfPath, logFn) {
  if (!pdfPath) return;
  if (logFn) logFn(`PDF 임시파일 ${PDF_CLEANUP_DELAY_MS / 1000}s 후 삭제: ${pdfPath}`);
  setTimeout(() => {
    try {
      if (fs.existsSync(pdfPath)) fs.unlinkSync(pdfPath);
    } catch (_) {}
  }, PDF_CLEANUP_DELAY_MS);
}

function warnIfPdfSmall(stat, logFn) {
  if (stat.size < MIN_PDF_BYTES_WARN && logFn) {
    logFn(`WARN: PDF 크기가 작습니다 (${stat.size} bytes) — 빈 출력 가능`);
  }
}

function loadPdfToPrinter() {
  return requirePrintModule('pdf-to-printer');
}

function loadPuppeteer() {
  return requirePrintModule('puppeteer-core');
}

function getSumatraPdfPath(appIsPackaged, resourcesPath) {
  const candidates = [];
  if (appIsPackaged) {
    candidates.push(path.join(resourcesPath, 'engine', 'SumatraPDF-3.4.6-32.exe'));
  }
  const bridgeRoot = bridgeAppRoot();
  candidates.push(
    path.join(bridgeRoot, 'SumatraPDF-3.4.6-32.exe'),
    path.join(bridgeRoot, 'pdf-to-printer', 'dist', 'SumatraPDF-3.4.6-32.exe'),
    path.join(bridgeRoot, 'node_modules', 'pdf-to-printer', 'dist', 'SumatraPDF-3.4.6-32.exe')
  );
  const roaming = process.env.APPDATA
    ? path.join(process.env.APPDATA, 'floxyncBridge', 'SumatraPDF-3.4.6-32.exe')
    : null;
  if (roaming) candidates.push(roaming);

  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  throw new Error(
    'SumatraPDF 실행 파일을 찾을 수 없습니다. PP 브릿지 설치 또는 bridge-app/SumatraPDF-3.4.6-32.exe 를 확인하세요.'
  );
}

function findChromeExecutable() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

let puppeteerBrowser = null;

async function getPuppeteerBrowser(logFn) {
  if (puppeteerBrowser && puppeteerBrowser.isConnected()) return puppeteerBrowser;
  const puppeteer = loadPuppeteer();
  const executablePath = findChromeExecutable();
  if (!executablePath) {
    throw new Error('Chrome/Edge가 필요합니다. 영수증 PDF 변환에 사용됩니다.');
  }
  if (logFn) logFn('Puppeteer launch (PP 브릿지와 동일 경로)...');
  puppeteerBrowser = await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--headless',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ],
  });
  return puppeteerBrowser;
}

async function htmlToPdfWithPuppeteer(html, logFn, isLabel = false) {
  const browser = await getPuppeteerBrowser(logFn);
  const page = await browser.newPage();
  const tempPdfPath = path.join(os.tmpdir(), `floxync_receipt_${Date.now()}.pdf`);

  try {
    await page.setViewport({ width: 302, height: 100 });
    await page.setContent(html, { waitUntil: 'load', timeout: 20000 });
    await page.addScriptTag({
      content: 'document.title = String(document.body.scrollHeight);',
    });
    const title = await page.title();
    const contentHeight = parseInt(title, 10) || 297;
    let heightInMm = Math.ceil(contentHeight * 0.264583) + 5;
    if (heightInMm < 85) heightInMm = 85;

    const pdfOptions = {
      path: tempPdfPath,
      width: '80mm',
      height: `${heightInMm}mm`,
      printBackground: true,
      pageRanges: '1',
    };
    // 라벨(80mm): 72mm 본문을 좌우 4mm 여백으로 PDF 단계에서 중앙 정렬
    if (isLabel) {
      pdfOptions.margin = { top: '0mm', bottom: '0mm', left: '4mm', right: '4mm' };
    }
    await page.pdf(pdfOptions);

    const stat = fs.statSync(tempPdfPath);
    if (stat.size < 200) {
      throw new Error(`PDF 파일이 비어 있습니다. (${stat.size} bytes)`);
    }
    warnIfPdfSmall(stat, logFn);
    if (logFn) logFn(`Puppeteer PDF ${heightInMm}mm (${stat.size} bytes)`);
    return { tempPdfPath, heightInMm };
  } finally {
    try {
      await page.close();
    } catch (_) {}
  }
}

async function htmlToPdfWithElectron(html, logFn, isLabel = false) {
  const tempHtml = path.join(os.tmpdir(), `floxync_receipt_${Date.now()}.html`);
  const tempPdfPath = path.join(os.tmpdir(), `floxync_receipt_${Date.now()}.pdf`);
  const printWin = new BrowserWindow({
    show: false,
    skipTaskbar: true,
    x: -30000,
    y: -30000,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
    },
  });

  try {
    fs.writeFileSync(tempHtml, html, 'utf8');
    await printWin.loadFile(tempHtml);
    await new Promise((r) => setTimeout(r, 500));

    const scrollHeight = await printWin.webContents.executeJavaScript(
      'Math.max(document.body.scrollHeight, document.documentElement.scrollHeight, 200)'
    );
    let heightInMm = Math.ceil(Number(scrollHeight) * 0.264583) + 5;
    if (heightInMm < 85) heightInMm = 85;

    const pdfBuffer = await printWin.webContents.printToPDF({
      printBackground: true,
      margins: isLabel
        ? { marginType: 'custom', top: 0, bottom: 0, left: 0.16, right: 0.16 }
        : { marginType: 'none' },
      pageSize: { width: 80000, height: heightInMm * 1000 },
    });
    fs.writeFileSync(tempPdfPath, pdfBuffer);

    const stat = fs.statSync(tempPdfPath);
    if (stat.size < 200) {
      throw new Error(`Electron PDF가 비어 있습니다. (${stat.size} bytes)`);
    }
    warnIfPdfSmall(stat, logFn);
    if (logFn) logFn(`Electron PDF ${heightInMm}mm (${stat.size} bytes)`);
    return { tempPdfPath, heightInMm };
  } finally {
    try {
      if (!printWin.isDestroyed()) printWin.destroy();
    } catch (_) {}
    try {
      if (fs.existsSync(tempHtml)) fs.unlinkSync(tempHtml);
    } catch (_) {}
  }
}

async function printReceiptHtml(html, targetPrinter, options = {}) {
  const {
    appIsPackaged,
    resourcesPath,
    logFn,
    receiptPrinterType = 'pos',
  } = options;

  if (!html || html.length < 80) {
    throw new Error('영수증 HTML이 비어 있습니다. bridge-assets 템플릿을 확인하세요.');
  }
  if (!targetPrinter?.trim()) {
    throw new Error('프린터 이름이 비어 있습니다.');
  }

  const ptp = loadPdfToPrinter();
  const sumatraPdfPath = getSumatraPdfPath(appIsPackaged, resourcesPath);

  const isLabel = receiptPrinterType === 'label';
  let tempPdfPath;
  let heightInMm;

  const chromePath = findChromeExecutable();
  const puppeteerPath = resolveModulePath('puppeteer-core');
  const canUsePuppeteer = !!(chromePath && puppeteerPath);

  if (canUsePuppeteer) {
    const preparedHtml = prepareHtmlForPrint(html, logFn, { stripRemoteImages: false });
    if (logFn) {
      logFn(
        `Puppeteer PDF (${appIsPackaged ? '설치본+Chrome' : 'dev'}) chrome=${chromePath}`
      );
    }
    try {
      ({ tempPdfPath, heightInMm } = await htmlToPdfWithPuppeteer(
        preparedHtml,
        logFn,
        isLabel
      ));
    } catch (puppeteerErr) {
      if (logFn) logFn(`Puppeteer PDF 실패: ${puppeteerErr.message}, Electron PDF 시도`);
      const electronHtml = prepareHtmlForPrint(html, logFn, { stripRemoteImages: true });
      ({ tempPdfPath, heightInMm } = await htmlToPdfWithElectron(
        electronHtml,
        logFn,
        isLabel
      ));
    }
  } else {
    if (logFn) {
      logFn(
        `Electron PDF (${appIsPackaged ? '설치본' : 'dev'})` +
          (chromePath ? '' : ' Chrome/Edge 없음') +
          (puppeteerPath ? '' : ' puppeteer-core 없음')
      );
    }
    const electronHtml = prepareHtmlForPrint(html, logFn, { stripRemoteImages: appIsPackaged });
    ({ tempPdfPath, heightInMm } = await htmlToPdfWithElectron(
      electronHtml,
      logFn,
      isLabel
    ));
  }

  try {
    const base = {
      printer: targetPrinter,
      sumatraPdfPath,
      silent: true,
    };

    if (logFn) {
      logFn(
        `인쇄 mode=${receiptPrinterType} printer="${targetPrinter}" (Sumatra)`
      );
    }

    // POS: 기존과 동일 — noscale만, paperSize 없음
    if (!isLabel) {
      await ptp.print(tempPdfPath, { ...base, scale: 'noscale' });
      if (logFn) logFn('pdf-to-printer.print OK scale=noscale');
      await new Promise((r) => setTimeout(r, 500));
      schedulePdfCleanup(tempPdfPath, logFn);
      return;
    }

    // 라벨 80mm: dev에서 성공한 조합 — noscale + paper 먼저
    const paperH = Math.min(Math.max(heightInMm, 85), 200);
    const paperSize = `80x${paperH}mm`;
    const labelAttempts = [
      { scale: 'noscale', paperSize },
      { scale: 'fit', paperSize },
      { scale: 'noscale' },
      { scale: 'fit' },
    ];
    let lastErr = null;
    for (const attempt of labelAttempts) {
      const opts = { ...base, scale: attempt.scale };
      if (attempt.paperSize) opts.paperSize = attempt.paperSize;
      try {
        if (logFn) {
          logFn(
            `라벨 인쇄 시도 scale=${attempt.scale}` +
              (attempt.paperSize ? ` paper=${attempt.paperSize}` : '')
          );
        }
        await ptp.print(tempPdfPath, opts);
        if (logFn) {
          logFn(
            `pdf-to-printer.print OK scale=${attempt.scale}` +
              (attempt.paperSize ? ` paper=${attempt.paperSize}` : '')
          );
        }
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (logFn) logFn(`라벨 scale=${attempt.scale} 실패: ${e.message}`);
      }
    }
    if (lastErr) {
      throw lastErr;
    }
    await new Promise((r) => setTimeout(r, 500));
    schedulePdfCleanup(tempPdfPath, logFn);
  } catch (printErr) {
    if (tempPdfPath) schedulePdfCleanup(tempPdfPath, logFn);
    throw printErr;
  }
}

const { getInstalledPrinterNames } = require('./printerNames');

module.exports = {
  printReceiptHtml,
  getSumatraPdfPath,
  listInstalledPrinterNames: getInstalledPrinterNames,
};
