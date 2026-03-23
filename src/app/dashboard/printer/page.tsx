"use client";

import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/use-auth';
import { AccessDenied } from '@/components/access-denied';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

// 리본 프린터 (Canvas)는 브라우저 API (html-to-image 등)에 의존하므로
// 서버 사이드 렌더링(SSR)을 완전히 비활성화해야 합니다.
const RibbonCanvasApp = dynamic(
  () => import('./components/App'),
  { ssr: false, loading: () => <Skeleton className="h-[800px] w-full" /> }
);

function PrinterContent() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  
  const plan = profile?.tenants?.plan || "free";
  const isSuperAdmin = profile?.role === 'super_admin';

  const hasAccess = authLoading || isSuperAdmin || ['pro', 'ribbon_only'].includes(plan);
  
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
      <RibbonCanvasApp 
        session={{ user: user } as any} 
        isAdmin={isAdmin}
        initialLeftText={initialLeftText}
        initialRightText={initialRightText}
      />
    </div>
  );
}

export default function PrinterPage() {
  return (
    <Suspense fallback={<Skeleton className="h-[800px] w-full" />}>
      <PrinterContent />
    </Suspense>
  );
}
