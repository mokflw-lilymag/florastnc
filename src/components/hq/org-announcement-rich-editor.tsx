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
  const tr = (ko: string, en: string, vi: string) => pickUiText(baseLocale, ko, en, vi);
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
            "Nhập nội dung. Có thể dùng đậm, tiêu đề, danh sách, trích dẫn và liên kết."
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
      tr("링크 URL (https://…)", "Link URL (https://...)", "URL liên kết (https://…)"),
      prev ?? "https://"
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
        aria-label={tr("서식", "Formatting toolbar", "Thanh định dạng")}
      >
        <ToolBtn
          label={tr("굵게", "Bold", "Đậm")}
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("기울임", "Italic", "Nghiêng")}
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("밑줄", "Underline", "Gạch chân")}
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("소제목 1", "Heading 1", "Tiêu đề 1")}
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("소제목 2", "Heading 2", "Tiêu đề 2")}
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("글머리 목록", "Bulleted list", "Danh sách dấu đầu dòng")}
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("번호 목록", "Numbered list", "Danh sách đánh số")}
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label={tr("인용", "Quote", "Trích dẫn")}
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn label={tr("링크", "Link", "Liên kết")} active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </ToolBtn>
        <span className="w-px h-5 bg-border mx-0.5 shrink-0" aria-hidden />
        <ToolBtn label={tr("실행 취소", "Undo", "Hoàn tác")} onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn label={tr("다시 실행", "Redo", "Làm lại")} onClick={() => editor.chain().focus().redo().run()}>
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
