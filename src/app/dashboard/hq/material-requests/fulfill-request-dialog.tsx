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
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

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
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);

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
        toast.error(typeof j.error === "string" ? j.error : tr("거래처 목록을 불러오지 못했습니다.", "Failed to load suppliers."));
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
        toast.error(tr("제외하지 않은 줄은 실입고 수량을 1 이상으로 입력하세요.", "For non-excluded rows, actual quantity must be 1 or more."));
        return;
      }
      if (!Number.isFinite(it.unitPrice) || it.unitPrice < 0) {
        toast.error(tr("단가는 0 이상이어야 합니다.", "Unit price must be 0 or more."));
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
        toast.error(typeof j.error === "string" ? j.error : tr("처리에 실패했습니다.", "Processing failed."));
        return;
      }
      toast.success(
        `${tr("처리 완료", "Completed")} — ${tr("재고", "stock")} ${j.stockLineCount ?? 0}${tr("건", "")}, ${tr("지출", "expense")} ${j.expenseCount ?? 0}${tr("건", "")} ${tr("반영됨", "applied")}.`
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
            {tr("입고·지출 확정", "Confirm Stock & Expense")}
          </DialogTitle>
          <DialogDescription>
            {tr("실제 입고 수량·단가를 입력하면", "Entering actual quantity and unit price will increase")} <strong className="text-foreground">{tr("해당 지점 자재 재고", "branch material stock")}</strong>{tr("가 증가하고,", " and create rows in")}{" "}
            <strong className="text-foreground">{tr("같은 지점 지출", "branch expense")}</strong>{tr("에 자동 등록됩니다. 자재 연결 줄만 재고 반영됩니다(수기 품목은 지출만).", ". Only material-linked lines affect stock (manual items affect expense only).")}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">{tr("지점", "Branch")}</span>{" "}
            <span className="font-medium">{request.tenant_name ?? request.tenant_id.slice(0, 8)}</span>
          </div>
          {request.branch_note ? (
            <div>
              <span className="text-muted-foreground">{tr("지점 메모", "Branch Note")}</span> {request.branch_note}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fulfill-date">{tr("지출 일자", "Expense Date")}</Label>
            <Input
              id="fulfill-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{tr("결제 수단", "Payment Method")}</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v ?? "card")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">{tr("카드", "Card")}</SelectItem>
                <SelectItem value="cash">{tr("현금", "Cash")}</SelectItem>
                <SelectItem value="bank_transfer">{tr("계좌이체", "Bank Transfer")}</SelectItem>
                <SelectItem value="other">{tr("기타", "Other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{tr("제외", "Exclude")}</TableHead>
                <TableHead>{tr("품목", "Item")}</TableHead>
                <TableHead className="w-20 text-right">{tr("요청", "Requested")}</TableHead>
                <TableHead className="w-24">{tr("실입고", "Actual")}</TableHead>
                <TableHead className="w-28">{tr("단가", "Unit Price")}</TableHead>
                <TableHead className="min-w-[140px]">{tr("거래처", "Supplier")}</TableHead>
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
                          <span className="ml-1 font-mono">· {tr("재고연동", "Stock-linked")}</span>
                        ) : (
                          <span className="ml-1">· {tr("수기(지출만)", "Manual (expense only)")}</span>
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
                          <SelectValue placeholder={loadingSuppliers ? tr("불러오는 중…", "Loading...") : tr("선택", "Select")} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{tr("미지정", "Unassigned")}</SelectItem>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!r.exclude && rowSum > 0 ? (
                        <div className="text-[11px] text-muted-foreground tabular-nums mt-1">
                          {tr("소계", "Subtotal")} {rowSum.toLocaleString()}{tr("원", "")}
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
          {tr("단가·수량이 모두 0보다 큰 줄만 지출로 잡힙니다. 단가 0은 재고만 증가(단가 갱신 없음)할 때 사용하세요.", "Only rows with both unit price and quantity greater than 0 are recorded as expense. Use 0 price for stock-only increase.")}
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tr("취소", "Cancel")}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {tr("확정 (재고·지출·요청완료)", "Confirm (stock/expense/request complete)")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
