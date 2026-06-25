import "server-only";

import { cache } from "react";
import { loadMessagesAsync, loadPublicMessagesAsync } from "@/i18n/loadMessages";
import type { AppLocale } from "@/i18n/config";

/** Dashboard·앱: 활성 locale의 core + dashboard JSON만 로드 */
export const getServerMessages = cache((localeInput: AppLocale | string) =>
  loadMessagesAsync(localeInput),
);

/** 랜딩·로그인·약관: dashboard JSON 없이 core만 로드 */
export const getPublicServerMessages = cache((localeInput: AppLocale | string) =>
  loadPublicMessagesAsync(localeInput),
);
