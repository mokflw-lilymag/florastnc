"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Globe,
  Loader2,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  acceptPartnerExternalOrder,
  rejectPartnerExternalOrder,
  type ExternalOrderRecord,
} from "@/lib/partner-order-service";
import { maskPartnerName, maskPartnerPhone } from "@/lib/partner-order-masking";
/** 회원사간 수발주 전용 — `external_orders` (지점 주문이관 `order_transfers` 와 별개) */
type TabKey = "received" | "sent";

type ExternalOrderRow = ExternalOrderRecord & { created_at: string };

function statusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge className="bg-amber-50 text-amber-700 border-amber-200">수락 대기</Badge>;
    case "accepted":
      return <Badge className="bg-blue-50 text-blue-700 border-blue-200">수락됨</Badge>;
    case "rejected":
      return <Badge className="bg-rose-50 text-rose-700 border-rose-200">반려</Badge>;
    case "completed":
      return <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">완료</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

export default function PartnerOrdersPage() {
  const supabase = createClient();
  const { tenantId } = useAuth();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "sent" ? "sent" : "received";

  const [tab, setTab] = useState<TabKey>(initialTab);
  const [rows, setRows] = useState<ExternalOrderRow[]>([]);
  const [tenantNames, setTenantNames] = useState<Record<string, string>>({});
  const [myShopName, setMyShopName] = useState("");
  const [canReceiveOrders, setCanReceiveOrders] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) return;
    void supabase
      .from("tenants")
      .select("can_receive_orders")
      .eq("id", tenantId)
      .maybeSingle()
      .then(({ data }) => setCanReceiveOrders(!!data?.can_receive_orders));
  }, [tenantId, supabase]);

  const loadRows = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const column = tab === "received" ? "receiver_tenant_id" : "sender_tenant_id";
      const { data, error } = await supabase
        .from("external_orders")
        .select("*")
        .eq(column, tenantId)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      setRows((data || []) as ExternalOrderRow[]);

      const ids = new Set<string>([tenantId]);
      (data || []).forEach((r: ExternalOrderRow) => {
        ids.add(r.sender_tenant_id);
        ids.add(r.receiver_tenant_id);
      });
      const { data: tenants } = await supabase.from("tenants").select("id, name").in("id", [...ids]);
      const map: Record<string, string> = {};
      (tenants || []).forEach((t: { id: string; name: string }) => {
        map[t.id] = t.name;
      });
      setTenantNames(map);
      setMyShopName(map[tenantId] || "");
    } catch (err) {
      console.error("[partner-orders] load failed", err);
      toast.error("회원사 수발주 내역을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [supabase, tenantId, tab]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    const onRefresh = () => void loadRows();
    window.addEventListener("refreshPartnerOrdersList", onRefresh);
    return () => window.removeEventListener("refreshPartnerOrdersList", onRefresh);
  }, [loadRows]);

  const stats = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending").length;
    const done = rows.filter((r) => r.status === "accepted" || r.status === "completed").length;
    return { pending, done, total: rows.length };
  }, [rows]);

  const handleAccept = async (row: ExternalOrderRow) => {
    if (!tenantId || !canReceiveOrders) {
      toast.error("환경설정에서 수주점 등록 후 수주할 수 있습니다.");
      return;
    }
    setActingId(row.id);
    try {
      const senderName = tenantNames[row.sender_tenant_id] || "발주 매장";
      const branding = row.order_data?.sender_branding;
      let senderContact = branding?.contact || "";
      let senderLogoUrl = branding?.logo_url || null;
      if (!branding?.contact) {
        const { data: senderTenant } = await supabase
          .from("tenants")
          .select("contact_phone, logo_url")
          .eq("id", row.sender_tenant_id)
          .maybeSingle();
        senderContact = senderTenant?.contact_phone || "";
        senderLogoUrl = senderTenant?.logo_url || null;
      }

      const { printOk } = await acceptPartnerExternalOrder({
        supabase,
        tenantId,
        row,
        senderName,
        senderContact,
        senderLogoUrl,
        receiverShopName: myShopName || "수주 매장",
        printOnAccept: true,
      });

      if (printOk) {
        toast.success("회원사 수주를 수락했으며, 주문서·인수증 출력을 보냈습니다.");
      } else {
        toast.warning("수주는 수락되었으나 자동 인쇄 전송에 실패했습니다.");
      }
      void loadRows();
    } catch (err) {
      console.error("[partner-orders] accept", err);
      toast.error("수락 처리 중 오류가 발생했습니다.");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (row: ExternalOrderRow) => {
    if (!tenantId) return;
    setActingId(row.id);
    try {
      await rejectPartnerExternalOrder(supabase, row.id, row.origin_order_id);
      toast.success("회원사 수주 요청을 반려했습니다.");
      void loadRows();
    } catch (err) {
      console.error("[partner-orders] reject", err);
      toast.error("반려 처리 중 오류가 발생했습니다.");
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="회원사 수발주"
        description="발주는 모든 매장이 이용할 수 있습니다. 수주·수락은 환경설정에서 수주점으로 등록한 매장만 가능합니다."
      >
        <div className="flex flex-wrap gap-2 mt-4 lg:mt-0">
          <Button variant="outline" asChild className="rounded-2xl font-bold">
            <Link href="/dashboard/orders">주문 현황</Link>
          </Button>
          <Button
            variant="outline"
            onClick={() => void loadRows()}
            disabled={loading}
            className="rounded-2xl font-bold gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            새로고침
          </Button>
        </div>
      </PageHeader>

      {tab === "received" && !canReceiveOrders ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          수주함은 <strong>환경설정 → 수주점 등록</strong>을 완료한 매장만 이용할 수 있습니다.{" "}
          <Link href="/dashboard/settings" className="font-bold underline">
            환경설정으로 이동
          </Link>
        </div>
      ) : null}

      <div className="flex gap-2">
        <Button
          type="button"
          variant={tab === "received" ? "default" : "outline"}
          className="rounded-2xl font-bold gap-2"
          onClick={() => setTab("received")}
        >
          <ArrowDownLeft className="h-4 w-4" />
          수주함
        </Button>
        <Button
          type="button"
          variant={tab === "sent" ? "default" : "outline"}
          className="rounded-2xl font-bold gap-2"
          onClick={() => setTab("sent")}
        >
          <ArrowUpRight className="h-4 w-4" />
          발주함
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="rounded-3xl border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500">전체</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-black">{stats.total}건</CardContent>
        </Card>
        <Card className="rounded-3xl border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-amber-600">수락 대기</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-black text-amber-600">{stats.pending}건</CardContent>
        </Card>
        <Card className="rounded-3xl border-none shadow-md">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-blue-600">수락·완료</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-black text-blue-600">{stats.done}건</CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-xl overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center py-16 text-slate-400 gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              불러오는 중…
            </div>
          ) : rows.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-sm">
              <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {tab === "received" ? "수주 요청이 없습니다." : "발주 내역이 없습니다."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80">
                  <TableHead>일시</TableHead>
                  <TableHead>{tab === "received" ? "발주 꽃집" : "수주 꽃집"}</TableHead>
                  <TableHead>상품</TableHead>
                  {tab === "received" ? (
                    <>
                      <TableHead>주문자(마스킹)</TableHead>
                      <TableHead>수주 금액</TableHead>
                    </>
                  ) : (
                    <TableHead>발주 금액</TableHead>
                  )}
                  <TableHead>상태</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const partnerId =
                    tab === "received" ? row.sender_tenant_id : row.receiver_tenant_id;
                  const items = row.order_data?.items || [];
                  const itemLabel =
                    items.length > 0
                      ? `${items[0].name || "상품"}${items.length > 1 ? ` 외 ${items.length - 1}` : ""}`
                      : "—";
                  const orderer = row.order_data?.orderer;
                  const amount =
                    tab === "received" ? row.fulfillment_amount : row.total_amount;

                  return (
                    <TableRow key={row.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {row.created_at
                          ? format(parseISO(row.created_at), "yyyy-MM-dd HH:mm")
                          : "—"}
                      </TableCell>
                      <TableCell className="font-bold text-sm">
                        {tenantNames[partnerId] || "—"}
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px] truncate">{itemLabel}</TableCell>
                      {tab === "received" ? (
                        <>
                          <TableCell className="text-xs">
                            {`${maskPartnerName(orderer?.name)} (${maskPartnerPhone(orderer?.contact)})`}
                          </TableCell>
                          <TableCell className="font-bold text-blue-700">
                            ₩{Math.round(Number(amount || 0)).toLocaleString()}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell className="font-bold">
                          ₩{Math.round(Number(amount || 0)).toLocaleString()}
                        </TableCell>
                      )}
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell className="text-right">
                        {tab === "received" && row.status === "pending" ? (
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 text-xs rounded-xl text-rose-600"
                              disabled={actingId === row.id || !canReceiveOrders}
                              onClick={() => void handleReject(row)}
                            >
                              반려
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-500"
                              disabled={actingId === row.id || !canReceiveOrders}
                              onClick={() => void handleAccept(row)}
                            >
                              {actingId === row.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "수락 & 인쇄"
                              )}
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
