/**
 * PC 카카오톡 반자동 전송 — 메시지 치환 및 클립보드/카톡 실행
 * (레퍼런스: lilymagerp-v4_supa/src/lib/kakaotalk-helper.ts)
 */

export interface KakaoPcMessageParams {
  customerName: string;
  shopName: string;
}

/** 템플릿 변수 치환: {고객명}, {회사명}, {지점명}(회사명 별칭) */
export function formatKakaoPcMessage(templateContent: string, params: KakaoPcMessageParams): string {
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
 * PC 카카오톡 실행 + 메시지 클립보드 복사
 * Electron: triggerKakaotalkPaste IPC / 웹: kakaotalk://friend/add URI
 */
export async function launchKakaotalkMessage(
  contact: string,
  message: string,
  customerName?: string,
): Promise<{ success: boolean; error?: unknown }> {
  try {
    const cleanedContact = normalizeKoreanPhone(contact);

    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(message);
    }

    const kakaoUrl = `kakaotalk://friend/add?phone=${encodeURIComponent(cleanedContact)}`;

    if (typeof window !== 'undefined') {
      const electronAPI = (window as Window & { electronAPI?: { triggerKakaotalkPaste?: (msg: string, name: string) => Promise<{ success: boolean }> } }).electronAPI;
      if (electronAPI?.triggerKakaotalkPaste) {
        await electronAPI.triggerKakaotalkPaste(message, customerName || '');
        return { success: true };
      }

      window.location.href = kakaoUrl;
    }

    return { success: true };
  } catch (error) {
    console.error('[KakaotalkHelper] 발송 오류:', error);
    return { success: false, error };
  }
}
