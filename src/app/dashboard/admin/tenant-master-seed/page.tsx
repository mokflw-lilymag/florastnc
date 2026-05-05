"use client";
import { getMessages } from "@/i18n/getMessages";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Database, Loader2, Eye, Play, RotateCcw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { TenantMasterSeedBulkResult, TenantMasterSeedResult } from "@/lib/tenant-master-seed/types";
import { TENANT_MASTER_SEED_BULK_MAX } from "@/lib/tenant-master-seed/run-seed";
import { resolvedMaterialSeedMemo, resolvedProductCode } from "@/lib/tenant-master-seed/seed-db-shape";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

/** Base UI Select may treat value="" as uncontrolled, so empty uses sentinel only */
const SELECT_TENANT_EMPTY = "__fs_seed_tenant_empty__";
const SELECT_VERSION_EMPTY = "__fs_seed_version_empty__";
const SELECT_ORG_EMPTY = "__fs_seed_org_empty__";

type SeedDetailResponse = {
  version: string;
  label: string;
  notes: string[];
  counts: Record<string, number>;
  suppliers: { name: string; memo?: string; supplier_type?: string }[];
  products: {
    name: string;
    main_category: string;
    mid_category?: string;
    code?: string;
    price?: number;
  }[];
  materials: { name: string; main_category: string; mid_category?: string; unit: string }[];
  productCategories: { main: string[]; mid: Record<string, string[]> };
  materialCategories: { main: string[]; mid: Record<string, string[]> };
  expenseCategories: { main: string[]; mid: Record<string, string[]> };
};

interface TenantRow {
  id: string;
  name: string;
}

interface OrganizationRow {
  id: string;
  name: string;
  tenantCount: number;
}

function formatTenantDisplayName(
  raw: unknown,
  id: string,
  tf: ReturnType<typeof getMessages>["tenantFlows"]
) {
  const s = raw != null ? String(raw).trim() : "";
  if (s) return s;
  return tf.f02468.replace("{id}", id.slice(0, 8));
}

function isAbortError(e: unknown) {
  return e instanceof DOMException && e.name === "AbortError";
}

function seedRowTotal(row: { toInsert: number; toSkip: number }) {
  return row.toInsert + row.toSkip;
}

function SeedPreviewBreakdown({
  title,
  row,
  tf,
}: {
  title: string;
  row: { toInsert: number; toSkip: number };
  tf: ReturnType<typeof getMessages>["tenantFlows"];
}) {
  const total = seedRowTotal(row);
  const ins = row.toInsert;
  const sk = row.toSkip;
  const insPct = total > 0 ? Math.round((ins / total) * 100) : 0;
  const skPct = total > 0 ? Math.round((sk / total) * 100) : 0;
  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium text-slate-800">{title}</span>
        <span className="text-xs text-slate-600 tabular-nums text-right">
          {tf.f02434} <strong>{total}</strong>
          {tf.f02435}{" "}
          <strong className="text-emerald-700">{ins}</strong>
          {total > 0 ? ` (${insPct}%)` : ""} · {tf.f02436} <strong className="text-slate-500">{sk}</strong>
          {total > 0 ? ` (${skPct}%)` : ""}
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
        {total === 0 ? (
          <div className="h-full w-full bg-slate-100" title={tf.f02437} />
        ) : (
          <>
            <div
              className="h-full bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${insPct}%` }}
              title={`${tf.f02438} ${ins}${tf.f02439} (${insPct}%)`}
            />
            <div
              className="h-full bg-slate-400/70 transition-[width] duration-300"
              style={{ width: `${skPct}%` }}
              title={`${tf.f02440} ${sk}${tf.f02439} (${skPct}%)`}
            />
          </>
        )}
      </div>
    </div>
  );
}

