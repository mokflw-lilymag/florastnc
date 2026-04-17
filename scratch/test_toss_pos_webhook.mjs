import crypto from 'crypto';

/**
 * 토스 POS Webhook 시뮬레이션 테스트 스크립트
 */

async function testTossPosWebhook() {
  const baseUrl = 'http://localhost:3000';
  const webhookSecret = 'toss_test_secret'; // 설정한 시크릿과 동일해야 함
  
  const payload = {
    paymentKey: 'TOSS-PAY-' + Date.now(),
    orderId: 'TOSS-ORD-' + Date.now(),
    approvedAt: new Date().toISOString(),
    totalAmount: 98000,
    method: '카드',
    metadata: {
      customerPhone: '01012345678',
      customerName: '홍길동'
    },
    orderLines: [
      { itemName: '대형 프리미엄 꽃바구니', quantity: 1, unitAmount: 98000, totalAmount: 98000 }
    ]
  };

  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac('sha256', webhookSecret)
    .update(body)
    .digest('hex');

  console.log('--- Simulating Toss POS Webhook ---');
  console.log('Payload:', body);
  console.log('Signature:', signature);

  try {
    const response = await fetch(`${baseUrl}/api/pos/webhook/toss`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'toss-signature': signature
      },
      body: body
    });

    const resultText = await response.text();
    console.log('Response Status:', response.status);
    console.log('Response Body:', resultText);

    if (response.ok) {
      console.log('✅ Toss POS Webhook simulation successful!');
    } else {
      console.log('❌ Toss POS Webhook simulation failed.');
    }
  } catch (error) {
    console.error('Error during fetch:', error);
  }
}

testTossPosWebhook();
