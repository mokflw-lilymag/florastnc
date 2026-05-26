'use client';

import { getMessages } from "@/i18n/getMessages";
import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Save, 
  RefreshCw, 
  Zap, 
  Lock,
  Brain,
  Workflow
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { RevenueIntegrationsPanel } from '@/components/admin/revenue-integrations-panel';
import type { RevenueIntegrationsConfig, RevenueCouponLimitsConfig } from '@/lib/revenue/types';

export default function AdminMarketingSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    naver_client_id: '',
    naver_client_secret: '',
    gemini_key: '',
    openai_key: '',
    anthropic_key: ''
  });

  const supabase = createClient();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const tr = (
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
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    const { data, error } = await supabase
      .from('platform_config')
      .select('*')
      .eq('key', 'marketing_keys')
      .maybeSingle();
    
    if (data && data.value) {
      setSettings(prev => ({ ...prev, ...data.value }));
    }
  };

  const handleSaveKeys = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('platform_config')
        .upsert({
          key: 'marketing_keys',
          value: settings,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
      toast.success(tf.f01137);
    } catch (err: any) {
      toast.error(tf.f01770 + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevenueSave = async (key: string, value: RevenueIntegrationsConfig | RevenueCouponLimitsConfig) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('platform_config')
        .upsert({
          key,
          value,
          updated_at: new Date().toISOString()
        }, { onConflict: 'key' });

      if (error) throw error;
    } catch (err: any) {
      toast.error(tf.f01770 + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-5xl animate-in fade-in duration-500">
      <div className="flex justify-between items-end mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-indigo-600 text-white p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase">
              {tr(
                "마케팅 마스터 키",
                "Marketing master keys",
                "Khóa marketing chính",
                "マーケティングマスターキー",
                "营销主密钥",
                "Claves maestras de marketing",
                "Chaves mestras de marketing",
                "Clés marketing principales",
                "Marketing-Hauptschlüssel",
                "Главные маркетинговые ключи",
              )}
            </h1>
          </div>
          <p className="text-muted-foreground font-medium">{tr("시스템 인프라 및 글로벌 엔진 마스터 설정을 관리합니다.", "Manage system infrastructure and global engine master settings.")}</p>
        </div>
      </div>

      <Tabs defaultValue="automation" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl h-14">
          <TabsTrigger value="automation" className="rounded-xl font-bold gap-2"><Workflow className="w-4 h-4" /> Postiz + Trigger.dev</TabsTrigger>
          <TabsTrigger value="ai" className="rounded-xl font-bold gap-2"><Brain className="w-4 h-4" /> AI 엔진</TabsTrigger>
          <TabsTrigger value="naver" className="rounded-xl font-bold gap-2">
            <Zap className="w-4 h-4" />{" "}
            {tr("네이버 (로컬)", "Naver (Local)", "Naver (Local)")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="automation">
          <div className="mb-4 text-sm text-slate-500 font-medium px-2">
            * 글로벌 소셜 서비스(Instagram, Facebook, Threads, TikTok 등)는 Postiz 플랫폼이 토큰 발급 및 관리를 대행합니다.
          </div>
          <RevenueIntegrationsPanel 
            onSave={handleRevenueSave}
            saving={isSaving}
          />
        </TabsContent>

        <TabsContent value="ai">
          <KeyCard 
            title={tr("AI 엔진 설정", "AI Engine Settings", "Cài đặt AI")}
            desc={tr("Gemini 1.5 Flash (기본) 및 보조 LLM 마스터 키", "Gemini 1.5 Flash (default) and auxiliary LLM master keys")}
            icon={<Brain className="w-8 h-8 text-purple-600" />}
          >
            <div className="space-y-4">
              <InputGroup
                label={tr("Gemini API 마스터 키 (주력 엔진)", "Gemini API Master Key (Main Engine)", "Khóa API Gemini (Chính)")}
                value={settings.gemini_key}
                onChange={(v) => setSettings({ ...settings, gemini_key: v })}
                type="password"
              />
              <InputGroup
                label={tr("OpenAI API 마스터 키 (보조)", "OpenAI API Master Key (Fallback)", "Khóa API OpenAI")}
                value={settings.openai_key}
                onChange={(v) => setSettings({ ...settings, openai_key: v })}
                type="password"
              />
              <InputGroup
                label={tr("Anthropic (Claude) API 키", "Anthropic (Claude) API Key", "Khóa API Anthropic (Claude)")}
                value={settings.anthropic_key}
                onChange={(v) => setSettings({ ...settings, anthropic_key: v })}
                type="password"
              />
              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveKeys} disabled={isSaving} className="font-bold">
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {tf.f01416}
                </Button>
              </div>
            </div>
          </KeyCard>
        </TabsContent>

        <TabsContent value="naver">
          <KeyCard 
            title={tr(
              "네이버 블로그 연동 (로컬 전용)",
              "Naver Blog Integration (Local Only)",
              "Tích hợp Naver Blog"
            )}
            desc={tr("Postiz가 지원하지 않는 한국 로컬 플랫폼 연동 설정입니다.", "Integration settings for Korean local platforms not supported by Postiz.")}
            icon={<Zap className="w-8 h-8 text-green-600" />}
          >
            <div className="space-y-4">
              <InputGroup
                label={tr("네이버 클라이언트 ID", "Naver Client ID", "Naver Client ID")}
                value={settings.naver_client_id}
                onChange={(v) => setSettings({ ...settings, naver_client_id: v })}
              />
              <InputGroup
                label={tr("네이버 클라이언트 시크릿", "Naver Client Secret", "Naver Client Secret")}
                value={settings.naver_client_secret}
                onChange={(v) => setSettings({ ...settings, naver_client_secret: v })}
                type="password"
              />
              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveKeys} disabled={isSaving} className="font-bold">
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                  {tf.f01416}
                </Button>
              </div>
            </div>
          </KeyCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface KeyCardProps {
  title: string;
  desc: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function KeyCard({ title, desc, icon, children }: KeyCardProps) {
  return (
    <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden">
      <CardHeader className="flex flex-row items-center gap-6 p-8 bg-slate-50 dark:bg-slate-800/50">
        <div className="p-4 bg-white dark:bg-slate-900 rounded-2xl shadow-sm italic">
          {icon}
        </div>
        <div>
          <CardTitle className="text-xl font-bold">{title}</CardTitle>
          <CardDescription className="font-medium">{desc}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-8">
        {children}
      </CardContent>
    </Card>
  );
}

interface InputGroupProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  inputPlaceholder?: string;
}

function InputGroup({ label, value, onChange, type = 'text', placeholder, inputPlaceholder }: InputGroupProps) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
        <Lock className="w-3 h-3" /> {label}
      </Label>
      <Input 
        type={type} 
        value={value || ''} 
        onChange={(e) => onChange(e.target.value)} 
        placeholder={inputPlaceholder || placeholder || label}
        className="h-12 bg-slate-50 dark:bg-slate-800 border-none focus-visible:ring-2 focus-visible:ring-indigo-500 font-medium"
      />
    </div>
  );
}
