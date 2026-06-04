const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function testPdf() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 302, height: 100 });
  
  const templatePath = path.join(process.env.APPDATA, 'FloxyncBridge', 'receipt-delivery-shop.html');
  let html = fs.readFileSync(templatePath, 'utf8');
  
  // Replace variables
  html = html.replace('{{short_order_id}}', 'TEST-123');
  html = html.replace('{{print_datetime}}', '2026-5-28 9:42:34 PM');
  html = html.replace('{{orderer_name}}', '테스트 고객');
  html = html.replace('{{orderer_contact}}', '010-1234-5678');
  html = html.replace('{{recipient_name}}', '홍길동');
  html = html.replace('{{recipient_contact}}', '010-9876-5432');
  html = html.replace('{{delivery_datetime}}', '2026-05-29 14:00');
  html = html.replace('{{delivery_address}}', '서울 종로구 세종대로 147-2 (아주아주 긴 상세 주소가 있으면 어떻게 되려나 테스트입니다)');
  
  html = html.replace('{{items_html}}', `
    <tr>
      <td>테스트 상품 (프린터 브릿지 점검용) 이것도 아주 긴 텍스트</td>
      <td style="text-align:center;">1</td>
      <td style="text-align:right;">10,000</td>
    </tr>
  `);
  html = html.replace('{{subtotal}}', '10,000');
  html = html.replace('{{delivery_fee}}', '0');
  html = html.replace('{{total}}', '10,000');
  html = html.replace('{{request_html}}', '');
  html = html.replace('{{message_html}}', '');

  await page.setContent(html, { waitUntil: 'networkidle0' });
  const heightInMm = 100;
  
  const tempPdfPath = path.join(__dirname, 'test_receipt.pdf');
  await page.pdf({ 
      path: tempPdfPath,
      width: '80mm', 
      height: `${heightInMm}mm`, 
      printBackground: true,
      pageRanges: '1'
  });
  await browser.close();
  console.log('PDF saved to', tempPdfPath);
}

testPdf().catch(console.error);
