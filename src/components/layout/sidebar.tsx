"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Printer, ScrollText, Users, Store, 
  Settings, LayoutDashboard, ShieldCheck,
  CreditCard, Boxes, Truck
} from "lucide-react";
import Image from "next/image";

interface SidebarProps {
  isSuperAdmin: boolean;
  plan: string;
}

export function Sidebar({ isSuperAdmin, plan }: SidebarProps) {
  const pathname = usePathname();

  // Navigation schema based on role
  const adminLinks = [
    { name: "시스템 통합 대시보드", href: "/dashboard", icon: ShieldCheck },
    { name: "전국 화원사(Tenant) 관리", href: "/dashboard/tenants", icon: Store },
    { name: "구독/결제 관제", href: "/dashboard/billing-admin", icon: CreditCard },
    { name: "글로벌 공지사항", href: "/dashboard/announcements", icon: ScrollText },
    { name: "시스템 전역 설정", href: "/dashboard/system-settings", icon: Settings },
  ];

  const tenantLinks = [
    { name: "화원 대시보드", href: "/dashboard", icon: LayoutDashboard },
    { name: "🖨️ 리본 프린터", href: "/dashboard/printer", icon: Printer, tier: ['pro', 'ribbon_only'] },
    { name: "주문 및 배차 관리", href: "/dashboard/orders", icon: Truck, tier: ['pro', 'erp_only'] },
    { name: "상품/꽃 카탈로그", href: "/dashboard/products", icon: Boxes, tier: ['pro', 'erp_only'] },
    { name: "고객 관리(CRM)", href: "/dashboard/customers", icon: Users, tier: ['pro', 'erp_only'] },
    { name: "플랜 및 환경 설정", href: "/dashboard/settings", icon: Settings },
  ];

  const filteredTenantLinks = tenantLinks.filter(link => {
    if (isSuperAdmin) return true;
    if (!link.tier) return true;
    return link.tier.includes(plan);
  });

  const links = isSuperAdmin ? adminLinks : filteredTenantLinks;

  return (
    <aside className="hidden lg:flex w-64 flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800 h-full z-20">
      <div className="p-6 pb-2">
        <Image
          src="https://ecimg.cafe24img.com/pg1472b45444056090/lilymagflower/web/upload/category/logo/v2_d13ecd48bab61a0269fab4ecbe56ce07_lZMUZ1lORo_top.jpg"
          alt="Florasync Logo"
          width={180}
          height={40}
          priority={true}
          style={{ width: 'auto', height: 'auto' }}
          className="h-10 w-auto object-contain mx-auto mix-blend-multiply dark:mix-blend-normal dark:invert"
        />
        <div className="mt-3 text-center">
           <span className={cn(
             "text-xs font-bold px-2 py-0.5 rounded-full inline-block",
             isSuperAdmin ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300" : "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300"
           )}>
             {isSuperAdmin ? 'ADMIN MODE' : 'PARTNER'}
           </span>
        </div>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-1 overflow-y-auto">
        {links.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          const Icon = link.icon;
          
          return (
            <Link
              key={link.name}
              href={link.href}
              className={cn(
                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-slate-900 text-white shadow-md dark:bg-slate-100 dark:text-slate-900" 
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              )}
            >
              <Icon 
                className={cn(
                  "mr-3 flex-shrink-0 h-5 w-5 transition-transform duration-200 group-hover:scale-110", 
                  isActive ? "text-white dark:text-slate-900" : "text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300"
                )} 
                aria-hidden="true" 
              />
              {link.name}
            </Link>
          );
        })}
      </nav>
      
      {/* Optional: User profile or version summary at bottom of sidebar */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800">
        <p className="text-xs text-center text-slate-500 font-medium">Florasync SaaS v2.0</p>
      </div>
    </aside>
  );
}
