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

/** Base UI Select 는 value="" 를 비제어로 취급하는 경우가 있어, 빈 선택은 sentinel 으로만 전달 */
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

function formatTenantDisplayName(raw: unknown, id: string) {
  const s = raw != null ? String(raw).trim() : "";
  if (s) return s;
  return `이름 미등록 (${id.slice(0, 8)}…)`;
}

function isAbortError(e: unknown) {
  return e instanceof DOMException && e.name === "AbortError";
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
    toast.message("요청을 취소했습니다. 서버에서 적용이 이미 시작됐다면 일부 반영될 수 있습니다.");
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
    toast.success("미리보기·일괄 결과와 동의 체크를 초기화했습니다.");
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
      toast.error("테넌트 목록을 불러오지 못했습니다.");
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
      toast.error("시드 버전 목록을 불러오지 못했습니다.");
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
      toast.error("조직 목록을 불러오지 못했습니다.");
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

  /** 목록 로드 완료 후에도 목록에 없는 tenantId면 UUID만 보이므로 선택 해제 */
  useEffect(() => {
    if (loadingTenants || !tenantId || tenants.length === 0) return;
    if (!tenants.some((t) => t.id === tenantId)) {
      setTenantId("");
    }
  }, [tenants, tenantId, loadingTenants]);

  /** Base UI Select 트리거가 value(UUID)를 그대로 쓰는 경우가 있어, 표시 문자열을 고정 */
  const tenantTriggerText = useMemo(() => {
    if (!tenantId) return null;
    if (loadingTenants) return "불러오는 중…";
    const row = tenants.find((t) => t.id === tenantId);
    if (row) return row.name;
    return `목록에 없는 매장 (${tenantId.slice(0, 8)}…)`;
  }, [tenantId, tenants, loadingTenants]);

  const versionTriggerText = useMemo(() => {
    if (!versionId) return null;
    const v = versions.find((x) => x.id === versionId);
    if (v) return `${v.id} — ${v.label}`;
    return versionId;
  }, [versionId, versions]);

  const orgTriggerText = useMemo(() => {
    if (!organizationId) return null;
    if (loadingOrgs) return "불러오는 중…";
    const o = organizations.find((x) => x.id === organizationId);
    if (o) return `${o.name} (매장 ${o.tenantCount}곳)`;
    return `목록에 없는 조직 (${organizationId.slice(0, 8)}…)`;
  }, [organizationId, organizations, loadingOrgs]);

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
      toast.error("테넌트와 시드 버전을 선택하세요.");
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
        toast.error(json.error || "미리보기 실패");
        return;
      }
      setPreview(json as TenantMasterSeedResult);
      toast.success("미리보기를 불러왔습니다.");
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error("미리보기 요청 중 오류가 발생했습니다.");
    } finally {
      setPreviewing(false);
      if (seedAbortRef.current === ac) seedAbortRef.current = null;
    }
  };

  const handleBulkPreview = async () => {
    if (!versionId) {
      toast.error("시드 버전을 선택하세요.");
      return;
    }
    let body: Record<string, unknown>;
    if (applyTab === "tenants") {
      if (bulkSelectedTenantIds.length === 0) {
        toast.error("적용할 매장을 한 곳 이상 선택하세요.");
        return;
      }
      if (bulkSelectedTenantIds.length > TENANT_MASTER_SEED_BULK_MAX) {
        toast.error(`한 번에 최대 ${TENANT_MASTER_SEED_BULK_MAX}곳까지 선택할 수 있습니다.`);
        return;
      }
      body = { versionId, tenantIds: bulkSelectedTenantIds };
    } else {
      if (!organizationId) {
        toast.error("조직과 시드 버전을 선택하세요.");
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
        toast.error(json.error || "일괄 미리보기 실패");
        return;
      }
      setBulkPreview(json as TenantMasterSeedBulkResult);
      toast.success(
        applyTab === "tenants"
          ? "선택한 매장 일괄 미리보기를 불러왔습니다."
          : "조직 소속 매장 일괄 미리보기를 불러왔습니다."
      );
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error("일괄 미리보기 요청 중 오류가 발생했습니다.");
    } finally {
      setBulkPreviewing(false);
      if (seedAbortRef.current === ac) seedAbortRef.current = null;
    }
  };

  const handleBulkApply = async () => {
    if (!versionId) {
      toast.error("시드 버전을 선택하세요.");
      return;
    }
    if (!confirmBulk) {
      toast.error("일괄 적용 전 확인란에 체크하세요.");
      return;
    }
    let body: Record<string, unknown>;
    if (applyTab === "tenants") {
      if (bulkSelectedTenantIds.length === 0) {
        toast.error("적용할 매장을 한 곳 이상 선택하세요.");
        return;
      }
      if (bulkSelectedTenantIds.length > TENANT_MASTER_SEED_BULK_MAX) {
        toast.error(`한 번에 최대 ${TENANT_MASTER_SEED_BULK_MAX}곳까지 선택할 수 있습니다.`);
        return;
      }
      body = { versionId, tenantIds: bulkSelectedTenantIds, confirm: true };
    } else {
      if (!organizationId) {
        toast.error("조직과 시드 버전을 선택하세요.");
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
        toast.error(json.error || "일괄 적용 실패");
        return;
      }
      setBulkPreview(json as TenantMasterSeedBulkResult);
      toast.success(
        `일괄 시드 완료: 성공 ${(json as TenantMasterSeedBulkResult).okCount}곳 / 실패 ${(json as TenantMasterSeedBulkResult).failCount}곳`
      );
      setConfirmBulk(false);
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error("일괄 적용 중 오류가 발생했습니다.");
    } finally {
      setBulkApplying(false);
      if (seedAbortRef.current === ac) seedAbortRef.current = null;
    }
  };

  const handleApply = async () => {
    if (!tenantId || !versionId) {
      toast.error("테넌트와 시드 버전을 선택하세요.");
      return;
    }
    if (!confirm) {
      toast.error("적용 전 확인란에 체크하세요.");
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
        toast.error(json.error || "적용 실패");
        return;
      }
      setPreview(json as TenantMasterSeedResult);
      toast.success("시드 적용이 완료되었습니다.");
      setConfirm(false);
    } catch (e) {
      if (isAbortError(e)) return;
      console.error(e);
      toast.error("적용 중 오류가 발생했습니다.");
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
        title="초기 기초자료 시드"
        description="세팅비 결제·요청 확인 후, 표준 마스터(카테고리·상품·자재·거래처 샘플)를 지정 매장에 반영합니다."
        icon={Database}
      />

      <Alert>
        <AlertTitle>유료 세팅 운영 절차</AlertTitle>
        <AlertDescription>
          실제 과금은 별도(세팅비)로 처리하고, 고객 동의·결제 확인 후에만 적용하세요. 자재 단가는 0원이며 카테고리는 시드 기준으로 덮어씁니다.
          여러 매장에 같은 시드를 한 번에 넣을 때는 &quot;매장 선택 일괄&quot;에서 체크만 하면 됩니다(조직 없이 1:1 매장만 있어도 됨). 본사·지점이 <code className="text-[11px]">tenants.organization_id</code>로 묶여 있으면 &quot;조직 일괄&quot;도 사용할 수 있습니다. 한 곳만이면 &quot;단일 매장&quot; 탭을 쓰세요.
        </AlertDescription>
      </Alert>

      <Card className="border-slate-100 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">대상 및 버전</CardTitle>
          <CardDescription>super_admin 전용 · 서비스 롤로 테넌트에 씁니다.</CardDescription>
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
                요청 취소
              </Button>
              <Button type="button" variant="secondary" size="sm" className="rounded-lg h-8" onClick={resetSeedWizard}>
                <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                결과·동의 초기화
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-snug">
              요청 취소는 이 브라우저에서 응답 대기만 멈춥니다. 서버에서 INSERT가 이미 진행 중이면 끝까지 갈 수 있어, 적용 여부는 해당
              매장에서 미리보기로 확인하는 것이 안전합니다. 처음부터 다시 고르려면 결과·동의 초기화를 누르세요(진행 중이면 먼저 취소해도
              됩니다).
            </p>
          </div>

          <div className="space-y-2">
            <Label>시드 버전 (고정 소스)</Label>
            <Select
              value={versionId === "" ? SELECT_VERSION_EMPTY : versionId}
              onValueChange={(v) => setVersionId(v === SELECT_VERSION_EMPTY ? "" : (v ?? ""))}
            >
              <SelectTrigger
                className="rounded-xl w-full min-w-0 max-w-full"
                title={typeof versionTriggerText === "string" ? versionTriggerText : undefined}
              >
                <SelectValue placeholder="버전 선택">{versionTriggerText}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={SELECT_VERSION_EMPTY}>
                  {versions.length === 0 ? "목록 로드 중…" : "시드 버전 선택"}
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
                단일 매장
              </TabsTrigger>
              <TabsTrigger value="tenants" className="flex-1 text-xs sm:text-sm">
                매장 선택 일괄
              </TabsTrigger>
              <TabsTrigger value="organization" className="flex-1 text-xs sm:text-sm">
                조직 일괄
              </TabsTrigger>
            </TabsList>

            <TabsContent value="single" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label>테넌트(매장)</Label>
                <Select
                  value={tenantId === "" ? SELECT_TENANT_EMPTY : tenantId}
                  onValueChange={(v) => setTenantId(v === SELECT_TENANT_EMPTY ? "" : (v ?? ""))}
                  disabled={loadingTenants}
                >
                  <SelectTrigger
                    className="rounded-xl w-full min-w-0 max-w-full"
                    title={typeof tenantTriggerText === "string" ? tenantTriggerText : undefined}
                  >
                    <SelectValue placeholder={loadingTenants ? "불러오는 중…" : "매장 선택"}>
                      {tenantTriggerText}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_TENANT_EMPTY}>
                      {loadingTenants ? "불러오는 중…" : "매장 선택"}
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
                  목록 새로고침
                </Button>
              </div>

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
                  미리보기
                </Button>
              </div>

              {preview && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {preview.dryRun ? "미리보기" : "적용 결과"} · {preview.seedVersion}
                  </p>
                  <ul className="space-y-1 text-slate-600">
                    <li>
                      거래처: 신규 {preview.suppliers.toInsert}건 / 스킵 {preview.suppliers.toSkip}건
                    </li>
                    <li>
                      상품: 신규 {preview.products.toInsert}건 / 스킵 {preview.products.toSkip}건
                    </li>
                    <li>
                      자재: 신규 {preview.materials.toInsert}건 / 스킵 {preview.materials.toSkip}건
                    </li>
                    <li>카테고리(상품·자재·지출): 반영 예정</li>
                  </ul>
                  {preview.auditId && (
                    <p className="text-xs font-mono text-slate-500">감사 로그 ID: {preview.auditId}</p>
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
                  세팅비·고객 요청을 확인했고, 이 매장에 시드를 적용합니다. 카테고리 덮어쓰기 및 초안 데이터 추가에 동의합니다.
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
                시드 적용 실행
              </Button>
            </TabsContent>

            <TabsContent value="tenants" className="mt-6 space-y-6">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Label className="shrink-0">매장 선택</Label>
                  <span className="text-xs text-muted-foreground">
                    {bulkSelectedTenantIds.length}곳 선택 · 최대 {TENANT_MASTER_SEED_BULK_MAX}곳
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
                    전체 선택
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg text-xs"
                    disabled={bulkSelectedTenantIds.length === 0}
                    onClick={() => setBulkSelectedTenantIds([])}
                  >
                    선택 해제
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-slate-500"
                    onClick={loadTenants}
                  >
                    목록 새로고침
                  </Button>
                </div>
                <ScrollArea className="h-[240px] rounded-xl border bg-white">
                  <div className="p-3 space-y-2">
                    {loadingTenants && (
                      <p className="text-sm text-muted-foreground">불러오는 중…</p>
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
                  조직에 묶이지 않은 단독 매장·1:1 고객도 여기서 여러 곳을 골라 동일 시드를 한 번에 미리보기·적용할 수 있습니다.
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
                  일괄 미리보기
                </Button>
              </div>

              {bulkPreview && applyTab === "tenants" && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {bulkPreview.dryRun ? "일괄 미리보기" : "일괄 적용 결과"} · {bulkPreview.seedVersion}{" "}
                    · 매장 {bulkPreview.tenantCount}곳 (성공 {bulkPreview.okCount} / 실패 {bulkPreview.failCount})
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    위 숫자는 선택한 매장 전체 집계입니다. 표는 높이가 제한되어 있어 일부 행만 보일 수 있으니, 안쪽을 스크롤하면 나머지
                    매장도 모두 확인할 수 있습니다.
                  </p>
                  <ScrollArea className="h-[min(20rem,55vh)] min-h-[200px] rounded-md border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">매장</TableHead>
                          <TableHead className="w-[200px] font-mono text-xs">ID</TableHead>
                          <TableHead>결과</TableHead>
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
                                  거래처 +{row.result.suppliers.toInsert} / 상품 +{row.result.products.toInsert} / 자재 +
                                  {row.result.materials.toInsert}
                                </span>
                              ) : (
                                <span className="text-red-700">{row.error ?? "실패"}</span>
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
                  세팅비·고객 요청을 확인했고, 위에서 선택한 매장에 동일 시드를 일괄 적용합니다. 카테고리 덮어쓰기 및 초안 데이터 추가에
                  동의합니다.
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
                선택한 매장에 시드 적용
              </Button>
            </TabsContent>

            <TabsContent value="organization" className="mt-6 space-y-6">
              <div className="space-y-2">
                <Label>조직 (본사)</Label>
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
                    <SelectValue placeholder={loadingOrgs ? "불러오는 중…" : "조직 선택"}>
                      {orgTriggerText}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_ORG_EMPTY}>
                      {loadingOrgs ? "불러오는 중…" : "조직 선택"}
                    </SelectItem>
                    {organizations
                      .filter((o) => o.tenantCount > 0)
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.name} ({o.tenantCount}곳)
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
                  조직 목록 새로고침
                </Button>
                {!loadingOrgs && organizations.length > 0 && organizations.every((o) => o.tenantCount === 0) && (
                  <p className="text-xs text-amber-800">
                    등록된 조직은 있으나, 매장(<code className="text-[11px]">tenants.organization_id</code>)이 아직 연결되지 않았습니다. Supabase에서 지점 테넌트에 조직을 먼저 연결하세요.
                  </p>
                )}
                {organizationId && !loadingOrgs && (
                  <p className="text-xs text-muted-foreground">
                    이 조직에 연결된 매장 전원에게 동일 시드가 순차 적용됩니다. (최대 200곳)
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
                  일괄 미리보기
                </Button>
              </div>

              {bulkPreview && applyTab === "organization" && (
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 space-y-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {bulkPreview.dryRun ? "일괄 미리보기" : "일괄 적용 결과"} · {bulkPreview.seedVersion}{" "}
                    · 매장 {bulkPreview.tenantCount}곳 (성공 {bulkPreview.okCount} / 실패 {bulkPreview.failCount})
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    위 숫자는 조직 소속 매장 전체 집계입니다. 표는 높이가 제한되어 있어 일부 행만 보일 수 있으니, 안쪽을 스크롤하면 나머지
                    매장도 모두 확인할 수 있습니다.
                  </p>
                  <ScrollArea className="h-[min(20rem,55vh)] min-h-[200px] rounded-md border bg-white">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[140px]">매장</TableHead>
                          <TableHead className="w-[200px] font-mono text-xs">ID</TableHead>
                          <TableHead>결과</TableHead>
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
                                  거래처 +{row.result.suppliers.toInsert} / 상품 +{row.result.products.toInsert} / 자재 +
                                  {row.result.materials.toInsert}
                                </span>
                              ) : (
                                <span className="text-red-700">{row.error ?? "실패"}</span>
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
                  세팅비·고객 요청을 확인했고, 이 조직 소속 매장 전원에 시드를 일괄 적용합니다. 카테고리 덮어쓰기 및 초안 데이터 추가에
                  동의합니다.
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
                조직 소속 전체에 시드 적용
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-slate-100 shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">시드 구성 보기 (고정 소스)</CardTitle>
          <CardDescription className="space-y-3">
            <span className="block">
              아래 표는 <strong className="font-medium text-slate-700">코드에 넣어 둔 원본</strong>과,{" "}
              <strong className="font-medium text-slate-700">매장 DB에 실제로 저장될 값</strong>을 함께 보여 줍니다. 적용 자체는 이
              카드가 아니라 위쪽 「대상 및 버전」에서 합니다.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTitle>매장에 넣으려면</AlertTitle>
            <AlertDescription className="text-sm leading-relaxed">
              위 카드에서 시드 버전을 고른 뒤,{" "}
              <strong className="font-medium text-slate-800">단일 매장</strong> ·{" "}
              <strong className="font-medium text-slate-800">매장 선택 일괄</strong> ·{" "}
              <strong className="font-medium text-slate-800">조직 일괄</strong> 중 하나로{" "}
              <strong className="font-medium text-slate-800">미리보기 → 확인 체크 → 적용</strong> 순서를 진행하세요. 이 화면은 내용
              검토용입니다.
            </AlertDescription>
          </Alert>
          {!versionId && (
            <p className="text-sm text-muted-foreground">시드 버전을 선택하면 내용이 표시됩니다.</p>
          )}
          {versionId && loadingDetail && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              시드 내용 불러오는 중…
            </div>
          )}
          {versionId && !loadingDetail && seedDetail && (
            <>
              <div className="rounded-xl border border-slate-200/80 bg-gradient-to-b from-slate-50/90 to-slate-50/40 px-4 py-3 text-sm shadow-sm">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">선택한 버전</p>
                <p className="mt-1 font-semibold text-slate-900">
                  {seedDetail.version} — {seedDetail.label}
                </p>
                <p className="mt-2 text-xs font-medium text-slate-600">반영 시 규칙</p>
                <ul className="mt-1.5 list-disc pl-5 text-slate-600 space-y-1 text-[13px] leading-snug">
                  {seedDetail.notes.map((n) => (
                    <li key={n}>{n}</li>
                  ))}
                </ul>
                <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600 border border-slate-100">
                  <span>
                    거래처 <strong className="text-slate-800">{seedDetail.counts.suppliers}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    상품 <strong className="text-slate-800">{seedDetail.counts.products}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    자재 <strong className="text-slate-800">{seedDetail.counts.materials}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    상품 카테고리(대) <strong className="text-slate-800">{seedDetail.counts.productCategoryMains}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    자재 카테고리(대) <strong className="text-slate-800">{seedDetail.counts.materialCategoryMains}</strong>
                  </span>
                  <span className="text-slate-300">·</span>
                  <span>
                    지출 카테고리(대) <strong className="text-slate-800">{seedDetail.counts.expenseCategoryMains}</strong>
                  </span>
                </div>
              </div>

              <ScrollArea className="h-[min(28rem,70vh)] min-h-[280px] rounded-xl border border-slate-200/80">
                <div className="p-4 space-y-8">
                  <div>
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">거래처</h4>
                    <p className="text-xs text-muted-foreground mb-2">이름·유형·메모는 시드 그대로 들어갑니다.</p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>이름</TableHead>
                          <TableHead>유형</TableHead>
                          <TableHead className="min-w-[200px]">메모</TableHead>
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
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">상품</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      원본 코드는 참고용입니다. 비어 있으면 적용 시 순번 코드가 붙습니다.
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>명</TableHead>
                          <TableHead>대분류</TableHead>
                          <TableHead>중분류</TableHead>
                          <TableHead className="font-mono text-[11px]">시드 원본 코드</TableHead>
                          <TableHead className="font-mono text-[11px] min-w-[9rem]">DB 저장 코드</TableHead>
                          <TableHead className="text-right">가격</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seedDetail.products.map((p, i) => (
                          <TableRow key={`${p.code ?? p.name}-${p.main_category}-${i}`}>
                            <TableCell className="font-medium">{p.name}</TableCell>
                            <TableCell>{p.main_category}</TableCell>
                            <TableCell>{p.mid_category ?? "—"}</TableCell>
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {p.code?.trim() ? p.code : "— (자동)"}
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
                    <h4 className="text-sm font-semibold text-slate-900 mb-1">자재 (단가·재고 0)</h4>
                    <p className="text-xs text-muted-foreground mb-2">
                      DB에는 아래 메모로 중복 적용을 구분합니다.
                    </p>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>명</TableHead>
                          <TableHead>대분류</TableHead>
                          <TableHead>중분류</TableHead>
                          <TableHead>단위</TableHead>
                          <TableHead className="font-mono text-[11px] min-w-[10rem]">DB 메모</TableHead>
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
                      상품·자재·지출 카테고리 트리 (JSON)
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
        감사 테이블 <code className="text-[11px]">tenant_master_seed_audit</code> 는{" "}
        <code className="text-[11px]">supabase/tenant_master_seed_audit_schema.sql</code> 실행 시 기록됩니다.
        미적용 시에도 시드는 동작합니다.
      </p>
    </div>
  );
}
