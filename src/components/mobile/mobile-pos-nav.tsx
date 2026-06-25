"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useMobileShopMessages } from "@/lib/mobile/use-mobile-shop-messages";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MobilePosNav() {
  const pathname = usePathname() ?? "";
  const { m } = useMobileShopMessages();

  const TABS = [
    { href: "/dashboard/mobile/pickup", label: m.nav.pickupDelivery, emoji: "📦", accent: "emerald" as const },
    { href: "/dashboard/mobile/pos/quick", label: m.nav.quickPos, emoji: "⚡", accent: "orange" as const },
    { href: "/dashboard/mobile/orders/new", label: m.nav.newOrder, emoji: "📝", accent: "blue" as const },
  ];

  return (
    <div className="flex shrink-0 gap-1 border-b bg-white px-3 pt-2">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        const accentBorder =
          tab.accent === "emerald"
            ? "border-emerald-500 text-emerald-700 bg-emerald-50/60"
            : tab.accent === "orange"
              ? "border-orange-500 text-orange-700 bg-orange-50/60"
              : "border-blue-500 text-blue-700 bg-blue-50/60";

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex-1 whitespace-nowrap rounded-t-xl border-b-4 py-2 text-center text-xs font-bold transition-all",
              active
                ? cn("font-black", accentBorder)
                : "border-transparent text-gray-400 hover:bg-gray-50"
            )}
          >
            {tab.emoji} {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
