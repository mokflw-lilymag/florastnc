"use client";

import { useCallback } from "react";
import { AppLocale } from "@/i18n/config";
import { applyUiLocaleCookie } from "@/i18n/apply-ui-locale";
import { useSettings } from "@/hooks/use-settings";

export function usePersistUiLocale() {
  const { settings, saveSettings } = useSettings();

  const persistUiLocale = useCallback(
    async (nextLocale: AppLocale): Promise<boolean> => {
      applyUiLocaleCookie(nextLocale);
      return saveSettings({ ...settings, uiLocale: nextLocale });
    },
    [settings, saveSettings],
  );

  return { persistUiLocale, settingsUiLocale: settings.uiLocale };
}
