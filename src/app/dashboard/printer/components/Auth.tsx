import { useState } from 'react';
import { supabase } from './lib/supabase';
import { Mail, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';

export default function Auth({ onAuthenticated }: { onAuthenticated: () => void }) {
  const locale = usePreferredLocale();
  const R = getMessages(locale).dashboard.ribbon;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthenticated();
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage(R.authSignupEmailSent);
      }
    } catch (err: any) {
      if (err.message.includes('Invalid login credentials')) {
        setError(R.authInvalidCredentials);
      } else if (err.message.includes('User already registered')) {
        setError(R.authAlreadyRegistered);
      } else {
        setError(err.message || R.authGenericError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans pattern-bg">
      <div className="bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700">
        <div className="p-8 text-center border-b border-slate-700 bg-slate-800/50 flex flex-col items-center">
          <img src="/logo.png" alt="Floxync" className="w-24 h-24 mb-4 object-contain drop-shadow-2xl rounded-2xl border border-slate-700/30" />
          <h1 className="text-3xl font-black text-white mb-1 tracking-tight">
            Floxync <span className="text-blue-500 font-bold text-2xl">Printer</span>
          </h1>
          <p className="text-blue-400 font-bold tracking-[0.3em] text-[12px] uppercase mt-1">{R.floristTagline}</p>
        </div>
        
        <div className="p-8">
          
          {/* 체험 계정 안내 안내문 (마케팅 용도) */}
          <div className="mb-6 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 text-center">
            <p className="text-sm font-semibold text-blue-400 mb-3 flex justify-center items-center gap-2">
              ✨ {R.authTryWithoutSignup}
            </p>
            <button 
              type="button"
              onClick={() => {
                setIsLogin(true);
                setEmail('test@test.com');
                setPassword('123456');
              }}
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition group"
            >
              <span className="block text-xs text-slate-400 mb-1 group-hover:text-slate-300">{R.authDemoAccountLabel}</span>
              <span className="font-mono text-blue-300 font-semibold tracking-wider">{R.authDemoEmail}</span>
              <span className="text-slate-500 mx-2">/</span>
              <span className="font-mono text-blue-300 font-semibold tracking-wider">{R.authDemoPassword}</span>
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{R.authEmailLabel}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 w-full block rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder={R.authEmailPlaceholder}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">{R.authPasswordLabel}</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full block rounded-lg border border-slate-600 bg-slate-900 px-3 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                  placeholder={R.authPasswordPlaceholder}
                  minLength={6}
                />
              </div>
            </div>

            {error && <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg text-sm">{error}</div>}
            {message && <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-lg text-sm">{message}</div>}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? <LogIn className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />)}
              {isLogin ? R.authLogin : R.authCreateAccount}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => { setIsLogin(!isLogin); setError(null); setMessage(null); }}
              className="text-sm text-slate-400 hover:text-white transition"
            >
              {isLogin ? R.authNoAccountSignup : R.authHasAccountLogin}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
