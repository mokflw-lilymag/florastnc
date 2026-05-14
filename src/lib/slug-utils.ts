/**
 * 디자인 갤러리 테마(외 기타)의 slug 처리 유틸.
 *
 * - slug 규격: ^[a-z0-9_-]{1,64}$  (서버 검증과 동일)
 * - 표시 이름 → slug 자동 생성: 영문/숫자만 추출 후 공백·이모지·특수문자를 하이픈으로 압축.
 *   - 한글·중국어 등 비라틴 문자는 자동 변환하지 않고 빈 문자열을 반환 → 사용자가 직접 영문 입력하도록 안내.
 */

export const SLUG_REGEX = /^[a-z0-9_-]{1,64}$/;

export function isValidSlug(value: string): boolean {
  return SLUG_REGEX.test(value);
}

/**
 * 자유 입력 라벨에서 slug 후보를 추출.
 * - 모두 소문자화
 * - 영문/숫자/하이픈/밑줄만 남기고 그 외(공백·이모지·한글 등)는 하이픈으로 치환
 * - 연속 하이픈 압축, 양끝 하이픈 제거
 * - 결과가 빈 문자열이거나 검증 실패 시 빈 문자열 반환
 */
export function generateSlugFromLabel(label: string): string {
  if (!label) return '';
  const lowered = label.toLowerCase().normalize('NFKD');
  const replaced = lowered.replace(/[^a-z0-9_-]+/g, '-');
  const trimmed = replaced.replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-');
  if (!trimmed) return '';
  const truncated = trimmed.slice(0, 64);
  return isValidSlug(truncated) ? truncated : '';
}
