"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Stethoscope } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SELF_CHECK_GUIDE_MARKDOWN, type SelfCheckItem } from "@/lib/support-tickets/self-check-guide";

export function SupportSelfCheckPanel() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<SelfCheckItem[]>([]);
  const [summary, setSummary] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/support/self-check", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setItems((json.items as SelfCheckItem[]) ?? []);
        setSummary((json.summary as string) ?? "");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Card className="border-emerald-200/80 bg-emerald-50/30">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Stethoscope className="h-5 w-5 text-emerald-600" />
          셀프 점검 (30초)
        </CardTitle>
        <p className="text-sm text-slate-600">{summary || "문의 전 아래 항목을 확인해 보세요."}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li
                key={item.id}
                className="flex items-start gap-2 rounded-lg border bg-white px-3 py-2 text-sm"
              >
                <Badge
                  className={
                    item.severity === "ok"
                      ? "bg-emerald-100 text-emerald-800"
                      : item.severity === "error"
                        ? "bg-red-100 text-red-800"
                        : "bg-amber-100 text-amber-800"
                  }
                >
                  {item.severity === "ok" ? "OK" : item.severity === "error" ? "!" : "?"}
                </Badge>
                <div>
                  <p className="font-medium text-slate-800">{item.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{item.hint}</p>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="prose prose-sm max-w-none text-slate-700 border-t pt-4">
          {SELF_CHECK_GUIDE_MARKDOWN.split("\n").map((line, i) => {
            if (line.startsWith("## ")) {
              return (
                <h3 key={i} className="text-base font-bold mt-2 mb-1">
                  {line.replace("## ", "")}
                </h3>
              );
            }
            if (line.startsWith("### ")) {
              return (
                <h4 key={i} className="text-sm font-semibold mt-2 mb-0.5">
                  {line.replace("### ", "")}
                </h4>
              );
            }
            if (line.startsWith("- ")) {
              return (
                <p key={i} className="text-xs ml-2 my-0.5">
                  • {line.slice(2)}
                </p>
              );
            }
            if (!line.trim()) return <br key={i} />;
            return (
              <p key={i} className="text-xs my-1">
                {line}
              </p>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
