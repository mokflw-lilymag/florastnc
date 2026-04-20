"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import type { HqRequestInput } from "@/lib/hq-material-request-consolidation";

type Line = HqRequestInput["lines"][number];

type RowState = {
  lineId: string;
  actualQuantity: string;
  unitPrice: string;
  supplierId: string;
  exclude: boolean;
};

type SupplierOpt = { id: string; name: string };

type Props = {
  request: (HqRequestInput & { tenant_name?: string }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
};

export function FulfillRequestDialog({ request, open, onOpenChange, onSuccess }: Props) {
  const [rows, setRows] = useState<RowState[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOpt[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("card");

  const branchTenantId = request?.tenant_id ?? "";

  useEffect(() => {
    if (!open || !request) return;
    const lines = (request.lines ?? []) as Line[];
    setRows(
      lines.map((ln) => ({
        lineId: ln.id,
        actualQuantity: String(ln.quantity ?? 1),
        unitPrice: "",
        supplierId: "",
        exclude: false,
      }))
    );
  }, [open, request]);

  const loadSuppliers = useCallback(async () => {
    if (!branchTenantId) return;
    setLoadingSuppliers(true);
    try {
      const res = await fetch(
        `/api/hq/branch-suppliers?tenantId=${encodeURIComponent(branchTenantId)}`,
        { credentials: "include" }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "거래처 목록을 불러오지 못했습니다.");
        setSuppliers([]);
        return;
      }
      setSuppliers((j.suppliers ?? []) as SupplierOpt[]);
    } finally {
      setLoadingSuppliers(false);
    }
  }, [branchTenantId]);

  useEffect(() => {
    if (open && branchTenantId) void loadSuppliers();
  }, [open, branchTenantId, loadSuppliers]);

  const updateRow = (lineId: string, patch: Partial<RowState>) => {
    setRows((prev) => prev.map((r) => (r.lineId === lineId ? { ...r, ...patch } : r)));
  };

  const handleSubmit = async () => {
    if (!request) return;
    const items = rows.map((r) => ({
      lineId: r.lineId,
      actualQuantity: Number(r.actualQuantity),
      unitPrice: Number(r.unitPrice),
      supplierId: r.supplierId && r.supplierId !== "__none__" ? r.supplierId : null,
      exclude: r.exclude,
    }));

    for (const it of items) {
      if (it.exclude) continue;
      if (!Number.isFinite(it.actualQuantity) || it.actualQuantity <= 0) {
        toast.error("제외하지 않은 줄은 실입고 수량을 1 이상으로 입력하세요.");
        return;
      }
      if (!Number.isFinite(it.unitPrice) || it.unitPrice < 0) {
        toast.error("단가는 0 이상이어야 합니다.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/hq/branch-material-requests/fulfill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          requestId: request.id,
          expenseDate,
          paymentMethod,
          items,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : "처리에 실패했습니다.");
        return;
      }
      toast.success(
        `처리 완료 — 재고 ${j.stockLineCount ?? 0}건, 지출 ${j.expenseCount ?? 0}건이 지점에 반영되었습니다.`
      );
      onSuccess();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  if (!request) return null;

  const lineById = new Map((request.lines ?? []).map((ln) => [(ln as Line).id, ln as Line]));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] lg:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="h-5 w-5 text-emerald-600" />
            입고·지출 확정
          </DialogTitle>
          <DialogDescription>
            실제 입고 수량·단가를 입력하면 <strong className="text-foreground">해당 지점 자재 재고</strong>가 증가하고,{" "}
            <strong className="text-foreground">같은 지점 지출</strong>에 품목별 행이 자동 등록됩니다. 자재가 연결된 줄만
            재고에 반영됩니다(수기 품목은 지출만).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">지점</span>{" "}
            <span className="font-medium">{request.tenant_name ?? request.tenant_id.slice(0, 8)}</span>
          </div>
          {request.branch_note ? (
            <div>
              <span className="text-muted-foreground">지점 메모</span> {request.branch_note}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fulfill-date">지출 일자</Label>
            <Input
              id="fulfill-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>결제 수단</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v ?? "card")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">카드</SelectItem>
                <SelectItem value="cash">현금</SelectItem>
                <SelectItem value="bank_transfer">계좌이체</SelectItem>
                <SelectItem value="other">기타</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">제외</TableHead>
                <TableHead>품목</TableHead>
                <TableHead className="w-20 text-right">요청</TableHead>
                <TableHead className="w-24">실입고</TableHead>
                <TableHead className="w-28">단가</TableHead>
                <TableHead className="min-w-[140px]">거래처</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const ln = lineById.get(r.lineId);
                if (!ln) return null;
                const qty = Number(r.actualQuantity) || 0;
                const price = Number(r.unitPrice) || 0;
                const rowSum = qty * price;
                return (
                  <TableRow key={r.lineId} className={r.exclude ? "opacity-50" : ""}>
                    <TableCell>
                      <Checkbox
                        checked={r.exclude}
                        onCheckedChange={(v) => updateRow(r.lineId, { exclude: v === true })}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{ln.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {ln.main_category} · {ln.mid_category}
                        {ln.material_id ? (
                          <span className="ml-1 font-mono">· 재고연동</span>
                        ) : (
                          <span className="ml-1">· 수기(지출만)</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-sm">
                      {ln.quantity} {ln.unit}
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 tabular-nums"
                        type="number"
                        min={0}
                        step="any"
                        disabled={r.exclude}
                        value={r.actualQuantity}
                        onChange={(e) => updateRow(r.lineId, { actualQuantity: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        className="h-8 tabular-nums"
                        type="number"
                        min={0}
                        step="any"
                        disabled={r.exclude}
                        placeholder="0"
                        value={r.unitPrice}
                        onChange={(e) => updateRow(r.lineId, { unitPrice: e.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Select
                        value={r.supplierId || "__none__"}
                        onValueChange={(v) =>
                          updateRow(r.lineId, {
                            supplierId: v === "__none__" || v == null ? "" : v,
                          })
                        }
                        disabled={r.exclude || loadingSuppliers}
                      >
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder={loadingSuppliers ? "불러오는 중…" : "선택"} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">미지정</SelectItem>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!r.exclude && rowSum > 0 ? (
                        <div className="text-[11px] text-muted-foreground tabular-nums mt-1">
                          소계 {rowSum.toLocaleString()}원
                        </div>
                      ) : null}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="text-xs text-muted-foreground">
          단가·수량이 모두 0보다 큰 줄만 지출로 잡힙니다. 단가 0은 재고만 증가(단가 갱신 없음)할 때 사용하세요.
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            취소
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            확정 (재고·지출·요청완료)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
