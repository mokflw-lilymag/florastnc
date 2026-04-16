'use client';

import React, { useState, useEffect } from 'react';
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
  Youtube
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from 'sonner';
import { createClient } from '@/utils/supabase/client';

interface Agent {
  id: string;
  name: string;
  role: string;
  icon: React.ReactNode;
  description: string;
  tasks: string[];
}

const agents: Agent[] = [
  {
    id: 'architect',
    name: '전략 기획 에이전트',
    role: 'Strategist',
    icon: <Target className="w-5 h-5 text-purple-400" />,
    description: '매장의 위치와 고객 데이터를 분석하여 최적의 홍보 시나리오를 설계합니다.',
    tasks: ['시장 트렌드 분석', '홍보 채널 선정', '캠페인 타이밍 설계']
  },
  {
    id: 'copywriter',
    name: '콘텐트 작가 에이전트',
    role: 'Copywriter',
    icon: <PenTool className="w-5 h-5 text-blue-400" />,
    description: '사장님의 브랜드 스타일에 맞춰 감동적이고 매력적인 홍보 문구를 작성합니다.',
    tasks: ['틱톡/쇼츠 대본 작성', '인스타그램 캡션', '블로그 포스팅']
  },
  {
    id: 'reviewer',
    name: '품질 검수 에이전트',
    role: 'Editor',
    icon: <ShieldCheck className="w-5 h-5 text-green-400" />,
    description: '작성된 내용이 브랜드 이미지와 맞는지, 오타는 없는지 꼼꼼히 검토합니다.',
    tasks: ['브랜드 톤앤매너 검수', '맞춤법 및 신뢰도 체크', '홍보 효과 예측']
  }
];

