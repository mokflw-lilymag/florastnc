"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import {
  ScrollText,
  Plus,
  Bell,
  Edit,
  Trash2,
  Megaphone,
  Loader2,
  Mail,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { getMessages } from "@/i18n/getMessages";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  PLATFORM_CATEGORY_LABELS,
  PLATFORM_PRIORITY_LABELS,
  PLATFORM_STATUS_LABELS,
  platformSelectLabel,
  type PlatformAnnouncement,
  type PlatformAnnouncementCategory,
} from "@/lib/platform-announcements/types";
import { formatTargetCountries, formatTargetPlans } from "@/lib/platform-announcements/targeting";
import { AnnouncementTargetingFields } from "@/app/dashboard/announcements/announcement-targeting-fields";

type FormState = {
  title: string;
  body: string;
  category: PlatformAnnouncementCategory;
  priority: "normal" | "high";
  status: "draft" | "published";
  sendEmail: boolean;
  expiresAt: string;
  targetCountries: string[];
  targetPlans: string[];
};

const emptyForm = (): FormState => ({
  title: "",
  body: "",
  category: "update",
  priority: "normal",
  status: "published",
  sendEmail: false,
  expiresAt: "",
  targetCountries: [],
  targetPlans: [],
});

export default function AnnouncementsPage() {
  const { profile, isLoading } = useAuth();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const isSuperAdmin = profile?.role === "super_admin";

  const [rows, setRows] = useState<PlatformAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/platform/announcements?uiLocale=${encodeURIComponent(locale)}`, {
        credentials: "include",
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok) setRows((json.announcements as PlatformAnnouncement[]) ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (!isLoading && isSuperAdmin) void load();
  }, [isLoading, isSuperAdmin, load]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const openEdit = (row: PlatformAnnouncement) => {
    setEditingId(row.id);
    setForm({
      title: row.title,
      body: row.body,
      category: row.category,
      priority: row.priority,
      status: row.status,
      sendEmail: !row.email_sent_at && row.send_email,
      expiresAt: row.expires_at ? row.expires_at.slice(0, 10) : "",
      targetCountries: row.target_countries ?? [],
      targetPlans: row.target_plans ?? [],
    });
    setDialogOpen(true);
  };

  const save = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("제목과 내용을 입력해 주세요.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        body: form.body.trim(),
        category: form.category,
        priority: form.priority,
        status: form.status,
        sendEmail: form.sendEmail,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        targetCountries: form.targetCountries,
        targetPlans: form.targetPlans,
        uiLocale: locale,
      };

      const res = await fetch(
        editingId ? `/api/platform/announcements/${editingId}` : "/api/platform/announcements",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        },
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((json as { error?: string }).error ?? "저장 실패");

      const email = (json as { email?: { sent: number; simulated: boolean } }).email;
      if (email) {
        toast.success(
          email.simulated
            ? `공지 게시 완료 (SMTP 미설정 — 이메일 ${email.sent}건 시뮬레이션)`
            : `공지 게시 + 이메일 ${email.sent}건 발송 완료`,
        );
      } else {
        const emailSkipped =
          form.status === "published" && !form.sendEmail;
        toast.success(
          form.status === "published"
            ? emailSkipped
              ? "공지가 게시되었습니다. (알림 종만 — 이메일 미발송)"
              : "공지가 게시되었습니다."
            : "임시 저장되었습니다.",
        );
      }

      setDialogOpen(false);
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "저장 중 오류");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("이 공지를 삭제할까요?")) return;
    try {
      const res = await fetch(`/api/platform/announcements/${id}?uiLocale=${encodeURIComponent(locale)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("삭제 실패");
      toast.success("삭제되었습니다.");
      await load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "삭제 실패");
    }
  };

  if (isLoading) return null;
  if (!isSuperAdmin) return <AccessDenied requiredTier="System Admin" />;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader title={tf.f00996} description={tf.f01199} icon={ScrollText}>
        <Button className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> {tf.f01372}
        </Button>
      </PageHeader>

      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardContent className="p-4 text-sm text-slate-700 leading-relaxed">
          <p className="font-semibold text-indigo-900 mb-1">글로벌 공지 · 알림 종 · 이메일</p>
          <p>
            여기서 등록한 공지는 <strong>모든 매장 헤더 알림 종</strong>에 표시됩니다. 아래에서 <strong>국가·요금제</strong>를
            고르면 해당 매장만 대상으로 제한됩니다. 「이메일도 발송」을 켜면 같은 조건의 계정으로 메일이 갑니다.
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-20 bg-slate-50/50 rounded-xl border-2 border-dashed gap-4">
          <Megaphone className="h-10 w-10 text-slate-300" />
          <div className="text-center">
            <h3 className="font-semibold text-slate-600">{tf.f01084}</h3>
            <p className="text-sm text-slate-400">{tf.f01113}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((row) => (
            <Card key={row.id} className="hover:border-blue-200 transition-colors">
              <CardHeader className="p-4 pb-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant={row.status === "published" ? "default" : "outline"}>
                      {row.status === "published" ? "게시됨" : "임시저장"}
                    </Badge>
                    <Badge variant="outline">{PLATFORM_CATEGORY_LABELS[row.category]}</Badge>
                    {row.priority === "high" && (
                      <Badge className="bg-orange-500">{tf.f01890}</Badge>
                    )}
                    <span className="text-xs text-slate-500">
                      {format(new Date(row.published_at ?? row.created_at), "yyyy.MM.dd HH:mm", { locale: dfLoc })}
                    </span>
                    {row.email_sent_at && (
                      <span className="text-[10px] text-emerald-600 flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        이메일 {row.email_recipient_count}건
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 w-full">
                      {formatTargetCountries(row.target_countries)} · {formatTargetPlans(row.target_plans)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(row)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => void remove(row.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-lg mt-2">{row.title}</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-3 whitespace-pre-wrap">
                  {row.body}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "글로벌 공지 수정" : "글로벌 공지 작성"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>제목</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>내용</Label>
              <Textarea
                rows={6}
                value={form.body}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setForm((f) => ({ ...f, body: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>분류</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm((f) => ({ ...f, category: v as PlatformAnnouncementCategory }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{platformSelectLabel("category", form.category)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_CATEGORY_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>우선순위</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((f) => ({ ...f, priority: v as "normal" | "high" }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{platformSelectLabel("priority", form.priority)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_PRIORITY_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>상태</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm((f) => ({ ...f, status: v as "draft" | "published" }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue>{platformSelectLabel("status", form.status)}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_STATUS_LABELS).map(([k, label]) => (
                      <SelectItem key={k} value={k}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>만료일 (선택)</Label>
                <Input
                  type="date"
                  value={form.expiresAt}
                  onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                />
              </div>
            </div>
            <AnnouncementTargetingFields
              selectedCountries={form.targetCountries}
              selectedPlans={form.targetPlans}
              onCountriesChange={(targetCountries) => setForm((f) => ({ ...f, targetCountries }))}
              onPlansChange={(targetPlans) => setForm((f) => ({ ...f, targetPlans }))}
            />
            <div className="rounded-lg border p-3 bg-slate-50 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <Label htmlFor="sendEmail" className="text-sm font-medium flex items-center gap-1.5 cursor-pointer">
                    <Mail className="h-3.5 w-3.5 text-slate-500" />
                    이메일 발송
                  </Label>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {form.status === "draft"
                      ? "임시저장 시에는 알림 종·이메일 모두 발송되지 않습니다."
                      : form.sendEmail
                        ? "게시 시 알림 종 + 대상 사용자 이메일로 함께 발송합니다."
                        : "게시 시 알림 종에만 표시하고, 이메일은 보내지 않습니다."}
                  </p>
                </div>
                <Switch
                  id="sendEmail"
                  checked={form.sendEmail}
                  disabled={
                    form.status === "draft" ||
                    Boolean(editingId && rows.find((r) => r.id === editingId)?.email_sent_at)
                  }
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, sendEmail: checked }))}
                />
              </div>
              {editingId && rows.find((r) => r.id === editingId)?.email_sent_at && (
                <p className="text-xs text-emerald-700 bg-emerald-50 rounded-md px-2 py-1.5 flex items-center gap-1.5">
                  <Send className="h-3 w-3 shrink-0" />
                  이미 이메일이 발송되어 재발송할 수 없습니다. (
                  {rows.find((r) => r.id === editingId)?.email_recipient_count ?? 0}건)
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              취소
            </Button>
            <Button onClick={() => void save()} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bell className="h-4 w-4 mr-2" />}
              {form.status === "published" ? "게시" : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
