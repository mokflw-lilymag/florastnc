"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Loader2, Eye, EyeOff, Lock, Mail, Building, Info, Shield } from 'lucide-react';
import Image from 'next/image';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sign Up State
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regShopName, setRegShopName] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);

  // Forgot Password State
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('이메일을 입력해 주세요.');
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      
      toast.success('비밀번호 재설정 메일 발송', {
        description: '입력하신 이메일로 재설정 링크가 전송되었습니다.'
      });
      setIsResetDialogOpen(false);
    } catch (error: any) {
      toast.error('발송 실패', { description: error.message });
    } finally {
      setResetLoading(false);
    }
  };

  const handleQuickLogin = async (type: 'admin' | 'partner') => {
    setLoading(true);
    const demoEmail = type === 'admin' ? 'lilymag0301@gmail.com' : 'lilymagnc@gmail.com';
    const demoPassword = '102938';
    
    setEmail(demoEmail);
    setPassword(demoPassword);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: demoEmail,
        password: demoPassword,
      });

      if (error) throw error;

      if (data.user) {
        toast.success(`${type === 'admin' ? '관리자' : '화원사'} 데모 로그인 성공!`);
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error: any) {
      toast.error('데모 로그인 실패', { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        toast.success('Welcome Back!', {
          description: 'Successfully logged into Florasync.',
        });
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error: any) {
      console.error('Login error details:', error);
      let errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
      toast.error('Authentication Failed', { description: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);

    try {
      // Create user
      const { data, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: {
            shop_name: regShopName,
            role: 'tenant_admin'
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        toast.success('Registration Successful!', {
          description: '새로운 구독자(Tenant) 계정이 생성되었습니다. 로그인해주세요.',
        });
        // Clear form
        setRegEmail('');
        setRegPassword('');
        setRegShopName('');
      }
    } catch (error: any) {
      console.error('Signup error details:', error);
      toast.error('Registration Failed', { description: error.message });
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full bg-purple-400/20 blur-[120px]" />
      </div>

      <div className="w-full max-w-md px-4 z-10">
        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl ring-1 ring-slate-200 dark:ring-slate-800">
          <CardHeader className="space-y-4 pb-0 text-center">
            <div className="mx-auto flex h-16 w-full items-center justify-center p-2 mb-2">
              <Image
                src="https://ecimg.cafe24img.com/pg1472b45444056090/lilymagflower/web/upload/category/logo/v2_d13ecd48bab61a0269fab4ecbe56ce07_lZMUZ1lORo_top.jpg"
                alt="Logo"
                width={200}
                height={50}
                className="w-auto h-12 object-contain"
                priority
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">로그인</TabsTrigger>
                <TabsTrigger value="register">새 화원 등록</TabsTrigger>
              </TabsList>
              
              {/* LOGIN TAB */}
              <TabsContent value="login" className="space-y-5">
                <div className="text-center mb-4">
                  <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Florasync 로그인
                  </CardTitle>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">이메일</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="name@flower.com"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 bg-white/50 dark:bg-slate-950/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">비밀번호</Label>
                      <button 
                        type="button"
                        onClick={() => setIsResetDialogOpen(true)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-500 hover:underline transition-all"
                      >
                        비밀번호를 잊으셨나요?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 bg-white/50 dark:bg-slate-950/50"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-11 w-11 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 mt-2 text-md font-medium" disabled={loading}>
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 로그인 중...</> : '로그인'}
                  </Button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">Quick Demo Access</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Button 
                    variant="outline" 
                    className="h-auto py-3 px-4 flex flex-col items-center gap-1.5 border-slate-200 hover:border-blue-500 hover:bg-blue-50 transition-all rounded-2xl group"
                    onClick={() => handleQuickLogin('admin')}
                    disabled={loading}
                  >
                    <Shield className="w-5 h-5 text-blue-500 group-hover:animate-bounce" />
                    <div className="flex flex-col text-center">
                      <span className="text-[11px] font-black text-slate-900 leading-none mb-0.5">Admin 로그인</span>
                      <span className="text-[8px] font-bold text-slate-400">본사 통합 관리</span>
                    </div>
                  </Button>
                  <Button 
                    variant="outline" 
                    className="h-auto py-3 px-4 flex flex-col items-center gap-1.5 border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all rounded-2xl group"
                    onClick={() => handleQuickLogin('partner')}
                    disabled={loading}
                  >
                    <Building className="w-5 h-5 text-indigo-500 group-hover:animate-bounce" />
                    <div className="flex flex-col text-center">
                      <span className="text-[11px] font-black text-slate-900 leading-none mb-0.5">Shop 로그인</span>
                      <span className="text-[8px] font-bold text-slate-400">화원사 테스트</span>
                    </div>
                  </Button>
                </div>
              </TabsContent>

              {/* REGISTER TAB */}
              <TabsContent value="register" className="space-y-5">
                <div className="text-center mb-4">
                  <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    SaaS 파트너 가입
                  </CardTitle>
                </div>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shop">화원 상호명</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="shop"
                        type="text"
                        placeholder="예: 강남플라워"
                        required
                        value={regShopName}
                        onChange={(e) => setRegShopName(e.target.value)}
                        className="pl-10 h-11 bg-white/50 dark:bg-slate-950/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">운영자 이메일</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder="master@flower.com"
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="pl-10 h-11 bg-white/50 dark:bg-slate-950/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">비밀번호</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="reg-password"
                        type={showRegPassword ? "text" : "password"}
                        required
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        className="pl-10 pr-10 h-11 bg-white/50 dark:bg-slate-950/50"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-11 w-11 hover:bg-transparent"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                      >
                        {showRegPassword ? (
                          <EyeOff className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                        ) : (
                          <Eye className="h-4 w-4 text-slate-400 hover:text-slate-600" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <Button type="submit" className="w-full h-11 mt-2 text-md font-medium" disabled={regLoading}>
                    {regLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 가입 처리중...</> : '새 상점 등록하기 (무료)'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Password Reset Dialog */}
        <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-900">
                <Lock className="h-5 w-5 text-blue-500" />
                비밀번호 찾기
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                가입하신 이메일 주소를 입력해 주세요. <br />
                비밀번호 재설정 링크를 보내드립니다.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-slate-700">이메일 주소</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="example@flower.com"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10 h-11"
                  />
                </div>
              </div>
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 flex items-start gap-3">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <p className="text-[11px] text-blue-800 leading-relaxed font-medium">
                  이메일이 기억나지 않으시거나 다른 문제가 있다면 <br />
                  <strong>시스템 관리자(lily@flower.com)</strong>에게 직접 문의해 주세요.
                </p>
              </div>
              <DialogFooter className="sm:justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsResetDialogOpen(false)}>취소</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : '재설정 링크 받기'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
