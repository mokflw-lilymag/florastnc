"use client";
import { getMessages } from "@/i18n/getMessages";

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
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

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
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);  const materialOptions = useMemo(
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
        toast.error(`${i + 1}${tf.f01249}`);
        return;
      }
      const sim = findBlockingSimilarMaterialNames(
        p.name,
        materials.map((m) => ({ name: m.name })),
        payload.filter((_, j) => j !== i).map((x) => x.name)
      );
      if (sim.length) {
        toast.error(`「${p.name}」 ${tf.f01656}: ${sim.slice(0, 3).join(", ")} — ${tf.f01454}`);
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
        toast.error(typeof j?.error === "string" ? j.error : tf.f01624);
        return;
      }
      toast.success(`${tf.f01281} (${j.lineCount ?? payload.length}${tf.f02124}).`);
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
          title={tf.f01270}
          description={tf.f01854}
          icon={ClipboardList}
        />
        <Card className="mt-6 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base">{tf.f01668}</CardTitle>
            <CardDescription>
              {tf.f02146}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-5xl mx-auto p-4 md:p-6 space-y-8">
      <PageHeader
        title={tf.f01270}
        description={tf.f01745}
        icon={ClipboardList}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tf.f01376}</CardTitle>
          <CardDescription>
            {tf.f01076}<strong className="text-foreground">{tf.f01889}</strong>{tf.f01055}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="bm-note">{tf.f01623}</Label>
            <Textarea
              id="bm-note"
              value={branchNote}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setBranchNote(e.target.value)}
              placeholder={tf.f01029}
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
                    <span className="text-xs font-semibold text-muted-foreground">{tf.f02124} {idx + 1}</span>
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
                      <Label className="text-xs">{tf.f01748}</Label>
                      <Select
                        value={line.material_id ?? "__manual__"}
                        onValueChange={(v) => {
                          if (v == null) return;
                          applyMaterial(line.key, v);
                        }}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder={tf.f01958} />
                        </SelectTrigger>
                        <SelectContent className="max-h-[280px]">
                          <SelectItem value="__manual__">{tf.f00789}</SelectItem>
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
                      <Label className="text-xs">{tf.f02133}</Label>
                      <Input
                        value={line.name}
                        onChange={(e) => updateLine(line.key, { name: e.target.value, material_id: null })}
                        placeholder={tf.f01589}
                      />
                      {hint ? (
                        <p className="text-xs text-destructive font-medium">
                          {tf.f01657} {hint}
                        </p>
                      ) : null}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">{tf.f01075}</Label>
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
                          <SelectValue placeholder={tf.f01403} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__" disabled>
                            {tf.f01403}
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
                      <Label className="text-xs">{tf.f01888}</Label>
                      <Input
                        className="h-9"
                        list={`mid-dl-${line.key}`}
                        disabled={!line.main_category}
                        placeholder={line.main_category ? tf.f01724 : tf.f01183}
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
                      <Label className="text-xs">{tf.f00377}</Label>
                      <Input
                        type="number"
                        min={0.01}
                        step={0.01}
                        value={line.quantity}
                        onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">{tf.f01066}</Label>
                      <Input
                        value={line.unit}
                        onChange={(e) => updateLine(line.key, { unit: e.target.value })}
                        placeholder={tf.f02259}
                      />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">{tf.f00993}</Label>
                      <Input
                        value={line.spec}
                        onChange={(e) => updateLine(line.key, { spec: e.target.value })}
                        placeholder={tf.f01389}
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
              {tf.f02129}
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1"
              disabled={submitting || lines.some((L) => similarityHint(L))}
              onClick={() => void submit()}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {tf.f01280}
            </Button>
          </div>
          {lines.some((L) => similarityHint(L)) ? (
            <p className="text-xs text-destructive">{tf.f01655}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{tf.f01667}</CardTitle>
          <CardDescription>{tf.f02007}</CardDescription>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
            </div>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">{tf.f01521}</p>
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
                        <TableHead>{tf.f02124}</TableHead>
                        <TableHead>{tf.f01074}</TableHead>
                        <TableHead>{tf.f01887}</TableHead>
                        <TableHead className="text-right">{tf.f00377}</TableHead>
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
