"use client";

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
const trStatic = (baseLocale: string, koText: string, enText: string) =>
  baseLocale === "ko" ? koText : enText;

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

function formatTenantDisplayName(raw: unknown, id: string) {
  const s = raw != null ? String(raw).trim() : "";
  if (s) return s;
  return `Unnamed (${id.slice(0, 8)}…)`;
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
  baseLocale,
}: {
  title: string;
  row: { toInsert: number; toSkip: number };
  baseLocale: string;
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
          {trStatic(baseLocale, "시드 정의 합계", "Seed total")} <strong>{total}</strong>
          {trStatic(baseLocale, "건 · 신규", " · new")}{" "}
          <strong className="text-emerald-700">{ins}</strong>
          {total > 0 ? ` (${insPct}%)` : ""} · {trStatic(baseLocale, "스킵", "skip")} <strong className="text-slate-500">{sk}</strong>
          {total > 0 ? ` (${skPct}%)` : ""}
        </span>
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-200/80">
        {total === 0 ? (
          <div className="h-full w-full bg-slate-100" title={trStatic(baseLocale, "시드에 해당 항목 없음", "No items in this seed section")} />
        ) : (
          <>
            <div
              className="h-full bg-emerald-500 transition-[width] duration-300"
              style={{ width: `${insPct}%` }}
              title={`${trStatic(baseLocale, "신규 적용", "New")} ${ins}${trStatic(baseLocale, "건", "")} (${insPct}%)`}
            />
            <div
              className="h-full bg-slate-400/70 transition-[width] duration-300"
              style={{ width: `${skPct}%` }}
              title={`${trStatic(baseLocale, "건너뜀", "Skipped")} ${sk}${trStatic(baseLocale, "건", "")} (${skPct}%)`}
            />
          </>
        )}
      </div>
    </div>
  );
}

