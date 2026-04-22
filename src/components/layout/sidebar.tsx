"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { 
  Printer, ScrollText, Users, Store, 
  Settings, LayoutDashboard, ShieldCheck,
  CreditCard, Boxes, Truck, BarChart3, Monitor,
  Zap, ArrowRight, Gem, Share2, FileText, PlusCircle, LogOut, ShoppingCart, Layout, Sparkles,
  Building2,
  Megaphone,
  Package,
  Receipt,
  ClipboardList,
  Database,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useIsCapacitorAndroid } from "@/hooks/use-capacitor-android";

interface SidebarProps {
  isSuperAdmin: boolean;
  plan: string;
  isExpired?: boolean;
  isSuspended?: boolean;
  className?: string;
  logoUrl?: string;
  storeName?: string;
  /** 조직 멤버(본사·다매장 메뉴) */
  isOrgUser?: boolean;
  /** 매장 tenant 없이 본사만 */
  isOrgOnly?: boolean;
  /** true면 사이드바에 본사 메뉴만(지점 업무 모드가 아닐 때) */
  hqMenuOnly?: boolean;
  /** 조직 본사 게시판 메뉴(연결 매장·본사 멤버) */
  showOrgBoardLink?: boolean;
  /** 조직 연결 매장 → 본사 자재 요청 */
  showBranchMaterialRequestLink?: boolean;
}

type Tiered = { tier?: string[] };

export type NavLinkItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  /** 이 경로로 시작하면 이 메뉴는 활성 표시하지 않음 (예: 설정 vs 설정/pos) */
  activeExcludePrefix?: string;
} & Tiered;

type NavGroup = {
  id: string;
  label: string;
  hint?: string;
  links: NavLinkItem[];
};

function normalizePath(p: string) {
  return p.replace(/\/$/, "") || "/";
}

/** /dashboard 는 정확히 일치할 때만, 그 외 href 는 하위 경로까지 활성 */
function isNavActive(pathname: string, href: string, activeExcludePrefix?: string) {
  const p = normalizePath(pathname);
  const h = normalizePath(href);
  if (activeExcludePrefix) {
    const ex = normalizePath(activeExcludePrefix);
    if (p === ex || p.startsWith(`${ex}/`)) return false;
  }
  if (h === "/dashboard") return p === "/dashboard";
  return p === h || p.startsWith(`${h}/`);
}

function filterTenantLink(link: NavLinkItem, ctx: { isSuperAdmin: boolean; isExpired?: boolean; isSuspended?: boolean; plan: string }) {
  if (ctx.isSuperAdmin) return true;
  if (ctx.isExpired || ctx.isSuspended) return !link.tier;
  if (!link.tier) return true;
  return link.tier.includes(ctx.plan);
}

