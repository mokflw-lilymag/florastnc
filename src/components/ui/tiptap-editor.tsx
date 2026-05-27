"use client";

import { useEditor, EditorContent, Extension } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect } from 'react';
import { FONT_CATALOG } from "@/lib/font-catalog";

const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize.replace(/['"]+/g, ''),
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize: fontSize => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },
});

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  fontFamily?: string;
  fontSize?: number;
}

const MenuBar = ({ editor }: { editor: any }) => {
  if (!editor) {
    return null;
  }

  const fontSizes = [10, 12, 14, 16, 18, 20, 24, 30, 36];
  const activeFontFamily = editor.getAttributes('textStyle').fontFamily || '';
  const activeFontSize = editor.getAttributes('textStyle').fontSize || '';

  return (
    <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-muted/50 rounded-t-md">
      <Select
        value={activeFontFamily || "default"}
        onValueChange={(value) => {
            if (value === "default") editor.chain().focus().unsetFontFamily().run();
            else editor.chain().focus().setFontFamily(value).run();
        }}
      >
        <SelectTrigger className="w-[140px] h-8 text-xs">
          <SelectValue placeholder="폰트 선택" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">Noto Sans KR</SelectItem>
          {FONT_CATALOG.map((font) => (
            <SelectItem key={font.family} value={font.family} style={{ fontFamily: font.family }}>
              {font.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={activeFontSize ? activeFontSize.replace('pt', '') : "default"}
        onValueChange={(value) => {
            if (value === "default") editor.chain().focus().unsetFontSize().run();
            else editor.chain().focus().setFontSize(`${value}pt`).run();
        }}
      >
        <SelectTrigger className="w-[80px] h-8 text-xs">
          <SelectValue placeholder="크기" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">14</SelectItem>
          {fontSizes.map((size) => (
            <SelectItem key={size} value={size.toString()}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-muted text-foreground' : ''}`}
        title="굵게"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-muted text-foreground' : ''}`}
        title="기울임"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-muted text-foreground' : ''}`}
        title="밑줄"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-muted text-foreground' : ''}`}
        title="왼쪽 정렬"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-muted text-foreground' : ''}`}
        title="가운데 정렬"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-muted text-foreground' : ''}`}
        title="오른쪽 정렬"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export function TiptapEditor({ value, onChange, className, fontFamily, fontSize }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        defaultAlignment: 'center', 
      }),
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
    ],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML();
      const isEmpty = editor.getText().trim().length === 0;
      onChange(isEmpty ? '' : html);
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[150px] p-3 border rounded-b-md bg-background',
      },
    },
  });

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      let newContent = value;
      if (!value.includes('<p>') && !value.includes('<div>') && value.trim()) {
         newContent = value.split('\n').map(line => `<p style="text-align: center">${line}</p>`).join('');
      }
      
      if (newContent !== editor.getHTML()) {
          editor.commands.setContent(newContent);
      }
    }
  }, [value, editor]);

  return (
    <div className={`flex flex-col ${className || ''}`}>
      <MenuBar editor={editor} />
      <div 
        style={{ 
          fontFamily: fontFamily ? `'${fontFamily}'` : 'inherit',
          fontSize: fontSize ? `${fontSize}pt` : 'inherit'
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
