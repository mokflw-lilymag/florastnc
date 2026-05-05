"use client";
import { getMessages } from "@/i18n/getMessages";

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
import { pickUiText } from "@/i18n/pick-ui-text";

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
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const phUnitPrice = pickUiText(baseLocale, "0", "0", "0", "0", "0", "0", "0", "0", "0", "0");
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
        `/api/hq/branch-suppliers?tenantId=${encodeURIComponent(branchTenantId)}&uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" }
      );
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : tf.f00876);
        setSuppliers([]);
        return;
      }
      setSuppliers((j.suppliers ?? []) as SupplierOpt[]);
    } finally {
      setLoadingSuppliers(false);
    }
  }, [branchTenantId, locale]);

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
        toast.error(tf.f01827);
        return;
      }
      if (!Number.isFinite(it.unitPrice) || it.unitPrice < 0) {
        toast.error(tf.f01065);
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
          uiLocale: locale,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j.error === "string" ? j.error : tf.f01978);
        return;
      }
      toast.success(
        `${tf.f00675} — ${tf.f00538} ${j.stockLineCount ?? 0}${tf.f00033}, ${tf.f01929} ${j.expenseCount ?? 0}${tf.f00033} ${tf.f01226}.`
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
            {tf.f01722}
          </DialogTitle>
          <DialogDescription>
            {tf.f01515} <strong className="text-foreground">{tf.f02179}</strong>{tf.f00847}{" "}
            <strong className="text-foreground">{tf.f00860}</strong>{tf.f01546}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 px-3 py-2 text-sm space-y-1">
          <div>
            <span className="text-muted-foreground">{tf.f00663}</span>{" "}
            <span className="font-medium">{request.tenant_name ?? request.tenant_id.slice(0, 8)}</span>
          </div>
          {request.branch_note ? (
            <div>
              <span className="text-muted-foreground">{tf.f01908}</span> {request.branch_note}
            </div>
          ) : null}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="fulfill-date">{tf.f01946}</Label>
            <Input
              id="fulfill-date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>{tf.f00049}</Label>
            <Select
              value={paymentMethod}
              onValueChange={(v) => setPaymentMethod(v ?? "card")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="card">{tf.f00704}</SelectItem>
                <SelectItem value="cash">{tf.f00769}</SelectItem>
                <SelectItem value="bank_transfer">{tf.f00057}</SelectItem>
                <SelectItem value="other">{tf.f00115}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">{tf.f01826}</TableHead>
                <TableHead>{tf.f02124}</TableHead>
                <TableHead className="w-20 text-right">{tf.f01622}</TableHead>
                <TableHead className="w-24">{tf.f01513}</TableHead>
                <TableHead className="w-28">{tf.f00148}</TableHead>
                <TableHead className="min-w-[140px]">{tf.f00872}</TableHead>
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
                          <span className="ml-1 font-mono">· {tf.f01764}</span>
                        ) : (
                          <span className="ml-1">· {tf.f01445}</span>
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
                        placeholder={phUnitPrice}
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
                          <SelectValue placeholder={loadingSuppliers ? tf.f01292 : tf.f01403} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{tf.f00224}</SelectItem>
                          {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
                              {s.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!r.exclude && rowSum > 0 ? (
                        <div className="text-[11px] text-muted-foreground tabular-nums mt-1">
                          {tf.f01434} {rowSum.toLocaleString()}{tf.f00487}
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
          {tf.f01064}
        </p>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {tf.f00702}
          </Button>
          <Button type="button" onClick={() => void handleSubmit()} disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {tf.f02218}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
