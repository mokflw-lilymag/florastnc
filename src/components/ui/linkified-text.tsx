"use client";

import { Fragment } from "react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const URL_RE = /https?:\/\/[^\s<]+[^<.,:;"')\]\s]/gi;

function linkifyLine(line: string, keyBase: string): ReactNode {
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(URL_RE.source, "gi");
  while ((m = re.exec(line)) !== null) {
    if (m.index > last) {
      nodes.push(<Fragment key={`${keyBase}-t${last}`}>{line.slice(last, m.index)}</Fragment>);
    }
    const href = m[0];
    nodes.push(
      <a
        key={`${keyBase}-u${m.index}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="underline font-medium text-primary hover:opacity-90 break-all"
      >
        {href}
      </a>
    );
    last = m.index + href.length;
  }
  if (last < line.length) {
    nodes.push(<Fragment key={`${keyBase}-e`}>{line.slice(last)}</Fragment>);
  }
  if (!nodes.length) return line;
  return <>{nodes}</>;
}

/** 본문에 http(s) 링크가 있으면 새 탭으로 열리는 링크로 표시합니다. */
export function LinkifiedText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const lines = text.split("\n");
  return (
    <span className={cn(className)}>
      {lines.map((line, li) => (
        <Fragment key={li}>
          {li > 0 ? <br /> : null}
          {linkifyLine(line, `L${li}`)}
        </Fragment>
      ))}
    </span>
  );
}
