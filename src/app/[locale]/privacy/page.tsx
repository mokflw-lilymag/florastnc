import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalDocShell } from '@/components/legal/LegalDocShell';
import { PrivacyPolicyBodyEn, PrivacyPolicyBodyKo } from '@/components/legal/privacy-policy-bodies';
import { AppLocale, isSupportedLocale, toBaseLocale } from '@/i18n/config';
import { getPublicServerMessages } from '@/i18n/getMessages.server';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    return { title: 'Floxync' };
  }
  const doc = (await getPublicServerMessages(locale as AppLocale)).legalDoc;
  return {
    title: `${doc.privacyMetaTitle} · Floxync`,
    description: doc.privacyMetaDescription,
  };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const l = locale as AppLocale;
  const doc = (await getPublicServerMessages(l)).legalDoc;
  const body = toBaseLocale(l) === 'ko' ? <PrivacyPolicyBodyKo /> : <PrivacyPolicyBodyEn />;
  return (
    <LegalDocShell locale={l} titleEn="Privacy Policy" titleKo="개인정보처리방침" lastUpdated={doc.lastUpdatedDisplay}>
      {body}
    </LegalDocShell>
  );
}
