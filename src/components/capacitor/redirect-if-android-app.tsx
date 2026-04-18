"use client";

import { useLayoutEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { isCapacitorAndroid } from "@/lib/client-platform";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Android WebView 전용. 반드시 `next/dynamic` + `{ ssr: false }`로만 로드해
 * 하이드레이션 불일치를 피하세요.
 */
export function RedirectIfAndroidApp({ children }: { children: ReactNode }) {
  const router = useRouter();
  const isBlocked = isCapacitorAndroid();

  useLayoutEffect(() => {
    if (isBlocked) router.replace("/dashboard");
  }, [isBlocked, router]);

  if (isBlocked) {
    return <Skeleton className="h-[min(60vh,800px)] w-full max-w-4xl mx-auto rounded-2xl" />;
  }
  return <>{children}</>;
}
