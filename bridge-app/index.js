const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync, exec } = require('child_process');
const receiptI18n = require('./receipt-i18n.js');

function parseEnvFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return out;
}

function buildBridgeEnvContent(url, key, branchId) {
  return [
    `SUPABASE_URL=${url}`,
    `SUPABASE_SERVICE_KEY=${key}`,
    `CURRENT_BRANCH_ID=${branchId || ''}`,
    `TENANT_ID=${branchId || ''}`,
    '',
  ].join('\n');
}

function resolveBridgeCredentials(existingPath, installerFolder) {
  const existing = parseEnvFile(existingPath);
  const installer = parseEnvFile(path.join(installerFolder || '', '.env'));
  const bundled = parseEnvFile(path.join(__dirname, '.env'));

  const branchId =
    installer.CURRENT_BRANCH_ID ||
    installer.TENANT_ID ||
    installer.BRANCH_ID ||
    existing.CURRENT_BRANCH_ID ||
    existing.BRANCH_ID ||
    existing.TENANT_ID ||
    '';

  // Already configured: keep DB credentials (reinstall must not break working setup)
  if (existing.SUPABASE_URL && existing.SUPABASE_SERVICE_KEY) {
    return {
      url: existing.SUPABASE_URL,
      key: existing.SUPABASE_SERVICE_KEY,
      branchId: branchId || existing.CURRENT_BRANCH_ID || existing.TENANT_ID || '',
    };
  }

  if (installer.SUPABASE_URL && installer.SUPABASE_SERVICE_KEY) {
    return {
      url: installer.SUPABASE_URL,
      key: installer.SUPABASE_SERVICE_KEY,
      branchId,
    };
  }

  const url =
    bundled.SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    '';
  const key =
    bundled.SUPABASE_SERVICE_KEY ||
    process.env.SUPABASE_SERVICE_KEY ||
    '';

  return { url, key, branchId };
}

function writeBridgeEnvFile(envPath, installerFolder) {
  const creds = resolveBridgeCredentials(envPath, installerFolder);
  if (!creds.url || !creds.key) {
    throw new Error('Supabase credentials missing. Re-download bridge ZIP from Floxync settings.');
  }
  fs.writeFileSync(envPath, buildBridgeEnvContent(creds.url, creds.key, creds.branchId), 'utf8');
  return creds;
}

function updateBranchIdInEnv(envPath, branchId) {
  const creds = resolveBridgeCredentials(envPath, '');
  creds.branchId = branchId;
  fs.writeFileSync(envPath, buildBridgeEnvContent(creds.url, creds.key, creds.branchId), 'utf8');
}

const targetFolder = path.join(os.homedir(), 'AppData', 'Roaming', 'FloxyncBridge');
const exePath = process.execPath;
const currentFolder = path.dirname(exePath);

// 1. Auto-Installation Logic
const isDaemon = process.argv.includes('--daemon') || process.execPath.includes('floxync-daemon.exe');
if (!isDaemon && currentFolder.toLowerCase() !== targetFolder.toLowerCase()) {
  try {
    // Kill existing process if running before overwriting files
    try {
      execSync('taskkill /F /IM floxync-daemon.exe', { stdio: 'ignore' });
      execSync('taskkill /F /IM Floxync-Print-Bridge.exe', { stdio: 'ignore' });
      execSync('powershell -Command "Start-Sleep -Seconds 2"', { stdio: 'ignore' });
    } catch(e) {}

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    try {
      execSync('taskkill /F /IM floxync-daemon.exe', { stdio: 'ignore' });
    } catch(e) {
      // Ignore if not running
    }

    // Copy EXE
    fs.copyFileSync(exePath, path.join(targetFolder, 'floxync-daemon.exe'));
    
    const templates = [
      'receipt-template.html',
      'receipt-pickup.html',
      'receipt-daily-settlement.html',
      'receipt-delivery-shop.html',
      'receipt-delivery-driver.html',
      'receipt-market-list.html',
      'receipt-labels.json',
      'SumatraPDF-3.4.6-32.exe'
    ];
    for (const tpl of templates) {
      const localTpl = path.join(currentFolder, tpl);
      const targetTpl = path.join(targetFolder, tpl);
      const bundledTpl = path.join(__dirname, tpl);

      if (fs.existsSync(localTpl)) {
        fs.copyFileSync(localTpl, targetTpl);
      } else if (fs.existsSync(bundledTpl)) {
        // Extract bundled HTML from pkg snapshot
        fs.writeFileSync(targetTpl, fs.readFileSync(bundledTpl));
      }
    }

    // 파일 복사 후 인터넷 다운로드 차단(Mark of the Web) 해제하여 VBS 실행 오류 방지
    try {
      execSync(`powershell -Command "Unblock-File -Path '${targetFolder}\\floxync-daemon.exe'"`, { stdio: 'ignore' });
      execSync(`powershell -Command "Unblock-File -Path '${targetFolder}\\SumatraPDF-3.4.6-32.exe'"`, { stdio: 'ignore' });
    } catch(e) {}


    // Create hidden VBS wrapper in targetFolder
    const vbsCode = `
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "${targetFolder}"
WshShell.Run chr(34) & "${targetFolder}\\floxync-daemon.exe" & chr(34), 0, False
Set WshShell = Nothing
    `.trim();
    const wrapperVbs = path.join(targetFolder, 'ppbridge.vbs');
    fs.writeFileSync(wrapperVbs, vbsCode, 'utf8');

    // Register in Registry for Auto-Start
    try {
      execSync(`reg add HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run /v FloxyncBridge /t REG_SZ /d "wscript.exe \\"${wrapperVbs}\\"" /f`, { stdio: 'ignore' });
    } catch(e) {
      console.error("Registry add failed", e);
    }

    const envPath = path.join(targetFolder, '.env');
    writeBridgeEnvFile(envPath, currentFolder);

    // Start the installed background copy
    try {
      execSync(`wscript.exe "${wrapperVbs}"`, { stdio: 'ignore' });
    } catch (err) {
      console.error("VBS execution failed, falling back to powershell", err);
      try {
         execSync(`powershell -WindowStyle Hidden -Command "Start-Process '${targetFolder}\\floxync-daemon.exe' -WindowStyle Hidden"`, { stdio: 'ignore' });
      } catch(e) {}
    }

    // Show success message
    execSync(`powershell -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('PP 브릿지 설치가 완료되었습니다!' + [Environment]::NewLine + [Environment]::NewLine + '이제 백그라운드에서 조용히 실행되며, 컴퓨터가 켜질 때마다 자동으로 시작됩니다.', 'LilyMag ERP', 'OK', 'Information')"`);

    process.exit(0);
  } catch (error) {
    execSync(`powershell -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('설치 중 오류가 발생했습니다: ${error.message}', 'LilyMag ERP 오류', 'OK', 'Error')"`);
    process.exit(1);
  }
}

