import {
  formatMessengerMessage as formatKakaoPcMessage,
  launchMessengerMessage,
} from './messenger-helper';

export { formatKakaoPcMessage };

/**
 * 카카오톡 전용 하위 호환성 랩핑 함수
 */
export async function launchKakaotalkMessage(
  contact: string,
  message: string,
  customerName?: string,
) {
  // 기본 카카오톡 발송으로 연결
  return launchMessengerMessage('kakaotalk', contact, message, customerName);
}