function SeedApplyPreviewPanel({ preview }: { preview: TenantMasterSeedResult }) {
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-sky-200 bg-sky-50/40 pl-3 py-2 rounded-r-md">
        <strong className="text-slate-800">{tf.f02441}</strong> {tf.f02442}{" "}
        <strong className="text-slate-900">{tf.f02443}</strong>
        {tf.f02444}{" "}
        {tf.f02445}{" "}
        <code className="text-[10px]">dryRun</code>
        {tf.f02446}{" "}
        <strong className="text-emerald-800">{tf.f02447}</strong> {tf.f02448}{" "}
        <strong className="text-slate-700">{tf.f02449}</strong>
        {tf.f02450}
      </p>
      <p className="text-[11px] text-slate-600 leading-snug rounded-md bg-slate-100/80 px-3 py-2 border border-slate-200/60">
        {tf.f02451}{" "}
        <strong className="text-slate-800">{tf.f02452}</strong>{" "}
        {tf.f02453}{" "}
        <strong className="text-slate-800">{tf.f02454}</strong>.
      </p>
      <p className="text-[11px] font-medium text-slate-700">{tf.f02455}</p>
      <SeedPreviewBreakdown title={tf.f00872} row={preview.suppliers} tf={tf} />
      <SeedPreviewBreakdown title={tf.f01350} row={preview.products} tf={tf} />
      <SeedPreviewBreakdown title={tf.f01731} row={preview.materials} tf={tf} />
      {(preview.delivery.regionsToUpsert > 0 || preview.delivery.willMergeGeneralDeliveryFields) && (
        <div className="rounded-lg border border-sky-200/80 bg-sky-50/50 px-3 py-2 text-xs text-sky-950/90 leading-snug">
          <strong className="text-slate-900">{tf.f02456}</strong> — {tf.f02457}{" "}
          <strong className="tabular-nums">{preview.delivery.regionsToUpsert}</strong> {tf.f02458}{" "}
          <code className="text-[10px]">delivery_fees_by_region</code>
          {tf.f02459}{" "}
          <strong>
            {preview.delivery.willMergeGeneralDeliveryFields ? tf.f02460 : tf.f02461}
          </strong>
          {preview.delivery.regionsToUpsert === 0 && preview.delivery.willMergeGeneralDeliveryFields ? tf.f02462 : ""}
          .
        </div>
      )}
      <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs text-amber-950/90 leading-snug">
        <strong>{tf.f02063}</strong>
        {tf.f02463} {tf.f02464}{" "}
        <code className="text-[10px]">system_settings</code> {tf.f02465}{" "}
        <strong>{tf.f02466}</strong> {tf.f02467}
      </div>
    </div>
  );
}

function aggregateBulkSeedDeltas(tenants: TenantMasterSeedBulkResult["tenants"]) {
  const acc = {
    suppliers: { toInsert: 0, toSkip: 0 },
    products: { toInsert: 0, toSkip: 0 },
    materials: { toInsert: 0, toSkip: 0 },
  };
  for (const row of tenants) {
    if (!row.ok || !row.result) continue;
    acc.suppliers.toInsert += row.result.suppliers.toInsert;
    acc.suppliers.toSkip += row.result.suppliers.toSkip;
    acc.products.toInsert += row.result.products.toInsert;
    acc.products.toSkip += row.result.products.toSkip;
    acc.materials.toInsert += row.result.materials.toInsert;
    acc.materials.toSkip += row.result.materials.toSkip;
  }
  return acc;
}