export function Sidebar({
  isSuperAdmin,
  plan,
  isExpired,
  isSuspended,
  className,
  logoUrl,
  isOrgUser = false,
  isOrgOnly = false,
  hqMenuOnly,
  showOrgBoardLink = false,
  showBranchMaterialRequestLink = false,
}: SidebarProps) {
  const sidebarHqOnly = hqMenuOnly ?? isOrgOnly;
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const isAndroidApp = useIsCapacitorAndroid();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("로그아웃 되었습니다.");
    router.push("/login");
  };

  const filterCtx = { isSuperAdmin, isExpired, isSuspended, plan };

  const adminGroups: NavGroup[] = [
    {
      id: "admin-overview",
      label: "통합 현황",
      hint: "한눈에 보는 운영",
      links: [{ name: "시스템 대시보드", href: "/dashboard", icon: LayoutDashboard }],
    },
    {
      id: "admin-ops",
      label: "본사 · 가맹 운영",
      links: [
        { name: "직원(Staff) 관리", href: "/dashboard/admin/staff", icon: Users },
        { name: "일일 체크리스트", href: "/dashboard/admin/checklist", icon: ShieldCheck },
        { name: "전국 화원사 관리", href: "/dashboard/tenants", icon: Store },
        { name: "초기 기초자료 시드", href: "/dashboard/admin/tenant-master-seed", icon: Database },
        { name: "조직(본사) 관리", href: "/dashboard/admin/organizations", icon: Building2 },
        { name: "구독 · 결제 관제", href: "/dashboard/billing-admin", icon: CreditCard },
        { name: "글로벌 공지", href: "/dashboard/announcements", icon: ScrollText },
      ],
    },
    {
      id: "admin-content",
      label: "콘텐츠 · 마케팅",
      links: [
        { name: "FAQ · AI 지식", href: "/dashboard/admin/faq", icon: FileText },
        { name: "플랫폼 홍보 마스터", href: "/dashboard/marketing/admin", icon: Sparkles },
      ],
    },
    {
      id: "admin-system",
      label: "시스템",
      links: [
        { name: "전역 설정", href: "/dashboard/system-settings", icon: Settings },
        { name: "화원사 환경 설정", href: "/dashboard/settings", icon: Settings },
      ],
    },
  ];

  const hqGroup: NavGroup = {
    id: "hq",
    label: "본사·다매장",
    hint: "지점 비교 · 실적",
    links: [
      { name: "본사 개요", href: "/dashboard/hq", icon: Building2 },
      { name: "공동상품관리", href: "/dashboard/hq/shared-products", icon: Package },
      { name: "지점별 지출", href: "/dashboard/hq/branch-expenses", icon: Receipt },
      { name: "자재 요청·취합", href: "/dashboard/hq/material-requests", icon: ClipboardList },
      { name: "본사 게시판", href: "/dashboard/org-board", icon: Megaphone },
    ],
  };

  const tenantGroups: NavGroup[] = [
    {
      id: "tenant-home",
      label: "시작",
      hint: "오늘 업무 허브",
      links: [
        { name: "업무 홈", href: "/dashboard", icon: LayoutDashboard },
        ...(showOrgBoardLink
          ? [{ name: "본사 게시판", href: "/dashboard/org-board", icon: Megaphone }]
          : []),
      ],
    },
    {
      id: "tenant-ops",
      label: "매장 운영",
      hint: "주문 · 고객 · 재고",
      links: [
        { name: "새 주문", href: "/dashboard/orders/new", icon: PlusCircle, tier: ["pro", "erp_only"] },
        {
          name: "주문 목록",
          href: "/dashboard/orders",
          icon: ScrollText,
          tier: ["pro", "erp_only"],
          activeExcludePrefix: "/dashboard/orders/new",
        },
        { name: "배송 · 픽업", href: "/dashboard/delivery", icon: Truck, tier: ["pro", "erp_only"] },
        { name: "고객 CRM", href: "/dashboard/customers", icon: Users, tier: ["pro", "erp_only"] },
        { name: "협력사 수발주", href: "/dashboard/external-orders", icon: Share2, tier: ["pro", "erp_only"] },
        { name: "상품", href: "/dashboard/products", icon: Boxes, tier: ["pro", "erp_only"] },
        { name: "재고", href: "/dashboard/inventory", icon: Boxes, tier: ["pro", "erp_only"] },
        ...(showBranchMaterialRequestLink && !sidebarHqOnly
          ? ([
              {
                name: "본사 자재 요청",
                href: "/dashboard/material-requests",
                icon: ClipboardList,
                tier: ["pro", "erp_only"],
              },
            ] as NavLinkItem[])
          : []),
        { name: "거래처", href: "/dashboard/suppliers", icon: Store, tier: ["pro", "erp_only"] },
        { name: "매입", href: "/dashboard/purchases", icon: ShoppingCart, tier: ["pro", "erp_only"] },
        { name: "정산 · 보고서", href: "/dashboard/reports", icon: BarChart3, tier: ["pro", "erp_only"] },
        { name: "매입·매출 통계", href: "/dashboard/analytics", icon: BarChart3, tier: ["pro", "erp_only"] },
        { name: "지출", href: "/dashboard/expenses", icon: CreditCard, tier: ["pro", "erp_only"] },
        { name: "세무", href: "/dashboard/tax", icon: FileText, tier: ["pro", "erp_only"] },
      ],
    },
    {
      id: "tenant-make",
      label: "제작 · 출력",
      hint: "리본 · 카드",
      links: [
        { name: "리본 프린터", href: "/dashboard/printer", icon: Printer, tier: ["pro", "ribbon_only"] },
        { name: "카드 디자인", href: "/dashboard/design-studio", icon: Layout, tier: ["pro", "ribbon_only"] },
      ],
    },
    {
      id: "tenant-growth",
      label: "마케팅",
      links: [{ name: "AI 홍보 마스터", href: "/dashboard/marketing", icon: Sparkles, tier: ["pro", "erp_only"] }],
    },
    {
      id: "tenant-store",
      label: "매장 설정 · 구독",
      hint: "연동 · 플랜",
      links: [
        { name: "POS 연동", href: "/dashboard/settings/pos", icon: Monitor, tier: ["pro", "erp_only"] },
        { name: "환경 설정", href: "/dashboard/settings", icon: Settings, activeExcludePrefix: "/dashboard/settings/pos" },
        { name: "구독 · 플랜", href: "/dashboard/subscription", icon: Gem },
      ],
    },
  ];

  const tenantNavFiltered = tenantGroups
    .map((g) => ({
      ...g,
      links: g.links.filter((l) => {
        if (isAndroidApp && l.href === "/dashboard/printer") return false;
        return filterTenantLink(l, filterCtx);
      }),
    }))
    .filter((g) => g.links.length > 0);

  const navGroups = isSuperAdmin
    ? adminGroups
    : sidebarHqOnly
      ? [hqGroup]
      : isOrgUser
        ? [hqGroup, ...tenantNavFiltered]
        : tenantNavFiltered;

  return (
    <aside className={cn("flex w-64 flex-col bg-white border-r border-slate-100 h-full z-20 shadow-sm", className)}>
      <div className="p-6 pb-2">
        <Image
          src={logoUrl || "https://ecimg.cafe24img.com/pg1472b45444056090/lilymagflower/web/upload/category/logo/v2_d13ecd48bab61a0269fab4ecbe56ce07_lZMUZ1lORo_top.jpg"}
          alt="Floxync Logo"
          width={180}
          height={40}
          priority={true}
          style={{ width: 'auto', height: 'auto' }}
          className="h-10 w-auto object-contain mx-auto mix-blend-multiply dark:mix-blend-normal dark:invert"
        />
        <div className="mt-3 text-center">
           <span className={cn(
             "text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block border",
             isSuperAdmin
               ? "bg-blue-50 text-blue-600 border-blue-100"
               : sidebarHqOnly
                 ? "bg-violet-50 text-violet-700 border-violet-100"
                 : isOrgOnly
                   ? "bg-sky-50 text-sky-800 border-sky-100"
                   : "bg-emerald-50 text-emerald-600 border-emerald-100"
           )}>
             {isSuperAdmin ? "ADMIN MODE" : sidebarHqOnly ? "HQ" : isOrgOnly ? "지점업무" : "PARTNER"}
           </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-6 last:mb-2">
            <div className="px-3 mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {group.label}
              </p>
              {group.hint ? (
                <p className="text-[10px] text-slate-400/90 mt-0.5 leading-snug">{group.hint}</p>
              ) : null}
            </div>
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const isActive = isNavActive(pathname, link.href, link.activeExcludePrefix);
                const Icon = link.icon;
                return (
                  <Link
                    key={`${group.id}-${link.href}`}
                    href={link.href}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-150",
                      isActive
                        ? "bg-slate-900 text-white shadow-md shadow-slate-200/80"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon
                      className={cn(
                        "flex-shrink-0 h-[18px] w-[18px]",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        <button
          onClick={handleLogout}
          className="w-full group flex items-center px-3 py-2.5 text-sm font-normal rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <LogOut 
            className="mr-3 flex-shrink-0 h-5 w-5 transition-transform duration-200 group-hover:scale-110 text-red-400 group-hover:text-red-600" 
            aria-hidden="true" 
          />
          로그아웃
        </button>
      </nav>

      {/* Upgrade Promo for Tenants */}
      {!isSuperAdmin && !sidebarHqOnly && plan !== 'pro' && (
        <div className="px-4 pb-4">
          <Link href="/dashboard/subscription" className="block">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[24px] p-6 text-white shadow-xl shadow-blue-100 dark:shadow-none hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden">
               <Zap className="absolute -right-2 -bottom-2 h-14 w-14 opacity-20 group-hover:rotate-12 transition-transform" />
               <div className="relative z-10">
                  <p className="text-xs font-light uppercase tracking-[0.2em] opacity-80 mb-3">Membership Upgrade</p>
                  <p className="text-xl font-normal leading-tight tracking-tight">PRO 통합 플랜<br />최대 혜택 받기</p>
                  <div className="mt-5 inline-flex items-center text-xs font-light bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                     플랜 확인하기 <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
               </div>
            </div>
          </Link>
        </div>
      )}
      
      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] text-center text-slate-400 font-normal uppercase tracking-widest mb-1">Floxync v25.0</p>
        <p className="text-[10px] text-center text-slate-400/80">
          고객지원: <a href="mailto:admin@floxync.com" className="hover:text-slate-600 transition-colors font-medium">admin@floxync.com</a>
        </p>
      </div>
    </aside>
  );
}

