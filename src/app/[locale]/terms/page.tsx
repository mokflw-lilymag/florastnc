import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalDocShell } from '@/components/legal/LegalDocShell';
import { TermsOfServiceBodyEn, TermsOfServiceBodyKo } from '@/components/legal/terms-of-service-bodies';
import { AppLocale, isSupportedLocale, toBaseLocale } from '@/i18n/config';
import { getMessages } from '@/i18n/getMessages';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) {
    return { title: 'Floxync' };
  }
  const doc = getMessages(locale as AppLocale).legalDoc;
  return {
    title: `${doc.termsMetaTitle} · Floxync`,
    description: doc.termsMetaDescription,
  };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const l = locale as AppLocale;
  const doc = getMessages(l).legalDoc;
  const body = toBaseLocale(l) === 'ko' ? <TermsOfServiceBodyKo /> : <TermsOfServiceBodyEn />;
  return (
    <LegalDocShell locale={l} titleEn="Terms of Service" titleKo="이용약관" lastUpdated={doc.lastUpdatedDisplay}>
      {body}
    </LegalDocShell>
  );
}
