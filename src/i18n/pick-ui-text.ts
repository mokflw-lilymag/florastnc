/**
 * 인라인 UI 문자열을 기본 로케일(ko·en·vi·ja·zh·es·pt·fr·de·ru) 중 하나로 선택합니다.
 * `ja` 이후 인자를 생략하면 해당 로케일에서는 `en`으로 폴백합니다.
 * (지역 변형 `en-US` 등은 `toBaseLocale` 결과에 맞춰 처리됩니다.)
 */
export function pickUiText(
  baseLocale: string,
  ko: string,
  en: string,
  vi?: string,
  ja?: string,
  zh?: string,
  es?: string,
  pt?: string,
  fr?: string,
  de?: string,
  ru?: string,
): string {
  switch (baseLocale) {
    case "ko":
      return ko;
    case "vi":
      return vi ?? en;
    case "ja":
      return ja ?? en;
    case "zh":
      return zh ?? en;
    case "es":
      return es ?? en;
    case "pt":
      return pt ?? en;
    case "fr":
      return fr ?? en;
    case "de":
      return de ?? en;
    case "ru":
      return ru ?? en;
    default:
      return en;
  }
}
