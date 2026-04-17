/**
 * 카카오T 배송 웹훅 시뮬레이션 테스트 스크립트
 */

async function testKakaoDeliveryWebhook() {
  const baseUrl = 'http://localhost:3000';
  
  // 1. 배차 완료 (ALLOCATED)
  const allocatedPayload = {
    trackingId: 'TRACK_001',
    eventType: 'ALLOCATED',
    driverName: '김배달 기사님',
    driverPhone: '010-9999-8888',
    trackingUrl: 'https://map.kakao.com/tracking/TRACK_001'
  };

  console.log('--- Simulating KakaoT Webhook [ALLOCATED] ---');
  try {
    const res1 = await fetch(`${baseUrl}/api/delivery/webhook/kakao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(allocatedPayload)
    });
    console.log('ALLOCATED Response:', await res1.text());
  } catch (err) {
    console.error('ALLOCATED Error:', err);
  }

  // 2. 배송 완료 (DELIVERED_DONE)
  const deliveredPayload = {
    trackingId: 'TRACK_001',
    eventType: 'DELIVERED_DONE',
    photoUrl: 'https://placehold.co/600x400/png?text=Delivery+Photo'
  };

  console.log('\n--- Simulating KakaoT Webhook [DELIVERED_DONE] ---');
  try {
    const res2 = await fetch(`${baseUrl}/api/delivery/webhook/kakao`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deliveredPayload)
    });
    console.log('DELIVERED_DONE Response:', await res2.text());
  } catch (err) {
    console.error('DELIVERED_DONE Error:', err);
  }
}

testKakaoDeliveryWebhook();
