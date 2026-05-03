'use client';

import { getMessages } from "@/i18n/getMessages";
import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, 
  Target, 
  PenTool, 
  ShieldCheck, 
  ChevronRight, 
  Workflow, 
  Settings,
  MessageSquare,
  Zap,
  History,
  Layout,
  Globe,
  Plus,
  Trash2,
  CheckCircle2,
  Instagram,
  Youtube,
  Key
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { usePreferredLocale } from '@/hooks/use-preferred-locale';

interface Agent {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  description: string;
  tasks: string[];
}

export default function MarketingStudio() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState(0);
  const [shopSettings, setShopSettings] = useState<any>({
    auto_pilot_enabled: false,
    store_persona: 'Trendy & Hip',
    marketing_theme: '',
    target_platforms: ['instagram', 'youtube']
  });
  const [themes, setThemes] = useState<string[]>([]);
  const [newTheme, setNewTheme] = useState('');
  const [connectedPlatforms, setConnectedPlatforms] = useState<string[]>([]);
  
  // Connection Dialog State
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [currentConnectingPlatform, setCurrentConnectingPlatform] = useState<any>(null);
  const [isLoginProcessing, setIsLoginProcessing] = useState(false);
  const [loginStep, setLoginStep] = useState<'info' | 'input'>('info');
  const [loginInput, setLoginInput] = useState({ id: '', pw: '' });
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [selectedAgentId, setSelectedAgentId] = useState('architect');

  const supabase = createClient();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;

  const agents = useMemo((): Agent[] => [
    {
      id: 'architect',
      name: tf.f01783,
      role: tf.f01784,
      icon: <Target className="w-5 h-5 text-purple-400" />,
      description: tf.f01172,
      tasks: [
        tf.f01490,
        tf.f02205,
        tf.f02073
      ]
    },
    {
      id: 'copywriter',
      name: tf.f02075,
      role: tf.f02072,
      icon: <PenTool className="w-5 h-5 text-blue-400" />,
      description: tf.f01327,
      tasks: [
        tf.f02089,
        tf.f01700,
        tf.f01301
      ]
    },
    {
      id: 'reviewer',
      name: tf.f02137,
      role: tf.f01547,
      icon: <ShieldCheck className="w-5 h-5 text-green-400" />,
      description: tf.f01752,
      tasks: [
        tf.f01297,
        tf.f01145,
        tf.f02207
      ]
    }
  ], [locale]);

  const selectedAgent = useMemo(
    () => agents.find((a) => a.id === selectedAgentId) ?? agents[0],
    [agents, selectedAgentId]
  );

  const personaOptions = useMemo(
    () => [
      {
        id: 'Elegant & Premium',
        label: tf.f00808,
        desc: tf.f00944,
      },
      {
        id: 'Warm & Emotional',
        label: tf.f00807,
        desc: tf.f00941,
      },
      {
        id: 'Trendy & Hip',
        label: tf.f00812,
        desc: tf.f02019,
      },
      {
        id: 'Expert & Professional',
        label: tf.f00813,
        desc: tf.f01022,
      },
    ],
    [locale]
  );

  useEffect(() => {
    fetchSettings();
    fetchCredentials();
  }, []);

  const fetchSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('shop_settings')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);
    
    if (data && data.length > 0) {
      const settings = data[0];
      setShopSettings(settings);
      if (settings.marketing_theme) {
        setThemes(settings.marketing_theme.split(',').filter((t: string) => t.trim() !== ''));
      }
    }
  };

  const fetchCredentials = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('user_credentials')
      .select('provider')
      .eq('user_id', user.id)
      .eq('is_active', true);
    
    if (data) {
      setConnectedPlatforms(data.map(c => c.provider));
    }
  };

  const handleConnectSNS = async (provider: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error(tf.f00176);
      return;
    }

    if (loginStep === 'input') {
      setIsLoginProcessing(true);
      try {
        const { error } = await supabase
          .from('user_credentials')
          .upsert({
            user_id: user.id,
            provider: provider,
            is_active: true,
            access_token: loginInput.id, // 토큰 필드로 사용
            refresh_token: loginInput.pw, // 비밀번호 필드를 리프레시 토큰/추가 키로 활용
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        toast.success(tf.f02308.replace("{provider}", provider));
        fetchCredentials();
        setIsConnectDialogOpen(false);
        setLoginStep('info');
        setLoginInput({ id: '', pw: '' });
      } catch (err) {
        toast.error(tf.f02082);
      } finally {
        setIsLoginProcessing(false);
      }
      return;
    }

    if (provider === 'tiktok') {
      const clientKey = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY || 'awv3n8m5e8u7j7j7'; // Placeholder if env not synced to client
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback/tiktok`);
      const scope = 'user.info.profile,user.info.stats,video.publish,video.upload';
      const state = Math.random().toString(36).substring(7);
      
      const authUrl = `https://www.tiktok.com/v2/auth/authorize/?client_key=${clientKey}&scope=${scope}&response_type=code&redirect_uri=${redirectUri}&state=${state}`;
      
      window.location.href = authUrl;
      return;
    }

    if (provider === 'youtube') {
      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
      const redirectUri = encodeURIComponent(`${window.location.origin}/api/auth/callback/google`);
      // 유튜브 업로드 및 프로필 조회를 위한 스코프
      const scope = encodeURIComponent('https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly openid email profile');
      const state = Math.random().toString(36).substring(7);
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&state=${state}&access_type=offline&prompt=consent`;
      
      window.location.href = authUrl;
      return;
    }

    setIsLoginProcessing(true);
    try {
      // 타 플랫폼은 아직 시뮬레이션 유지 또는 추후 확장
      await new Promise(resolve => setTimeout(resolve, 1500));

      const { error } = await supabase
        .from('user_credentials')
        .upsert({
          user_id: user.id,
          provider: provider,
          is_active: true,
          access_token: 'simulated_token_' + Math.random().toString(36).substring(7),
          updated_at: new Date().toISOString()
        });

      if (error) throw error;
      
      toast.success(tf.f02309.replace("{provider}", provider));
      fetchCredentials();
      setIsConnectDialogOpen(false);
      setLoginStep('info');
      setLoginInput({ id: '', pw: '' });
    } catch (err) {
      toast.error(tf.f01572);
    } finally {
      setIsLoginProcessing(false);
    }
  };

  const handleSaveSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const themeString = themes.join(',');
    const { error } = await supabase
      .from('shop_settings')
      .upsert({
        user_id: user.id,
        ...shopSettings,
        marketing_theme: themeString,
        updated_at: new Date().toISOString()
      });
    
    if (error) toast.error(tf.f01417);
    else toast.success(tf.f01300);
  };

  const addTheme = () => {
    if (newTheme && !themes.includes(newTheme)) {
      setThemes([...themes, newTheme]);
      setNewTheme('');
    }
  };

  const removeTheme = (t: string) => {
    setThemes(themes.filter(item => item !== t));
  };

  const [generatedBlog, setGeneratedBlog] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const startOrchestration = async () => {
    setIsProcessing(true);
    setStep(1);
    
    try {
      // 1. Topic selection
      const selectedTopic = themes.length > 0 
        ? themes[Math.floor(Math.random() * themes.length)]
        : tf.f02310;

      const targetPlatform = shopSettings.target_platforms.length > 0 
        ? shopSettings.target_platforms[0] 
        : 'instagram';

      // 2. Generate Blog Post (Simulating Agent Collaboration)
      setTimeout(() => setStep(2), 2000);
      
      const response = await fetch('/api/ai/marketing/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: selectedTopic,
          persona: shopSettings.store_persona,
          platform: targetPlatform
        })
      });
      
      const data = await response.json();
      setGeneratedBlog({ ...data, platform: targetPlatform });
      setIsProcessing(false);
      setStep(0);
      setIsPreviewOpen(true); // 팝업 열기 추가

    } catch (err) {
      toast.error(tf.f01638);
      setIsProcessing(false);
      setStep(0);
    }
  };

  const [isPublishing, setIsPublishing] = useState(false);
  const handlePublish = async () => {
    if (!generatedBlog) return;
    setIsPublishing(true);
    try {
      const response = await fetch('/api/ai/marketing/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: generatedBlog.platform,
          title: generatedBlog.title,
          content: generatedBlog.content,
          imageUrl: 'https://images.unsplash.com/photo-1563241597-12a414531d5e?q=80&w=1000&auto=format&fit=crop'
        })
      });
      const data = await response.json();
      if (response.ok) {
        toast.success(data.message || tf.f02110);
      } else {
        toast.error(`${tf.f02107}: ${data.error}`);
      }
    } catch (error) {
      toast.error(tf.f02108);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="bg-primary/10 text-primary p-2 rounded-lg">
                <Sparkles className="w-6 h-6" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
                {tf.f02243}
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              {tf.f01326}
              <span className="text-foreground font-semibold">
                {tf.f00833}
              </span>
              {tf.f00846}
            </p>
          </div>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 hover:scale-[1.02] transition-all font-bold gap-2 shadow-lg shadow-indigo-100 dark:shadow-none h-14 px-8"
            onClick={startOrchestration}
            disabled={isProcessing}
          >
            {isProcessing ? <Zap className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {tf.f02245}
          </Button>
        </div>

        {/* Workflow Progress */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <Card className="border-indigo-100 bg-indigo-50/50 backdrop-blur-md dark:bg-indigo-950/20 dark:border-indigo-900/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-bold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                      <Workflow className="w-4 h-4 animate-pulse" />
                      {tf.f02238}
                    </span>
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold">
                      {step === 1 ? tf.f01021 : step === 2 ? tf.f01639 : tf.f02021}
                    </span>
                  </div>
                  <div className="h-2 w-full bg-indigo-100 dark:bg-indigo-900 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-indigo-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${(step / 3) * 100}%` }}
                      transition={{ duration: 0.5, ease: "easeInOut" }}
                    />
                  </div>
                  <div className="flex justify-between mt-6">
                    {agents.map((a, i) => (
                      <div key={a.id} className={`flex flex-col items-center gap-2 transition-all duration-500 ${step > i ? 'opacity-100 scale-100' : 'opacity-30 scale-90'}`}>
                        <div className={`p-3 rounded-2xl shadow-sm ${step === i + 1 ? 'bg-indigo-600 text-white ring-4 ring-indigo-50 dark:ring-indigo-900' : 'bg-white dark:bg-slate-900 border'}`}>
                          {a.icon}
                        </div>
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{a.name}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Tabs defaultValue="dashboard" className="w-full">
          <TabsList className="grid w-full max-w-lg grid-cols-3 mb-6">
            <TabsTrigger value="dashboard" className="gap-2"><Layout className="w-4 h-4" /> {tf.f02083}</TabsTrigger>
            <TabsTrigger value="sns" className="gap-2"><Globe className="w-4 h-4" /> {tf.f02292}</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" /> {tf.f01299}</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            {/* ... (existing dashboard content) ... */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Agent Status */}
              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-2 px-1">
                  <Target className="w-5 h-5 text-indigo-500" /> {tf.f02202}
                </h2>
                {agents.map((agent) => (
                  <Card 
                    key={agent.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-md border-slate-100 dark:border-slate-800 ${selectedAgent.id === agent.id ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-white dark:bg-slate-900'}`}
                    onClick={() => setSelectedAgentId(agent.id)}
                  >
                    <CardHeader className="p-4 flex-row items-center gap-4 space-y-0">
                      <div className={`p-2 rounded-xl ${selectedAgent.id === agent.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 shadow-inner'}`}>
                        {agent.icon}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-base font-bold">{agent.name}</CardTitle>
                        <CardDescription className="text-xs font-semibold">{agent.role}</CardDescription>
                      </div>
                      <ChevronRight className={`w-4 h-4 transition-transform ${selectedAgent.id === agent.id ? 'rotate-90 text-indigo-600' : 'text-slate-300'}`} />
                    </CardHeader>
                  </Card>
                ))}

                <Card className="mt-4 border-dashed bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800">
                  <CardContent className="p-8 flex flex-col items-center justify-center text-slate-400 group cursor-pointer">
                    <History className="w-8 h-8 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="text-sm font-medium">{tf.f00960}</span>
                  </CardContent>
                </Card>
              </div>

              {/* Detail View */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    <span className="text-indigo-600">[{selectedAgent.name}]</span>{' '}
                    {tf.f01664}
                  </h2>
                </div>

                <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI HARNESS PROFILE v2.0</span>
                    <div className="flex gap-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {tf.f01348}
                    </div>
                  </div>
                  <CardContent className="p-8">
                    <div className="space-y-8">
                      <section>
                        <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-indigo-600 rounded-full" /> {tf.f01550}
                        </h3>
                        <p className="text-lg font-medium text-slate-700 dark:text-slate-200 leading-relaxed border-l-4 border-indigo-100 pl-6 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-r-lg">
                          "{selectedAgent.description}"
                        </p>
                      </section>

                      <section>
                        <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-indigo-600 rounded-full" /> {tf.f01882}
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {selectedAgent.tasks.map((task, i) => (
                            <div key={i} className="flex flex-col gap-2 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 hover:border-indigo-200 transition-colors shadow-sm">
                              <span className="text-2xl font-black text-indigo-100 dark:text-indigo-900">0{i + 1}</span>
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-300">{task}</span>
                            </div>
                          ))}
                        </div>
                      </section>

                      <section>
                        <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-indigo-600 rounded-full" /> {tf.f01296}
                        </h3>
                        <div className="space-y-3 bg-indigo-50/20 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-50 dark:border-indigo-900/30">
                          <li className="text-sm flex items-start gap-3 text-slate-600 dark:text-slate-400">
                            <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                            <span>
                              {tf.f02311}
                            </span>
                          </li>
                          <li className="text-sm flex items-start gap-3 text-slate-600 dark:text-slate-400">
                            <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                            <span>
                              {tf.f01294}
                            </span>
                          </li>
                          <li className="text-sm flex items-start gap-3 text-slate-600 dark:text-slate-400">
                            <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                            <span>
                              {tf.f00852}
                            </span>
                          </li>
                        </div>
                      </section>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Blog Preview Section */}
            {generatedBlog && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8"
              >
                <Card className="border-none shadow-2xl overflow-hidden ring-1 ring-emerald-100 dark:ring-emerald-900/30">
                  <div className="bg-emerald-600 p-4 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Zap className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                      <span className="font-bold">
                        {generatedBlog.platform?.toUpperCase()}{' '}
                        {tf.f01991}
                      </span>
                    </div>
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="font-bold text-emerald-700 bg-white hover:bg-emerald-50"
                      onClick={handlePublish}
                      disabled={isPublishing}
                    >
                      {isPublishing ? <Zap className="w-4 h-4 animate-spin mr-2" /> : null}
                      {isPublishing ? tf.f02109 : tf.f01680}
                    </Button>
                  </div>
                  <CardContent className="p-10 bg-white dark:bg-slate-900">
                    <div className="max-w-3xl mx-auto space-y-6">
                      <h3 className="text-2xl font-black text-slate-900 dark:text-white border-b pb-4">
                        {generatedBlog.title}
                      </h3>
                      <div className="prose prose-slate dark:prose-invert max-w-none whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                        {generatedBlog.content}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </TabsContent>

          <TabsContent value="sns">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <Card className="border-none shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
                  <CardHeader className="bg-slate-50 dark:bg-slate-900">
                    <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-600" /> {tf.f02289}</CardTitle>
                    <CardDescription>
                      {tf.f00866}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                     {[
                       { id: 'instagram', name: 'Instagram', icon: <Instagram className="w-5 h-5 text-pink-500" /> },
                       { id: 'facebook', name: 'Facebook', icon: <Globe className="w-5 h-5 text-blue-600" /> },
                       { id: 'threads', name: 'Threads', icon: <MessageSquare className="w-5 h-5 text-purple-500" /> },
                       { id: 'youtube', name: 'YouTube Shorts', icon: <Youtube className="w-5 h-5 text-red-600" /> },
                       { id: 'tiktok', name: 'TikTok', icon: <Zap className="w-5 h-5 text-slate-900" /> },
                       { id: 'blogger', name: 'Google Blogger', icon: <Globe className="w-5 h-5 text-orange-500" /> },
                       { id: 'naver', name: 'Naver Blog', icon: <Zap className="w-5 h-5 text-green-600" /> },
                     ].map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                                {p.icon}
                              </div>
                              <div>
                                 <p className="text-sm font-extrabold">{p.name}</p>
                                 <p className={`text-[10px] font-bold uppercase tracking-widest ${connectedPlatforms.includes(p.id) ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    {tf.f01346}{' '}
                                    {connectedPlatforms.includes(p.id)
                                      ? tf.f01256
                                      : tf.f01562}
                                 </p>
                              </div>
                           </div>
                           {connectedPlatforms.includes(p.id) ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 py-1.5 px-3 rounded-lg flex gap-1">
                                 <CheckCircle2 className="w-3 h-3" /> {tf.f01565}
                              </Badge>
                           ) : (
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="rounded-xl h-9 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                  onClick={() => {
                                    setCurrentConnectingPlatform(p);
                                    setIsConnectDialogOpen(true);
                                  }}
                                >
                                  {tf.f01726}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="rounded-xl h-9 text-xs font-bold border border-slate-200"
                                  onClick={() => {
                                    setCurrentConnectingPlatform(p);
                                    setLoginStep('input'); // 수동 입력 단계로 바로 이동
                                    setIsConnectDialogOpen(true);
                                  }}
                                >
                                  {tf.f01447}
                                </Button>
                              </div>
                           )}
                        </div>
                     ))}
                  </CardContent>
               </Card>

               <Card className="border-none shadow-xl bg-gradient-to-br from-indigo-900 to-slate-900 text-white overflow-hidden">
                  <CardContent className="p-10 space-y-8">
                     <div className="flex items-center gap-3">
                        <div className="p-3 bg-white/10 rounded-2xl">
                           <ShieldCheck className="w-6 h-6 text-indigo-300" />
                        </div>
                        <h3 className="text-xl font-black italic tracking-tighter uppercase underline decoration-indigo-500 decoration-4 underline-offset-8">
                          {tf.f01616}
                        </h3>
                     </div>
                     
                     <div className="space-y-6">
                        <section className="space-y-3">
                           <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest">
                             {tf.f00814}
                           </h4>
                           <p className="text-sm leading-relaxed text-slate-300 font-medium">
                              {tf.f02312}
                           </p>
                        </section>

                        <section className="space-y-3">
                           <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest">
                             {tf.f00815}
                           </h4>
                           <p className="text-sm leading-relaxed text-slate-300 font-medium">
                              {tf.f02313}
                           </p>
                        </section>

                        <section className="space-y-3">
                           <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest">
                             {tf.f00816}
                           </h4>
                           <p className="text-sm leading-relaxed text-slate-300 font-medium">
                              {tf.f01422}
                           </p>
                        </section>
                     </div>
                  </CardContent>
               </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="settings">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-none shadow-xl ring-1 ring-slate-100 dark:ring-slate-800 overflow-hidden">
                  <CardHeader className="bg-slate-50 dark:bg-slate-900">
                    <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-600" /> {tf.f01298}</CardTitle>
                    <CardDescription>
                      {tf.f02236}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                     <div className="grid grid-cols-2 gap-4">
                        {personaOptions.map((p) => (
                           <div 
                            key={p.id} 
                            onClick={() => setShopSettings({...shopSettings, store_persona: p.id})}
                            className={`p-6 border-2 rounded-2xl cursor-pointer transition-all ${shopSettings.store_persona === p.id ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10' : 'border-slate-100 hover:border-indigo-200 bg-white dark:bg-slate-900'}`}
                           >
                              <h4 className="font-bold mb-1">{p.label}</h4>
                              <p className="text-xs text-muted-foreground">{p.desc}</p>
                           </div>
                        ))}
                     </div>

                     <div className="space-y-4">
                        <Label className="text-sm font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> {tf.f01884}</Label>
                        <div className="flex gap-2">
                           <Input 
                            placeholder={tf.f01586} 
                            value={newTheme} 
                            onChange={(e) => setNewTheme(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTheme()}
                           />
                           <Button onClick={addTheme} variant="outline" className="shrink-0"><Plus className="w-4 h-4" /></Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                           {themes.length === 0 && (
                             <span className="text-xs text-slate-400 italic font-medium">
                               {tf.f01121}
                             </span>
                           )}
                           {themes.map((t, idx) => (
                             <Badge key={`${t}-${idx}`} variant="secondary" className="px-3 py-1.5 rounded-full gap-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                               <span className="max-w-[200px] truncate" title={t}>{t}</span>
                               <button
                                 type="button"
                                 className="inline-flex shrink-0 rounded-sm p-0.5 text-indigo-600 hover:bg-indigo-100 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                                 aria-label={tf.f02430.replace("{theme}", t)}
                                 onClick={(e) => {
                                   e.preventDefault();
                                   e.stopPropagation();
                                   removeTheme(t);
                                 }}
                               >
                                 <Trash2 className="w-3.5 h-3.5 pointer-events-none" />
                               </button>
                             </Badge>
                           ))}
                        </div>
                     </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" /> {tf.f01078}</CardTitle>
                    <CardDescription>
                      {tf.f02206}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                     <div className="grid grid-cols-3 gap-6">
                        {['instagram', 'youtube', 'naver', 'tiktok', 'threads'].map((platform) => (
                           <div key={platform} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                              <span className="text-sm font-bold capitalize">{platform}</span>
                              <Switch 
                                checked={shopSettings.target_platforms.includes(platform)}
                                onCheckedChange={(checked) => {
                                  const platforms = checked 
                                    ? [...shopSettings.target_platforms, platform]
                                    : shopSettings.target_platforms.filter((p: string) => p !== platform);
                                  setShopSettings({...shopSettings, target_platforms: platforms});
                                }}
                              />
                           </div>
                        ))}
                     </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                 <Card className="border-none shadow-xl bg-slate-900 text-white overflow-hidden sticky top-8">
                    <CardHeader className="bg-slate-800 border-b border-slate-700">
                       <CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> {tf.f01730}</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                       <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="space-y-1 min-w-0">
                            <span className="text-sm font-bold">{tf.f00832}</span>
                            <p className="text-[11px] leading-snug text-slate-400">
                              {shopSettings.auto_pilot_enabled ? (
                                <span className="font-semibold text-emerald-400">
                                  {tf.f01349}
                                </span>
                              ) : (
                                <span className="text-slate-500">
                                  {tf.f01347}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                            <span
                              className={cn(
                                "rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums border",
                                shopSettings.auto_pilot_enabled
                                  ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-300"
                                  : "border-slate-500 bg-slate-800 text-slate-400"
                              )}
                              aria-hidden
                            >
                              {shopSettings.auto_pilot_enabled
                                ? tf.f02271
                                : tf.f02270}
                            </span>
                            <Switch
                              checked={shopSettings.auto_pilot_enabled}
                              onCheckedChange={(val) =>
                                setShopSettings({ ...shopSettings, auto_pilot_enabled: val })
                              }
                              className={cn(
                                "h-7 w-12 shrink-0 border shadow-sm",
                                "data-checked:border-emerald-400/70 data-checked:bg-emerald-500",
                                "data-unchecked:border-slate-500 data-unchecked:bg-slate-600",
                                "[&_[data-slot=switch-thumb]]:bg-white [&_[data-slot=switch-thumb]]:shadow"
                              )}
                              aria-label={
                                shopSettings.auto_pilot_enabled
                                  ? tf.f00830
                                  : tf.f00831
                              }
                            />
                          </div>
                       </div>
                       <p className="text-xs text-slate-400 leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                          {tf.f02228}
                       </p>
                       <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-black h-12 rounded-xl" onClick={handleSaveSettings}>
                          {tf.f02258}
                       </Button>
                    </CardContent>
                 </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Connection Dialog */}
      <Dialog open={isConnectDialogOpen} onOpenChange={setIsConnectDialogOpen}>
        <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-8 text-white relative">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              {currentConnectingPlatform?.icon}
            </div>
            <DialogHeader>
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                {currentConnectingPlatform?.name} {tf.f01558}
              </DialogTitle>
              <DialogDescription className="text-white/80 font-medium">
                {tf.f02244}
                <br/>
                {loginStep === 'info'
                  ? tf.f00954
                  : tf.f02180}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="p-8 space-y-6 bg-white dark:bg-slate-900">
             {loginStep === 'info' ? (
               <>
                 <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 flex gap-4">
                       <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl h-fit">
                          <ShieldCheck className="w-5 h-5 text-indigo-600" />
                       </div>
                       <div className="space-y-1">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{tf.f00953}</p>
                          <p className="text-[10px] text-slate-500">
                            {tf.f01328}
                          </p>
                       </div>
                    </div>
                    
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900 flex gap-4">
                       <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-xl h-fit">
                          <Key className="w-5 h-5 text-amber-600" />
                       </div>
                       <div className="space-y-1">
                          <p className="text-xs font-bold text-amber-800 dark:text-amber-400">{tf.f01308}</p>
                          <p className="text-[10px] text-amber-700/70 dark:text-amber-400/70">
                            {tf.f02314}
                          </p>
                       </div>
                    </div>
                 </div>

                 <div className="flex flex-col gap-3">
                    <Button 
                      className="w-full h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg gap-3 shadow-lg shadow-indigo-100 dark:shadow-none"
                      onClick={() => handleConnectSNS(currentConnectingPlatform?.id)}
                    >
                      {currentConnectingPlatform?.icon}
                      {tf.f02315.replace("{name}", currentConnectingPlatform?.name ?? "")}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full h-12 rounded-2xl text-slate-400 font-bold"
                      onClick={() => setIsConnectDialogOpen(false)}
                    >
                      {tf.f02039}
                    </Button>
                 </div>
               </>
             ) : (
               <div className="space-y-6 py-2 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <Label className="text-xs font-bold text-slate-500">{tf.f02290}</Label>
                       <Input 
                         placeholder={tf.f01682} 
                         value={loginInput.id} 
                         onChange={e => setLoginInput({...loginInput, id: e.target.value})}
                         className="h-12 rounded-xl"
                       />
                    </div>
                    <div className="space-y-2">
                       <Label className="text-xs font-bold text-slate-500">{tf.f01303}</Label>
                       <Input 
                         type="password" 
                         placeholder={tf.f01304} 
                         value={loginInput.pw} 
                         onChange={e => setLoginInput({...loginInput, pw: e.target.value})}
                         className="h-12 rounded-xl"
                       />
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button 
                      className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-lg gap-3 shadow-lg shadow-emerald-100 dark:shadow-none"
                      onClick={() => handleConnectSNS(currentConnectingPlatform?.id)}
                      disabled={isLoginProcessing || !loginInput.id || !loginInput.pw}
                    >
                      {isLoginProcessing ? <Zap className="w-5 h-5 animate-spin" /> : <CheckCircle2 className="w-5 h-5" />}
                      {tf.f02316.replace("{name}", currentConnectingPlatform?.name ?? "")}
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="w-full h-12 rounded-2xl text-slate-400 font-bold"
                      onClick={() => {
                        setLoginStep('info');
                        setLoginInput({ id: '', pw: '' });
                      }}
                    >
                      {tf.f00162}
                    </Button>
                  </div>
               </div>
             )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generated Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto border-none shadow-2xl p-0">
          <div className="bg-emerald-600 p-6 text-white sticky top-0 z-10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Sparkles className="w-6 h-6 text-yellow-300" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold">{tf.f02204}</DialogTitle>
                <DialogDescription className="text-emerald-100 text-xs font-medium">
                  {tf.f02237}
                </DialogDescription>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-none px-3 py-1 font-bold">
              {generatedBlog?.platform?.toUpperCase()}
            </Badge>
          </div>
          
          <div className="p-8 space-y-6 bg-white dark:bg-slate-950">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-3 bg-emerald-500 rounded-full" /> {tf.f01825}
              </h4>
              <div className="text-xl font-black text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                {generatedBlog?.title}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <div className="w-1 h-3 bg-emerald-500 rounded-full" /> {tf.f01262}
              </h4>
              <div className="text-base font-medium text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 whitespace-pre-wrap leading-relaxed shadow-inner min-h-[200px]">
                {generatedBlog?.content}
              </div>
            </div>

            <div className="flex gap-4 pt-4 sticky bottom-0 bg-white dark:bg-slate-950 pb-2">
              <Button 
                variant="outline" 
                className="flex-1 h-14 rounded-2xl font-bold"
                onClick={() => setIsPreviewOpen(false)}
              >
                {tf.f01024}
              </Button>
              <Button 
                className="flex-[2] h-14 rounded-2xl font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:scale-[1.02] transition-all gap-2 text-lg shadow-lg shadow-emerald-100 dark:shadow-none"
                onClick={() => {
                  handlePublish();
                  setIsPreviewOpen(false);
                }}
                disabled={isPublishing}
              >
                {isPublishing ? <Zap className="w-5 h-5 animate-spin" /> : <Workflow className="w-5 h-5" />}
                {isPublishing
                  ? tf.f01130
                  : tf.f01898}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
