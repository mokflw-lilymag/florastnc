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
      toast.error("목록을 불러오지 못했습니다. Supabase에 organization_schema.sql 적용 여부를 확인하세요.");
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
      toast.error("조직 이름을 입력하세요.");
      return;
    }
    const { error } = await supabase.from("organizations").insert({ name: newOrgName.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("조직이 생성되었습니다.");
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
    toast.success("지점이 조직에 연결되었습니다.");
    setLinkOpen(false);
    load();
  };

  const handleUnlinkTenant = async (tenantId: string) => {
    const { error } = await supabase.from("tenants").update({ organization_id: null }).eq("id", tenantId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("지점 연결이 해제되었습니다.");
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
      toast.error(json.error || "멤버 추가 실패");
      return;
    }
    toast.success("조직 멤버가 추가되었습니다. (단독 매장만 있는 계정은 org_admin 역할로 갱신됩니다.)");
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
      toast.error(json.error || "제거 실패");
      return;
    }
    toast.success("멤버에서 제외했습니다.");
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
        title="조직(본사) 관리"
        description="다매장 고객의 본사 단위를 만들고, 지점(tenant) 연결 및 본사 사용자(org_admin)를 배정합니다."
      />

      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          조직 추가
        </Button>
      </div>

      <div className="space-y-6">
        {orgs.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              등록된 조직이 없습니다. 상단에서 조직을 추가하세요.
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
                    생성일{" "}
                    {format(new Date(org.created_at), "yyyy년 M월 d일", { locale: ko })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openLink(org.id)}>
                      <Link2 className="h-3.5 w-3.5 mr-1" />
                      지점 연결
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openMember(org.id)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      본사 사용자 추가
                    </Button>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">연결된 지점</h4>
                    {branches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">연결된 지점이 없습니다.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>지점명</TableHead>
                            <TableHead>플랜</TableHead>
                            <TableHead className="w-[100px]" />
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {branches.map((b) => (
                            <TableRow key={b.id}>
                              <TableCell>{b.name}</TableCell>
                              <TableCell>{b.plan ?? "—"}</TableCell>
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-amber-700"
                                  onClick={() => handleUnlinkTenant(b.id)}
                                >
                                  <Unlink className="h-4 w-4 mr-1" />
                                  해제
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">본사 사용자 (org_admin)</h4>
                    {mems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">배정된 사용자가 없습니다.</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>이메일</TableHead>
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
            <DialogTitle>조직 만들기</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>조직 이름</Label>
            <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="예: OO플라워 본사" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              취소
            </Button>
            <Button onClick={handleCreateOrg}>생성</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>지점을 조직에 연결</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>지점 선택</Label>
            <Select value={linkTenantId} onValueChange={(v) => setLinkTenantId(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="지점 선택…" />
              </SelectTrigger>
              <SelectContent>
                {linkCandidates.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                    {t.organization_id ? " (다른 조직에서 이동)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              이미 다른 조직에 속한 지점을 선택하면 이 조직으로 옮겨집니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>
              취소
            </Button>
            <Button onClick={handleLinkTenant} disabled={!linkTenantId}>
              연결
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={memberOpen} onOpenChange={setMemberOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>본사 사용자 추가</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>가입된 이메일 (profiles)</Label>
            <Input
              type="email"
              value={memberEmail}
              onChange={(e) => setMemberEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <p className="text-xs text-muted-foreground">
              서버에서 프로필을 찾아 멤버로 넣습니다. 단독 매장만 있는 계정은 역할이 org_admin으로 바뀔 수 있습니다.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMemberOpen(false)}>
              취소
            </Button>
            <Button onClick={handleAddMember} disabled={!memberEmail.trim()}>
              추가
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
