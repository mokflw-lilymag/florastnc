const fs = require('fs');
const { Jimp, intToRGBA } = require('jimp');
const iconv = require('iconv-lite');

const ESC = '\x1b';
const GS = '\x1d';

const CMD = {
  INIT: Buffer.from([0x1b, 0x40]), // ESC @
  ALIGN_LEFT: Buffer.from([0x1b, 0x61, 0x00]), // ESC a 0
  ALIGN_CENTER: Buffer.from([0x1b, 0x61, 0x01]), // ESC a 1
  ALIGN_RIGHT: Buffer.from([0x1b, 0x61, 0x02]), // ESC a 2
  BOLD_ON: Buffer.from([0x1b, 0x45, 0x01]), // ESC E 1
  BOLD_OFF: Buffer.from([0x1b, 0x45, 0x00]), // ESC E 0
  DOUBLE_ON: Buffer.from([0x1d, 0x21, 0x11]), // GS ! 11 (Width & Height x2)
  DOUBLE_HEIGHT: Buffer.from([0x1d, 0x21, 0x01]), // GS ! 01 (Height x2)
  DOUBLE_WIDTH: Buffer.from([0x1d, 0x21, 0x10]), // GS ! 10 (Width x2)
  DOUBLE_OFF: Buffer.from([0x1d, 0x21, 0x00]), // GS ! 00
  CUT: Buffer.from([0x1d, 0x56, 0x00]), // GS V 0
  LF: Buffer.from([0x0A])
};

function text(str) {
  if (!str) return Buffer.alloc(0);
  return iconv.encode(str, 'euc-kr');
}

function textLine(str) {
  return Buffer.concat([text(str), CMD.LF]);
}

function hr() {
  return textLine('-'.repeat(42));
}

function hrEq() {
  return textLine('='.repeat(42));
}

// 글자 수 측정 (한글은 2칸, 영문/숫자는 1칸)
function getStringWidth(str) {
  let len = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    if (c > 255) len += 2;
    else len += 1;
  }
  return len;
}

// 왼오른쪽 텍스트 양끝 정렬
function justify(leftStr, rightStr, totalWidth = 42) {
  leftStr = String(leftStr || '');
  rightStr = String(rightStr || '');
  const leftW = getStringWidth(leftStr);
  const rightW = getStringWidth(rightStr);
  let space = totalWidth - leftW - rightW;
  if (space < 1) space = 1;
  return textLine(leftStr + ' '.repeat(space) + rightStr);
}

// 긴 글 줄바꿈 (42자 기준)
function wrapText(str, prefix = '', totalWidth = 42) {
  let result = [];
  const prefixW = getStringWidth(prefix);
  const maxW = totalWidth - prefixW;
  
  let currentLine = '';
  let currentW = 0;
  
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    const w = (char.charCodeAt(0) > 255) ? 2 : 1;
    if (char === '\n') {
      result.push(prefix + currentLine);
      currentLine = '';
      currentW = 0;
      continue;
    }
    if (currentW + w > maxW) {
      result.push(prefix + currentLine);
      currentLine = char;
      currentW = w;
    } else {
      currentLine += char;
      currentW += w;
    }
  }
  if (currentLine) {
    result.push(prefix + currentLine);
  }
  return result.map(l => textLine(l));
}

