import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import {
  Shield, Users, CreditCard, BarChart3, Plus,
  ArrowLeft, Search, Calendar, Printer, RefreshCw, Key, Mail, Trash2, Type, FileText
} from 'lucide-react';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';
import { toast } from 'sonner';

function fillRibbonTemplate(template: string, vars: Record<string, string | number>): string {
  let s = template;
  for (const [key, val] of Object.entries(vars)) {
    s = s.split(`{{${key}}}`).join(String(val));
  }
  return s;
}

interface Profile {
  id: string;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  payment_method: string;
  amount: number;
}

interface PrintStat {
  user_id: string;
  email: string;
  print_count: number;
}

interface WebFontStat {
  id: string;
  user_id: string;
  email: string;
  font_family: string;
  web_url: string;
  created_at: string;
}

interface AuditLog {
  id: string;
  admin_id: string;
  admin_email: string;
  target_user_id: string;
  target_email: string;
  action_type: string;
  details: any;
  reason: string;
  created_at: string;
}

export default function AdminDashboard({ onBack }: { onBack: () => void }) {
  const locale = usePreferredLocale();
  const R = getMessages(locale).dashboard.ribbon;
  const [tab, setTab] = useState<'users' | 'stats' | 'fonts' | 'logs'>('users');
  const [users, setUsers] = useState<Profile[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [printStats, setPrintStats] = useState<PrintStat[]>([]);
  const [webFonts, setWebFonts] = useState<WebFontStat[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'admin' | 'monthly' | 'quarterly' | 'half_yearly' | 'yearly' | 'event' | 'expired'>('all');

  // 구독 연장 모달
  const [extendModal, setExtendModal] = useState<{ userId: string; email: string } | null>(null);
  const [extendPlan, setExtendPlan] = useState<string>('monthly');
  const [extendDays, setExtendDays] = useState(30);
  const [extendAmount, setExtendAmount] = useState(29900);
  const [extendReason, setExtendReason] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      // 사용자 목록
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      setUsers(profileData || []);

      // 구독 현황
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .order('created_at', { ascending: false });
      setSubscriptions(subData || []);

      // 인쇄 통계 (사용자별 횟수)
      const { data: historyData } = await supabase
        .from('print_history')
        .select('user_id, printed_at');

      if (historyData && profileData) {
        const countMap = new Map<string, number>();
        historyData.forEach((h: any) => {
          countMap.set(h.user_id, (countMap.get(h.user_id) || 0) + 1);
        });
        const stats: PrintStat[] = profileData.map((u: any) => ({
          user_id: u.id,
          email: u.email || '',
          print_count: countMap.get(u.id) || 0,
        }));
        stats.sort((a, b) => b.print_count - a.print_count);
        setPrintStats(stats);
      }

      // 웹 폰트 모니터링
      const { data: fontData } = await supabase
        .from('custom_fonts')
        .select('*')
        .eq('source', 'web')
        .order('created_at', { ascending: false });

      if (fontData && profileData) {
        setWebFonts(fontData.map((f: any) => ({
          id: f.id,
          user_id: f.user_id,
          email: profileData.find((p: any) => p.id === f.user_id)?.email || R.adminUnknownEmail,
          font_family: f.font_family,
          web_url: f.web_url,
          created_at: f.created_at
        })));
      }

      // 관리자 감사 로그
      const { data: logsData } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (logsData && profileData) {
        setAuditLogs(logsData.map((l: any) => ({
          ...l,
          admin_email: profileData.find((p: any) => p.id === l.admin_id)?.email || R.adminUnknownEmail,
          target_email: profileData.find((p: any) => p.id === l.target_user_id)?.email || R.adminUnknownEmail,
        })));
      }

    } catch (err) {
      console.error('Admin load error:', err);
    }
    setLoading(false);
  };

  const getUserSub = (userId: string): Subscription | undefined => {
    return subscriptions.find(s => s.user_id === userId);
  };

  const isSubActive = (sub?: Subscription): boolean => {
    if (!sub || !sub.expires_at) return false;
    return new Date(sub.expires_at) > new Date() && sub.status === 'active';
  };

  const handleResetPasswordEmail = async (email: string) => {
    if (!confirm(fillRibbonTemplate(R.adminResetEmailConfirm, { email }))) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) toast.error(fillRibbonTemplate(R.adminMailSendFail, { msg: error.message }));
      else toast.success(R.adminMailSendOk);
    } catch (e: any) {
      toast.error(fillRibbonTemplate(R.adminError, { msg: e.message ?? String(e) }));
    }
  };

  const handleForceResetPassword = async (userId: string, email: string) => {
    const newPassword = prompt(fillRibbonTemplate(R.adminForcePwPrompt, { email }));
    if (!newPassword || newPassword.trim() === '') return;

    if (newPassword.length < 6) {
      toast.error(R.adminPwMin6);
      return;
    }

    if (!confirm(fillRibbonTemplate(R.adminForcePwConfirm, { email }))) return;

    try {
      const { error } = await supabase.rpc('admin_reset_password', {
        user_uid: userId,
        new_password: newPassword
      });

      if (error) toast.error(fillRibbonTemplate(R.adminForcePwFail, { msg: error.message }));
      else toast.success(R.adminForcePwOk);
    } catch (e: any) {
      toast.error(fillRibbonTemplate(R.adminError, { msg: e.message ?? String(e) }));
    }
  };

  const handleDeleteUser = async (userId: string, email: string) => {
    const word = R.adminDeleteConfirmWord;
    const promptText = prompt(fillRibbonTemplate(R.adminDeletePrompt, { email, word }));
    if (promptText !== word) return;

    try {
      const { error } = await supabase.rpc('admin_delete_user', { target_uid: userId });
      if (error) throw error;
      toast.success(R.adminDeleteOk);
      loadData();
    } catch (err: any) {
      toast.error(fillRibbonTemplate(R.adminDeleteFail, { msg: err.message ?? String(err) }));
    }
  };

  const handleExtend = async () => {
    if (!extendModal) return;
    if (!extendReason.trim()) {
      toast.error(R.adminExtendReasonRequired);
      return;
    }

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const adminId = userData.user.id;
      const existingSub = getUserSub(extendModal.userId);
      const baseDate = existingSub?.expires_at && new Date(existingSub.expires_at) > new Date()
        ? new Date(existingSub.expires_at)
        : new Date();

      const newExpiry = new Date(baseDate);
      newExpiry.setDate(newExpiry.getDate() + extendDays);

      if (existingSub) {
        // 기존 구독 업데이트
        await supabase
          .from('subscriptions')
          .update({
            plan: extendPlan,
            status: 'active',
            expires_at: newExpiry.toISOString(),
            payment_method: 'admin_manual',
            amount: extendAmount,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingSub.id);
      } else {
        // 새 구독 생성
        await supabase
          .from('subscriptions')
          .insert([{
            user_id: extendModal.userId,
            plan: extendPlan,
            status: 'active',
            started_at: new Date().toISOString(),
            expires_at: newExpiry.toISOString(),
            payment_method: 'admin_manual',
            amount: extendAmount,
          }]);
      }

      // 3. 관리자 감사 로그 작성 (대표 계정은 로그 생략)
      // 대표님께서 실제로 로그인하실 이메일 주소로 아래를 변경해주세요!
      const CEO_EMAIL = 'lilymag0301@gmail.com'; // <-- 이 부분을 실제 대표님 로그인 이메일로 변경하세요

      if (userData.user.email !== CEO_EMAIL) {
        await supabase.from('admin_audit_logs').insert([{
          admin_id: adminId,
          target_user_id: extendModal.userId,
          action_type: 'extend_subscription',
          details: { plan: extendPlan, days: extendDays, amount: extendAmount },
          reason: extendReason,
        }]);
      }

      toast.success(
        fillRibbonTemplate(R.adminExtendOk, {
          email: extendModal.email,
          date: newExpiry.toLocaleDateString(),
        })
      );
      setExtendModal(null);
      setExtendReason('');
      loadData();
    } catch (err: any) {
      toast.error(fillRibbonTemplate(R.adminExtendFail, { msg: err.message ?? String(err) }));
    }
  };

  const filteredUsers = users.filter(u => {
    const sub = getUserSub(u.id);
    const active = isSubActive(sub);
    const matchesSearch = (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
      (u.display_name || '').toLowerCase().includes(search.toLowerCase());

    if (filter === 'all') return matchesSearch;
    if (filter === 'admin') return matchesSearch && u.role === 'admin';
    if (filter === 'expired') return matchesSearch && !active && u.role !== 'admin';
    return matchesSearch && active && sub?.plan === filter;
  });

  const planLabel = (plan: string) => {
    switch (plan) {
      case 'monthly': return R.adminPlanMonthly;
      case 'quarterly': return R.adminPlanQuarterly;
      case 'half_yearly': return R.adminPlanHalfYearly;
      case 'yearly': return R.adminPlanYearly;
      case 'event': return R.adminPlanEvent;
      default: return plan;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      {/* Header */}
      <header className="bg-slate-800/80 border-b border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-lg transition">
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-amber-400/80" />
            <h1 className="text-lg font-semibold">{R.adminTitle}</h1>
          </div>
        </div>
        <button onClick={loadData} className="flex items-center gap-2 px-3 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm transition">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {R.adminRefresh}
        </button>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 p-6">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-blue-500/20 p-2 rounded-lg"><Users size={20} className="text-blue-400" /></div>
            <span className="text-slate-400 text-sm">{R.adminStatUsers}</span>
          </div>
          <p className="text-3xl font-semibold">{users.length}<span className="text-base text-slate-500 ml-1">{R.adminUnitPeople}</span></p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-emerald-500/20 p-2 rounded-lg"><CreditCard size={20} className="text-emerald-400" /></div>
            <span className="text-slate-400 text-sm">{R.adminStatSubscribers}</span>
          </div>
          <p className="text-3xl font-semibold text-emerald-400">
            {subscriptions.filter(s => isSubActive(s)).length}
            <span className="text-base text-slate-500 ml-1">{R.adminUnitPeople}</span>
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-purple-500/20 p-2 rounded-lg"><Printer size={20} className="text-purple-400" /></div>
            <span className="text-slate-400 text-sm">{R.adminStatPrints}</span>
          </div>
          <p className="text-3xl font-semibold text-purple-400">
            {printStats.reduce((s, p) => s + p.print_count, 0)}
            <span className="text-base text-slate-500 ml-1">{R.adminUnitTimes}</span>
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-6 flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setTab('users')}
          className={`px-4 py-3 text-sm font-semibold border-b-2 transition ${tab === 'users' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'
            }`}
        >
          <Users size={14} className="inline mr-2" />{R.adminTabUsers}
        </button>
        <button
          onClick={() => setTab('stats')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition ${tab === 'stats' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'
            }`}
        >
          <BarChart3 size={14} className="inline mr-2" />{R.adminTabStats}
        </button>
        <button
          onClick={() => setTab('fonts')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition ${tab === 'fonts' ? 'border-blue-500 text-blue-400' : 'border-transparent text-slate-500 hover:text-white'
            }`}
        >
          <Type size={14} className="inline mr-2" />{R.adminTabFonts}
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`px-4 py-3 text-sm font-bold border-b-2 transition ${tab === 'logs' ? 'border-amber-500 text-amber-400' : 'border-transparent text-slate-500 hover:text-white'
            }`}
        >
          <FileText size={14} className="inline mr-2" />{R.adminTabLogs}
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {tab === 'users' && (
          <div>
            {/* Search */}
            <div className="flex gap-3 mb-4">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder={R.adminSearchPlaceholder}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
              <select
                value={filter}
                onChange={e => setFilter(e.target.value as any)}
                className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500 min-w-[150px]"
              >
                <option value="all">{R.adminFilterAll}</option>
                <option value="admin">{R.adminFilterAdmin}</option>
                <option value="monthly">{R.adminFilterMonthly}</option>
                <option value="quarterly">{R.adminFilterQuarterly}</option>
                <option value="half_yearly">{R.adminFilterHalfYearly}</option>
                <option value="yearly">{R.adminFilterYearly}</option>
                <option value="event">{R.adminFilterEvent}</option>
                <option value="expired">{R.adminFilterExpired}</option>
              </select>
            </div>

            {/* User Table */}
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700/50 text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left px-4 py-3">{R.adminColUser}</th>
                    <th className="text-left px-4 py-3">{R.adminColJoined}</th>
                    <th className="text-left px-4 py-3">{R.adminColSub}</th>
                    <th className="text-left px-4 py-3">{R.adminColExpires}</th>
                    <th className="text-left px-4 py-3">{R.adminColPrints}</th>
                    <th className="text-center px-4 py-3">{R.adminColActions}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(user => {
                    const sub = getUserSub(user.id);
                    const active = isSubActive(sub);
                    const stat = printStats.find(p => p.user_id === user.id);
                    return (
                      <tr key={user.id} className="border-t border-slate-700/50 hover:bg-slate-700/30 transition">
                        <td className="px-4 py-3">
                          <div className="flex flex-col">
                            <span className="font-semibold text-white">{user.display_name || '-'}</span>
                            <span className="text-[11px] text-slate-500">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-400 text-xs">
                          {new Date(user.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3">
                          {user.role === 'admin' ? (
                            <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
                              🛡️ {R.adminBadgeAdmin}
                            </span>
                          ) : active ? (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${sub?.plan === 'event' ? 'bg-purple-500/20 text-purple-400' : 'bg-emerald-500/20 text-emerald-400'
                              }`}>
                              {sub?.plan === 'event' ? '🎁 ' : '✅ '} {planLabel(sub!.plan)}
                            </span>
                          ) : (
                            <span className="px-2 py-1 bg-red-500/15 text-red-400 rounded-full text-xs font-semibold">
                              {R.adminStatusExpired}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-400">
                          {sub?.expires_at ? new Date(sub.expires_at).toLocaleDateString() : '-'}
                        </td>
                        <td className="px-4 py-3 text-center font-mono text-slate-300">
                          {stat?.print_count || 0}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              title={R.adminTitleExtend}
                              onClick={() => setExtendModal({ userId: user.id, email: user.email })}
                              className="px-2.5 py-1.5 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-semibold rounded-lg transition flex flex-col items-center"
                            >
                              <Plus size={14} /> {R.adminBtnExtend}
                            </button>
                            <button
                              title={R.adminTitleResetMail}
                              onClick={() => handleResetPasswordEmail(user.email)}
                              className="px-2.5 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 text-xs font-semibold rounded-lg transition flex flex-col items-center"
                            >
                              <Mail size={14} /> {R.adminBtnResetMail}
                            </button>
                            <button
                              title={R.adminTitleForcePw}
                              onClick={() => handleForceResetPassword(user.id, user.email)}
                              className="px-2.5 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-xs font-semibold rounded-lg transition flex flex-col items-center"
                            >
                              <Key size={14} /> {R.adminBtnForcePw}
                            </button>
                            <button
                              title={R.adminTitleDeleteUser}
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              className="px-2.5 py-1.5 bg-red-900/40 hover:bg-red-900/80 text-red-500 text-xs font-semibold rounded-lg transition flex flex-col items-center ml-2 border border-red-900/50"
                            >
                              <Trash2 size={14} /> {R.adminBtnDeleteUser}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-10 text-slate-500">
                        {loading ? R.adminLoading : R.adminNoUsers}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'stats' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400">{R.adminStatsHeading}</h3>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700/50 text-slate-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">{R.adminColRank}</th>
                    <th className="text-left px-4 py-3">{R.adminColEmail}</th>
                    <th className="text-left px-4 py-3">{R.adminColCount}</th>
                    <th className="text-left px-4 py-3">{R.adminColShare}</th>
                  </tr>
                </thead>
                <tbody>
                  {printStats.map((stat, idx) => {
                    const total = printStats.reduce((s, p) => s + p.print_count, 0);
                    const pct = total > 0 ? (stat.print_count / total * 100).toFixed(1) : '0';
                    return (
                      <tr key={stat.user_id} className="border-t border-slate-700/50">
                        <td className="px-4 py-3 text-slate-500 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 text-white">{stat.email}</td>
                        <td className="px-4 py-3 font-semibold text-blue-400 font-mono">{stat.print_count}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 bg-slate-700 rounded-full flex-1 overflow-hidden">
                              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                            <span className="text-xs text-slate-500 w-12 text-right">{pct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {printStats.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-10 text-slate-500">{R.adminNoPrints}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'fonts' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-400 flex items-center justify-between">
              {R.adminFontsHeading}
              <span className="text-xs font-normal text-amber-400 bg-amber-400/10 px-2 py-1 rounded">{R.adminFontsCap}</span>
            </h3>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700/50 text-slate-400 text-xs uppercase">
                    <th className="text-left px-4 py-3">{R.adminColRegistered}</th>
                    <th className="text-left px-4 py-3">{R.adminColAccount}</th>
                    <th className="text-left px-4 py-3">{R.adminColFontFamily}</th>
                    <th className="text-left px-4 py-3">{R.adminColCssUrl}</th>
                    <th className="text-center px-4 py-3">{R.adminColStatus}</th>
                  </tr>
                </thead>
                <tbody>
                  {webFonts.map(font => (
                    <tr key={font.id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(font.created_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-white">{font.email}</td>
                      <td className="px-4 py-3 font-semibold text-blue-400">{font.font_family}</td>
                      <td className="px-4 py-3 text-xs text-slate-400 font-mono truncate max-w-[300px]" title={font.web_url}>
                        {font.web_url}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={async () => {
                            if (!confirm(R.adminWebFontDeleteConfirm)) return;
                            await supabase.from('custom_fonts').delete().eq('id', font.id);
                            loadData();
                          }}
                          className="px-3 py-1 bg-red-500/10 text-red-500 hover:bg-red-500/30 rounded text-xs transition"
                        >
                          {R.adminWebFontDelete}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {webFonts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-500">{R.adminNoWebFonts}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'logs' && (
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-amber-400 flex items-center gap-2">
              <Shield size={16} /> {R.adminLogsHeading}
            </h3>
            <p className="text-xs text-slate-400 mb-2">{R.adminLogsSub}</p>
            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-700/50 text-slate-400 text-xs uppercase">
                    <th className="text-left px-4 py-3 min-w-[140px]">{R.adminColTime}</th>
                    <th className="text-left px-4 py-3">{R.adminColAdmin}</th>
                    <th className="text-left px-4 py-3">{R.adminColTarget}</th>
                    <th className="text-left px-4 py-3">{R.adminColAction}</th>
                    <th className="text-left px-4 py-3 min-w-[300px]">{R.adminColDetail}</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id} className="border-t border-slate-700/50 hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-slate-500 text-xs">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3 text-amber-400 font-semibold">{log.admin_email}</td>
                      <td className="px-4 py-3 text-white">{log.target_email}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded text-xs font-semibold">
                          {log.action_type === 'extend_subscription' ? R.adminActionExtend : log.action_type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-slate-400 font-mono mb-1">
                          {JSON.stringify(log.details)}
                        </div>
                        <div className="text-sm font-semibold text-rose-300">
                          {R.adminReasonPrefix} {log.reason}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-10 text-slate-500">{R.adminNoLogs}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Extend Subscription Modal */}
      {extendModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200]">
          <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-white mb-1 flex items-center gap-2">
              <Calendar size={18} className="text-blue-400" /> {R.adminModalExtendTitle}
            </h2>
            <p className="text-sm text-slate-400 mb-5">{extendModal.email}</p>

            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 block mb-1">{R.adminModalPlan}</label>
                <select
                  value={extendPlan}
                  onChange={e => {
                    setExtendPlan(e.target.value);
                    if (e.target.value === 'monthly') { setExtendDays(30); setExtendAmount(29900); }
                    else if (e.target.value === 'quarterly') { setExtendDays(90); setExtendAmount(79900); }
                    else if (e.target.value === 'half_yearly') { setExtendDays(180); setExtendAmount(149900); }
                    else if (e.target.value === 'yearly') { setExtendDays(365); setExtendAmount(269900); }
                    else if (e.target.value === 'event') { setExtendDays(7); setExtendAmount(0); }
                  }}
                  className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm"
                >
                  <option value="monthly">{R.adminOptMonthly}</option>
                  <option value="quarterly">{R.adminOptQuarterly}</option>
                  <option value="half_yearly">{R.adminOptHalfYearly}</option>
                  <option value="yearly">{R.adminOptYearly}</option>
                  <option value="event">{R.adminOptEvent}</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{R.adminModalDays}</label>
                  <input
                    type="number"
                    value={extendDays}
                    onChange={e => setExtendDays(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm text-center font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{R.adminModalAmount}</label>
                  <input
                    type="number"
                    value={extendAmount}
                    onChange={e => setExtendAmount(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-900 border border-slate-600 rounded-lg text-white text-sm text-center font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-amber-400 font-semibold block mb-1">{R.adminModalReason}</label>
                <input
                  type="text"
                  placeholder={R.adminModalReasonPh}
                  value={extendReason}
                  onChange={e => setExtendReason(e.target.value)}
                  className="w-full p-2.5 bg-amber-900/20 border border-amber-700/50 rounded-lg text-white text-sm focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  onClick={() => setExtendModal(null)}
                  className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-semibold text-sm transition"
                >
                  {R.cancel}
                </button>
                <button
                  onClick={handleExtend}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold text-sm transition"
                >
                  {R.adminModalGrant}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