function SeedApplyPreviewPanel({ preview }: { preview: TenantMasterSeedResult }) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed border-l-2 border-sky-200 bg-sky-50/40 pl-3 py-2 rounded-r-md">
        <strong className="text-slate-800">{trStatic(baseLocale, "이 미리보기가 보여 주는 것:", "What this preview shows:")}</strong> {trStatic(baseLocale, "선택한", "selected")}{" "}
        <strong className="text-slate-900">{trStatic(baseLocale, "매장 DB", "store DB")}</strong>{trStatic(baseLocale, "에 대해,", " —")}
        {" "}
        {trStatic(baseLocale, "서버가 시드를", "server runs seed with")}{" "}
        <code className="text-[10px]">dryRun</code>{trStatic(baseLocale, "으로 돌려", " mode, calculating")}{" "}
        <strong className="text-emerald-800">{trStatic(baseLocale, "실제로 INSERT될 건수", "rows to INSERT")}</strong> {trStatic(baseLocale, "와", "and")}{" "}
        <strong className="text-slate-700">{trStatic(baseLocale, "이미 있어 스킵될 건수", "rows skipped as existing")}</strong>{trStatic(baseLocale, "를 계산한 결과입니다.", ".")}
      </p>
      <p className="text-[11px] text-slate-600 leading-snug rounded-md bg-slate-100/80 px-3 py-2 border border-slate-200/60">
        {trStatic(baseLocale, "아래 초록·회색 막대는", "The green/gray bars below are not")}{" "}
        <strong className="text-slate-800">{trStatic(baseLocale, "업로드·적용이 진행되는 실시간 진행률이 아닙니다.", "real-time upload/apply progress.")}</strong>{" "}
        {trStatic(baseLocale, "응답 완료 후 집계된 신규/스킵 비율의", "They are a static summary of new/skip ratio after response.")}{" "}
        <strong className="text-slate-800">{trStatic(baseLocale, "정적 요약", "Static summary")}</strong>.
      </p>
      <p className="text-[11px] font-medium text-slate-700">{trStatic(baseLocale, "신규 vs 스킵 비율", "New vs Skip ratio")}</p>
      <SeedPreviewBreakdown title={trStatic(baseLocale, "거래처", "Suppliers")} row={preview.suppliers} baseLocale={baseLocale} />
      <SeedPreviewBreakdown title={trStatic(baseLocale, "상품", "Products")} row={preview.products} baseLocale={baseLocale} />
      <SeedPreviewBreakdown title={trStatic(baseLocale, "자재", "Materials")} row={preview.materials} baseLocale={baseLocale} />
      {(preview.delivery.regionsToUpsert > 0 || preview.delivery.willMergeGeneralDeliveryFields) && (
        <div className="rounded-lg border border-sky-200/80 bg-sky-50/50 px-3 py-2 text-xs text-sky-950/90 leading-snug">
          <strong className="text-slate-900">{trStatic(baseLocale, "배송비", "Delivery")}</strong> — {trStatic(baseLocale, "자치구·기타 구역", "regional rows")}{" "}
          <strong className="tabular-nums">{preview.delivery.regionsToUpsert}</strong>{trStatic(baseLocale, "건을", " rows to")}{" "}
          <code className="text-[10px]">delivery_fees_by_region</code> {trStatic(baseLocale, "에 UPSERT하고, 일반 설정의 배송 필드 병합", "upsert, and general delivery-field merge")}{" "}
          <strong>{preview.delivery.willMergeGeneralDeliveryFields ? trStatic(baseLocale, "예", "yes") : trStatic(baseLocale, "아니오", "no")}</strong>
          {preview.delivery.regionsToUpsert === 0 && preview.delivery.willMergeGeneralDeliveryFields
            ? trStatic(baseLocale, " (기본 배송료·무료배송 기준만)", " (base/free-delivery only)")
            : ""}
          .
        </div>
      )}
      <div className="rounded-lg border border-amber-200/80 bg-amber-50/60 px-3 py-2 text-xs text-amber-950/90 leading-snug">
        <strong>{trStatic(baseLocale, "카테고리", "Categories")}</strong>{trStatic(baseLocale, "는 건수 비율이 아니라,", " are not ratio-based;")} {trStatic(baseLocale, "상품·자재·지출", "product/material/expense")}{" "}
        <code className="text-[10px]">system_settings</code> {trStatic(baseLocale, "세트를 시드 버전 내용으로", "set with seed-version values and")}{" "}
        <strong>{trStatic(baseLocale, "통째로 덮어씁니다", "fully overwrite")}</strong> {trStatic(baseLocale, "(적용 실행 시 1회 반영).", "(applied once on run).")}
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
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);

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
    toast.message(tr("요청을 취소했습니다. 서버에서 적용이 이미 시작됐다면 일부 반영될 수 있습니다.", "Request canceled. If server apply already started, partial changes may have been applied."));
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
    toast.success(tr("미리보기·일괄 결과와 동의 체크를 초기화했습니다.", "Reset preview/bulk results and confirmation checks."));
  }, []);

  const seedBusy = previewing || applying || bulkPreviewing || bulkApplying;

  const loadTenants = useCallback(async () => {
    try {
      setLoadingTenants(true);
      const res = await fetch("/api/admin/tenants");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : res.statusText);
      }
      const rows = (json.tenants as { id: string; name?: string | null }[]) ?? [];
      setTenants(
        rows
          .map((t) => ({
            id: t.id,
            name: formatTenantDisplayName(t.name, t.id),
          }))
          .sort((a, b) => a.name.localeCompare(b.name, "ko"))
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("tenant-master-seed loadTenants:", msg, e);
      toast.error(tr("테넌트 목록을 불러오지 못했습니다.", "Failed to load tenant list."));
    } finally {
      setLoadingTenants(false);
    }
  }, []);

  const loadVersions = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/tenant-master-seed/versions");
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setVersions(json.versions ?? []);
      if (json.versions?.[0]?.id) setVersionId((v) => v || json.versions[0].id);
    } catch (e) {
      console.error(e);
      toast.error(tr("시드 버전 목록을 불러오지 못했습니다.", "Failed to load seed versions."));
    }
  }, []);

  const loadOrganizations = useCallback(async () => {
    try {
      setLoadingOrgs(true);
      const res = await fetch("/api/admin/organizations");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : res.statusText);
      }
      const rows = (json.organizations as OrganizationRow[]) ?? [];
      setOrganizations(rows.sort((a, b) => a.name.localeCompare(b.name, "ko")));
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("tenant-master-seed loadOrganizations:", msg, e);
      toast.error(tr("조직 목록을 불러오지 못했습니다.", "Failed to load organizations."));
    } finally {
      setLoadingOrgs(false);
    }
  }, []);

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
    if (loadingTenants) return tr("불러오는 중…", "Loading...");
    const row = tenants.find((t) => t.id === tenantId);
    if (row) return row.name;
    return `${tr("목록에 없는 매장", "Store not in list")} (${tenantId.slice(0, 8)}…)`;
  }, [tenantId, tenants, loadingTenants, tr]);

  const versionTriggerText = useMemo(() => {
    if (!versionId) return null;
    const v = versions.find((x) => x.id === versionId);
    if (v) return `${v.id} — ${v.label}`;
    return versionId;
  }, [versionId, versions]);

  const orgTriggerText = useMemo(() => {
    if (!organizationId) return null;
    if (loadingOrgs) return tr("불러오는 중…", "Loading...");
    const o = organizations.find((x) => x.id === organizationId);
    if (o) return `${o.name} (${tr("매장", "Stores")} ${o.tenantCount}${tr("곳", "")})`;
    return `${tr("목록에 없는 조직", "Organization not in list")} (${organizationId.slice(0, 8)}…)`;
  }, [organizationId, organizations, loadingOrgs, tr]);

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
          `/api/admin/tenant-master-seed/detail?versionId=${encodeURIComponent(versionId)}`
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
  }, [isSuperAdmin, versionId]);

  const handlePreview = async () => {
    if (!tenantId || !versionId) {
      toast.error(tr("테넌트와 시드 버전을 선택하세요.", "Select tenant and seed version."));
      return;
    }
    const ac = armSeedAbort();
    setPreviewing(true);
    setPreview(null);
    try {
      const res = await fetch("/api/admin/tenant-master-seed/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, versionId }),
        signal: ac.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || tr("미리보기 실패", "Preview failed"));
        return;
      }
      setPreview(json as TenantMasterSeedResult);
      toast.success(tr("미리보기를 불러왔습니다.", "Loaded preview."));
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error(tr("미리보기 요청 중 오류가 발생했습니다.", "Preview request failed."));
    } finally {
      setPreviewing(false);
      if (seedAbortRef.current === ac) seedAbortRef.current = null;
    }
  };

  const handleBulkPreview = async () => {
    if (!versionId) {
      toast.error(tr("시드 버전을 선택하세요.", "Select seed version."));
      return;
    }
    let body: Record<string, unknown>;
    if (applyTab === "tenants") {
      if (bulkSelectedTenantIds.length === 0) {
        toast.error(tr("적용할 매장을 한 곳 이상 선택하세요.", "Select at least one store to apply."));
        return;
      }
      if (bulkSelectedTenantIds.length > TENANT_MASTER_SEED_BULK_MAX) {
        toast.error(`${tr("한 번에 최대", "You can select up to")} ${TENANT_MASTER_SEED_BULK_MAX}${tr("곳까지 선택할 수 있습니다.", " stores at once.")}`);
        return;
      }
      body = { versionId, tenantIds: bulkSelectedTenantIds };
    } else {
      if (!organizationId) {
        toast.error(tr("조직과 시드 버전을 선택하세요.", "Select organization and seed version."));
        return;
      }
      body = { organizationId, versionId };
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
        toast.error(json.error || tr("일괄 미리보기 실패", "Bulk preview failed"));
        return;
      }
      setBulkPreview(json as TenantMasterSeedBulkResult);
      toast.success(
        applyTab === "tenants"
          ? tr("선택한 매장 일괄 미리보기를 불러왔습니다.", "Loaded bulk preview for selected stores.")
          : tr("조직 소속 매장 일괄 미리보기를 불러왔습니다.", "Loaded bulk preview for organization stores.")
      );
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error(tr("일괄 미리보기 요청 중 오류가 발생했습니다.", "Bulk preview request failed."));
    } finally {
      setBulkPreviewing(false);
      if (seedAbortRef.current === ac) seedAbortRef.current = null;
    }
  };

  const handleBulkApply = async () => {
    if (!versionId) {
      toast.error(tr("시드 버전을 선택하세요.", "Select seed version."));
      return;
    }
    if (!confirmBulk) {
      toast.error(tr("일괄 적용 전 확인란에 체크하세요.", "Check confirmation before bulk apply."));
      return;
    }
    let body: Record<string, unknown>;
    if (applyTab === "tenants") {
      if (bulkSelectedTenantIds.length === 0) {
        toast.error(tr("적용할 매장을 한 곳 이상 선택하세요.", "Select at least one store to apply."));
        return;
      }
      if (bulkSelectedTenantIds.length > TENANT_MASTER_SEED_BULK_MAX) {
        toast.error(`${tr("한 번에 최대", "You can select up to")} ${TENANT_MASTER_SEED_BULK_MAX}${tr("곳까지 선택할 수 있습니다.", " stores at once.")}`);
        return;
      }
      body = { versionId, tenantIds: bulkSelectedTenantIds, confirm: true };
    } else {
      if (!organizationId) {
        toast.error(tr("조직과 시드 버전을 선택하세요.", "Select organization and seed version."));
        return;
      }
      body = { organizationId, versionId, confirm: true };
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
        toast.error(json.error || tr("일괄 적용 실패", "Bulk apply failed"));
        return;
      }
      setBulkPreview(json as TenantMasterSeedBulkResult);
      toast.success(
        `${tr("일괄 시드 완료", "Bulk seed completed")}: ${tr("성공", "ok")} ${(json as TenantMasterSeedBulkResult).okCount}${tr("곳", "")} / ${tr("실패", "fail")} ${(json as TenantMasterSeedBulkResult).failCount}${tr("곳", "")}`
      );
      setConfirmBulk(false);
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error(tr("일괄 적용 중 오류가 발생했습니다.", "Bulk apply failed."));
    } finally {
      setBulkApplying(false);
      if (seedAbortRef.current === ac) seedAbortRef.current = null;
    }
  };

  const handleApply = async () => {
    if (!tenantId || !versionId) {
      toast.error(tr("테넌트와 시드 버전을 선택하세요.", "Select tenant and seed version."));
      return;
    }
    if (!confirm) {
      toast.error(tr("적용 전 확인란에 체크하세요.", "Check confirmation before apply."));
      return;
    }
    const ac = armSeedAbort();
    setApplying(true);
    try {
      const res = await fetch("/api/admin/tenant-master-seed/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId, versionId, confirm: true }),
        signal: ac.signal,
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || tr("적용 실패", "Apply failed"));
        return;
      }
      setPreview(json as TenantMasterSeedResult);
      toast.success(tr("시드 적용이 완료되었습니다.", "Seed apply completed."));
      setConfirm(false);
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error(tr("적용 중 오류가 발생했습니다.", "Apply failed."));
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
        title={tr("초기 기초자료 시드", "Initial Master Data Seed")}
        description={tr("세팅비 결제·요청 확인 후, 표준 마스터(카테고리·상품·자재·거래처 샘플)를 지정 매장에 반영합니다.", "After setup payment/request confirmation, apply standard masters (categories/products/materials/suppliers) to target stores.")}
        icon={Database}
      />

      <Alert>
        <AlertTitle>{tr("유료 세팅 운영 절차", "Paid Setup Procedure")}</AlertTitle>
        <AlertDescription>
          {tr(
            "실제 과금은 별도(세팅비)로 처리하고, 고객 동의·결제 확인 후에만 적용하세요. 자재 단가는 0원이며 카테고리는 시드 기준으로 덮어씁니다. 여러 매장에 같은 시드를 한 번에 넣을 때는 \"매장 선택 일괄\"에서 체크만 하면 됩니다(조직 없이 1:1 매장만 있어도 됨). 본사·지점이 tenants.organization_id로 묶여 있으면 \"조직 일괄\"도 사용할 수 있습니다. 한 곳만이면 \"단일 매장\" 탭을 쓰세요.",
            "Handle billing separately as setup fee, and apply only after customer consent/payment confirmation. Material unit price is 0 by default and categories are overwritten by seed baseline. To apply the same seed to many stores, use \"Selected stores bulk\" (works even without organization links). If HQ/branches are linked by tenants.organization_id, you can use \"Organization bulk\". For one store, use \"Single store\"."
          )}
        </AlertDescription>
      </Alert>

      <Card className="border-slate-100 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">{tr("대상 및 버전", "Target & Version")}</CardTitle>
          <CardDescription>{tr("super_admin 전용 · 서비스 롤로 테넌트에 씁니다.", "Super-admin only · writes to tenants via service role.")}</CardDescription>
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
                {tr("요청 취소", "Cancel Request")}
              </Button>
              <Button type="button" variant="secondary" size="sm" className="rounded-lg h-8" onClick={resetSeedWizard}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                {tr("결과·동의 초기화", "Reset Results & Consent")}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              {tr(
                "요청 취소는 이 브라우저에서 응답 대기만 멈춥니다. 서버에서 INSERT가 이미 진행 중이면 끝까지 갈 수 있어, 적용 여부는 해당 매장에서 미리보기로 확인하는 것이 안전합니다. 처음부터 다시 고르려면 결과·동의 초기화를 누르세요(진행 중이면 먼저 취소해도 됩니다).",
                "Cancel stops waiting in this browser only. If INSERT already started on server, it may continue; verify outcome from store preview. Use reset results/consent to restart flow."
              )}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{tr("시드 버전 (고정 소스)", "Seed Version (Fixed Source)")}</Label>
            <Select
              value={versionId === "" ? SELECT_VERSION_EMPTY : versionId}
              onValueChange={(v) => setVersionId(v === SELECT_VERSION_EMPTY ? "" : (v ?? ""))}
            >
              <SelectTrigger
                className="rounded-xl w-full min-w-0 max-w-full"
                title={typeof versionTriggerText === "string" ? versionTriggerText : undefined}
              >
                <SelectValue placeholder={tr("버전 선택", "Select version")}>{versionTriggerText}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_VERSION_EMPTY}>
                  {versions.length === 0 ? tr("목록 로드 중…", "Loading list...") : tr("시드 버전 선택", "Select seed version")}
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
                {tr("단일 매장", "Single Store")}
              </TabsTrigger>
              <TabsTrigger value="tenants" className="flex-1 text-xs sm:text-sm">
                {tr("매장 선택 일괄", "Selected Stores Bulk")}
              </TabsTrigger>
              <TabsTrigger value="organization" className="flex-1 text-xs sm:text-sm">
                {tr("조직 일괄", "Organization Bulk")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label>{tr("테넌트(매장)", "Tenant (Store)")}</Label>
                <Select
                  value={tenantId === "" ? SELECT_TENANT_EMPTY : tenantId}
                  onValueChange={(v) => setTenantId(v === SELECT_TENANT_EMPTY ? "" : (v ?? ""))}
                  disabled={loadingTenants}
                >
                  <SelectTrigger
                    className="rounded-xl w-full min-w-0 max-w-full"
                    title={typeof tenantTriggerText === "string" ? tenantTriggerText : undefined}
                  >
                    <SelectValue placeholder={loadingTenants ? tr("불러오는 중…", "Loading...") : tr("매장 선택", "Select store")}>
                      {tenantTriggerText}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_TENANT_EMPTY}>
                      {loadingTenants ? tr("불러오는 중…", "Loading...") : tr("매장 선택", "Select store")}
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
                  {tr("목록 새로고침", "Refresh List")}
                </Button>
              </div>

              <p className="text-xs text-muted-foreground leading-snug">
                {tr("「미리보기」는", "\"Preview\" compares")} <strong className="text-slate-700">{tr("선택 매장의 현재 DB", "selected store DB")}</strong>{tr("와 비교한", " and returns only")}{" "}
                <strong>{tr("신규/스킵 건수·비율", "new/skip counts and ratios")}</strong>.{" "}
                {tr("시드 원본/실제 저장 값은 하단 「시드 구성 보기」에서 확인하세요.", "See raw seed/actual save values below in \"Seed Contents\".")}
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
                  {tr("미리보기", "Preview")}
                </Button>
              </div>

              {preview && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {preview.dryRun ? tr("미리보기 (DB 미반영)", "Preview (DB unchanged)") : tr("적용 결과", "Apply Result")} · {preview.seedVersion}
                  </p>
                  <SeedApplyPreviewPanel preview={preview} />
                  {preview.auditId && (
                    <p className="text-xs font-mono text-slate-500">{tr("감사 로그 ID", "Audit Log ID")}: {preview.auditId}</p>
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
                  {tr("세팅비·고객 요청을 확인했고, 이 매장에 시드를 적용합니다. 카테고리 덮어쓰기 및 초안 데이터 추가에 동의합니다.", "I confirmed setup fee/customer request and agree to apply seed to this store, including category overwrite and draft data insert.")}
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
                {tr("시드 적용 실행", "Run Seed Apply")}
              </Button>
            </TabsContent>

            <TabsContent value="tenants" className="mt-6 space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="shrink-0">{tr("매장 선택", "Select Stores")}</Label>
                  <span className="text-xs text-muted-foreground">
                    {bulkSelectedTenantIds.length}{tr("곳 선택 · 최대", " selected · max ")} {TENANT_MASTER_SEED_BULK_MAX}{tr("곳", "")}
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
                    {tr("전체 선택", "Select All")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-xs"
                    disabled={bulkSelectedTenantIds.length === 0}
                    onClick={() => setBulkSelectedTenantIds([])}
                  >
                    {tr("선택 해제", "Clear Selection")}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500"
                    onClick={loadTenants}
                  >
                    {tr("목록 새로고침", "Refresh List")}
                  </Button>
                </div>
                <ScrollArea className="h-[240px] rounded-xl border bg-white">
                  <div className="p-3 space-y-2">
                    {loadingTenants && (
                      <p className="text-sm text-muted-foreground">{tr("불러오는 중…", "Loading...")}</p>
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
                  {tr("조직에 묶이지 않은 단독 매장·1:1 고객도 여기서 여러 곳을 골라 동일 시드를 한 번에 미리보기·적용할 수 있습니다.", "You can preview/apply the same seed to multiple standalone stores here, even without organization links.")}
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
                  {tr("일괄 미리보기", "Bulk Preview")}
                </Button>
              </div>

              {bulkPreview && applyTab === "tenants" && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {bulkPreview.dryRun ? tr("일괄 미리보기 (DB 미반영)", "Bulk Preview (DB unchanged)") : tr("일괄 적용 결과", "Bulk Apply Result")} · {bulkPreview.seedVersion}{" "}
                    · {tr("매장", "Stores")} {bulkPreview.tenantCount}{tr("곳", "")} ({tr("성공", "OK")} {bulkPreview.okCount} / {tr("실패", "Fail")} {bulkPreview.failCount})
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {tr("매장별 미리보기는 각 매장 DB 기준 신규/스킵입니다. 아래 막대는", "Per-store preview is based on each store DB new/skip status. Bars show")}{" "}
                    <strong className="text-slate-700">{tr("성공한 매장만", "successful stores only")}</strong>{" "}
                    {tr("합산 비율입니다. 시드 원본은 하단 「시드 구성 보기」에서 확인하세요.", "aggregate ratio. See raw seed at bottom \"Seed Contents\".")}
                  </p>
                  {bulkPreview.okCount > 0 && (
                    <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-3 space-y-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-800">
                        {bulkPreview.dryRun ? tr("합산 (미리보기 성공 매장)", "Aggregate (preview-success stores)") : tr("합산 (적용 성공 매장)", "Aggregate (apply-success stores)")}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {tr("막대는 매장별 순차 처리 진행률이 아니라, 응답 집계 후 신규/스킵 합산 비율입니다.", "Bars are not per-store progress; they are aggregated new/skip ratio after responses.")}
                      </p>
                      {(() => {
                        const agg = aggregateBulkSeedDeltas(bulkPreview.tenants);
                        return (
                          <>
                            <SeedPreviewBreakdown title={tr("거래처", "Suppliers")} row={agg.suppliers} baseLocale={baseLocale} />
                            <SeedPreviewBreakdown title={tr("상품", "Products")} row={agg.products} baseLocale={baseLocale} />
                            <SeedPreviewBreakdown title={tr("자재", "Materials")} row={agg.materials} baseLocale={baseLocale} />
                          </>
                        );
                      })()}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-snug">
                    표는 높이가 제한되어 있어 일부 행만 보일 수 있으니, 안쪽을 스크롤하면 나머지 매장도 모두 확인할 수 있습니다.
                  </p>
                  <ScrollArea className="h-[min(20rem,55vh)] min-h-[200px] rounded-md border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">{tr("매장", "Store")}</TableHead>
                          <TableHead className="w-[200px] font-mono text-xs">ID</TableHead>
                          <TableHead>{tr("결과", "Result")}</TableHead>
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
                                  {tr("거래처", "Suppliers")} +{row.result.suppliers.toInsert} / {tr("상품", "Products")} +{row.result.products.toInsert} / {tr("자재", "Materials")} +
                                  {row.result.materials.toInsert}
                                  {row.result.delivery.regionsToUpsert > 0 || row.result.delivery.willMergeGeneralDeliveryFields
                                    ? ` / ${tr("배송 구역", "delivery zones")} ${row.result.delivery.regionsToUpsert} · ${tr("설정병합", "settings merge")} ${
                                        row.result.delivery.willMergeGeneralDeliveryFields ? "Y" : "-"
                                      }`
                                    : ""}
                                </span>
                              ) : (
                                <span className="text-red-700">{row.error ?? tr("실패", "Failed")}</span>
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
                  {tr("세팅비·고객 요청을 확인했고, 위에서 선택한 매장에 동일 시드를 일괄 적용합니다. 카테고리 덮어쓰기 및 초안 데이터 추가에 동의합니다.", "I confirmed setup fee/customer request and agree to bulk apply the same seed to selected stores, including category overwrite and draft data insert.")}
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
                {tr("선택한 매장에 시드 적용", "Apply Seed to Selected Stores")}
              </Button>
            </TabsContent>

            <TabsContent value="organization" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label>{tr("조직 (본사)", "Organization (HQ)")}</Label>
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
                    <SelectValue placeholder={loadingOrgs ? tr("불러오는 중…", "Loading...") : tr("조직 선택", "Select organization")}>
                      {orgTriggerText}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_ORG_EMPTY}>
                      {loadingOrgs ? tr("불러오는 중…", "Loading...") : tr("조직 선택", "Select organization")}
                    </SelectItem>
                    {organizations
                      .filter((o) => o.tenantCount > 0)
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name} ({o.tenantCount}{tr("곳", "")})
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
                  {tr("조직 목록 새로고침", "Refresh Organization List")}
                </Button>
                {!loadingOrgs && organizations.length > 0 && organizations.every((o) => o.tenantCount === 0) && (
                  <p className="text-xs text-amber-800">
                    {tr("등록된 조직은 있으나, 매장(tenants.organization_id)이 아직 연결되지 않았습니다. Supabase에서 지점 테넌트에 조직을 먼저 연결하세요.", "Organizations exist, but stores are not linked yet via tenants.organization_id. Link branch tenants to organizations first in Supabase.")}
                  </p>
                )}
                {organizationId && !loadingOrgs && (
                  <p className="text-xs text-muted-foreground">
                    {tr("이 조직에 연결된 매장 전원에게 동일 시드가 순차 적용됩니다. (최대 200곳)", "Same seed will be applied sequentially to all stores in this organization. (max 200 stores)")}
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
                  {tr("일괄 미리보기", "Bulk Preview")}
                </Button>
              </div>

              {bulkPreview && applyTab === "organization" && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {bulkPreview.dryRun ? tr("일괄 미리보기 (DB 미반영)", "Bulk Preview (DB unchanged)") : tr("일괄 적용 결과", "Bulk Apply Result")} · {bulkPreview.seedVersion}{" "}
                    · {tr("매장", "Stores")} {bulkPreview.tenantCount}{tr("곳", "")} ({tr("성공", "OK")} {bulkPreview.okCount} / {tr("실패", "Fail")} {bulkPreview.failCount})
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    {tr("조직 소속 매장별 미리보기는 각 DB 기준입니다. 아래 막대는", "Per-store preview in organization is based on each DB. Bars show")}{" "}
                    <strong className="text-slate-700">{tr("성공한 매장만", "successful stores only")}</strong>{" "}
                    {tr("합산 비율입니다. 시드 원본은 하단 「시드 구성 보기」입니다.", "aggregate ratio. Raw seed is in bottom \"Seed Contents\".")}
                  </p>
                  {bulkPreview.okCount > 0 && (
                    <div className="rounded-lg border border-slate-200/90 bg-white px-3 py-3 space-y-3 shadow-sm">
                      <p className="text-xs font-semibold text-slate-800">
                        {bulkPreview.dryRun ? tr("합산 (미리보기 성공 매장)", "Aggregate (preview-success stores)") : tr("합산 (적용 성공 매장)", "Aggregate (apply-success stores)")}
                      </p>
                      <p className="text-[10px] text-muted-foreground leading-snug">
                        {tr("막대는 매장별 순차 처리 진행률이 아니라, 응답 집계 후 신규/스킵 합산 비율입니다.", "Bars are not per-store progress; they are aggregated new/skip ratio after responses.")}
                      </p>
                      {(() => {
                        const agg = aggregateBulkSeedDeltas(bulkPreview.tenants);
                        return (
                          <>
                            <SeedPreviewBreakdown title={tr("거래처", "Suppliers")} row={agg.suppliers} baseLocale={baseLocale} />
                            <SeedPreviewBreakdown title={tr("상품", "Products")} row={agg.products} baseLocale={baseLocale} />
                            <SeedPreviewBreakdown title={tr("자재", "Materials")} row={agg.materials} baseLocale={baseLocale} />
                          </>
                        );
                      })()}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground leading-snug">
                    표는 높이가 제한되어 있어 일부 행만 보일 수 있으니, 안쪽을 스크롤하면 나머지 매장도 모두 확인할 수 있습니다.
                  </p>
                  <ScrollArea className="h-[min(20rem,55vh)] min-h-[200px] rounded-md border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">{tr("매장", "Store")}</TableHead>
                          <TableHead className="w-[200px] font-mono text-xs">ID</TableHead>
                          <TableHead>{tr("결과", "Result")}</TableHead>
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
                                  {tr("거래처", "Suppliers")} +{row.result.suppliers.toInsert} / {tr("상품", "Products")} +{row.result.products.toInsert} / {tr("자재", "Materials")} +
                                  {row.result.materials.toInsert}
                                  {row.result.delivery.regionsToUpsert > 0 || row.result.delivery.willMergeGeneralDeliveryFields
                                    ? ` / ${tr("배송 구역", "delivery zones")} ${row.result.delivery.regionsToUpsert} · ${tr("설정병합", "settings merge")} ${
                                        row.result.delivery.willMergeGeneralDeliveryFields ? "Y" : "-"
                                      }`
                                    : ""}
                                </span>
                              ) : (
                                <span className="text-red-700">{row.error ?? tr("실패", "Failed")}</span>
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
                  {tr("세팅비·고객 요청을 확인했고, 이 조직 소속 매장 전원에 시드를 일괄 적용합니다. 카테고리 덮어쓰기 및 초안 데이터 추가에 동의합니다.", "I confirmed setup fee/customer request and agree to bulk apply seed to all stores in this organization, including category overwrite and draft data insert.")}
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
                {tr("조직 소속 전체에 시드 적용", "Apply Seed to Entire Organization")}
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-slate-100 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">{tr("시드 구성 보기 (고정 소스)", "Seed Contents (Fixed Source)")}</CardTitle>
          <CardDescription className="space-y-3">
            <span className="block">
              {tr("아래 표는 코드에 넣어 둔 원본과, 매장 DB에 실제로 저장될 값을 함께 보여 줍니다. 적용 자체는 이 카드가 아니라 위쪽 「대상 및 버전」에서 합니다.", "The table below shows both raw values in code and actual values saved to store DB. Apply is done above in \"Target & Version\".")}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>{tr("매장에 넣으려면", "To apply to stores")}</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              {tr("위 카드에서 시드 버전을 고른 뒤,", "Select seed version above, then run")}{" "}
              <strong className="font-medium text-slate-800">{tr("단일 매장", "Single store")}</strong> ·{" "}
              <strong className="font-medium text-slate-800">{tr("매장 선택 일괄", "Selected stores bulk")}</strong> ·{" "}
              <strong className="font-medium text-slate-800">{tr("조직 일괄", "Organization bulk")}</strong>{" "}
              {tr("중 하나로", "flow with")}{" "}
              <strong className="font-medium text-slate-800">{tr("미리보기 → 확인 체크 → 적용", "Preview -> Confirm -> Apply")}</strong>.
            </AlertDescription>
          </Alert>
          {!versionId && (
            <p className="text-sm text-muted-foreground">{tr("시드 버전을 선택하면 내용이 표시됩니다.", "Select a seed version to view contents.")}</p>
          )}
          {versionId && loadingDetail && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {tr("시드 내용 불러오는 중…", "Loading seed contents...")}
            </div>
          )}
          {versionId && !loadingDetail && seedDetail && (
            <>
              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-slate-50/40 px-4 py-3 text-sm shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{tr("선택한 버전", "Selected Version")}</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {seedDetail.version} — {seedDetail.label}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-600">{tr("반영 시 규칙", "Apply Rules")}</p>
                <ul className="mt-1.5 list-disc pl-5 text-slate-600 space-y-1 text-[13px] leading-snug">
                  {seedDetail.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600 border border-slate-100">
                  <span>
                    {tr("거래처", "Suppliers")} <strong className="text-slate-800">{seedDetail.counts.suppliers}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    {tr("상품", "Products")} <strong className="text-slate-800">{seedDetail.counts.products}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    {tr("자재", "Materials")} <strong className="text-slate-800">{seedDetail.counts.materials}</strong>
                  </span>
                  {(seedDetail.counts.deliveryDistrictRows ?? 0) > 0 && (
                    <>
                      <span className="text-slate-300">·</span>
                      <span>
                        {tr("배송 구역", "Delivery Zones")} <strong className="text-slate-800">{seedDetail.counts.deliveryDistrictRows}</strong>
                      </span>
                    </>
                  )}
                  <span className="text-slate-300">·</span>
                  <span>
                    {tr("상품 카테고리(대)", "Product Main Categories")} <strong className="text-slate-800">{seedDetail.counts.productCategoryMains}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    {tr("자재 카테고리(대)", "Material Main Categories")} <strong className="text-slate-800">{seedDetail.counts.materialCategoryMains}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    {tr("지출 카테고리(대)", "Expense Main Categories")} <strong className="text-slate-800">{seedDetail.counts.expenseCategoryMains}</strong>
                  </span>
                </div>
              </div>

              <ScrollArea className="h-[min(28rem,70vh)] min-h-[280px] rounded-xl border border-slate-200/80">
                <div className="p-4 space-y-8">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">{tr("거래처", "Suppliers")}</h4>
                    <p className="text-xs text-muted-foreground mb-2">{tr("이름·유형·메모는 시드 그대로 들어갑니다.", "Name/type/memo are inserted as-is from seed.")}</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tr("이름", "Name")}</TableHead>
                          <TableHead>{tr("유형", "Type")}</TableHead>
                          <TableHead className="min-w-[200px]">{tr("메모", "Memo")}</TableHead>
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
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">{tr("상품", "Products")}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {tr("원본 코드는 참고용입니다. 비어 있으면 적용 시 순번 코드가 붙습니다.", "Raw seed code is for reference. If empty, sequence code is generated on apply.")}
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tr("명", "Name")}</TableHead>
                          <TableHead>{tr("대분류", "Main Category")}</TableHead>
                          <TableHead>{tr("중분류", "Mid Category")}</TableHead>
                          <TableHead className="font-mono text-[11px]">{tr("시드 원본 코드", "Raw Seed Code")}</TableHead>
                          <TableHead className="font-mono text-[11px] min-w-[9rem]">{tr("DB 저장 코드", "DB Saved Code")}</TableHead>
                          <TableHead className="text-right">{tr("가격", "Price")}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seedDetail.products.map((p, i) => (
                          <TableRow key={`${p.code ?? p.name}-${p.main_category}-${i}`}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell>{p.main_category}</TableCell>
                            <TableCell>{p.mid_category ?? "—"}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {p.code?.trim() ? p.code : tr("— (자동)", "— (auto)")}
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
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">{tr("자재 (단가·재고 0)", "Materials (price/stock 0)")}</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      {tr("DB에는 아래 메모로 중복 적용을 구분합니다.", "In DB, duplicates are distinguished by memo below.")}
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>{tr("명", "Name")}</TableHead>
                          <TableHead>{tr("대분류", "Main Category")}</TableHead>
                          <TableHead>{tr("중분류", "Mid Category")}</TableHead>
                          <TableHead>{tr("단위", "Unit")}</TableHead>
                          <TableHead className="font-mono text-[11px] min-w-[10rem]">{tr("DB 메모", "DB Memo")}</TableHead>
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
                      {tr("상품·자재·지출 카테고리 트리 (JSON)", "Product/Material/Expense Category Tree (JSON)")}
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
        {tr("감사 테이블", "Audit table")} <code className="text-[11px]">tenant_master_seed_audit</code> {tr("는", "is")}{" "}
        <code className="text-[11px]">supabase/tenant_master_seed_audit_schema.sql</code> {tr("실행 시 기록됩니다. 미적용 시에도 시드는 동작합니다.", "recorded when applied. Seed still works even if schema is not applied.")}
      </p>
    </div>
  );
}
