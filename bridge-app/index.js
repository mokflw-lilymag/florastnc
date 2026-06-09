const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

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

    // Write initial .env file during installation ONLY if not exists, or preserve branch
    const envPath = path.join(targetFolder, '.env');
    let existingBranchId = '';
    if (fs.existsSync(envPath)) {
      try {
        const existingEnv = fs.readFileSync(envPath, 'utf8');
        const branchMatch = existingEnv.match(/(?:CURRENT_)?BRANCH_ID=(.*)/);
        if (branchMatch && branchMatch[1]) {
          existingBranchId = branchMatch[1].trim();
        }
      } catch(e) {}
    }
    fs.writeFileSync(envPath, `SUPABASE_URL=https://mheqfhiyfsgnsglvxdrn.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZXFmaGl5ZnNnbnNnbHZ4ZHJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE0Mzk5MywiZXhwIjoyMDg5NzE5OTkzfQ.eI8RIAygYVSz0BHiSfK1kNRqfYFBadZ-ub1nt23n1ls
CURRENT_BRANCH_ID=${existingBranchId}
`);

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
  fs.writeFileSync(envPath, `SUPABASE_URL=https://mheqfhiyfsgnsglvxdrn.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZXFmaGl5ZnNnbnNnbHZ4ZHJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE0Mzk5MywiZXhwIjoyMDg5NzE5OTkzfQ.eI8RIAygYVSz0BHiSfK1kNRqfYFBadZ-ub1nt23n1ls
CURRENT_BRANCH_ID=
`);
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
const BRIDGE_VERSION = 'v1.5.1';

let lastHeartbeatTime = 0;
let isPausedLogged = false;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