// 로고 이미지 변환 (방법1: 소프트웨어 비트맵 GS v 0 / 방법2: 하드웨어 NV 로고 FS p)
async function generateLogoBuffer(logoUrl, settings) {
  const useNvLogo = settings?.general?.useNvLogo === true; // 미래에 추가될 NV 설정 옵션
  
  if (useNvLogo) {
    // NV 메모리 1번 로고 인쇄 (가장 확실하고 호환성 높은 방법)
    return Buffer.concat([
      CMD.ALIGN_CENTER,
      Buffer.from([0x1c, 0x70, 0x01, 0x00]), // FS p 1 0
      CMD.LF,
      CMD.ALIGN_LEFT
    ]);
  }

  if (!logoUrl) return Buffer.alloc(0);
  try {
    const resp = await fetch(logoUrl);
    const arrayBuffer = await resp.arrayBuffer();
    const image = await Jimp.read(Buffer.from(arrayBuffer));
    
    // 로고를 현재 크기의 2/3 수준으로 축소 (가로 250px 고정)
    image.resize({ w: 250 }); 
    image.greyscale();
    
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    const xL = Math.ceil(width / 8);
    const xH = 0;
    const yL = height & 0xff;
    const yH = (height >> 8) & 0xff;
    
    const dataLen = xL * height;
    const data = Buffer.alloc(dataLen, 0);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const color = image.getPixelColor(x, y);
        const rgba = intToRGBA(color);
        const intensity = (rgba.r + rgba.g + rgba.b) / 3;
        if (intensity < 180 && rgba.a > 128) {
          const byteIdx = y * xL + Math.floor(x / 8);
          const bitIdx = 7 - (x % 8);
          data[byteIdx] |= (1 << bitIdx);
        }
      }
    }
    
    const header = Buffer.from([0x1d, 0x76, 0x30, 0x00, xL, xH, yL, yH]);
    return Buffer.concat([
      CMD.ALIGN_CENTER,
      header,
      data,
      CMD.LF,
      CMD.ALIGN_LEFT
    ]);
  } catch (e) {
    console.error('Logo Error:', e);
    return Buffer.alloc(0);
  }
}

function maskPhone(contact) {
  if (!contact) return '';
  const digits = String(contact).replace(/\D/g, '');
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{4})(\d{4})/, '$1-****-$3');
  } else if (digits.length === 10) {
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3');
  }
  return String(contact);
}

// 공통 하단 지점 연락처 (로그인한 지점 1개만 출력되도록 개선)
function generateFooterContact(payload, settings) {
  // 페이로드나 세팅에 있는 지점명 및 연락처 추출 (우선순위: payload > settings)
  const branchName = payload?.branch_name || settings?.branchDisplayName || '릴리맥';
  const branchContact = payload?.branch_contact || payload?.branch_phone || settings?.general?.branchContact || settings?.general?.phone || settings?.phone || '';

  let bufs = [];
  bufs.push(CMD.LF);
  bufs.push(CMD.ALIGN_CENTER);
  
  if (branchContact) {
    bufs.push(textLine(`${branchName} : ${branchContact}`));
  } else {
    // 연락처 정보가 아예 없더라도 지점명은 무조건 출력
    bufs.push(textLine(branchName));
  }
  if (settings?.siteWebsite) {
    bufs.push(textLine(`[웹사이트] ${settings.siteWebsite}`));
  }
  bufs.push(CMD.LF);
  
  return Buffer.concat(bufs);
}

// 메시지 타입에 따른 체크박스 렌더링 헬퍼 함수
function getMessageCheckboxLine(message) {
  if (!message || (!message.content && !message.type)) {
    return textLine('[ ] 리본     [ ] 메시지카드     [V] 없음');
  }
  const t = (message.type || '').trim().toLowerCase().replace(/\s/g, '');
  if (t === '없음' || t === 'none') return textLine('[ ] 리본     [ ] 메시지카드     [V] 없음');
  if (t.includes('카드') || t.includes('card')) return textLine('[ ] 리본     [V] 메시지카드     [ ] 없음');
  if (t.includes('리본') || t.includes('ribbon')) return textLine('[V] 리본     [ ] 메시지카드     [ ] 없음');
  
  // 타입이 알 수 없는 값이거나 없는데 내용이 있는 경우 기본 [V] 리본
  return textLine('[V] 리본     [ ] 메시지카드     [ ] 없음');
}

// 연락처 가운데 자리 마스킹 헬퍼 함수
function maskPhone(phone) {
  if (!phone) return '';
  const p = phone.trim();
  const totalDigits = p.replace(/\D/g, '').length;
  if (totalDigits < 4) return p;

  let masked = '';
  let digitsSeen = 0;
  for (let i = 0; i < p.length; i++) {
    const char = p[i];
    if (/\d/.test(char)) {
      digitsSeen++;
      if (totalDigits - digitsSeen < 4) {
        masked += char; // 마지막 4자리는 노출
      } else {
        masked += '*'; // 앞자리는 전부 마스킹
      }
    } else {
      masked += char; // 하이픈 등 기호는 유지
    }
  }
  return masked;
}

