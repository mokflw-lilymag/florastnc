import type { LandingFeatureDetailPagesMap } from "./types";

export const DE_DETAIL_PAGES: LandingFeatureDetailPagesMap = {
  "ai-order-concierge": {
    sections: [
      {
        body: "Kundenbestellungen schwanken in Ton, Reihenfolge und fehlenden Feldern — jede Erfassung kostet Zeit. Der KI-Concierge liest KakaoTalk, SMS und Telefonnotizen, entwirft Empfänger, Lieferfenster, Kartentext und Betragsvorschläge, damit das Team prüft statt neu zu tippen.",
      },
      {
        heading: "Was sich im Laden ändert",
        body: "In Spitzenzeiten bremst Prüfen, nicht Tippen. Felder zuerst zu standardisieren verkürzt die Schleife auflegen und Chat wieder öffnen zum Kopieren und findet Lücken schneller — besonders bei eiligen Aufträgen.",
      },
      {
        heading: "Wem es am meisten hilft",
        body: "Läden mit viel Chat, vielen Telefonweitergaben oder täglicher Doppelarbeit gleicher Felder; die Aufnahmequalität bleibt stabiler, wenn das Volumen steigt.",
      },
    ],
  },
  "shop-sync": {
    sections: [
      {
        body: "Wenn Naver, Cafe24 und Ladengeschäft getrennt sind, springt Personal zwischen Oberflächen und erfasst doppelt. Die Synchronisation verbindet Anlage, Zahlung und Versand auf einer Zeitleiste und reduziert Auslasser.",
      },
      {
        heading: "Ablauf",
        body: "Neue Bestellung → Produktionswarteschlange → Dispatch/Abholung → geliefert verketten sich automatisch; jeder Schritt protokolliert, wer was mit denselben Regeln hält.",
      },
      {
        heading: "Erwarteter Effekt",
        body: "Selbst bei mehr Kanälen bleiben Herkunft, Status und offene Posten sichtbar; weniger Endspurt zum Tagesabschluss und ruhigere Wochenenden und Feiertagsspitzen.",
      },
    ],
  },
  "smart-print-bridge": {
    sections: [
      {
        heading: "Jenseits von A4: lange Banner",
        body: "Heimische Tintenstrahler sind nicht für Meterware gebaut. Floxync-Streaming verschiebt die Hardwaregrenze, damit mehrere Meter Banner ohne grobe Nahtstellen druckbar werden.",
      },
      {
        heading: "Feinsteuerung Thermo-Band",
        body: "Wärme und Bandzug sind im Browser heikel. Floxync startet Thermohardware sofort und bewahrt die typische Präzision von Ribbon-Druck.",
      },
      {
        heading: "XPrint: Browser steuert Hardware",
        body: "Genug von wackeligen Treibern? XPrint bündelt Geräte im Web, synchronisiert Drucker mit einem Klick und zielt auf output-treue Vorschau.",
      },
    ],
    ctaLinks: [
      {
        label: "Kaufanfrage",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Kaufanfrage Smart Print Bridge")}`,
      },
      {
        label: "Testnutzer werden",
        href: "/#test-user-apply",
      },
    ],
  },
  "ai-expense-magic": {
    sections: [
      {
        heading: "Ausgaben mit einem Foto",
        body: "Belege sortieren nervt. OCR liest auch zerknittert und unscharf, trennt Händler, Datum, Summen und MwSt und schreibt strukturierte Zeilen ins Ausgabenbuch.",
      },
      {
        heading: "Kontext-Klassifikation",
        body: "Nicht nur Text: Das Modell mappt Lieferanten und Positionen auf Ihre Kategorien — Schnitt, Lieferung, Verbrauchsmaterial; Inhaber fotografiert, KI sortiert.",
      },
      {
        heading: "Anbindung an die Abrechnungsengine",
        body: "Erfasste Kosten synchronisieren sofort mit der Finanz-Engine, damit echte Marge nach Kosten sichtbar wird; weniger Steuerstress mit Belegstapeln.",
      },
    ],
    ctaLinks: [
      {
        label: "Testnutzer werden",
        href: "/#test-user-apply",
      },
      {
        label: "Kontakt",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Frage KI-Ausgabenassistent")}`,
      },
    ],
  },
  "settlement-engine": {
    sections: [
      {
        body: "Umsatz steigt, Gewinn bleibt flach, wenn Gebühren, Wareneinsatz, Versand und Steuer getrennt gerechnet werden. Die Engine fixiert Regeln, damit gleiche Aufträge immer gleich auflösen — weniger Monatsende-Drift.",
      },
      {
        heading: "Transparenz",
        body: "Jede Bestellung zerlegt „Umsatz-Kosten-Gebühr-Versand-Steuer“, damit erklärbar ist, wo Marge verlor ging; weniger Streit zwischen Geschäftsführung und Betrieb.",
      },
      {
        heading: "Reporting",
        body: "Tages/Wochen/Monatsrollups und Kanalvergleiche zeigen, welche Auftragstypen tragen; Preise und Aktionen datenbasiert justieren.",
      },
    ],
  },
  "mobile-premium": {
    sections: [
      {
        body: "Mobile Center Premium (Android) ist im Aufbau. Wir priorisieren Feldflüsse: Bestellungen prüfen, Status und leichte Freigaben abseits des Tresens.",
      },
      {
        heading: "Release-Plan",
        body: "Melden Sie sich als Tester oder schreiben Sie uns für frühe Beta-Einladungen; Gerätekompatibilität teilen wir mit.",
      },
      {
        heading: "Roadmap",
        body: "Nach Kernstabilisierung folgen schrittweise Benachrichtigungen, Freigaben, Feld-Checklisten und Onboarding-Guides.",
      },
    ],
    ctaLinks: [
      {
        label: "Testnutzer werden",
        href: "/#test-user-apply",
      },
      {
        label: "Kontakt",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Frage Android-App-Start")}`,
      },
    ],
  },
};
