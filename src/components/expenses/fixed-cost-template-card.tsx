"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { ko } from "date-fns/locale";
import { Calendar, ChevronDown, ChevronUp, Lock, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/use-auth";
import { useSimpleExpenses } from "@/hooks/use-simple-expenses";
import { useFixedCostLock } from "@/hooks/use-fixed-cost-lock";
import { FixedCostPinDialog } from "@/components/expenses/fixed-cost-pin-dialog";
import { formatMonthlyDueDay } from "@/lib/fixed-cost-lock";
import {
  DEFAULT_FIXED_COST_ITEMS,
  formatCurrency,
  type FixedCostItem,
  SimpleExpenseCategory,
} from "@/types/simple-expense";
import { cn } from "@/lib/utils";

type PinMode = "unlock" | "set" | "change" | "remove";

export function FixedCostTemplateCard() {
  const { tenantId, profile } = useAuth();
  const { fetchFixedCostTemplate, saveFixedCostTemplate, addFixedCosts } = useSimpleExpenses();
  const {
    lockEnabled,
    unlocked,
    loading: lockLoading,
    verifyPin,
    setPin,
    changePin,
    removePin,
    lockAgain,
  } = useFixedCostLock();

  const [items, setItems] = useState<FixedCostItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [expenseRecordDate, setExpenseRecordDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [pinOpen, setPinOpen] = useState(false);
  const [pinMode, setPinMode] = useState<PinMode>("unlock");

  const tenantName = profile?.store_name || profile?.full_name || "매장";

  const activeItems = useMemo(() => items.filter((item) => item.isActive !== false && item.amount > 0), [items]);
  const activeTotal = useMemo(
    () => activeItems.reduce((sum, item) => sum + item.amount, 0),
    [activeItems],
  );

  const collapsedSummary = useMemo(() => {
    const active = items.filter((i) => i.isActive !== false);
    if (active.length === 0) return "항목 없음";
    return active
      .slice(0, 4)
      .map((i) => {
        const due = formatMonthlyDueDay(i.dueDay);
        return due ? `${i.name} (${due})` : i.name;
      })
      .join(" · ");
  }, [items]);

  const expenseDateLabel = useMemo(() => {
    try {
      return format(parseISO(expenseRecordDate), "M월 d일 (EEE)", { locale: ko });
    } catch {
      return expenseRecordDate;
    }
  }, [expenseRecordDate]);

  const loadTemplate = useCallback(async () => {
    if (!tenantId) return;
    if (lockEnabled && !unlocked) return;
    setLoading(true);
    try {
      const template = await fetchFixedCostTemplate(tenantId);
      if (template?.items?.length) {
        setItems(template.items);
      } else {
        setItems(
          DEFAULT_FIXED_COST_ITEMS.map((item, index) => ({
            ...item,
            id: `default-${index}`,
          })),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [tenantId, lockEnabled, unlocked, fetchFixedCostTemplate]);

  useEffect(() => {
    if (!tenantId) return;
    if (lockEnabled && !unlocked) return;
    void loadTemplate();
  }, [tenantId, lockEnabled, unlocked, loadTemplate]);

  useEffect(() => {
    if (!unlocked && expanded) setExpanded(false);
  }, [unlocked, expanded]);

  const updateItem = (id: string, field: keyof FixedCostItem, value: unknown) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "새 고정비",
        category: SimpleExpenseCategory.FIXED_COST,
        subCategory: "기타",
        amount: 0,
        supplier: "",
        isActive: true,
      },
    ]);
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSaveTemplate = async () => {
    if (!tenantId) return;
    const ok = await saveFixedCostTemplate(tenantId, tenantName, items);
    if (ok) toast.success("고정비 템플릿이 저장되었습니다.");
  };

  const handleApply = async () => {
    if (!tenantId) return;
    if (activeItems.length === 0) {
      toast.error("등록할 활성 항목이 없습니다. '사용'과 금액을 확인해 주세요.");
      return;
    }
    const ok = await addFixedCosts(tenantId, tenantName, items, new Date(expenseRecordDate));
    if (ok) {
      toast.success(`${expenseDateLabel} 지출 ${activeItems.length}건이 등록되었습니다.`);
    }
  };

  const requestExpand = () => {
    if (lockEnabled && !unlocked) {
      setPinMode("unlock");
      setPinOpen(true);
      return;
    }
    setExpanded(true);
  };

  const openPinSettings = (mode: PinMode) => {
    setPinMode(mode);
    setPinOpen(true);
  };

  if (!tenantId) return null;

  return (
    <>
      <Card className="border-0 shadow-sm ring-1 ring-slate-200">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-base flex items-center gap-2">
                고정비 템플릿
                {lockEnabled ? (
                  <Badge variant="outline" className="text-[10px] font-normal gap-1">
                    <Lock className="h-3 w-3" />
                    암호 사용 중
                  </Badge>
                ) : null}
              </CardTitle>
              <CardDescription>
                매월 반복 지출을 미리 적어 두었다가 필요할 때 지출 목록에 넣습니다. 기본 접힘 ·
                암호를 설정하면 펼칠 때만 입력하면 됩니다.
              </CardDescription>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={lockLoading}
                onClick={() => (expanded ? setExpanded(false) : requestExpand())}
              >
                {expanded ? (
                  <>
                    <ChevronUp className="h-3.5 w-3.5 mr-1" />
                    접기
                  </>
                ) : (
                  <>
                    <ChevronDown className="h-3.5 w-3.5 mr-1" />
                    펼치기
                  </>
                )}
              </Button>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-[11px]"
                  onClick={() => openPinSettings(lockEnabled ? "change" : "set")}
                >
                  {lockEnabled ? "암호 변경" : "암호 설정"}
                </Button>
                {lockEnabled ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-[11px]"
                    onClick={() => openPinSettings("remove")}
                  >
                    암호 해제
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          {!expanded ? (
            <div className="pt-1 space-y-1">
              {lockEnabled && !unlocked ? (
                <p className="text-xs text-muted-foreground">🔒 암호가 설정되어 있습니다. 펼치기 후 입력하세요.</p>
              ) : (
                <p className="text-xs text-muted-foreground truncate" title={collapsedSummary}>
                  {collapsedSummary}
                </p>
              )}
            </div>
          ) : null}
        </CardHeader>

        {expanded && unlocked ? (
          <CardContent className="space-y-5 pt-0">
            <div className="rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600 leading-relaxed space-y-1">
              <p>
                <strong className="text-slate-800">매월 결제일</strong> — 리스트·캘린더에 “매달
                N일”로 표시됩니다.
              </p>
              <p>
                <strong className="text-slate-800">지출 기록일</strong> — 아래에서 고른 날짜로
                지출 목록에 실제로 들어갑니다.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button type="button" variant="outline" size="sm" disabled={loading} onClick={() => void loadTemplate()}>
                <RotateCcw className="h-3.5 w-3.5 mr-1" />
                새로고침
              </Button>
              <Button type="button" variant="secondary" size="sm" onClick={() => void handleSaveTemplate()}>
                <Save className="h-3.5 w-3.5 mr-1" />
                템플릿만 저장
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={addItem}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                항목 추가
              </Button>
              {lockEnabled ? (
                <Button type="button" variant="ghost" size="sm" onClick={lockAgain}>
                  <Lock className="h-3.5 w-3.5 mr-1" />
                  다시 잠금
                </Button>
              ) : null}
            </div>

            <div className="overflow-x-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">사용</TableHead>
                    <TableHead>항목</TableHead>
                    <TableHead>분류</TableHead>
                    <TableHead>거래처</TableHead>
                    <TableHead className="text-center w-28">매월 결제일</TableHead>
                    <TableHead className="text-right w-28">금액</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => {
                    const dueLabel = formatMonthlyDueDay(item.dueDay);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <Switch
                            checked={item.isActive !== false}
                            onCheckedChange={(v) => updateItem(item.id, "isActive", v)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.name}
                            onChange={(e) => updateItem(item.id, "name", e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.subCategory || ""}
                            onChange={(e) => updateItem(item.id, "subCategory", e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={item.supplier || ""}
                            onChange={(e) => updateItem(item.id, "supplier", e.target.value)}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col items-center gap-1">
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              placeholder="일"
                              value={item.dueDay ?? ""}
                              onChange={(e) =>
                                updateItem(item.id, "dueDay", e.target.value ? Number(e.target.value) : undefined)
                              }
                              className="h-8 w-16 text-center"
                            />
                            {dueLabel ? (
                              <Badge variant="secondary" className="text-[10px] font-medium whitespace-nowrap">
                                {dueLabel}
                              </Badge>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">미설정</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) => updateItem(item.id, "amount", Number(e.target.value) || 0)}
                            className="h-8 text-right"
                          />
                        </TableCell>
                        <TableCell>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(item.id)}>
                            <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            <div className="rounded-xl border-2 border-violet-100 bg-violet-50/40 p-4 space-y-3">
              <div>
                <p className="text-sm font-semibold text-violet-950">지출 목록에 일괄 반영</p>
                <p className="text-xs text-violet-800/80 mt-1">
                  사용 켜진 항목 {activeItems.length}건(합계 {formatCurrency(activeTotal)}).
                  {activeItems.some((i) => i.dueDay)
                    ? ` 결제일: ${activeItems
                        .filter((i) => i.dueDay)
                        .map((i) => `${i.name} ${formatMonthlyDueDay(i.dueDay)}`)
                        .join(", ")}`
                    : null}
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <Label htmlFor="fixed-cost-expense-date" className="text-xs font-medium text-violet-900">
                    지출 기록일
                  </Label>
                  <Input
                    id="fixed-cost-expense-date"
                    type="date"
                    value={expenseRecordDate}
                    onChange={(e) => setExpenseRecordDate(e.target.value)}
                    className="mt-1 h-10 w-[180px] bg-white"
                  />
                  <p className="text-[11px] text-violet-700/70 mt-1">→ 지출 목록에 {expenseDateLabel}로 들어갑니다</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  className={cn("sm:min-w-[220px]", activeItems.length === 0 && "opacity-60")}
                  disabled={loading || activeItems.length === 0}
                  onClick={() => void handleApply()}
                >
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  {expenseDateLabel} 지출 {activeItems.length}건 등록
                </Button>
              </div>
            </div>
          </CardContent>
        ) : null}
      </Card>

      <FixedCostPinDialog
        open={pinOpen}
        onOpenChange={setPinOpen}
        mode={pinMode}
        lockEnabled={lockEnabled}
        onUnlock={async (pin) => {
          const ok = await verifyPin(pin);
          if (ok) {
            setExpanded(true);
            toast.success("잠금이 해제되었습니다.");
          }
          return ok;
        }}
        onSetPin={setPin}
        onChangePin={changePin}
        onRemovePin={removePin}
      />
    </>
  );
}
