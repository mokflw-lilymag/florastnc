"use client";

import { useId, useState, type ChangeEvent } from "react";
import { Eye, Code, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { replaceTemplateVariables } from "@/lib/email-service";
import {
  EMAIL_DELIVERY_IMAGE_PLACEHOLDER,
  EMAIL_SHOP_LOGO_PLACEHOLDER,
  buildDeliveryImagePreviewPlaceholder,
  injectShopLogoIntoContent,
} from "@/lib/email/template-blocks";

interface EmailTemplateEditorProps {
  templateName: string;
  value: string;
  onChange: (value: string) => void;
  variables: string[];
  defaultTemplate?: string;
  sampleData?: Record<string, string>;
  shopLogoUrl?: string | null;
  className?: string;
}

function isHtmlContent(content: string): boolean {
  return (
    content.includes("<!DOCTYPE html") ||
    content.includes("<html") ||
    content.includes("<div") ||
    content.includes("<p") ||
    content.includes("<table")
  );
}

export function EmailTemplateEditor({
  templateName,
  value,
  onChange,
  variables,
  defaultTemplate,
  sampleData,
  shopLogoUrl,
  className,
}: EmailTemplateEditorProps) {
  const [activeTab, setActiveTab] = useState<"editor" | "preview">("editor");
  const textareaId = useId();

  const shopName = sampleData?.회사명 ?? "우리 꽃집";
  const previewHtml = injectShopLogoIntoContent(
    replaceTemplateVariables(value, {
      고객명: "홍길동",
      주문번호: "ORD-20260322-001",
      주문일: "2026년 3월 22일",
      배송일: "2026년 3월 23일",
      수령인: "김영희",
      회사명: shopName,
      연락처: "02-1234-5678",
      이메일: "shop@example.com",
      기념일명: "결혼기념일",
      기념일: "2026년 3월 29일",
      주문링크: "https://floxync.com/order?ref=sample",
      ...sampleData,
    }),
    shopLogoUrl,
    shopName,
  ).replace(EMAIL_DELIVERY_IMAGE_PLACEHOLDER, buildDeliveryImagePreviewPlaceholder());

  const insertVariable = (variable: string) => {
    const token = `{${variable}}`;
    const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
    if (!textarea) {
      onChange(value + token);
      return;
    }
    const start = textarea.selectionStart ?? value.length;
    const next = value.slice(0, start) + token + value.slice(start);
    onChange(next);
    requestAnimationFrame(() => {
      textarea.focus();
      const pos = start + token.length;
      textarea.setSelectionRange(pos, pos);
    });
  };

  return (
    <div className={className}>
      <Card className="border border-slate-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Code className="h-4 w-4 text-slate-500" />
            {templateName}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">사용 가능한 변수 (클릭하여 삽입)</Label>
            <div className="flex flex-wrap gap-1.5">
              {variables.map((variable) => (
                <Button
                  key={variable}
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-[11px] font-mono"
                  onClick={() => insertVariable(variable)}
                >
                  {`{${variable}}`}
                </Button>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] font-mono"
                onClick={() => {
                  const token = EMAIL_SHOP_LOGO_PLACEHOLDER;
                  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
                  if (!textarea) {
                    onChange(value + token);
                    return;
                  }
                  const start = textarea.selectionStart ?? value.length;
                  onChange(value.slice(0, start) + token + value.slice(start));
                }}
              >
                {EMAIL_SHOP_LOGO_PLACEHOLDER}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] font-mono"
                onClick={() => {
                  const token = EMAIL_DELIVERY_IMAGE_PLACEHOLDER;
                  const textarea = document.getElementById(textareaId) as HTMLTextAreaElement | null;
                  if (!textarea) {
                    onChange(value + token);
                    return;
                  }
                  const start = textarea.selectionStart ?? value.length;
                  onChange(value.slice(0, start) + token + value.slice(start));
                }}
              >
                {EMAIL_DELIVERY_IMAGE_PLACEHOLDER}
              </Button>
            </div>
          </div>

          {defaultTemplate ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-slate-600"
              onClick={() => onChange(defaultTemplate)}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1" />
              기본 템플릿으로 복원
            </Button>
          ) : null}

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "editor" | "preview")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="editor">HTML / 텍스트 편집</TabsTrigger>
              <TabsTrigger value="preview" className="gap-1">
                <Eye className="h-3.5 w-3.5" />
                미리보기
              </TabsTrigger>
            </TabsList>
            <TabsContent value="editor" className="space-y-2 mt-3">
              <Textarea
                id={textareaId}
                value={value}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
                placeholder="HTML 또는 텍스트 형식으로 작성하세요..."
                className="min-h-[280px] font-mono text-xs leading-relaxed"
                spellCheck={false}
              />
            </TabsContent>
            <TabsContent value="preview" className="space-y-2 mt-3">
              <div className="border rounded-lg bg-slate-50 overflow-hidden">
                {isHtmlContent(previewHtml) ? (
                  <iframe
                    srcDoc={previewHtml}
                    className="w-full h-[320px] border-0 bg-white"
                    title={`${templateName} 미리보기`}
                  />
                ) : (
                  <pre className="p-4 text-xs whitespace-pre-wrap">{previewHtml}</pre>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
