"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  Heading2,
  Heading3,
  Undo,
  Redo,
  Link2,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

type OrgAnnouncementRichEditorProps = {
  disabled?: boolean;
  resetKey: number;
  onHtmlChange: (html: string) => void;
};

export function OrgAnnouncementRichEditor({
  disabled,
  resetKey,
  onHtmlChange,
}: OrgAnnouncementRichEditorProps) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (
    ko: string,
    en: string,
    vi: string,
    ja?: string,
    zh?: string,
    es?: string,
    pt?: string,
    fr?: string,
    de?: string,
    ru?: string,
  ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: { levels: [2, 3] },
          underline: {},
          link: {
            openOnClick: false,
            autolink: true,
            HTMLAttributes: {
              class: "text-primary underline font-medium",
              rel: "noopener noreferrer",
              target: "_blank",
            },
          },
        }),
        Placeholder.configure({
          placeholder: tr(
            "본문을 입력하세요. 굵게·제목·목록·인용·링크를 사용할 수 있습니다.",
            "Write content. You can use bold, headings, lists, quotes, and links.",
            "Nhập nội dung. Có thể dùng đậm, tiêu đề, danh sách, trích dẫn và liên kết.",
            "本文を入力してください。太字・見出し・リスト・引用・リンクが使えます。",
            "请输入正文。可使用加粗、标题、列表、引用和链接。",
            "Escriba el contenido: negrita, títulos, listas, citas y enlaces.",
            "Digite o conteúdo: negrito, títulos, listas, citações e links.",
            "Saisissez le texte : gras, titres, listes, citations et liens.",
            "Text eingeben: Fett, Überschriften, Listen, Zitate und Links.",
            "Введите текст: жирный, заголовки, списки, цитаты и ссылки.",
          ),
        }),
      ],
      content: "<p></p>",
      editable: !disabled,
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => onHtmlChange(ed.getHTML()),
    },
    [resetKey, baseLocale]
  );

  useEffect(() => {
    if (!editor) return;
    editor.commands.clearContent();
    editor.setEditable(!disabled);
  }, [editor, resetKey, disabled]);

  if (!editor) {
    return (
      <div className="min-h-[200px] rounded-md border border-dashed border-muted-foreground/30 bg-muted/20 animate-pulse" />
    );
  }

  const setLink = () => {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt(
      tr(
        "링크 URL (https://…)",
        "Link URL (https://...)",
        "URL liên kết (https://…)",
        "リンクURL（https://…）",
        "链接 URL（https://…）",
        "URL del enlace (https://…)",
        "URL do link (https://…)",
        "URL du lien (https://…)",
        "Link-URL (https://…)",
        "URL ссылки (https://…)",
      ),
      prev ?? "https://",
    );
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const ToolBtn = ({
    onClick,
    active,
    children,
    label,
  }: {
    onClick: () => void;
    active?: boolean;
    children: React.ReactNode;
    label: string;
  }) => (
    <Button
      type="button"
      variant={active ? "secondary" : "ghost"}
      size="sm"
      className="h-8 w-8 p-0 shrink-0"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      {children}
    </Button>
  );

  return (
    <div className="rounded-lg border border-input bg-background overflow-hidden">
      <div
        className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/30 px-1 py-1"
        role="toolbar"
        aria-label={tr(
          "서식",
          "Formatting toolbar",
          "Thanh định dạng",
          "書式ツールバー",
          "格式工具栏",
          "Barra de formato",
          "Barra de formatação",
          "Barre de formatage",
          "Formatierungsleiste",
          "Панель форматирования",
        )}
      >
        <ToolBtn
          label={tr("굵게", "Bold", "Đậm", "太字", "加粗", "Negrita", "Negrito", "Gras", "Fett", "Жирный")}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("기울임", "Italic", "Nghiêng", "斜体", "斜体", "Cursiva", "Itálico", "Italique", "Kursiv", "Курсив")}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("밑줄", "Underline", "Gạch chân", "下線", "下划线", "Subrayado", "Sublinhado", "Souligné", "Unterstrichen", "Подчёркнутый")}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("소제목 1", "Heading 1", "Tiêu đề 1", "小見出し1", "小标题1", "Subtítulo 1", "Subtítulo 1", "Sous-titre 1", "Überschrift 1", "Подзаголовок 1")}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("소제목 2", "Heading 2", "Tiêu đề 2", "小見出し2", "小标题2", "Subtítulo 2", "Subtítulo 2", "Sous-titre 2", "Überschrift 2", "Подзаголовок 2")}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr(
            "글머리 목록",
            "Bulleted list",
            "Danh sách dấu đầu dòng",
            "箇条書き",
            "无序列表",
            "Lista con viñetas",
            "Lista com marcadores",
            "Liste à puces",
            "Aufzählungsliste",
            "Маркированный список",
          )}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr(
            "번호 목록",
            "Numbered list",
            "Danh sách đánh số",
            "番号付きリスト",
            "有序列表",
            "Lista numerada",
            "Lista numerada",
            "Liste numérotée",
            "Nummerierte Liste",
            "Нумерованный список",
          )}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("인용", "Quote", "Trích dẫn", "引用", "引用", "Cita", "Citação", "Citation", "Zitat", "Цитата")}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("링크", "Link", "Liên kết", "リンク", "链接", "Enlace", "Link", "Lien", "Link", "Ссылка")}
          active={editor.isActive("link")}
          onClick={setLink}
        >
          <Link2 className="h-4 w-4" />
        </ToolBtn>
        <span className="w-px h-5 bg-border mx-0.5 shrink-0" aria-hidden />
        <ToolBtn
          label={tr("실행 취소", "Undo", "Hoàn tác", "元に戻す", "撤销", "Deshacer", "Desfazer", "Annuler", "Rückgängig", "Отменить")}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("다시 실행", "Redo", "Làm lại", "やり直す", "重做", "Rehacer", "Refazer", "Rétablir", "Wiederholen", "Повторить")}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <Redo className="h-4 w-4" />
        </ToolBtn>
      </div>
      <EditorContent
        editor={editor}
        className={cn(
          "max-h-[min(50vh,420px)] overflow-y-auto px-3 py-2 text-sm",
          "[&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[200px]",
          "[&_.ProseMirror_p]:mb-2 [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/70",
          "[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-5",
          "[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-5",
          "[&_.ProseMirror_h2]:text-base [&_.ProseMirror_h2]:font-bold",
          "[&_.ProseMirror_h3]:text-sm [&_.ProseMirror_h3]:font-semibold",
          "[&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-muted-foreground/40 [&_.ProseMirror_blockquote]:pl-3 [&_.ProseMirror_blockquote]:italic"
        )}
      />
    </div>
  );
}
