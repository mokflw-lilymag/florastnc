"use client";

import { useEffect, useState } from "react";
import { AppLocale, LOCALE_COOKIE, resolveLocale } from "@/i18n/config";

export function usePreferredLocale(defaultLocale: AppLocale = "ko") {
  const [locale, setLocale] = useState<AppLocale>(defaultLocale);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const readLocale = () => {
      const cookieValue = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${LOCALE_COOKIE}=`))
        ?.split("=")[1];
      setLocale(resolveLocale(cookieValue));
    };
    readLocale();
    window.addEventListener("preferred-locale-changed", readLocale);
    return () => window.removeEventListener("preferred-locale-changed", readLocale);
  }, []);

  return locale;
}
