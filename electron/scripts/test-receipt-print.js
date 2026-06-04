/**
 * 터미널에서 영수증 인쇄 파이프라인만 검증 (Electron 없이)
 * 사용: node electron/scripts/test-receipt-print.js "Xprinter XP-D10"
 */
const path = require('path');
const fs = require('fs');

const printerName = process.argv[2] || 'Xprinter XP-D10';
const { printReceiptHtml } = require('../receiptPrint');
const { generateHtmlReceipt } = require('../printEngine');

const bridgeAssets = path.join(__dirname, '..', '..', 'bridge-assets');
const html = generateHtmlReceipt(
  {
    job_type: 'delivery_shop',
    printer_type: 'pos',
    payload: {
      orderId: 'TEST-CLI',
      orderer: { name: 'CLI테스트', contact: '010-1234-5678' },
      items: [{ name: '테스트 상품', quantity: 1, price: 1000 }],
      summary: { subtotal: 1000, deliveryFee: 0, total: 1000 },
      deliveryInfo: {
        recipientName: '받는분',
        recipientContact: '010-9999-0000',
        address: '테스트 주소',
        date: '2026-06-03',
        time: '14:00',
      },
    },
  },
  { receiptPrinterType: 'pos', printerName },
  bridgeAssets,
  '테스트지점',
  ''
);

console.log('HTML length:', html.length);
console.log('Target printer:', printerName);

printReceiptHtml(html, printerName, {
  appIsPackaged: false,
  resourcesPath: '',
  receiptPrinterType: 'pos',
  logFn: (m) => console.log('[print]', m),
})
  .then(() => console.log('DONE — 프린터에서 출력 확인'))
  .catch((e) => {
    console.error('FAIL:', e.message);
    process.exit(1);
  });
