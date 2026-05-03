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
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

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
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const phMemberEmail = pickUiText(
    baseLocale,
    "user@example.com",
    "user@example.com",
    "email@congty.com"
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
  const formatPlanLabel = (plan: string | null) => {
    if (!plan) return "—";
    const map: Record<string, string> = {
      free: tf.f01206,
      basic: tf.f01251,
      pro: tf.f02138,
      premium: tf.f02140,
      enterprise: tf.f01555,
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
      toast.error(tf.f01205);
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
      toast.error(tf.f01842);
      return;
    }
    const { error } = await supabase.from("organizations").insert({ name: newOrgName.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tf.f01856);
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
    toast.success(tf.f01927);
    setLinkOpen(false);
    load();
  };

  const handleUnlinkTenant = async (tenantId: string) => {
    const { error } = await supabase.from("tenants").update({ organization_id: null }).eq("id", tenantId);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(tf.f01913);
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
      toast.error(json.error || tf.f01187);
      return;
    }
    toast.success(tf.f01834);
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
      toast.error(json.error || tf.f01824);
      return;
    }
    toast.success(tf.f01188);
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
        description={tf.f01059}
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
            return (
              <Card key={org.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {org.name}
                  </CardTitle>
                  <CardDescription>
                    {tf.f01393}{" "}
                    {format(new Date(org.created_at), "PP", {
                      locale: dfLoc,
                    })}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" size="sm" onClick={() => openLink(org.id)}>
                      <Link2 className="h-3.5 w-3.5 mr-1" />
                      {tf.f01912}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openMember(org.id)}>
                      <UserPlus className="h-3.5 w-3.5 mr-1" />
                      {tf.f01269}
                    </Button>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">{tf.f01563}</h4>
                    {branches.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{tf.f01564}</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{tf.f01917}</TableHead>
                            <TableHead>{tf.f02143}</TableHead>
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
                                  {tf.f00768}
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold mb-2">{tf.f01268}</h4>
                    {mems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{tf.f01239}</p>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>{tf.f00504}</TableHead>
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
                                  title={tf.f01186}
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
              {tf.f01396}
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
    </div>
  );
}
