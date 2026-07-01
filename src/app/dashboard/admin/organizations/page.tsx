"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Loader2,
  Plus,
  Link2,
  Unlink,
  UserPlus,
  Trash2,
  ShieldAlert,
  Edit2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

type Org = { id: string; name: string; created_at: string; hqTenantId: string | null };
type TenantRow = {
  id: string;
  name: string;
  organization_id: string | null;
  plan: string | null;
  adminEmails: string[];
};

export default function OrganizationsAdminPage() {
  const supabase = createClient();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const phMemberEmail = pickUiText(
    baseLocale,
    "user@example.com",
    "user@example.com",
    "email@congty.com",
    "user@example.com",
    "user@example.com",
    "usuario@ejemplo.com",
    "usuario@exemplo.com",
    "utilisateur@exemple.fr",
    "nutzer@beispiel.de",
    "user@example.com",
  );
  
  const [loading, setLoading] = useState(true);
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkOrgId, setLinkOrgId] = useState<string | null>(null);
  const [linkTenantId, setLinkTenantId] = useState<string>("");
  const [memberOpen, setMemberOpen] = useState(false);
  const [memberOrgId, setMemberOrgId] = useState<string | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [membersByOrg, setMembersByOrg] = useState<Record<string, { user_id: string; email: string }[]>>(
    {}
  );

  // 이중 경고 다이얼로그용 상태
  const [removeMemOpen, setRemoveMemOpen] = useState(false);
  const [removeMemData, setRemoveMemData] = useState<{ orgId: string; userId: string; email: string } | null>(null);
  const [unlinkOpen, setUnlinkOpen] = useState(false);
  const [unlinkData, setUnlinkData] = useState<{ tenantId: string; tenantName: string } | null>(null);
  
  // 조직 자체 삭제 확인 다이얼로그용 상태
  const [deleteOrgOpen, setDeleteOrgOpen] = useState(false);
  const [deleteOrgData, setDeleteOrgData] = useState<{ orgId: string; orgName: string } | null>(null);

  // 조직 이름 수정 다이얼로그용 상태
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editOrgId, setEditOrgId] = useState<string | null>(null);
  const [editOrgName, setEditOrgName] = useState("");

  const formatPlanLabel = (plan: string | null) => {
    if (!plan) return "—";
    const map: Record<string, string> = {
      free: "무료 체험판",
      ribbon_only: "리본 라이센스 (리본 전용)",
      light: "플로비서 라이트",
      pro: "플로비서 프로",
      pro_plus: "플로비서 프로 플러스",
    };
    return map[plan] ?? plan;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // RLS 조회 오류 방지를 위해 서버 API 엔드포인트를 경유하여 조회 (조직 목록 + 지점 목록 + 소속 멤버 목록)
      const res = await fetch(`/api/admin/organizations?uiLocale=${locale}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(json.error || tf.f01205);
        return;
      }

      setOrgs(json.organizations ?? []);
      setTenants(json.tenants ?? []);
      setMembersByOrg(json.members ?? {});
    } catch (e) {
      console.error(e);
      toast.error(tf.f01205);
    } finally {
      setLoading(false);
    }
  }, [locale, tf.f01205]);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) load();
    else if (!authLoading && !isSuperAdmin) setLoading(false);
  }, [authLoading, isSuperAdmin, load]);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      toast.error(tf.f01842);
      return;
    }
    
    const res = await fetch("/api/admin/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newOrgName.trim() }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "조직 생성에 실패했습니다.");
      return;
    }

    toast.success(tf.f01856);
    setCreateOpen(false);
    setNewOrgName("");
    load();
  };

  const handleSetHqTenant = async (orgId: string, tenantId: string | null) => {
    const res = await fetch("/api/admin/organizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: orgId,
        hqTenantId: tenantId,
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "대표 본사 매장 지정에 실패했습니다.");
      return;
    }

    toast.success("대표 본사 매장이 지정되었습니다.");
    load();
  };

  const openLink = (orgId: string) => {
    setLinkOrgId(orgId);
    setLinkTenantId("");
    setLinkOpen(true);
  };

  const handleLinkTenant = async () => {
    if (!linkOrgId || !linkTenantId) return;
    const { error } = await supabase.from("tenants").update({ organization_id: linkOrgId }).eq("id", linkTenantId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tf.f01927);
    setLinkOpen(false);
    load();
  };

  // 지점 연결 해제 - 경고 확인 단계로 진입
  const confirmUnlinkTenant = (tenantId: string, tenantName: string) => {
    setUnlinkData({ tenantId, tenantName });
    setUnlinkOpen(true);
  };

  const handleUnlinkTenant = async () => {
    if (!unlinkData) return;
    const { tenantId } = unlinkData;

    // 만약 현재 대표 매장으로 지정되어 있다면, 대표 매장 지정도 해제
    const targetTenant = tenants.find(t => t.id === tenantId);
    if (targetTenant?.organization_id) {
      const org = orgs.find(o => o.id === targetTenant.organization_id);
      if (org && org.hqTenantId === tenantId) {
        await handleSetHqTenant(org.id, null);
      }
    }

    const { error } = await supabase.from("tenants").update({ organization_id: null }).eq("id", tenantId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tf.f01913);
    setUnlinkOpen(false);
    setUnlinkData(null);
    load();
  };

  const openMember = (orgId: string) => {
    setMemberOrgId(orgId);
    setMemberEmail("");
    setMemberOpen(true);
  };

  const handleAddMember = async () => {
    if (!memberOrgId || !memberEmail.trim()) return;
    const res = await fetch("/api/admin/org-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: memberOrgId,
        email: memberEmail.trim().toLowerCase(),
        action: "add",
        uiLocale: locale,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || tf.f01187);
      return;
    }
    toast.success(tf.f01834);
    setMemberOpen(false);
    load();
  };

  // 멤버 삭제 - 경고 확인 단계로 진입
  const confirmRemoveMember = (orgId: string, userId: string, email: string) => {
    setRemoveMemData({ orgId, userId, email });
    setRemoveMemOpen(true);
  };

  const handleRemoveMember = async () => {
    if (!removeMemData) return;
    const { orgId, userId, email } = removeMemData;

    const res = await fetch("/api/admin/org-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: orgId,
        email: email,
        action: "remove",
        uiLocale: locale,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || tf.f01824);
      return;
    }
    toast.success(tf.f01188);
    setRemoveMemOpen(false);
    setRemoveMemData(null);
    load();
  };

  // 조직 삭제 - 경고 확인 단계로 진입
  const confirmDeleteOrg = (orgId: string, orgName: string) => {
    setDeleteOrgData({ orgId, orgName });
    setDeleteOrgOpen(true);
  };

  const handleDeleteOrg = async () => {
    if (!deleteOrgData) return;
    const { orgId } = deleteOrgData;

    const res = await fetch(`/api/admin/organizations?organizationId=${orgId}&uiLocale=${locale}`, {
      method: "DELETE",
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "조직 삭제에 실패했습니다.");
      return;
    }

    toast.success("다매장 조직이 영구적으로 제거되었습니다.");
    setDeleteOrgOpen(false);
    setDeleteOrgData(null);
    load();
  };

  // 조직 이름 수정 다이얼로그 열기
  const openEditName = (orgId: string, orgName: string) => {
    setEditOrgId(orgId);
    setEditOrgName(orgName);
    setEditNameOpen(true);
  };

  const handleUpdateOrgName = async () => {
    if (!editOrgId || !editOrgName.trim()) return;
    const res = await fetch("/api/admin/organizations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: editOrgId,
        name: editOrgName.trim(),
      }),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || "조직 이름 수정에 실패했습니다.");
      return;
    }

    toast.success("조직 이름이 수정되었습니다.");
    setEditNameOpen(false);
    setEditOrgId(null);
    setEditOrgName("");
    load();
  };

  if (authLoading || (isSuperAdmin && loading)) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  const linkCandidates = tenants.filter((t) => t.organization_id !== linkOrgId);

  return (
    <div className="container max-w-5xl mx-auto p-6 space-y-8">
      <PageHeader
        title={tf.f01846}
        description="다매장 사장님을 위해 지점들을 묶어주고, 수발주/통계 등의 통합 제어 권한을 가질 대표 본사 지점을 지정합니다."
      />

      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {tf.f01845}
        </Button>
      </div>

      <div className="space-y-6">
        {orgs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {tf.f01117}
            </CardContent>
          </Card>
        ) : (
          orgs.map((org) => {
            const branches = tenants.filter((t) => t.organization_id === org.id);
            const mems = membersByOrg[org.id] ?? [];
            const hqTenant = tenants.find(t => t.id === org.hqTenantId);
            const hqEmails = hqTenant?.adminEmails ?? [];

            return (
              <Card key={org.id}>
                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-4">
                  <div className="space-y-1.5">
                    <CardTitle className="flex items-center gap-2 text-xl font-bold">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                      <span>{org.name}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-slate-400 hover:text-slate-600"
                        onClick={() => openEditName(org.id, org.name)}
                        title="조직 이름 수정"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span className="sr-only">이름 수정</span>
                      </Button>
                    </CardTitle>
                    <CardDescription>
                      등록일:{" "}
                      {format(new Date(org.created_at), "PP", {
                        locale: dfLoc,
                      })}
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => confirmDeleteOrg(org.id, org.name)}
                    title="다매장 조직 완전 제거"
                  >
                    <Trash2 className="h-4.5 w-4.5 mr-1" />
                    조직 삭제
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openLink(org.id)}>
                      <Link2 className="h-3.5 w-3.5 mr-1" />
                      {tf.f01912}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-slate-500 border-dashed"
                      onClick={() => openMember(org.id)}
                      title="플랫폼 온보딩·장애 대응용. 일반 고객은 본사 화면 › 본사 담당자 관리에서 1명 등록"
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      {pickUiText(baseLocale, "플랫폼 초기 설정", "Platform bootstrap", "Thiết lập nền tảng", "プラットフォーム初期設定")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground -mt-2">
                    {pickUiText(
                      baseLocale,
                      "※ 대표 본사 지점을 지정하면 점주가 본사 대표로 자동 등록됩니다. 추가 담당자 1명은 고객이 본사 메뉴 「본사 담당자 관리」에서 직접 등록합니다.",
                      "HQ branch selection auto-links the manager. Customers add one delegate from HQ › Team.",
                      "Chọn chi nhánh HQ tự động liên kết quản lý. Khách thêm 1 delegate tại HQ › Team.",
                      "代表本店指定で店長が自動連携。追加1名は本部›担当者管理から。",
                    )}
                  </p>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">{tf.f01563}</h4>
                    {branches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{tf.f01564}</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>지점명 / 담당 점주</TableHead>
                            <TableHead className="w-[120px] text-center">대표 본사</TableHead>
                            <TableHead>{tf.f02143}</TableHead>
                            <TableHead className="w-[100px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {branches.map((b) => {
                            const isHq = org.hqTenantId === b.id;
                            return (
                              <TableRow key={b.id}>
                                <TableCell>
                                  <div className="flex flex-col">
                                    <div className="flex items-center gap-2 font-medium">
                                      {b.name}
                                      {isHq && (
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                                          본점
                                        </span>
                                      )}
                                    </div>
                                    {b.adminEmails && b.adminEmails.length > 0 && (
                                      <span className="text-xs text-slate-500 font-mono mt-0.5">
                                        점주: {b.adminEmails.join(", ")}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <input
                                    type="radio"
                                    name={`hq-tenant-${org.id}`}
                                    checked={isHq}
                                    onChange={() => handleSetHqTenant(org.id, b.id)}
                                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                                  />
                                </TableCell>
                                <TableCell>{formatPlanLabel(b.plan)}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-amber-700 hover:text-amber-900"
                                    onClick={() => confirmUnlinkTenant(b.id, b.name)}
                                  >
                                    <Unlink className="h-4 w-4 mr-1" />
                                    {tf.f00768}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-1">{tf.f01268}</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      {pickUiText(
                        baseLocale,
                        "대표 본사 점주는 자동 연동됩니다. 추가 담당자는 본사 화면에서 1명까지 등록합니다.",
                        "HQ branch manager is auto-linked. One extra delegate is added from the HQ team page.",
                        "Quản lý HQ tự động. Thêm tối đa 1 delegate tại HQ.",
                        "代表本店店長は自動。追加1名は本部画面から。",
                      )}
                    </p>
                    {mems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{tf.f01239}</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{tf.f00504}</TableHead>
                            <TableHead className="w-[120px] text-right" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mems.map((m) => {
                            const isHqAdmin = hqEmails.includes(m.email);
                            return (
                              <TableRow key={m.user_id}>
                                <TableCell className="font-mono text-xs">
                                  <div className="flex items-center gap-2">
                                    {m.email}
                                    {isHqAdmin && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                                        본사 대표 (자동 연동)
                                      </span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-right">
                                  {!isHqAdmin ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-red-600 hover:text-red-900"
                                      onClick={() => confirmRemoveMember(org.id, m.user_id, m.email)}
                                      title={tf.f01186}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <span 
                                      className="text-[10px] text-muted-foreground font-sans mr-2 select-none font-semibold text-emerald-700"
                                      title="대표 지점 점주 계정은 본사 대표 관리자로 자동 잠금됩니다."
                                    >
                                      삭제 불가 🔒
                                    </span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* 조직 생성 다이얼로그 */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tf.f01833}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{tf.f01841}</Label>
            <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder={tf.f01595} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tf.f00702}
            </Button>
            <Button onClick={handleCreateOrg}>{tf.f01392}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 지점 연결 다이얼로그 */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tf.f01925}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{tf.f00664}</Label>
            <Select value={linkTenantId} onValueChange={(v) => setLinkTenantId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder={tf.f01910} />
              </SelectTrigger>
              <SelectContent>
                {linkCandidates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.organization_id ? tf.f00787 : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tf.f01684}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              {tf.f00702}
            </Button>
            <Button onClick={handleLinkTenant} disabled={!linkTenantId}>
              {tf.f01558}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 본사 사용자 추가 다이얼로그 */}
      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tf.f01269}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{tf.f00848}</Label>
            <Input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder={phMemberEmail}
            />
            <p className="text-xs text-muted-foreground">
              {pickUiText(
                baseLocale,
                "플랫폼 관리자 전용 예외 등록입니다. 일반 운영 시 고객은 본사 › 본사 담당자 관리에서 담당자 1명을 등록합니다.",
                "Platform-only bootstrap. Customers register one delegate under HQ › Team.",
                "Chỉ dành cho nền tảng. Khách đăng ký tại HQ › Team.",
                "プラットフォーム用。通常は本部›担当者管理から1名登録。",
              )}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberOpen(false)}>
              {tf.f00702}
            </Button>
            <Button onClick={handleAddMember} disabled={!memberEmail.trim()}>
              {tf.f00697}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이중 확인 경고: 멤버 삭제 */}
      <Dialog open={removeMemOpen} onOpenChange={setRemoveMemOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              본사 관리자 제외 경고
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-700 leading-relaxed">
              정말로 이 사용자(<span className="font-mono text-slate-900 font-semibold">{removeMemData?.email}</span>)를 본사 관리자 목록에서 제외하시겠습니까?
              <br /><br />
              제외 시 해당 사용자는 **지점 일일 마감 모니터링, 주문 이관 수발주 관리, 지점 간 비교 통계 대시보드 접근 권한**을 즉시 상실하게 됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setRemoveMemOpen(false); setRemoveMemData(null); }}>
              {tf.f00702}
            </Button>
            <Button variant="destructive" onClick={handleRemoveMember}>
              제외 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이중 확인 경고: 지점 해제 */}
      <Dialog open={unlinkOpen} onOpenChange={setUnlinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              지점 본사 연결 해제 경고
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-700 leading-relaxed">
              정말로 지점 [<span className="font-semibold text-slate-900">{unlinkData?.tenantName}</span>]의 본사 연결을 해제하시겠습니까?
              <br /><br />
              연결 해제 시 이 지점은 본사 조직에서 분리되어, **본사로의 주문 이관(수발주), 통합 상품/자재 관리 공유, 지점 일일 마감 통합 조회, 그리고 지점 간 비교 통계 대상에서 즉각 제외**됩니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setUnlinkOpen(false); setUnlinkData(null); }}>
              {tf.f00702}
            </Button>
            <Button variant="destructive" onClick={handleUnlinkTenant}>
              연결 해제 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 이중 확인 경고: 조직 삭제 */}
      <Dialog open={deleteOrgOpen} onOpenChange={setDeleteOrgOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <ShieldAlert className="h-5 w-5" />
              다매장 조직 영구 삭제 경고
            </DialogTitle>
            <DialogDescription className="pt-2 text-slate-700 leading-relaxed">
              정말로 다매장 조직 [<span className="font-semibold text-slate-900">{deleteOrgData?.orgName}</span>]을 완전히 삭제하시겠습니까?
              <br /><br />
              삭제 시 소속된 모든 지점들의 본사 연결이 해제(단독 매장으로 분리)되며, **통합 주문 수발주, 일일 마감 통합 조회, 매출 비교 통계 분석 대상에서 해당 조직 자체가 영구적으로 사라집니다.** 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => { setDeleteOrgOpen(false); setDeleteOrgData(null); }}>
              {tf.f00702}
            </Button>
            <Button variant="destructive" onClick={handleDeleteOrg}>
              조직 완전 삭제 실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 조직 이름 수정 다이얼로그 */}
      <Dialog open={editNameOpen} onOpenChange={setEditNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>다매장 조직 이름 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>새 조직 이름</Label>
            <Input
              value={editOrgName}
              onChange={(e) => setEditOrgName(e.target.value)}
              placeholder="변경할 다매장 조직명을 입력하세요."
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditNameOpen(false); setEditOrgId(null); setEditOrgName(""); }}>
              {tf.f00702}
            </Button>
            <Button onClick={handleUpdateOrgName} disabled={!editOrgName.trim()}>
              수정 완료
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
