"use client";
import { useState, useEffect } from 'react';
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
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const locale = usePreferredLocale();
  const L = getMessages(locale).login;
  const baseLocale = toBaseLocale(locale);
  const phLoginEmail = pickUiText(
    baseLocale,
    "name@flower.com",
    "you@example.com",
    "email@company.com",
    "info@yourshop.jp",
    "kefu@yourshop.cn",
    "hola@tutienda.com",
    "contato@sualoja.com",
    "contact@votreboutique.com",
    "info@ihre-blumen.de",
    "info@vash-magazin.ru",
  );
  const phRegEmail = pickUiText(
    baseLocale,
    "master@flower.com",
    "owner@example.com",
    "chu@company.com",
    "master@yourshop.jp",
    "dianzhu@yourshop.cn",
    "dueno@tutienda.com",
    "dono@sualoja.com",
    "gerant@votreboutique.com",
    "inhaber@beispiel.de",
    "vladeliec@primer.ru",
  );
  const phResetEmail = pickUiText(
    baseLocale,
    "example@flower.com",
    "you@example.com",
    "email@company.com",
    "support@yourshop.jp",
    "kefu@yourshop.cn",
    "ayuda@tutienda.com",
    "ajuda@sualoja.com",
    "aide@votreboutique.com",
    "hilfe@beispiel.de",
    "help@primer.ru",
  );
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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

  // KakaoTalk In-App Browser Auto-Outlink
  useEffect(() => {
    const isKakaoTalk = /KAKAOTALK/i.test(navigator.userAgent);
    if (isKakaoTalk) {
      // Force open in external browser for KakaoTalk
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(window.location.href)}`;
    }
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error(L.toastResetEmailRequired);
      return;
    }

    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });

      if (error) throw error;
      
      toast.success(L.toastResetSent, {
        description: L.toastResetSentDesc,
      });
      setIsResetDialogOpen(false);
    } catch (error: any) {
      toast.error(L.toastSendFailed, { description: error.message });
    } finally {
      setResetLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setGoogleLoading(true);
      
      // Prefer runtime origin, then configured app URL for SSR/preview safety.
      const origin =
        typeof window !== 'undefined' && window.location.origin
          ? window.location.origin
          : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const redirectTo = `${origin}/auth/callback`;
      
      console.log('Attempting Google Sign-in with redirect:', redirectTo);
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectTo,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      });
      if (error) throw error;
    } catch (error: any) {
      console.error('Google Sign-in Error:', error);
      let errorDesc = error.message;
      if (error.message?.includes('provider')) {
        errorDesc = L.errGoogleProvider;
      } else if (error.message?.includes('redirect')) {
        errorDesc = L.errGoogleRedirect;
      }
      toast.error(L.errGoogleSignInFailed, { description: errorDesc });
      setGoogleLoading(false);
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
        toast.success(L.toastWelcome, {
          description: L.toastWelcomeDesc,
        });
        router.push('/dashboard');
        router.refresh();
      }
    } catch (error: any) {
      console.error('Login error details:', error);
      let errorMessage = L.errInvalidCreds;

      if (error.message?.includes('Email not confirmed')) {
        errorMessage = L.errEmailNotConfirmed;
      }

      toast.error(L.errLoginFailed, { description: errorMessage });
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
        toast.success(L.toastSignupOk, {
          description: L.toastSignupOkDesc,
        });
        // Clear form
        setRegEmail('');
        setRegPassword('');
        setRegShopName('');
      }
    } catch (error: any) {
      console.error('Signup error details:', error);
      toast.error(L.errSignupFailed, { description: error.message });
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
                src="/images/floxync-logo-dark.png"
                alt={L.logoAlt}
                width={400}
                height={100}
                className="w-auto h-[100px] object-contain dark:hidden"
                priority
              />
              <Image
                src="/images/floxync-logo-white.png"
                alt={L.logoAlt}
                width={400}
                height={100}
                className="w-auto h-[100px] object-contain hidden dark:block"
                priority
              />
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">{L.tabLogin}</TabsTrigger>
                <TabsTrigger value="register">{L.tabRegister}</TabsTrigger>
              </TabsList>
              
              {/* LOGIN TAB */}
              <TabsContent value="login" className="space-y-5">
                <div className="text-center mb-4">
                  <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {L.titleLogin}
                  </CardTitle>
                </div>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{L.email}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder={phLoginEmail}
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-11 bg-white/50 dark:bg-slate-950/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">{L.password}</Label>
                      <button 
                        type="button"
                        onClick={() => setIsResetDialogOpen(true)}
                        className="text-xs font-medium text-blue-600 hover:text-blue-500 hover:underline transition-all"
                      >
                        {L.forgotPassword}
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
                    {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {L.signingIn}</> : L.signInSubmit}
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">{L.socialDivider}</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-11" 
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                    <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {L.continueGoogle}
                </Button>

                {/* Mobile browser warning */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl mt-3">
                  <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 dark:text-amber-400 leading-tight">
                    {L.mobileWarnBefore}
                    <b>{L.mobileWarnBold}</b>
                    {L.mobileWarnAfter}
                  </p>
                </div>


              </TabsContent>

              {/* REGISTER TAB */}
              <TabsContent value="register" className="space-y-5">
                <div className="text-center mb-4">
                  <CardTitle className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {L.titleRegister}
                  </CardTitle>
                </div>
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="shop">{L.shopName}</Label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="shop"
                        type="text"
                        placeholder={L.shopPlaceholder}
                        required
                        value={regShopName}
                        onChange={(e) => setRegShopName(e.target.value)}
                        className="pl-10 h-11 bg-white/50 dark:bg-slate-950/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">{L.ownerEmail}</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                      <Input
                        id="reg-email"
                        type="email"
                        placeholder={phRegEmail}
                        required
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        className="pl-10 h-11 bg-white/50 dark:bg-slate-950/50"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">{L.password}</Label>
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
                    {regLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {L.creatingAccount}</> : L.registerSubmit}
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase font-bold tracking-widest">
                    <span className="bg-white dark:bg-slate-900 px-3 text-slate-400">{L.socialDivider}</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full h-11" 
                  onClick={handleGoogleSignIn}
                  disabled={googleLoading}
                >
                  {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                    <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                  )}
                  {L.continueGoogleSignup}
                </Button>

                {/* Mobile browser warning */}
                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-xl mt-3">
                  <Info className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-amber-800 dark:text-amber-400 leading-tight">
                    {L.mobileWarnBefore}
                    <b>{L.mobileWarnBold}</b>
                    {L.mobileWarnAfter}
                  </p>
                </div>

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
                {L.resetTitle}
              </DialogTitle>
              <DialogDescription className="text-slate-500">
                {L.resetDescLine1}
                <br />
                {L.resetDescLine2}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleResetPassword} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="reset-email" className="text-slate-700">{L.resetEmailLabel}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder={phResetEmail}
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
                  {L.resetHintLine1}
                  <br />
                  <strong>{L.resetHintAdmin}</strong>
                  {L.resetHintAfter}
                </p>
              </div>
              <DialogFooter className="sm:justify-end gap-2">
                <Button type="button" variant="ghost" onClick={() => setIsResetDialogOpen(false)}>{L.cancel}</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={resetLoading}>
                  {resetLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : L.sendResetLink}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
