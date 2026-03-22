"use client";

import dynamic from 'next/dynamic';
import { useAuth } from '@/hooks/use-auth';
import { AccessDenied } from '@/components/access-denied';
import { Skeleton } from '@/components/ui/skeleton';

// 리본 프린터 (Canvas)는 브라우저 API (html-to-image 등)에 의존하므로
// 서버 사이드 렌더링(SSR)을 완전히 비활성화해야 합니다.
const RibbonCanvasApp = dynamic(
  () => import('./components/App'),
  { ssr: false, loading: () => <Skeleton className="h-[800px] w-full" /> }
);

export default function PrinterPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  
  const plan = profile?.tenants?.plan || "free";
  const isSuperAdmin = profile?.role === 'super_admin';

  if (!authLoading && !isSuperAdmin && !['pro', 'ribbon_only'].includes(plan)) {
    return <AccessDenied requiredTier="Ribbon" />;
  }
  
  // 관리자 권한 확인 (치트키 포함)
  const isAdmin = user?.email === 'lilymag0301@gmail.com' || isSuperAdmin;

  return (
    <div className="w-full h-full min-h-[calc(100vh-4rem)]">
      {/* 
        App.tsx는 원래 전체 화면을 차지하게 디자인되었으므로, 
        Wrapper에서 어느 정도 제어하거나 그대로 렌더링합니다.
      */}
      <RibbonCanvasApp 
        session={{ user: user } as any} // session 호환성 유지 
        isAdmin={isAdmin}
      />
    </div>
  );
}