// 1. 매장용 주문서 (로고 X, 푸터 X)
function generateRawDeliveryShop(payload, settings, shortOrderId) {
  const d = payload || {};
  let bufs = [];
  
  // 헤더: 체크박스 및 타이틀
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(textLine('[ ] 제작완료'));
  bufs.push(CMD.DOUBLE_ON);
  bufs.push(textLine('주 문 서'));
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine(`(#${shortOrderId})`));
  bufs.push(CMD.BOLD_OFF);
  bufs.push(textLine(`출력일시: ${new Date().toLocaleString()}`));
  bufs.push(CMD.ALIGN_LEFT);
  bufs.push(hrEq());
  
  const oName = d.orderer?.name || '익명';
  const oContact = d.orderer?.contact || '';
  bufs.push(textLine(`주문자: ${oName} ${oContact}`));
  
  bufs.push(CMD.LF);
  
  // HTML 감성을 위한 크고 굵은 강조 텍스트
  const rName = d.deliveryInfo?.recipientName || '';
  const rContact = d.deliveryInfo?.recipientContact || '';
  const dTime = `${d.deliveryInfo?.date || ''} ${d.deliveryInfo?.time || ''}`.trim();
  const address = d.deliveryInfo?.address || '';

  bufs.push(CMD.BOLD_ON);
  bufs.push(CMD.DOUBLE_HEIGHT);
  bufs.push(justify('수령인', `${rName} ${rContact}`));
  bufs.push(justify('배송일시', dTime));
  bufs.push(textLine(`배송지:`));
  bufs.push(...wrapText(address, '    ')); // 들여쓰기
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.BOLD_OFF);
  bufs.push(hr());
  
  // 상품 목록
  bufs.push(justify('상품명', '수량      금액'));
  bufs.push(hr());
  const items = d.items || [];
  for (const it of items) {
    bufs.push(justify(`▶ ${it.name}`, `${it.quantity}개`));
    if (it.price != null) {
      bufs.push(justify('', `${Number(it.price).toLocaleString()}원`));
    }
  }
  bufs.push(hr());
  
  if (d.summary) {
    bufs.push(justify('주문금액', `${Number(d.summary.subtotal || 0).toLocaleString()}원`));
    bufs.push(justify('배송비', `${Number(d.summary.deliveryFee || 0).toLocaleString()}원`));
    bufs.push(CMD.BOLD_ON);
    bufs.push(justify('합계', `${Number(d.summary.total || 0).toLocaleString()}원`));
    bufs.push(CMD.BOLD_OFF);
    bufs.push(hr());
  }

  if (d.request) {
    bufs.push(CMD.BOLD_ON);
    bufs.push(textLine(`[요청사항]`));
    bufs.push(CMD.BOLD_OFF);
    bufs.push(...wrapText(d.request));
    bufs.push(hr());
  }
  
  if (d.message?.content || d.message?.type) {
    bufs.push(getMessageCheckboxLine(d.message));
    if (d.message?.content) {
      bufs.push(...wrapText(d.message.content));
    }
    if (d.message?.sender) {
      bufs.push(textLine(`보내는분: ${d.message.sender}`));
    }
    bufs.push(hrEq());
  }
  
  return Buffer.concat(bufs);
}

