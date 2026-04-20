"use client";

import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { Loader2, Plus, Send, Trash2, ClipboardList } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useMaterials } from "@/hooks/use-materials";
import { useSettings, DEFAULT_MATERIAL_CATEGORIES } from "@/hooks/use-settings";
import { findBlockingSimilarMaterialNames } from "@/lib/material-request-name-similarity";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

type DraftLine = {
  key: string;
  material_id: string | null;
  name: string;
  main_category: string;
  mid_category: string;
  quantity: string;
  unit: string;
  spec: string;
};

function newLine(): DraftLine {
  return {
    key: crypto.randomUUID(),
    material_id: null,
    name: "",
    main_category: "",
    mid_category: "",
    quantity: "1",
    unit: "ea",
    spec: "",
  };
}

export default function BranchMaterialRequestsPage() {
  const { tenantId, isLoading: authLoading } = useAuth();
  const { materials, loading: matLoading } = useMaterials();
  const { materialCategories, loading: settingsLoading } = useSettings();
  const CATEGORIES = materialCategories || DEFAULT_MATERIAL_CATEGORIES;

  const [linkedOrg, setLinkedOrg] = useState<boolean | null>(null);
  const [branchNote, setBranchNote] = useState("");
  const [lines, setLines] = useState<DraftLine[]>(() => [newLine()]);
  const [submitting, setSubmitting] = useState(false);
  const [history, setHistory] = useState<
    Array<{
      id: string;
      status: string;
      created_at: string;
      branch_note: string | null;
      lines: unknown[];
    }>
  >([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const materialOptions = useMemo(
    () => [...materials].sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [materials]
  );

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch("/api/branch/material-requests", { credentials: "include" });
      const j = await res.json().catch(() => ({}));
      if (typeof j.organizationLinked === "boolean") {
        setLinkedOrg(j.organizationLinked);
      } else if (!res.ok) {
        setLinkedOrg(false);
      }
      if (!res.ok) return;
      const list = (j.requests ?? []) as typeof history;
      setHistory(
        list.filter((r) => (r as { tenant_id?: string }).tenant_id === tenantId).slice(0, 30)
      );
    } finally {
      setHistoryLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setLinkedOrg(false);
      return;
    }
    setLinkedOrg(null);
  }, [tenantId]);

  useEffect(() => {
    if (authLoading || !tenantId) return;
    void loadHistory();
  }, [authLoading, tenantId, loadHistory]);

  const midForMain = useCallback(
    (main: string) => {
      const mids = CATEGORIES.mid[main] ?? [];
      const used = new Set(
        materials.filter((m) => m.main_category === main).map((m) => m.mid_category).filter(Boolean)
      );
      return [...new Set([...mids, ...Array.from(used)])].sort((a, b) =>
        String(a).localeCompare(String(b), "ko")
      ) as string[];
    },
    [CATEGORIES.mid, materials]
  );

  const applyMaterial = (key: string, materialId: string) => {
    if (!materialId || materialId === "__manual__") {
      setLines((prev) =>
        prev.map((L) =>
          L.key === key ? { ...L, material_id: null } : L
        )
      );
      return;
    }
    const m = materials.find((x) => x.id === materialId);
    if (!m) return;
    setLines((prev) =>
      prev.map((L) =>
        L.key === key
          ? {
              ...L,
              material_id: m.id,
              name: m.name,
              main_category: m.main_category || CATEGORIES.main[0] || "",
              mid_category: m.mid_category || "",
              unit: m.unit || "ea",
            }
          : L
      )
    );
  };

  const updateLine = (key: string, patch: Partial<DraftLine>) => {
    setLines((prev) => prev.map((L) => (L.key === key ? { ...L, ...patch } : L)));
  };

  const siblingNames = (excludeKey: string) =>
    lines.filter((L) => L.key !== excludeKey && L.name.trim()).map((L) => L.name.trim());

  const similarityHint = (line: DraftLine): string | null => {
    const n = line.name.trim();
    if (n.length < 2) return null;
    const hits = findBlockingSimilarMaterialNames(
      n,
      materials.map((m) => ({ name: m.name })),
      siblingNames(line.key)
    );
    return hits.length ? hits.slice(0, 4).join(", ") : null;
  };

  const submit = async () => {
    if (!tenantId || linkedOrg !== true) return;
    const payload = lines.map((L) => ({
      material_id: L.material_id,
      name: L.name.trim(),
      main_category: L.main_category.trim(),
      mid_category: L.mid_category.trim(),
      quantity: Number(L.quantity) || 1,
      unit: L.unit.trim() || "ea",
      spec: L.spec.trim() || null,
    }));

    for (let i = 0; i < payload.length; i++) {
      const p = payload[i]!;
      if (!p.name || !p.main_category || !p.mid_category) {
        toast.error(`${i + 1}번째 줄: 품목명·대분류·중분류(2차)를 입력하세요.`);
        return;
      }
      const sim = findBlockingSimilarMaterialNames(
        p.name,
        materials.map((m) => ({ name: m.name })),
        payload.filter((_, j) => j !== i).map((x) => x.name)
      );
      if (sim.length) {
        toast.error(`「${p.name}」유사 품목: ${sim.slice(0, 3).join(", ")} — 수정 후 다시 시도하세요.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/branch/material-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ lines: payload, branch_note: branchNote }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof j?.error === "string" ? j.error : "요청 전송에 실패했습니다.");
        return;
      }
      toast.success(`본사로 자재 요청을 보냈습니다 (${j.lineCount ?? payload.length}품목).`);
      setBranchNote("");
      setLines([newLine()]);
      await loadHistory();
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || matLoading || settingsLoading || linkedOrg === null) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!tenantId) {
    return null;
  }

  if (!linkedOrg) {
    return (
      <div className="container max-w-2xl mx-auto p-6">
        <PageHeader
          title="본사 자재 요청"
          description="조직에 연결된 매장에서만 본사로 자재 발주를 요청할 수 있습니다."
          icon={ClipboardList}
        />
        <Card className="mt-6 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base">이 매장은 본사 조직과 연결되어 있지 않습니다</CardTitle>
            <CardDescription>
              플랫폼 관리자에게 매장의 조직(본사) 연결을 요청한 뒤 다시 이용해 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 space-y-8">
      <PageHeader
        title="본사 자재 요청"
        description="자재관리에 등록된 품목을 고르거나, 없으면 품목명·분류를 직접 입력해 본사로 요청합니다. 유사한 품명은 중복으로 막습니다."
        icon={ClipboardList}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">새 요청 작성</CardTitle>
          <CardDescription>
            대분류·<strong className="text-foreground">중분류(2차)</strong>는 필수입니다. 자재에서 선택하면 분류가 채워집니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bm-note">요청 메모 (선택)</Label>
            <Textarea
              id="bm-note"
              value={branchNote}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBranchNote(e.target.value)}
              placeholder="납기·수량 관련 특이사항 등"
              rows={2}
              className="resize-none"
            />
          </div>

          <div className="space-y-4">
            {lines.map((line, idx) => {
              const hint = similarityHint(line);
              const mids = midForMain(line.main_category);
              return (
                <div
                  key={line.key}
                  className="rounded-xl border border-slate-200/80 bg-slate-50/40 dark:bg-slate-900/20 dark:border-slate-800 p-4 space-y-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">품목 {idx + 1}</span>
                    {lines.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-8"
                        onClick={() => setLines((prev) => prev.filter((L) => L.key !== line.key))}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    ) : null}
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">자재에서 선택 (선택)</Label>
                      <Select
                        value={line.material_id ?? "__manual__"}
                        onValueChange={(v) => {
                          if (v == null) return;
                          applyMaterial(line.key, v);
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="직접 입력만 할 경우 여기는 비워 두세요" />
                        </SelectTrigger>
                        <SelectContent className="max-h-[280px]">
                          <SelectItem value="__manual__">— 직접 입력 —</SelectItem>
                          {materialOptions.map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              {m.name}
                              {m.main_category ? ` · ${m.main_category}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">품목명 · 필수</Label>
                      <Input
                        value={line.name}
                        onChange={(e) => updateLine(line.key, { name: e.target.value, material_id: null })}
                        placeholder="예: 장미 50cm (한 단)"
                      />
                      {hint ? (
                        <p className="text-xs text-destructive font-medium">
                          유사 품목이 있습니다. 중복을 피해 이름을 구체적으로 바꿔 주세요: {hint}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">대분류 (1차) · 필수</Label>
                      <Select
                        value={line.main_category || "__none__"}
                        onValueChange={(v) => {
                          if (v === "__none__") return;
                          updateLine(line.key, {
                            main_category: v,
                            mid_category: "",
                            material_id: null,
                          } as Partial<DraftLine>);
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" disabled>
                            선택
                          </SelectItem>
                          {CATEGORIES.main.map((m) => (
                            <SelectItem key={m} value={m}>
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">중분류 (2차) · 필수</Label>
                      <Input
                        className="h-9"
                        list={`mid-dl-${line.key}`}
                        disabled={!line.main_category}
                        placeholder={line.main_category ? "입력 또는 아래 제안 선택" : "먼저 대분류 선택"}
                        value={line.mid_category}
                        onChange={(e) =>
                          updateLine(line.key, { mid_category: e.target.value, material_id: null })
                        }
                      />
                      <datalist id={`mid-dl-${line.key}`}>
                        {mids.map((m) => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">수량</Label>
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">단위</Label>
                      <Input
                        value={line.unit}
                        onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                        placeholder="ea, 단, 박스"
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">규격·비고 (선택)</Label>
                      <Input
                        value={line.spec}
                        onChange={(e) => updateLine(line.key, { spec: e.target.value })}
                        placeholder="색상·길이 등"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}>
              <Plus className="h-4 w-4 mr-1" />
              품목 추가
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1"
              disabled={submitting || lines.some((L) => similarityHint(L))}
              onClick={() => void submit()}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              본사로 요청 보내기
            </Button>
          </div>
          {lines.some((L) => similarityHint(L)) ? (
            <p className="text-xs text-destructive">유사 품명이 있는 줄을 수정한 뒤 전송할 수 있습니다.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">이 매장 요청 내역</CardTitle>
          <CardDescription>최근 30건까지 표시합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">아직 요청이 없습니다.</p>
          ) : (
            <div className="space-y-6">
              {history.map((h) => (
                <div key={h.id} className="rounded-lg border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="flex flex-wrap items-center gap-2 px-3 py-2 bg-slate-50/80 dark:bg-slate-900/50 text-sm">
                    <Badge variant="secondary">{h.status}</Badge>
                    <span className="text-muted-foreground tabular-nums">
                      {format(new Date(h.created_at), "yyyy.M.d HH:mm", { locale: ko })}
                    </span>
                    {h.branch_note ? (
                      <span className="text-xs text-muted-foreground truncate max-w-[240px]">{h.branch_note}</span>
                    ) : null}
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>품목</TableHead>
                        <TableHead>대분류</TableHead>
                        <TableHead>중분류</TableHead>
                        <TableHead className="text-right">수량</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(h.lines as Array<Record<string, unknown>>).map((ln) => (
                        <TableRow key={String(ln.id)}>
                          <TableCell className="font-medium">{String(ln.name)}</TableCell>
                          <TableCell className="text-sm">{String(ln.main_category ?? "—")}</TableCell>
                          <TableCell className="text-sm">{String(ln.mid_category ?? "—")}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {String(ln.quantity)} {String(ln.unit ?? "")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
