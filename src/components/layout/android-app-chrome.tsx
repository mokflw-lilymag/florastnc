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
import { useDashboardTr } from "@/hooks/use-dashboard-tr";

type MoreItem = { href: string; label: string; icon: typeof BarChart3 };

export function AndroidAppChrome() {
  const { tr } = useDashboardTr();
  const isAndroidApp = useIsCapacitorAndroid();
  const pathname = usePathname() || "";
  const { profile, isLoading } = useAuth();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryNav = [
    { href: "/dashboard", label: tr("홈", "Home"), icon: LayoutDashboard, match: (p: string) => p === "/dashboard" },
    {
      href: "/dashboard/orders",
      label: tr("주문", "Orders"),
      icon: ScrollText,
      match: (p: string) => p.startsWith("/dashboard/orders"),
    },
    {
      href: "/dashboard/delivery",
      label: tr("배송", "Delivery"),
      icon: Truck,
      match: (p: string) => p.startsWith("/dashboard/delivery"),
    },
    {
      href: "/dashboard/customers",
      label: tr("고객", "Customers"),
      icon: Users,
      match: (p: string) => p.startsWith("/dashboard/customers"),
    },
  ] as const;

  const tenantMoreLinks: MoreItem[] = [
    { href: "/dashboard/org-board", label: tr("본사 게시판", "HQ board"), icon: Megaphone },
    { href: "/dashboard/orders/new", label: tr("새 주문", "New order"), icon: Plus },
    { href: "/dashboard/reports", label: tr("정산 · 보고서", "Reports"), icon: BarChart3 },
    { href: "/dashboard/analytics", label: tr("매입·매출 통계", "Sales & expenses"), icon: BarChart3 },
    { href: "/dashboard/expenses", label: tr("지출", "Expenses"), icon: CreditCard },
    { href: "/dashboard/tax", label: tr("세무", "Tax"), icon: FileText },
    { href: "/dashboard/inventory", label: tr("재고", "Inventory"), icon: Boxes },
    { href: "/dashboard/products", label: tr("상품", "Products"), icon: Boxes },
    { href: "/dashboard/external-orders", label: tr("협력사 수발주", "Partner orders"), icon: Share2 },
    { href: "/dashboard/marketing", label: tr("AI 홍보 마스터", "AI Marketing"), icon: Sparkles },
    { href: "/dashboard/design-studio", label: tr("카드 디자인", "Card design"), icon: Layout },
    { href: "/dashboard/settings/pos", label: tr("POS 연동", "POS"), icon: Monitor },
    { href: "/dashboard/settings", label: tr("환경 설정", "Settings"), icon: Settings },
    { href: "/dashboard/subscription", label: tr("구독 · 플랜", "Subscription"), icon: Gem },
  ];

  const adminMoreLinks: MoreItem[] = [
    { href: "/dashboard/orders/new", label: tr("새 주문", "New order"), icon: Plus },
    { href: "/dashboard/admin/staff", label: tr("직원(Staff) 관리", "Staff"), icon: Users },
    { href: "/dashboard/admin/checklist", label: tr("일일 체크리스트", "Daily checklist"), icon: ShieldCheck },
    { href: "/dashboard/tenants", label: tr("전국 화원사 관리", "Stores"), icon: Store },
    { href: "/dashboard/billing-admin", label: tr("구독 · 결제 관제", "Billing"), icon: CreditCard },
    { href: "/dashboard/announcements", label: tr("글로벌 공지", "Announcements"), icon: FileText },
    { href: "/dashboard/admin/faq", label: tr("FAQ · AI 지식", "FAQ · AI"), icon: FileText },
    { href: "/dashboard/marketing/admin", label: tr("플랫폼 홍보 마스터", "Platform marketing"), icon: Sparkles },
    { href: "/dashboard/admin/design-templates", label: tr("디자인 템플릿 관리", "Design templates"), icon: Layout },
    { href: "/dashboard/system-settings", label: tr("전역 설정", "Global settings"), icon: Settings },
    { href: "/dashboard/settings", label: tr("화원사 환경 설정", "Store settings"), icon: Settings },
  ];

  if (!isAndroidApp) return null;

  const isSuperAdmin = profile?.role === "super_admin";
  const moreItems = isSuperAdmin ? adminMoreLinks : tenantMoreLinks;

  const moreActive = moreItems.some(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`)
  );
  const primaryActive = primaryNav.some((item) => item.match(pathname));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/95 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]"
        aria-label={tr("앱 하단 메뉴", "Bottom app navigation")}
      >
        <div className="mx-auto flex max-w-2xl items-stretch justify-around px-1 pt-1">
          {primaryNav.map((item) => {
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
            <span>{tr("더보기", "More")}</span>
          </button>
        </div>
      </nav>

      <Link
        href="/dashboard/orders/new"
        className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-[101] inline-flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-500 active:scale-95"
        aria-label={tr("새 주문", "New order")}
      >
        <Plus className="h-7 w-7" />
      </Link>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[85vh] rounded-t-3xl">
          <SheetHeader className="text-left">
            <SheetTitle>{tr("전체 메뉴", "All menu items")}</SheetTitle>
            <SheetDescription className="sr-only">
              {tr(
                "리본 프린터는 Android 앱에서 지원하지 않습니다. PC에서 이용해 주세요.",
                "Ribbon printer is not available in the Android app. Please use a desktop browser."
              )}
            </SheetDescription>
          </SheetHeader>
          {!isLoading && isSuperAdmin ? (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100">
              {tr("관리자 기능 중 일부는 PC 웹 사용을 권장합니다.", "Some admin features work best on desktop web.")}
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
