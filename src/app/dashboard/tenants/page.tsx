"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useEffect, useMemo } from "react";
import { Store, Plus, Search, Filter, ShieldCheck, Mail, Calendar as CalendarIcon, Loader2, MoreHorizontal, RefreshCw, Clock, CheckCircle2, XCircle, ChevronRight, MessageSquare, AlertCircle, Phone, MapPin, Download, History } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { createClient } from "@/utils/supabase/client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format, addMonths, addDays, isAfter } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { subscriptionMonths } from "@/lib/subscription/subscription-period";
import type { PlanId, Period } from "@/app/dashboard/subscription/plan-localized";
import Textarea from "@/components/ui/textarea";
import { SubscriptionEventTimeline } from "@/components/admin/SubscriptionEventTimeline";
import type { TenantSubscriptionEventRow } from "@/lib/subscription/subscription-events";
import { SubscriptionTenureBadge } from "@/components/admin/SubscriptionTenureBadge";
import {
  SubscriptionOverviewCards,
  ExpiringTenantsPanel,
} from "@/components/admin/ExpiringTenantsPanel";
import { NewTenantsPanel } from "@/components/admin/NewTenantsPanel";
import {
  buildSubscriptionOverview,
  matchesTenureFilter,
  resolveSubscriptionTenure,
  tenureDaysLabelKo,
  type TenureFilter,
} from "@/lib/subscription/subscription-tenure";
import { planIdLabel } from "@/lib/subscription/subscription-events";
import Link from "next/link";
import { LeaseExpiryBadge } from "@/components/admin/lease-expiry-badge";
import { getLeaseStatus, leaseExpiryNeedsAttention } from "@/lib/admin/printer-logistics/lease-status";
import {
  TENANT_COUNTRY_META,
  tenantCountryFlag,
  tenantCountryLabel,
} from "@/lib/admin/tenant-country-meta";
import { parseISO } from "date-fns";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface TenantWithProfile {
  id: string;
  name: string;
  plan: string;
  status: string;
  subscription_start: string | null;
  subscription_end: string | null;
  created_at: string;
  pos_printer_leased?: boolean | null;
  pos_printer_model?: string | null;
  pos_printer_serial?: string | null;
  pos_printer_date?: string | null;
  pos_printer_history?: { date: string; model: string; serial?: string; memo?: string }[] | null;
  label_printer_leased?: boolean | null;
  label_printer_model?: string | null;
  label_printer_serial?: string | null;
  label_printer_date?: string | null;
  label_printer_history?: { date: string; model: string; serial?: string; memo?: string }[] | null;
  // 사업자 정보 (system_settings.data 에서 로드)
  representative?: string | null;
  businessNumber?: string | null;
  contactPhone?: string | null;
  address?: string | null;
  siteWebsite?: string | null;
  storeEmail?: string | null;
  country?: string | null;
  currency?: string | null;
  profiles: {
    id: string;
    email: string;
    role: string;
  }[];
}

const PRICING = {
  free: { "1m": 0, "12m": 0 },
  ribbon_only: { "1m": 15000, "12m": 120000 },
  light: { "1m": 25000, "12m": 300000 },
  pro: { "1m": 40000, "12m": 440000 },
  pro_plus: { "1m": 60000, "12m": 660000 },
};

