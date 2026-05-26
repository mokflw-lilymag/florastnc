'use client';

import { getMessages } from "@/i18n/getMessages";
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  RefreshCw, 
  Globe, 
  Instagram, 
  Zap,
  MessageSquare,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { toBaseLocale } from '@/i18n/config';
import { pickUiText } from '@/i18n/pick-ui-text';

export default function MarketingAdmin() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState({
    instagram_connected: false,
    naver_connected: false
  });
  
  const supabase = createClient();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const L = (
    ko: string,
    en: string,
    vi?: string,
    ja?: string,
    zh?: string,
    es?: string,
    pt?: string,
    fr?: string,
    de?: string,
    ru?: string,
  ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);

  useEffect(() => {
    fetchConnectionStatus();
    
    const searchParams = new URLSearchParams(window.location.search);
    const error = searchParams.get('error');
    const success = searchParams.get('success');
    
    if (error) {
      toast.error(`연동 실패: ${error}`);
    } else if (success) {
      toast.success('성공적으로 연동되었습니다!');
    }
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: tenantUser } = await supabase
        .from('tenant_users')
        .select('tenant_id')
        .eq('user_id', user.id)
        .limit(1)
        .single();
        
      if (!tenantUser) return;
      
      const { data: integration } = await supabase
        .from('tenant_postiz_integrations')
        .select('instagram_connected')
        .eq('tenant_id', tenantUser.tenant_id)
        .maybeSingle();
        
      setStatus({
        instagram_connected: !!integration?.instagram_connected,
        naver_connected: false // TODO: Naver auth check
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectPostiz = async () => {
    toast.info("Instagram / Threads 연동 페이지로 이동합니다...");
    window.location.href = "/api/marketing/postiz/auth?integration=instagram";
  };
  
  const handleConnectNaver = async () => {
    toast.info("Naver 블로그 연동 페이지로 이동합니다...");
    window.location.href = "/api/auth/naver";
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-slate-900 text-white p-2 rounded-lg">
              <Globe className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">{tf.f02291}</h1>
          </div>
          <p className="text-muted-foreground">마케팅 자동화를 위한 소셜 채널 연동 현황입니다. 복잡한 설정 없이 원클릭으로 채널을 연결하세요.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Postiz (Global SNS) Card */}
        <Card className="border-none shadow-lg ring-1 ring-slate-100 dark:ring-slate-800 overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                <Instagram className="w-8 h-8 text-pink-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-extrabold">
                  {L("Meta & Threads", "Meta & Threads", "Meta & Threads")}
                </CardTitle>
                <CardDescription className="text-xs mt-1">Instagram, Facebook, Threads 통합 연동</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-semibold text-slate-500">연동 상태</span>
              {status.instagram_connected ? (
                <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full text-xs">
                  <CheckCircle2 className="w-4 h-4" /> 연결됨
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-full text-xs">
                  <AlertCircle className="w-4 h-4" /> 미연결
                </div>
              )}
            </div>
            <Button 
              className={`w-full font-bold h-12 ${status.instagram_connected ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-pink-600 hover:bg-pink-700 text-white'}`}
              onClick={handleConnectPostiz}
            >
              {status.instagram_connected ? "연동 관리하기" : "인스타그램 / 쓰레드 연동 시작"}
            </Button>
            <p className="text-[11px] text-muted-foreground mt-4 text-center">
              하나의 버튼으로 인스타그램 피드, 릴스, 페이스북, 쓰레드까지 한 번에 발행됩니다.
            </p>
          </CardContent>
        </Card>

        {/* Naver (Local SNS) Card */}
        <Card className="border-none shadow-lg ring-1 ring-slate-100 dark:ring-slate-800 overflow-hidden">
          <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-slate-800 rounded-xl shadow-sm">
                <Zap className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <CardTitle className="text-lg font-extrabold">
                  {L("네이버 블로그", "Naver Blog", "Naver Blog")}
                </CardTitle>
                <CardDescription className="text-xs mt-1">한국 전용 로컬 채널 연동</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <span className="text-sm font-semibold text-slate-500">연동 상태</span>
              {status.naver_connected ? (
                <div className="flex items-center gap-2 text-emerald-600 font-bold bg-emerald-50 px-3 py-1 rounded-full text-xs">
                  <CheckCircle2 className="w-4 h-4" /> 연결됨
                </div>
              ) : (
                <div className="flex items-center gap-2 text-slate-500 font-bold bg-slate-100 px-3 py-1 rounded-full text-xs">
                  <AlertCircle className="w-4 h-4" /> 미연결
                </div>
              )}
            </div>
            <Button 
              className={`w-full font-bold h-12 ${status.naver_connected ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-green-600 hover:bg-green-700 text-white'}`}
              onClick={handleConnectNaver}
            >
              {status.naver_connected ? "연동 관리하기" : "네이버 블로그 연동 시작"}
            </Button>
            <p className="text-[11px] text-muted-foreground mt-4 text-center">
              인스타그램 글이 작성될 때 블로그 형식으로 변환되어 자동 포스팅됩니다.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
