"use client";

import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

/** 클라이언트 훅·컴포넌트에서 토스트 등 짧은 UI 문구를 로케일에 맞게 고릅니다. */
export function useUiText() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (
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
  ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);
  return { tr, baseLocale, locale };
}