// 2. Background Daemon Logic (Running from %APPDATA%)
const envPath = path.join(targetFolder, '.env');
if (!fs.existsSync(envPath)) {
  try {
    writeBridgeEnvFile(envPath, path.dirname(process.execPath));
  } catch (e) {
    // missing credentials — exit below
  }
}

require('dotenv').config({ path: envPath });
const { createClient } = require('@supabase/supabase-js');
const puppeteer = require('puppeteer-core');
const ptp = require('pdf-to-printer');
const http = require('http');
const WebSocket = require('ws');
global.WebSocket = WebSocket;

// Prevent headless EPIPE crash on Windows
const logFile = fs.createWriteStream(path.join(targetFolder, 'daemon.log'), { flags: 'w' });
console.log = function(...args) {
  logFile.write(new Date().toISOString() + ' [LOG] ' + args.join(' ') + '\n');
};
console.error = function(...args) {
  logFile.write(new Date().toISOString() + ' [ERR] ' + args.join(' ') + '\n');
};

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
let CURRENT_BRANCH_ID = process.env.CURRENT_BRANCH_ID || process.env.BRANCH_ID || '';
const BRIDGE_VERSION = 'v2.6';

function ensureBridgeAsset(filename) {
  const dest = path.join(targetFolder, filename);
  if (fs.existsSync(dest)) return;
  const local = path.join(path.dirname(process.execPath), filename);
  const bundled = path.join(__dirname, filename);
  if (fs.existsSync(local)) {
    fs.copyFileSync(local, dest);
  } else if (fs.existsSync(bundled)) {
    fs.writeFileSync(dest, fs.readFileSync(bundled));
  }
}

let lastHeartbeatTime = 0;
let isPausedLogged = false;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
console.log(`[시스템] Supabase 연결: ${SUPABASE_URL}`);

ensureBridgeAsset('receipt-labels.json');

// 1. 윈도우 설치된 프린터 목록을 ERP(Supabase)에 동기화
async function syncPrinters() {
  try {
    const printers = await getFastPrinters();
    const printerNames = printers.map(p => typeof p === 'string' ? p : (p.name || p.deviceId));
    console.log("🖨️ [시스템] 설치된 프린터 목록:", printerNames);

    if (!CURRENT_BRANCH_ID) return; // No branch set yet, skip pushing to DB

    globalBranchName = CURRENT_BRANCH_ID;
    const settingsId = `settings_${globalBranchName}`;
    const { data: settingsRow } = await supabase
      .from('system_settings')
      .select('data')
      .eq('id', settingsId)
      .single();

    let settingsData = settingsRow?.data || {};
    settingsData.installedPrinters = printerNames;

    await supabase
      .from('system_settings')
      .upsert({ id: settingsId, tenant_id: CURRENT_BRANCH_ID, data: settingsData, updated_at: new Date().toISOString() });

    console.log(`✅ [시스템] 프린터 목록 ERP 동기화 완료 (${globalBranchName})`);
  } catch (err) {
    console.error("❌ 프린터 동기화 오류:", err);
  }
}

// 헬퍼: 연락처 뒷 4자리만 추출
function lastFour(contact) {
  if (!contact) return '';
  const digits = contact.replace(/\D/g, '');
  return digits.slice(-4);
}

function maskPhone(contact) {
  if (!contact) return '';
  const digits = contact.replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
  } else if (digits.length === 10) {
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3');
  }
  return contact;
}

let globalBranchPhone = '';
let globalBranchName = '';

function normalizeReceiptPayload(raw) {
  const payload = raw && typeof raw === 'object' ? { ...raw } : {};
  if (!payload.pickupInfo && payload.pickup_info) payload.pickupInfo = payload.pickup_info;
  if (!payload.deliveryInfo && payload.delivery_info) payload.deliveryInfo = payload.delivery_info;
  if (typeof payload.orderer === 'string') {
    try { payload.orderer = JSON.parse(payload.orderer); } catch (e) {}
  }
  if (typeof payload.items === 'string') {
    try { payload.items = JSON.parse(payload.items); } catch (e) { payload.items = []; }
  }
  if (typeof payload.summary === 'string') {
    try { payload.summary = JSON.parse(payload.summary); } catch (e) {}
  }
  if (typeof payload.message === 'string') {
    try { payload.message = JSON.parse(payload.message); } catch (e) {}
  }
  return payload;
}

