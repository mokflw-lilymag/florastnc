import type { ComponentType } from 'react';
import type { LandingFeatureDefinition } from '@/data/landing-features';
import { Cpu, Printer, RefreshCw, ShieldCheck, Smartphone, Zap, ReceiptText } from 'lucide-react';
import Image from 'next/image';

const accentClasses: Record<LandingFeatureDefinition['accent'], string> = {
  amber: 'from-amber-500/25 via-amber-500/5 to-transparent',
  blue: 'from-blue-500/25 via-blue-500/5 to-transparent',
  emerald: 'from-emerald-500/25 via-emerald-500/5 to-transparent',
  indigo: 'from-indigo-500/25 via-indigo-500/5 to-transparent',
  rose: 'from-rose-500/25 via-rose-500/5 to-transparent',
  teal: 'from-teal-500/25 via-teal-500/5 to-transparent',
};

export const featureAccentIconClass: Record<LandingFeatureDefinition['accent'], string> = {
  amber: 'text-amber-400',
  blue: 'text-blue-400',
  emerald: 'text-emerald-400',
  indigo: 'text-indigo-400',
  rose: 'text-rose-400',
  teal: 'text-teal-400',
};

const iconBySlug: Record<LandingFeatureDefinition['slug'], ComponentType<{ className?: string }>> = {
  'ai-order-concierge': Zap,
  'shop-sync': RefreshCw,
  'smart-print-bridge': Printer,
  'ai-expense-magic': ReceiptText,
  'settlement-engine': ShieldCheck,
  'mobile-premium': Smartphone,
};

export function FeatureVisual({
  feature,
  imageAlt,
}: {
  feature: LandingFeatureDefinition;
  /** Localized hero caption for screen readers / SEO (card title). */
  imageAlt?: string;
}) {
  const Icon = iconBySlug[feature.slug];
  const gradient = accentClasses[feature.accent];
  const iconTint = featureAccentIconClass[feature.accent];
  const alt = imageAlt?.trim() || `Floxync · ${feature.slug}`;

  if (feature.imageSrc) {
    return (
      <div className="relative w-full aspect-[16/10] rounded-[32px] overflow-hidden border border-white/10 bg-black/40 shadow-2xl">
        <Image
          src={feature.imageSrc}
          alt={alt}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 896px"
          priority
        />
        <div className={`absolute inset-0 bg-gradient-to-t ${gradient} to-60% pointer-events-none`} />
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-[16/10] rounded-[32px] overflow-hidden border border-white/10 bg-[#050807] shadow-2xl">
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_20%,rgba(255,255,255,0.08),transparent_55%)]" />
      <div className="absolute -right-16 -bottom-16 w-72 h-72 rounded-full bg-white/5 blur-3xl" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Icon className={`w-28 h-28 md:w-36 md:h-36 ${iconTint} opacity-90 drop-shadow-[0_0_40px_rgba(255,255,255,0.15)]`} />
      </div>
    </div>
  );
}

export function FeatureCardIcon({ slug, className }: { slug: LandingFeatureDefinition['slug']; className?: string }) {
  const Icon = iconBySlug[slug];
  return <Icon className={className} />;
}
