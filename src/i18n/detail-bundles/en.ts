import type { LandingFeatureDetailPagesMap } from "./types";

export const EN_DETAIL_PAGES: LandingFeatureDetailPagesMap = {
  "ai-order-concierge": {
    sections: [
      {
        body: "Customer order messages vary in tone, order, and missing fields—every intake leaks time. AI Order Concierge reads KakaoTalk, SMS, and phone notes, then drafts recipient, delivery window, card copy, and amount hints in order-form shape so staff review instead of typing from scratch.",
      },
      {
        heading: "What changes on the shop floor",
        body: "At peak, the bottleneck is verification, not typing. When fields are normalized first, you stop the loop of hanging up and reopening chat to copy-paste, and catch typos or gaps faster. The gain is biggest on urgent lines like “please deliver today.”",
      },
      {
        heading: "Who benefits most",
        body: "Teams heavy on chat orders, shops that relay phone orders between staff, and crews retyping the same fields daily. As volume grows, intake quality stays steadier.",
      },
    ],
  },
  "shop-sync": {
    sections: [
      {
        body: "When Naver, Cafe24, and in-store orders live in silos, staff bounce between screens and re-enter the same data. All-in-one sync keeps creation, payment, and delivery status on one timeline so double entry and misses drop.",
      },
      {
        heading: "Operational flow",
        body: "New order → production queue → dispatch/pickup → delivered links automatically. Each transition is logged so everyone sees who owns which job with the same definitions.",
      },
      {
        heading: "Expected impact",
        body: "Even as channels multiply, source, status, and backlog stay visible, shrinking the end-of-day scramble. Weekends and peak holidays feel calmer operationally.",
      },
    ],
  },
  "smart-print-bridge": {
    sections: [
      {
        heading: "Beyond A4: long banner runs",
        body: "Consumer inkjets (e.g. Epson M/L) are not built for oversize sheets. Floxync streaming pushes past that limit so multi-meter banners print continuously without seams—professional ribbon output without buying dedicated wide hardware.",
      },
      {
        heading: "Precision thermal ribbon control",
        body: "Fine heat and ribbon tension are non-trivial from a browser. Floxync drives diverse thermal hardware instantly, preserving the nuance ribbon printing demands.",
      },
      {
        heading: "XPrint: the browser as print controller",
        body: "Tired of brittle drivers and drifting settings? XPrint unifies devices on the web—one click syncs in-store printers and output matches preview. That integration is Floxync-only depth.",
      },
    ],
    ctaLinks: [
      {
        label: "Purchase inquiry",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Smart Print Bridge purchase inquiry")}`,
      },
      {
        label: "Join test users",
        href: "/#test-user-apply",
      },
    ],
  },
  "ai-expense-magic": {
    sections: [
      {
        heading: "“Snap once” expense capture",
        body: "Receipt housekeeping is the chore nobody wants. Floxync OCR reads crumpled or blurry slips—merchant, date, totals, and VAT splits—then posts structured lines to your ledger.",
      },
      {
        heading: "Context-aware categorization",
        body: "It is not raw OCR only. The model maps vendors and line items into your buckets—stem supplies, delivery, consumables—so owners photograph while AI files.",
      },
      {
        heading: "Live link to the settlement engine",
        body: "Captured spend syncs immediately with finance-grade settlement so you see true margin after costs—not just revenue spikes. Tax season stops being a shoebox marathon.",
      },
    ],
    ctaLinks: [
      {
        label: "Join test users",
        href: "/#test-user-apply",
      },
      {
        label: "Contact us",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] AI expense assistant inquiry")}`,
      },
    ],
  },
  "settlement-engine": {
    sections: [
      {
        body: "Revenue can climb while profit stalls when fees, COGS, delivery, and tax are computed separately. The engine locks rules so identical orders always resolve the same way—less month-end drift.",
      },
      {
        heading: "Transparency",
        body: "Each order breaks into revenue, COGS, fees, delivery, and tax so you can explain where margin leaked. Owners and ops spend less time debating interpretations.",
      },
      {
        heading: "Reporting",
        body: "Daily/weekly/monthly rollups plus channel comparisons show which order types actually pay. Tune pricing, promos, and ops from data instead of gut feel.",
      },
    ],
  },
  "mobile-premium": {
    sections: [
      {
        body: "Mobile Center Premium (Android) is in active build. Field-first flows—order checks, status, light approvals away from the desk—ship incrementally.",
      },
      {
        heading: "Release plan",
        body: "Apply as a test user or email us to get beta invites first. We will share device compatibility ranges alongside the announcement.",
      },
      {
        heading: "Roadmap status",
        body: "After core flows stabilize, we will roll out notifications, approvals, on-site checklists, and onboarding guides in stages.",
      },
    ],
    ctaLinks: [
      {
        label: "Join test users",
        href: "/#test-user-apply",
      },
      {
        label: "Contact us",
        href: `mailto:admin@floxync.com?subject=${encodeURIComponent("[Floxync] Android app launch inquiry")}`,
      },
    ],
  },
};
