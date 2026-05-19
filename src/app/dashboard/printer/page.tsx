"use client";

import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/use-auth';
import { AccessDenied } from '@/components/access-denied';
import { hasRibbonAccess, isFreeAccessTier, resolveAccessPlan } from '@/lib/subscription/plan-access';
import { FreePlanUpsell } from '@/components/subscription/free-plan-upsell';
import { BrowseOnlyBanner } from '@/components/subscription/browse-only-banner';
import { useBrowseOnly } from '@/hooks/use-browse-only';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

const RedirectIfAndroidApp = dynamic(
  () =>
    import("@/components/capacitor/redirect-if-android-app").then((m) => m.RedirectIfAndroidApp),
  { ssr: false, loading: () => <Skeleton className="h-[800px] w-full" /> }
);

// 리본 프린터 (Canvas)는 브라우저 API (html-to-image 등)에 의존하므로
// 서버 사이드 렌더링(SSR)을 완전히 비활성화해야 합니다.
const RibbonCanvasApp = dynamic(
  () => import('./components/App'),
  { ssr: false, loading: () => <Skeleton className="h-[800px] w-full" /> }
);

function PrinterContent() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const { isBrowseOnly, canPrint, needsOnboarding } = useBrowseOnly();
  const searchParams = useSearchParams();
  
  const plan = profile?.tenants?.plan || "free";
  const subEnd = profile?.tenants?.subscription_end as string | null | undefined;
  const isExpired = !subEnd || new Date(subEnd) < new Date();
  const isSuperAdmin = profile?.role === 'super_admin';
  const accessCtx = { plan, isExpired, isSuperAdmin };
  const accessPlan = resolveAccessPlan(plan, { isExpired });
  const hasAccess = authLoading || hasRibbonAccess(accessCtx);
  const isFreeTier = !authLoading && isFreeAccessTier(accessCtx);
  
  // 관리자 권한 확인 (치트키 포함)
  const isAdmin = user?.email === 'lilymag0301@gmail.com' || isSuperAdmin;

  if (!hasAccess) {
    return <AccessDenied requiredTier="Ribbon" />;
  }

  // URL에서 초기 텍스트 가져오기
  const initialLeftText = searchParams.get('left') || searchParams.get('message') || undefined;
  const initialRightText = searchParams.get('right') || searchParams.get('sender') || undefined;

  return (
    <div className="w-full h-full min-h-[calc(100vh-4rem)]">
      {isBrowseOnly ? (
        <div className="mx-auto max-w-[1600px] px-4 pt-2">
          <BrowseOnlyBanner needsOnboarding={needsOnboarding} className="mb-2" />
        </div>
      ) : isFreeTier && profile?.tenant_id ? (
        <div className="mx-auto max-w-[1600px] px-4 pt-2">
          <FreePlanUpsell tenantId={profile.tenant_id} variant="ribbon" className="mb-2" />
        </div>
      ) : null}
      <RibbonCanvasApp
        session={{ user: user } as any}
        isAdmin={isAdmin}
        initialLeftText={initialLeftText}
        initialRightText={initialRightText}
        userPlan={accessPlan}
        tenantId={profile?.tenant_id ?? undefined}
        tenantLogo={profile?.tenants?.logo_url}
        canPrint={canPrint}
      />
    </div>
  );
}

export default function PrinterPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[800px] w-full" />}>
      <RedirectIfAndroidApp>
        <PrinterContent />
      </RedirectIfAndroidApp>
    </Suspense>
  );
}
