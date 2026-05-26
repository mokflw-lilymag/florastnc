const fs = require('fs');
const path = require('path');

function lastFour(contact) {
  if (!contact) return '';
  return contact.replace(/\D/g, '').slice(-4);
}

// ── 1. 픽업예약 ──────────────────────────────────────────────
const pickupTemplate = fs.readFileSync(path.join(__dirname, 'receipt-pickup.html'), 'utf8');
const pickupHtml = pickupTemplate
  .replace('{{picker_name}}', '김철수')
  .replace('{{picker_contact_last4}}', '5432')
  .replace('{{orderer_name}}', '홍길동')
  .replace('{{pickup_datetime}}', '05/24 (일) 14:00')
  .replace('{{items_html}}', '<li>빨간 장미 다발</li><li>축하 카드</li><li>리본 포장</li>')
  .replace('{{print_datetime}}', '2026-05-24 08:45:00')
  .replace('{{short_order_id}}', 'abcd1234');
fs.writeFileSync(path.join(__dirname, 'sample-pickup.html'), pickupHtml);

// ── 2. 배송 주문서 (매장용) ──────────────────────────────────
const shopTemplate = fs.readFileSync(path.join(__dirname, 'receipt-delivery-shop.html'), 'utf8');
const shopItemsHtml = [
  '<tr><td>빨간 장미 다발</td><td style="text-align:center;">1</td><td class="right">50,000</td></tr>',
  '<tr><td>축하 카드</td><td style="text-align:center;">1</td><td class="right">2,000</td></tr>',
].join('');
const shopHtml = shopTemplate
  .replace('{{orderer_name}}', '홍길동')
  .replace('{{orderer_contact}}', '010-1234-5678')
  .replace('{{recipient_name}}', '이영희')
  .replace('{{recipient_contact}}', '010-9876-6666')
  .replace('{{delivery_datetime}}', '05/24 (일) 14:00')
  .replace('{{delivery_address}}', '강남구 테헤란로 123, 4층')
  .replace('{{items_html}}', shopItemsHtml)
  .replace('{{subtotal}}', '52,000원')
  .replace('{{delivery_fee}}', '5,000원')
  .replace('{{total}}', '57,000원')
  .replace('{{request_html}}', '<div class="request-box"><b>요청사항:</b> 배송 전 연락주세요</div>')
  .replace('{{message_html}}', '<div class="request-box" style="margin-top: 10px; border-top: 1px dashed #000; padding-top: 10px;"><b>메시지:</b><br/>생일 축하합니다! 항상 건강하고 행복하세요.<br/>보내는분: 홍길동</div>')
  .replace('{{print_datetime}}', '2026-05-24 08:45:00')
  .replace('{{short_order_id}}', 'abcd1234');
fs.writeFileSync(path.join(__dirname, 'sample-delivery-shop.html'), shopHtml);

// ── 3. 배송 인수증 (기사용) ──────────────────────────────────
const driverTemplate = fs.readFileSync(path.join(__dirname, 'receipt-delivery-driver.html'), 'utf8');
const driverItemsHtml = [
  '<li>빨간 장미 다발</li>',
  '<li>축하 카드</li>',
  '<li>리본 포장</li>',
].join('');
const driverHtml = driverTemplate
  .replace('{{recipient_name}}', '이영희')
  .replace('{{recipient_contact}}', '010-****-6666')
  .replace('{{orderer_masked}}', '홍** (1234)')
  .replace('{{delivery_datetime}}', '05/24 (일) 14:00')
  .replace('{{delivery_address}}', '서울특별시 강남구 테헤란로 123, 4층 402호 (역삼동, 릴리맥타워)')
  .replace('{{items_html}}', driverItemsHtml)
  .replace('{{request_html}}', '<div style="font-size:12px; margin: 4px 0;"><b>요청사항:</b> 배송 전 연락주세요</div>')
  .replace('{{message_html}}', '<div style="font-size:12px; margin: 4px 0;"><b>메시지(리본):</b><br/>생일 축하합니다! 항상 건강하고 행복하세요.<br/>보내는분: 홍길동</div>')
  .replace('{{short_order_id}}', 'abcd1234')
  .replace('{{shop_info}}', '릴리맥강남점 02-1234-5678');
fs.writeFileSync(path.join(__dirname, 'sample-delivery-driver.html'), driverHtml);

console.log('Samples generated successfully.');
