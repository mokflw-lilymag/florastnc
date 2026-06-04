const fs = require('fs');
const path = require('path');

// 헬퍼: 연락처 뒷 4자리만 추출
function lastFour(contact) {
  if (!contact) return '';
  const digits = String(contact).replace(/\D/g, '');
  return digits.slice(-4);
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

// 주문 데이터를 HTML 템플릿으로 변환 (영수증 디자인)
function generateHtmlReceipt(job, settings, bridgeAssetsPath, globalBranchName, globalBranchPhone) {
  const { job_type, type, payload = {}, data = {} } = job || {};
  const actualJobType = type || job_type;
  const actualPayload = Object.keys(data).length > 0 ? data : payload;
  const { orderer, items, summary, pickupInfo, deliveryInfo, message, request } = actualPayload;
  settings = settings || {};

  const dateStr = new Date().toLocaleString('ko-KR');

  const rawOrderId = payload?.orderId || job.order_id || job.id || '';
  const shortOrderId = String(rawOrderId).substring(0, 8);

  const displayName = settings.branchDisplayName || globalBranchName;
  const displayPhone = settings.branchPhone || globalBranchPhone;
  const shopInfoStr = `${displayName} ${displayPhone}`.trim();

  let isCard = false;
  let isRibbon = false;
  const msgContent = message?.text || message?.content;
  if (msgContent && msgContent.trim() !== '') {
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
  if (actualJobType === 'pickup_memo') {
    const pickupTemplatePath = path.join(bridgeAssetsPath, 'receipt-pickup.html');
    let pickupTemplate = fs.existsSync(pickupTemplatePath) ? fs.readFileSync(pickupTemplatePath, 'utf8') : '';
    
    // 픽업 시간 및 픽업자 정보
    const pInfo = pickupInfo || actualPayload.pickupInfo || {};
    const pickupDatetime = `${pInfo.date || ''} ${pInfo.time || ''}`.trim();
    
    const pickerName = pInfo.pickerName || orderer?.name || '익명';
    const pickerContact = lastFour(pInfo.pickerContact || orderer?.phone || orderer?.contact) || '****';
    
    const pickupItemsHtml = (items || []).map(item => `<li>${item.name || ''}</li>`).join('');

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
  if (actualJobType === 'delivery_driver' || actualJobType === 'delivery_driver_self') {
    const driverTemplatePath = path.join(bridgeAssetsPath, 'receipt-delivery-driver.html');
    let driverTemplate = fs.existsSync(driverTemplatePath) ? fs.readFileSync(driverTemplatePath, 'utf8') : '';
    
    let ordererMasked = '';
    let recipientContactStr = '';

    const isSelfDelivery = actualJobType === 'delivery_driver_self';

    if (orderer) {
      if (orderer.is_anonymous || orderer.isAnonymous || actualPayload.is_anonymous) {
        ordererMasked = '익명';
        if (isSelfDelivery) {
           ordererMasked = `익명 (연락처: ${orderer.phone || orderer.contact || ''})`;
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

    const driverItemsHtml = (items || []).map(item => `<li>${item.name || ''}</li>`).join('');

    let driverMessageHtml = '';
    if (msgContent && !message.type?.includes('카드') && !message.type?.toLowerCase().includes('card')) {
      driverMessageHtml = `
      <div style="font-size:12px; margin: 4px 0;">
        <b>메시지(${message.type || '리본'}):</b><br/>
        <span style="white-space: pre-wrap;">${msgContent}</span><br/>
        ${message.sender ? `보내는분: ${message.sender}` : ''}
      </div>`;
    }
    const driverRequestHtml = request ? `<div style="font-size:12px; margin: 4px 0;"><b>요청사항:</b> ${request}</div>` : '';
    
    // 자체배송의 경우 제목에 표시
    let receiptTitleHtml = isSelfDelivery 
      ? `<div class="title">인수증 (매장) <span style="font-size:12px; color:#000; font-weight:bold;">(#${shortOrderId})</span></div>`
      : `<div class="title">인수증 <span style="font-size:12px; color:#000; font-weight:bold;">(#${shortOrderId})</span></div>`;

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
  const shopTemplatePath = path.join(bridgeAssetsPath, 'receipt-delivery-shop.html');
  let shopTemplate = fs.existsSync(shopTemplatePath) ? fs.readFileSync(shopTemplatePath, 'utf8') : '';
  
  const shopItemsHtml = (items || []).map(item => `
    <tr>
      <td>${item.name || ''}</td>
      <td style="text-align:center;">${item.quantity || ''}</td>
      <td class="right">${item.price != null ? item.price.toLocaleString() : ''}</td>
    </tr>
  `).join('');

  let reqHtml = '';
  if (request) {
    reqHtml = `<div class="request-box"><b>요청사항:</b> ${request}</div>`;
  }
  
  let msgHtml = '';
  if (msgContent) {
    msgHtml = `<div class="request-box" style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;"><b>메시지(${message.type || '리본'}):</b><br/><span style="white-space: pre-wrap;">${msgContent}</span>${message.sender ? `<br/>보내는분: ${message.sender}` : ''}</div>`;
  }

  let rName = '', rContact = '', dDatetime = '', dAddr = '';
  if (actualJobType === 'delivery_shop' || actualJobType === 'receipt_shop') {
    rName = deliveryInfo?.recipientName || '';
    rContact = deliveryInfo?.recipientContact || '';
    dDatetime = `${deliveryInfo?.date || ''} ${deliveryInfo?.time || ''}`.trim();
    dAddr = deliveryInfo?.address || '';
  } else if (actualJobType === 'pickup_shop') {
    const pInfo = pickupInfo || actualPayload.pickupInfo || {};
    rName = pInfo.pickerName || orderer?.name || '익명';
    rContact = pInfo.pickerContact || orderer?.phone || orderer?.contact || '';
    dDatetime = `${pInfo.date || ''} ${pInfo.time || ''}`.trim();
    dAddr = '매장 픽업';
  } else {
    dAddr = '현장 구매';
  }

  // 템플릿 변환
  let finalHtml = shopTemplate
    .replace('{{short_order_id}}', shortOrderId)
    .replace('{{print_datetime}}', dateStr)
    .replace('{{orderer_name}}', orderer?.name || '익명')
    .replace('{{orderer_contact}}', orderer?.phone || orderer?.contact || '')
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
  if (actualJobType === 'pickup_shop') {
    finalHtml = finalHtml.replace('<span class="label">배송일시</span>', '<span class="label">픽업일시</span>');
    finalHtml = finalHtml.replace('<span class="label">배송지</span>', '<span class="label">수령방법</span>');
  }

  return finalHtml;
}

module.exports = { generateHtmlReceipt };