function formatReceiptItemLi(item) {
  const name = item.name || '';
  const qty = Number(item.quantity);
  const displayQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
  return `<li>${name} <span style="font-size:11px; font-weight:normal;">x ${displayQty}</span></li>`;
}

// 2. 주문 데이터를 HTML 템플릿으로 변환 (영수증 디자인)
function generateHtmlReceipt(job, settings = {}) {
  const payload = normalizeReceiptPayload(job.payload || job.data || {});
  const job_type = job.type || job.job_type;
  const { orderer, items, summary, pickupInfo, deliveryInfo, message, request } = payload;

  const isPkg = typeof process.pkg !== 'undefined';
  const baseDir = isPkg ? path.dirname(process.execPath) : __dirname;

  const i18n = receiptI18n;
  const ctx = i18n.createReceiptContext(settings, baseDir);
  const { locale, labels, currency, fontFamily } = ctx;
  const dateStr = i18n.formatReceiptDateTime(new Date(), locale);
  const fmt = (amount) => i18n.formatReceiptMoney(amount, currency, locale);
  const tplCtx = { labels, locale, fontFamily };

  const rawOrderId = payload?.orderId || payload?.id || job.order_id || job.id || '';
  const shortOrderId = String(rawOrderId).substring(0, 8);

  const displayName = settings.siteName || settings.branchDisplayName || payload.shop_name || payload.branchName || globalBranchName;
  const displayPhone = settings.contactPhone || settings.branchPhone || payload.shop_phone || globalBranchPhone;

  let logoHtml = '';
  if (payload && payload.logo_url) {
    logoHtml = `<div style="text-align:center;width:100%;margin:0 auto 6px auto;"><img src="${payload.logo_url}" style="display:block;margin:0 auto;max-height:50px;max-width:120px;width:auto;height:auto;object-fit:contain;" alt="Logo" /></div>`;
  }

  const shopInfoStr = `${displayName} ${displayPhone}`.trim();
  const msgContent = message?.text || message?.content;

  let isCard = false;
  let isRibbon = false;
  if (msgContent && String(msgContent).trim() !== '') {
    if (i18n.isCardMessageType(message?.type)) {
      isCard = true;
    } else {
      isRibbon = true;
    }
  }
  const messageTypeCheckHtml = i18n.buildMessageTypeCheckHtml(labels, isRibbon, isCard);

  // ─── 일일 마감정산 영수증 ───
  if (job_type === 'daily_settlement') {
    let settlementTemplate = i18n.loadTemplate(baseDir, 'receipt-daily-settlement.html', tplCtx);
    
    const d = payload || {};
    
    // 지출 리스트 HTML 조립
    let expensesHtml = '';
    if (d.expensesList && d.expensesList.length > 0) {
      expensesHtml += d.expensesList.map(exp => `
        <div class="row"><span class="row-name">${exp.label}</span><span class="row-amount">${exp.amount}</span></div>
      `).join('');
    } else {
      expensesHtml += `<div class="row"><span class="row-name">${labels.no_expenses}</span><span class="row-amount"></span></div>`;
    }
    
    expensesHtml += `
      <div class="row total"><span class="row-name">${labels.expenses_total}</span><span class="row-amount">${d.expensesTotal}</span></div>
    `;

      // 당일 주문 내역 리스트 HTML 조립
      let todayOrdersHtml = '';
      if (d.todayOrdersList && d.todayOrdersList.length > 0) {
        todayOrdersHtml += d.todayOrdersList.map(order => `
          <div class="row"><span class="row-name">${order.name}</span><span class="row-amount">${order.amount}</span></div>
        `).join('');
      }

      // 수금 내역 리스트 HTML 조립
      let collectionsHtml = '';
      if (d.collectionsList && d.collectionsList.length > 0) {
        collectionsHtml += d.collectionsList.map(c => `
          <div class="row"><span class="row-name">${c.name}</span><span class="row-amount">${c.amount}</span></div>
        `).join('');
      }

      // 미수금 내역 리스트 HTML 조립
      let pendingHtml = '';
      if (d.pendingCount > 0 && d.pendingList && d.pendingList.length > 0) {
        pendingHtml += `
          <div class="divider"></div>
          <div class="section-title">${labels.pending_credit}</div>
          <div class="row bold" style="margin-top: 4px;"><span class="row-name">${labels.pending_total} (${d.pendingCount}${labels.orders_unit})</span><span class="row-amount">${d.pendingAmount}</span></div>
        `;
        pendingHtml += d.pendingList.map(p => `
          <div class="row"><span class="row-name">${p.name}</span><span class="row-amount">${p.amount}</span></div>
        `).join('');
      }

      return settlementTemplate
        .replaceAll('{{branch}}', d.branch || shopInfoStr)
        .replaceAll('{{date}}', d.date || '')
        .replaceAll('{{print_datetime}}', dateStr)
        .replaceAll('{{vault_balance}}', d.vaultBalance || '0')
        .replaceAll('{{expenses_html}}', expensesHtml)
        .replaceAll('{{orders_count}}', d.ordersCount || 0)
        .replaceAll('{{orders_amount}}', d.ordersAmount || '0')
        .replaceAll('{{today_orders_html}}', todayOrdersHtml)
        .replaceAll('{{collections_count}}', d.collectionsCount || 0)
        .replaceAll('{{collections_amount}}', d.collectionsAmount || '0')
        .replaceAll('{{collections_html}}', collectionsHtml)
        .replaceAll('{{pending_html}}', pendingHtml);
  }


  // ─── 시장 장보기 리스트 ───
  if (job_type === 'market_list') {
    let marketTemplate = i18n.loadTemplate(baseDir, 'receipt-market-list.html', tplCtx);
    const d = payload || {};
    const batchName = d.batchName || labels.market_default_batch;
    const marketItems = d.items || [];

    let itemsHtml = '';
    if (marketItems.length > 0) {
      itemsHtml = marketItems.map((item) => `
        <tr>
          <td class="center" style="font-size: 14px;">[ ]</td>
          <td>
            <span style="font-weight: bold;">${item.name}</span>
            ${item.supplier ? `<span class="item-supplier">🏪 ${item.supplier}</span>` : ''}
          </td>
          <td class="center" style="font-weight: bold;">${item.quantity}${labels.qty_unit_bundle}</td>
          <td class="right">${item.price ? fmt(Math.round(item.price)) : labels.zero_price}</td>
        </tr>
      `).join('');
    } else {
      itemsHtml = `<tr><td colspan="4" class="center">${labels.no_items}</td></tr>`;
    }

    return marketTemplate
      .replaceAll('{{batch_name}}', batchName)
      .replaceAll('{{print_datetime}}', dateStr)
      .replaceAll('{{branch_name}}', displayName)
      .replaceAll('{{items_html}}', itemsHtml);
  }

  // ─── 프린터 연동 테스트 (템플릿 파일 불필요) ───
  if (job_type === 'print_test') {
    const branchName = settings.siteName || settings.branchDisplayName || globalBranchName || payload.branchName || '';
    return i18n.buildPrintTestHtml(labels, dateStr, branchName, BRIDGE_VERSION);
  }

  // ─── 픽업/현장 예약증: 전용 간결 템플릿 (store_shop·pickup_memo → pickup_shop 동일) ───
  if (job_type === 'pickup_shop' || job_type === 'pickup_memo' || job_type === 'store_shop') {
    let pickupTemplate = i18n.loadTemplate(baseDir, 'receipt-pickup.html', tplCtx);
    if (!pickupTemplate.trim()) {
      return i18n.buildPrintTestHtml(labels, dateStr, displayName, BRIDGE_VERSION)
        .replace(labels.print_test_title, labels.doc_pickup);
    }
    
    // 픽업 시간 및 픽업자 정보
    const pInfo = pickupInfo || payload.pickupInfo || {};
    const pickupDatetime = `${pInfo.date || ''} ${pInfo.time || ''}`.trim();
    
    const pickerName = pInfo.pickerName || orderer?.name || labels.anonymous;
    const pickerContact = lastFour(pInfo.pickerContact || orderer?.phone || orderer?.contact) || '****';
    
    const pickupItemsHtml = (items || []).map(formatReceiptItemLi).join('') || `<li>${labels.no_items}</li>`;

    return pickupTemplate
      .replace('{{pickup_datetime}}', pickupDatetime)
      .replace('{{picker_name}}', pickerName)
      .replace('{{picker_contact_last4}}', pickerContact)
      .replace('{{items_html}}', pickupItemsHtml)
      .replace('{{print_datetime}}', dateStr)
      .replace('{{orderer_name}}', orderer?.name || '')
      .replace('{{short_order_id}}', shortOrderId)
      .replace('{{message_type_checkbox}}', messageTypeCheckHtml);
  }

  // ─── 배송 인수증 (기사용) ───
  if (job_type === 'delivery_driver' || job_type === 'delivery_driver_self') {
    let driverTemplate = i18n.loadTemplate(baseDir, 'receipt-delivery-driver.html', tplCtx);
    
    let ordererMasked = '';
    let recipientContactStr = '';

    const isSelfDelivery = job_type === 'delivery_driver_self';

    if (orderer) {
      if (orderer.is_anonymous || orderer.isAnonymous || payload.is_anonymous) {
        ordererMasked = labels.anonymous;
        if (isSelfDelivery) {
           ordererMasked = `${labels.anonymous} (${labels.contact_prefix}: ${orderer.phone || orderer.contact || ''})`;
        }
      } else {
        if (isSelfDelivery) {
          ordererMasked = `${orderer.name || ''} ${orderer.phone || orderer.contact || ''}`.trim();
        } else {
          ordererMasked = `${orderer.name || ''} ${maskPhone(orderer.phone || orderer.contact)}`.trim();
        }
      }
    }

    if (isSelfDelivery) {
      recipientContactStr = deliveryInfo?.recipientContact || '';
    } else {
      recipientContactStr = maskPhone(deliveryInfo?.recipientContact) || '';
    }

    const driverItemsHtml = (items || []).map(formatReceiptItemLi).join('');
    const msgTypeLabel = message?.type || labels.ribbon_default;

    let driverMessageHtml = '';
    if (msgContent && !i18n.isCardMessageType(message?.type)) {
      driverMessageHtml = `
      <div style="font-size:12px; margin: 4px 0;">
        <b>${labels.message_prefix}(${msgTypeLabel}):</b><br/>
        <span style="white-space: pre-wrap;">${msgContent}</span><br/>
        ${message.sender ? `${labels.sender_prefix}: ${message.sender}` : ''}
      </div>`;
    }
    const driverRequestHtml = request ? `<div style="font-size:12px; margin: 4px 0;"><b>${labels.request_prefix}:</b> ${request}</div>` : '';
    
    // 자체배송의 경우 제목에 표시
    let receiptTitleHtml = isSelfDelivery 
      ? `<div class="title">${labels.delivery_receipt_store} <span style="font-size:12px; color:#000; font-weight:bold;">(#${shortOrderId})</span></div>`
      : `<div class="title">${labels.delivery_receipt} <span style="font-size:12px; color:#000; font-weight:bold;">(#${shortOrderId})</span></div>`;

    let finalHtml = driverTemplate
      .replace('{{short_order_id}}', shortOrderId)
      .replace('{{print_datetime}}', dateStr)
      .replace('{{recipient_name}}', deliveryInfo?.recipientName || '')
      .replace('{{recipient_contact}}', recipientContactStr)
      .replace('{{orderer_masked}}', ordererMasked)
      .replace('{{delivery_datetime}}', `${deliveryInfo?.date || ''} ${deliveryInfo?.time || ''}`.trim())
      .replace('{{delivery_address}}', deliveryInfo?.address || '')
      .replace('{{items_html}}', driverItemsHtml)
      .replace('{{message_type_checkbox}}', messageTypeCheckHtml)
      .replace('{{message_html}}', driverMessageHtml)
      .replace('{{logo_html}}', logoHtml)
      .replace('{{shop_info}}', shopInfoStr)
      .replace('{{logo_html}}', logoHtml);

    // 템플릿에 {{title_html}}이 없으면 맨 위에 주입 (호환성 유지)
    if (finalHtml.includes('{{title_html}}')) {
      finalHtml = finalHtml.replace('{{title_html}}', receiptTitleHtml);
    } else {
      finalHtml = finalHtml.replace('<body>', `<body>${receiptTitleHtml}`);
    }

    return finalHtml;
  }

  // ─── 매장용 주문서 (배송/픽업/현장) ───
  let shopTemplate = i18n.loadTemplate(baseDir, 'receipt-delivery-shop.html', tplCtx);
  
  const withBranding = job_type === 'delivery_shop' || job_type === 'receipt_shop';
  const maskContacts = job_type === 'delivery_shop' || job_type === 'receipt_shop' || job_type === 'store_shop';
  const formatContact = (contact) => {
    if (!contact) return '';
    return maskContacts ? maskPhone(contact) : contact;
  };

  const shopItemsHtml = (items || []).map(item => `
    <tr>
      <td>${item.name || ''}</td>
      <td style="text-align:center;">${item.quantity || ''}</td>
      <td class="right">${item.price != null ? fmt(item.price) : ''}</td>
    </tr>
  `).join('');

  let reqHtml = '';
  if (request) {
    reqHtml = `<div class="request-box"><b>${labels.request_prefix}:</b> ${request}</div>`;
  }
  
  const msgTypeLabel = message?.type || labels.ribbon_default;
  let msgHtml = '';
  if (msgContent) {
    msgHtml = `<div class="request-box" style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;"><b>${labels.message_prefix}(${msgTypeLabel}):</b><br/><span style="white-space: pre-wrap;">${msgContent}</span>${message.sender ? `<br/>${labels.sender_prefix}: ${message.sender}` : ''}</div>`;
  }

  const brandingLogo = withBranding ? logoHtml : '';
  const brandingFooter = withBranding ? shopInfoStr : '';

  let rName = '', rContact = '', dDatetime = '', dAddr = '';
  let docTitle = labels.doc_order_form;
  const pInfo = pickupInfo || payload.pickupInfo || {};

  if (job_type === 'delivery_shop' || job_type === 'receipt_shop') {
    rName = deliveryInfo?.recipientName || '';
    rContact = formatContact(deliveryInfo?.recipientContact);
    dDatetime = `${deliveryInfo?.date || ''} ${deliveryInfo?.time || ''}`.trim();
    dAddr = deliveryInfo?.address || '';
    docTitle = labels.doc_receipt;
  } else if (job_type === 'order_form') {
    if (deliveryInfo?.date || deliveryInfo?.address) {
      rName = deliveryInfo?.recipientName || '';
      rContact = formatContact(deliveryInfo?.recipientContact);
      dDatetime = `${deliveryInfo?.date || ''} ${deliveryInfo?.time || ''}`.trim();
      dAddr = deliveryInfo?.address || '';
    } else if (pInfo.date || pInfo.time || pInfo.pickerName) {
      rName = pInfo.pickerName || orderer?.name || labels.anonymous;
      rContact = formatContact(pInfo.pickerContact || orderer?.phone || orderer?.contact);
      dDatetime = `${pInfo.date || ''} ${pInfo.time || ''}`.trim();
      dAddr = labels.store_pickup;
    } else {
      rName = orderer?.name || labels.anonymous;
      rContact = formatContact(orderer?.phone || orderer?.contact);
      dDatetime = dateStr;
      dAddr = labels.onsite_purchase;
    }
    docTitle = labels.doc_order_form;
  } else {
    dAddr = labels.onsite_purchase;
  }

  const ordererContact = formatContact(orderer?.phone || orderer?.contact);

  let finalHtml = shopTemplate
    .replace('{{doc_title}}', docTitle)
    .replace('{{short_order_id}}', shortOrderId)
    .replace('{{print_datetime}}', dateStr)
    .replace('{{orderer_name}}', orderer?.name || labels.anonymous)
    .replace('{{orderer_contact}}', ordererContact)
    .replace('{{recipient_name}}', rName)
    .replace('{{recipient_contact}}', rContact)
    .replace('{{delivery_datetime}}', dDatetime)
    .replace('{{delivery_address}}', dAddr)
    .replace('{{items_html}}', shopItemsHtml)
    .replace('{{subtotal}}', summary?.subtotal != null ? fmt(summary.subtotal) : '')
    .replace('{{delivery_fee}}', summary?.deliveryFee != null ? fmt(summary.deliveryFee) : '')
    .replace('{{total}}', summary?.total != null ? fmt(summary.total) : '')
    .replace('{{request_html}}', reqHtml)
    .replace('{{message_html}}', msgHtml)
    .replace('{{logo_html}}', brandingLogo)
    .replace('{{shop_info}}', brandingFooter);

  if (!withBranding) {
    finalHtml = finalHtml.replace(/<div class="shop-footer"[^>]*>[\s\S]*?<\/div>/, '');
  }

  if (job_type === 'order_form' && (pickupInfo || payload.pickupInfo)) {
    const pickup = pickupInfo || payload.pickupInfo || {};
    if (pickup.date || pickup.time || pickup.pickerName) {
      finalHtml = finalHtml
        .replace(`<span class="label">${labels.delivery_datetime}</span>`, `<span class="label">${labels.pickup_datetime}</span>`)
        .replace(`<span class="label">${labels.delivery_address}</span>`, `<span class="label">${labels.receive_method}</span>`);
    }
  }

  return finalHtml;
}