export default function TenantMasterSeedPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [versions, setVersions] = useState<{ id: string; label: string }[]>([]);
  const [tenantId, setTenantId] = useState<string>("");
  const [versionId, setVersionId] = useState<string>("");
  const [confirm, setConfirm] = useState(false);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [preview, setPreview] = useState<TenantMasterSeedResult | null>(null);
  const [seedDetail, setSeedDetail] = useState<SeedDetailResponse | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [applyTab, setApplyTab] = useState<"single" | "tenants" | "organization">("single");
  const [bulkSelectedTenantIds, setBulkSelectedTenantIds] = useState<string[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationRow[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [bulkPreview, setBulkPreview] = useState<TenantMasterSeedBulkResult | null>(null);
  const [bulkPreviewing, setBulkPreviewing] = useState(false);
  const [bulkApplying, setBulkApplying] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const seedAbortRef = useRef<AbortController | null>(null);
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const armSeedAbort = useCallback(() => {
    seedAbortRef.current?.abort();
    const ac = new AbortController();
    seedAbortRef.current = ac;
    return ac;
  }, []);

  const cancelSeedRequest = useCallback(() => {
    seedAbortRef.current?.abort();
    seedAbortRef.current = null;
    setPreviewing(false);
    setApplying(false);
    setBulkPreviewing(false);
    setBulkApplying(false);
    toast.message(tf.f01628);
  }, []);

  const resetSeedWizard = useCallback(() => {
    seedAbortRef.current?.abort();
    seedAbortRef.current = null;
    setPreviewing(false);
    setApplying(false);
    setBulkPreviewing(false);
    setBulkApplying(false);
    setPreview(null);
    setBulkPreview(null);
    setConfirm(false);
    setConfirmBulk(false);
    toast.success(tf.f01218);
  }, []);

  const seedBusy = previewing || applying || bulkPreviewing || bulkApplying;

  const loadTenants = useCallback(async () => {
    const messages = getMessages(locale).tenantFlows;
    try {
      setLoadingTenants(true);
      const res = await fetch(`/api/admin/tenants?uiLocale=${encodeURIComponent(locale)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : res.statusText);
      }
      const rows = (json.tenants as { id: string; name?: string | null }[]) ?? [];
      setTenants(
        rows
          .map((t) => ({
            id: t.id,
            name: formatTenantDisplayName(t.name, t.id, messages),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, baseLocale))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("tenant-master-seed loadTenants:", msg, e);
      toast.error(messages.f02078);
    } finally {
      setLoadingTenants(false);
    }
  }, [locale, baseLocale]);

  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/tenant-master-seed/versions?uiLocale=${encodeURIComponent(locale)}`
      );
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setVersions(json.versions ?? []);
      if (json.versions?.[0]?.id) setVersionId((v) => v || json.versions[0].id);
    } catch (e) {
      console.error(e);
      toast.error(tf.f01471);
    }
  }, [locale, tf]);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoadingOrgs(true);
      const res = await fetch(`/api/admin/organizations?uiLocale=${encodeURIComponent(locale)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : res.statusText);
      }
      const rows = (json.organizations as OrganizationRow[]) ?? [];
      setOrganizations(rows.sort((a, b) => a.name.localeCompare(b.name, baseLocale)));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("tenant-master-seed loadOrganizations:", msg, e);
      toast.error(tf.f01836);
    } finally {
      setLoadingOrgs(false);
    }
  }, [baseLocale, locale, tf]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    loadTenants();
    loadVersions();
    loadOrganizations();
  }, [isSuperAdmin, loadTenants, loadVersions, loadOrganizations]);

  useEffect(() => {
    return () => {
      seedAbortRef.current?.abort();
    };
  }, []);

  /** If tenantId not in loaded list, clear selection to avoid raw UUID display */
  useEffect(() => {
    if (loadingTenants || !tenantId || tenants.length === 0) return;
    if (!tenants.some((t) => t.id === tenantId)) {
      setTenantId("");
    }
  }, [tenants, tenantId, loadingTenants]);

  /** Keep stable trigger label because Base UI Select may display raw UUID value */
  const tenantTriggerText = useMemo(() => {
    if (!tenantId) return null;
    if (loadingTenants) return tf.f01292;
    const row = tenants.find((t) => t.id === tenantId);
    if (row) return row.name;
    return `${tf.f01203} (${tenantId.slice(0, 8)}…)`;
  }, [tenantId, tenants, loadingTenants, tf]);

  const versionTriggerText = useMemo(() => {
    if (!versionId) return null;
    const v = versions.find((x) => x.id === versionId);
    if (v) return `${v.id} — ${v.label}`;
    return versionId;
  }, [versionId, versions]);

  const orgTriggerText = useMemo(() => {
    if (!organizationId) return null;
    if (loadingOrgs) return tf.f01292;
    const o = organizations.find((x) => x.id === organizationId);
    if (o) return `${o.name} (${tf.f01164} ${o.tenantCount}${tf.f00945})`;
    return `${tf.f01204} (${organizationId.slice(0, 8)}…)`;
  }, [organizationId, organizations, loadingOrgs, tf]);

  const tenantNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tenants) m.set(t.id, t.name);
    return m;
  }, [tenants]);

  useEffect(() => {
    if (!isSuperAdmin || !versionId) {
      setSeedDetail(null);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoadingDetail(true);
      try {
        const res = await fetch(
          `/api/admin/tenant-master-seed/detail?versionId=${encodeURIComponent(versionId)}&uiLocale=${encodeURIComponent(locale)}`
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (!cancelled) setSeedDetail(null);
          return;
        }
        if (!cancelled) setSeedDetail(json as SeedDetailResponse);
      } catch {
        if (!cancelled) setSeedDetail(null);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSuperAdmin, versionId, locale]);

  const handlePreview = async () => {
    if (!tenantId || !versionId) {
      toast.error(tf.f02080);
      return;
    }
    const ac = armSeedAbort();
    setPreviewing(true);
    setPreview(null);
    try {
      const res = await fetch("/api/admin/tenant-master-seed/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, versionId, uiLocale: locale }),
        signal: ac.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || tf.f01216);
        return;
      }
      setPreview(json as TenantMasterSeedResult);
      toast.success(tf.f01219);
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error(tf.f01217);
    } finally {
      setPreviewing(false);
      if (seedAbortRef.current === ac) seedAbortRef.current = null;
    }
  };

  const handleBulkPreview = async () => {
    if (!versionId) {
      toast.error(tf.f01474);
      return;
    }
    let body: Record<string, unknown>;
    if (applyTab === "tenants") {
      if (bulkSelectedTenantIds.length === 0) {
        toast.error(tf.f01778);
        return;
      }
      if (bulkSelectedTenantIds.length > TENANT_MASTER_SEED_BULK_MAX) {
        toast.error(`${tf.f02163} ${TENANT_MASTER_SEED_BULK_MAX}${tf.f00947}`);
        return;
      }
      body = { versionId, tenantIds: bulkSelectedTenantIds, uiLocale: locale };
    } else {
      if (!organizationId) {
        toast.error(tf.f01847);
        return;
      }
      body = { organizationId, versionId, uiLocale: locale };
    }
    const ac = armSeedAbort();
    setBulkPreviewing(true);
    setBulkPreview(null);
    try {
      const res = await fetch("/api/admin/tenant-master-seed/preview-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || tf.f01705);
        return;
      }
      setBulkPreview(json as TenantMasterSeedBulkResult);
      toast.success(
        applyTab === "tenants"
          ? tf.f01410
          : tf.f01838
      );
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error(tf.f01706);
    } finally {
      setBulkPreviewing(false);
      if (seedAbortRef.current === ac) seedAbortRef.current = null;
    }
  };

  const handleBulkApply = async () => {
    if (!versionId) {
      toast.error(tf.f01474);
      return;
    }
    if (!confirmBulk) {
      toast.error(tf.f01710);
      return;
    }
    let body: Record<string, unknown>;
    if (applyTab === "tenants") {
      if (bulkSelectedTenantIds.length === 0) {
        toast.error(tf.f01778);
        return;
      }
      if (bulkSelectedTenantIds.length > TENANT_MASTER_SEED_BULK_MAX) {
        toast.error(`${tf.f02163} ${TENANT_MASTER_SEED_BULK_MAX}${tf.f00947}`);
        return;
      }
      body = { versionId, tenantIds: bulkSelectedTenantIds, confirm: true, uiLocale: locale };
    } else {
      if (!organizationId) {
        toast.error(tf.f01847);
        return;
      }
      body = { organizationId, versionId, confirm: true, uiLocale: locale };
    }
    const ac = armSeedAbort();
    setBulkApplying(true);
    try {
      const res = await fetch("/api/admin/tenant-master-seed/apply-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || tf.f01709);
        return;
      }
      setBulkPreview(json as TenantMasterSeedBulkResult);
      toast.success(
        `${tf.f01707}: ${tf.f01425} ${(json as TenantMasterSeedBulkResult).okCount}${tf.f00945} / ${tf.f01517} ${(json as TenantMasterSeedBulkResult).failCount}${tf.f00945}`
      );
      setConfirmBulk(false);
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error(tf.f01711);
    } finally {
      setBulkApplying(false);
      if (seedAbortRef.current === ac) seedAbortRef.current = null;
    }
  };

  const handleApply = async () => {
    if (!tenantId || !versionId) {
      toast.error(tf.f02080);
      return;
    }
    if (!confirm) {
      toast.error(tf.f01775);
      return;
    }
    const ac = armSeedAbort();
    setApplying(true);
    try {
      const res = await fetch("/api/admin/tenant-master-seed/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, versionId, confirm: true, uiLocale: locale }),
        signal: ac.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || tf.f01774);
        return;
      }
      setPreview(json as TenantMasterSeedResult);
      toast.success(tf.f01478);
      setConfirm(false);
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error(tf.f01776);
    } finally {
      setApplying(false);
      if (seedAbortRef.current === ac) seedAbortRef.current = null;
    }
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  return (
    <div className="container mx-auto py-8 space-y-8 max-w-4xl">
      <PageHeader
        title={tf.f01985}
        description={tf.f01430}
        icon={Database}
      />

      <Alert>
        <AlertTitle>{tf.f01654}</AlertTitle>
        <AlertDescription>
          {tf.f01514}
        </AlertDescription>
      </Alert>

      <Card className="border-slate-100 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">{tf.f01077}</CardTitle>
          <CardDescription>{tf.f02294}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-2.5 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg h-8"
                disabled={!seedBusy}
                onClick={cancelSeedRequest}
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                {tf.f01626}
              </Button>
              <Button type="button" variant="secondary" size="sm" className="rounded-lg h-8" onClick={resetSeedWizard}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                {tf.f00908}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {tf.f01627}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{tf.f01470}</Label>
            <Select
              value={versionId === "" ? SELECT_VERSION_EMPTY : versionId}
              onValueChange={(v) => setVersionId(v === SELECT_VERSION_EMPTY ? "" : (v ?? ""))}
            >
              <SelectTrigger
                className="rounded-xl w-full min-w-0 max-w-full"
                title={typeof versionTriggerText === "string" ? versionTriggerText : undefined}
              >
                <SelectValue placeholder={tf.f01248}>{versionTriggerText}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_VERSION_EMPTY}>
                  {versions.length === 0 ? tf.f01201 : tf.f01472}
                </SelectItem>
                {versions.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.id} — {v.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Tabs
            value={applyTab}
            onValueChange={(v) => {
              const t =
                v === "organization" ? "organization" : v === "tenants" ? "tenants" : "single";
              setBulkPreview(null);
              setApplyTab(t);
              if (t === "organization" || t === "tenants") setPreview(null);
            }}
            className="w-full"
          >
            <TabsList variant="line" className="w-full max-w-3xl grid grid-cols-3 gap-1">
              <TabsTrigger value="single" className="flex-1 text-xs sm:text-sm">
                {tf.f01067}
              </TabsTrigger>
              <TabsTrigger value="tenants" className="flex-1 text-xs sm:text-sm">
                {tf.f01167}
              </TabsTrigger>
              <TabsTrigger value="organization" className="flex-1 text-xs sm:text-sm">
                {tf.f01843}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label>{tf.f02079}</Label>
                <Select
                  value={tenantId === "" ? SELECT_TENANT_EMPTY : tenantId}
                  onValueChange={(v) => setTenantId(v === SELECT_TENANT_EMPTY ? "" : (v ?? ""))}
                  disabled={loadingTenants}
                >
                  <SelectTrigger
                    className="rounded-xl w-full min-w-0 max-w-full"
                    title={typeof tenantTriggerText === "string" ? tenantTriggerText : undefined}
                  >
                    <SelectValue placeholder={loadingTenants ? tf.f01292 : tf.f01166}>
                      {tenantTriggerText}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_TENANT_EMPTY}>
                      {loadingTenants ? tf.f01292 : tf.f01166}
                    </SelectItem>
                    {tenants.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500"
                  onClick={loadTenants}
                >
                  {tf.f01202}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground leading-snug">
                {tf.f00795} <strong className="text-slate-700">{tf.f01405}</strong>{tf.f01612}{" "}
                <strong>{tf.f01501}</strong>.{" "}
                {tf.f01476}
              </p>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={handlePreview}
                  disabled={previewing || !tenantId || !versionId}
                >
                  {previewing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {tf.f01213}
                </Button>
              </div>

              {preview && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {preview.dryRun ? tf.f01214 : tf.f01773} · {preview.seedVersion}
                  </p>
                  <SeedApplyPreviewPanel preview={preview} />
                  {preview.auditId && (
                    <p className="text-xs font-mono text-slate-500">{tf.f00855}: {preview.auditId}</p>
                  )}
                  <ul className="list-disc pl-5 text-amber-800/90 text-xs space-y-1">
                    {preview.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="confirm-seed"
                  checked={confirm}
                  onCheckedChange={(c) => setConfirm(c === true)}
                />
                <label htmlFor="confirm-seed" className="text-sm text-slate-600 leading-snug cursor-pointer">
                  {tf.f01432}
                </label>
              </div>

              <Button
                type="button"
                className="rounded-xl bg-slate-900 text-white"
                onClick={handleApply}
                disabled={applying || !tenantId || !versionId || !confirm}
              >
                {applying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {tf.f01477}
              </Button>
            </TabsContent>

            <TabsContent value="tenants" className="mt-6 space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="shrink-0">{tf.f01166}</Label>
                  <span className="text-xs text-muted-foreground">
                    {bulkSelectedTenantIds.length}{tf.f00946} {TENANT_MASTER_SEED_BULK_MAX}{tf.f00945}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-lg text-xs"
                    disabled={loadingTenants || tenants.length === 0}
                    onClick={() => setBulkSelectedTenantIds(tenants.map((x) => x.id))}
                  >
                    {tf.f00557}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-xs"
                    disabled={bulkSelectedTenantIds.length === 0}
                    onClick={() => setBulkSelectedTenantIds([])}
                  >
                    {tf.f00358}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500"
                    onClick={loadTenants}
                  >
                    {tf.f01202}
                  </Button>
                </div>
                <ScrollArea className="h-[240px] rounded-xl border bg-white">
                  <div className="p-3 space-y-2">
                    {loadingTenants && (
                      <p className="text-sm text-muted-foreground">{tf.f01292}</p>
                    )}
                    {!loadingTenants &&
                      tenants.map((t) => (
                        <div key={t.id} className="flex items-start gap-2 py-1">
                          <Checkbox
                            id={`bulk-tenant-${t.id}`}
                            checked={bulkSelectedTenantIds.includes(t.id)}
                            onCheckedChange={(c) => {
                              const on = c === true;
                              setBulkSelectedTenantIds((prev) =>
                                on
                                  ? prev.includes(t.id)
                                    ? prev
                                    : [...prev, t.id]
                                  : prev.filter((id) => id !== t.id)
                              );
                            }}
                          />
                          <label
                            htmlFor={`bulk-tenant-${t.id}`}
                            className="text-sm text-slate-700 leading-snug cursor-pointer flex-1"
                          >
                            {t.name}
                          </label>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
                <p className="text-xs text-muted-foreground">
                  {tf.f01848}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={handleBulkPreview}
                  disabled={
                    bulkPreviewing ||
                    !versionId ||
                    bulkSelectedTenantIds.length === 0 ||
                    bulkSelectedTenantIds.length > TENANT_MASTER_SEED_BULK_MAX
                  }
                >
                  {bulkPreviewing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {tf.f01703}
                </Button>
              </div>

              {bulkPreview && applyTab === "tenants" && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {bulkPreview.dryRun ? tf.f01704 : tf.f01708} · {bulkPreview.seedVersion}{" "}
                    · {tf.f01164} {bulkPreview.tenantCount}{tf.f00945} ({tf.f01425} {bulkPreview.okCount} / {tf.f01517} {bulkPreview.failCount})
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {tf.f01170}{" "}
                    <strong className="text-slate-700">{tf.f01426}</strong>{" "}
                    {tf.f02172}
                  </p>
                  {bulkPreview.okCount > 0 && (
                    <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-3 space-y-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-800">
                        {bulkPreview.dryRun ? tf.f02169 : tf.f02170}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {tf.f01141}
                      </p>
                      {(() => {
                        const agg = aggregateBulkSeedDeltas(bulkPreview.tenants);
                        return (
                          <>
                            <SeedPreviewBreakdown title={tf.f00872} row={agg.suppliers} tf={tf} />
                            <SeedPreviewBreakdown title={tf.f01350} row={agg.products} tf={tf} />
                            <SeedPreviewBreakdown title={tf.f01731} row={agg.materials} tf={tf} />
                          </>
                        );
                      })()}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-snug">{tf.f02332}</p>
                  <ScrollArea className="h-[min(20rem,55vh)] min-h-[200px] rounded-md border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">{tf.f01164}</TableHead>
                          <TableHead className="w-[200px] font-mono text-xs">ID</TableHead>
                          <TableHead>{tf.f00906}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkPreview.tenants.map((row) => (
                          <TableRow key={row.tenantId}>
                            <TableCell className="text-sm">
                              {tenantNameById.get(row.tenantId) ?? "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{row.tenantId}</TableCell>
                            <TableCell className="text-xs">
                              {row.ok && row.result ? (
                                <span className="text-emerald-800">
                                  {tf.f00872} +{row.result.suppliers.toInsert} / {tf.f01350} +{row.result.products.toInsert} / {tf.f01731} +
                                  {row.result.materials.toInsert}
                                  {row.result.delivery.regionsToUpsert > 0 || row.result.delivery.willMergeGeneralDeliveryFields
                                    ? ` / ${tf.f01232} ${row.result.delivery.regionsToUpsert} · ${tf.f01421} ${
                                        row.result.delivery.willMergeGeneralDeliveryFields ? "Y" : "-"
                                      }`
                                    : ""}
                                </span>
                              ) : (
                                <span className="text-red-700">{row.error ?? tf.f01517}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="confirm-seed-bulk-tenants"
                  checked={confirmBulk}
                  onCheckedChange={(c) => setConfirmBulk(c === true)}
                />
                <label
                  htmlFor="confirm-seed-bulk-tenants"
                  className="text-sm text-slate-600 leading-snug cursor-pointer"
                >
                  {tf.f01431}
                </label>
              </div>

              <Button
                type="button"
                className="rounded-xl bg-slate-900 text-white"
                onClick={handleBulkApply}
                disabled={
                  bulkApplying ||
                  !versionId ||
                  !confirmBulk ||
                  bulkSelectedTenantIds.length === 0 ||
                  bulkSelectedTenantIds.length > TENANT_MASTER_SEED_BULK_MAX
                }
              >
                {bulkApplying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {tf.f01411}
              </Button>
            </TabsContent>

            <TabsContent value="organization" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label>{tf.f01830}</Label>
                <Select
                  value={organizationId === "" ? SELECT_ORG_EMPTY : organizationId}
                  onValueChange={(v) =>
                    setOrganizationId(v === SELECT_ORG_EMPTY ? "" : (v ?? ""))
                  }
                  disabled={loadingOrgs}
                >
                  <SelectTrigger
                    className="rounded-xl w-full min-w-0 max-w-full"
                    title={typeof orgTriggerText === "string" ? orgTriggerText : undefined}
                  >
                    <SelectValue placeholder={loadingOrgs ? tf.f01292 : tf.f01837}>
                      {orgTriggerText}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_ORG_EMPTY}>
                      {loadingOrgs ? tf.f01292 : tf.f01837}
                    </SelectItem>
                    {organizations
                      .filter((o) => o.tenantCount > 0)
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name} ({o.tenantCount}{tf.f00945})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-500"
                  onClick={loadOrganizations}
                >
                  {tf.f01835}
                </Button>
                {!loadingOrgs && organizations.length > 0 && organizations.every((o) => o.tenantCount === 0) && (
                  <p className="text-xs text-amber-800">
                    {tf.f01116}
                  </p>
                )}
                {organizationId && !loadingOrgs && (
                  <p className="text-xs text-muted-foreground">
                    {tf.f01673}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-xl"
                  onClick={handleBulkPreview}
                  disabled={bulkPreviewing || !organizationId || !versionId}
                >
                  {bulkPreviewing ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  {tf.f01703}
                </Button>
              </div>

              {bulkPreview && applyTab === "organization" && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {bulkPreview.dryRun ? tf.f01704 : tf.f01708} · {bulkPreview.seedVersion}{" "}
                    · {tf.f01164} {bulkPreview.tenantCount}{tf.f00945} ({tf.f01425} {bulkPreview.okCount} / {tf.f01517} {bulkPreview.failCount})
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {tf.f01839}{" "}
                    <strong className="text-slate-700">{tf.f01426}</strong>{" "}
                    {tf.f02173}
                  </p>
                  {bulkPreview.okCount > 0 && (
                    <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-3 space-y-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-800">
                        {bulkPreview.dryRun ? tf.f02169 : tf.f02170}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {tf.f01141}
                      </p>
                      {(() => {
                        const agg = aggregateBulkSeedDeltas(bulkPreview.tenants);
                        return (
                          <>
                            <SeedPreviewBreakdown title={tf.f00872} row={agg.suppliers} tf={tf} />
                            <SeedPreviewBreakdown title={tf.f01350} row={agg.products} tf={tf} />
                            <SeedPreviewBreakdown title={tf.f01731} row={agg.materials} tf={tf} />
                          </>
                        );
                      })()}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-snug">{tf.f02332}</p>
                  <ScrollArea className="h-[min(20rem,55vh)] min-h-[200px] rounded-md border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">{tf.f01164}</TableHead>
                          <TableHead className="w-[200px] font-mono text-xs">ID</TableHead>
                          <TableHead>{tf.f00906}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bulkPreview.tenants.map((row) => (
                          <TableRow key={row.tenantId}>
                            <TableCell className="text-sm">
                              {tenantNameById.get(row.tenantId) ?? "—"}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{row.tenantId}</TableCell>
                            <TableCell className="text-xs">
                              {row.ok && row.result ? (
                                <span className="text-emerald-800">
                                  {tf.f00872} +{row.result.suppliers.toInsert} / {tf.f01350} +{row.result.products.toInsert} / {tf.f01731} +
                                  {row.result.materials.toInsert}
                                  {row.result.delivery.regionsToUpsert > 0 || row.result.delivery.willMergeGeneralDeliveryFields
                                    ? ` / ${tf.f01232} ${row.result.delivery.regionsToUpsert} · ${tf.f01421} ${
                                        row.result.delivery.willMergeGeneralDeliveryFields ? "Y" : "-"
                                      }`
                                    : ""}
                                </span>
                              ) : (
                                <span className="text-red-700">{row.error ?? tf.f01517}</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              )}

              <div className="flex items-start gap-3 pt-2">
                <Checkbox
                  id="confirm-seed-bulk"
                  checked={confirmBulk}
                  onCheckedChange={(c) => setConfirmBulk(c === true)}
                />
                <label
                  htmlFor="confirm-seed-bulk"
                  className="text-sm text-slate-600 leading-snug cursor-pointer"
                >
                  {tf.f01433}
                </label>
              </div>

              <Button
                type="button"
                className="rounded-xl bg-slate-900 text-white"
                onClick={handleBulkApply}
                disabled={bulkApplying || !organizationId || !versionId || !confirmBulk}
              >
                {bulkApplying ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {tf.f01840}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-slate-100 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">{tf.f01468}</CardTitle>
          <CardDescription className="space-y-3">
            <span className="block">
              {tf.f01520}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>{tf.f01171}</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              {tf.f01653}{" "}
              <strong className="font-medium text-slate-800">{tf.f01067}</strong> ·{" "}
              <strong className="font-medium text-slate-800">{tf.f01167}</strong> ·{" "}
              <strong className="font-medium text-slate-800">{tf.f01843}</strong>{" "}
              {tf.f01885}{" "}
              <strong className="font-medium text-slate-800">{tf.f01215}</strong>.
            </AlertDescription>
          </Alert>
          {!versionId && (
            <p className="text-sm text-muted-foreground">{tf.f01473}</p>
          )}
          {versionId && loadingDetail && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tf.f01469}
            </div>
          )}
          {versionId && !loadingDetail && seedDetail && (
            <>
              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-slate-50/40 px-4 py-3 text-sm shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{tf.f01412}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {seedDetail.version} — {seedDetail.label}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-600">{tf.f01225}</p>
                <ul className="mt-1.5 list-disc pl-5 text-slate-600 space-y-1 text-[13px] leading-snug">
                  {seedDetail.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600 border border-slate-100">
                  <span>
                    {tf.f00872} <strong className="text-slate-800">{seedDetail.counts.suppliers}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    {tf.f01350} <strong className="text-slate-800">{seedDetail.counts.products}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    {tf.f01731} <strong className="text-slate-800">{seedDetail.counts.materials}</strong>
                  </span>
                  {(seedDetail.counts.deliveryDistrictRows ?? 0) > 0 && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>
                        {tf.f01232} <strong className="text-slate-800">{seedDetail.counts.deliveryDistrictRows}</strong>
                      </span>
                    </>
                  )}
                  <span className="text-slate-300">·</span>
                  <span>
                    {tf.f01359} <strong className="text-slate-800">{seedDetail.counts.productCategoryMains}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    {tf.f01740} <strong className="text-slate-800">{seedDetail.counts.materialCategoryMains}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    {tf.f01949} <strong className="text-slate-800">{seedDetail.counts.expenseCategoryMains}</strong>
                  </span>
                </div>
              </div>

              <ScrollArea className="h-[min(28rem,70vh)] min-h-[280px] rounded-xl border border-slate-200/80">
                <div className="p-4 space-y-8">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">{tf.f00872}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{tf.f01681}</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tf.f00500}</TableHead>
                          <TableHead>{tf.f00493}</TableHead>
                          <TableHead className="min-w-[200px]">{tf.f00197}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seedDetail.suppliers.map((s, i) => (
                          <TableRow key={`${i}-${s.name}`}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>{s.supplier_type ?? "—"}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{s.memo ?? "—"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">{tf.f01350}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {tf.f01641}
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tf.f01191}</TableHead>
                          <TableHead>{tf.f01074}</TableHead>
                          <TableHead>{tf.f01887}</TableHead>
                          <TableHead className="font-mono text-[11px]">{tf.f01475}</TableHead>
                          <TableHead className="font-mono text-[11px] min-w-[9rem]">{tf.f02255}</TableHead>
                          <TableHead className="text-right">{tf.f00021}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seedDetail.products.map((p, i) => (
                          <TableRow key={`${p.code ?? p.name}-${p.main_category}-${i}`}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell>{p.main_category}</TableCell>
                            <TableCell>{p.mid_category ?? "—"}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {p.code?.trim() ? p.code : tf.f00788}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-emerald-900/90">
                              {resolvedProductCode(seedDetail.version, i, p.code)}
                            </TableCell>
                            <TableCell className="text-right">{p.price ?? 0}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">{tf.f01732}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {tf.f02257}
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tf.f01191}</TableHead>
                          <TableHead>{tf.f01074}</TableHead>
                          <TableHead>{tf.f01887}</TableHead>
                          <TableHead>{tf.f01066}</TableHead>
                          <TableHead className="font-mono text-[11px] min-w-[10rem]">{tf.f02254}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seedDetail.materials.map((m, i) => (
                          <TableRow key={`${m.name}-${m.main_category}-${i}`}>
                            <TableCell className="font-medium">{m.name}</TableCell>
                            <TableCell>{m.main_category}</TableCell>
                            <TableCell>{m.mid_category ?? "—"}</TableCell>
                            <TableCell>{m.unit}</TableCell>
                            <TableCell className="font-mono text-xs text-emerald-900/90">
                              {resolvedMaterialSeedMemo(seedDetail.version, i)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <details className="group rounded-lg border bg-white px-3 py-2">
                    <summary className="cursor-pointer text-sm font-medium text-slate-800">
                      {tf.f01361}
                    </summary>
                    <pre className="mt-3 max-h-48 overflow-auto rounded bg-slate-950/95 p-3 text-[11px] leading-relaxed text-slate-100">
                      {JSON.stringify(
                        {
                          productCategories: seedDetail.productCategories,
                          materialCategories: seedDetail.materialCategories,
                          expenseCategories: seedDetail.expenseCategories,
                        },
                        null,
                        2
                      )}
                    </pre>
                  </details>
                </div>
              </ScrollArea>
            </>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-slate-400 px-1">
        {tf.f00856} <code className="text-[11px]">tenant_master_seed_audit</code> {tf.f01054}{" "}
        <code className="text-[11px]">supabase/tenant_master_seed_audit_schema.sql</code> {tf.f01518}
      </p>
    </div>
  );
}
