"use client";

import { useCallback, useEffect, useState } from "react";
import { FulfillRequestDialog } from "./fulfill-request-dialog";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { ClipboardList, LayoutGrid, Loader2, ListTree } from "lucide-react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MaterialRequestsConsolidationPanel } from "./consolidation-panel";
import type { HqRequestInput } from "@/lib/hq-material-request-consolidation";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

type Line = {
  id: string;
  material_id?: string | null;
  name: string;
  main_category: string;
  mid_category: string;
  quantity: number;
  unit: string;
  spec: string | null;
};

type Req = HqRequestInput;

export default function HqMaterialRequestsPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, isSuperAdmin } = useAuth();
  const [forbidden, setForbidden] = useState(false);
  const [gateLoading, setGateLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [warning, setWarning] = useState<string | null>(null);
  const [requests, setRequests] = useState<Req[]>([]);
  const [fulfillOpen, setFulfillOpen] = useState(false);
  const [fulfillTarget, setFulfillTarget] = useState<Req | null>(null);
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);
  const formatStatus = (status: string) => {
    const map: Record<string, string> = {
      pending: tr("대기", "Pending"),
      reviewing: tr("검토중", "Reviewing"),
      fulfilled: tr("처리완료", "Fulfilled"),
      cancelled: tr("취소", "Cancelled"),
    };
    return map[status] ?? status;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/branch/material-requests", { credentials: "include" });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return;
      setRequests((j.requests ?? []) as Req[]);
      setWarning(typeof j.warning === "string" ? j.warning : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading || !user) return;
    let cancelled = false;
    (async () => {
      setGateLoading(true);
      if (isSuperAdmin) {
        if (!cancelled) {
          setForbidden(false);
          setGateLoading(false);
        }
        return;
      }
      const supabase = createClient();
      const { count } = await supabase
        .from("organization_members")
        .select("organization_id", { count: "exact", head: true })
        .eq("user_id", user.id);
      if (!cancelled) {
        setForbidden((count ?? 0) === 0);
        setGateLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading, user, isSuperAdmin]);

  useEffect(() => {
    if (authLoading || gateLoading || forbidden) return;
    void load();
  }, [authLoading, gateLoading, forbidden, load]);

  if (authLoading || gateLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) return null;

  if (forbidden) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <PageHeader
          title={tr("지점 자재 요청", "Branch Material Requests")}
          description={tr("조직에 배정된 계정만 전체 요청 목록을 볼 수 있습니다.", "Only organization-assigned accounts can view full request list.")}
          icon={ClipboardList}
        />
        <Card className="max-w-lg">
          <CardHeader>
            <CardTitle>{tr("접근할 수 없습니다", "Access denied")}</CardTitle>
            <CardDescription>{tr("본사·다매장 권한이 필요합니다.", "HQ/multi-store permission required.")}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/dashboard/hq")}>
              {tr("본사 개요로", "Go to HQ overview")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8">
      <PageHeader
        title={tr("지점 자재 요청", "Branch Material Requests")}
        description={tr("취합 발주안·내보내기·상태 변경 후, 지점별 원본에서 입고·지출 확정 시 해당 지점 재고와 지출에 반영됩니다. (supabase/branch_material_request_fulfillment.sql 적용 필요)", "After consolidation/export/status changes, confirming fulfillment applies stock/expense to each branch. (Requires supabase/branch_material_request_fulfillment.sql)")}
        icon={ClipboardList}
      />

      {warning ? (
        <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2 border border-amber-200 dark:border-amber-900">
          {warning}
        </p>
      ) : null}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : requests.length === 0 ? (
        <p className="text-sm text-muted-foreground">{tr("요청이 없습니다.", "No requests.")}</p>
      ) : (
        <Tabs defaultValue="consolidate" className="gap-6">
          <TabsList variant="line" className="w-full sm:w-auto">
            <TabsTrigger value="consolidate" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              {tr("취합 발주안", "Consolidated Draft")}
            </TabsTrigger>
            <TabsTrigger value="by-branch" className="gap-1.5">
              <ListTree className="h-4 w-4" />
              {tr("지점별 원본", "Per-branch Source")}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="consolidate" className="flex flex-col gap-6 mt-2">
            <MaterialRequestsConsolidationPanel requests={requests} onReload={load} />
          </TabsContent>

          <TabsContent value="by-branch" className="flex flex-col gap-8 mt-2">
            {requests.map((r) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center gap-2 justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-base">
                        {r.tenant_name ?? r.tenant_id.slice(0, 8)}
                      </CardTitle>
                      <Badge variant="outline">{formatStatus(r.status)}</Badge>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {baseLocale === "ko"
                          ? format(new Date(r.created_at), "yyyy.M.d HH:mm", { locale: ko })
                          : format(new Date(r.created_at), "yyyy-MM-dd HH:mm")}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {r.status === "pending" || r.status === "reviewing" ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            setFulfillTarget(r);
                            setFulfillOpen(true);
                          }}
                        >
                          {tr("입고·지출 확정", "Confirm Stock & Expense")}
                        </Button>
                      ) : null}
                      {!isSuperAdmin ? (
                        <Link
                          href={`/dashboard/hq/branches/${r.tenant_id}`}
                          className="text-xs text-primary underline underline-offset-4"
                        >
                          {tr("지점 요약", "Branch Summary")}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                  {r.branch_note ? (
                    <CardDescription className="text-foreground/90">{r.branch_note}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{tr("품목", "Item")}</TableHead>
                        <TableHead>{tr("대분류", "Main Category")}</TableHead>
                        <TableHead>{tr("중분류", "Mid Category")}</TableHead>
                        <TableHead className="text-right">{tr("수량", "Qty")}</TableHead>
                        <TableHead>{tr("비고", "Note")}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(r.lines ?? []).map((ln: Line) => (
                        <TableRow key={ln.id}>
                          <TableCell className="font-medium">{ln.name}</TableCell>
                          <TableCell className="text-sm">{ln.main_category}</TableCell>
                          <TableCell className="text-sm">{ln.mid_category}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {ln.quantity} {ln.unit}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {ln.spec ?? "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </TabsContent>
        </Tabs>
      )}

      <FulfillRequestDialog
        request={fulfillTarget}
        open={fulfillOpen}
        onOpenChange={(o) => {
          setFulfillOpen(o);
          if (!o) setFulfillTarget(null);
        }}
        onSuccess={() => void load()}
      />
    </div>
  );
}
