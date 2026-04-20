"use client";

import DOMPurify from "isomorphic-dompurify";
import { cn } from "@/lib/utils";
import { LinkifiedText } from "@/components/ui/linkified-text";

function isProbablyHtml(s: string): boolean {
  const t = s.trim();
  return t.startsWith("<") && /<\/?[a-z][\s\S]*>/i.test(t);
}

const SANITIZE = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "ul",
    "ol",
    "li",
    "h2",
    "h3",
    "a",
    "blockquote",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
  ADD_ATTR: ["target"],
};

/** 저장된 본문: HTML(리치) 또는 기존 일반 텍스트 모두 표시 */
export function AnnouncementBody({
  htmlOrText,
  className,
}: {
  htmlOrText: string;
  className?: string;
}) {
  if (!htmlOrText?.trim()) return null;

  if (isProbablyHtml(htmlOrText)) {
    const clean = DOMPurify.sanitize(htmlOrText, SANITIZE);
    return (
      <div
        className={cn(
          "text-sm leading-relaxed text-muted-foreground max-w-none space-y-2",
          "[&_p]:mb-2 [&_p:last-child]:mb-0",
          "[&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5",
          "[&_li]:mb-0.5",
          "[&_h2]:text-base [&_h2]:font-bold [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-1",
          "[&_h3]:text-sm [&_h3]:font-semibold [&_h3]:text-foreground [&_h3]:mt-2 [&_h3]:mb-1",
          "[&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:italic dark:[&_blockquote]:border-slate-600",
          "[&_a]:text-primary [&_a]:underline [&_a]:font-medium break-all",
          className
        )}
        dangerouslySetInnerHTML={{ __html: clean }}
      />
    );
  }

  return <LinkifiedText text={htmlOrText} className={cn("text-sm leading-relaxed text-muted-foreground", className)} />;
}
