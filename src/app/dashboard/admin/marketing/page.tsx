'use client';

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  Save, 
  RefreshCw, 
  Globe, 
  Instagram, 
  Youtube, 
  Zap, 
  Lock,
  MessageSquare
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function AdminMarketingSettings() {
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState({
    meta_app_id: '',
    meta_app_secret: '',
    tiktok_client_key: '',
    tiktok_client_secret: '',
    google_client_id: '',
    google_client_secret: '',
    naver_client_id: '',
    naver_client_secret: '',
    n8n_webhook_url: ''
  });

  const supabase = createClient();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);

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
      setSettings(data.value);
    }
  };

  const handleSave = async () => {
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
      toast.success(tr('마스터 API 키가 DB에 안전하게 저장되었습니다.', 'Master API keys were saved safely to DB.'));
    } catch (err: any) {
      toast.error(tr('저장 중 오류 발생: ', 'Save failed: ') + err.message);
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
            <h1 className="text-3xl font-black tracking-tighter uppercase">Marketing Master Keys</h1>
          </div>
          <p className="text-muted-foreground font-medium">{tr("전체 서비스의 소셜 미디어 API 연동을 위한 마스터 키를 관리합니다.", "Manage master keys for social media API integrations across the platform.")}</p>
        </div>
        <Button 
          size="lg" 
          className="bg-indigo-600 hover:bg-indigo-700 font-bold gap-2"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {tr("설정 일괄 저장", "Save All Settings")}
        </Button>
      </div>

      <Tabs defaultValue="meta" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl h-14">
          <TabsTrigger value="meta" className="rounded-xl font-bold gap-2"><Instagram className="w-4 h-4" /> Meta</TabsTrigger>
          <TabsTrigger value="tiktok" className="rounded-xl font-bold gap-2"><Globe className="w-4 h-4" /> TikTok</TabsTrigger>
          <TabsTrigger value="google" className="rounded-xl font-bold gap-2"><Youtube className="w-4 h-4" /> Google</TabsTrigger>
          <TabsTrigger value="naver" className="rounded-xl font-bold gap-2"><Zap className="w-4 h-4" /> Naver / n8n</TabsTrigger>
        </TabsList>

        <TabsContent value="meta">
          <KeyCard 
            title="Meta (Instagram & Facebook)" 
            desc={tr("메타 개발자 포털에서 발급받은 앱 정보를 입력하세요.", "Enter app credentials issued from Meta developer portal.")}
            icon={<Instagram className="w-8 h-8 text-pink-500" />}
          >
            <div className="space-y-4">
              <InputGroup label="Meta App ID" value={settings.meta_app_id} onChange={(v) => setSettings({...settings, meta_app_id: v})} />
              <InputGroup label="Meta App Secret" value={settings.meta_app_secret} onChange={(v) => setSettings({...settings, meta_app_secret: v})} type="password" />
            </div>
          </KeyCard>
        </TabsContent>

        <TabsContent value="tiktok">
          <KeyCard 
            title="TikTok for Developers" 
            desc={tr("틱톡 개발자 앱의 클라이언트 키 정보를 입력하세요.", "Enter client key information from your TikTok developer app.")}
            icon={<Globe className="w-8 h-8 text-slate-900 dark:text-white" />}
          >
            <div className="space-y-4">
              <InputGroup label="TikTok Client Key" value={settings.tiktok_client_key} onChange={(v) => setSettings({...settings, tiktok_client_key: v})} />
              <InputGroup label="TikTok Client Secret" value={settings.tiktok_client_secret} onChange={(v) => setSettings({...settings, tiktok_client_secret: v})} type="password" />
            </div>
          </KeyCard>
        </TabsContent>

        <TabsContent value="google">
          <KeyCard 
            title="Google Cloud (YouTube & Blogger)" 
            desc={tr("유튜브 쇼츠와 블로거 API를 위한 구글 클라우드 자격 증명입니다.", "Google Cloud credentials for YouTube Shorts and Blogger APIs.")}
            icon={<Youtube className="w-8 h-8 text-red-600" />}
          >
            <div className="space-y-4">
              <InputGroup label="Google Client ID" value={settings.google_client_id} onChange={(v) => setSettings({...settings, google_client_id: v})} />
              <InputGroup label="Google Client Secret" value={settings.google_client_secret} onChange={(v) => setSettings({...settings, google_client_secret: v})} type="password" />
            </div>
          </KeyCard>
        </TabsContent>

        <TabsContent value="naver">
          <KeyCard 
            title="Naver & Automation Config" 
            desc={tr("네이버 API 및 n8n 워크플로우 웹훅 주소를 관리합니다.", "Manage Naver API and n8n workflow webhook URLs.")}
            icon={<Zap className="w-8 h-8 text-green-600" />}
          >
            <div className="space-y-4">
              <InputGroup label="Naver Client ID" value={settings.naver_client_id} onChange={(v) => setSettings({...settings, naver_client_id: v})} />
              <InputGroup label="Naver Client Secret" value={settings.naver_client_secret} onChange={(v) => setSettings({...settings, naver_client_secret: v})} type="password" />
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <InputGroup label="n8n Master Webhook URL" value={settings.n8n_webhook_url} onChange={(v) => setSettings({...settings, n8n_webhook_url: v})} placeholder="http://your-n8n-url/webhook/marketing-trigger" />
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
