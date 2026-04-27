'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Webhook, 
  Brain, 
  Save, 
  Zap, 
  Globe, 
  Facebook, 
  Instagram, 
  Youtube, 
  Video,
  Share2
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { toBaseLocale } from '@/i18n/config';

export default function MarketingAdmin() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>({});
  const supabase = createClient();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === 'ko' ? koText : enText);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase.from('platform_config').select('*');
    if (error) {
      toast.error(`${tr('설정 불러오기 실패', 'Failed to load settings')}: ${error.message}`);
      return;
    }
    if (data) {
      const configMap = data.reduce((acc: any, item: any) => {
        acc[item.key] = item.value;
        return acc;
      }, {});
      setConfig(configMap);
    }
  };

  const handleSave = async (key: string, value: any) => {
    setLoading(true);
    const { error } = await supabase
      .from('platform_config')
      .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    
    if (error) {
      const msg = error.message.toLowerCase();
      const rlsBlocked =
        error.code === '42501' ||
        msg.includes('permission') ||
        msg.includes('row-level security') ||
        msg.includes('policy');
      toast.error(
        rlsBlocked
          ? tr(
              '저장 권한이 없습니다. Supabase SQL Editor에서 supabase/platform_config_schema.sql을 실행했는지, super_admin 계정으로 로그인했는지 확인하세요.',
              'No permission to save. Run supabase/platform_config_schema.sql in Supabase SQL Editor and sign in as super_admin.'
            )
          : `${tr('설정 저장 실패', 'Save failed')}: ${error.message}`
      );
    } else {
      toast.success(tr('설정이 저장되었습니다.', 'Settings saved.'));
      fetchConfig();
    }
    setLoading(false);
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-slate-900 text-white p-2 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-4xl font-black tracking-tight">{tr('플랫폼 홍보 마스터 센터', 'Platform marketing control')}</h1>
          </div>
          <p className="text-muted-foreground">{tr('전체 화원사들의 AI 홍보 엔진을 구동하기 위한 글로벌 API 및 시스템 설정을 관리합니다.', 'Global API and system settings for the tenant marketing engine.')}</p>
        </div>
      </div>

      <Tabs defaultValue="sns" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-8 h-12 bg-slate-50 dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800">
          <TabsTrigger value="sns" className="gap-2 font-bold"><Globe className="w-4 h-4" /> {tr('SNS 연동', 'SNS')}</TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 font-bold"><Brain className="w-4 h-4" /> {tr('AI 엔진', 'AI')}</TabsTrigger>
          <TabsTrigger value="workflow" className="gap-2 font-bold"><Webhook className="w-4 h-4" /> {tr('워크플로우', 'Workflow')}</TabsTrigger>
          <TabsTrigger value="global" className="gap-2 font-bold"><Zap className="w-4 h-4" /> {tr('공통 제약', 'Limits')}</TabsTrigger>
        </TabsList>

        <TabsContent value="sns">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PlatformCard 
              title="Meta (Facebook/Instagram)" 
              icon={<Instagram className="text-pink-500" />}
              description={tr('Meta for Developers에서 발급받은 App ID 및 Secret Key', 'App ID and secret from Meta for Developers')}
              configKey="meta_api_config"
              data={config.meta_api_config || { appId: '', appSecret: '' }}
              onSave={(val: any) => handleSave('meta_api_config', val)}
            />
            <PlatformCard 
              title="Naver Developers" 
              icon={<Zap className="text-green-500" />}
              description={tr('네이버 블로그/검색 광고 API 제어용 키', 'Keys for Naver Blog / search ads APIs')}
              configKey="naver_api_config"
              data={config.naver_api_config || { clientId: '', clientSecret: '' }}
              onSave={(val: any) => handleSave('naver_api_config', val)}
            />
            <PlatformCard 
              title="YouTube / Google" 
              icon={<Youtube className="text-red-500" />}
              description={tr('YouTube Shorts 업로드 및 Google Ads 제어', 'YouTube Shorts upload and Google Ads')}
              configKey="google_api_config"
              data={config.google_api_config || { apiKey: '', clientId: '' }}
              onSave={(val: any) => handleSave('google_api_config', val)}
            />
            <PlatformCard 
              title="TikTok for Business" 
              icon={<Video className="text-slate-900" />}
              description={tr('TikTok 비디오 업로드 및 트렌드 분석 API', 'TikTok upload and trend APIs')}
              configKey="tiktok_api_config"
              data={config.tiktok_api_config || { clientKey: '', clientSecret: '' }}
              onSave={(val: any) => handleSave('tiktok_api_config', val)}
            />
          </div>
        </TabsContent>

        <TabsContent value="ai">
          <Card className="border-none shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5 text-purple-600" /> {tr('AI 모델 전역 키 설정', 'Global AI API keys')}
              </CardTitle>
              <CardDescription>{tr('홍보 엔진 구동에 사용되는 멀티 모델(OpenAI, Anthropic 등)의 마스터 키입니다.', 'Master keys for OpenAI, Anthropic, and other models used by marketing.')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="font-bold">OpenAI API Master Key</Label>
                  <Input 
                    type="password" 
                    placeholder="sk-..." 
                    value={config.openai_key || ''} 
                    onChange={(e) => setConfig({...config, openai_key: e.target.value})}
                  />
                  <Button size="sm" onClick={() => handleSave('openai_key', config.openai_key)}>{tr('저장하기', 'Save')}</Button>
                </div>
                <div className="space-y-4">
                  <Label className="font-bold">Anthropic (Claude) API Key</Label>
                  <Input 
                    type="password" 
                    placeholder="sk-ant-..." 
                    value={config.anthropic_key || ''} 
                    onChange={(e) => setConfig({...config, anthropic_key: e.target.value})}
                  />
                  <Button size="sm" onClick={() => handleSave('anthropic_key', config.anthropic_key)}>{tr('저장하기', 'Save')}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow">
          <Card className="border-none shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-indigo-600" /> {tr('n8n 마스터 파이프라인', 'n8n master pipeline')}
              </CardTitle>
              <CardDescription>{tr('모든 캠페인 작전이 사출되는 n8n 통합 웹훅 주소입니다.', 'Unified webhook URL where campaigns are dispatched.')}</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                  <Label className="font-bold text-indigo-600">Global Master Webhook URL</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="https://n8n.your-domain.com/webhook/..." 
                      className="flex-1 font-mono text-xs"
                      value={config.n8n_master_url || ''} 
                      onChange={(e) => setConfig({...config, n8n_master_url: e.target.value})}
                    />
                    <Button onClick={() => handleSave('n8n_master_url', config.n8n_master_url)} className="bg-indigo-600">{tr('연결 저장', 'Save URL')}</Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PlatformCard({ title, icon, description, data, onSave }: any) {
  const [localData, setLocalData] = useState(data);
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === 'ko' ? koText : enText);

  return (
    <Card className="border-none shadow-lg ring-1 ring-slate-100 dark:ring-slate-800 overflow-hidden">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/50 p-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
            {icon}
          </div>
          <div>
            <CardTitle className="text-md font-extrabold">{title}</CardTitle>
            <CardDescription className="text-xs">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        <div className="space-y-2">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Client ID / App ID</Label>
          <Input 
            value={localData.appId || localData.clientId || localData.clientKey || localData.apiKey || ''} 
            onChange={(e) => setLocalData({ ...localData, appId: e.target.value, clientId: e.target.value, clientKey: e.target.value, apiKey: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Secret Key / Secret ID</Label>
          <Input 
            type="password"
            value={localData.appSecret || localData.clientSecret || ''} 
            onChange={(e) => setLocalData({ ...localData, appSecret: e.target.value, clientSecret: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
        <Button size="sm" variant="secondary" className="w-full font-bold h-9" onClick={() => onSave(localData)}>
          <Save className="w-3.5 h-3.5 mr-2" /> {tr('설정 업데이트', 'Update')}
        </Button>
      </CardContent>
    </Card>
  );
}
