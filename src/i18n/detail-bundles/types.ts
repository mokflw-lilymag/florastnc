import type { LandingFeatureSlug } from "@/data/landing-features";

export type LandingFeatureDetailSectionMsg = {
  heading?: string;
  body: string;
};

export type LandingFeatureCtaMsg = {
  label: string;
  href: string;
};

export type FeatureDetailPageMsg = {
  sections: LandingFeatureDetailSectionMsg[];
  ctaLinks?: LandingFeatureCtaMsg[];
};

export type LandingFeatureDetailPagesMap = Record<LandingFeatureSlug, FeatureDetailPageMsg>;