// 3. 메인 프로세스
// 3. 메인 프로세스
async function start() {
  console.log('====================================================');
  console.log('🚀 LilyMag Receipt Bridge 가 정상적으로 실행되었습니다!');
  console.log('⚠️ [주의] 이 검은색 창을 끄면 프린터 연결이 즉시 끊어집니다!');
  console.log('⚠️ 반드시 우측 상단의 최소화( - ) 버튼을 눌러서 숨겨두세요.');
  console.log('====================================================');

  await syncPrinters();
  
  // 1분마다 프린터 목록 주기적으로 갱신 (새 프린터 설치 시 자동 반영)
  setInterval(syncPrinters, 60000);

  let executablePath = null;
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of chromePaths) {
    if (fs.existsSync(p)) {
      executablePath = p;
      break;
    }
  }

  let browser;
  try {
    console.log("🔍 브라우저 엔진을 찾고 있습니다...");
    const baseProfileDir = path.join(os.tmpdir(), 'puppeteer_bridge_profile');
    let profileDir = baseProfileDir;
    try {
      if (fs.existsSync(baseProfileDir)) {
        fs.rmSync(baseProfileDir, { recursive: true, force: true });
      }
    } catch (e) {
      console.log("⚠️ 기존 프로필이 잠겨있어 새 프로필을 생성합니다.");
      profileDir = baseProfileDir + '_' + Date.now();
    }

    browser = await puppeteer.launch({ 
      headless: true, // Use old headless for better stability on Windows startup
      executablePath: executablePath,
      userDataDir: profileDir,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage', 
        '--disable-gpu',
        '--disable-software-rasterizer'
      ],
      protocolTimeout: 120000,
      timeout: 120000
    });
  } catch (err) {
    console.error('====================================================');
    console.error("❌ 인쇄 엔진(크롬/엣지) 실행 오류:", err);
    console.error("❌ 구글 크롬 또는 마이크로소프트 엣지가 설치되어 있는지 확인해주세요.");
    console.error('====================================================');
    setTimeout(() => process.exit(1), 30000);
    return;
  }

  // 지점 정보 확인 (Realtime 필터 및 영수증 하단 출력용)
  globalBranchName = CURRENT_BRANCH_ID;
  globalBranchPhone = '';

  // 5. 인쇄 대기열(print_jobs) 주기적 폴링 (Realtime 미작동 대비)
  console.log("🔄 클라우드 인쇄 대기열(print_jobs) 감시를 시작합니다. (3초 간격)");
  
  let isProcessingQueue = false;
  setInterval(async () => {
    if (isProcessingQueue) return;
    isProcessingQueue = true;
    try {
      if (!CURRENT_BRANCH_ID) return;

      // Heartbeat Timeout Check (90 seconds)
      if (lastHeartbeatTime > 0 && Date.now() - lastHeartbeatTime > 90000) {
        if (!isPausedLogged) {
          console.log("⏸️ ERP 웹페이지가 꺼져 있거나 로그아웃 상태입니다. 인쇄를 일시 정지합니다.");
          isPausedLogged = true;
        }
        return;
      } else {
        if (isPausedLogged) {
          console.log("▶️ ERP 웹페이지 접속이 확인되었습니다. 인쇄 대기열 감시를 재개합니다.");
          isPausedLogged = false;
        }
      }

      // 10분 유효시간 제한
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

      const { data: pendingJobs, error: fetchError } = await supabase
        .from('print_jobs')
        .select('*')
        .eq('status', 'pending')
        .eq('user_id', CURRENT_BRANCH_ID)
        .gte('created_at', tenMinutesAgo)
        .order('created_at', { ascending: true })
        .limit(5);

      if (fetchError) {
        console.error("❌ 대기열 조회 오류:", fetchError);
        return;
      }

      for (const job of pendingJobs || []) {
        console.log(`\n📥 새 인쇄 작업 수신: [${job.type || job.job_type}] (ID: ${job.id})`);

        // 먼저 상태를 processing으로 변경하여 중복 처리 방지
        await supabase.from('print_jobs').update({ status: 'processing' }).eq('id', job.id);

        try {
          // 환경 설정(Floxync 및 ERP) 모두 조회
          const { data: settingsRows } = await supabase
            .from('system_settings')
            .select('id, data')
            .in('id', [`settings_${globalBranchName}`, `branch_settings_${globalBranchName}`]);
          
          let settings = {};
          let isBridgeEnabled = false;

          if (settingsRows && settingsRows.length > 0) {
            const floxyncSettings = settingsRows.find(r => r.id === `settings_${globalBranchName}`);
            const erpSettings = settingsRows.find(r => r.id.startsWith('branch_settings_'));
            
            if (job.tenant_id && floxyncSettings) {
              settings = floxyncSettings.data || {};
              isBridgeEnabled = settings.ppBridgeEnabled !== false;
            } else if (job.branch_id && erpSettings) {
              settings = erpSettings.data?.general || {};
              isBridgeEnabled = settings.bridgeEnabled !== false;
            } else if (floxyncSettings) {
              settings = floxyncSettings.data || {};
              isBridgeEnabled = settings.ppBridgeEnabled !== false;
            } else if (erpSettings) {
              settings = erpSettings.data?.general || {};
              isBridgeEnabled = settings.bridgeEnabled !== false;
            }
          }

          if (!isBridgeEnabled) {
              console.log(`⏸️ 브릿지 전원이 OFF 상태입니다. 인쇄 작업(${job.id})을 무시하고 삭제(실패) 처리합니다.`);
              await supabase.from('print_jobs').update({ status: 'failed' }).eq('id', job.id);
              continue;
          }
          // 사용자가 설정한 프린터 타입(pos/label)에 따라 출력 대상 지정
          let targetPrinter = settings.receiptPrinterType === 'label' ? settings.labelPrinterName : settings.printerName;
          
          if (!targetPrinter) {
              console.error("❌ 활성화된 프린터 이름이 설정되지 않았습니다.");
              await supabase.from('print_jobs').update({ status: 'failed' }).eq('id', job.id);
              continue;
          }

          // HTML -> PDF (라벨 프린터 등 기존 그래픽 모드)
          let html = generateHtmlReceipt(job, settings);
          if (!html || !html.trim()) {
            console.error("❌ HTML 생성 실패 — print_test 폴백 사용");
            const baseDir = typeof process.pkg !== 'undefined' ? path.dirname(process.execPath) : __dirname;
            const ctx = receiptI18n.createReceiptContext(settings, baseDir);
            html = receiptI18n.buildPrintTestHtml(ctx.labels, receiptI18n.formatReceiptDateTime(new Date(), ctx.locale), settings.siteName || settings.branchDisplayName || globalBranchName || '', BRIDGE_VERSION);
          }
          
          // 라벨 프린터(절취선 필요)인 경우 하단에 절취선 추가
          if (settings.receiptPrinterType === 'label') {
             html = html.replace('</body>', '<div style="margin-top: 15px; border-top: 1px dashed #000; padding-top: 5px; text-align: center; font-size: 11px; color: #555;">✂절취선✂</div></body>');
          }

          const page = await browser.newPage();
          await page.setViewport({ width: 302, height: 100 });
          await page.setContent(html);
          
          await page.addScriptTag({ content: 'document.title = document.body.scrollHeight;' });
          const title = await page.title();
          const contentHeight = parseInt(title, 10) || 297;
          let heightInMm = Math.ceil(contentHeight * 0.264583) + 5; // Add 5mm padding
          if (heightInMm < 85) heightInMm = 85; // 최소 85mm 보장하여 가로/세로 자동회전(Landscape) 현상 방지
          const tempPdfPath = path.join(targetFolder, `temp_receipt_${job.id}.pdf`);
          await page.pdf({ 
              path: tempPdfPath,
              width: '80mm', 
              height: `${heightInMm}mm`, 
              printBackground: true,
              pageRanges: '1'
          });
          await page.close();

          console.log(`🖨️ 프린터 [${targetPrinter}] 로 인쇄를 요청합니다... (계산된 길이: ${heightInMm}mm)`);

          const sumatraDest = path.join(targetFolder, 'SumatraPDF-3.4.6-32.exe');
          if (!fs.existsSync(sumatraDest)) {
            const sumatraSrc = path.join(__dirname, 'node_modules', 'pdf-to-printer', 'dist', 'SumatraPDF-3.4.6-32.exe');
            fs.copyFileSync(sumatraSrc, sumatraDest);
          }

          const printOptions = {
              printer: targetPrinter, 
              sumatraPdfPath: sumatraDest,
              scale: "fit"
          };
          
          // 라벨 프린터일 경우에만 용지 사이즈 강제 지정 (라벨지 사이즈 호환을 위해)
          if (settings.receiptPrinterType === 'label') {
              printOptions.paperSize = `80x${heightInMm}mm`;
          }

          await ptp.print(tempPdfPath, printOptions);
          
          // 완료 처리
          fs.unlinkSync(tempPdfPath);
          await supabase.from('print_jobs').update({ status: 'printed' }).eq('id', job.id);
          console.log(`✅ 인쇄 완료!`);
          
          // 연속 인쇄 시 프린터 버퍼 오버플로우 방지 (1.5초 대기)
          await new Promise(resolve => setTimeout(resolve, 1500));


        } catch (err) {
          console.error("❌ 처리 중 오류 발생:", err);
          await supabase.from('print_jobs').update({ status: 'failed' }).eq('id', job.id);
        }
      }
    } catch (err) {
      console.error("❌ 대기열 처리 중 오류:", err);
    } finally {
      isProcessingQueue = false;
    }
  }, 3000);


}