// 2. 기사용 인수증 (로고 O, 푸터 O)
function generateRawDeliveryDriver(payload, settings, shortOrderId, jobType) {
  const d = payload || {};
  let bufs = [];
  
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(CMD.DOUBLE_ON);
  bufs.push(CMD.BOLD_ON);
  
  // 자체배송(매장직배)일 경우 타이틀 변경
  const title = (jobType === 'delivery_driver_self') ? '인수증(자)' : '인 수 증';
  bufs.push(textLine(title));
  
  bufs.push(CMD.BOLD_OFF);
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine(`(#${shortOrderId})`));
  bufs.push(CMD.BOLD_OFF);
  bufs.push(textLine(`출력일시: ${new Date().toLocaleString()}`));
  bufs.push(CMD.LF);
  bufs.push(CMD.ALIGN_LEFT);
  bufs.push(hrEq());
  
  const rName = d.deliveryInfo?.recipientName || '익명';
  
  // 자체배송일 경우 연락처 마스킹 해제
  const rawContact = d.deliveryInfo?.recipientContact || '';
  const rContact = (jobType === 'delivery_driver_self') ? rawContact : maskPhone(rawContact);
  
  // 수령인 이름 (가장 크게, 28px 느낌)
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(CMD.DOUBLE_ON);
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine(rName));
  bufs.push(CMD.DOUBLE_OFF);
  
  // 수령인 연락처 (16px 느낌)
  bufs.push(CMD.DOUBLE_HEIGHT);
  bufs.push(textLine(rContact));
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.BOLD_OFF);
  bufs.push(CMD.ALIGN_LEFT);
  bufs.push(hr());
  
  const dTime = `${d.deliveryInfo?.date || ''} ${d.deliveryInfo?.time || ''}`.trim();
  bufs.push(justify('배송일시', dTime));
  
  bufs.push(CMD.BOLD_ON);
  bufs.push(CMD.DOUBLE_HEIGHT);
  bufs.push(textLine(`배송지:`));
  bufs.push(...wrapText(d.deliveryInfo?.address || '', '    '));
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.BOLD_OFF);
  bufs.push(hr());
  
  const items = d.items || [];
  for (const it of items) {
    bufs.push(justify(`▶ ${it.name}`, `${it.quantity}개`));
  }
  bufs.push(hr());
  
  if (d.request) {
    bufs.push(CMD.BOLD_ON);
    bufs.push(textLine(`[요청사항]`));
    bufs.push(CMD.BOLD_OFF);
    bufs.push(...wrapText(d.request));
    bufs.push(hr());
  }
  
  // 메시지 타입 체크박스 구현 (내용은 출력하지 않음)
  bufs.push(getMessageCheckboxLine(d.message));
  bufs.push(hr());

  bufs.push(CMD.LF);
  bufs.push(CMD.BOLD_ON);
  bufs.push(CMD.DOUBLE_HEIGHT);
  bufs.push(textLine('수령 확인 _______________'));
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.BOLD_OFF);
  
  // 푸터 연락처 (로그인 지점)
  bufs.push(generateFooterContact(payload, settings));
  
  return Buffer.concat(bufs);
}

// 3. 픽업 예약증 (로고 X, 푸터 X)
function generateRawPickup(payload, settings, shortOrderId) {
  const d = payload || {};
  let bufs = [];
  
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine(`픽업 예약 (#${shortOrderId})`));
  bufs.push(CMD.BOLD_OFF);
  bufs.push(textLine(`출력일시: ${new Date().toLocaleString()}`));
  bufs.push(CMD.LF);
  bufs.push(CMD.ALIGN_LEFT);
  bufs.push(hrEq());
  
  const pInfo = d.pickupInfo || {};
  const pTime = `${pInfo.date || ''} ${pInfo.time || ''}`.trim();
  const pName = pInfo.pickerName || '익명';
  const pContactStr = pInfo.pickerContact || '';
  const pContactLast4 = pContactStr.replace(/\D/g, '').slice(-4) || '****';

  // 픽업 시간 (18px 느낌 - 굵고 세로로만 살짝 큼)
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(CMD.DOUBLE_HEIGHT);
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine(pTime));
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.BOLD_OFF);
  bufs.push(CMD.LF);
  
  // 수령인 이름 (가장 크게) + 연락처 (작게) 같은 줄에 출력
  bufs.push(CMD.ALIGN_CENTER);
  
  bufs.push(CMD.DOUBLE_ON);
  bufs.push(CMD.BOLD_ON);
  bufs.push(text(pName));
  bufs.push(CMD.DOUBLE_OFF);
  
  bufs.push(text(` `)); // 띄어쓰기 1칸
  
  bufs.push(CMD.DOUBLE_HEIGHT);
  bufs.push(textLine(`(*${pContactLast4})`));
  bufs.push(CMD.DOUBLE_OFF);
  
  bufs.push(CMD.BOLD_OFF);
  bufs.push(CMD.ALIGN_LEFT);
  bufs.push(hr());

  const items = d.items || [];
  for (const it of items) {
    bufs.push(justify(`▶ ${it.name}`, `${it.quantity}개`));
  }
  bufs.push(hr());
  
  // 메시지 타입 체크박스 구현 (내용은 출력하지 않음)
  bufs.push(getMessageCheckboxLine(d.message));
  bufs.push(hr());

  if (d.request) {
    bufs.push(CMD.BOLD_ON);
    bufs.push(textLine('[요청사항]'));
    bufs.push(CMD.BOLD_OFF);
    bufs.push(...wrapText(d.request));
    bufs.push(hr());
  }
  
  return Buffer.concat(bufs);
}

