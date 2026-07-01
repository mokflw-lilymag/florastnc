"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldCheck, Trash2, UserPlus } from "lucide-react";
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
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { toast } from "sonner";
import type { OrgDelegateSnapshot } from "@/lib/hq/org-delegate-members";

export default function HqTeamPage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const L = (ko: string, en: string) => pickUiText(baseLocale, ko, en);

  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [snapshot, setSnapshot] = useState<OrgDelegateSnapshot | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setForbidden(false);
    try {
      const res = await fetch(
        `/api/hq/org-members?uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" },
      );
      const json = await res.json().catch(() => ({}));
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) {
        toast.error(json.error || L("불러오기에 실패했습니다.", "Failed to load."));
        return;
      }
      setSnapshot(json as OrgDelegateSnapshot);
    } finally {
      setLoading(false);
    }
  }, [locale, baseLocale]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdd = async () => {
    if (!email.trim()) return;
    const res = await fetch("/api/hq/org-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        action: "add",
        uiLocale: locale,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || L("등록에 실패했습니다.", "Failed to add."));
      return;
    }
    toast.success(L("본사 담당자가 등록되었습니다.", "HQ delegate added."));
    setAddOpen(false);
    setEmail("");
    void load();
  };

  const handleRemove = async (removeEmail: string) => {
    const res = await fetch("/api/hq/org-members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        email: removeEmail,
        action: "remove",
        uiLocale: locale,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(json.error || L("삭제에 실패했습니다.", "Failed to remove."));
      return;
    }
    toast.success(L("담당자를 삭제했습니다.", "Delegate removed."));
    void load();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container max-w-3xl mx-auto p-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            {L(
              "본사 관리자만 이 화면을 사용할 수 있습니다.",
              "Only HQ admins can use this page.",
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl mx-auto p-6 space-y-6">
      <PageHeader
        title={L("본사 담당자 관리", "HQ team")}
        description={L(
          "대표 본사 지점 점주는 자동으로 본사 관리자에 연결됩니다. 추가로 통합 업무를 맡을 담당자 1명을 직접 등록할 수 있습니다.",
          "The HQ branch manager is linked automatically. You may add one additional delegate for HQ operations.",
        )}
      />

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-indigo-600" />
              {snapshot?.organizationName ?? L("조직", "Organization")}
            </CardTitle>
            <CardDescription className="mt-2">
              {L(
                `추가 담당자 슬롯: ${snapshot?.delegateSlotUsed ?? 0} / ${snapshot?.delegateSlotMax ?? 1}`,
                `Delegate slots: ${snapshot?.delegateSlotUsed ?? 0} / ${snapshot?.delegateSlotMax ?? 1}`,
              )}
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={() => setAddOpen(true)}
            disabled={!snapshot?.canAddDelegate}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            {L("담당자 추가", "Add delegate")}
          </Button>
        </CardHeader>
        <CardContent>
          {!snapshot?.members?.length ? (
            <p className="text-sm text-muted-foreground">
              {L("등록된 본사 사용자가 없습니다.", "No HQ users yet.")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{L("이메일", "Email")}</TableHead>
                  <TableHead className="w-[100px] text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {snapshot.members.map((m) => (
                  <TableRow key={m.userId}>
                    <TableCell className="font-mono text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {m.email}
                        {m.isHqRep && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800">
                            {L("본사 대표 (자동)", "HQ rep (auto)")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {m.canRemove ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600"
                          onClick={() => void handleRemove(m.email)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : (
                        <span className="text-[10px] text-muted-foreground">{L("삭제 불가", "Locked")}</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="text-xs text-muted-foreground mt-4 leading-relaxed">
            {L(
              "추가 담당자는 FloXync에 가입된 이메일이어야 합니다. 매장이 없는 본사 전담 계정이면 본사 메뉴를 사용할 수 있고, 지점 계정이면 본사·지점 권한을 함께 갖습니다.",
              "The delegate must use a registered FloXync email. Dedicated HQ accounts get HQ menus; branch accounts keep both roles.",
            )}
          </p>
        </CardContent>
      </Card>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{L("본사 담당자 추가", "Add HQ delegate")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="hq-delegate-email">{L("이메일", "Email")}</Label>
            <Input
              id="hq-delegate-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
            <p className="text-xs text-muted-foreground">
              {L(
                "마감·수발주 등 본사 업무를 함께 볼 담당자 1명만 등록할 수 있습니다.",
                "You can register one person to share HQ operations.",
              )}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              {L("취소", "Cancel")}
            </Button>
            <Button onClick={() => void handleAdd()} disabled={!email.trim()}>
              {L("등록", "Add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
