"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Truck, 
  Printer, 
  PlusCircle,
  BookOpen,
  CheckCircle2,
  Search,
  Keyboard,
  MousePointer2,
  FileSpreadsheet,
  Settings2,
  Download,
  ShieldAlert,
  ArrowRight,
  Store,
  Layers,
  Settings,
  ClipboardList,
  Monitor
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export function ManualDrawer() {
  const [searchQuery, setSearchQuery] = useState("");

  const sections = [
    {
      id: "step1-settings",
      title: "STEP 1. 환경설정 & 화원 정보 입력",
      icon: <Settings className="w-6 h-6 text-indigo-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 font-medium leading-relaxed">
            운영을 시작하기 전, 우리 매장의 정보를 시스템의 '기본형'으로 만듭니다.
          </p>
          <div className="p-5 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4">
             <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">1</div>
                <div>
                   <p className="text-xs font-black text-slate-800">[환경설정 &gt; 매장 정보]</p>
                   <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      상호명, 대표자, 사업자 번호, 연락처를 입력하세요. 여기서 입력한 정보가 **주문서 하단** 및 **정량화된 영수증**에 자동으로 반영됩니다.
                   </p>
                </div>
             </div>
             <div className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-black shrink-0">2</div>
                <div>
                   <p className="text-xs font-black text-slate-800">프린터 & 하드웨어 연결</p>
                   <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                      리본 프린터 기종을 선택하고 '연결 테스트'를 진행하세요. <Badge variant="outline" className="text-[9px] h-4">v25.0 Bridge</Badge>가 설치되어 있어야 합니다.
                   </p>
                </div>
             </div>
          </div>
        </div>
      )
    },
    {
      id: "step2-categories",
      title: "STEP 2. 카테고리 & 과제(관리 항목) 설정",
      icon: <Layers className="w-6 h-6 text-emerald-500" />,
      content: (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 font-medium italic">
            "복잡한 장부를 깔끔하게 나누는 기준이 됩니다."
          </p>
          <div className="p-6 bg-emerald-50/50 border border-emerald-100 rounded-3xl space-y-4">
             <div className="space-y-2">
                <p className="text-xs font-black text-emerald-700">📌 과제(Task) 관리란?</p>
                <p className="text-[11px] text-emerald-800/70 leading-relaxed font-semibold">
                   본점, 분점 혹은 품목별(꽃/난/부자재)로 분류를 나누는 기능입니다. 
                   이렇게 나눠두면 연말 정산 시 **"꽃에서만 얼마를 벌었는지"** 정확한 통계가 나옵니다.
                </p>
             </div>
             <div className="grid grid-cols-2 gap-3">
                <div className="p-4 bg-white rounded-2xl border border-emerald-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Config</p>
                   <p className="text-xs font-bold text-slate-800">카테고리 수정</p>
                   <p className="text-[10px] text-slate-500 mt-1">개업, 축하, 근조 등 분류 생성</p>
                </div>
                <div className="p-4 bg-white rounded-2xl border border-emerald-100">
                   <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Action</p>
                   <p className="text-xs font-bold text-slate-800">과제(지출) 설정</p>
                   <p className="text-[10px] text-slate-500 mt-1">임대료, 인건비 등 지출 항목</p>
                </div>
             </div>
          </div>
        </div>
      )
    },
    {
      id: "step3-master-data",
      title: "STEP 3. 기초 자료 일괄 등록 (엑셀)",
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
                   <h4 className="text-xl font-black italic">EXCEL LOAD SYSTEM</h4>
                   <p className="text-xs text-slate-400 font-medium">
                      일일이 하나씩 등록할 필요 없습니다. <br />
                      기존에 쓰시던 엑셀 자료를 단 5초 만에 시스템에 밀어넣으세요.
                   </p>
                </div>
             </div>
             
             <div className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
                <table className="w-full text-left">
                   <thead>
                      <tr className="bg-white/10 border-b border-white/5">
                         <th className="p-3 text-[10px] font-black text-slate-400">등록 항목</th>
                         <th className="p-3 text-[10px] font-black text-slate-400">방법</th>
                      </tr>
                   </thead>
                   <tbody className="text-[11px]">
                      <tr className="border-b border-white/5">
                         <td className="p-3 font-bold text-amber-400 whitespace-nowrap">상품 마스터 (Product)</td>
                         <td className="p-3 text-slate-300 font-medium">템플릿 다운로드 ➔ 상품명/원가 작성 ➔ 업로드</td>
                      </tr>
                      <tr>
                         <td className="p-3 font-bold text-blue-400 whitespace-nowrap">거래처 마스터 (Account)</td>
                         <td className="p-3 text-slate-300 font-medium">단골 퀵 업체, 거래 농장 리스트 일괄 등록</td>
                      </tr>
                   </tbody>
                </table>
             </div>
          </div>
        </div>
      )
    },
    {
      id: "step4-daily-ops",
      title: "STEP 4. 실전! 주문 접수 및 배송/정산",
      icon: <ClipboardList className="w-6 h-6 text-indigo-500" />,
      content: (
        <div className="space-y-4">
           <div className="flex flex-col md:flex-row gap-4 items-stretch">
             <div className="flex-1 p-5 rounded-2xl bg-slate-50 border border-slate-100 flex flex-col justify-between">
                <p className="text-xs font-black text-slate-400 mb-1 tracking-widest uppercase">01. 주문</p>
                <p className="text-sm font-bold text-slate-800">번호 4자리로 고객 조회</p>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">상담과 동시에 화면에 정보를 띄워 응대하세요.</p>
             </div>
             <div className="flex-1 p-5 rounded-2xl bg-indigo-50 border border-indigo-100 flex flex-col justify-between shadow-sm">
                <p className="text-xs font-black text-indigo-400 mb-1 tracking-widest uppercase">02. 출력</p>
                <p className="text-sm font-bold text-indigo-700">메시지 즉시 출력</p>
                <p className="text-[11px] text-indigo-600/70 mt-2 leading-relaxed">프린터 아이콘 한 번으로 퀄리티 높은 리본이 출력됩니다.</p>
             </div>
             <div className="flex-1 p-5 rounded-2xl bg-amber-50 border border-amber-100 flex flex-col justify-between">
                <p className="text-xs font-black text-amber-400 mb-1 tracking-widest uppercase">03. 정산</p>
                <p className="text-sm font-bold text-amber-700">실 배송비 입력</p>
                <p className="text-[11px] text-amber-600/70 mt-2 leading-relaxed">퀵 비용을 입력하면 장부에 자동 기록됩니다.</p>
             </div>
          </div>
        </div>
      )
    }
  ];

  const filteredSections = useMemo(() => {
    if (!searchQuery) return sections;
    return sections.filter(s => 
      s.title.includes(searchQuery) || s.id.includes(searchQuery)
    );
  }, [searchQuery]);

  return (
    <Dialog>
      <DialogTrigger className="relative group flex max-w-full min-w-0 shrink items-center gap-2 rounded-full border-2 border-indigo-200 bg-white px-3 py-2 font-bold text-indigo-700 shadow-lg shadow-indigo-100/50 outline-none cursor-pointer transition-all hover:border-indigo-500 hover:bg-indigo-50 md:h-11 md:gap-3 md:px-5">
          <BookOpen className="h-4 w-4 shrink-0 text-indigo-500 transition-transform group-hover:rotate-6 md:h-5 md:w-5" />
          <span className="hidden min-w-0 truncate text-xs sm:inline sm:text-sm md:max-w-[11rem] lg:max-w-none">
            플록싱크 완벽 세팅 가이드
          </span>
          <span className="text-xs sm:hidden">가이드</span>
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
                   <Badge className="bg-emerald-600 border-0 px-3 py-1 font-black tracking-widest text-[10px] text-white">ONBOARDING PASS</Badge>
                   <Badge variant="outline" className="text-white/60 border-white/20 text-[10px]">MASTER MANUAL</Badge>
                </div>
                <DialogTitle className="text-4xl font-black text-white tracking-tighter leading-none mb-4 uppercase">
                   Step-By-Step <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400 italic">Mastering</span>
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium text-base leading-relaxed max-w-2xl">
                   사장님, 환경설정부터 기초 자료 업로드까지 순서대로 따라오시면 <br /> 
                   복잡했던 화원 운영이 마법처럼 시스템화됩니다.
                </DialogDescription>
             </div>

             <div className="mt-8 relative z-10">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <Input 
                   value={searchQuery}
                   onChange={(e) => setSearchQuery(e.target.value)}
                   placeholder="어느 단계가 궁금하신가요? (예: 과제 설정, 매장 정보)" 
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
                     <div className="pl-6 md:pl-20">
                        {section.content}
                     </div>
                  </div>
               ))}

               {/* Quick Buttons Grid */}
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12 bg-slate-50 p-8 rounded-[3rem] border border-slate-100">
                   <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl group cursor-pointer hover:shadow-xl hover:shadow-indigo-500/10 transition-all border border-slate-100">
                      <Store className="w-8 h-8 text-indigo-500 mb-2 group-hover:scale-110 transition-all" />
                      <p className="font-bold text-xs">화원 정보 설정</p>
                   </div>
                   <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl group cursor-pointer hover:shadow-xl hover:shadow-emerald-500/10 transition-all border border-slate-100">
                      <Layers className="w-8 h-8 text-emerald-500 mb-2 group-hover:scale-110 transition-all" />
                      <p className="font-bold text-xs">과제/분류 마스터</p>
                   </div>
                   <div className="flex flex-col items-center justify-center p-6 bg-white rounded-3xl group cursor-pointer hover:shadow-xl hover:shadow-amber-500/10 transition-all border border-slate-100">
                      <FileSpreadsheet className="w-8 h-8 text-amber-500 mb-2 group-hover:scale-110 transition-all" />
                      <p className="font-bold text-xs">엑셀 대량 업로드</p>
                   </div>
               </div>
            </div>
          </div>

          <div className="px-10 py-6 bg-white border-t flex flex-col sm:flex-row items-center justify-between gap-4 font-bold shrink-0">
             <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-xs text-slate-800">Support Center Open: 1588-8888</p>
             </div>
             <p className="text-[10px] text-slate-400 uppercase tracking-widest">&copy; 2026 Mokflw-Lilymag Floxync Project</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
