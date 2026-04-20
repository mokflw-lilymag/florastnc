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

function buildExtensions() {
  return [
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
      placeholder: "본문을 입력하세요. 굵게·제목·목록·인용·링크를 사용할 수 있습니다.",
    }),
  ];
}

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
  const editor = useEditor(
    {
      extensions: buildExtensions(),
      content: "<p></p>",
      editable: !disabled,
      immediatelyRender: false,
      onUpdate: ({ editor: ed }) => onHtmlChange(ed.getHTML()),
    },
    [resetKey]
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
    const url = window.prompt("링크 URL (https://…)", prev ?? "https://");
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
        aria-label="서식"
      >
        <ToolBtn
          label="굵게"
          active={editor.isActive("bold")}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label="기울임"
          active={editor.isActive("italic")}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label="밑줄"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label="소제목 1"
          active={editor.isActive("heading", { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          <Heading2 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label="소제목 2"
          active={editor.isActive("heading", { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        >
          <Heading3 className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label="글머리 목록"
          active={editor.isActive("bulletList")}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label="번호 목록"
          active={editor.isActive("orderedList")}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn
          label="인용"
          active={editor.isActive("blockquote")}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <Quote className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn label="링크" active={editor.isActive("link")} onClick={setLink}>
          <Link2 className="h-4 w-4" />
        </ToolBtn>
        <span className="w-px h-5 bg-border mx-0.5 shrink-0" aria-hidden />
        <ToolBtn label="실행 취소" onClick={() => editor.chain().focus().undo().run()}>
          <Undo className="h-4 w-4" />
        </ToolBtn>
        <ToolBtn label="다시 실행" onClick={() => editor.chain().focus().redo().run()}>
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
