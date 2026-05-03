/**
 * 인라인 UI 문자열을 로케일(ko / vi / 기타→en)로 선택합니다.
 * `tenantFlows` 키가 없는 화면에서 ko/en/vi 삼국어를 빠르게 연결할 때 사용합니다.
 * `vi`를 생략하면 베트남어 UI에서 영어(`en`)로 폴백합니다.
 */
export function pickUiText(baseLocale: string, ko: string, en: string, vi?: string): string {
  if (baseLocale === "ko") return ko;
  if (baseLocale === "vi") return vi ?? en;
  return en;
}
