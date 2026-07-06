"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { Loader2, Truck, Search, Package, Mail, CheckCircle2, AlertTriangle, CalendarRange, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PRINTER_COURIERS,
  type PrinterLeaseRow,
} from "@/lib/admin/printer-logistics/types";
import { getLeaseStatus, leaseExpiryNeedsAttention } from "@/lib/admin/printer-logistics/lease-status";
import { LeaseExpiryBadge } from "@/components/admin/lease-expiry-badge";
import { cn } from "@/lib/utils";

function fmtDate(v: string | null) {
  if (!v) return "—";
  try {
    return format(parseISO(v.length === 10 ? `${v}T00:00:00` : v), "yyyy-MM-dd");
  } catch {
    return v;
  }
}

function deviceLabel(dt: PrinterLeaseRow["device_type"]) {
  return dt === "pos" ? "포스" : "라벨";
}

export function PrinterLogisticsClient() {
  const { isSuperAdmin, isLoading } = useAuth();
  const [leases, setLeases] = useState<PrinterLeaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<PrinterLeaseRow | null>(null);
  const [courier, setCourier] = useState("");
  const [tracking, setTracking] = useState("");
  const [returnCompleted, setReturnCompleted] = useState(false);
  const [returnedAt, setReturnedAt] = useState("");
  const [sendShipmentEmail, setSendShipmentEmail] = useState(true);
  const [sendReturnEmail, setSendReturnEmail] = useState(true);
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();
  const filterQuery = searchParams.get("filter");
  const [filterMode, setFilterMode] = useState<"all" | "overdue" | "expiring" | "today">("all");

  useEffect(() => {
    if (filterQuery === "overdue" || filterQuery === "expiring" || filterQuery === "today") {
      setFilterMode(filterQuery);
    } else {
      setFilterMode("all");
    }
  }, [filterQuery]);

  const stats = useMemo(() => {
    let activeLeases = 0;
    let overdueLeases = 0;
    let expiringLeases = 0;
    let todayLeases = 0;

    leases.forEach((l) => {
      if (l.leased && !l.return_completed) {
        activeLeases++;
        const status = getLeaseStatus(l.lease_end, l.return_completed, l.leased);
        if (status.type === "overdue") overdueLeases++;
        else if (status.type === "today") todayLeases++;
        else if (status.type === "expiring") expiringLeases++;
      }
    });

    return { activeLeases, overdueLeases, expiringLeases, todayLeases };
  }, [leases]);

  const load = useCallback(async (q?: string) => {
    setLoading(true);
    try {
      const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      const res = await fetch(`/api/admin/printer-logistics${qs}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "목록 로드 실패");
      setLeases(data.leases ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "로드 오류");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isSuperAdmin) void load();
  }, [isSuperAdmin, load]);

  const openRow = (row: PrinterLeaseRow) => {
    setSelected(row);
    setCourier(row.courier ?? "");
    setTracking(row.tracking_number ?? "");
    setReturnCompleted(row.return_completed);
    setReturnedAt(row.returned_at ?? new Date().toISOString().slice(0, 10));
    setSendShipmentEmail(true);
    setSendReturnEmail(true);
    setDialogOpen(true);
  };

  const save = async (emailMode: "shipment" | "return" | "none") => {
    if (!selected) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        tenantId: selected.tenant_id,
        deviceType: selected.device_type,
        courier,
        tracking_number: tracking,
        return_completed: returnCompleted,
        returned_at: returnedAt || undefined,
      };

      if (emailMode === "shipment" && sendShipmentEmail && !returnCompleted) {
        body.sendEmail = "shipment";
      } else if (emailMode === "return" && returnCompleted && sendReturnEmail) {
        body.sendEmail = "return";
      }

      const res = await fetch("/api/admin/printer-logistics", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "저장 실패");

      if (data.email?.status === "failed") {
        toast.warning(`저장됐으나 메일 발송 실패: ${data.email.error ?? "오류"}`);
      } else if (data.email?.status === "simulated") {
        toast.success("저장 완료 (SMTP 미설정 — 메일 시뮬레이션)");
      } else if (data.email) {
        toast.success("저장 및 메일 발송 완료");
      } else {
        toast.success("저장 완료");
      }

      setDialogOpen(false);
      await load(search);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "저장 오류");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  const active = leases.filter((l) => l.leased && !l.return_completed);
  const returned = leases.filter((l) => l.return_completed);

  const filteredActive = useMemo(() => {
    return active.filter((l) => {
      if (filterMode === "all") return true;
      const status = getLeaseStatus(l.lease_end, l.return_completed, l.leased);
      return status.type === filterMode;
    });
  }, [active, filterMode]);

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      <PageHeader
        title="출고 · 반납"
        description="임대 만료일은 매장 구독 만료(subscription_end) 기준입니다. 연체·임박 장비는 상단 카드와 목록 배지로 확인하세요."
        icon={Truck}
      />

      {/* 장비 물류 현황 전광판 */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card 
          className={cn(
            "cursor-pointer transition-all hover:border-slate-400 border border-transparent shadow-sm",
            filterMode === "all" ? "border-slate-800 bg-slate-50/50 shadow-md" : "bg-white"
          )}
          onClick={() => setFilterMode("all")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 font-medium">전체 임대 중</p>
              <h3 className="text-2xl font-bold mt-1 text-slate-900">{stats.activeLeases}대</h3>
            </div>
            <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
              <Package className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:border-red-400 border border-transparent shadow-sm",
            filterMode === "overdue" ? "border-red-600 bg-red-50/50 shadow-md" : "bg-white",
            stats.overdueLeases > 0 ? "animate-pulse" : ""
          )}
          onClick={() => setFilterMode("overdue")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-red-500 font-semibold">반납 연체 중</p>
              <h3 className="text-2xl font-bold mt-1 text-red-600">{stats.overdueLeases}대</h3>
            </div>
            <div className="p-2 bg-red-100 rounded-lg text-red-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:border-amber-400 border border-transparent shadow-sm",
            filterMode === "today" ? "border-amber-600 bg-amber-50/50 shadow-md" : "bg-white"
          )}
          onClick={() => setFilterMode("today")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 font-semibold">오늘 만료 예정</p>
              <h3 className="text-2xl font-bold mt-1 text-amber-700">{stats.todayLeases}대</h3>
            </div>
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card 
          className={cn(
            "cursor-pointer transition-all hover:border-orange-400 border border-transparent shadow-sm",
            filterMode === "expiring" ? "border-orange-600 bg-orange-50/50 shadow-md" : "bg-white"
          )}
          onClick={() => setFilterMode("expiring")}
        >
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-orange-500 font-semibold">7일 내 반납 예정</p>
              <h3 className="text-2xl font-bold mt-1 text-orange-600">{stats.expiringLeases}대</h3>
            </div>
            <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
              <CalendarRange className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap gap-3 items-end justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="w-5 h-5" /> 임대 장비 물류
                {filterMode !== "all" && (
                  <Badge 
                    variant="destructive" 
                    className={cn(
                      "cursor-pointer hover:bg-red-600 gap-1 text-[11px] font-bold px-2 py-0.5 ml-2",
                      filterMode === "overdue" ? "bg-red-600 text-white" :
                      filterMode === "today" ? "bg-amber-600 text-white" :
                      "bg-orange-600 text-white"
                    )}
                    onClick={() => setFilterMode("all")}
                  >
                    필터: {filterMode === "overdue" ? "반납 연체" : filterMode === "today" ? "오늘 만료" : "7일 내 만료"} ✕
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>택배사·송장·반납 완료를 기록하고 출고/반납 안내 메일을 보냅니다.</CardDescription>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  className="pl-9"
                  placeholder="상호·기종·송장 검색"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void load(search)}
                />
              </div>
              <Button variant="outline" onClick={() => void load(search)}>
                검색
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : (
            <div className="space-y-8">
              <section>
                <h3 className="text-sm font-semibold text-slate-700 mb-2">
                  임대 중 ({filteredActive.length} / {active.length})
                </h3>
                <LeaseTable rows={filteredActive} onRowClick={openRow} emptyText="필터 조건에 부합하는 임대 장비가 없습니다." />
              </section>
              {returned.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-slate-500 mb-2">
                    반납 완료 ({returned.length})
                  </h3>
                  <LeaseTable rows={returned} onRowClick={openRow} muted />
                </section>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selected?.tenant_name} — {selected ? deviceLabel(selected.device_type) : ""} 프린터
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg">
                <div>
                  <p className="text-xs text-slate-500">기종</p>
                  <p className="font-medium">{selected.model_name || "—"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">임대 기간</p>
                  <p className="font-medium">
                    {fmtDate(selected.lease_start)} ~ {fmtDate(selected.lease_end)}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs text-slate-500">연락 이메일</p>
                  <p className="font-medium">{selected.contact_email || "—"}</p>
                </div>
              </div>

              <div>
                <Label>택배사</Label>
                <Select value={courier || "__none__"} onValueChange={(v) => setCourier(!v || v === "__none__" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="택배사 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">선택 안 함</SelectItem>
                    {PRINTER_COURIERS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>송장번호</Label>
                <Input value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="123456789012" />
              </div>

              <div className="flex items-center gap-2 border-t pt-4">
                <Checkbox
                  id="return-done"
                  checked={returnCompleted}
                  onCheckedChange={(v) => setReturnCompleted(!!v)}
                />
                <Label htmlFor="return-done" className="cursor-pointer">
                  반납 완료 (임대 해제)
                </Label>
              </div>
              {returnCompleted && (
                <div>
                  <Label>반납일</Label>
                  <Input type="date" value={returnedAt} onChange={(e) => setReturnedAt(e.target.value)} />
                </div>
              )}

              <div className="space-y-2 border-t pt-4">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="send-ship"
                    checked={sendShipmentEmail}
                    onCheckedChange={(v) => setSendShipmentEmail(!!v)}
                    disabled={returnCompleted}
                  />
                  <Label htmlFor="send-ship" className="cursor-pointer flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> 출고 안내 메일 발송
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="send-ret"
                    checked={sendReturnEmail}
                    onCheckedChange={(v) => setSendReturnEmail(!!v)}
                  />
                  <Label htmlFor="send-ret" className="cursor-pointer flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5" /> 반납 안내 메일 발송
                  </Label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button
              variant="outline"
              disabled={saving}
              onClick={() => void save("none")}
            >
              물류만 저장
            </Button>
            {!returnCompleted && (
              <Button disabled={saving} onClick={() => void save("shipment")} className="gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                출고 저장
              </Button>
            )}
            {returnCompleted && (
              <Button disabled={saving} onClick={() => void save("return")} className="gap-2">
                {saving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                반납 완료 저장
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeaseTable({
  rows,
  onRowClick,
  emptyText = "데이터 없음",
  muted = false,
}: {
  rows: PrinterLeaseRow[];
  onRowClick: (row: PrinterLeaseRow) => void;
  emptyText?: string;
  muted?: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500 py-6 text-center">{emptyText}</p>;
  }

  return (
    <div className="border rounded-xl overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>상호</TableHead>
            <TableHead>구분</TableHead>
            <TableHead>기종</TableHead>
            <TableHead>임대 시작</TableHead>
            <TableHead>만료</TableHead>
            <TableHead>택배</TableHead>
            <TableHead>송장</TableHead>
            <TableHead>상태</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const expiry = getLeaseStatus(row.lease_end, row.return_completed, row.leased);
            const attention = !muted && leaseExpiryNeedsAttention(expiry);
            return (
            <TableRow
              key={`${row.tenant_id}-${row.device_type}`}
              className={cn(
                "cursor-pointer hover:bg-slate-50",
                muted && "text-slate-500",
                expiry.type === "overdue" && !muted && "bg-red-50/80 hover:bg-red-50",
                expiry.type === "today" && !muted && "bg-amber-50/60 hover:bg-amber-50",
              )}
              onClick={() => onRowClick(row)}
            >
              <TableCell className="font-medium">{row.tenant_name}</TableCell>
              <TableCell>{deviceLabel(row.device_type)}</TableCell>
              <TableCell>{row.model_name || "—"}</TableCell>
              <TableCell>{fmtDate(row.lease_start)}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 items-start">
                  <span className={cn(expiry.type === "overdue" && "text-red-700 font-semibold")}>
                    {fmtDate(row.lease_end)}
                  </span>
                  {!row.return_completed && (
                    <LeaseExpiryBadge
                      leaseEnd={row.lease_end}
                      leased={row.leased}
                      returnCompleted={row.return_completed}
                      compact
                    />
                  )}
                </div>
              </TableCell>
              <TableCell>{row.courier || "—"}</TableCell>
              <TableCell className="font-mono text-xs">{row.tracking_number || "—"}</TableCell>
              <TableCell>
                <div className="flex flex-col gap-1 items-start">
                  {row.return_completed ? (
                    <Badge variant="secondary">반납완료</Badge>
                  ) : (
                    <>
                      {row.tracking_number ? (
                        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">출고</Badge>
                      ) : (
                        <Badge variant="outline">임대중</Badge>
                      )}
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

