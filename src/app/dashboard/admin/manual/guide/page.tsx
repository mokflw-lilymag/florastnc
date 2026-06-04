import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { ReactNode } from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, ExternalLink } from "lucide-react";

export const metadata = {
  title: "통합 운영·고객 안내 매뉴얼 | FloXync",
  description: "슈퍼관리자·CS용 통합 매뉴얼 — 매장 교육·온보딩·연동 설명",
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
    const href = m[2];
    const isExternal = href.startsWith("http") || href.startsWith("/");
    parts.push(
      <a
        key={`${m.index}-a`}
        href={href}
        className="font-medium text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
        {...(href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
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
    if (line.startsWith("|") && lines[i + 1]?.includes("---")) {
      const headerCells = line
        .split("|")
        .map((c) => c.trim())
        .filter(Boolean);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) {
        rows.push(
          lines[i]!
            .split("|")
            .map((c) => c.trim())
            .filter(Boolean)
        );
        i++;
      }
      blocks.push(
        <div key={`table-${i}`} className="my-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {headerCells.map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-slate-700">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} className="border-t border-slate-100">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-600">
                      {renderInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
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
    if (line.startsWith("> ")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i]!.startsWith("> ")) {
        quoteLines.push(lines[i]!.slice(2));
        i++;
      }
      blocks.push(
        <blockquote
          key={`q-${i}`}
          className="my-4 border-l-4 border-indigo-300 bg-indigo-50/50 px-4 py-2 text-sm text-slate-700"
        >
          {quoteLines.map((ql, qi) => (
            <p key={qi} className="my-1">
              {renderInline(ql)}
            </p>
          ))}
        </blockquote>
      );
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

export default async function SuperAdminOperationsManualPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const mdPath = path.join(process.cwd(), "docs", "super_admin_operations_manual.md");
  const text = fs.readFileSync(mdPath, "utf8");

  return (
    <div className="container mx-auto max-w-4xl space-y-6 p-6 pb-16">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-slate-800 to-slate-950 shadow-md">
            <BookOpen className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">FloXync · Headquarters</p>
            <h1 className="text-xl font-black tracking-tight text-slate-900">통합 운영·고객 안내 매뉴얼</h1>
            <p className="text-xs text-muted-foreground">
              CS·온보딩·교육용 — 매장(사장님) 설명 시 이 문서를 기준으로 안내하세요.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" render={<Link href="/dashboard/admin/manual" />} nativeButton={false}>
            <ArrowLeft className="h-4 w-4" />
            역할별 요약
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" render={<Link href="/docs/manual" target="_blank" />} nativeButton={false}>
            <ExternalLink className="h-4 w-4" />
            사장님 HTML 매뉴얼
          </Button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm ring-1 ring-slate-100">
        <GuideArticle text={text} />
      </div>

      <p className="text-center text-[11px] text-slate-400">
        원본: <code className="rounded bg-slate-100 px-1.5 py-0.5">docs/super_admin_operations_manual.md</code>
      </p>
    </div>
  );
}
