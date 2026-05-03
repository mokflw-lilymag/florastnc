"use client";

import { useState, useMemo, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Printer,
  BookOpen,
  Search,
  FileSpreadsheet,
  Settings2,
  Download,
  Store,
  Layers,
  Settings,
  ClipboardList,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { getMessages } from "@/i18n/getMessages";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import type { ManualDrawerMessages } from "@/i18n/types";

type Tr = (ko: string, en: string, vi?: string) => string;

type Section = {
  id: string;
  title: string;
  icon: ReactNode;
  content: ReactNode;
};

function buildSections(M: ManualDrawerMessages, tr: Tr): Section[] {
  return [
    {
      id: "step1-settings",
      title: M.step1.title,
      icon: <Settings className="w-6 h-6 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 font-medium leading-relaxed">{M.step1.intro}</p>
          <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">
                1
              </div>
              <div>
                <p className="text-xs font-black text-slate-800">{M.step1.item1Heading}</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">{M.step1.item1Body}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">
                2
              </div>
              <div>
                <p className="text-xs font-black text-slate-800">{M.step1.item2Heading}</p>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  {M.step1.bridgeBefore}
                  <Badge variant="outline" className="text-[9px] h-4">
                    {tr("v25.0 브릿지", "v25.0 Bridge", "v25.0 Bridge")}
                  </Badge>
                  {M.step1.bridgeAfter}
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "step2-categories",
      title: M.step2.title,
      icon: <Layers className="w-6 h-6 text-emerald-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 font-medium italic">{M.step2.quote}</p>
          <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl space-y-4">
            <div className="space-y-2">
              <p className="text-xs font-black text-emerald-700">{M.step2.taskHeading}</p>
              <p className="text-[11px] text-emerald-800/70 leading-relaxed font-semibold">{M.step2.taskBody}</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-white rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                  {tr("설정", "Config", "Cấu hình")}
                </p>
                <p className="text-xs font-bold text-slate-800">{M.step2.categoryTitle}</p>
                <p className="text-[10px] text-slate-500 mt-1">{M.step2.categoryDesc}</p>
              </div>
              <div className="p-4 bg-white rounded-2xl border border-emerald-100">
                <p className="text-[10px] font-black text-slate-400 uppercase mb-1">
                  {tr("작업", "Action", "Thao tác")}
                </p>
                <p className="text-xs font-bold text-slate-800">{M.step2.expenseTitle}</p>
                <p className="text-[10px] text-slate-500 mt-1">{M.step2.expenseDesc}</p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "step3-master-data",
      title: M.step3.title,
      icon: <FileSpreadsheet className="w-6 h-6 text-amber-500" />,
      content: (
        <div className="space-y-4">
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
            <div className="relative z-10 flex flex-col md:flex-row gap-6 items-center">
              <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-500/20 rotate-3">
                <Download className="w-10 h-10 text-white" />
              </div>
              <div className="flex-1 space-y-2">
                <h4 className="text-xl font-black italic">
                  {tr("엑셀 일괄 등록", "Excel bulk import", "Nhập Excel hàng loạt")}
                </h4>
                <p className="text-xs text-slate-400 font-medium">
                  {M.step3.excelLine1}
                  <br />
                  {M.step3.excelLine2}
                </p>
              </div>
            </div>

            <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-white/10 border-b border-white/5">
                    <th className="p-3 text-[10px] font-black text-slate-400">{M.step3.tableCol1}</th>
                    <th className="p-3 text-[10px] font-black text-slate-400">{M.step3.tableCol2}</th>
                  </tr>
                </thead>
                <tbody className="text-[11px]">
                  <tr className="border-b border-white/5">
                    <td className="p-3 font-bold text-amber-400 whitespace-nowrap">{M.step3.productRow}</td>
                    <td className="p-3 text-slate-300 font-medium">{M.step3.productMethod}</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-blue-400 whitespace-nowrap">{M.step3.accountRow}</td>
                    <td className="p-3 text-slate-300 font-medium">{M.step3.accountMethod}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "step4-daily-ops",
      title: M.step4.title,
      icon: <ClipboardList className="w-6 h-6 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-stretch">
            <div className="flex-1 p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
              <p className="text-xs font-black text-slate-400 mb-1 tracking-widest uppercase">{M.step4.o1Label}</p>
              <p className="text-sm font-bold text-slate-800">{M.step4.o1Title}</p>
              <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">{M.step4.o1Desc}</p>
            </div>
            <div className="flex-1 p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col justify-between shadow-sm">
              <p className="text-xs font-black text-indigo-400 mb-1 tracking-widest uppercase">{M.step4.o2Label}</p>
              <p className="text-sm font-bold text-indigo-700">{M.step4.o2Title}</p>
              <p className="text-[11px] text-indigo-600/70 mt-2 leading-relaxed">{M.step4.o2Desc}</p>
            </div>
            <div className="flex-1 p-5 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col justify-between">
              <p className="text-xs font-black text-amber-400 mb-1 tracking-widest uppercase">{M.step4.o3Label}</p>
              <p className="text-sm font-bold text-amber-700">{M.step4.o3Title}</p>
              <p className="text-[11px] text-amber-600/70 mt-2 leading-relaxed">{M.step4.o3Desc}</p>
            </div>
          </div>
        </div>
      ),
    },
  ];
}

export function ManualDrawer() {
  const [searchQuery, setSearchQuery] = useState("");
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
  const M = getMessages(locale).manualDrawer;

  const sections = useMemo(() => buildSections(getMessages(locale).manualDrawer, tr), [locale]);

  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.trim();
    return sections.filter((s) => s.title.includes(q) || s.id.includes(q));
  }, [sections, searchQuery]);

  return (
    <Dialog>
      <DialogTrigger className="relative group flex max-w-full min-w-0 shrink items-center gap-2 rounded-full border-2 border-indigo-200 bg-white px-3 py-2 font-bold text-indigo-700 shadow-lg shadow-indigo-100/50 outline-none cursor-pointer transition-all hover:border-indigo-500 hover:bg-indigo-50 md:h-11 md:gap-3 md:px-5">
        <BookOpen className="h-4 w-4 shrink-0 text-indigo-500 transition-transform group-hover:rotate-6 md:h-5 md:w-5" />
        <span className="hidden min-w-0 truncate text-xs sm:inline sm:text-sm md:max-w-[11rem] lg:max-w-none">
          {M.triggerTitle}
        </span>
        <span className="text-xs sm:hidden">{M.triggerShort}</span>
        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-indigo-100 text-[10px] font-black text-indigo-600 animate-bounce group-hover:animate-none">
          F1
        </div>
      </DialogTrigger>

      <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 border-0 shadow-[0_32px_128px_rgba(0,0,0,0.25)] overflow-hidden rounded-[2.5rem] bg-white">
        <div className="flex flex-col h-[90vh] sm:max-h-[850px]">
          <DialogHeader className="p-10 bg-slate-950 text-white shrink-0 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[100px] -mr-48 -mt-48" />
            <div className="relative z-10">
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <Badge className="bg-emerald-600 border-0 px-3 py-1 font-black tracking-widest text-[10px] text-white">
                  {tr("온보딩 패스", "Onboarding pass", "Lộ trình onboarding")}
                </Badge>
                <Badge variant="outline" className="text-white/60 border-white/20 text-[10px]">
                  {tr("마스터 매뉴얼", "Master manual", "Hướng dẫn tổng")}
                </Badge>
              </div>
              <DialogTitle className="text-4xl font-black text-white tracking-tighter leading-none mb-4 uppercase">
                {tr("단계별", "Step by step", "Từng bước")}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 italic">
                  {tr("완전 정복", "Mastery", "Toàn diện")}
                </span>
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-medium text-base leading-relaxed max-w-2xl">
                {M.dialogLine1}
                <br />
                {M.dialogLine2}
              </DialogDescription>
            </div>

            <div className="mt-8 relative z-10">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={M.searchPlaceholder}
                className="h-14 pl-12 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus:ring-indigo-500 focus:border-indigo-500 rounded-2xl backdrop-blur-md text-base"
              />
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto outline-none custom-scrollbar p-10">
            <div className="space-y-16 pb-12">
              {filteredSections.map((section) => (
                <div key={section.id} className="space-y-6">
                  <div className="flex items-center gap-4 border-l-4 border-indigo-600 pl-6 group">
                    <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-white group-hover:scale-110 transition-all shadow-sm">
                      {section.icon}
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">{section.title}</h3>
                  </div>
                  <div className="pl-6 md:pl-20">{section.content}</div>
                </div>
              ))}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 bg-slate-50 p-8 rounded-[3rem] border border-slate-100">
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl group cursor-pointer hover:shadow-xl hover:shadow-indigo-500/10 transition-all border border-slate-100">
                  <Store className="w-8 h-8 text-indigo-500 mb-2 group-hover:scale-110 transition-all" />
                  <p className="font-bold text-xs">{M.quickStore}</p>
                </div>
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl group cursor-pointer hover:shadow-xl hover:shadow-emerald-500/10 transition-all border border-slate-100">
                  <Layers className="w-8 h-8 text-emerald-500 mb-2 group-hover:scale-110 transition-all" />
                  <p className="font-bold text-xs">{M.quickTask}</p>
                </div>
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl group cursor-pointer hover:shadow-xl hover:shadow-amber-500/10 transition-all border border-slate-100">
                  <FileSpreadsheet className="w-8 h-8 text-amber-500 mb-2 group-hover:scale-110 transition-all" />
                  <p className="font-bold text-xs">{M.quickExcel}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-10 py-6 bg-white border-t flex flex-col sm:flex-row items-center justify-between gap-4 font-bold shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs text-slate-800">
                {tr("고객센터: 1588-8888", "Support: 1588-8888", "Hỗ trợ: 1588-8888")}
              </p>
            </div>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest">
              {tr(
                "© 2026 Mokflw-Lilymag Floxync Project",
                "© 2026 Mokflw-Lilymag Floxync Project",
                "© 2026 Dự án Floxync (Mokflw-Lilymag)"
              )}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