let cachedPrinters = null;
let printersPromise = null;

function getFastPrinters() {
  return new Promise((resolve) => {
    exec('powershell -NoProfile -Command "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; Get-Printer | Select-Object -ExpandProperty Name"', { timeout: 3000, encoding: 'utf8' }, (error, stdout) => {
      if (error) {
        exec('cmd.exe /c chcp 65001 >NUL && wmic printer get name', { timeout: 3000, encoding: 'utf8' }, (err2, stdout2) => {
           if (err2) return resolve([]);
           const lines = stdout2.split('\n').map(l => l.trim()).filter(l => l && l.toLowerCase() !== 'name');
           resolve(lines);
        });
        return;
      }
      const lines = stdout.split('\n').map(l => l.trim()).filter(l => l);
      resolve(lines);
    });
  });
}

// 백그라운드에서 주기적으로 프린터 목록을 갱신 (명령어 실행 지연으로 인한 타임아웃 방지)
async function updatePrintersCache() {
  printersPromise = getFastPrinters().then(printers => {
    cachedPrinters = printers;
    return cachedPrinters;
  }).catch(err => {
    console.error("❌ 프린터 목록 갱신 실패:", err);
    return cachedPrinters || [];
  });
  await printersPromise;
}
// 5초마다 갱신 (더 빠르게)
setInterval(updatePrintersCache, 5000);
updatePrintersCache(); // 시작 시 즉시 1회 갱신

