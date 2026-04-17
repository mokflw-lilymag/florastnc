import crypto from 'crypto';

/**
 * POS Webhook 시뮬레이션 테스트 스크립트
 * 
 * 1. HMAC 서명 생성
 * 2. /api/pos/webhook/easycheck 호출
 * 3. DB 기록 확인 (manual check via logs)
 */

async function testEasyCheckWebhook() {
  const baseUrl = 'http://localhost:3000'; // 로컬 개발 서버 주소
  const webhookSecret = 'test_secret_123'; // 설정 페이지에서 입력할 시크릿과 동일해야 함
  
  const payload = {
    approval_no: 'APP-' + Date.now(),
    approval_date: new Date().toISOString().slice(2, 19).replace(/[-T:]/g, ''), // YYMMDDHHmmss 형식
    amount: 55000,
    store_code: 'STORE_001',
    pay_type: 'CARD',
    customer_phone: '01012345678',
    items: [
      { name: '수국 꽃다발', qty: 1, unit_price: 55000, total_price: 55000 }
    ]
  };

  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  console.log('--- Simulating EasyCheck Webhook ---');
  console.log('Payload:', body);
  console.log('Signature:', signature);

  try {
    const response = await fetch(`${baseUrl}/api/pos/webhook/easycheck`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-easycheck-signature': signature
      },
      body: body
    });

    const resultText = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response Body:', resultText);

    if (response.ok) {
      console.log('✅ Webhook simulation successful!');
    } else {
      console.log('❌ Webhook simulation failed.');
    }
  } catch (error) {
    console.error('Error during fetch:', error);
  }
}

testEasyCheckWebhook();