// 2. 주문 데이터를 HTML 템플릿으로 변환 (영수증 디자인)
function generateHtmlReceipt(job, settings = {}) {
  const payload = job.payload || job.data;
  const job_type = job.type || job.job_type;
  
  if (!payload) {
    throw new Error('인쇄 데이터(payload/data)가 없습니다.');
  }
  
  const orderer = payload.orderer || {};
  const items = payload.items || [];
  const summary = payload.summary || {};
  const pickupInfo = payload.pickupInfo || payload.pickup_info || {};
  const deliveryInfo = payload.deliveryInfo || payload.delivery_info || {};
  const message = payload.message || {};
  const request = payload.request || payload.memo || '';

  const isPkg = typeof process.pkg !== 'undefined';
  const baseDir = isPkg ? path.dirname(process.execPath) : __dirname;
  const dateStr = new Date().toLocaleString('ko-KR');

  const rawOrderId = payload?.orderId || payload?.id || job.order_id || job.id || '';
  const shortOrderId = String(rawOrderId).substring(0, 8);

  const displayName = settings.siteName || settings.branchDisplayName || globalBranchName;
  const displayPhone = settings.contactPhone || settings.branchPhone || globalBranchPhone;
  const shopInfoStr = `${displayName} ${displayPhone}`.trim();

  let logoHtml = '';
  if (payload.logo_url) {
    logoHtml = `<img src="${payload.logo_url}" style="max-width: 120px; height: auto;" alt="Logo">`;
  } else {
    logoHtml = `<img src="https://ecimg.cafe24img.com/pg1472b45444056090/lilymagflower/web/upload/category/logo/v2_d13ecd48bab61a0269fab4ecbe56ce07_lZMUZ1lORo_top.jpg" style="max-width: 120px; height: auto;" alt="LilyMag Flower">`;
  }


  let isCard = false;
  let isRibbon = false;
  if (message?.content && message.content.trim().length > 0) {
    if (message.type === '카드' || message.type?.toLowerCase() === 'card') {
      isCard = true;
    } else {
      isRibbon = true;
    }
  }
  const messageTypeCheckHtml = `
    <div style="font-size:14px; font-weight:bold; margin: 8px 0; padding: 6px; border: 1px solid #000; text-align:center; border-radius: 4px;">
      [${isRibbon ? '☑' : '☐'}] 리본 &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; [${isCard ? '☑' : '☐'}] 카드
    </div>
  `;

  // ─── 픽업 예약 메모: 전용 간결 템플릿 ───
  if (job_type === 'pickup_memo') {
    const pickupTemplatePath = path.join(baseDir, 'receipt-pickup.html');
    let pickupTemplate = fs.existsSync(pickupTemplatePath) ? fs.readFileSync(pickupTemplatePath, 'utf8') : '';
    
    // 픽업 시간 및 픽업자 정보
    const pInfo = pickupInfo || payload.pickupInfo || {};
    const pickupDatetime = `${pInfo.date || ''} ${pInfo.time || ''}`.trim();
    
    const pickerName = pInfo.pickerName || '익명';
    const pickerContact = lastFour(pInfo.pickerContact) || '****';
    
    const pickupItemsHtml = (items || []).map(item => `<li>${item.name}</li>`).join('');

    return pickupTemplate
      .replace('{{pickup_datetime}}', pickupDatetime)
      .replace('{{logo_html}}', logoHtml)
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
    const driverTemplatePath = path.join(baseDir, 'receipt-delivery-driver.html');
    let driverTemplate = fs.existsSync(driverTemplatePath) ? fs.readFileSync(driverTemplatePath, 'utf8') : '';
    
    let ordererMasked = '';
    let recipientContactStr = '';

    const isSelfDelivery = job_type === 'delivery_driver_self';

    if (orderer) {
      if (orderer.is_anonymous || orderer.isAnonymous || payload.is_anonymous) {
        ordererMasked = '익명';
        if (isSelfDelivery) {
           ordererMasked = `익명 (연락처: ${orderer.contact || ''})`;
        }
      } else {
        if (isSelfDelivery) {
          ordererMasked = `${orderer.name || ''} ${orderer.contact || ''}`.trim();
        } else {
          ordererMasked = `${orderer.name || ''} ${maskPhone(orderer.contact)}`.trim();
        }
      }
    }

    if (isSelfDelivery) {
      recipientContactStr = deliveryInfo?.recipientContact || '';
    } else {
      recipientContactStr = maskPhone(deliveryInfo?.recipientContact) || '';
    }

    const driverItemsHtml = (items || []).map(item => `<li>${item.name}</li>`).join('');

    let driverMessageHtml = '';
    if (message?.content && !message.type?.includes('카드') && !message.type?.toLowerCase().includes('card')) {
      driverMessageHtml = `
      <div style="font-size:12px; margin: 4px 0;">
        <b>메시지(${message.type || '리본'}):</b><br/>
        <span style="white-space: pre-wrap;">${message.content}</span><br/>
        ${message.sender ? `보내는분: ${message.sender}` : ''}
      </div>`;
    }
    const driverRequestHtml = request ? `<div style="font-size:12px; margin: 4px 0;"><b>요청사항:</b> ${request}</div>` : '';
    
    // 자체배송의 경우 제목에 표시
    let receiptTitleHtml = isSelfDelivery 
      ? `<div class="title">인수증 (자체배송) <span style="font-size:12px; color:#666; font-weight:normal;">(#${shortOrderId})</span></div>`
      : `<div class="title">인수증 <span style="font-size:12px; color:#666; font-weight:normal;">(#${shortOrderId})</span></div>`;

    let finalHtml = driverTemplate
      .replace('{{short_order_id}}', shortOrderId)
      .replace('{{logo_html}}', logoHtml)
      .replace('{{recipient_name}}', deliveryInfo?.recipientName || '')
      .replace('{{recipient_contact}}', recipientContactStr)
      .replace('{{orderer_masked}}', ordererMasked)
      .replace('{{delivery_datetime}}', `${deliveryInfo?.date || ''} ${deliveryInfo?.time || ''}`.trim())
      .replace('{{delivery_address}}', deliveryInfo?.address || '')
      .replace('{{items_html}}', driverItemsHtml)
      .replace('{{message_type_checkbox}}', messageTypeCheckHtml)
      .replace('{{message_html}}', driverMessageHtml)
      .replace('{{shop_info}}', shopInfoStr);

    // 템플릿에 {{title_html}}이 없으면 맨 위에 주입 (호환성 유지)
    if (finalHtml.includes('{{title_html}}')) {
      finalHtml = finalHtml.replace('{{title_html}}', receiptTitleHtml);
    } else {
      finalHtml = finalHtml.replace('<body>', `<body>${receiptTitleHtml}`);
    }

    return finalHtml;
  }

  // ─── 매장용 주문서 (배송/픽업/현장) ───
  const shopTemplatePath = path.join(baseDir, 'receipt-delivery-shop.html');
  let shopTemplate = fs.existsSync(shopTemplatePath) ? fs.readFileSync(shopTemplatePath, 'utf8') : '';
  
  const shopItemsHtml = (items || []).map(item => `
    <tr>
      <td>${item.name}</td>
      <td style="text-align:center;">${item.quantity}</td>
      <td class="right">${item.price?.toLocaleString()}</td>
    </tr>
  `).join('');

  let reqHtml = '';
  if (request) {
    reqHtml = `<div class="request-box"><b>요청사항:</b> ${request}</div>`;
  }
  
  let msgHtml = '';
  if (message?.content) {
    msgHtml = `<div class="request-box" style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;"><b>메시지(${message.type || '리본'}):</b><br/><span style="white-space: pre-wrap;">${message.content}</span>${message.sender ? `<br/>보내는분: ${message.sender}` : ''}</div>`;
  }

  let rName = '', rContact = '', dDatetime = '', dAddr = '';
  if (job_type === 'delivery_shop') {
    rName = deliveryInfo?.recipientName || '';
    rContact = deliveryInfo?.recipientContact || '';
    dDatetime = `${deliveryInfo?.date || ''} ${deliveryInfo?.time || ''}`.trim();
    dAddr = deliveryInfo?.address || '';
  } else if (job_type === 'pickup_shop') {
    const pInfo = pickupInfo || payload.pickupInfo || {};
    rName = pInfo.pickerName || orderer?.name || '익명';
    rContact = pInfo.pickerContact || orderer?.contact || '';
    dDatetime = `${pInfo.date || ''} ${pInfo.time || ''}`.trim();
    dAddr = '매장 픽업';
  } else {
    dAddr = '현장 구매';
  }

  // 템플릿 변환
  let finalHtml = shopTemplate
    .replace('{{short_order_id}}', shortOrderId)
    .replace('{{logo_html}}', '') // 주문서에는 로고 없으므로 빈 문자열로 대체 (기존 템플릿 호환성)
    .replace('{{print_datetime}}', dateStr)
    .replace('{{orderer_name}}', orderer?.name || '익명')
    .replace('{{orderer_contact}}', orderer?.contact || '')
    .replace('{{recipient_name}}', rName)
    .replace('{{recipient_contact}}', rContact)
    .replace('{{delivery_datetime}}', dDatetime)
    .replace('{{delivery_address}}', dAddr)
    .replace('{{items_html}}', shopItemsHtml)
    .replace('{{subtotal}}', summary?.subtotal != null ? `${summary.subtotal.toLocaleString()}원` : '')
    .replace('{{delivery_fee}}', summary?.deliveryFee != null ? `${summary.deliveryFee.toLocaleString()}원` : '')
    .replace('{{total}}', summary?.total != null ? `${summary.total.toLocaleString()}원` : '')
    .replace('{{request_html}}', reqHtml)
    .replace('{{message_html}}', msgHtml);

  // 픽업인 경우 라벨 변경
  if (job_type === 'pickup_shop') {
    finalHtml = finalHtml.replace('<span class="label">배송일시</span>', '<span class="label">픽업일시</span>');
    finalHtml = finalHtml.replace('<span class="label">배송지</span>', '<span class="label">수령방법</span>');
  }

  return finalHtml;
}

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
      if (Date.now() - lastHeartbeatTime > 90000) {
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
        console.log(`\n📥 새 인쇄 작업 수신: [${job.job_type}] (ID: ${job.id})`);

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

start();

let cachedPrinters = null;
let printersPromise = null;

const { exec } = require('child_process');

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
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', message: 'Print POS Bridge is running', branch_id: CURRENT_BRANCH_ID, version: BRIDGE_VERSION }));
  } else if (req.url === '/api/version') {
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
       const envContent = `SUPABASE_URL=https://mheqfhiyfsgnsglvxdrn.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZXFmaGl5ZnNnbnNnbHZ4ZHJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE0Mzk5MywiZXhwIjoyMDg5NzE5OTkzfQ.eI8RIAygYVSz0BHiSfK1kNRqfYFBadZ-ub1nt23n1ls
CURRENT_BRANCH_ID=${CURRENT_BRANCH_ID}
`;
       try {
         fs.writeFileSync(actualEnvPath, envContent, 'utf8');
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
  console.log("🟢 [상태 확인] 브릿지 하트비트 서버가 포트 8004 (0.0.0.0)에서 실행 중입니다. (Universal PP 연동)");
});
