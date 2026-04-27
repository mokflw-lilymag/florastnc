"use client";

import { useEffect, useState } from "react";
import { Loader2, ImagePlus, X, Calendar as CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { OrgAnnouncementRichEditor } from "@/components/hq/org-announcement-rich-editor";
import { compressImageFile } from "@/lib/compress-image";
import { isRichTextBodyEmpty } from "@/lib/html-plain-text";
import { toast } from "sonner";
import { format, addDays, startOfToday } from "date-fns";
import { enUS, ko } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

const PRIORITY_LABEL: Record<string, string> = {
  normal: "일반",
  high: "중요 (배너 강조색)",
};

export type OrgRow = { id: string; name: string };

type OrgAnnouncementComposeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizations: OrgRow[];
  defaultOrganizationId?: string;
  onPosted?: () => void;
};

export function OrgAnnouncementComposeDialog({
  open,
  onOpenChange,
  organizations,
  defaultOrganizationId,
  onPosted,
}: OrgAnnouncementComposeDialogProps) {
  const locale = usePreferredLocale();
  const isKo = toBaseLocale(locale) === "ko";
  const tr = (koText: string, enText: string) => (isKo ? koText : enText);
  const [editorResetKey, setEditorResetKey] = useState(0);
  const [postOrgId, setPostOrgId] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postBodyHtml, setPostBodyHtml] = useState("<p></p>");
  const [postPriority, setPostPriority] = useState("normal");
  const [postExpiresAt, setPostExpiresAt] = useState<Date>(addDays(startOfToday(), 7));
  const [postAttachmentUrls, setPostAttachmentUrls] = useState<string[]>([]);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEditorResetKey((k) => k + 1);
    setPostTitle("");
    setPostBodyHtml("<p></p>");
    setPostPriority("normal");
    setPostExpiresAt(addDays(startOfToday(), 7)); // 기본 7일 후 만료
    setPostAttachmentUrls([]);
    const first = organizations[0]?.id ?? "";
    setPostOrgId(defaultOrganizationId && organizations.some((o) => o.id === defaultOrganizationId) ? defaultOrganizationId : first);
  }, [open, organizations, defaultOrganizationId]);

  const onPickAnnouncementImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !postOrgId) {
      e.target.value = "";
      return;
    }
    setUploadBusy(true);
    let count = postAttachmentUrls.length;
    try {
      for (const file of Array.from(files)) {
        if (count >= 8) {
          toast.message(tr("이미지는 최대 8장까지 첨부할 수 있습니다.", "You can attach up to 8 images."));
          break;
        }
        if (!file.type.startsWith("image/")) continue;
        const blob = await compressImageFile(file, { maxWidth: 1200, quality: 0.72 });
        const fd = new FormData();
        fd.append("organizationId", postOrgId);
        fd.append("file", blob, "announcement.jpg");
        const res = await fetch("/api/hq/announcements/upload", { method: "POST", body: fd });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(typeof json?.error === "string" ? json.error : tr("이미지 업로드 실패", "Image upload failed"));
          break;
        }
        if (typeof json.url === "string") {
          setPostAttachmentUrls((prev) => [...prev, json.url].slice(0, 8));
          count++;
        }
      }
    } finally {
      setUploadBusy(false);
      e.target.value = "";
    }
  };

  const selectedOrgLabel =
    organizations.find((o) => o.id === postOrgId)?.name?.trim() || (postOrgId ? tr("(조직명 없음)", "(No organization name)") : "");
  const priorityLabel =
    postPriority === "normal"
      ? tr("일반", "Normal")
      : postPriority === "high"
      ? tr("중요 (배너 강조색)", "Important (banner highlight)")
      : postPriority;

  const submitAnnouncement = async () => {
    if (!postOrgId || !postTitle.trim() || isRichTextBodyEmpty(postBodyHtml)) {
      toast.error(tr("조직, 제목, 본문을 입력하세요.", "Please enter organization, title, and body."));
      return;
    }
    setPosting(true);

    try {
      const res = await fetch("/api/hq/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organizationId: postOrgId,
          title: postTitle.trim(),
          body: postBodyHtml.trim(),
          priority: postPriority,
          attachmentUrls: postAttachmentUrls,
          expiresAt: postExpiresAt.toISOString(),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof json?.error === "string" ? json.error : tr("등록 실패", "Failed to publish"));
        return;
      }
      toast.success(tr("게시물을 등록했습니다. 지점 본사 게시판·배너에 반영됩니다.", "Announcement published. It is reflected in branch HQ board/banner."));
      onOpenChange(false);
      onPosted?.();
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto gap-4">
        <DialogHeader>
          <DialogTitle>{tr("본사 게시물 작성", "Write HQ announcement")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>{tr("조직", "Organization")}</Label>
            <Select value={postOrgId} onValueChange={(v) => v && setPostOrgId(v)} disabled={organizations.length === 0}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue placeholder={tr("조직 선택", "Select organization")}>{selectedOrgLabel}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {organizations.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>{tr("제목", "Title")}</Label>
            <Input value={postTitle} onChange={(e) => setPostTitle(e.target.value)} placeholder={tr("공지 제목", "Announcement title")} />
          </div>
          <div className="grid gap-2">
            <Label>{tr("본문", "Body")}</Label>
            <OrgAnnouncementRichEditor
              resetKey={editorResetKey}
              disabled={posting}
              onHtmlChange={setPostBodyHtml}
            />
          </div>
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4" aria-hidden />
              {tr("이미지 첨부 (최대 8장, 업로드 전 자동 압축)", "Attach images (up to 8, auto-compressed before upload)")}
            </Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="file"
                accept="image/*"
                multiple
                className="cursor-pointer text-sm"
                disabled={uploadBusy || posting || postAttachmentUrls.length >= 8 || !postOrgId}
                onChange={onPickAnnouncementImages}
              />
              {uploadBusy ? (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {tr("업로드 중…", "Uploading...")}
                </span>
              ) : null}
            </div>
            {postAttachmentUrls.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {postAttachmentUrls.map((url) => (
                  <div key={url} className="relative inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt="" className="h-16 w-auto max-w-[100px] rounded border object-cover" />
                    <button
                      type="button"
                      className="absolute -top-1 -right-1 rounded-full bg-slate-900 text-white p-0.5 shadow"
                      onClick={() => setPostAttachmentUrls((prev) => prev.filter((u) => u !== url))}
                      aria-label={tr("첨부 제거", "Remove attachment")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>{tr("강조", "Priority")}</Label>
              <Select value={postPriority} onValueChange={(v) => v && setPostPriority(v)}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue placeholder={tr("강조 선택", "Select priority")}>{priorityLabel}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">{tr("일반", "Normal")}</SelectItem>
                  <SelectItem value="high">{tr("중요 (배너 강조색)", "Important (banner highlight)")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>{tr("전광판 노출 만료일", "Banner expiry date")}</Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !postExpiresAt && "text-muted-foreground"
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {postExpiresAt
                    ? isKo
                      ? format(postExpiresAt, "yyyy년 M월 d일", { locale: ko })
                      : format(postExpiresAt, "MMM d, yyyy", { locale: enUS })
                    : <span>{tr("날짜 선택", "Pick date")}</span>}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={postExpiresAt}
                    onSelect={(date) => date && setPostExpiresAt(date)}
                    initialFocus
                    disabled={(date) => date < startOfToday() || date > addDays(new Date(), 60)}
                    locale={isKo ? ko : enUS}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {tr("선택한 ", "After ")}
            <strong>{isKo ? format(postExpiresAt, "M월 d일") : format(postExpiresAt, "MMM d", { locale: enUS })}</strong>
            {tr(" 이후 자동으로 전광판에서 사라지며 게시판에서 삭제됩니다. (최대 60일 후까지 선택 가능)", ", it disappears from the banner and is removed from the board automatically. (up to 60 days ahead)")}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tr("취소", "Cancel")}
          </Button>
          <Button type="button" onClick={submitAnnouncement} disabled={posting || organizations.length === 0}>
            {posting ? tr("등록 중…", "Publishing...") : tr("등록", "Publish")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
