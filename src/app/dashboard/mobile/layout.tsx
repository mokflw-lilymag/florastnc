"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { MobilePosNav } from "@/components/mobile/mobile-pos-nav";

export default function MobileDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-gray-50">
      <div className="flex shrink-0 items-center gap-2 border-b bg-white px-3 py-2">
        <Link
          href="/dashboard"
          className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
        >
          <ChevronLeft className="h-4 w-4" />
          PC 홈
        </Link>
        <span className="text-sm font-bold text-violet-700">FloXync 모바일 매장</span>
      </div>
      <MobilePosNav />
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  );
}
