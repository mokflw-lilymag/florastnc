"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AlertTriangle, Headphones } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

/** 환경설정 대리 문의에서 진입했을 때 상단 안내 */
export function RemoteSettingsAssistBanner() {
  const [ticketId, setTicketId] = useState<string | null>(null);
  const { profile, isSuperAdmin } = useAuth();

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    setTicketId(p.get("supportTicket"));
  }, []);

  if (!ticketId || !isSuperAdmin) return null;

  const storeName = profile?.tenants?.name ?? "선택한 매장";

  return (
    <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-300/80 bg-amber-50 px-4 py-3 text-amber-950 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-2.5 min-w-0">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5 text-amber-600" />
        <div className="min-w-0 text-sm">
          <p className="font-semibold">원격 환경설정 중 — {storeName}</p>
          <p className="text-amber-900/80 mt-0.5">
            문의 SR 연동 · 저장 시 즉시 해당 매장에 반영됩니다. 작업 후 업무 모드를 종료해 주세요.
          </p>
        </div>
      </div>
      <Link
        href={`/dashboard/admin/support/${ticketId}`}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-400 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
      >
        <Headphones className="h-3.5 w-3.5" />
        문의로 돌아가기
      </Link>
    </div>
  );
}
