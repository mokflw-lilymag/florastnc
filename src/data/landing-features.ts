export const LANDING_FEATURE_SLUGS = [
  "ai-order-concierge",
  "shop-sync",
  "smart-print-bridge",
  "ai-expense-magic",
  "settlement-engine",
  "mobile-premium",
] as const;

export type LandingFeatureSlug = (typeof LANDING_FEATURE_SLUGS)[number];

/** Static layout/visual data for landing feature cards & detail pages. Copy lives in `src/i18n/detail-bundles` + `landing.features.featureCards`. */
export type LandingFeatureDefinition = {
  slug: LandingFeatureSlug;
  imageSrc?: string;
  accent: "amber" | "blue" | "emerald" | "indigo" | "rose" | "teal";
  comingSoon?: boolean;
};

export const LANDING_FEATURES: LandingFeatureDefinition[] = [
  {
    slug: "ai-order-concierge",
    imageSrc: "/images/ai-order-concierge-ui.png",
    accent: "amber",
  },
  {
    slug: "shop-sync",
    imageSrc: "/images/shop-sync-api-ui-v2.png",
    accent: "blue",
  },
  {
    slug: "smart-print-bridge",
    imageSrc: "/images/smart-print-bridge-engine.png",
    accent: "emerald",
  },
  {
    slug: "ai-expense-magic",
    imageSrc: "/images/ai-expense-magic-visual-v2.png",
    accent: "indigo",
  },
  {
    slug: "settlement-engine",
    imageSrc: "/images/settlement-engine-dashboard.png",
    accent: "rose",
  },
  {
    slug: "mobile-premium",
    accent: "teal",
    comingSoon: true,
  },
];

export function getLandingFeatureBySlug(slug: string): LandingFeatureDefinition | undefined {
  return LANDING_FEATURES.find((f) => f.slug === slug);
}
