"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Printer, ScrollText, Users, Store, 
  Settings, LayoutDashboard, ShieldCheck,
  CreditCard, Boxes, Truck, BarChart3, Monitor,
  Zap, ArrowRight, Gem, Share2, FileText, PlusCircle, LogOut, ShoppingCart, Layout, Sparkles
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface SidebarProps {
  isSuperAdmin: boolean;
  plan: string;
  isExpired?: boolean;
  isSuspended?: boolean;
  className?: string;
  logoUrl?: string;
  storeName?: string;
}

export function Sidebar({ isSuperAdmin, plan, isExpired, isSuspended, className, logoUrl, storeName }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("로그아웃 되었습니다.");
    router.push("/login");
  };

  // Navigation schema based on role
  const adminLinks = [
    { name: "시스템 통합 대시보드", href: "/dashboard", icon: LayoutDashboard },
    { name: "본사 직원(Staff) 관리", href: "/dashboard/admin/staff", icon: Users },
    { name: "일일 업무 체크리스트", href: "/dashboard/admin/checklist", icon: ShieldCheck },
    { name: "전국 화원사(Tenant) 관리", href: "/dashboard/tenants", icon: Store },
    { name: "구독/결제 관제", href: "/dashboard/billing-admin", icon: CreditCard },
    { name: "글로벌 공지사항", href: "/dashboard/announcements", icon: ScrollText },
    { name: "시스템 전역 설정", href: "/dashboard/system-settings", icon: Settings },
    { name: "FAQ 및 AI 지식 관리", href: "/dashboard/admin/faq", icon: FileText },
    { name: "✨ 플랫폼 홍보 마스터", href: "/dashboard/marketing/admin", icon: Sparkles },
    { name: "⚙️ 화원사 환경 설정", href: "/dashboard/settings", icon: Settings },
  ];

  const tenantLinks = [
    { name: "화원 대시보드", href: "/dashboard", icon: LayoutDashboard },
    { name: "🆕 새 주문 등록", href: "/dashboard/orders/new", icon: PlusCircle, tier: ['pro', 'erp_only'] },
    { name: "📜 주문 목록", href: "/dashboard/orders", icon: ScrollText, tier: ['pro', 'erp_only'] },
    { name: "🖨️ 리본 프린터", href: "/dashboard/printer", icon: Printer, tier: ['pro', 'ribbon_only'] },
    { name: "🚚 배송 및 픽업 관리", href: "/dashboard/delivery", icon: Truck, tier: ['pro', 'erp_only'] },
    { name: "👥 고객 관리(CRM)", href: "/dashboard/customers", icon: Users, tier: ['pro', 'erp_only'] },
    { name: "🤝 협력사 수발주", href: "/dashboard/external-orders", icon: Share2, tier: ['pro', 'erp_only'] },
    { name: "🛍️ 상품 관리", href: "/dashboard/products", icon: Boxes, tier: ['pro', 'erp_only'] },
    { name: "📦 재고 관리", href: "/dashboard/inventory", icon: Boxes, tier: ['pro', 'erp_only'] },
    { name: "🤝 거래처 관리", href: "/dashboard/suppliers", icon: Store, tier: ['pro', 'erp_only'] },
    { name: "🛍️ 매입 관리", href: "/dashboard/purchases", icon: ShoppingCart, tier: ['pro', 'erp_only'] },
    { name: "📊 정산 및 보고서", href: "/dashboard/reports", icon: BarChart3, tier: ['pro', 'erp_only'] },
    { name: "📈 매입/매출 통계", href: "/dashboard/analytics", icon: BarChart3, tier: ['pro', 'erp_only'] },
    { name: "💰 지출 관리", href: "/dashboard/expenses", icon: CreditCard, tier: ['pro', 'erp_only'] },
    { name: "🧾 세무 관리", href: "/dashboard/tax", icon: FileText, tier: ['pro', 'erp_only'] },
    { name: "✨ AI 홍보 마스터", href: "/dashboard/marketing", icon: Sparkles, tier: ['pro', 'erp_only'] },
    { name: "🎨 카드 디자인", href: "/dashboard/design-studio", icon: Layout, tier: ['pro', 'ribbon_only'] },
    { name: "💎 구독 및 플랜 안내", href: "/dashboard/subscription", icon: Gem },
    { name: "📟 POS 연동", href: "/dashboard/settings/pos", icon: Monitor, tier: ['pro', 'erp_only'] },
    { name: "⚙️ 환경 설정", href: "/dashboard/settings", icon: Settings },
  ];

  const filteredTenantLinks = tenantLinks.filter(link => {
    if (isSuperAdmin) return true;
    
    // If expired or suspended, restrict access to premium features (those with 'tier')
    if (isExpired || isSuspended) {
      return !link.tier; // Only show links that don't require a specific tier (basic links)
    }

    if (!link.tier) return true;
    return link.tier.includes(plan);
  });

  const links = isSuperAdmin ? adminLinks : filteredTenantLinks;

  return (
    <aside className={cn("flex w-64 flex-col bg-white border-r border-slate-100 h-full z-20 shadow-sm", className)}>
      <div className="p-6 pb-2">
        <Image
          src={logoUrl || "https://ecimg.cafe24img.com/pg1472b45444056090/lilymagflower/web/upload/category/logo/v2_d13ecd48bab61a0269fab4ecbe56ce07_lZMUZ1lORo_top.jpg"}
          alt="Florasync Logo"
          width={180}
          height={40}
          priority={true}
          style={{ width: 'auto', height: 'auto' }}
          className="h-10 w-auto object-contain mx-auto mix-blend-multiply dark:mix-blend-normal dark:invert"
        />
        <div className="mt-3 text-center">
           <span className={cn(
             "text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block border",
             isSuperAdmin ? "bg-blue-50 text-blue-600 border-blue-100" : "bg-emerald-50 text-emerald-600 border-emerald-100"
           )}>
             {isSuperAdmin ? 'ADMIN MODE' : 'PARTNER'}
           </span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
        {links.map((link) => {
          // Normalize paths for comparison to avoid trailing slash issues
          const normalizedPathname = pathname.replace(/\/$/, "");
          const normalizedHref = link.href.replace(/\/$/, "");
          
          // Only highlight if the path exactly matches. 
          // For the root dashboard, it should only be active if the path is exactly /dashboard (normalized to empty if we're not careful)
          const isActive = normalizedPathname === normalizedHref;
          
          const Icon = link.icon;
          
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200",
                isActive 
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-200 transform scale-[1.02]" 
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon 
                className={cn(
                  "mr-3 flex-shrink-0 h-5 w-5 transition-all duration-200 group-hover:scale-110", 
                  isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                )} 
                aria-hidden="true" 
              />
              {link.name}
            </Link>
          );
        })}
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
      {!isSuperAdmin && plan !== 'pro' && (
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
        <p className="text-[10px] text-center text-slate-400 font-normal uppercase tracking-widest">Florasync v25.0</p>
      </div>
    </aside>
  );
}

