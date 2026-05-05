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
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

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
  const baseLocale = toBaseLocale(locale);
  const dfLoc = dateFnsLocaleForBase(baseLocale);
  const tr = (
    koText: string,
    enText: string,
    viText: string,
    ja?: string,
    zh?: string,
    es?: string,
    pt?: string,
    fr?: string,
    de?: string,
    ru?: string,
  ) => pickUiText(baseLocale, koText, enText, viText, ja, zh, es, pt, fr, de, ru);
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
          toast.message(
            tr(
              "이미지는 최대 8장까지 첨부할 수 있습니다.",
              "You can attach up to 8 images.",
              "Bạn chỉ có thể đính kèm tối đa 8 ảnh.",
              "画像は最大8枚まで添付できます。",
              "最多可附加8张图片。",
              "Puede adjuntar hasta 8 imágenes.",
              "É possível anexar até 8 imagens.",
              "Vous pouvez joindre jusqu’à 8 images.",
              "Es sind höchstens 8 Bilder möglich.",
              "Можно прикрепить не более 8 изображений.",
            ),
          );
          break;
        }
        if (!file.type.startsWith("image/")) continue;
        const blob = await compressImageFile(file, { maxWidth: 1200, quality: 0.72 });
        const fd = new FormData();
        fd.append("organizationId", postOrgId);
        fd.append("uiLocale", locale);
        fd.append("file", blob, "announcement.jpg");
        const res = await fetch("/api/hq/announcements/upload", {
          method: "POST",
          body: fd,
          credentials: "include",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          toast.error(
            typeof json?.error === "string"
              ? json.error
              : tr(
                  "이미지 업로드 실패",
                  "Image upload failed",
                  "Tải ảnh lên thất bại",
                  "画像のアップロードに失敗しました",
                  "图片上传失败",
                  "Error al subir la imagen",
                  "Falha no upload da imagem",
                  "Échec du téléversement de l’image",
                  "Bild-Upload fehlgeschlagen",
                  "Не удалось загрузить изображение",
                ),
          );
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
    organizations.find((o) => o.id === postOrgId)?.name?.trim() ||
    (postOrgId
      ? tr(
          "(조직명 없음)",
          "(No organization name)",
          "(Không có tên tổ chức)",
          "（組織名なし）",
          "（无组织名称）",
          "(Sin nombre de organización)",
          "(Sem nome da organização)",
          "(Pas de nom d’organisation)",
          "(Kein Organisationsname)",
          "(Нет названия организации)",
        )
      : "");
  const priorityLabel =
    postPriority === "normal"
      ? tr(
          "일반",
          "Normal",
          "Thường",
          "通常",
          "普通",
          "Normal",
          "Normal",
          "Normal",
          "Normal",
          "Обычный",
        )
      : postPriority === "high"
        ? tr(
            "중요 (배너 강조색)",
            "Important (banner highlight)",
            "Quan trọng (màu nổi bật trên biển ngữ)",
            "重要（バナー強調色）",
            "重要（横幅高亮）",
            "Importante (resaltado en banner)",
            "Importante (destaque no banner)",
            "Important (mise en avant bannière)",
            "Wichtig (Banner-Hervorhebung)",
            "Важно (выделение в баннере)",
          )
        : postPriority;

  const submitAnnouncement = async () => {
    if (!postOrgId || !postTitle.trim() || isRichTextBodyEmpty(postBodyHtml)) {
      toast.error(
        tr(
          "조직, 제목, 본문을 입력하세요.",
          "Please enter organization, title, and body.",
          "Vui lòng nhập tổ chức, tiêu đề và nội dung.",
          "組織・タイトル・本文を入力してください。",
          "请填写组织、标题和正文。",
          "Indique organización, título y cuerpo.",
          "Informe organização, título e corpo.",
          "Saisissez l’organisation, le titre et le corps.",
          "Bitte Organisation, Titel und Text eingeben.",
          "Укажите организацию, заголовок и текст.",
        ),
      );
      return;
    }
    setPosting(true);

    try {
      const res = await fetch("/api/hq/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: postOrgId,
          title: postTitle.trim(),
          body: postBodyHtml.trim(),
          priority: postPriority,
          attachmentUrls: postAttachmentUrls,
          expiresAt: postExpiresAt.toISOString(),
          uiLocale: locale,
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof json?.error === "string"
            ? json.error
            : tr(
                "등록 실패",
                "Failed to publish",
                "Đăng thất bại",
                "投稿に失敗しました",
                "发布失败",
                "Error al publicar",
                "Falha ao publicar",
                "Échec de la publication",
                "Veröffentlichung fehlgeschlagen",
                "Не удалось опубликовать",
              ),
        );
        return;
      }
      toast.success(
        tr(
          "게시물을 등록했습니다. 지점 본사 게시판·배너에 반영됩니다.",
          "Announcement published. It is reflected in branch HQ board/banner.",
          "Đã đăng bài. Nội dung được phản ánh trên bảng tin và biển ngữ chi nhánh trụ sở.",
          "投稿しました。店舗の本部掲示板・バナーに反映されます。",
          "已发布。将显示在门店总部公告栏与横幅中。",
          "Publicado. Se refleja en el tablero y el banner de sede de las sucursales.",
          "Publicado. Aparece no mural e no banner da matriz nas filiais.",
          "Publié. Visible sur le tableau d’affichage et la bannière siège des succursales.",
          "Veröffentlicht. Erscheint im HQ-Board und Banner der Filialen.",
          "Опубликовано. Отобразится на доске и баннере HQ филиалов.",
        ),
      );
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
          <DialogTitle>
            {tr(
              "본사 게시물 작성",
              "Write HQ announcement",
              "Soạn thông báo trụ sở",
              "本部お知らせの作成",
              "撰写总部公告",
              "Redactar anuncio de sede",
              "Escrever aviso da matriz",
              "Rédiger une annonce siège",
              "HQ-Mitteilung verfassen",
              "Создать объявление головного офиса",
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-2">
            <Label>
              {tr(
                "조직",
                "Organization",
                "Tổ chức",
                "組織",
                "组织",
                "Organización",
                "Organização",
                "Organisation",
                "Organisation",
                "Организация",
              )}
            </Label>
            <Select value={postOrgId} onValueChange={(v) => v && setPostOrgId(v)} disabled={organizations.length === 0}>
              <SelectTrigger className="w-full min-w-0">
                <SelectValue
                  placeholder={tr(
                    "조직 선택",
                    "Select organization",
                    "Chọn tổ chức",
                    "組織を選択",
                    "选择组织",
                    "Seleccionar organización",
                    "Selecionar organização",
                    "Choisir l’organisation",
                    "Organisation wählen",
                    "Выберите организацию",
                  )}
                >
                  {selectedOrgLabel}
                </SelectValue>
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
            <Label>{tr("제목", "Title", "Tiêu đề", "タイトル", "标题", "Título", "Título", "Titre", "Titel", "Заголовок")}</Label>
            <Input
              value={postTitle}
              onChange={(e) => setPostTitle(e.target.value)}
              placeholder={tr(
                "공지 제목",
                "Announcement title",
                "Tiêu đề thông báo",
                "お知らせのタイトル",
                "公告标题",
                "Título del anuncio",
                "Título do aviso",
                "Titre de l’annonce",
                "Titel der Mitteilung",
                "Заголовок объявления",
              )}
            />
          </div>
          <div className="grid gap-2">
            <Label>{tr("본문", "Body", "Nội dung", "本文", "正文", "Cuerpo", "Corpo", "Corps", "Text", "Текст")}</Label>
            <OrgAnnouncementRichEditor
              resetKey={editorResetKey}
              disabled={posting}
              onHtmlChange={setPostBodyHtml}
            />
          </div>
          <div className="grid gap-2">
            <Label className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4" aria-hidden />
              {tr(
                "이미지 첨부 (최대 8장, 업로드 전 자동 압축)",
                "Attach images (up to 8, auto-compressed before upload)",
                "Đính kèm ảnh (tối đa 8, tự nén trước khi tải lên)",
                "画像添付（最大8枚、アップロード前に自動圧縮）",
                "附加图片（最多8张，上传前自动压缩）",
                "Adjuntar imágenes (hasta 8, compresión automática antes de subir)",
                "Anexar imagens (até 8, compressão automática antes do envio)",
                "Joindre des images (jusqu’à 8, compression auto avant envoi)",
                "Bilder anhängen (bis zu 8, automatische Kompression vor Upload)",
                "Изображения (до 8, сжатие перед загрузкой)",
              )}
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
                  {tr(
                    "업로드 중…",
                    "Uploading...",
                    "Đang tải lên…",
                    "アップロード中…",
                    "上传中…",
                    "Subiendo…",
                    "Enviando…",
                    "Téléversement…",
                    "Wird hochgeladen…",
                    "Загрузка…",
                  )}
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
                      aria-label={tr(
                        "첨부 제거",
                        "Remove attachment",
                        "Gỡ đính kèm",
                        "添付を削除",
                        "移除附件",
                        "Quitar adjunto",
                        "Remover anexo",
                        "Retirer la pièce jointe",
                        "Anhang entfernen",
                        "Удалить вложение",
                      )}
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
              <Label>
                {tr(
                  "강조",
                  "Priority",
                  "Mức ưu tiên",
                  "強調",
                  "优先级",
                  "Prioridad",
                  "Prioridade",
                  "Priorité",
                  "Priorität",
                  "Приоритет",
                )}
              </Label>
              <Select value={postPriority} onValueChange={(v) => v && setPostPriority(v)}>
                <SelectTrigger className="w-full min-w-0">
                  <SelectValue
                    placeholder={tr(
                      "강조 선택",
                      "Select priority",
                      "Chọn mức ưu tiên",
                      "強調を選択",
                      "选择优先级",
                      "Seleccionar prioridad",
                      "Selecionar prioridade",
                      "Choisir la priorité",
                      "Priorität wählen",
                      "Выберите приоритет",
                    )}
                  >
                    {priorityLabel}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">
                    {tr("일반", "Normal", "Thường", "通常", "普通", "Normal", "Normal", "Normal", "Normal", "Обычный")}
                  </SelectItem>
                  <SelectItem value="high">
                    {tr(
                      "중요 (배너 강조색)",
                      "Important (banner highlight)",
                      "Quan trọng (màu nổi bật trên biển ngữ)",
                      "重要（バナー強調色）",
                      "重要（横幅高亮）",
                      "Importante (resaltado en banner)",
                      "Importante (destaque no banner)",
                      "Important (mise en avant bannière)",
                      "Wichtig (Banner-Hervorhebung)",
                      "Важно (выделение в баннере)",
                    )}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>
                {tr(
                  "전광판 노출 만료일",
                  "Banner expiry date",
                  "Ngày hết hạn hiển thị biển ngữ",
                  "ティッカー表示の有効期限",
                  "滚动横幅到期日",
                  "Fecha de caducidad del banner",
                  "Data de expiração do banner",
                  "Date d’expiration bannière",
                  "Ablaufdatum Banner",
                  "Дата снятия с баннера",
                )}
              </Label>
              <Popover>
                <PopoverTrigger
                  render={
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !postExpiresAt && "text-muted-foreground",
                      )}
                    />
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {postExpiresAt ? (
                    format(postExpiresAt, "PPP", { locale: dfLoc })
                  ) : (
                    <span>
                      {tr(
                        "날짜 선택",
                        "Pick date",
                        "Chọn ngày",
                        "日付を選択",
                        "选择日期",
                        "Elegir fecha",
                        "Escolher data",
                        "Choisir la date",
                        "Datum wählen",
                        "Выберите дату",
                      )}
                    </span>
                  )}
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={postExpiresAt}
                    onSelect={(date) => date && setPostExpiresAt(date)}
                    initialFocus
                    disabled={(date) => date < startOfToday() || date > addDays(new Date(), 60)}
                    locale={dfLoc}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground leading-snug">
            {(() => {
              const dateStr = format(postExpiresAt, "MMMM d", { locale: dfLoc });
              return tr(
                `${dateStr} 이후 자동으로 전광판에서 사라지며 게시판에서 삭제됩니다. (최대 60일 후까지 선택 가능)`,
                `After ${dateStr}, it disappears from the banner and is removed from the board automatically. (You can select up to 60 days ahead.)`,
                `Sau ${dateStr}, thông báo sẽ tự ẩn khỏi biển ngữ và bị xóa khỏi bảng tin. (Có thể chọn tối đa trong vòng 60 ngày.)`,
                `${dateStr}を過ぎると、電光掲示板から自動的に消え、掲示板からも削除されます。（最大60日先まで選択可能）`,
                `在 ${dateStr} 之后，将自动从滚动横幅移除并从公告板删除。（最多可选择 60 天内）`,
                `Pasada la fecha ${dateStr}, desaparece del banner y se elimina del tablero automáticamente. (Hasta 60 días.)`,
                `Após ${dateStr}, some do banner e é removido do mural automaticamente. (Até 60 dias.)`,
                `Après le ${dateStr}, il disparaît de la bannière et est retiré du tableau automatiquement. (Jusqu’à 60 jours.)`,
                `Nach dem ${dateStr} wird der Eintrag automatisch vom Banner entfernt und aus dem Board gelöscht. (Bis zu 60 Tage im Voraus.)`,
                `После ${dateStr} объявление автоматически исчезнет с баннера и будет удалено с доски. (Не более чем на 60 дней вперёд.)`,
              );
            })()}
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {tr("취소", "Cancel", "Hủy", "キャンセル", "取消", "Cancelar", "Cancelar", "Annuler", "Abbrechen", "Отмена")}
          </Button>
          <Button type="button" onClick={submitAnnouncement} disabled={posting || organizations.length === 0}>
            {posting
              ? tr(
                  "등록 중…",
                  "Publishing...",
                  "Đang đăng…",
                  "投稿中…",
                  "发布中…",
                  "Publicando…",
                  "Publicando…",
                  "Publication…",
                  "Wird veröffentlicht…",
                  "Публикация…",
                )
              : tr(
                  "등록",
                  "Publish",
                  "Đăng",
                  "投稿",
                  "发布",
                  "Publicar",
                  "Publicar",
                  "Publier",
                  "Veröffentlichen",
                  "Опубликовать",
                )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