// 4. 마감 정산서 (로고 O, 푸터 X)
function generateRawDailySettlement(payload, settings) {
  const d = payload || {};
  let bufs = [];
  
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(CMD.DOUBLE_ON);
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine('일일 마감 정산서'));
  bufs.push(CMD.BOLD_OFF);
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.LF);
  
  const branchName = d.branch || settings?.branchDisplayName || '릴리맥';
  bufs.push(textLine(`지점: ${branchName}`));
  bufs.push(textLine(`일자: ${d.date || ''}`));
  bufs.push(textLine(`출력일시: ${new Date().toLocaleString()}`));
  bufs.push(CMD.LF);
  bufs.push(CMD.ALIGN_LEFT);
  bufs.push(hrEq());
  
  // 금일 총매출 금액 (아주 크게 강조)
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine('금일 총매출 금액'));
  bufs.push(CMD.LF);
  bufs.push(CMD.DOUBLE_ON);
  bufs.push(textLine(d.ordersAmount || '0원'));
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.LF);
  
  // 시재 잔액
  bufs.push(CMD.ALIGN_RIGHT);
  bufs.push(CMD.DOUBLE_HEIGHT);
  bufs.push(textLine(`시재 잔액: ${d.vaultBalance || '0원'}`));
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.BOLD_OFF);
  bufs.push(CMD.ALIGN_LEFT);
  bufs.push(hr());

  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine('[지출 내역]'));
  bufs.push(CMD.BOLD_OFF);
  (d.expensesList || []).forEach(e => bufs.push(justify(` ${e.label}`, e.amount)));
  bufs.push(hr());
  
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine('[매출 및 수금 요약]'));
  bufs.push(justify(`총 주문 (${d.ordersCount || 0}건)`, d.ordersAmount || '0원'));
  bufs.push(CMD.BOLD_OFF);
  (d.todayOrdersList || []).forEach(o => bufs.push(justify(` ${o.name}`, o.amount)));
  bufs.push(CMD.LF);
  
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine('[이월주문 수금]'));
  bufs.push(justify(`수금 총액 (총 ${d.collectionsCount || 0}건)`, d.collectionsAmount || '0원'));
  bufs.push(CMD.BOLD_OFF);
  (d.collectionsList || []).forEach(c => bufs.push(justify(` ${c.name}`, c.amount)));
  
  if (d.pendingCount > 0) {
    bufs.push(CMD.LF);
    bufs.push(CMD.BOLD_ON);
    bufs.push(textLine('[미수금 내역]'));
    bufs.push(justify(`미수금 총액 (${d.pendingCount}건)`, d.pendingAmount || '0원'));
    bufs.push(CMD.BOLD_OFF);
    (d.pendingList || []).forEach(p => bufs.push(justify(` ${p.name}`, p.amount)));
  }
  
  bufs.push(hrEq());
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(textLine('- 정산 완료 -'));
  bufs.push(CMD.ALIGN_LEFT);
  
  return Buffer.concat(bufs);
}

