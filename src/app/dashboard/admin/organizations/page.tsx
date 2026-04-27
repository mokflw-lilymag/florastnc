"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Building2,
  Loader2,
  Plus,
  Link2,
  Unlink,
  UserPlus,
  Trash2,
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
import { ko } from "date-fns/locale";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

type Org = { id: string; name: string; created_at: string };
type TenantRow = {
  id: string;
  name: string;
  organization_id: string | null;
  plan: string | null;
};

export default function OrganizationsAdminPage() {
  const supabase = createClient();
  const { isSuperAdmin, isLoading: authLoading } = useAuth();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);
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
  const formatPlanLabel = (plan: string | null) => {
    if (!plan) return "—";
    const map: Record<string, string> = {
      free: tr("무료", "Free"),
      basic: tr("베이직", "Basic"),
      pro: tr("프로", "Pro"),
      premium: tr("프리미엄", "Premium"),
      enterprise: tr("엔터프라이즈", "Enterprise"),
    };
    return map[plan] ?? plan;
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: o }, { data: t }] = await Promise.all([
        supabase.from("organizations").select("id,name,created_at").order("created_at", { ascending: false }),
        supabase.from("tenants").select("id,name,organization_id,plan").order("name"),
      ]);
      setOrgs(o ?? []);
      setTenants(t ?? []);

      if (o?.length) {
        const orgIds = o.map((x) => x.id);
        const { data: mem } = await supabase
          .from("organization_members")
          .select("organization_id, user_id")
          .in("organization_id", orgIds);
        const userIds = [...new Set((mem ?? []).map((m) => m.user_id))];
        let emailMap: Record<string, string> = {};
        if (userIds.length) {
          const { data: profs } = await supabase.from("profiles").select("id,email").in("id", userIds);
          emailMap = Object.fromEntries((profs ?? []).map((p) => [p.id, p.email]));
        }
        const map: Record<string, { user_id: string; email: string }[]> = {};
        for (const row of mem ?? []) {
          const e = emailMap[row.user_id] ?? row.user_id;
          if (!map[row.organization_id]) map[row.organization_id] = [];
          map[row.organization_id].push({ user_id: row.user_id, email: e });
        }
        setMembersByOrg(map);
      } else {
        setMembersByOrg({});
      }
    } catch (e) {
      console.error(e);
      toast.error(tr("목록을 불러오지 못했습니다. Supabase에 organization_schema.sql 적용 여부를 확인하세요.", "Failed to load list. Check whether organization_schema.sql was applied in Supabase."));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) load();
    else if (!authLoading && !isSuperAdmin) setLoading(false);
  }, [authLoading, isSuperAdmin, load]);

  const handleCreateOrg = async () => {
    if (!newOrgName.trim()) {
      toast.error(tr("조직 이름을 입력하세요.", "Enter organization name."));
      return;
    }
    const { error } = await supabase.from("organizations").insert({ name: newOrgName.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tr("조직이 생성되었습니다.", "Organization created."));
    setCreateOpen(false);
    setNewOrgName("");
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
    toast.success(tr("지점이 조직에 연결되었습니다.", "Branch linked to organization."));
    setLinkOpen(false);
    load();
  };

  const handleUnlinkTenant = async (tenantId: string) => {
    const { error } = await supabase.from("tenants").update({ organization_id: null }).eq("id", tenantId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tr("지점 연결이 해제되었습니다.", "Branch unlinked."));
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
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || tr("멤버 추가 실패", "Failed to add member"));
      return;
    }
    toast.success(tr("조직 멤버가 추가되었습니다. (단독 매장만 있는 계정은 org_admin 역할로 갱신됩니다.)", "Organization member added. (Single-store account may be upgraded to org_admin.)"));
    setMemberOpen(false);
    load();
  };

  const handleRemoveMember = async (orgId: string, userId: string) => {
    const res = await fetch("/api/admin/org-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: orgId,
        email: membersByOrg[orgId]?.find((m) => m.user_id === userId)?.email,
        action: "remove",
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || tr("제거 실패", "Remove failed"));
      return;
    }
    toast.success(tr("멤버에서 제외했습니다.", "Member removed."));
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
        title={tr("조직(본사) 관리", "Organization (HQ) Management")}
        description={tr("다매장 고객의 본사 단위를 만들고, 지점(tenant) 연결 및 본사 사용자(org_admin)를 배정합니다.", "Create HQ units for multi-store clients, link branches (tenants), and assign HQ users (org_admin).")}
      />

      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          {tr("조직 추가", "Add Organization")}
        </Button>
      </div>

      <div className="space-y-6">
        {orgs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              {tr("등록된 조직이 없습니다. 상단에서 조직을 추가하세요.", "No organizations found. Add one from the top.")}
            </CardContent>
          </Card>
        ) : (
          orgs.map((org) => {
            const branches = tenants.filter((t) => t.organization_id === org.id);
            const mems = membersByOrg[org.id] ?? [];
            return (
              <Card key={org.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {org.name}
                  </CardTitle>
                  <CardDescription>
                    {tr("생성일", "Created At")}{" "}
                    {baseLocale === "ko" ? format(new Date(org.created_at), "yyyy년 M월 d일", { locale: ko }) : format(new Date(org.created_at), "yyyy-MM-dd")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openLink(org.id)}>
                      <Link2 className="h-3.5 w-3.5 mr-1" />
                      {tr("지점 연결", "Link Branch")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openMember(org.id)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      {tr("본사 사용자 추가", "Add HQ User")}
                    </Button>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">{tr("연결된 지점", "Linked Branches")}</h4>
                    {branches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{tr("연결된 지점이 없습니다.", "No linked branches.")}</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{tr("지점명", "Branch")}</TableHead>
                            <TableHead>{tr("플랜", "Plan")}</TableHead>
                            <TableHead className="w-[100px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {branches.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell>{b.name}</TableCell>
                              <TableCell>{formatPlanLabel(b.plan)}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-amber-700"
                                  onClick={() => handleUnlinkTenant(b.id)}
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  {tr("해제", "Unlink")}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">{tr("본사 사용자 (org_admin)", "HQ Users (org_admin)")}</h4>
                    {mems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{tr("배정된 사용자가 없습니다.", "No assigned users.")}</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{tr("이메일", "Email")}</TableHead>
                            <TableHead className="w-[100px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {mems.map((m) => (
                            <TableRow key={m.user_id}>
                              <TableCell className="font-mono text-xs">{m.email}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleRemoveMember(org.id, m.user_id)}
                                  title={tr("멤버 제외", "Remove member")}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("조직 만들기", "Create Organization")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{tr("조직 이름", "Organization Name")}</Label>
            <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder={tr("예: OO플라워 본사", "e.g. OO Flower HQ")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              {tr("취소", "Cancel")}
            </Button>
            <Button onClick={handleCreateOrg}>{tr("생성", "Create")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("지점을 조직에 연결", "Link Branch to Organization")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{tr("지점 선택", "Select Branch")}</Label>
            <Select value={linkTenantId} onValueChange={(v) => setLinkTenantId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder={tr("지점 선택…", "Select branch...")} />
              </SelectTrigger>
              <SelectContent>
                {linkCandidates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.organization_id ? tr(" (다른 조직에서 이동)", " (move from another org)") : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {tr("이미 다른 조직에 속한 지점을 선택하면 이 조직으로 옮겨집니다.", "Selecting a branch already in another organization will move it here.")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              {tr("취소", "Cancel")}
            </Button>
            <Button onClick={handleLinkTenant} disabled={!linkTenantId}>
              {tr("연결", "Link")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{tr("본사 사용자 추가", "Add HQ User")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>{tr("가입된 이메일 (profiles)", "Registered Email (profiles)")}</Label>
            <Input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <p className="text-xs text-muted-foreground">
              {tr("서버에서 프로필을 찾아 멤버로 넣습니다. 단독 매장만 있는 계정은 역할이 org_admin으로 바뀔 수 있습니다.", "Server looks up the profile and adds it as member. Single-store accounts may be switched to org_admin.")}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberOpen(false)}>
              {tr("취소", "Cancel")}
            </Button>
            <Button onClick={handleAddMember} disabled={!memberEmail.trim()}>
              {tr("추가", "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
