/**
 * 슈퍼관리자「번역 관리」화면용: 실제 JSON을 읽어 로케일별 수치를 맞춘다.
 * - 영어(en) 코어 + dashboard-en 문자열을 기준으로,
 * - 코어: getMessages와 같이 `deepMerge(en, locale)` 결과가 영어 원문과 다른 비율
 * - 대시보드: 해당 로케일 dashboard JSON이 영어 대시보드와 다른 비율
 * 두 구간을 합쳐 하나의 퍼센트(0~100, 정수)로 표시한다.
 */

import en from "@/i18n/messages/en.json";
import ko from "@/i18n/messages/ko.json";
import vi from "@/i18n/messages/vi.json";
import zh from "@/i18n/messages/zh.json";
import zhTW from "@/i18n/messages/zh-TW.json";
import ja from "@/i18n/messages/ja.json";
import es from "@/i18n/messages/es.json";
import pt from "@/i18n/messages/pt.json";
import fr from "@/i18n/messages/fr.json";
import de from "@/i18n/messages/de.json";
import ru from "@/i18n/messages/ru.json";
import id from "@/i18n/messages/id.json";
import ms from "@/i18n/messages/ms.json";
import th from "@/i18n/messages/th.json";
import nl from "@/i18n/messages/nl.json";
import it from "@/i18n/messages/it.json";
import hi from "@/i18n/messages/hi.json";
import ar from "@/i18n/messages/ar.json";

import dashboardEn from "@/i18n/messages/dashboard-en.json";
import dashboardKo from "@/i18n/messages/dashboard-ko.json";
import dashboardVi from "@/i18n/messages/dashboard-vi.json";
import dashboardZh from "@/i18n/messages/dashboard-zh.json";
import dashboardZhTW from "@/i18n/messages/dashboard-zh-TW.json";
import dashboardJa from "@/i18n/messages/dashboard-ja.json";
import dashboardEs from "@/i18n/messages/dashboard-es.json";
import dashboardPt from "@/i18n/messages/dashboard-pt.json";
import dashboardFr from "@/i18n/messages/dashboard-fr.json";
import dashboardDe from "@/i18n/messages/dashboard-de.json";
import dashboardRu from "@/i18n/messages/dashboard-ru.json";
import dashboardId from "@/i18n/messages/dashboard-id.json";
import dashboardMs from "@/i18n/messages/dashboard-ms.json";
import dashboardTh from "@/i18n/messages/dashboard-th.json";
import dashboardNl from "@/i18n/messages/dashboard-nl.json";
import dashboardIt from "@/i18n/messages/dashboard-it.json";
import dashboardHi from "@/i18n/messages/dashboard-hi.json";
import dashboardAr from "@/i18n/messages/dashboard-ar.json";

type Json = Record<string, unknown>;

function deepMerge<T extends Json>(base: T, override?: Partial<T> | null): T {
  if (!override) return base;
  const merged = { ...base } as T;
  for (const key of Object.keys(override) as Array<keyof T>) {
    const baseValue = merged[key] as unknown;
    const nextValue = override[key] as unknown;
    if (
      baseValue &&
      nextValue &&
      typeof baseValue === "object" &&
      typeof nextValue === "object" &&
      !Array.isArray(baseValue) &&
      !Array.isArray(nextValue)
    ) {
      merged[key] = deepMerge(baseValue as Json, nextValue as Json) as T[typeof key];
      continue;
    }
    if (nextValue !== undefined) {
      merged[key] = nextValue as T[typeof key];
    }
  }
  return merged;
}

function flattenStrings(obj: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  if (obj == null || typeof obj !== "object") return out;
  for (const k of Object.keys(obj as Json)) {
    const key = prefix ? `${prefix}.${k}` : k;
    const v = (obj as Json)[k];
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flattenStrings(v, key));
    } else if (typeof v === "string") {
      out[key] = v;
    }
  }
  return out;
}

function diffCountFromEn(enFlat: Record<string, string>, locFlat: Record<string, string>): { total: number; diff: number } {
  let total = 0;
  let diff = 0;
  for (const k of Object.keys(enFlat)) {
    const ev = enFlat[k];
    if (typeof ev !== "string") continue;
    total++;
    const lv = locFlat[k];
    if (typeof lv !== "string") continue;
    if (lv !== ev) diff++;
  }
  return { total, diff };
}

const BUNDLES: Record<string, { core: unknown; dash: unknown }> = {
  ko: { core: ko, dash: dashboardKo },
  en: { core: en, dash: dashboardEn },
  vi: { core: vi, dash: dashboardVi },
  zh: { core: zh, dash: dashboardZh },
  "zh-TW": { core: zhTW, dash: dashboardZhTW },
  ja: { core: ja, dash: dashboardJa },
  es: { core: es, dash: dashboardEs },
  pt: { core: pt, dash: dashboardPt },
  fr: { core: fr, dash: dashboardFr },
  de: { core: de, dash: dashboardDe },
  ru: { core: ru, dash: dashboardRu },
  id: { core: id, dash: dashboardId },
  ms: { core: ms, dash: dashboardMs },
  th: { core: th, dash: dashboardTh },
  nl: { core: nl, dash: dashboardNl },
  it: { core: it, dash: dashboardIt },
  hi: { core: hi, dash: dashboardHi },
  ar: { core: ar, dash: dashboardAr },
};

function percentForLocale(code: string): number {
  if (code === "en") return 100;
  const b = BUNDLES[code];
  if (!b) return 0;

  const enCoreFlat = flattenStrings(en);
  const mergedCore = deepMerge(JSON.parse(JSON.stringify(en)) as Json, b.core as Json);
  const mergedCoreFlat = flattenStrings(mergedCore);
  const c = diffCountFromEn(enCoreFlat, mergedCoreFlat);

  const enDashFlat = flattenStrings(dashboardEn);
  const locDashFlat = flattenStrings(b.dash);
  const d = diffCountFromEn(enDashFlat, locDashFlat);

  const total = c.total + d.total;
  if (total === 0) return 100;
  return Math.min(100, Math.max(0, Math.round((100 * (c.diff + d.diff)) / total)));
}

/** 관리자 UI에 표시할 로케일 코드 → 커버리지(%) */
export const ADMIN_UI_LOCALE_COVERAGE: Record<string, number> = Object.fromEntries(
  Object.keys(BUNDLES).map((code) => [code, percentForLocale(code)])
) as Record<string, number>;