export default function TenantsPage() {
  const supabase = createClient();
  const { profile, isSuperAdmin, isLoading: authLoading } = useAuth();
  const [tenants, setTenants] = useState<TenantWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithProfile | null>(null);
  
  // Password Reset states
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState<{ id: string; email: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);

  // Tenant Deletion states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteTargetTenant, setDeleteTargetTenant] = useState<TenantWithProfile | null>(null);
  const [deleteConfirmationName, setDeleteConfirmationName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  // Form states
  const [newName, setNewName] = useState("");
  const [newPlan, setNewPlan] = useState("free");
  const [submitting, setSubmitting] = useState(false);

  // Subscription Edit States
  const [editPlan, setEditPlan] = useState("free");
  const [editStatus, setEditStatus] = useState("active");
  const [editEnd, setEditEnd] = useState<Date | undefined>(undefined);
  const [editPrinterLeased, setEditPrinterLeased] = useState(false);
  const [editPrinterModel, setEditPrinterModel] = useState("");
  const [editPrinterSerial, setEditPrinterSerial] = useState("");
  const [editPrinterDate, setEditPrinterDate] = useState<Date | undefined>(undefined);
  const [editPrinterMemo, setEditPrinterMemo] = useState("");
  const [editPrinterHistory, setEditPrinterHistory] = useState<{ date: string; model: string; serial?: string; memo?: string }[]>([]);

  const [editLabelPrinterLeased, setEditLabelPrinterLeased] = useState(false);
  const [editLabelPrinterModel, setEditLabelPrinterModel] = useState("");
  const [editLabelPrinterSerial, setEditLabelPrinterSerial] = useState("");
  const [editLabelPrinterDate, setEditLabelPrinterDate] = useState<Date | undefined>(undefined);
  const [editLabelPrinterMemo, setEditLabelPrinterMemo] = useState("");
  const [editLabelPrinterHistory, setEditLabelPrinterHistory] = useState<{ date: string; model: string; serial?: string; memo?: string }[]>([]);

  const [editReason, setEditReason] = useState("");
  const [editGrantKind, setEditGrantKind] = useState("manual");
  const [editGrantPeriod, setEditGrantPeriod] = useState<Period | null>(null);
  const [editMonthsGranted, setEditMonthsGranted] = useState<number | null>(null);
  const [subscriptionEvents, setSubscriptionEvents] = useState<TenantSubscriptionEventRow[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  // 필터 및 정렬 상태 훅
  const [filterPlan, setFilterPlan] = useState<string>("ALL");
  const [filterCountry, setFilterCountry] = useState<string>("ALL");
  const [filterTenure, setFilterTenure] = useState<TenureFilter>("ALL");
  const [sortBy, setSortBy] = useState<"name" | "status" | "subscription_end" | "days_left" | "created_at" | "representative" | "country">("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale));
  const fetchTenants = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/tenants?uiLocale=${encodeURIComponent(locale)}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : res.statusText);
      }
      setTenants((json.tenants as TenantWithProfile[]) || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error fetching tenants:", msg, err);
      if (isSuperAdmin) {
        toast.error(tf.f01100);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      fetchTenants();
    }
  }, [isSuperAdmin, locale]);

  const subscriptionOverview = useMemo(
    () => buildSubscriptionOverview(tenants),
    [tenants],
  );

  const countriesInData = useMemo(
    () => [...new Set(tenants.map((t) => t.country).filter(Boolean))] as string[],
    [tenants],
  );

  const byCountry = useMemo(
    () =>
      Object.entries(
        tenants.reduce(
          (acc, t) => {
            const c = t.country ?? "KR";
            acc[c] = (acc[c] ?? 0) + 1;
            return acc;
          },
          {} as Record<string, number>,
        ),
      ).sort((a, b) => b[1] - a[1]),
    [tenants],
  );

  const handleExportCsv = () => {
    const headers = [
      "매장명",
      "플랜",
      "국가",
      "통화",
      "대표",
      "사업자번호",
      "연락처",
      "이메일",
      "가입일",
      "만료일",
      "잔여일",
      "상태",
    ];
    const rows = filteredTenants.map((t) => {
      const tenure = resolveSubscriptionTenure(t);
      const adminEmail =
        t.profiles?.find((p) => p.role === "tenant_admin")?.email ?? t.profiles?.[0]?.email ?? "";
      return [
        t.name,
        planIdLabel(t.plan),
        tenantCountryLabel(t.country),
        t.currency ?? "-",
        t.representative ?? "",
        t.businessNumber ?? "",
        t.contactPhone ?? "",
        adminEmail,
        format(parseISO(t.created_at), "yyyy-MM-dd"),
        t.subscription_end ? format(parseISO(t.subscription_end), "yyyy-MM-dd") : "",
        tenureDaysLabelKo(tenure),
        tenure.isSuspended ? "정지" : tenure.isExpired ? "만료" : "정상",
      ];
    });
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tenants_${format(new Date(), "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadSubscriptionEvents = async (tenantId: string) => {
    if (!tenantId || tenantId === "undefined") {
      setSubscriptionEvents([]);
      return;
    }
    setEventsLoading(true);
    try {
      const res = await fetch(
        `/api/admin/tenants/${tenantId}/subscription-events?uiLocale=${encodeURIComponent(locale)}`,
      );
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setSubscriptionEvents((json.events as TenantSubscriptionEventRow[]) ?? []);
      } else {
        setSubscriptionEvents([]);
      }
    } catch {
      setSubscriptionEvents([]);
    } finally {
      setEventsLoading(false);
    }
  };

  const openSubscriptionDialog = (tenant: TenantWithProfile) => {
    setSelectedTenant(tenant);
    setEditPlan(tenant.plan || "free");
    setEditStatus(tenant.status || "active");
    setEditEnd(tenant.subscription_end ? new Date(tenant.subscription_end) : undefined);
    setEditReason("");
    setEditGrantKind("manual");
    setEditGrantPeriod(null);
    setEditMonthsGranted(null);
    setEditPrinterMemo("");
    setEditLabelPrinterMemo("");
    setEditPrinterLeased(!!tenant.pos_printer_leased);
    setEditPrinterModel(tenant.pos_printer_model || "");
    setEditPrinterSerial(tenant.pos_printer_serial || "");
    setEditPrinterDate(tenant.pos_printer_date ? new Date(tenant.pos_printer_date) : undefined);
    setEditPrinterHistory(tenant.pos_printer_history || []);
    setEditLabelPrinterLeased(!!tenant.label_printer_leased);
    setEditLabelPrinterModel(tenant.label_printer_model || "");
    setEditLabelPrinterSerial(tenant.label_printer_serial || "");
    setEditLabelPrinterDate(tenant.label_printer_date ? new Date(tenant.label_printer_date) : undefined);
    setEditLabelPrinterHistory(tenant.label_printer_history || []);
    setIsSubscriptionOpen(true);
    void loadSubscriptionEvents(tenant.id);
  };

  const handleCreateTenant = async () => {
    if (!newName.trim()) {
      toast.error(tf.f01369);
      return;
    }

    try {
      setSubmitting(true);
      const { data, error } = await supabase
        .from('tenants')
        .insert([{ 
          name: newName, 
          plan: newPlan,
          status: 'active',
          subscription_start: new Date().toISOString(),
          subscription_end: addDays(new Date(), 7).toISOString() // Default 7 days test
        }])
        .select()
        .single();

      if (error) throw error;

      toast.success(tf.f01500);
      setIsCreateOpen(false);
      setNewName("");
      setNewPlan("free");
      fetchTenants();
    } catch (err: any) {
      console.error("Error creating tenant:", err);
      toast.error(tf.f01109);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTenant = async () => {
    if (!deleteTargetTenant) return;
    
    // 이중 확인
    if (deleteConfirmationName !== deleteTargetTenant.name) {
      toast.error("매장 이름이 일치하지 않습니다.");
      return;
    }

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/tenants/${deleteTargetTenant.id}?uiLocale=${encodeURIComponent(locale)}`, {
        method: "DELETE",
      });
      const json = await res.json().catch(() => ({}));
      
      if (!res.ok) {
        throw new Error(typeof json?.error === "string" ? json.error : res.statusText);
      }
      
      toast.success("매장 및 연관된 데이터가 성공적으로 삭제되었습니다.");
      setIsDeleteOpen(false);
      setDeleteTargetTenant(null);
      setDeleteConfirmationName("");
      fetchTenants();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("Error deleting tenant:", msg, err);
      toast.error(msg || "매장 삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTargetUser || !newPassword.trim()) {
      toast.error("비밀번호를 입력해주세요.");
      return;
    }

    try {
      setIsResetting(true);
      const res = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: resetTargetUser.id,
          newPassword: newPassword.trim(),
          sendEmail
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "비밀번호 초기화 실패");
      }

      toast.success(`${resetTargetUser.email} 사용자의 비밀번호가 변경되었습니다.`);
      setIsResetPasswordOpen(false);
      setNewPassword("");
      setResetTargetUser(null);
    } catch (err: any) {
      console.error("Error resetting password:", err);
      toast.error(err.message || "오류가 발생했습니다.");
    } finally {
      setIsResetting(false);
    }
  };


  const grantSubscriptionDuration = (kind: "1m" | "12m" | "test") => {
    const currentEnd = selectedTenant?.subscription_end ? new Date(selectedTenant.subscription_end) : null;
    const baseDate = (currentEnd && !isAfter(new Date(), currentEnd))
      ? currentEnd
      : new Date();

    let newDate;
    if (kind === "test") {
      setEditGrantKind("test");
      setEditGrantPeriod(null);
      setEditMonthsGranted(null);
      newDate = addDays(new Date(), 7);
    } else if (kind === "12m") {
      const planId = editPlan as PlanId;
      const months = subscriptionMonths(planId, "12m");
      setEditGrantKind("12m");
      setEditGrantPeriod("12m");
      setEditMonthsGranted(months);
      newDate = addMonths(baseDate, months);
    } else {
      setEditGrantKind("1m");
      setEditGrantPeriod("1m");
      setEditMonthsGranted(1);
      newDate = addMonths(baseDate, 1);
    }
    setEditEnd(newDate);
  };

  const handleUpdateSubscription = async () => {
    if (!selectedTenant) return;
    if (!editReason.trim()) {
      toast.error("구독 변경 사유를 입력해 주세요. (감사 이력에 기록됩니다)");
      return;
    }

    try {
      setSubmitting(true);

      const subRes = await fetch(
        `/api/admin/tenants/${selectedTenant.id}/subscription?uiLocale=${encodeURIComponent(locale)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            plan: editPlan,
            status: editStatus,
            subscriptionEnd: editEnd ? editEnd.toISOString() : null,
            reason: editReason.trim(),
            grantKind: editGrantKind,
            period: editGrantPeriod,
            monthsGranted: editMonthsGranted,
            uiLocale: locale,
          }),
        },
      );
      const subJson = await subRes.json().catch(() => ({}));
      if (!subRes.ok) {
        throw new Error(typeof subJson?.error === "string" ? subJson.error : "구독 저장 실패");
      }

      // system_settings 내 settings_[id] JSONB 데이터 내에 프린터 임대 정보 병합 업데이트
      const settingsId = `settings_${selectedTenant.id}`;
      const { data: existingSettings } = await supabase
        .from("system_settings")
        .select("data")
        .eq("id", settingsId)
        .maybeSingle();

      const currentData = existingSettings?.data && typeof existingSettings.data === "object"
        ? (existingSettings.data as Record<string, unknown>)
        : {};

      // 2-1. 포스 프린터 역사 누적 계산
      let posHistory = Array.isArray(currentData.pos_printer_history)
        ? [...currentData.pos_printer_history]
        : [];
      const posDateStr = editPrinterDate ? format(editPrinterDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      const posDiff = posHistory.length === 0 || posHistory[0]?.model !== editPrinterModel || posHistory[0]?.serial !== editPrinterSerial || posHistory[0]?.date !== posDateStr;
      if (editPrinterLeased && editPrinterModel && posDiff) {
        posHistory = [
          {
            date: posDateStr,
            model: editPrinterModel,
            serial: editPrinterSerial,
            memo: editPrinterMemo || (posHistory.length === 0 ? "최초 포스프린터 무상 임대 출고" : "AS 포스프린터 교체 출고")
          },
          ...posHistory
        ];
      }

      // 2-2. 라벨 프린터 역사 누적 계산
      let labelHistory = Array.isArray(currentData.label_printer_history)
        ? [...currentData.label_printer_history]
        : [];
      const labelDateStr = editLabelPrinterDate ? format(editLabelPrinterDate, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd");
      const labelDiff = labelHistory.length === 0 || labelHistory[0]?.model !== editLabelPrinterModel || labelHistory[0]?.serial !== editLabelPrinterSerial || labelHistory[0]?.date !== labelDateStr;
      if (editLabelPrinterLeased && editLabelPrinterModel && labelDiff) {
        labelHistory = [
          {
            date: labelDateStr,
            model: editLabelPrinterModel,
            serial: editLabelPrinterSerial,
            memo: editLabelPrinterMemo || (labelHistory.length === 0 ? "최초 라벨프린터 무상 임대 출고" : "AS 라벨프린터 교체 출고")
          },
          ...labelHistory
        ];
      }

      const updatedData = {
        ...currentData,
        pos_printer_leased: editPrinterLeased,
        pos_printer_model: editPrinterLeased ? editPrinterModel : null,
        pos_printer_serial: editPrinterLeased ? editPrinterSerial : null,
        pos_printer_date: editPrinterLeased ? posDateStr : null,
        pos_printer_history: editPrinterLeased ? posHistory : null,
        label_printer_leased: editLabelPrinterLeased,
        label_printer_model: editLabelPrinterLeased ? editLabelPrinterModel : null,
        label_printer_serial: editLabelPrinterLeased ? editLabelPrinterSerial : null,
        label_printer_date: editLabelPrinterLeased ? labelDateStr : null,
        label_printer_history: editLabelPrinterLeased ? labelHistory : null,
      };

      const oldPosSerial = currentData.pos_printer_serial as string | undefined;
      const oldLabelSerial = currentData.label_printer_serial as string | undefined;

      const { error: sErr } = await supabase
        .from("system_settings")
        .upsert({
          id: settingsId,
          tenant_id: selectedTenant.id,
          data: updatedData,
          updated_at: new Date().toISOString()
        });
      if (sErr) throw sErr;

      // 3. 기기(Serial) 관리 테이블 업데이트 (printer_devices)
      // 만약 기존에 부여되었던 시리얼이 바뀌거나 해제되었다면, 기존 시리얼은 in_stock 으로 돌리고 임대 해제.
      const updateDevices = async (
        oldSerial: string | undefined, 
        newSerial: string | undefined | null, 
        isLeased: boolean
      ) => {
        // 기존 기기 해제
        if (oldSerial && oldSerial !== newSerial) {
          await supabase.from("printer_devices").update({
            status: "in_stock",
            current_tenant_id: null,
            leased_at: null
          }).eq("serial_number", oldSerial);
        }
        // 새 기기 할당
        if (isLeased && newSerial) {
          await supabase.from("printer_devices").update({
            status: "leased",
            current_tenant_id: selectedTenant.id,
            leased_at: new Date().toISOString()
          }).eq("serial_number", newSerial);
        }
      };

      await updateDevices(oldPosSerial, editPrinterLeased ? editPrinterSerial : null, editPrinterLeased);
      await updateDevices(oldLabelSerial, editLabelPrinterLeased ? editLabelPrinterSerial : null, editLabelPrinterLeased);

      toast.success(`${selectedTenant.name} ${tf.f00981}`);
      setIsSubscriptionOpen(false);
      setSelectedTenant(null);
      fetchTenants();
    } catch (err: any) {
      console.error("Error in handleUpdateSubscription:", err);
      if (err.message?.includes("status") || err.code === "PGRST204") {
        toast.error(tf.f02256);
      } else {
        toast.error(`${tf.f01533}: ${err.message || tf.f01524}`);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
    </div>
  );

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  const filteredTenants = tenants
    .filter(tenant => {
      const matchSearch = tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tenant.profiles?.some(p => p.email.toLowerCase().includes(searchTerm.toLowerCase()));
      if (!matchSearch) return false;
      if (filterPlan !== "ALL" && (tenant.plan || "free") !== filterPlan) return false;
      if (filterCountry !== "ALL" && (tenant.country ?? "KR") !== filterCountry) return false;
      const tenure = resolveSubscriptionTenure(tenant);
      if (!matchesTenureFilter(tenure, filterTenure)) return false;
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      const tenureA = resolveSubscriptionTenure(a);
      const tenureB = resolveSubscriptionTenure(b);
      if (sortBy === "name") {
        comparison = a.name.localeCompare(b.name, "ko");
      } else if (sortBy === "status") {
        const getStatusWeight = (t: TenantWithProfile) => {
          const tnr = resolveSubscriptionTenure(t);
          if (tnr.isSuspended) return 4;
          if (tnr.isExpired) return 3;
          if (tnr.isLifetime) return 2;
          return 1;
        };
        comparison = getStatusWeight(a) - getStatusWeight(b);
      } else if (sortBy === "days_left") {
        const daySort = (t: typeof tenureA) => {
          if (t.isLifetime) return 99999;
          if (t.daysLeft == null) return 99998;
          return t.daysLeft;
        };
        comparison = daySort(tenureA) - daySort(tenureB);
      } else if (sortBy === "subscription_end") {
        const dateA = a.subscription_end ? new Date(a.subscription_end).getTime() : Number.MAX_SAFE_INTEGER;
        const dateB = b.subscription_end ? new Date(b.subscription_end).getTime() : Number.MAX_SAFE_INTEGER;
        comparison = dateA - dateB;
      } else if (sortBy === "created_at") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        comparison = dateA - dateB;
      } else if (sortBy === "representative") {
        comparison = (a.representative || "").localeCompare(b.representative || "", "ko");
      } else if (sortBy === "country") {
        comparison = (a.country || "").localeCompare(b.country || "", "ko");
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

  const planLabels: Record<string, string> = {
    free: "무료 체험판",
    ribbon_only: "리본 라이센스 (리본 전용)",
    light: "플로비서 라이트",
    pro: "플로비서 프로",
    pro_plus: "플로비서 프로 플러스"
  };

  const statusLabels: Record<string, string> = {
    active: tf.f01820,
    suspended: tf.f01687
  };

  return (
    <div className="w-full max-w-[98%] 2xl:max-w-[1920px] mx-auto px-4 md:px-6 py-8 space-y-8">
      <PageHeader 
        title={tf.f01780} 
        description={tf.f01789} 
        icon={Store}
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={handleExportCsv} disabled={loading || filteredTenants.length === 0}>
            <Download className="h-4 w-4 mr-2" /> CSV보내기
          </Button>
          <Link
            href="/dashboard/admin/subscription-events"
            className={buttonVariants({ variant: "outline", className: "rounded-xl" })}
          >
            <History className="h-4 w-4 mr-2" /> 결제 이력
          </Link>
          <Button 
            className="bg-slate-900 rounded-xl px-6 font-normal shadow-lg shadow-slate-200 text-white border-0"
            onClick={() => setIsCreateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" /> {tf.f01498}
          </Button>
        </div>
      </PageHeader>

      {byCountry.length > 0 && (
        <div className="flex flex-wrap gap-2 px-1">
          {byCountry.slice(0, 8).map(([code, count]) => (
            <button
              key={code}
              type="button"
              onClick={() => setFilterCountry(filterCountry === code ? "ALL" : code)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition-colors",
                filterCountry === code
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
              )}
            >
              <span>{tenantCountryFlag(code)}</span>
              <span>{TENANT_COUNTRY_META[code]?.name ?? code}</span>
              <span className="font-bold tabular-nums">{count}</span>
            </button>
          ))}
          {filterCountry !== "ALL" && (
            <button
              type="button"
              className="text-xs text-violet-600 underline px-2"
              onClick={() => setFilterCountry("ALL")}
            >
              국가 필터 해제
            </button>
          )}
        </div>
      )}

      <SubscriptionOverviewCards
        overview={subscriptionOverview}
        activeFilter={filterTenure}
        onFilter={(key) => setFilterTenure(key as TenureFilter)}
      />

      <NewTenantsPanel 
        tenants={tenants} 
        locale={locale} 
      />

      <ExpiringTenantsPanel
        overview={subscriptionOverview}
        locale={locale}
        maxRows={8}
        compact
      />

      <Card className="border-none shadow-xl shadow-slate-100 bg-white/70 backdrop-blur-md rounded-3xl overflow-hidden">
        <CardHeader className="pb-4 pt-6 px-8 border-0">
          <Tabs value={filterTenure} onValueChange={(v) => setFilterTenure(v as TenureFilter)} className="mb-6">
            <TabsList className="bg-slate-100/50 h-12 p-1 rounded-2xl">
              <TabsTrigger value="ALL" className="rounded-xl px-5 h-full data-[state=active]:bg-white data-[state=active]:shadow-sm">전체 (All)</TabsTrigger>
              <TabsTrigger value="HEALTHY" className="rounded-xl px-5 h-full data-[state=active]:bg-white data-[state=active]:text-emerald-700 data-[state=active]:shadow-sm font-medium">이용 중 (Active)</TabsTrigger>
              <TabsTrigger value="WARNING" className="rounded-xl px-5 h-full data-[state=active]:bg-white data-[state=active]:text-amber-700 data-[state=active]:shadow-sm font-medium">만료 임박 (Expiring Soon)</TabsTrigger>
              <TabsTrigger value="EXPIRED" className="rounded-xl px-5 h-full data-[state=active]:bg-white data-[state=active]:text-slate-700 data-[state=active]:shadow-sm font-medium">만료 (Expired)</TabsTrigger>
              <TabsTrigger value="SUSPENDED" className="rounded-xl px-5 h-full data-[state=active]:bg-white data-[state=active]:text-red-700 data-[state=active]:shadow-sm font-medium">정지/휴면 (Suspended)</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex flex-col md:flex-row gap-6 justify-between items-center">
             <div className="relative w-full md:w-96">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <Input
                  type="search"
                  placeholder={tf.f01368}
                  className="pl-11 h-12 bg-slate-50/50 border-slate-100 rounded-2xl focus:ring-1 focus:ring-slate-200 transition-all font-normal focus:bg-white text-slate-900 border"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-3 flex-wrap">
                {/* 서비스플랜 필터 셀렉터 */}
                <Select value={filterPlan} onValueChange={(val) => setFilterPlan(val || 'ALL')}>
                  <SelectTrigger className="h-12 w-48 rounded-2xl bg-white border-slate-100 focus:ring-1 text-slate-700 font-normal">
                    <span>
                      {filterPlan === "ALL" ? "🌐 전체 플랜" : (planLabels[filterPlan] || filterPlan)}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-xl bg-white">
                    <SelectItem value="ALL" className="font-normal text-slate-900">🌐 전체 플랜</SelectItem>
                    <SelectItem value="free" className="font-normal text-slate-900">무료 체험판</SelectItem>
                    <SelectItem value="ribbon_only" className="font-normal text-slate-900">리본 라이센스</SelectItem>
                    <SelectItem value="light" className="font-normal text-slate-900">플로비서 라이트</SelectItem>
                    <SelectItem value="pro" className="font-normal text-slate-900">플로비서 프로</SelectItem>
                    <SelectItem value="pro_plus" className="font-normal text-slate-900">플로비서 프로 플러스</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={filterCountry} onValueChange={(val) => setFilterCountry(val ?? "ALL")}>
                  <SelectTrigger className="h-12 w-40 rounded-2xl bg-white border-slate-100 focus:ring-1 text-slate-700 font-normal">
                    <span>
                      {filterCountry === "ALL"
                        ? "🌍 전체 국가"
                        : `${tenantCountryFlag(filterCountry)} ${tenantCountryLabel(filterCountry)}`}
                    </span>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-xl bg-white max-h-64">
                    <SelectItem value="ALL">🌍 전체 국가</SelectItem>
                    {countriesInData.map((c) => (
                      <SelectItem key={c} value={c}>
                        {tenantCountryFlag(c)} {tenantCountryLabel(c)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button variant="ghost" className="h-12 w-12 rounded-2xl border border-slate-100" onClick={fetchTenants} disabled={loading}>
                  <RefreshCw className={cn("h-5 w-5 text-slate-400", loading && "animate-spin")} />
                </Button>
              </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 border-0">
          <div className="border-t border-slate-50">
            <Table>
              <TableHeader className="bg-slate-50/30">
                <TableRow className="hover:bg-transparent border-slate-50 border-b-0 select-none">
                  {/* 상호명 정렬 토글 */}
                  <TableHead 
                    className="px-8 font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/50 transition-colors"
                    onClick={() => {
                      if (sortBy === "name") {
                        setSortOrder(o => o === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("name");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {tf.f02213}
                      <span className="text-[10px] text-slate-400">
                        {sortBy === "name" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/50 transition-colors"
                    onClick={() => {
                      if (sortBy === "country") {
                        setSortOrder(o => o === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("country");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      국가
                      <span className="text-[10px] text-slate-400">
                        {sortBy === "country" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    </div>
                  </TableHead>
                  <TableHead className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px]">{tf.f01401}</TableHead>
                  <TableHead className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px]">프린터 임대</TableHead>
                  <TableHead 
                    className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/50 transition-colors"
                    onClick={() => {
                      if (sortBy === "representative") {
                        setSortOrder(o => o === "asc" ? "desc" : "asc");
                      } else {
                        setSortBy("representative");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {tf.f01136}
                      <span className="text-[10px] text-slate-400">
                        {sortBy === "representative" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/50"
                    onClick={() => {
                      if (sortBy === "created_at") {
                        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                      } else {
                        setSortBy("created_at");
                        setSortOrder("desc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      가입일
                      <span className="text-[10px] text-slate-400">
                        {sortBy === "created_at" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    </div>
                  </TableHead>
                  {/* 잔여일 정렬 */}
                  <TableHead
                    className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/50"
                    onClick={() => {
                      if (sortBy === "days_left") {
                        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                      } else {
                        setSortBy("days_left");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      잔여일
                      <span className="text-[10px] text-slate-400">
                        {sortBy === "days_left" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    </div>
                  </TableHead>
                  <TableHead
                    className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px] cursor-pointer hover:bg-slate-100/50"
                    onClick={() => {
                      if (sortBy === "subscription_end") {
                        setSortOrder((o) => (o === "asc" ? "desc" : "asc"));
                      } else {
                        setSortBy("subscription_end");
                        setSortOrder("asc");
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      만료일
                      <span className="text-[10px] text-slate-400">
                        {sortBy === "subscription_end" ? (sortOrder === "asc" ? "▲" : "▼") : "⇅"}
                      </span>
                    </div>
                  </TableHead>
                  <TableHead className="font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px]">구독 상태</TableHead>
                  <TableHead className="sticky right-0 bg-slate-50/90 backdrop-blur-sm z-10 text-right px-4 font-medium text-slate-600 py-5 uppercase tracking-wider text-[11px]">{tf.f01530}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={10} className="h-20 text-center">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-200 border-0" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredTenants.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="h-64 text-center border-0">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <Store className="h-12 w-12 mb-3 opacity-10" />
                        <p className="font-normal text-slate-400">{tf.f01122}</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredTenants.map((tenant) => {
                  const tenure = resolveSubscriptionTenure(tenant);
                  return (
                  <TableRow 
                    key={tenant.id} 
                    className={cn(
                      "group hover:bg-slate-50/50 transition-colors border-slate-50 border-0 cursor-pointer",
                      tenure.bucket === "critical" && "bg-red-50/40",
                      tenure.bucket === "warning" && "bg-amber-50/30",
                      tenure.isExpired && "bg-slate-50 opacity-60 grayscale-[0.2]",
                    )}
                    onClick={() => openSubscriptionDialog(tenant)}
                  >
                    <TableCell className="px-8 py-5 border-0">
                       <div className="flex flex-col">
                         <div className="flex items-center gap-2">
                           <span className={cn("font-normal leading-tight text-base font-semibold", tenure.isExpired ? "text-slate-500" : "text-slate-900")}>{tenant.name}</span>
                           {tenure.isExpired && (
                             <span className="text-[10px] bg-slate-200/80 text-slate-500 px-1.5 py-0.5 rounded font-medium">만료됨</span>
                           )}
                         </div>
                         {tenant.representative && (
                           <span className="text-[10px] text-slate-500 mt-0.5">대표 {tenant.representative}</span>
                         )}
                         {tenant.businessNumber && (
                           <span className="text-[10px] font-mono text-slate-400 mt-0.5">사업자 {tenant.businessNumber}</span>
                         )}
                         {!tenant.representative && !tenant.businessNumber && (
                           <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase">{tenant.id.substring(0, 8)}</span>
                         )}
                       </div>
                    </TableCell>
                    <TableCell className="border-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-base">{tenantCountryFlag(tenant.country)}</span>
                        <span className="text-xs text-slate-600">{tenantCountryLabel(tenant.country)}</span>
                        {tenant.currency && (
                          <span className="text-[10px] font-mono text-slate-400">{tenant.currency}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="border-0" onClick={(e) => e.stopPropagation()}>
                      <Badge className={cn(
                        "rounded-lg font-normal border-0 px-2.5 py-1 text-xs font-bold",
                        tenant.plan === 'pro_plus' ? "bg-emerald-100 text-emerald-800" :
                        tenant.plan === 'pro' ? "bg-blue-100 text-blue-800" : 
                        tenant.plan === 'light' ? "bg-teal-100 text-teal-800" :
                        tenant.plan === 'ribbon_only' ? "bg-purple-100 text-purple-800" :
                        "bg-slate-100 text-slate-500"
                      )}>
                        {planLabels[tenant.plan] || 'FREE'}
                      </Badge>
                    </TableCell>
                    <TableCell className="border-0">
                      <div className="flex flex-col gap-2 items-start">
                        {tenant.pos_printer_leased ? (
                          <div className="flex flex-col gap-0.5 items-start">
                            <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold text-[10px] px-1.5 py-0.5 rounded-lg hover:bg-emerald-50">
                              📠 {tenant.pos_printer_model || "포스 임대중"}
                            </Badge>
                            {tenant.pos_printer_date && (
                              <span className="text-[9px] text-slate-400 font-mono font-normal flex items-center gap-1 ml-1">
                                출고 {tenant.pos_printer_date}
                              </span>
                            )}
                            <LeaseExpiryBadge
                              leaseEnd={tenant.subscription_end ? String(tenant.subscription_end).slice(0, 10) : null}
                              leased
                              compact
                            />
                          </div>
                        ) : null}

                        {tenant.label_printer_leased ? (
                          <div className="flex flex-col gap-0.5 items-start">
                            <Badge className="bg-purple-50 text-purple-700 border border-purple-100 font-bold text-[10px] px-1.5 py-0.5 rounded-lg hover:bg-purple-50">
                              🏷️ {tenant.label_printer_model || "라벨 임대중"}
                            </Badge>
                            {tenant.label_printer_date && (
                              <span className="text-[9px] text-slate-400 font-mono font-normal flex items-center gap-1 ml-1">
                                출고 {tenant.label_printer_date}
                              </span>
                            )}
                            <LeaseExpiryBadge
                              leaseEnd={tenant.subscription_end ? String(tenant.subscription_end).slice(0, 10) : null}
                              leased
                              compact
                            />
                          </div>
                        ) : null}

                        {(tenant.pos_printer_leased || tenant.label_printer_leased) &&
                          leaseExpiryNeedsAttention(
                            getLeaseStatus(
                              tenant.subscription_end ? String(tenant.subscription_end).slice(0, 10) : null,
                              false,
                              true,
                            ),
                          ) && (
                            <Link
                              href="/dashboard/admin/printer-logistics"
                              className="text-[9px] text-emerald-700 underline font-medium ml-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              출고 · 반납 화면 →
                            </Link>
                          )}

                        {!tenant.pos_printer_leased && !tenant.label_printer_leased && (
                          <span className="text-slate-300">-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="border-0">
                       <div className="flex flex-col gap-1">
                         <div className="flex items-center gap-2">
                           <Mail className="h-3.5 w-3.5 opacity-20 shrink-0" />
                           <span className="text-slate-700 font-normal text-sm">{tenant.profiles?.find(p => p.role === 'tenant_admin')?.email || tenant.profiles?.[0]?.email || tf.f00224}</span>
                         </div>
                         {tenant.contactPhone && (
                           <div className="flex items-center gap-2">
                             <Phone className="h-3 w-3 opacity-20 shrink-0" />
                             <span className="text-[11px] text-slate-500">{tenant.contactPhone}</span>
                           </div>
                         )}
                         {tenant.address && (
                           <div className="flex items-center gap-2">
                             <MapPin className="h-3 w-3 opacity-20 shrink-0" />
                             <span className="text-[11px] text-slate-400 truncate max-w-[200px]" title={tenant.address}>{tenant.address}</span>
                           </div>
                         )}
                       </div>
                    </TableCell>
                    <TableCell className="border-0 text-sm text-slate-600">
                      {tenant.created_at ? format(new Date(tenant.created_at), "yyyy.MM.dd", { locale: dfLoc }) : "-"}
                    </TableCell>
                    <TableCell className="border-0">
                      <span className="text-lg font-bold tabular-nums text-slate-800">
                        {tenureDaysLabelKo(tenure)}
                      </span>
                    </TableCell>
                    <TableCell className="border-0 text-sm text-slate-600">
                      {tenure.endDate && !tenure.isLifetime
                        ? format(tenure.endDate, "yyyy.MM.dd", { locale: dfLoc })
                        : tenure.isLifetime
                          ? "평생"
                          : "-"}
                    </TableCell>
                    <TableCell className="border-0">
                      <SubscriptionTenureBadge tenure={tenure} locale={locale} />
                    </TableCell>
                    <TableCell className="sticky right-0 bg-white/90 backdrop-blur-sm z-10 text-right px-4 border-0" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "h-9 w-9 rounded-xl hover:bg-slate-100 transition-colors border-0"
                        )}>
                          <MoreHorizontal className="h-4 w-4 text-slate-400" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-xl border-slate-100 p-1">
                          <DropdownMenuItem className="font-normal text-sm p-2.5 cursor-pointer text-slate-700">
                            {tf.f00314}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="font-normal text-sm p-2.5 cursor-pointer text-slate-700"
                            onClick={() => openSubscriptionDialog(tenant)}
                          >
                            {tf.f00975}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="font-normal text-sm p-2.5 cursor-pointer text-indigo-600 font-bold hover:text-indigo-700"
                            onClick={() => window.dispatchEvent(new CustomEvent('open-chat', { detail: { partnerId: tenant.id, partnerName: tenant.name } }))}
                          >
                            <MessageSquare className="h-4 w-4 mr-2" />
                            {tf.f01511}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="font-normal text-sm p-2.5 cursor-pointer text-red-600 font-bold hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setDeleteTargetTenant(tenant);
                              setDeleteConfirmationName("");
                              setIsDeleteOpen(true);
                            }}
                          >
                            <AlertCircle className="h-4 w-4 mr-2" />
                            매장 및 데이터 영구 삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* 신규 등록 다이얼로그 */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8 border-none shadow-2xl bg-white border-0">
          <DialogHeader className="border-0">
            <DialogTitle className="font-semibold text-xl text-slate-900">{tf.f01499}</DialogTitle>
            <DialogDescription className="font-normal pb-4 text-slate-500 border-0">
              {tf.f01448}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name" className="font-normal text-slate-600 text-xs ml-1 border-0">{tf.f02213}</Label>
              <Input
                id="name"
                placeholder={tf.f01585}
                className="rounded-2xl h-12 font-normal bg-slate-50/50 border-slate-100 text-slate-900 focus:bg-white border"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-3 sm:justify-end mt-4 border-0">
            <Button variant="ghost" className="rounded-2xl px-6 text-slate-500 border-0" onClick={() => setIsCreateOpen(false)}>{tf.f00702}</Button>
            <Button 
              className="bg-slate-900 rounded-2xl px-8 font-normal shadow-lg shadow-slate-200 text-white border-0" 
              onClick={handleCreateTenant}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin border-0" />}
              {tf.f00844}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSubscriptionOpen} onOpenChange={setIsSubscriptionOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-8 border-none shadow-2xl bg-white max-h-[90vh] overflow-y-auto border-0">
          <DialogHeader className="border-0">
            <DialogTitle className="font-semibold text-xl text-slate-900">{tf.f00979}</DialogTitle>
            <DialogDescription className="font-normal pb-4 text-slate-500 border-0">
              <span className="text-slate-900 font-semibold">{selectedTenant?.name}</span>{tf.f01058}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* 사업자 정보 카드 */}
            {(selectedTenant?.representative || selectedTenant?.businessNumber || selectedTenant?.contactPhone || selectedTenant?.address || selectedTenant?.storeEmail) && (
              <div className="rounded-2xl bg-slate-50 border border-slate-100 p-4 space-y-2.5">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-3">🏢 사업자 정보</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {selectedTenant?.representative && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">대표자</span>
                      <span className="text-sm font-semibold text-slate-800">{selectedTenant.representative}</span>
                    </div>
                  )}
                  {selectedTenant?.businessNumber && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">사업자등록번호</span>
                      <span className="text-sm font-mono font-semibold text-slate-800">{selectedTenant.businessNumber}</span>
                    </div>
                  )}
                  {selectedTenant?.contactPhone && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">연락처</span>
                      <span className="text-sm font-semibold text-slate-800">{selectedTenant.contactPhone}</span>
                    </div>
                  )}
                  {selectedTenant?.storeEmail && (
                    <div className="flex flex-col gap-0.5">
                      <span className="text-[10px] text-slate-400 font-medium">매장 이메일</span>
                      <span className="text-sm font-semibold text-slate-800">{selectedTenant.storeEmail}</span>
                    </div>
                  )}
                </div>
                {selectedTenant?.address && (
                  <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium">주소</span>
                    <span className="text-sm text-slate-700">{selectedTenant.address}</span>
                  </div>
                )}
                {selectedTenant?.siteWebsite && (
                  <div className="flex flex-col gap-0.5 pt-1 border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-medium">홈페이지</span>
                    <a
                      href={selectedTenant.siteWebsite}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {selectedTenant.siteWebsite}
                    </a>
                  </div>
                )}
              </div>
            )}

            {/* 사용자 목록 및 비밀번호 초기화 */}
            {selectedTenant?.profiles && selectedTenant.profiles.length > 0 && (
              <div className="rounded-2xl bg-white border border-slate-100 p-4 space-y-3">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">👤 사용자 목록</p>
                <div className="space-y-2">
                  {selectedTenant.profiles.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-800">{p.email}</span>
                        <span className="text-[10px] text-slate-400">{p.role === 'tenant_admin' ? '관리자' : '일반 사용자'}</span>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 rounded-lg text-xs font-medium text-slate-600 bg-white"
                        onClick={() => {
                          setResetTargetUser({ id: p.id, email: p.email });
                          setNewPassword(Math.random().toString(36).slice(-6) + Math.floor(Math.random() * 10) + "!");
                          setIsResetPasswordOpen(true);
                        }}
                      >
                        비밀번호 초기화
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label className="font-normal text-slate-600 text-xs ml-1 border-0">{tf.f01402}</Label>
              <Select value={editPlan} onValueChange={(val) => setEditPlan(val || 'free')}>
                <SelectTrigger className="rounded-2xl h-12 font-normal bg-slate-50/50 border-slate-100 text-slate-900 focus:bg-white border">
                  <SelectValue placeholder={tf.f02144}>{planLabels[editPlan]}</SelectValue>
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-0 shadow-xl bg-white">
                  <SelectItem value="free" className="font-normal text-slate-900">무료 체험판</SelectItem>
                  <SelectItem value="ribbon_only" className="font-normal text-slate-900">리본 라이센스 (리본 전용)</SelectItem>
                  <SelectItem value="light" className="font-normal text-slate-900">플로비서 라이트</SelectItem>
                  <SelectItem value="pro" className="font-normal text-slate-900">플로비서 프로</SelectItem>
                  <SelectItem value="pro_plus" className="font-normal text-slate-900">플로비서 프로 플러스</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-3">
               <Label className="font-normal text-slate-600 text-xs ml-1 border-0">{tf.f01000}</Label>
               <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" className="h-10 rounded-xl font-normal text-xs justify-start px-3 text-slate-700 border-slate-200 border" onClick={() => grantSubscriptionDuration("1m")}>
                    {tf.f00824} ({PRICING[editPlan as keyof typeof PRICING]?.["1m"]?.toLocaleString()}{tf.f00487})
                  </Button>
                  <Button variant="outline" className="h-10 rounded-xl font-normal text-xs justify-start px-3 text-slate-700 border-slate-200 border" onClick={() => grantSubscriptionDuration("12m")}>
                    {tf.f00823} ({PRICING[editPlan as keyof typeof PRICING]?.["12m"]?.toLocaleString()}{tf.f00487})
                  </Button>
               </div>
                <div className="flex flex-wrap gap-2 mt-1">
                  <Button variant="outline" className="flex-1 min-w-[140px] h-10 rounded-xl font-normal text-xs border-blue-200 text-blue-700 bg-blue-50/30 hover:bg-blue-50 border" onClick={() => grantSubscriptionDuration("test")}>
                    {tf.f00843}
                  </Button>
                  {isSuperAdmin && (
                    <Button variant="outline" className="flex-1 h-10 rounded-xl font-normal text-xs border-amber-200 text-amber-700 bg-amber-50/30 hover:bg-amber-50 border" onClick={() => { setEditGrantKind("clear"); setEditGrantPeriod(null); setEditMonthsGranted(null); setEditEnd(undefined); }}>
                      {tf.f00982}
                    </Button>
                  )}
                  {isSuperAdmin && (
                    <Button variant="outline" className="flex-1 h-10 rounded-xl font-normal text-xs border-emerald-200 text-emerald-700 bg-emerald-50/30 hover:bg-emerald-50 border" onClick={() => { setEditGrantKind("lifetime"); setEditGrantPeriod(null); setEditMonthsGranted(null); setEditEnd(new Date(2099, 11, 31, 23, 59, 59)); }}>
                      {tf.f01209}
                    </Button>
                  )}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4 items-start border-0">
              <div className="grid gap-2 border-0">
                <Label className="font-normal text-slate-600 text-xs ml-1 border-0">{tf.f00932}</Label>
                <Select value={editStatus} onValueChange={(val) => setEditStatus(val || 'active')}>
                  <SelectTrigger className="rounded-2xl h-12 font-normal bg-slate-50/50 border-slate-100 text-slate-900 focus:bg-white border">
                    <SelectValue placeholder={tf.f01345}>{statusLabels[editStatus]}</SelectValue>
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-0 shadow-xl bg-white">
                    <SelectItem value="active" className="font-normal text-slate-900 border-0">{tf.f01820}</SelectItem>
                    <SelectItem value="suspended" className="font-normal text-rose-600 border-0">{tf.f01687}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 border-0">
                <Label className="font-normal text-slate-600 text-xs ml-1 border-0">{tf.f02022}</Label>
                <div className="relative">
                  <Popover>
                    <PopoverTrigger className={cn(
                        buttonVariants({ variant: "outline" }),
                        "w-full rounded-2xl h-12 justify-start text-left bg-slate-50/50 border-slate-100 border px-4",
                        editEnd ? "text-slate-900 font-semibold" : "text-slate-400 font-normal"
                      )}>
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {editEnd ? format(editEnd, "PPP", { locale: dfLoc }) : <span className="text-red-500 font-semibold">{tf.f01144}</span>}
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-2xl border-0 shadow-2xl bg-white" align="start">
                      <Calendar
                        mode="single"
                        selected={editEnd}
                        onSelect={(d) => {
                          setEditEnd(d);
                          setEditGrantKind("manual");
                          setEditGrantPeriod(null);
                          setEditMonthsGranted(null);
                        }}
                        initialFocus
                        locale={dfLoc}
                        className="rounded-2xl border-0"
                      />
                    </PopoverContent>
                  </Popover>
                  {editEnd && (
                    <button 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 transition-colors"
                      onClick={() => setEditEnd(undefined)}
                      type="button"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            {/* 포스 프린터 무상 임대 설정 */}
            <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    📠 포스 프린터 무상 임대
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">장비를 매장에 출고 및 임대한 경우 활성화합니다.</p>
                </div>
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  checked={editPrinterLeased}
                  onChange={(e) => setEditPrinterLeased(e.target.checked)}
                />
              </div>
              {editPrinterLeased && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-600 font-medium">임대 기기 기종명</Label>
                      <Input 
                        placeholder="예: Xprint-250, PP-8000 등 입력"
                        className="h-10 rounded-xl bg-white border-slate-200 text-xs"
                        value={editPrinterModel}
                        onChange={(e) => setEditPrinterModel(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-600 font-medium flex items-center gap-1">
                        시리얼 번호 <span className="text-[9px] text-blue-500 font-normal ml-1">(스캐너 가능)</span>
                      </Label>
                      <Input 
                        placeholder="바코드 스캐너로 입력"
                        className="h-10 rounded-xl bg-white border-blue-200 focus-visible:ring-blue-500 text-xs font-mono"
                        value={editPrinterSerial}
                        onChange={(e) => setEditPrinterSerial(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-slate-600 font-medium">출고/임대 일자</Label>
                    <Popover>
                      <PopoverTrigger className={cn(
                          buttonVariants({ variant: "outline" }),
                          "w-full rounded-xl h-10 justify-start text-left bg-white border-slate-200 border px-3 text-xs font-normal text-slate-900"
                        )}>
                          <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
                          {editPrinterDate ? format(editPrinterDate, "yyyy-MM-dd") : "날짜 선택"}
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0 rounded-2xl border-0 shadow-2xl bg-white" align="start">
                        <Calendar
                          mode="single"
                          selected={editPrinterDate}
                          onSelect={setEditPrinterDate}
                          initialFocus
                          locale={dfLoc}
                          className="rounded-2xl border-0"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-slate-600 font-medium">기기 교환 사유 / AS 특이사항 메모 (기록용)</Label>
                    <Input 
                      placeholder="예: 자연고장 장비 교체, 초기 배송 등 메모 입력"
                      className="h-10 rounded-xl bg-white border-slate-200 text-xs"
                      value={editPrinterMemo}
                      onChange={(e) => setEditPrinterMemo(e.target.value)}
                    />
                  </div>

                  {/* 과거 기기 임대/AS 히스토리 타임라인 */}
                  {editPrinterHistory.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <Label className="text-[11px] text-slate-700 font-semibold block">📜 기기 임대 및 AS 교환 이력</Label>
                      <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                        {editPrinterHistory.map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-white border border-slate-100 rounded-xl flex flex-col gap-1 text-[11px]">
                            <div className="flex flex-col text-slate-400">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700">📠 {item.model}</span>
                                <span className="font-mono text-[10px]">{item.date}</span>
                              </div>
                              {item.serial && <span className="text-[10px] font-mono text-slate-500">SN: {item.serial}</span>}
                            </div>
                            {item.memo && (
                              <p className="text-slate-500 mt-0.5 leading-normal">{item.memo}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* 라벨 프린터 무상 임대 설정 */}
            <div className="p-4 rounded-2xl bg-slate-50/50 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-slate-900 flex items-center gap-1.5">
                    🏷️ 라벨 프린터 무상 임대
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">라벨/리본 프린터를 매장에 임대한 경우 활성화합니다.</p>
                </div>
                <input 
                  type="checkbox"
                  className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  checked={editLabelPrinterLeased}
                  onChange={(e) => setEditLabelPrinterLeased(e.target.checked)}
                />
              </div>
              {editLabelPrinterLeased && (
                <div className="space-y-4 animate-in fade-in duration-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-600 font-medium">임대 기기 기종명</Label>
                      <Input 
                        placeholder="예: Lprint-100 등 입력"
                        className="h-10 rounded-xl bg-white border-slate-200 text-xs"
                        value={editLabelPrinterModel}
                        onChange={(e) => setEditLabelPrinterModel(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[11px] text-slate-600 font-medium">출고/임대 일자</Label>
                      <Popover>
                        <PopoverTrigger className={cn(
                            buttonVariants({ variant: "outline" }),
                            "w-full rounded-xl h-10 justify-start text-left bg-white border-slate-200 border px-3 text-xs font-normal text-slate-900"
                          )}>
                            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-400" />
                            {editLabelPrinterDate ? format(editLabelPrinterDate, "yyyy-MM-dd") : "날짜 선택"}
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-0 shadow-2xl bg-white" align="start">
                          <Calendar
                            mode="single"
                            selected={editLabelPrinterDate}
                            onSelect={setEditLabelPrinterDate}
                            initialFocus
                            locale={dfLoc}
                            className="rounded-2xl border-0"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[11px] text-slate-600 font-medium">기기 교환 사유 / AS 특이사항 메모 (기록용)</Label>
                    <Input 
                      placeholder="예: 자연고장 장비 교체 등 메모 입력"
                      className="h-10 rounded-xl bg-white border-slate-200 text-xs"
                      value={editLabelPrinterMemo}
                      onChange={(e) => setEditLabelPrinterMemo(e.target.value)}
                    />
                  </div>

                  {/* 과거 라벨 기기 임대/AS 히스토리 타임라인 */}
                  {editLabelPrinterHistory.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <Label className="text-[11px] text-slate-700 font-semibold block">📜 라벨 기기 임대 및 AS 교환 이력</Label>
                      <div className="max-h-36 overflow-y-auto space-y-2 pr-1">
                        {editLabelPrinterHistory.map((item, idx) => (
                          <div key={idx} className="p-2.5 bg-white border border-slate-100 rounded-xl flex flex-col gap-1 text-[11px]">
                            <div className="flex flex-col text-slate-400">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700">🏷️ {item.model}</span>
                                <span className="font-mono text-[10px]">{item.date}</span>
                              </div>
                              {item.serial && <span className="text-[10px] font-mono text-slate-500">SN: {item.serial}</span>}
                            </div>
                            {item.memo && (
                              <p className="text-slate-500 mt-0.5 leading-normal">{item.memo}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="grid gap-2 pt-2 border-t border-slate-100">
              <Label className="font-normal text-slate-600 text-xs ml-1">
                변경 사유 <span className="text-red-500">*</span>
              </Label>
              <Textarea
                placeholder="예: 성수기 연간 선결제 대행, CS 보상 1개월 연장, 테스트 기간 부여 등"
                className="min-h-[72px] rounded-2xl bg-slate-50/50 border-slate-100 text-sm resize-none"
                value={editReason}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditReason(e.target.value)}
              />
              <p className="text-[10px] text-slate-400 ml-1">
                누가·언제·어떤 사유로 부여했는지 감사 이력에 저장됩니다.
              </p>
            </div>

            <div className="grid gap-2">
              <Label className="font-normal text-slate-600 text-xs ml-1 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                구독·결제 이력
              </Label>
              <SubscriptionEventTimeline
                events={subscriptionEvents}
                loading={eventsLoading}
                locale={locale}
              />
              {selectedTenant && (
                <Link
                  href={`/dashboard/admin/subscription-events?tenantId=${selectedTenant.id}`}
                  className="text-[11px] text-violet-600 hover:underline inline-flex items-center gap-1"
                >
                  <History className="h-3 w-3" />
                  통합 결제 이력에서 보기
                </Link>
              )}
            </div>

            {editEnd ? (
              <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 mt-2 flex items-center justify-between">
                <span className="text-emerald-700 text-xs font-medium">{tf.f01534}</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-900 font-bold text-sm">
                    {editEnd.getFullYear() >= 2099
                      ? tf.f01209
                      : format(editEnd, "P", { locale: dfLoc })}
                  </span>
                  <div className="h-6 w-6 rounded-full bg-emerald-100 flex items-center justify-center">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100 mt-2 flex items-center justify-between">
                <span className="text-red-600 text-xs font-medium">{tf.f00983}</span>
                <div className="flex items-center gap-2 font-bold text-sm text-red-700">
                  <span>{tf.f02183}</span>
                  <AlertCircle className="h-4 w-4" />
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-3 sm:justify-end mt-4 border-0">
            <Button variant="ghost" className="rounded-2xl px-6 text-slate-500 border-0" onClick={() => setIsSubscriptionOpen(false)}>{tf.f00702}</Button>
            <Button 
              className="bg-slate-900 rounded-2xl px-8 font-normal shadow-xl shadow-slate-300 text-white border-0" 
              onClick={handleUpdateSubscription}
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin border-0" />}
              {tf.f00980}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 비밀번호 초기화 다이얼로그 */}
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8 border-none shadow-2xl bg-white border-0">
          <DialogHeader className="border-0">
            <DialogTitle className="font-semibold text-xl text-slate-900">비밀번호 초기화</DialogTitle>
            <DialogDescription className="font-normal pb-4 text-slate-500 border-0">
              <span className="font-semibold text-slate-900">{resetTargetUser?.email}</span> 사용자의 임시 비밀번호를 설정합니다. 변경 후 사용자에게 이 비밀번호를 전달해 주세요.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-2">
            <div className="grid gap-2">
              <Label htmlFor="new-password" className="font-normal text-slate-600 text-xs ml-1 border-0">새 임시 비밀번호</Label>
              <Input
                id="new-password"
                type="text"
                placeholder="예: 123456"
                className="rounded-2xl h-12 font-normal bg-slate-50/50 border-slate-100 text-slate-900 focus:bg-white border"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="grid gap-2 mt-4">
              <Label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-800">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                사용자 이메일({resetTargetUser?.email})로 임시 비밀번호 전송
              </Label>
              <p className="text-[11px] text-slate-500 ml-6">체크 시, 위 비밀번호가 사용자 메일로 자동 발송됩니다.</p>
            </div>
          </div>
          <DialogFooter className="gap-3 sm:justify-end mt-4 border-0">
            <Button variant="ghost" className="rounded-2xl px-6 text-slate-500 border-0" onClick={() => setIsResetPasswordOpen(false)}>취소</Button>
            <Button 
              className="bg-slate-900 rounded-2xl px-8 font-normal shadow-lg shadow-slate-200 text-white border-0" 
              onClick={handleResetPassword}
              disabled={isResetting || !newPassword.trim()}
            >
              {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin border-0" />}
              비밀번호 변경
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 매장 영구 삭제 다이얼로그 */}
      <Dialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <DialogContent className="sm:max-w-md rounded-3xl p-8 border-none shadow-2xl bg-white border-0">
          <DialogHeader className="border-0">
            <DialogTitle className="font-semibold text-xl text-red-600">매장 및 데이터 영구 삭제</DialogTitle>
            <DialogDescription className="font-normal pb-4 text-slate-600 border-0">
              <span className="font-bold text-slate-900">{deleteTargetTenant?.name}</span> 매장을 삭제합니다. 이 작업은 되돌릴 수 없으며, 매장과 연결된 <span className="font-bold text-red-500">모든 사용자 및 데이터가 함께 영구 삭제</span>됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-2">
            <div className="grid gap-2">
              <Label htmlFor="confirm-delete-name" className="font-normal text-slate-600 text-xs ml-1 border-0">
                삭제를 확인하려면 <span className="font-bold text-slate-900">"{deleteTargetTenant?.name}"</span> 를 정확히 입력하세요.
              </Label>
              <Input
                id="confirm-delete-name"
                type="text"
                placeholder={deleteTargetTenant?.name}
                className="rounded-2xl h-12 font-normal bg-slate-50/50 border-slate-100 text-slate-900 focus:bg-white border"
                value={deleteConfirmationName}
                onChange={(e) => setDeleteConfirmationName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-3 sm:justify-end mt-4 border-0">
            <Button variant="ghost" className="rounded-2xl px-6 text-slate-500 border-0" onClick={() => {
              setIsDeleteOpen(false);
              setDeleteTargetTenant(null);
              setDeleteConfirmationName("");
            }}>
              취소
            </Button>
            <Button 
              variant="destructive"
              className="rounded-2xl px-8 font-normal shadow-lg shadow-red-200 border-0" 
              onClick={handleDeleteTenant}
              disabled={isDeleting || deleteConfirmationName !== deleteTargetTenant?.name}
            >
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin border-0" />}
              영구 삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
