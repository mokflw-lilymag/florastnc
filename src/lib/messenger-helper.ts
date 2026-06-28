/**
 * 다중 국가 메신저 반자동 전송 서비스 헬퍼
 * (카카오톡, 잘로, 라인, 왓츠앱, SMS 대응 및 모바일 웹뷰용 공유 API 탑재)
 */

export interface MessengerParams {
  customerName: string;
  shopName: string;
}

/** 템플릿 변수 치환: {고객명}, {회사명}, {지점명}(회사명 별칭), {사진링크} */
export function formatMessengerMessage(
  templateContent: string,
  params: MessengerParams,
): string {
  let result = templateContent;
  result = result.replace(/{고객명}/g, params.customerName);
  result = result.replace(/{회사명}/g, params.shopName);
  result = result.replace(/{지점명}/g, params.shopName);
  return result;
}

function normalizeKoreanPhone(contact: string): string {
  let cleaned = contact.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('010')) {
    cleaned = '+82' + cleaned.slice(1);
  } else if (cleaned.startsWith('10')) {
    cleaned = '+82' + cleaned;
  }
  return cleaned;
}

/**
 * 선호 메신저 타입별 실행 + 메시지 복사 및 모바일 공유 기능
 */
export async function launchMessengerMessage(
  messenger: 'kakaotalk' | 'zalo' | 'line' | 'whatsapp' | 'sms',
  contact: string,
  message: string,
  customerName?: string,
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const cleanedContact = normalizeKoreanPhone(contact);

    // 1. 메시지 본문 복사 (모바일/PC 공통 복사 보장)
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(message);
    }

    // 2. 모바일 브라우저 / 안드로이드 웹뷰 공유 기능 (Web Share API) 우선 지원
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `${customerName || '고객'}님 알림 안내`,
          text: message,
        });
        return { success: true };
      } catch (shareError) {
        // 사용자가 공유 창을 취소했거나 지원 안 하는 경우 폴백 진행
        console.warn('[MessengerHelper] Web Share API skipped/failed:', shareError);
      }
    }

    // 3. 메신저 앱 실행 URL 구성
    let messengerUrl = '';
    let protocol = '';

    switch (messenger) {
      case 'kakaotalk':
        protocol = 'kakaotalk://';
        messengerUrl = `kakaotalk://friend/add?phone=${encodeURIComponent(cleanedContact)}`;
        break;
      case 'zalo':
        protocol = 'zalo://';
        // 잘로는 번호로 다이렉트 채팅 연결용 웹 링크 또는 프로토콜 제공
        messengerUrl = `https://zalo.me/${contact.replace(/[^0-9]/g, '')}`;
        break;
      case 'line':
        protocol = 'line://';
        messengerUrl = `line://`;
        break;
      case 'whatsapp':
        protocol = 'whatsapp://';
        messengerUrl = `https://wa.me/${contact.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(message)}`;
        break;
      case 'sms':
      default:
        messengerUrl = `sms:${contact.replace(/[^0-9]/g, '')}?body=${encodeURIComponent(message)}`;
        break;
    }

    // 4. 일렉트론 환경 (Windows 데스크톱 앱) 처리
    if (typeof window !== 'undefined') {
      const electronAPI = (window as any).electronAPI;
      if (electronAPI?.triggerMessengerPaste && protocol) {
        await electronAPI.triggerMessengerPaste({ protocol, message });
        return { success: true };
      }

      // 웹 브라우저 환경에서 메신저 앱 실행
      if (messengerUrl) {
        window.location.href = messengerUrl;
      }
    }

    return { success: true };
  } catch (error) {
    console.error('[MessengerHelper] 발송 오류:', error);
    return { success: false, error };
  }
}
