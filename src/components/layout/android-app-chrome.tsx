"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ScrollText,
  Truck,
  Users,
  Menu,
  Plus,
  BarChart3,
  CreditCard,
  Boxes,
  Share2,
  Sparkles,
  Layout,
  Monitor,
  Settings,
  Gem,
  ShieldCheck,
  Store,
  FileText,
  Megaphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsCapacitorAndroid } from "@/hooks/use-capacitor-android";
import { useAuth } from "@/hooks/use-auth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

const PRIMARY = [
  { href: "/dashboard", label: "홈", icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
  {
    href: "/dashboard/orders",
    label: "주문",
    icon: ScrollText,
    match: (p: string) => p.startsWith("/dashboard/orders"),
  },
  { href: "/dashboard/delivery", label: "배송", icon: Truck, match: (p: string) => p.startsWith("/dashboard/delivery") },
  { href: "/dashboard/customers", label: "고객", icon: Users, match: (p: string) => p.startsWith("/dashboard/customers") },
] as const;

type MoreItem = { href: string; label: string; icon: typeof BarChart3 };

function tenantMoreLinks(): MoreItem[] {
  return [
    { href: "/dashboard/org-board", label: "본사 게시판", icon: Megaphone },
    { href: "/dashboard/orders/new", label: "새 주문", icon: Plus },
    { href: "/dashboard/reports", label: "정산 · 보고서", icon: BarChart3 },
    { href: "/dashboard/analytics", label: "매입·매출 통계", icon: BarChart3 },
    { href: "/dashboard/expenses", label: "지출", icon: CreditCard },
    { href: "/dashboard/tax", label: "세무", icon: FileText },
    { href: "/dashboard/inventory", label: "재고", icon: Boxes },
    { href: "/dashboard/products", label: "상품", icon: Boxes },
    { href: "/dashboard/external-orders", label: "협력사 수발주", icon: Share2 },
    { href: "/dashboard/marketing", label: "AI 홍보 마스터", icon: Sparkles },
    { href: "/dashboard/design-studio", label: "카드 디자인", icon: Layout },
    { href: "/dashboard/settings/pos", label: "POS 연동", icon: Monitor },
    { href: "/dashboard/settings", label: "환경 설정", icon: Settings },
    { href: "/dashboard/subscription", label: "구독 · 플랜", icon: Gem },
  ];
}

function adminMoreLinks(): MoreItem[] {
  return [
    { href: "/dashboard/orders/new", label: "새 주문", icon: Plus },
    { href: "/dashboard/admin/staff", label: "직원(Staff) 관리", icon: Users },
    { href: "/dashboard/admin/checklist", label: "일일 체크리스트", icon: ShieldCheck },
    { href: "/dashboard/tenants", label: "전국 화원사 관리", icon: Store },
    { href: "/dashboard/billing-admin", label: "구독 · 결제 관제", icon: CreditCard },
    { href: "/dashboard/announcements", label: "글로벌 공지", icon: FileText },
    { href: "/dashboard/admin/faq", label: "FAQ · AI 지식", icon: FileText },
    { href: "/dashboard/marketing/admin", label: "플랫폼 홍보 마스터", icon: Sparkles },
    { href: "/dashboard/admin/design-templates", label: "디자인 템플릿 관리", icon: Layout },
    { href: "/dashboard/system-settings", label: "전역 설정", icon: Settings },
    { href: "/dashboard/settings", label: "화원사 환경 설정", icon: Settings },
  ];
}

export function AndroidAppChrome() {
  const isAndroidApp = useIsCapacitorAndroid();
  const pathname = usePathname() || "";
  const { profile, isLoading } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!isAndroidApp) return null;

  const isSuperAdmin = profile?.role === "super_admin";
  const moreItems = isSuperAdmin ? adminMoreLinks() : tenantMoreLinks();

  const moreActive = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const primaryActive = PRIMARY.some((t) => t.match(pathname));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        aria-label="앱 하단 메뉴"
      >
        <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1 pt-1">
          {PRIMARY.map((item) => {
            const active = item.match(pathname);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex min-h-[3rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-xs font-semibold transition-colors active:scale-[0.97]",
                  active
                    ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                )}
              >
                <Icon className={cn("h-6 w-6", active && "text-indigo-600 dark:text-indigo-400")} aria-hidden />
                <span className="truncate max-w-full px-0.5">{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className={cn(
              "flex min-h-[3rem] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl py-2 text-xs font-semibold transition-colors active:scale-[0.97]",
              moreActive && !primaryActive
                ? "bg-indigo-50 text-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            )}
          >
            <Menu
              className={cn(
                "h-6 w-6",
                moreActive && !primaryActive && "text-indigo-600 dark:text-indigo-400"
              )}
              aria-hidden
            />
            <span>더보기</span>
          </button>
        </div>
      </nav>

      <Link
        href="/dashboard/orders/new"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-[101] inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 active:scale-95"
        aria-label="새 주문"
      >
        <Plus className="h-7 w-7" />
      </Link>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle>전체 메뉴</SheetTitle>
            <SheetDescription className="sr-only">
              리본 프린터는 Android 앱에서 지원하지 않습니다. PC에서 이용해 주세요.
            </SheetDescription>
          </SheetHeader>
          {!isLoading && isSuperAdmin ? (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
              관리자 기능 중 일부는 PC 웹 사용을 권장합니다.
            </p>
          ) : null}
          <ul className="mt-4 max-h-[60vh] space-y-0.5 overflow-y-auto pb-8">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setMoreOpen(false)}
                    className="flex min-h-12 items-center gap-3 rounded-2xl px-4 py-3.5 text-base font-medium text-slate-800 active:bg-slate-100 dark:text-slate-100 dark:active:bg-slate-800"
                  >
                    <Icon className="h-5 w-5 shrink-0 text-slate-400" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  );
}
