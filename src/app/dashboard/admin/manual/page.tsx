"use client";
import { getMessages } from "@/i18n/getMessages";

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
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function AdminManualPage() {
  const router = useRouter();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const roles = [
    {
      title: tf.f01004,
      icon: <Shield className="w-8 h-8 text-indigo-500" />,
      description: tf.f02153,
      tasks: [
        tf.f01802,
        tf.f01274,
        tf.f02148,
        tf.f01194
      ],
      color: "bg-indigo-500/10 border-indigo-500/20"
    },
    {
      title: tf.f01635,
      icon: <Users className="w-8 h-8 text-emerald-500" />,
      description: tf.f02214,
      tasks: [
        tf.f01497,
        tf.f01659,
        tf.f01338,
        tf.f02150
      ],
      color: "bg-emerald-500/10 border-emerald-500/20"
    },
    {
      title: tf.f00937,
      icon: <MessageSquare className="w-8 h-8 text-blue-500" />,
      description: tf.f02184,
      tasks: [
        tf.f00818,
        tf.f01132,
        tf.f02212,
        tf.f01337
      ],
      color: "bg-blue-500/10 border-blue-500/20"
    },
    {
      title: tf.f01766,
      icon: <CreditCard className="w-8 h-8 text-rose-500" />,
      description: tf.f02211,
      tasks: [
        tf.f02210,
        tf.f02285,
        tf.f02151,
        tf.f01647
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
            {tf.f01271}
          </h2>
          <p className="text-slate-500 font-medium">{tf.f02234}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="bg-slate-900 hover:bg-slate-800 text-white font-bold gap-2"
            onClick={() => router.push("/dashboard/admin/manual/guide")}
          >
            <BookOpen className="w-4 h-4" />
            통합 운영 매뉴얼
          </Button>
          <Button variant="ghost" className="text-slate-400 hover:text-slate-900 font-bold" onClick={() => router.back()}>
            {tf.f00159}
          </Button>
        </div>
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
                <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">{tf.f02181}</h4>
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
          <CardTitle className="text-2xl font-black">{tf.f01082}</CardTitle>
          <CardDescription className="text-white/60 font-medium">
            {tf.f01485}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                  <h5 className="text-sm font-black mb-1">{tf.f01975}</h5>
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium">{tf.f01195}</p>
              </div>
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                  <h5 className="text-sm font-black mb-1">{tf.f01658}</h5>
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium">{tf.f01963}</p>
              </div>
              <div className="bg-white/10 p-5 rounded-2xl border border-white/10">
                  <h5 className="text-sm font-black mb-1">{tf.f02123}</h5>
                  <p className="text-[11px] text-white/40 leading-relaxed font-medium">{tf.f01261}</p>
              </div>
          </div>
        </CardContent>
      </Card>

      {/* 고객센터 (카카오채널) 영역 */}
      <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-blue-100 rounded-[2rem] overflow-hidden">
        <CardHeader className="p-8 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <MessageSquare className="w-5 h-5 text-blue-500" />
            <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em]">Contact Support</span>
          </div>
          <CardTitle className="text-2xl font-black text-slate-900">도움이 필요하신가요?</CardTitle>
          <CardDescription className="text-slate-600 font-medium">
            매뉴얼에 없는 내용이거나 추가 문의사항이 있으시다면 카카오톡 채널로 언제든 문의해주세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 pt-4">
          <Button 
            className="bg-[#FEE500] hover:bg-[#FDD800] text-[#371D1E] font-black border border-yellow-400/50 shadow-sm rounded-xl px-6 py-6 h-auto flex items-center gap-3 transition-transform hover:scale-[1.02]"
            onClick={() => window.open('https://pf.kakao.com/', '_blank')}
          >
            <MessageSquare className="w-5 h-5 fill-[#371D1E]" />
            <div className="text-left">
              <div className="text-sm">카카오톡 비즈니스 채널</div>
              <div className="text-lg">1:1 문의하기</div>
            </div>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// Utility function to merge class names
function cn(...classes: any[]) {
  return classes.filter(Boolean).join(" ");
}