export default function MarketingStudio() {
  const [selectedAgent, setSelectedAgent] = useState<Agent>(agents[0]);
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
  
  const supabase = createClient();

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
    
    if (error) toast.error('설정 저장 실패');
    else toast.success('브랜드 DNA가 저장되었습니다.');
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

  const startOrchestration = () => {
    setIsProcessing(true);
    setStep(1);
    setTimeout(() => setStep(2), 2000);
    setTimeout(() => setStep(3), 4000);
    setTimeout(() => {
      setIsProcessing(false);
      setStep(0);
      toast.success('AI 홍보 작전이 성공적으로 배포되었습니다!');
    }, 6000);
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
                AI 홍보 마스터
              </h1>
            </div>
            <p className="text-muted-foreground text-lg">
              사장님의 매장을 위한 <span className="text-foreground font-semibold">24시간 자율 마케팅 비서</span>가 작동 중입니다.
            </p>
          </div>
          <Button 
            size="lg" 
            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 hover:scale-[1.02] transition-all font-bold gap-2 shadow-lg shadow-indigo-100 dark:shadow-none h-14 px-8"
            onClick={startOrchestration}
            disabled={isProcessing}
          >
            {isProcessing ? <Zap className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            AI 홍보 작전 시작하기
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
                      AI 에이전트들이 협업하여 홍보 전략을 수립 중입니다...
                    </span>
                    <span className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 rounded-full text-xs font-bold">
                      {step === 1 ? '기획 단계' : step === 2 ? '원고 집필' : '최종 검수'}
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
            <TabsTrigger value="dashboard" className="gap-2"><Layout className="w-4 h-4" /> 통합 관제</TabsTrigger>
            <TabsTrigger value="sns" className="gap-2"><Globe className="w-4 h-4" /> SNS 연동 관리</TabsTrigger>
            <TabsTrigger value="settings" className="gap-2"><Settings className="w-4 h-4" /> 브랜드 DNA 설정</TabsTrigger>
          </TabsList>
          
          <TabsContent value="dashboard">
            {/* ... (existing dashboard content) ... */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Agent Status */}
              <div className="flex flex-col gap-4">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-2 px-1">
                  <Target className="w-5 h-5 text-indigo-500" /> 홍보 에이전트 군단
                </h2>
                {agents.map((agent) => (
                  <Card 
                    key={agent.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-md border-slate-100 dark:border-slate-800 ${selectedAgent.id === agent.id ? 'bg-indigo-50/50 border-indigo-200 dark:bg-indigo-900/10 dark:border-indigo-800' : 'bg-white dark:bg-slate-900'}`}
                    onClick={() => setSelectedAgent(agent)}
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
                    <span className="text-sm font-medium">과거 홍보 기록 보기</span>
                  </CardContent>
                </Card>
              </div>

              {/* Detail View */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                    <span className="text-indigo-600">[{selectedAgent.name}]</span> 의 업무 지침
                  </h2>
                </div>

                <Card className="border-none shadow-2xl bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 border-b flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">AI HARNESS PROFILE v2.0</span>
                    <div className="flex gap-2 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      STATUS: ONLINE
                    </div>
                  </div>
                  <CardContent className="p-8">
                    <div className="space-y-8">
                      <section>
                        <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-indigo-600 rounded-full" /> 에이전트 미션 (Mission)
                        </h3>
                        <p className="text-lg font-medium text-slate-700 dark:text-slate-200 leading-relaxed border-l-4 border-indigo-100 pl-6 py-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-r-lg">
                          "{selectedAgent.description}"
                        </p>
                      </section>

                      <section>
                        <h3 className="text-sm font-bold text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <div className="w-1.5 h-4 bg-indigo-600 rounded-full" /> 주요 작업 단계 (Pipeline)
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
                          <div className="w-1.5 h-4 bg-indigo-600 rounded-full" /> 브랜드 가이드라인 (Harness Rules)
                        </h3>
                        <div className="space-y-3 bg-indigo-50/20 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-50 dark:border-indigo-900/30">
                          <li className="text-sm flex items-start gap-3 text-slate-600 dark:text-slate-400">
                            <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                            <span>최신 유행하는 '꽃집' 브랜딩 트렌드를 반영하여 신뢰도 있는 문장을 사용합니다.</span>
                          </li>
                          <li className="text-sm flex items-start gap-3 text-slate-600 dark:text-slate-400">
                            <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                            <span>불필요한 AI스러운 표현을 배제하고, 실제 플로리스트가 쓴 것 같은 생생함을 유지합니다.</span>
                          </li>
                          <li className="text-sm flex items-start gap-3 text-slate-600 dark:text-slate-400">
                            <ShieldCheck className="w-5 h-5 text-indigo-500 shrink-0" />
                            <span>각 플랫폼(틱톡, 인스타 등)의 특성에 최적화된 문법과 해시태그를 사용합니다.</span>
                          </li>
                        </div>
                      </section>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="sns">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               <Card className="border-none shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
                  <CardHeader className="bg-slate-50 dark:bg-slate-900">
                    <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-indigo-600" /> SNS 계정 연결 관리</CardTitle>
                    <CardDescription>개인 또는 비즈니스 SNS 계정을 앱과 연결하여 자동 포스팅 권한을 부여합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-6">
                     {[
                       { id: 'instagram', name: 'Instagram / Facebook', icon: <Instagram className="w-5 h-5 text-pink-500" /> },
                       { id: 'youtube', name: 'YouTube Shorts', icon: <Youtube className="w-5 h-5 text-red-600" /> },
                       { id: 'naver', name: 'Naver Blog', icon: <Zap className="w-5 h-5 text-green-600" /> },
                       { id: 'tiktok', name: 'TikTok', icon: <Globe className="w-5 h-5 text-slate-900" /> },
                     ].map((p) => (
                        <div key={p.id} className="flex items-center justify-between p-5 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                           <div className="flex items-center gap-4">
                              <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm">
                                {p.icon}
                              </div>
                              <div>
                                 <p className="text-sm font-extrabold">{p.name}</p>
                                 <p className={`text-[10px] font-bold uppercase tracking-widest ${connectedPlatforms.includes(p.id) ? 'text-emerald-500' : 'text-slate-400'}`}>
                                    상태: {connectedPlatforms.includes(p.id) ? '보안 연결 활성' : '연결 필요'}
                                 </p>
                              </div>
                           </div>
                           {connectedPlatforms.includes(p.id) ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 py-1.5 px-3 rounded-lg flex gap-1">
                                 <CheckCircle2 className="w-3 h-3" /> 연결됨
                              </Badge>
                           ) : (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="rounded-xl h-9 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                onClick={() => toast.info(`${p.name} 연결 프로세스를 시작합니다.`)}
                              >
                                계정 연결하기
                              </Button>
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
                        <h3 className="text-xl font-black italic tracking-tighter uppercase underline decoration-indigo-500 decoration-4 underline-offset-8">완전 자동화의 핵심 원리</h3>
                     </div>
                     
                     <div className="space-y-6">
                        <section className="space-y-3">
                           <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest">01. 관리자의 역할 (Infrastructure)</h4>
                           <p className="text-sm leading-relaxed text-slate-300 font-medium">
                              최고 관리자는 각 SNS 공급자(Meta, Google 등)의 **공식 개발자 앱**을 등록합니다. 이는 플랫폼 전체의 '통로'를 여는 작업입니다.
                           </p>
                        </section>

                        <section className="space-y-3">
                           <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest">02. 사용자의 역할 (Authorization)</h4>
                           <p className="text-sm leading-relaxed text-slate-300 font-medium">
                              사용자는 본인의 계정으로 **일회성 로그인**을 수행하여 '접근 토큰(Access Token)'을 발급받습니다. 이 토큰이 있어야만 AI가 사장님 대신 글을 올릴 수 있습니다.
                           </p>
                        </section>

                        <section className="space-y-3">
                           <h4 className="text-xs font-black text-indigo-300 uppercase tracking-widest">03. AI의 역할 (Autonomous)</h4>
                           <p className="text-sm leading-relaxed text-slate-300 font-medium">
                              설정이 완료되면 AI 엔진이 **사용자의 토큰**을 들고 n8n 파이프라인으로 이동하여, 사장님이 주무시는 동안에도 정해진 시간에 콘텐츠를 전송합니다.
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
                    <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-indigo-600" /> 브랜드 페르소나 (Persona)</CardTitle>
                    <CardDescription>AI 에이전트가 어떤 성격으로 고객과 소통할지 결정합니다.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8 space-y-8">
                     <div className="grid grid-cols-2 gap-4">
                        {[
                          { id: 'Elegant & Premium', label: '💎 우아함 & 프리미엄', desc: '고급스러운 어투와 전문적인 이미지를 강조합니다.' },
                          { id: 'Warm & Emotional', label: '🌸 따뜻함 & 감성적', desc: '고객의 마음을 터치하는 다정한 언어를 사용합니다.' },
                          { id: 'Trendy & Hip', label: '🔥 트렌디 & 힙', desc: '최신 유행어와 감각적인 표현으로 젊은 층을 공략합니다.' },
                          { id: 'Expert & Professional', label: '🛠️ 전문가 & 장인정신', desc: '꽃에 대한 깊은 지식과 실력을 바탕으로 신뢰를 줍니다.' }
                        ].map((p) => (
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
                        <Label className="text-sm font-bold flex items-center gap-2"><MessageSquare className="w-4 h-4" /> 주요 홍보 주제 (Marketing Themes)</Label>
                        <div className="flex gap-2">
                           <Input 
                            placeholder="예: 매일 아침 새벽 배송받는 싱싱한 꽃" 
                            value={newTheme} 
                            onChange={(e) => setNewTheme(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && addTheme()}
                           />
                           <Button onClick={addTheme} variant="outline" className="shrink-0"><Plus className="w-4 h-4" /></Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                           {themes.length === 0 && <span className="text-xs text-slate-400 italic font-medium">등록된 홍보 주제가 없습니다. 주제를 추가해 주세요.</span>}
                           {themes.map((t) => (
                             <Badge key={t} variant="secondary" className="px-3 py-1.5 rounded-full gap-2 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
                               {t}
                               <Trash2 className="w-3.5 h-3.5 cursor-pointer hover:text-red-500" onClick={() => removeTheme(t)} />
                             </Badge>
                           ))}
                        </div>
                     </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-xl ring-1 ring-slate-100 dark:ring-slate-800">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Globe className="w-5 h-5 text-blue-600" /> 대상 SNS 플랫폼 선택</CardTitle>
                    <CardDescription>홍보 콘텐츠를 자동으로 업로드할 채널을 선택합니다.</CardDescription>
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
                       <CardTitle className="text-lg flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> 자율 주행 마케팅 (Auto-Pilot)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                       <div className="flex items-center justify-between">
                          <span className="text-sm font-bold">24시간 자동 모드 활성화</span>
                          <Switch 
                            checked={shopSettings.auto_pilot_enabled}
                            onCheckedChange={(val) => setShopSettings({...shopSettings, auto_pilot_enabled: val})}
                          />
                       </div>
                       <p className="text-xs text-slate-400 leading-relaxed bg-slate-800/50 p-4 rounded-xl border border-slate-700">
                          활성화 시, AI가 매일 가장 트렌디한 주제를 선정하여 설정된 페르소나와 홍보 주제에 맞춰 자동으로 콘텐츠를 생성하고 각 SNS에 업로드합니다.
                       </p>
                       <Button className="w-full bg-white text-slate-900 hover:bg-slate-100 font-black h-12 rounded-xl" onClick={handleSaveSettings}>
                          DNA 설정 및 자동화 저장
                       </Button>
                    </CardContent>
                 </Card>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
