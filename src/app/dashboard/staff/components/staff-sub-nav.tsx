"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Clock, Wallet, CalendarOff } from "lucide-react";
import { cn } from "@/lib/utils";

const ITEMS = [
  { href: "/dashboard/staff", label: "직원·PIN·권한", icon: Users, exact: true },
  { href: "/dashboard/staff/attendance", label: "출퇴근", icon: Clock, exact: false },
  { href: "/dashboard/staff/salary", label: "급여", icon: Wallet, exact: false },
  { href: "/dashboard/staff/leave", label: "휴가", icon: CalendarOff, exact: false },
] as const;

export function StaffSubNav() {
  const pathname = usePathname() ?? "";

  return (
    <nav className="flex flex-wrap gap-2 mb-6" aria-label="직원 HR 메뉴">
      {ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-bold transition-colors",
              isActive
                ? "bg-slate-900 text-white shadow-md"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
