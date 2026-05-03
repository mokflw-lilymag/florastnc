'use client';

import { getMessages } from "@/i18n/getMessages";
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
import { pickUiText } from '@/i18n/pick-ui-text';

export default function MarketingAdmin() {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>({});
  const supabase = createClient();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const L = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    const { data, error } = await supabase.from('platform_config').select('*');
    if (error) {
      toast.error(`${tf.f01414}: ${error.message}`);
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
          ? tf.f01768
          : `${tf.f01417}: ${error.message}`
      );
    } else {
      toast.success(tf.f01424);
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
            <h1 className="text-4xl font-black tracking-tight">{tf.f02152}</h1>
          </div>
          <p className="text-muted-foreground">{tf.f01808}</p>
        </div>
      </div>

      <Tabs defaultValue="sns" className="w-full">
        <TabsList className="grid w-full max-w-2xl grid-cols-4 mb-8 h-12 bg-slate-50 dark:bg-slate-900 ring-1 ring-slate-100 dark:ring-slate-800">
          <TabsTrigger value="sns" className="gap-2 font-bold"><Globe className="w-4 h-4" /> {tf.f02291}</TabsTrigger>
          <TabsTrigger value="ai" className="gap-2 font-bold"><Brain className="w-4 h-4" /> {tf.f02239}</TabsTrigger>
          <TabsTrigger value="workflow" className="gap-2 font-bold"><Webhook className="w-4 h-4" /> {tf.f01636}</TabsTrigger>
          <TabsTrigger value="global" className="gap-2 font-bold"><Zap className="w-4 h-4" /> {tf.f00959}</TabsTrigger>
        </TabsList>

        <TabsContent value="sns">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PlatformCard 
              title={L("Meta (페이스북/인스타그램)", "Meta (Facebook/Instagram)", "Meta (Facebook / Instagram)")}
              icon={<Instagram className="text-pink-500" />}
              description={tf.f02268}
              configKey="meta_api_config"
              data={config.meta_api_config || { appId: '', appSecret: '' }}
              onSave={(val: any) => handleSave('meta_api_config', val)}
            />
            <PlatformCard 
              title={L("네이버 개발자 센터", "Naver Developers", "Trung tâm nhà phát triển Naver")}
              icon={<Zap className="text-green-500" />}
              description={tf.f01038}
              configKey="naver_api_config"
              data={config.naver_api_config || { clientId: '', clientSecret: '' }}
              onSave={(val: any) => handleSave('naver_api_config', val)}
            />
            <PlatformCard 
              title={L("YouTube / Google", "YouTube / Google")}
              icon={<Youtube className="text-red-500" />}
              description={tf.f02299}
              configKey="google_api_config"
              data={config.google_api_config || { apiKey: '', clientId: '' }}
              onSave={(val: any) => handleSave('google_api_config', val)}
            />
            <PlatformCard 
              title={L("TikTok for Business", "TikTok for Business", "TikTok cho doanh nghiệp")}
              icon={<Video className="text-slate-900" />}
              description={tf.f02296}
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
                <Brain className="w-5 h-5 text-purple-600" /> {tf.f02235}
              </CardTitle>
              <CardDescription>{tf.f02203}</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <Label className="font-bold">
                    {L("OpenAI API 마스터 키", "OpenAI API Master Key", "Khóa API OpenAI chính")}
                  </Label>
                  <Input 
                    type="password" 
                    placeholder={L("sk-...", "sk-...", "sk-...")}
                    value={config.openai_key || ''} 
                    onChange={(e) => setConfig({...config, openai_key: e.target.value})}
                  />
                  <Button size="sm" onClick={() => handleSave('openai_key', config.openai_key)}>{tf.f01771}</Button>
                </div>
                <div className="space-y-4">
                  <Label className="font-bold">
                    {L("Anthropic (Claude) API 키", "Anthropic (Claude) API Key", "Khóa API Anthropic (Claude)")}
                  </Label>
                  <Input 
                    type="password" 
                    placeholder={L("sk-ant-...", "sk-ant-...", "sk-ant-...")}
                    value={config.anthropic_key || ''} 
                    onChange={(e) => setConfig({...config, anthropic_key: e.target.value})}
                  />
                  <Button size="sm" onClick={() => handleSave('anthropic_key', config.anthropic_key)}>{tf.f01771}</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow">
          <Card className="border-none shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
            <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-indigo-600" /> {tf.f02269}
              </CardTitle>
              <CardDescription>{tf.f01197}</CardDescription>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                  <Label className="font-bold text-indigo-600">
                    {L("전역 마스터 웹훅 URL", "Global Master Webhook URL", "URL webhook tổng (n8n)")}
                  </Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder={L(
                        "https://n8n.your-domain.com/webhook/...",
                        "https://n8n.your-domain.com/webhook/...",
                        "https://n8n.your-domain.com/webhook/..."
                      )}
                      className="flex-1 font-mono text-xs"
                      value={config.n8n_master_url || ''} 
                      onChange={(e) => setConfig({...config, n8n_master_url: e.target.value})}
                    />
                    <Button onClick={() => handleSave('n8n_master_url', config.n8n_master_url)} className="bg-indigo-600">{tf.f01560}</Button>
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
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const L = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);

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
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {L("클라이언트 ID / 앱 ID", "Client ID / App ID", "ID ứng dụng / Client ID")}
          </Label>
          <Input 
            value={localData.appId || localData.clientId || localData.clientKey || localData.apiKey || ''} 
            onChange={(e) => setLocalData({ ...localData, appId: e.target.value, clientId: e.target.value, clientKey: e.target.value, apiKey: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {L("시크릿 키 / 시크릿 ID", "Secret Key / Secret ID", "Secret / Client Secret")}
          </Label>
          <Input 
            type="password"
            value={localData.appSecret || localData.clientSecret || ''} 
            onChange={(e) => setLocalData({ ...localData, appSecret: e.target.value, clientSecret: e.target.value })}
            className="h-9 text-xs"
          />
        </div>
        <Button size="sm" variant="secondary" className="w-full font-bold h-9" onClick={() => onSave(localData)}>
          <Save className="w-3.5 h-3.5 mr-2" /> {tf.f01415}
        </Button>
      </CardContent>
    </Card>
  );
}
