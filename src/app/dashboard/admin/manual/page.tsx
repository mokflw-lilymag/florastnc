"use client";

import React from "react";
import { 
  Shield, Users, MessageSquare, CreditCard, 
  Settings, CheckCircle2, Info, ChevronRight,
  BookOpen, Star, HelpCircle
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function AdminManualPage() {
  const router = useRouter();

  const roles = [
    {
      title: "기본 관리자 (Super Admin)",
      icon: <Shield className="w-8 h-8 text-indigo-500" />,
      description: "플랫폼의 모든 권한을 가진 대표 관리자입니다.",
      tasks: [
        "전체 시스템 설정 및 보안 관리",
        "본사 직원(관리자) 계정 생성 및 권한 배정",
        "플랫폼 전용 공지사항 작성 및 관리",
        "모든 결제 및 정산 데이터 최종 승인"
      ],
      color: "bg-indigo-500/10 border-indigo-500/20"
    },
    {
      title: "운영 팀장 (Ops Manager)",
      icon: <Users className="w-8 h-8 text-emerald-500" />,
      description: "화원사 파트너 관계 및 서비스 품질을 관리합니다.",
      tasks: [
        "신규 화원사 가입 승인 및 서류 검토",
        "유입되는 상담 문의 적정 상담원 배정",
        "상담 품질 모니터링 및 완료된 상담 기록 검토",
        "플랫폼 파트너 대상 이벤트 및 정책 공지"
      ],
      color: "bg-emerald-500/10 border-emerald-500/20"
    },
    {
      title: "고객 상담원 (CS Specialist)",
      icon: <MessageSquare className="w-8 h-8 text-blue-500" />,
      description: "현장에서 화원사의 문의를 실시간으로 해결합니다.",
      tasks: [
        "1:1 실시간 채팅 상담 및 문제 해결",
        "리본 출력 및 프로그램 설치 가이드 제공",
        "화원사 불편 사항 접수 및 상급자 보고",
        "상담 종료 후 필요 시 상담 요약 기록"
      ],
      color: "bg-blue-500/10 border-blue-500/20"
    },
    {
      title: "재무 담당자 (Finance Manager)",
      icon: <CreditCard className="w-8 h-8 text-rose-500" />,
      description: "화원사 간 정산 및 구독료 결제를 관리합니다.",
      tasks: [
        "화원사 간 미수금/예치금 정산 데이터 검증",
        "PRO 플랜 등 유료 서비스 구독 결제 확인",
        "플랫폼 포인트 및 수수료 정책 관리",
        "월간 매출 통계 리포트 작성 및 보고"
      ],
      color: "bg-rose-500/10 border-rose-500/20"
    }
  ];

  return (
    <div className="flex-1 space-y-8 p-8 pt-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Badge variant="outline" className="mb-2 text-indigo-600 bg-indigo-50 border-indigo-200 uppercase tracking-widest text-[10px] font-black"> Floxync Headquarters </Badge>
          <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-slate-900" />
            본사 직무 관리 매뉴얼
          </h2>
          <p className="text-slate-500 font-medium">효율적인 플랫폼 운영을 위한 직책별 표준 업무 가이드라인입니다.</p>
        </div>
        <Button variant="ghost" className="text-slate-400 hover:text-slate-900 font-bold" onClick={() => router.back()}>
          돌아가기
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        {roles.map((role, idx) => (
          <Card key={idx} className={cn("border shadow-sm transition-all hover:shadow-md", role.color)}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="space-y-1">
                <CardTitle className="text-xl font-black">{role.title}</CardTitle>
                <CardDescription className="font-medium text-slate-500">{role.description}</CardDescription>
              </div>
              <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                {role.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">핵심 직책 업무 (Core Tasks)</h4>
                <div className="grid gap-2.5">
                  {role.tasks.map((task, tidx) => (
                    <div key={tidx} className="flex items-start gap-3 bg-white/50 p-3 rounded-xl border border-white/50">
                      <CheckCircle2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span className="text-sm font-medium text-slate-700 leading-snug">{task}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-slate-900 text-white border-none rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-3 mb-2">
                <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                <span className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em]">Management Tip</span>
            </div>
          <CardTitle className="text-2xl font-black">대표 관리자의 역할 (Representative Admin)</CardTitle>
          <CardDescription className="text-white/60 font-medium">
            시스템 초기 구축 단계에서는 별도의 직원이 없는 경우 모든 업무를 수행하며, 추후 조직 확장 시 관리자 페이지를 통해 권한을 배분합니다.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                  <h5 className="text-sm font-black mb-1">책임 경영</h5>
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium">모든 데이터의 최종 결정권을 가지며 시스템 보안 및 정책을 관리합니다.</p>
              </div>
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                  <h5 className="text-sm font-black mb-1">유연한 권한 체계</h5>
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium">직책별 로그인이 불가능한 상황에서는 대표 관리자가 원스톱으로 대응합니다.</p>
              </div>
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                  <h5 className="text-sm font-black mb-1">표준 업무 확산</h5>
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium">본 매뉴얼을 기반으로 추후 신규 직원을 교육하고 각 계정에 권한을 바인딩합니다.</p>
              </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Utility function to merge class names
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
