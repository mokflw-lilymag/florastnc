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
    <nav className="sticky top-16 z-20 w-full bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-2 flex items-center justify-center overflow-x-auto no-scrollbar shadow-sm">
      <div className="flex items-center gap-2 md:gap-4 max-w-7xl mx-auto">
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
                  : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
              )}
            >
              <item.icon className={cn("w-4 h-4", isActive ? "text-white" : "group-hover:text-primary transition-colors")} />
              <span className={cn("text-xs font-medium", !isActive && "hidden md:inline")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