// 5. 고객용 영수증 (인수증/영수증) (로고 O, 푸터 O)
function generateRawCustomer(payload, settings, shortOrderId) {
  const d = payload || {};
  let bufs = [];
  
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(CMD.DOUBLE_ON);
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine('영 수 증'));
  bufs.push(CMD.BOLD_OFF);
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(textLine(`출력일시: ${new Date().toLocaleString()}`));
  bufs.push(CMD.LF);
  bufs.push(CMD.ALIGN_LEFT);
  
  const branchName = d.branch_name || settings?.branchDisplayName || '릴리맥';
  const bizNumber = d.branch_biz_number || settings?.general?.businessNumber || '';
  const customerName = d.customer_name || d.orderer?.name || '고객';
  
  bufs.push(textLine(`주문번호: #${shortOrderId}`));
  bufs.push(textLine(`주문일자: ${d.date || d.order_date || ''}`));
  bufs.push(textLine(`지 점 명: ${branchName}`));
  bufs.push(textLine(`등록번호: ${bizNumber}`));
  bufs.push(textLine(`고 객 명: ${customerName}`));
  
  bufs.push(hr());
  
  bufs.push(justify('품목명', '수량      금액'));
  bufs.push(hr());
  const items = d.items || [];
  for (const it of items) {
    bufs.push(wrapText(it.name || '', '')[0]);
    bufs.push(justify(`          ${it.quantity}개`, `${Number(it.price || 0).toLocaleString()}원`));
  }
  bufs.push(hr());
  
  if (d.summary || d.total_amount) {
    const totalAmount = d.summary?.total || d.total_amount || 0;
    // 부가세 및 공급가액 역산 (VAT 10%)
    const supplyValue = Math.round(totalAmount / 1.1);
    const vatValue = totalAmount - supplyValue;
    
    bufs.push(justify('공급가액:', `${supplyValue.toLocaleString()}원`));
    bufs.push(justify('부가세:', `${vatValue.toLocaleString()}원`));
    bufs.push(CMD.LF);
    
    bufs.push(CMD.BOLD_ON);
    bufs.push(CMD.DOUBLE_HEIGHT);
    bufs.push(justify('합계금액:', `${Number(totalAmount).toLocaleString()}원`));
    bufs.push(CMD.DOUBLE_OFF);
    bufs.push(CMD.BOLD_OFF);
  }
  
  // 연락처 푸터 (로그인 지점 커스텀)
  const branchContact = d.branch_phone || d.branch_contact || settings?.general?.branchContact || '';
  const branchAddress = d.branch_address || settings?.general?.branchAddress || '';
  
  bufs.push(CMD.LF);
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(textLine('이용해 주셔서 감사합니다.'));
  bufs.push(textLine(`${branchName} ${branchAddress ? '('+branchAddress+')' : ''}`));
  if (branchContact) bufs.push(textLine(`전화: ${branchContact}`));
  bufs.push(CMD.LF);
  
  return Buffer.concat(bufs);
}

// 6. 간이 영수증 (로고 X, 푸터 별도)
function generateRawSimpleReceipt(payload, settings) {
  const d = payload || {};
  let bufs = [];
  
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(CMD.DOUBLE_ON);
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine('간 이 영 수 증'));
  bufs.push(CMD.BOLD_OFF);
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.LF);
  bufs.push(CMD.ALIGN_LEFT);
  
  const customerName = d.customer_name || d.orderer?.name || '고객';
  let totalKorean = d.total_amount_korean || '';
  let totalAmount = d.summary?.total || d.total_amount || 0;
  
  bufs.push(hrEq());
  bufs.push(textLine(`공급받는자: ${customerName} 귀하`));
  bufs.push(hr());
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine(`금액:`));
  bufs.push(textLine(` 일금 ${totalKorean}원 정`));
  bufs.push(textLine(` (\\${Number(totalAmount).toLocaleString()}-)`));
  bufs.push(CMD.BOLD_OFF);
  bufs.push(hrEq());
  
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine('품목 명세:'));
  bufs.push(CMD.BOLD_OFF);
  
  bufs.push(justify('품목', '수량      금액'));
  bufs.push(hr());
  const items = d.items || [];
  if (items.length === 0) {
    bufs.push(justify('상품', `1개      ${Number(totalAmount).toLocaleString()}원`));
  } else {
    for (const it of items) {
      bufs.push(wrapText(it.name || '', '')[0]);
      bufs.push(justify(`          ${it.quantity}개`, `${Number(it.price || 0).toLocaleString()}원`));
    }
  }
  bufs.push(hrEq());
  
  // 공급자 정보 (박스 형태 대신 텍스트로 깔끔하게)
  const branchName = d.branch_name || settings?.branchDisplayName || '릴리맥';
  const manager = d.branch_manager || settings?.general?.managerName || '';
  const bizNumber = d.branch_biz_number || settings?.general?.businessNumber || '';
  const address = d.branch_address || settings?.general?.branchAddress || '';
  
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine('[공급자 정보]'));
  bufs.push(CMD.BOLD_OFF);
  bufs.push(textLine(`상호: ${branchName} (대표: ${manager})`));
  bufs.push(textLine(`등록번호: ${bizNumber}`));
  bufs.push(...wrapText(address, '주소: '));
  bufs.push(hrEq());
  
  bufs.push(CMD.LF);
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(CMD.BOLD_ON);
  bufs.push(textLine('위 금액을 영수함.'));
  bufs.push(CMD.BOLD_OFF);
  
  bufs.push(CMD.ALIGN_RIGHT);
  bufs.push(textLine(`작성일: ${d.order_date || d.date || ''}`));
  bufs.push(CMD.ALIGN_LEFT);
  
  return Buffer.concat(bufs);
}

