"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Circle, ExternalLink, PenLine } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { toBaseLocale } from "@/i18n/config";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { pickUiText } from "@/i18n/pick-ui-text";

const CHECKLIST_COUNT = 7;

const STORAGE_KEY = (tenantId: string, year: number) =>
  `florasync.kr-tax-assist.v1.${tenantId}.${year}`;

type Props = {
  viewYear: number;
};

export function KoreaTaxAssistPanel({ viewYear }: Props) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const fm = useCallback(
    (ko: string, en: string) => pickUiText(baseLocale, ko, en),
    [baseLocale],
  );

  const { tenantId } = useAuth();

  const [checks, setChecks] = useState<boolean[]>(() => Array(CHECKLIST_COUNT).fill(false));

  useEffect(() => {
    if (!tenantId) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY(tenantId, viewYear));
      if (raw) {
        const parsed = JSON.parse(raw) as boolean[];
        if (Array.isArray(parsed) && parsed.length === CHECKLIST_COUNT) {
          setChecks(parsed);
          return;
        }
      }
    } catch {
      /* ignore */
    }
    setChecks(Array(CHECKLIST_COUNT).fill(false));
  }, [tenantId, viewYear]);

  const persistChecks = useCallback(
    (next: boolean[]) => {
      setChecks(next);
      if (tenantId) {
        try {
          localStorage.setItem(STORAGE_KEY(tenantId, viewYear), JSON.stringify(next));
        } catch {
          /* ignore */
        }
      }
    },
    [tenantId, viewYear],
  );

  const checklistLabels = useMemo(
    () => [
      fm("홈택스 회원·공동·금융 인증서를 준비했습니다.", "Prepared Hometax login and certificate."),
      fm(
        "지출 메뉴에서 사입·임차·공과금 등 경비를 날짜·분류별로 입력했습니다.",
        "Entered purchases, rent, utilities, etc. in Expenses with dates and categories.",
      ),
      fm("이 앱의 매출(주문)이 해당 연도에 빠짐없이 반영됐는지 확인했습니다.", "Verified sales (orders) in this app for the year."),
      fm("사업장 현황신고(간편장부) 해당 여부와 제출 기한을 확인했습니다.", "Checked simplified books / business status filing duty and deadlines."),
      fm("종합소득세 신고 대상·기한을 확인했습니다.", "Checked comprehensive income tax filing scope and deadline."),
      fm("현금영수증·세금계산서 의무(해당 시)를 확인했습니다.", "Checked cash receipt / e-tax invoice duties if applicable."),
      fm("필요 시 세무사·홈택스 안내를 참고하기로 했습니다.", "Will use a tax accountant or Hometax guidance if needed."),
    ],
    [fm],
  );

  const krOnlyNote =
    baseLocale === "ko" ? null : (
      <p className="text-[11px] text-slate-500 mb-3">
        {fm(
          "이 블록은 대한민국 사업장 기준 안내입니다. 해외 사업자에게는 참고용입니다.",
          "This block is for Republic of Korea tax practice; informational for others.",
        )}
      </p>
    );

  return (
    <div className="space-y-6">
      {krOnlyNote}

      <Card className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-gradient-to-br from-slate-50 to-white">
        <CardHeader className="pb-2 border-b border-slate-100 bg-slate-900 text-white">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            {fm("한국 세무·장부 실무 체크", "Korea tax & bookkeeping checklist")}
          </CardTitle>
          <CardDescription className="text-slate-300 text-xs">
            {fm(
              "법적 효력 있는 신고 대행이 아니라, 꽃집 사장님이 빠뜨리기 쉬운 준비물을 정리한 것입니다.",
              "Not legal filing advice—a practical checklist for small shops.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {checklistLabels.map((label, i) => (
            <label
              key={i}
              className="flex items-start gap-3 p-3 rounded-xl border border-slate-100 bg-white hover:bg-slate-50/80 cursor-pointer transition-colors"
            >
              <Checkbox
                checked={checks[i]}
                onCheckedChange={(v) => {
                  const next = [...checks];
                  next[i] = Boolean(v);
                  persistChecks(next);
                }}
                className="mt-0.5"
              />
              <span className="text-sm text-slate-700 leading-snug">{label}</span>
            </label>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href="https://www.hometax.go.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              홈택스 <ExternalLink className="h-3 w-3 ml-1" />
            </a>
            <a
              href="https://www.nts.go.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              국세청 <ExternalLink className="h-3 w-3 ml-1" />
            </a>
            <Link
              href="/dashboard/expenses"
              className="inline-flex items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100"
            >
              <PenLine className="h-3.5 w-3.5 mr-1.5" />
              {fm("지출 입력·관리", "Enter & manage expenses")}
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-slate-200 rounded-2xl bg-slate-50/50">
        <CardHeader className="py-3">
          <CardTitle className="text-sm font-bold text-slate-800 flex items-center gap-2">
            <Circle className="h-4 w-4 text-slate-400" />
            {fm("자료 준비 가이드 (요약)", "Document tips (summary)")}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 pb-4 text-xs text-slate-600 space-y-2 leading-relaxed">
          <p>
            {fm(
              "① 매출: 이 앱 주문(취소 제외) 합계와 실제 입금·카드 단말 정산을 대조해 보세요.",
              "① Sales: compare app orders (excl. cancelled) with actual deposits and card-terminal settlements.",
            )}
          </p>
          <p>
            {fm(
              "② 매입·경비: 지출 화면에서 거래처·분류를 맞춰 두면 아래 요약·CSV 다운로드에 반영됩니다.",
              "② Expenses: use the Expenses screen with supplier and category so summaries and CSV export stay accurate.",
            )}
          </p>
          <p>
            {fm(
              "③ 화훼(농산물) 면세 등 사업 형태는 세무사·국세청 안내가 우선입니다.",
              "③ Tax treatment (e.g. agricultural exemption) follows NTS / your accountant.",
            )}
          </p>
          <Link
            href="/dashboard/expenses"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {fm("지출 화면 열기", "Open expenses")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
