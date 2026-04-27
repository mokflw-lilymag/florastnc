import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { LegalDocShell } from '@/components/legal/LegalDocShell';
import { AppLocale, isSupportedLocale } from '@/i18n/config';

export const metadata: Metadata = {
  title: '개인정보처리방침 · Floxync',
  description: 'Floxync 개인정보처리방침',
};

const LAST = '2026년 4월 25일';
type Props = { params: Promise<{ locale: string }> };

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const l = locale as AppLocale;
  return (
    <LegalDocShell locale={l} titleEn="Privacy Policy" titleKo="개인정보처리방침" lastUpdated={LAST}>
      <section><h2>1. 처리 목적</h2><p>lilymag lab(이하 &quot;회사&quot;)는 서비스 제공·유지·개선, 고객 지원, 보안, 법령 준수 목적으로 개인정보를 처리합니다.</p></section>
      <section><h2>2. 수집 항목</h2><ul><li><strong>회원·계정</strong>: 이름, 이메일, 연락처, 비밀번호(암호화 저장)</li><li><strong>서비스 이용 과정</strong>: 접속 로그, IP, 쿠키, 기기 정보, 이용 기록</li><li><strong>업로드 데이터</strong>: 주문·배송·고객·상품 정보 등</li></ul></section>
      <section><h2>3. 보유 및 이용 기간</h2><p>목적 달성 후 지체 없이 파기하며, 법령에 따라 보관이 필요한 경우 해당 기간 동안 보관합니다.</p></section>
      <section><h2>4. 제3자 제공</h2><p>법령 근거 또는 이용자 동의가 있는 경우를 제외하고 외부 제공하지 않습니다.</p></section>
      <section><h2>5. 처리 위탁</h2><p>호스팅, 이메일 발송, 결제 대행 등 운영에 필요한 범위에서 위탁할 수 있습니다.</p></section>
      <section><h2>6. 국외 이전</h2><p>국외 서버 이용 시 관련 법령에 따라 이전 정보와 목적을 고지하고 필요한 조치를 취합니다.</p></section>
      <section><h2>7. 이용자의 권리</h2><p>이용자는 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다.</p></section>
      <section><h2>8. 파기</h2><p>목적 달성 시 복구 불가능한 방식으로 파기합니다.</p></section>
      <section><h2>9. 쿠키</h2><p>로그인 유지·보안·통계 목적의 쿠키를 사용할 수 있으며 브라우저 설정에서 거부 가능합니다.</p></section>
      <section><h2>10. 안전성 확보 조치</h2><p>접근권한 관리, 전송구간 보호, 비밀번호 해시 저장 등 조치를 시행합니다.</p></section>
      <section><h2>11. 개인정보 보호책임자</h2><p>문의: <strong>admin@floxync.com</strong> / <strong>010-7939-9518</strong></p></section>
      <section><h2>12. 고지 의무</h2><p>방침 변경 시 시행일자와 변경 사유를 공지합니다.</p></section>
    </LegalDocShell>
  );
}
