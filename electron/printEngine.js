const fs = require('fs');
const path = require('path');

function resolveI18nModule(bridgeAssetsPath) {
  const candidates = [
    path.resolve(bridgeAssetsPath, 'receipt-i18n.js'),
    path.resolve(__dirname, 'receipt-i18n.js'),
    path.resolve(__dirname, '..', 'bridge-assets', 'receipt-i18n.js'),
  ];
  for (const absPath of candidates) {
    if (fs.existsSync(absPath)) {
      return require(absPath);
    }
  }
  throw new Error(`receipt-i18n.js not found (searched: ${candidates.join(', ')})`);
}

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
  }
  if (digits.length === 10) {
    return digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-***-$3');
  }
  return String(contact);
}

function formatReceiptItemLi(item) {
  const name = item.name || '';
  const qty = Number(item.quantity);
  const displayQty = Number.isFinite(qty) && qty > 0 ? qty : 1;
  return `<li>${name} <span style="font-size:11px; font-weight:normal;">x ${displayQty}</span></li>`;
}

function generateHtmlReceipt(job, settings, bridgeAssetsPath, globalBranchName, globalBranchPhone, options = {}) {
  const i18n = resolveI18nModule(bridgeAssetsPath);
  const { job_type, type, payload = {}, data = {} } = job || {};
  const actualJobType = type || job_type;
  const actualPayload = Object.keys(data).length > 0 ? data : payload;
  const { orderer, items, summary, pickupInfo, deliveryInfo, message, request } = actualPayload;
  settings = settings || {};

  const ctx = i18n.createReceiptContext(settings, bridgeAssetsPath);
  const { locale, labels, currency, fontFamily } = ctx;
  const dateStr = i18n.formatReceiptDateTime(new Date(), locale);
  const fmt = (amount) => i18n.formatReceiptMoney(amount, currency, locale);

  const rawOrderId = actualPayload?.orderId || job.order_id || job.id || '';
  const shortOrderId = String(rawOrderId).substring(0, 8);

  const displayName = settings.siteName || settings.branchDisplayName || actualPayload.shop_name || actualPayload.branchName || globalBranchName;
  const displayPhone = settings.contactPhone || settings.branchPhone || actualPayload.shop_phone || globalBranchPhone;
  const shopInfoStr = `${displayName} ${displayPhone}`.trim();

  let logoHtml = '';
  if ((actualPayload && actualPayload.logo_url) || settings.logo_url) {
    const logoUrl = (actualPayload && actualPayload.logo_url) || settings.logo_url;
    logoHtml = `<div style="text-align:center;width:100%;margin:0 auto 6px auto;"><img src="${logoUrl}" style="display:block;margin:0 auto;max-height:50px;max-width:160px;width:auto;height:auto;object-fit:contain;" alt="" /></div>`;
  }

  const msgContent = message?.text || message?.content;
  let isCard = false;
  let isRibbon = false;
  if (msgContent && String(msgContent).trim() !== '') {
    if (i18n.isCardMessageType(message.type)) {
      isCard = true;
    } else {
      isRibbon = true;
    }
  }
  const messageTypeCheckHtml = i18n.buildMessageTypeCheckHtml(labels, isRibbon, isCard);
  const tplCtx = { labels, locale, fontFamily };

  // ─── 일일 마감정산 ───
  if (actualJobType === 'daily_settlement') {
    let settlementTemplate = i18n.loadTemplate(bridgeAssetsPath, 'receipt-daily-settlement.html', tplCtx);
    const d = actualPayload || {};

    let expensesHtml = '';
    if (d.expensesList && d.expensesList.length > 0) {
      expensesHtml += d.expensesList.map((exp) => `
        <div class="row"><span class="row-name">${exp.label}</span><span class="row-amount">${exp.amount}</span></div>
      `).join('');
    } else {
      expensesHtml += `<div class="row"><span class="row-name">${labels.no_expenses}</span><span class="row-amount"></span></div>`;
    }
    expensesHtml += `
      <div class="row total"><span class="row-name">${labels.expenses_total}</span><span class="row-amount">${d.expensesTotal || ''}</span></div>
    `;

    let todayOrdersHtml = '';
    if (d.todayOrdersList && d.todayOrdersList.length > 0) {
      todayOrdersHtml += d.todayOrdersList.map((order) => `
        <div class="row"><span class="row-name">${order.name}</span><span class="row-amount">${order.amount}</span></div>
      `).join('');
    }

    let collectionsHtml = '';
    if (d.collectionsList && d.collectionsList.length > 0) {
      collectionsHtml += d.collectionsList.map((c) => `
        <div class="row"><span class="row-name">${c.name}</span><span class="row-amount">${c.amount}</span></div>
      `).join('');
    }

    let pendingHtml = '';
    if (d.pendingCount > 0 && d.pendingList && d.pendingList.length > 0) {
      pendingHtml += `
        <div class="divider"></div>
        <div class="section-title">${labels.pending_credit}</div>
        <div class="row bold" style="margin-top: 4px;"><span class="row-name">${labels.pending_total} (${d.pendingCount}${labels.orders_unit})</span><span class="row-amount">${d.pendingAmount}</span></div>
      `;
      pendingHtml += d.pendingList.map((p) => `
        <div class="row"><span class="row-name">${p.name}</span><span class="row-amount">${p.amount}</span></div>
      `).join('');
    }

    return settlementTemplate
      .replaceAll('{{branch}}', d.branch || shopInfoStr)
      .replaceAll('{{date}}', d.date || '')
      .replaceAll('{{print_datetime}}', dateStr)
      .replaceAll('{{vault_balance}}', d.vaultBalance || '0')
      .replaceAll('{{settlement_balance}}', d.settlementBalance || d.settlement_balance || '0')
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
  if (actualJobType === 'market_list') {
    let marketTemplate = i18n.loadTemplate(bridgeAssetsPath, 'receipt-market-list.html', tplCtx);
    const d = actualPayload || {};
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

  // ─── 프린터 연동 테스트 ───
  if (actualJobType === 'print_test') {
    const branchName = settings.siteName || settings.branchDisplayName || globalBranchName;
    return i18n.buildPrintTestHtml(labels, dateStr, branchName, options.bridgeVersion);
  }

  // ─── 픽업/현장 예약증 ───
  if (actualJobType === 'pickup_shop' || actualJobType === 'pickup_memo' || actualJobType === 'store_shop') {
    let pickupTemplate = i18n.loadTemplate(bridgeAssetsPath, 'receipt-pickup.html', tplCtx);
    if (!pickupTemplate.trim()) {
      return i18n.buildPrintTestHtml(labels, dateStr, displayName, options.bridgeVersion)
        .replace(labels.print_test_title, labels.doc_pickup);
    }

    const pInfo = pickupInfo || actualPayload.pickupInfo || actualPayload.pickup_info || {};
    const pickupDatetime = `${pInfo.date || ''} ${pInfo.time || ''}`.trim();
    const pickerName = pInfo.pickerName || orderer?.name || labels.anonymous;
    const pickerContact = lastFour(pInfo.pickerContact || orderer?.phone || orderer?.contact) || '****';
    const pickupItemsHtml = (items || []).map(formatReceiptItemLi).join('');

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
    let driverTemplate = i18n.loadTemplate(bridgeAssetsPath, 'receipt-delivery-driver.html', tplCtx);
    let ordererMasked = '';
    let recipientContactStr = '';
    const isSelfDelivery = actualJobType === 'delivery_driver_self';

    if (orderer) {
      if (orderer.is_anonymous || orderer.isAnonymous || actualPayload.is_anonymous) {
        ordererMasked = labels.anonymous;
        if (isSelfDelivery) {
          ordererMasked = `${labels.anonymous} (${labels.contact_prefix}: ${orderer.phone || orderer.contact || ''})`;
        }
      } else if (isSelfDelivery) {
        ordererMasked = `${orderer.name || ''} ${orderer.phone || orderer.contact || ''}`.trim();
      } else {
        ordererMasked = `${orderer.name || ''} ${maskPhone(orderer.phone || orderer.contact)}`.trim();
      }
    }

    recipientContactStr = isSelfDelivery
      ? (deliveryInfo?.recipientContact || '')
      : (maskPhone(deliveryInfo?.recipientContact) || '');

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

    const receiptTitleHtml = isSelfDelivery
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
      .replace('{{shop_info}}', shopInfoStr);

    if (finalHtml.includes('{{title_html}}')) {
      finalHtml = finalHtml.replace('{{title_html}}', receiptTitleHtml);
    } else {
      finalHtml = finalHtml.replace('<body>', `<body>${receiptTitleHtml}`);
    }
    return finalHtml;
  }

  // ─── 매장용 주문서 / 배송 영수증 / 현장 영수증 ───
  if (actualJobType === 'order_form' || actualJobType === 'delivery_shop' || actualJobType === 'store_shop' || actualJobType === 'receipt_shop') {
    let shopTemplate = i18n.loadTemplate(bridgeAssetsPath, 'receipt-delivery-shop.html', tplCtx);
    const withBranding = actualJobType === 'delivery_shop' || actualJobType === 'receipt_shop';
    const maskContacts = actualJobType === 'delivery_shop' || actualJobType === 'receipt_shop' || actualJobType === 'store_shop';

    const formatContact = (contact) => {
      if (!contact) return '';
      return maskContacts ? maskPhone(contact) : contact;
    };

    const shopItemsHtml = (items || []).map((item) => `
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

    let rName = '';
    let rContact = '';
    let dDatetime = '';
    let dAddr = '';
    let docTitle = labels.doc_order_form;
    const pInfo = pickupInfo || actualPayload.pickupInfo || {};

    if (actualJobType === 'delivery_shop' || actualJobType === 'receipt_shop' || (actualJobType === 'order_form' && deliveryInfo && !pickupInfo?.date)) {
      rName = deliveryInfo?.recipientName || '';
      rContact = formatContact(deliveryInfo?.recipientContact);
      dDatetime = `${deliveryInfo?.date || ''} ${deliveryInfo?.time || ''}`.trim();
      dAddr = deliveryInfo?.address || '';
      if (withBranding) docTitle = labels.doc_receipt;
    } else if (actualJobType === 'order_form' && (pInfo.date || pInfo.time || pInfo.pickerName)) {
      rName = pInfo.pickerName || orderer?.name || labels.anonymous;
      rContact = formatContact(pInfo.pickerContact || orderer?.phone || orderer?.contact);
      dDatetime = `${pInfo.date || ''} ${pInfo.time || ''}`.trim();
      dAddr = labels.store_pickup;
    } else {
      rName = orderer?.name || labels.anonymous;
      rContact = formatContact(orderer?.phone || orderer?.contact);
      dDatetime = dateStr;
      dAddr = labels.onsite_purchase;
      if (actualJobType === 'store_shop') docTitle = labels.doc_receipt;
    }

    const ordererContact = formatContact(orderer?.phone || orderer?.contact);
    const brandingLogo = withBranding ? logoHtml : '';
    const brandingFooter = withBranding ? shopInfoStr : '';

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

    if (actualJobType === 'order_form' && (pInfo.date || pInfo.time || pInfo.pickerName)) {
      finalHtml = finalHtml
        .replace(`<span class="label">${labels.delivery_datetime}</span>`, `<span class="label">${labels.pickup_datetime}</span>`)
        .replace(`<span class="label">${labels.delivery_address}</span>`, `<span class="label">${labels.receive_method}</span>`);
    }

    if (!withBranding) {
      finalHtml = finalHtml.replace(/<div class="shop-footer"[^>]*>[\s\S]*?<\/div>/, '');
    }

    return finalHtml;
  }

  return '';
}

module.exports = { generateHtmlReceipt };