// 4. 로컬 하트비트 서버 (ERP에서 PP ON 상태 확인용)
const server = http.createServer(async (req, res) => {
  // CORS 처리
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Access-Control-Request-Private-Network, Authorization');
  res.setHeader('Access-Control-Allow-Private-Network', 'true');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.url === '/') {
    lastHeartbeatTime = Date.now();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Print POS Bridge is running', branch_id: CURRENT_BRANCH_ID, version: BRIDGE_VERSION }));
  } else if (req.url === '/api/version') {
    lastHeartbeatTime = Date.now();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', version: BRIDGE_VERSION, branch_id: CURRENT_BRANCH_ID }));
  } else if (req.url === '/printers') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (cachedPrinters === null) {
      res.end(JSON.stringify({ printers: ["브릿지 로딩중... 10초 뒤 다시 열어주세요"] }));
    } else {
      res.end(JSON.stringify({ printers: cachedPrinters || [] }));
    }
    return;
  } else if (req.url.startsWith('/set_tenant')) {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const newBranchId = url.searchParams.get('id');
    if (newBranchId && newBranchId !== CURRENT_BRANCH_ID) {
       console.log(`🔄 새로운 지점 접속 감지됨: ${newBranchId}. 페어링을 시작합니다.`);
       CURRENT_BRANCH_ID = newBranchId;
       
       // .env 파일에 영구 저장하여 재부팅 시에도 유지되도록 함
       const actualEnvPath = path.join(targetFolder, '.env');
       try {
         updateBranchIdInEnv(actualEnvPath, CURRENT_BRANCH_ID);
         console.log(`✅ [시스템] 지점 정보(${CURRENT_BRANCH_ID})가 파일에 영구 저장되었습니다.`);
       } catch (e) {
         console.error("❌ 지점 정보 저장 실패:", e);
       }

       syncPrinters(); // 새 지점에 맞게 프린터 목록 동기화
    }
    lastHeartbeatTime = Date.now(); // 하트비트 갱신
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', branch_id: CURRENT_BRANCH_ID, version: BRIDGE_VERSION }));
  } else if (req.url === '/logs') {
    try {
      const actualLogPath = path.join(targetFolder, 'daemon.log');
      const logContent = fs.readFileSync(actualLogPath, 'utf8');
      const lastLines = logContent.split('\n').slice(-100).join('\n');
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(lastLines);
    } catch (e) {
      res.writeHead(500);
      res.end("Cannot read log file: " + e.message);
    }
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error('====================================================');
    console.error('❌ 이미 브릿지가 실행 중이거나 포트(8004)가 사용 중입니다!');
    console.error('❌ 작업 표시줄 하단이나 숨겨진 아이콘에 검은 창이 있는지 확인해주세요.');
    console.error('====================================================');
    console.log('이 창은 10초 후 자동으로 닫힙니다...');
    setTimeout(() => process.exit(1), 10000);
  } else {
    console.error('❌ 서버 에러:', e);
    setTimeout(() => process.exit(1), 10000);
  }
});

server.listen(8004, '0.0.0.0', () => {
  lastHeartbeatTime = Date.now(); // daemon start grace

  console.log("🟢 [상태 확인] 브릿지 하트비트 서버가 포트 8004 (0.0.0.0)에서 실행 중입니다. (Universal PP 연동)");
});

start();
