"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Plus, 
  Printer, 
  Truck, 
  ScrollText, 
  CreditCard, 
  Boxes,
  LayoutDashboard,
  ClipboardList
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function GlobalQuickNav() {
  const pathname = usePathname();

  const navItems = [
    { icon: LayoutDashboard, label: '홈', href: '/dashboard' },
    { icon: Plus, label: '새주문', href: '/dashboard/orders/new' },
    { icon: ClipboardList, label: '주문현황', href: '/dashboard/orders' },
    { icon: Printer, label: '리본', href: '/dashboard/printer' },
    { icon: Truck, label: '배송/픽업', href: '/dashboard/delivery' },
    { icon: ScrollText, label: '정산', href: '/dashboard/reports' },
    { icon: CreditCard, label: '지출', href: '/dashboard/expenses' },
    { icon: Boxes, label: '재고', href: '/dashboard/inventory' },
  ];

  return (
    <>
      {/* (1) Mobile Bottom Navigation (Visible on md- and under) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[100] bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-2 py-3 pb-safe shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-1 max-w-md mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-1.5 py-1 rounded-xl transition-all",
                  isActive 
                    ? "text-primary dark:text-primary font-bold scale-105" 
                    : "text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <div className={cn(
                  "p-1.5 rounded-lg transition-all",
                  isActive ? "bg-primary/10" : ""
                )}>
                  <item.icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] leading-none whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* (2) Desktop Quick Nav (Visible on lg+ only) */}
      <nav className="hidden lg:flex sticky top-16 z-20 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-gray-100 dark:border-slate-800 px-4 py-2 items-center justify-center overflow-x-auto no-scrollbar shadow-sm">
        <div className="flex items-center gap-4 max-w-7xl mx-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all whitespace-nowrap group",
                  isActive 
                    ? "bg-primary text-white shadow-md shadow-primary/20 scale-105" 
                    : "text-gray-500 hover:bg-gray-100 dark:hover:bg-slate-800 hover:text-gray-900 dark:hover:text-white"
                )}
              >
                <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "group-hover:text-primary transition-colors")} />
                <span className={cn("text-xs font-medium", !isActive && "hidden md:inline")}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
