"use client";

import { useEditor, EditorContent, Extension, useEditorState } from '@tiptap/react';
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import FontFamily from '@tiptap/extension-font-family';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from './button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useEffect, useState } from 'react';
import { getActiveFontItems, FontCatalogItem } from "@/lib/font-catalog";

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

const EDITOR_EXTENSIONS = [
  StarterKit.configure({
    heading: false,
    // disable built-in underline so the separate Underline extension doesn't conflict
  }),
  TextAlign.configure({
    types: ['heading', 'paragraph'],
    defaultAlignment: 'center',
  }),
  Underline,
  TextStyle,
  FontFamily,
  FontSize,
  Color,
];

interface TiptapEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  fontFamily?: string;
  fontSize?: number;
}

const DEFAULT_FONT_FAMILY = 'Noto Sans KR';
const DEFAULT_FONT_SIZE_PT = 14;
const DEFAULT_TEXT_COLOR = '#000000';

function MenuBar({
  editor,
  defaultFontFamily = DEFAULT_FONT_FAMILY,
  defaultFontSize = DEFAULT_FONT_SIZE_PT,
}: {
  editor: Editor;
  defaultFontFamily?: string;
  defaultFontSize?: number;
}) {
  const [activeFonts, setActiveFonts] = useState<FontCatalogItem[]>(() =>
    typeof window !== 'undefined' ? getActiveFontItems() : []
  );

  useEffect(() => {
    const refreshFonts = () => setActiveFonts(getActiveFontItems());

    refreshFonts();
    window.addEventListener('floxync_fonts_changed', refreshFonts);
    return () => window.removeEventListener('floxync_fonts_changed', refreshFonts);
  }, []);

  const toolbar = useEditorState({
    editor,
    selector: ({ editor: ed }) => ({
      activeFontFamily: ed.getAttributes('textStyle').fontFamily || '',
      activeFontSize: ed.getAttributes('textStyle').fontSize || '',
      activeColor: ed.getAttributes('textStyle').color || '',
      canBold: ed.can().chain().focus().toggleBold().run(),
      isBold: ed.isActive('bold'),
      isItalic: ed.isActive('italic'),
      isUnderline: ed.isActive('underline'),
      textAlignLeft: ed.isActive({ textAlign: 'left' }),
      textAlignCenter: ed.isActive({ textAlign: 'center' }),
      textAlignRight: ed.isActive({ textAlign: 'right' }),
    }),
  });

  const fontSizes = [10, 12, 14, 16, 18, 20, 24, 30, 36];
  const {
    activeFontFamily,
    activeFontSize,
    activeColor,
    canBold,
    isBold,
    isItalic,
    isUnderline,
    textAlignLeft,
    textAlignCenter,
    textAlignRight,
  } = toolbar;

  const resolvedFontFamily = activeFontFamily || defaultFontFamily;
  const resolvedFontSize = activeFontSize
    ? activeFontSize.replace('pt', '')
    : String(defaultFontSize);
  const resolvedColor = activeColor || DEFAULT_TEXT_COLOR;
  const fontDisplayName =
    activeFonts.find((font) => font.family === resolvedFontFamily)?.name ||
    resolvedFontFamily;

  return (
    <div className="flex flex-wrap items-center gap-1 p-1 border-b bg-muted/50 rounded-t-md">
      <Select
        key={activeFonts.map((font) => font.family).join('|')}
        value={resolvedFontFamily}
        onValueChange={(value) => {
            let chain = editor.chain().focus();
            if (editor.state.selection.empty) {
              chain = chain.selectAll();
            }
            chain.setFontFamily(value).run();
        }}
      >
        <SelectTrigger className="w-[130px] h-8 text-xs">
          <SelectValue>{fontDisplayName}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {activeFonts.map((font) => (
            <SelectItem key={font.family} value={font.family} style={{ fontFamily: font.family }}>
              {font.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={resolvedFontSize}
        onValueChange={(value) => {
            let chain = editor.chain().focus();
            if (editor.state.selection.empty) {
              chain = chain.selectAll();
            }
            chain.setFontSize(`${value}pt`).run();
        }}
      >
        <SelectTrigger className="w-[70px] h-8 text-xs">
          <SelectValue>{resolvedFontSize}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {fontSizes.map((size) => (
            <SelectItem key={size} value={size.toString()}>
              {size}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      {/* Color Picker Dropdown */}
      <Select
        value={resolvedColor}
        onValueChange={(value) => {
          let chain = editor.chain().focus();
          if (editor.state.selection.empty) {
            chain = chain.selectAll();
          }
          if (value === DEFAULT_TEXT_COLOR) chain.unsetColor().run();
          else chain.setColor(value).run();
        }}
      >
        <SelectTrigger className="w-[85px] h-8 text-xs flex items-center gap-1">
          <div 
            className="w-3 h-3 rounded-full border border-gray-300 flex-shrink-0" 
            style={{ backgroundColor: resolvedColor }}
          />
          <SelectValue>
            {resolvedColor === DEFAULT_TEXT_COLOR ? '검정' : '색상'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {[
            { color: DEFAULT_TEXT_COLOR, bg: '#000000', name: '기본(검정)' },
            { color: '#ef4444', bg: '#ef4444', name: '빨강' },
            { color: '#3b82f6', bg: '#3b82f6', name: '파랑' },
            { color: '#eab308', bg: '#eab308', name: '노랑' },
            { color: '#22c55e', bg: '#22c55e', name: '초록' },
            { color: '#a855f7', bg: '#a855f7', name: '보라' }
          ].map((c) => (
            <SelectItem key={c.color} value={c.color}>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border border-gray-300" style={{ backgroundColor: c.bg }} />
                <span>{c.name}</span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!canBold}
        className={`h-8 w-8 p-0 ${isBold ? 'bg-muted text-foreground' : ''}`}
        title="굵게"
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`h-8 w-8 p-0 ${isItalic ? 'bg-muted text-foreground' : ''}`}
        title="기울임"
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        className={`h-8 w-8 p-0 ${isUnderline ? 'bg-muted text-foreground' : ''}`}
        title="밑줄"
      >
        <UnderlineIcon className="h-4 w-4" />
      </Button>

      <div className="w-px h-6 bg-border mx-1 self-center" />

      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        className={`h-8 w-8 p-0 ${textAlignLeft ? 'bg-muted text-foreground' : ''}`}
        title="왼쪽 정렬"
      >
        <AlignLeft className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        className={`h-8 w-8 p-0 ${textAlignCenter ? 'bg-muted text-foreground' : ''}`}
        title="가운데 정렬"
      >
        <AlignCenter className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        className={`h-8 w-8 p-0 ${textAlignRight ? 'bg-muted text-foreground' : ''}`}
        title="오른쪽 정렬"
      >
        <AlignRight className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function TiptapEditor({ value, onChange, className, fontFamily, fontSize }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: EDITOR_EXTENSIONS,
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
      {editor ? (
        <MenuBar
          editor={editor}
          defaultFontFamily={fontFamily || DEFAULT_FONT_FAMILY}
          defaultFontSize={fontSize || DEFAULT_FONT_SIZE_PT}
        />
      ) : (
        <div className="h-10 border-b bg-muted/50 rounded-t-md" aria-hidden />
      )}
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