function generateRawPrintTest(payload, settings, logoUrl) {
  let bufs = [];
  
  bufs.push(CMD.ALIGN_CENTER);
  bufs.push(CMD.DOUBLE_ON);
  bufs.push(textLine('테스트 인쇄'));
  bufs.push(CMD.DOUBLE_OFF);
  bufs.push(CMD.LF);
  bufs.push(textLine('FloXync POS Printer 연동 테스트'));
  bufs.push(textLine('이 인쇄물이 정상적으로 출력되었다면'));
  bufs.push(textLine('프린터가 올바르게 연결된 것입니다.'));
  bufs.push(CMD.LF);
  bufs.push(textLine(`출력일시: ${new Date().toLocaleString()}`));
  bufs.push(CMD.LF);
  bufs.push(hrEq());
  
  const branchName = payload?.branchName || settings?.siteName || settings?.branchDisplayName || '가맹점 미지정';
  bufs.push(textLine(`지점명: ${branchName}`));
  
  bufs.push(hrEq());
  bufs.push(CMD.LF);
  bufs.push(textLine('축하합니다! 테스트 출력이 완료되었습니다.'));
  bufs.push(CMD.LF);
  bufs.push(CMD.LF);
  bufs.push(CMD.LF);
  
  return Buffer.concat(bufs);
}

async function generateEscPosBuffer(job, settings, logoUrl) {
  const { job_type, payload = {} } = job || {};
  const rawOrderId = payload?.orderId || job.order_id || job.id || '';
  const shortOrderId = String(rawOrderId).substring(0, 8);

  const initBuf = CMD.INIT;
  
  // 로고 출력 분기 (인수증/영수증 에만 상단 로고 출력)
  const isLogoNeeded = (job_type === 'customer' || job_type === 'delivery_driver' || job_type === 'delivery_driver_self');
  let logoBuf = Buffer.alloc(0);
  if (isLogoNeeded) {
    logoBuf = await generateLogoBuffer(logoUrl, settings);
  }
  
  let contentBuf = Buffer.alloc(0);

  if (job_type === 'daily_settlement') {
    contentBuf = generateRawDailySettlement(payload, settings);
  } else if (job_type === 'print_test') {
    contentBuf = generateRawPrintTest(payload, settings, logoUrl);
  } else if (job_type === 'pickup_memo' || job_type === 'pickup_shop' || job_type === 'store_shop') {
    contentBuf = generateRawPickup(payload, settings, shortOrderId);
  } else if (job_type === 'delivery_driver' || job_type === 'delivery_driver_self') {
    contentBuf = generateRawDeliveryDriver(payload, settings, shortOrderId, job_type);
  } else if (job_type === 'delivery_shop' || job_type === 'store') {
    contentBuf = generateRawDeliveryShop(payload, settings, shortOrderId);
  } else if (job_type === 'customer') {
    contentBuf = generateRawCustomer(payload, settings, shortOrderId);
  } else if (job_type === 'simple_receipt') {
    contentBuf = generateRawSimpleReceipt(payload, settings);
  } else {
    // 기본값: 매장용 주문서
    contentBuf = generateRawDeliveryShop(payload, settings, shortOrderId);
  }

  const cutBuf = Buffer.concat([CMD.LF, CMD.LF, CMD.LF, CMD.CUT]);
  
  return Buffer.concat([initBuf, logoBuf, contentBuf, cutBuf]);
}

module.exports = {
  generateEscPosBuffer
};
