import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen } from "lucide-react";

export const metadata = {
  title: "국가별 API 키 발급 가이드 | FloXync",
  description: "국가별 연동 API 키 발급 절차 및 장애 시 점검 순서",
};

function renderInline(s: string): ReactNode {
  const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = linkRe.exec(s)) !== null) {
    if (m.index > last) {
      parts.push(renderBold(s.slice(last, m.index)));
    }
    parts.push(
      <a
        key={`${m.index}-a`}
        href={m[2]}
        className="font-medium text-blue-600 underline underline-offset-2 hover:text-blue-800"
        target="_blank"
        rel="noopener noreferrer"
      >
        {m[1]}
      </a>
    );
    last = m.index + m[0].length;
  }
  if (last < s.length) parts.push(renderBold(s.slice(last)));
  return parts.length ? parts : renderBold(s);
}

function renderBold(s: string): ReactNode {
  const chunks = s.split(/\*\*/);
  if (chunks.length === 1) return s;
  return chunks.map((c, i) => (i % 2 === 1 ? <strong key={i}>{c}</strong> : <span key={i}>{c}</span>));
}

function GuideArticle({ text }: { text: string }) {
  const lines = text.split(/\n/);
  const blocks: ReactNode[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i] ?? "";
    if (line.startsWith("# ") && !line.startsWith("##")) {
      blocks.push(
        <h1 key={`h1-${i}`} className="text-2xl font-black tracking-tight text-slate-900 first:mt-0 mt-10 mb-4">
          {line.slice(2)}
        </h1>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${i}`} className="mt-10 border-b border-slate-200 pb-2 text-lg font-bold text-slate-900 first:mt-2">
          {line.slice(3)}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${i}`} className="mt-6 text-base font-semibold text-slate-800">
          {line.slice(4)}
        </h3>
      );
      i++;
      continue;
    }
    if (line.trim() === "---") {
      i++;
      continue;
    }
    if (line.startsWith("- ")) {
      const items: ReactNode[] = [];
      while (i < lines.length && lines[i]!.startsWith("- ")) {
        items.push(
          <li key={i} className="text-sm leading-relaxed text-slate-700">
            {renderInline(lines[i]!.slice(2))}
          </li>
        );
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="my-3 list-disc space-y-1.5 pl-5 marker:text-slate-400">
          {items}
        </ul>
      );
      continue;
    }
    if (/^\d+\.\s/.test(line)) {
      const items: ReactNode[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i]!)) {
        items.push(
          <li key={i} className="text-sm leading-relaxed text-slate-700">
            {renderInline(lines[i]!.replace(/^\d+\.\s/, ""))}
          </li>
        );
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="my-3 list-decimal space-y-1.5 pl-5 marker:font-medium marker:text-slate-500">
          {items}
        </ol>
      );
      continue;
    }
    if (line.trim() === "") {
      i++;
      continue;
    }
    blocks.push(
      <p key={`p-${i}`} className="my-2 text-sm leading-relaxed text-slate-700">
        {renderInline(line)}
      </p>
    );
    i++;
  }
  return <article className="max-w-3xl">{blocks}</article>;
}

export default async function RegionalApiKeyGuidePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mdPath = path.join(process.cwd(), "docs", "regional_api_key_issuance_guide.md");
  const text = fs.readFileSync(mdPath, "utf8");

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 shadow-md">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">FloXync · 글로벌 연동</p>
            <h1 className="text-xl font-black tracking-tight text-slate-900">국가별 API 키 발급 가이드</h1>
            <p className="text-xs text-muted-foreground">
              로그인한 대시보드 사용자 누구나 열람 가능합니다. 키 값 저장은 슈퍼관리자만 할 수 있습니다.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          render={<Link href="/dashboard/admin/regional-keys" />}
        >
          <ArrowLeft className="h-4 w-4" />
          API 키 관리로
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <GuideArticle text={text} />
      </div>

      <p className="text-center text-[11px] text-slate-400">
        원본: <code className="rounded bg-slate-100 px-1.5 py-0.5">docs/regional_api_key_issuance_guide.md</code>
      </p>
    </div>
  );
}
