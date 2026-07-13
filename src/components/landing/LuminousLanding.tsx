'use client';

import { useState, FormEvent, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, Terminal, Smartphone, FlaskConical, Send, Loader2, CheckCircle2, Mail, Cpu, Monitor, Github, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';
import { AppLocale, LOCALE_COOKIE, localizePath, resolveLocale, SUPPORTED_LOCALES, toBaseLocale } from '@/i18n/config';
import { LANDING_LOCALE_SELECT_OPTIONS, resolveLandingSelectLocale } from '@/i18n/ui-locale-options';
import { getMessages } from "@/i18n/getMessages";
import { pickUiText } from "@/i18n/pick-ui-text";
import { createClient } from '@/utils/supabase/client';
import { isElectronClient } from '@/lib/electron-env';
import { LandingSectionNav } from '@/components/landing/LandingSectionNav';
import { LANDING_IMAGES } from '@/data/landing-images';

const SUPPORT_EMAIL = "admin@floxync.com";

function buildMailtoBody(
  baseLocale: string,
  values: {
    fullName: string;
    businessName: string;
    contact: string;
    email: string;
    applyReason: string;
    featureNotes: string;
  },
) {
  const T = (
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
  const lines = [
    T(
      "[Floxync 테스트 유저 신청]",
      "[Floxync] Test user application",
      "[Floxync] Đơn đăng ký dùng thử",
      "[Floxync] テストユーザー申請",
      "[Floxync] 测试用户申请",
      "[Floxync] Solicitud de usuario de prueba",
      "[Floxync] Solicitação de usuário de teste",
      "[Floxync] Demande d’utilisateur test",
      "[Floxync] Testnutzer-Anfrage",
      "[Floxync] Заявка тестового пользователя",
    ),
    "",
    `${T("이름", "Name", "Họ tên", "氏名", "姓名", "Nombre", "Nome", "Nom", "Name", "Имя")}: ${values.fullName}`,
    `${T(
      "상호",
      "Business name",
      "Tên cửa hàng",
      "店舗名",
      "商号",
      "Nombre comercial",
      "Nome comercial",
      "Nom commercial",
      "Firmenname",
      "Название компании",
    )}: ${values.businessName}`,
    `${T("연락처", "Contact", "Liên hệ", "連絡先", "联系方式", "Contacto", "Contato", "Contact", "Kontakt", "Контакт")}: ${values.contact}`,
    `${T("이메일", "Email", "Email", "メール", "邮箱", "Correo", "E-mail", "E-mail", "E-Mail", "Email")}: ${values.email}`,
    "",
    `${T(
      "신청 사유",
      "Reason for applying",
      "Lý do đăng ký",
      "申請理由",
      "申请理由",
      "Motivo",
      "Motivo",
      "Motif",
      "Bewerbungsgrund",
      "Причина заявки",
    )}:\n${values.applyReason}`,
    "",
    values.featureNotes
      ? `${T(
          "추가로 남기는 말",
          "Additional notes",
          "Ghi chú thêm",
          "備考",
          "补充说明",
          "Notas adicionales",
          "Observações",
          "Notes complémentaires",
          "Zusätzliche Hinweise",
          "Дополнительные заметки",
        )}:\n${values.featureNotes}`
      : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function LuminousLanding({ locale = 'ko' }: { locale?: AppLocale }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uiLocale, setUiLocale] = useState<AppLocale>(locale || 'ko');
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session);
    });
  }, []);

  const handleLocaleChange = (nextLocale: AppLocale) => {
    setUiLocale(nextLocale);
    document.cookie = `${LOCALE_COOKIE}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    
    const currentPath = window.location.pathname;
    const pathParts = currentPath.split('/');
    if (pathParts.length > 1 && SUPPORTED_LOCALES.includes(pathParts[1] as any)) {
      pathParts[1] = nextLocale;
      window.location.href = pathParts.join('/');
    } else {
      window.location.href = `/${nextLocale}`;
    }
  };

  const selectLocale = resolveLandingSelectLocale(uiLocale);
  const homeHref = localizePath(uiLocale, '/');
  const loginHref = localizePath(uiLocale, '/login');
  const dashboardHref = localizePath(uiLocale, '/dashboard');
  const showWorkHome = isElectronClient() || hasSession;

  // Test User Application Form States
  const t = getMessages(uiLocale).landing.testApply;
  const baseLocale = toBaseLocale(uiLocale);
  const L = (
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

  const pricingNavLabel = L(
    "이용 요금",
    "Pricing",
    "Bảng giá",
    "料金",
    "价格",
    "Precios",
    "Preços",
    "Tarifs",
    "Preise",
    "Цены",
  );

  const scaleNavLabel = L(
    "다매장·수발주",
    "Multi-store & partners",
    "Đa cửa hàng & đối tác",
    "多店舗・会員発注",
    "多店与会员发单",
    "Multi-tienda y socios",
    "Multi-loja e parceiros",
    "Multi-magasins & partenaires",
    "Multi-Filiale & Partner",
    "Сеть магазинов",
  );

  const summaryMultiStore = L(
    "다매장 관리",
    "Multi-store HQ",
    "Quản lý đa cửa hàng",
    "多店舗管理",
    "多店管理",
    "Multi-tienda",
    "Multi-loja",
    "Multi-magasins",
    "Multi-Filiale",
    "Сеть магазинов",
  );

  const summaryPartnerOrders = L(
    "회원사 수발주",
    "Partner orders",
    "Đơn hàng đối tác",
    "会員店受発注",
    "会员店收发单",
    "Pedidos entre socios",
    "Pedidos entre parceiros",
    "Commandes partenaires",
    "Partner-Bestellungen",
    "Заказы партнёров",
  );

  const [fullName, setFullName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [contact, setContact] = useState("");
  const [email, setEmail] = useState("");
  const [applyReason, setApplyReason] = useState("");
  const [featureNotes, setFeatureNotes] = useState("");
  const [website, setWebsite] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [mailFallbackHint, setMailFallbackHint] = useState(false);

  const openMailtoFallback = () => {
    const body = buildMailtoBody(baseLocale, {
      fullName,
      businessName,
      contact,
      email,
      applyReason,
      featureNotes,
    });
    const subject = encodeURIComponent(
      L(
        "[Floxync] 테스트 유저 신청",
        "[Floxync] Test user application",
        "[Floxync] Đăng ký dùng thử",
        "[Floxync] テストユーザー申請",
        "[Floxync] 测试用户申请",
        "[Floxync] Solicitud de usuario de prueba",
        "[Floxync] Solicitação de usuário de teste",
        "[Floxync] Demande d’utilisateur test",
        "[Floxync] Testnutzer-Anfrage",
        "[Floxync] Заявка тестового пользователя",
      ),
    );
    const q = encodeURIComponent(body);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${q}`;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");
    setMailFallbackHint(false);
    try {
      const res = await fetch("/api/public/test-user-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          businessName,
          contact,
          email,
          applyReason,
          featureNotes,
          website,
          uiLocale,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        setStatus("success");
        setMessage(
          L(
            "신청이 접수되었습니다. 순차적으로 연락드릴게요.",
            "Application received. We’ll get back to you in order.",
            "Đã nhận đơn. Chúng tôi sẽ liên hệ theo thứ tự.",
            "お申し込みを受け付けました。順次ご連絡します。",
            "我们已收到申请，将按顺序与您联系。",
            "Solicitud recibida. Nos pondremos en contacto en orden.",
            "Recebemos sua solicitação. Entraremos em contato em ordem.",
            "Demande reçue. Nous vous recontacterons dans l’ordre.",
            "Antrag eingegangen. Wir melden uns nacheinander.",
            "Заявка принята. Свяжемся с вами по очереди.",
          ),
        );
        setFullName("");
        setBusinessName("");
        setContact("");
        setEmail("");
        setApplyReason("");
        setFeatureNotes("");
        setWebsite("");
        return;
      }

      if (res.status === 503 && data.code === "NO_DB") {
        setStatus("error");
        setMailFallbackHint(true);
        setMessage(
          L(
            "온라인 접수 저장소가 아직 연결되지 않았습니다. 아래 버튼으로 메일을 보내 주시면 동일하게 접수됩니다.",
            "Online intake isn’t connected yet. Use the email button below to apply the same way.",
            "Kho lưu trực tuyến chưa kết nối. Dùng nút email bên dưới để gửi đơn tương tự.",
            "オンライン受付ストレージがまだ接続されていません。下のメールボタンから同様にお申し込みいただけます。",
            "在线受理尚未连接。请使用下方邮件按钮以相同方式提交。",
            "El almacenamiento de solicitudes en línea aún no está conectado. Use el botón de correo inferior para enviar igual.",
            "O armazenamento de recebimento online ainda não está conectado. Use o botão de e-mail abaixo para enviar da mesma forma.",
            "Le stockage des demandes en ligne n’est pas encore connecté. Utilisez le bouton e-mail ci-dessous pour postuler de la même façon.",
            "Die Online-Eingabe ist noch nicht verbunden. Nutzen Sie die E-Mail-Schaltfläche unten, um gleich zu beantragen.",
            "Онлайн-приём ещё не подключён. Отправьте заявку через кнопку e-mail ниже.",
          ),
        );
        return;
      }

      setStatus("error");
      setMessage(
        data.error ||
          L(
            "전송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
            "Could not send. Please try again shortly.",
            "Gửi thất bại. Vui lòng thử lại sau.",
            "送信に失敗しました。しばらくしてから再度お試しください。",
            "发送失败，请稍后重试。",
            "No se pudo enviar. Inténtelo de nuevo en unos momentos.",
            "Não foi possível enviar. Tente novamente em instantes.",
            "Envoi impossible. Réessayez dans un instant.",
            "Senden fehlgeschlagen. Bitte versuchen Sie es in Kürze erneut.",
            "Не удалось отправить. Повторите попытку чуть позже.",
          ),
      );
    } catch {
      setStatus("error");
      setMessage(
        L(
          "네트워크 오류입니다. 메일로 보내 주시거나 잠시 후 다시 시도해 주세요.",
          "Network error. Email us or try again shortly.",
          "Lỗi mạng. Gửi email hoặc thử lại sau.",
          "ネットワークエラーです。メールで送るか、しばらくしてから再度お試しください。",
          "网络错误。请发邮件或稍후重试。",
          "Error de red. Envíenos un correo o vuelva a intentarlo en unos momentos.",
          "Erro de rede. Envie um e-mail ou tente novamente em instantes.",
          "Erreur réseau. Écrivez-nous ou réessayez dans un instant.",
          "Netzwerkfehler. Schreiben Sie uns per E-Mail oder versuchen Sie es später erneut.",
          "Ошибка сети. Напишите нам по почте или повторите попытку позже.",
        ),
      );
    }
  };

  return (
    <div className="bg-[#fbf9f7] text-[#1b1c1b] font-sans antialiased selection:bg-[#86e3ce] selection:text-[#006657] overflow-x-hidden">
      {/* Google Fonts / Material Icons link decoration is handled in layout, but icons are referenced below */}
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* Decorative Blobs */}
      <div className="absolute top-0 -left-64 w-[500px] h-[500px] bg-[#96f4de]/20 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-0 -right-32 w-[400px] h-[400px] bg-[#e9ddff]/20 rounded-full blur-[80px] pointer-events-none z-0" />

      <nav className="bg-[#fbf9f7]/80 backdrop-blur-md border-b border-[#bdc9c5]/30 sticky top-0 z-50 py-4 md:py-5">
        <div className="flex justify-between items-center w-full px-4 sm:px-6 max-w-7xl mx-auto gap-4">
          <Link href={homeHref} className="flex-shrink-0">
            <img
              alt="Floxync Logo"
              className="h-14 sm:h-16 md:h-[4.5rem] w-auto object-contain"
              src="/images/floxync-logo-dark.png"
            />
          </Link>

          <div className="flex items-center gap-2 sm:gap-3 md:gap-4 flex-shrink-0">
            <Link
              className="hidden md:inline-flex text-sm font-semibold text-[#3e4946] hover:text-[#006b5c] transition-colors whitespace-nowrap"
              href="/docs/manual"
            >
              사용 설명서
            </Link>
            <Link
              className="hidden md:inline-flex text-sm font-semibold text-[#3e4946] hover:text-[#006b5c] transition-colors whitespace-nowrap"
              href={`/${locale}/pricing`}
            >
              {pricingNavLabel}
            </Link>

            {/* Language Switcher */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#bdc9c5]/30 bg-white/70 hover:bg-white transition-colors cursor-pointer">
              <Globe size={13} className="text-[#3e4946] flex-shrink-0" />
              <select
                value={selectLocale}
                onChange={(e) => handleLocaleChange(e.target.value as AppLocale)}
                className="bg-transparent text-[10px] font-black text-[#3e4946] outline-none cursor-pointer uppercase tracking-tight max-w-[5.5rem]"
              >
                {LANDING_LOCALE_SELECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white text-[#1b1c1b]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <Link
              href={loginHref}
              className="hidden sm:inline-flex text-sm font-semibold text-[#006b5c] hover:bg-[#006b5c]/5 px-3 py-2 rounded-full transition-all whitespace-nowrap"
            >
              로그인
            </Link>
            {showWorkHome ? (
              <Link
                href={dashboardHref}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white text-sm font-bold px-4 sm:px-5 py-2.5 rounded-full shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
              >
                <LayoutDashboard className="h-4 w-4 flex-shrink-0" aria-hidden />
                대시보드
              </Link>
            ) : (
              <Link
                href={loginHref}
                className="inline-flex bg-[#006b5c] text-white text-sm font-bold px-4 sm:px-5 py-2.5 rounded-full shadow-lg shadow-[#006b5c]/20 hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap"
              >
                시작하기
              </Link>
            )}

            <button
              className="md:hidden p-2 text-[#1b1c1b] flex-shrink-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="메뉴"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="absolute top-20 left-0 right-0 bg-[#fbf9f7] border-b border-[#bdc9c5]/30 shadow-2xl overflow-hidden md:hidden z-40"
          >
            <div className="px-6 py-8 flex flex-col gap-5">
              <Link className="text-lg font-bold text-[#1b1c1b]" href="/docs/manual" onClick={() => setMobileMenuOpen(false)}>사용 설명서</Link>
              <Link className="text-lg font-bold text-[#1b1c1b]" href={`/${locale}/pricing`} onClick={() => setMobileMenuOpen(false)}>{pricingNavLabel}</Link>
              <div className="flex flex-col gap-3 pt-4 border-t border-[#efedec]">
                <Link href={loginHref} className="py-4 text-center font-bold text-[#3e4946] border border-[#bdc9c5]/30 rounded-full bg-white flex items-center justify-center gap-2">
                  <Smartphone size={18} /> 모바일 앱
                </Link>
                {showWorkHome ? (
                  <Link href={dashboardHref} className="py-4 text-center font-bold bg-emerald-600 text-white rounded-full flex items-center justify-center gap-2">
                    <LayoutDashboard size={18} /> 대시보드
                  </Link>
                ) : (
                  <Link href={loginHref} className="py-4 text-center font-bold bg-[#006b5c] text-white rounded-full">
                    대시보드 시작
                  </Link>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="relative pt-16 pb-24 overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16">
            <div className="flex-1 text-center lg:text-left z-10">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#86e3ce] text-[#006657] font-semibold text-xs mb-6 shadow-sm">
                <span className="material-symbols-outlined text-[18px] leading-none">auto_awesome</span>
                사장님만을 위해 태어난 상냥한 꽃집 비서예요!
              </div>
              <h1 className="text-4xl lg:text-[56px] lg:leading-[64px] font-extrabold mb-8 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-[#006b5c] to-[#665590]">
                꽃집사장님 을 위한<br />스마트한 AI 비서!
              </h1>
              <p className="text-lg text-[#3e4946] mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal">
                주문부터 배송까지, 제가 실시간으로 꼼꼼히 챙겨드릴게요.<br />
                이제 번거로운 서류 작업은 저에게 맡기시고, 사장님은 예쁜 꽃들에만 집중하세요!
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                {showWorkHome ? (
                  <Link href={dashboardHref} className="inline-flex items-center justify-center gap-2 bg-emerald-600 text-white font-bold text-center px-8 py-4 rounded-full shadow-xl shadow-emerald-600/20 hover:shadow-2xl transition-all">
                    <LayoutDashboard className="h-5 w-5" aria-hidden />
                    대시보드으로 이동
                  </Link>
                ) : (
                  <Link href={loginHref} className="bg-[#006b5c] text-white font-bold text-center px-8 py-4 rounded-full shadow-xl shadow-[#006b5c]/20 hover:shadow-2xl transition-all">
                    지금 무료로 시작하기
                  </Link>
                )}
                <a 
                  className="bg-white/70 border border-[#bdc9c5]/30 backdrop-blur-md text-[#1b1c1b] font-bold px-8 py-4 rounded-full flex items-center justify-center gap-2 hover:bg-white transition-all" 
                  href="#features-summary"
                >
                  <span className="material-symbols-outlined leading-none">explore</span>
                  기능 둘러보기
                </a>
              </div>
            </div>
            
            <div className="flex-1 relative w-full max-w-[500px] lg:max-w-none">
              <div className="animate-pulse duration-[3000ms]">
                <div className="bg-white/70 border border-white/60 backdrop-blur-md rounded-[48px] p-4 shadow-2xl">
                  <img 
                    alt="Flower Shop Dashboard" 
                    className="w-full h-auto rounded-[36px] shadow-inner" 
                    src={LANDING_IMAGES.hero}
                  />
                </div>
              </div>
              {/* Decorative Badge */}
              <div className="absolute -bottom-6 -left-6 bg-white/75 border border-[#006b5c]/20 backdrop-blur-md p-5 rounded-3xl shadow-xl max-w-[220px]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#e9ddff] to-[#96f4de] flex items-center justify-center shadow-sm">
                    <span className="material-symbols-outlined text-[#006b5c] text-[20px] font-bold leading-none">auto_awesome</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#006b5c]">오늘의 예약</p>
                    <p className="text-xs text-[#3e4946]">새 주문 5건 도착!</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {toBaseLocale(uiLocale) === "ko" && getMessages(uiLocale).landing.philosophy ? (
          <section className="py-20 bg-white scroll-mt-20 border-y border-[#bdc9c5]/20" id="philosophy-hardware">
            <div className="max-w-5xl mx-auto px-6">
              {(() => {
                const p = getMessages(uiLocale).landing.philosophy!;
                return (
                  <>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#006657] mb-3 text-center">{p.badge}</p>
                    <h2 className="text-3xl lg:text-4xl font-extrabold text-center text-[#1b1c1b] mb-4 leading-tight">
                      {p.title}<br />
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#006b5c] to-[#665590]">{p.titleAccent}</span>
                    </h2>
                    <p className="text-center text-[#3e4946] text-base leading-relaxed max-w-3xl mx-auto mb-10">{p.lead}</p>
                    <div className="grid sm:grid-cols-3 gap-4 mb-12">
                      <div className="p-6 rounded-3xl bg-[#f5f3f1]/60 border border-[#006b5c]/15 text-center">
                        <p className="text-2xl mb-2">🎀</p>
                        <p className="font-bold text-[#006b5c] mb-1">{p.ribbonTitle}</p>
                        <p className="text-xs text-[#3e4946]">{p.ribbonDesc}</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-[#f5f3f1]/60 border border-[#7a5361]/15 text-center">
                        <p className="text-2xl mb-2">🏷️</p>
                        <p className="font-bold text-[#7a5361] mb-1">{p.labelTitle}</p>
                        <p className="text-xs text-[#3e4946]">{p.labelDesc}</p>
                      </div>
                      <div className="p-6 rounded-3xl bg-[#f5f3f1]/60 border border-orange-200 text-center">
                        <p className="text-2xl mb-2">📠</p>
                        <p className="font-bold text-orange-800 mb-1">{p.posTitle}</p>
                        <p className="text-xs text-[#3e4946]">{p.posDesc}</p>
                      </div>
                    </div>
                    <h3 className="text-lg font-black text-[#1b1c1b] mb-4 text-center">{p.featuresTitle}</h3>
                    <ol className="space-y-3 text-sm text-[#3e4946] max-w-2xl mx-auto list-decimal pl-5 leading-relaxed mb-8">
                      <li>{p.f1}</li>
                      <li>{p.f2}</li>
                      <li>{p.f3}</li>
                      <li>{p.f4}</li>
                      <li>{p.f5}</li>
                      <li>{p.f6}</li>
                      <li>{p.f7}</li>
                    </ol>
                    <p className="text-center text-sm text-[#006657] font-semibold">{p.footer}</p>
                  </>
                );
              })()}
            </div>
          </section>
        ) : null}

        {/* Service Summary Section */}
        <section className="py-20 bg-[#f5f3f1]/40 scroll-mt-20" id="features-summary">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-[#1b1c1b]">복잡한 일은 제가 다 할게요,<br />사장님은 꽃만 생각하세요</h2>
              <p className="text-base text-[#3e4946]">원하시는 기능을 클릭하시면 상세 안내로 이동합니다.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a className="bg-white/70 border border-[#006b5c]/20 backdrop-blur-md p-6 rounded-3xl flex flex-col items-center text-center gap-3 hover:bg-[#86e3ce]/10 transition-all duration-300" href="#feature-automation">
                <span className="material-symbols-outlined text-[#006b5c] text-3xl">auto_mode</span>
                <span className="text-sm font-bold text-[#1b1c1b]">원스톱 자동화</span>
              </a>
              <a className="bg-white/70 border border-[#7a5361]/20 backdrop-blur-md p-6 rounded-3xl flex flex-col items-center text-center gap-3 hover:bg-[#fdcada]/10 transition-all duration-300" href="#feature-ribbon">
                <span className="text-3xl">🎀</span>
                <span className="text-sm font-bold text-[#1b1c1b]">리본 자동화</span>
              </a>
              <a className="bg-white/70 border border-[#665590]/20 backdrop-blur-md p-6 rounded-3xl flex flex-col items-center text-center gap-3 hover:bg-[#dbcaff]/10 transition-all duration-300" href="#feature-connection">
                <span className="material-symbols-outlined text-[#665590] text-3xl">memory</span>
                <span className="text-sm font-bold text-[#1b1c1b]">주문/드라이버 연결</span>
              </a>
              <a className="bg-white/70 border border-orange-400/20 backdrop-blur-md p-6 rounded-3xl flex flex-col items-center text-center gap-3 hover:bg-orange-50 transition-all duration-300" href="#feature-receipt">
                <span className="material-symbols-outlined text-orange-600 text-3xl">photo_camera</span>
                <span className="text-sm font-bold text-[#1b1c1b]">자동 장부</span>
              </a>
              <a className="bg-white/70 border border-blue-400/20 backdrop-blur-md p-6 rounded-3xl flex flex-col items-center text-center gap-3 hover:bg-blue-50 transition-all duration-300" href="#feature-settlement">
                <span className="material-symbols-outlined text-blue-600 text-3xl">account_balance_wallet</span>
                <span className="text-sm font-bold text-[#1b1c1b]">정산 엔진</span>
              </a>
              <a className="bg-white/70 border border-pink-400/20 backdrop-blur-md p-6 rounded-3xl flex flex-col items-center text-center gap-3 hover:bg-pink-50 transition-all duration-300" href="#feature-notification">
                <span className="material-symbols-outlined text-pink-600 text-3xl">notifications_active</span>
                <span className="text-sm font-bold text-[#1b1c1b]">타이밍 알림</span>
              </a>
              <a className="bg-white/70 border border-violet-400/20 backdrop-blur-md p-6 rounded-3xl flex flex-col items-center text-center gap-3 hover:bg-violet-50 transition-all duration-300" href="#feature-multi-store">
                <span className="material-symbols-outlined text-violet-600 text-3xl">corporate_fare</span>
                <span className="text-sm font-bold text-[#1b1c1b]">{summaryMultiStore}</span>
              </a>
              <a className="bg-white/70 border border-teal-400/20 backdrop-blur-md p-6 rounded-3xl flex flex-col items-center text-center gap-3 hover:bg-teal-50 transition-all duration-300" href="#feature-partner-network">
                <span className="material-symbols-outlined text-teal-600 text-3xl">hub</span>
                <span className="text-sm font-bold text-[#1b1c1b]">{summaryPartnerOrders}</span>
              </a>
            </div>
          </div>
        </section>

        {/* Detailed Features */}
        <div className="bg-[#fbf9f7]">
          {/* 1. 업무 원스톱 자동화 */}
          <section className="py-24 scroll-mt-28" id="feature-automation">
            <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#86e3ce] text-[#006657] text-xs font-bold mb-6">마스터피스 #1</div>
                <h3 className="text-3xl lg:text-4xl font-extrabold mb-6 text-[#006b5c]">주문만 넣으면 정산, 주문서 및 인수증 출력이 한번에!</h3>
                <p className="text-base lg:text-lg text-[#3e4946] mb-8 leading-relaxed">수기로 주문 받고 다시 엑셀에 입력하고 주문서 작성하고 인수증 작성하고 고객 메세지도 별도로 입력해서 출력하고 하시느라 바쁘셨죠? 자동으로 정산되고 출력됩니다.</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#006b5c] mt-1">check_circle</span>
                    <span className="text-sm lg:text-base text-[#1b1c1b]">태블릿이나 폰으로 고객주문 입력만 하면 주문서 인수증이 자동으로</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#006b5c] mt-1">check_circle</span>
                    <span className="text-sm lg:text-base text-[#1b1c1b]">번거로운 수기 작업을 줄여주는 지능형 업무 워크플로우</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#006b5c] mt-1">check_circle</span>
                    <span className="text-sm lg:text-base text-[#1b1c1b]">USB 연결 가능한 포스프린터만 준비하세요. (SEWOO, SAM4S, BIXOLON, POSBANK 테스트 완료)</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 w-full max-w-[500px] lg:max-w-none">
                <div className="bg-white/70 border border-white/60 backdrop-blur-md rounded-[40px] p-3 shadow-xl">
                  <img alt="One-stop Automation Dashboard" className="w-full h-auto rounded-[32px]" src={LANDING_IMAGES.automation} />
                </div>
              </div>
            </div>
          </section>

          {/* 2. 리본 프린트 자동화 */}
          <section className="py-24 bg-white scroll-mt-28" id="feature-ribbon">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fdcada] text-[#795260] text-xs font-bold mb-4">마스터피스 #2</div>
                <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-[#7a5361]">리본 출력의 고민, 🎀✨<br />제가 싹 다 해결해 드릴게요! 🌸</h2>
                <p className="text-base text-[#3e4946] max-w-2xl mx-auto">오타 걱정 스트레스는 이제 그만!<br />기존사용하시던 프린터 및 Xprint 감열프린터 지원으로<br />리본 출력까지 Floxync가 완벽하게 책임질게요.</p>
              </div>
              <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                <div className="flex-1 w-full max-w-[500px] lg:max-w-none">
                  <div className="bg-white/70 border border-[#7a5361]/10 backdrop-blur-md rounded-[40px] p-4 shadow-xl">
                    <img alt="Ribbon Printing Solution" className="w-full h-auto rounded-[32px]" src={LANDING_IMAGES.ribbon} />
                  </div>
                </div>
                <div className="flex-1 space-y-6 w-full">
                  <div className="p-6 rounded-[24px] border-l-4 border-[#006b5c] bg-white/70 shadow-sm">
                    <h3 className="text-lg font-bold mb-2 text-[#1b1c1b]">주문 데이터 &apos;자동 완성&apos;</h3>
                    <p className="text-sm text-[#3e4946] leading-relaxed">보내는 분과 축하 문구를 자동으로 추출해서 출력 폼에 얹어드릴게요. 사장님은 확인만 하고 인쇄 버튼만 누르세요.</p>
                  </div>
                  <div className="p-6 rounded-[24px] border-l-4 border-[#7a5361] bg-white/70 shadow-sm">
                    <h3 className="text-lg font-bold mb-2 text-[#1b1c1b]">드라이버 &amp; 여백 설정의 해방</h3>
                    <p className="text-sm text-[#3e4946] leading-relaxed">연결만 하면 표준 규격에 딱 맞게 마진이 자동 설정돼요. 미리보기 화면 그대로 깔끔하게 나옵니다.</p>
                  </div>
                  <div className="p-6 rounded-[24px] border-l-4 border-[#665590] bg-white/70 shadow-sm">
                    <h3 className="text-lg font-bold mb-2 text-[#1b1c1b]">A4 프린터로 &apos;무한 배너 출력&apos;</h3>
                    <p className="text-sm text-[#3e4946] leading-relaxed">일반 A4 프린터로 수 미터짜리 대형 배너를 끊김 없이 뽑아낼 수 있는 특화 엔진을 제공합니다.</p>
                  </div>
                  <div className="p-6 rounded-[24px] border-l-4 border-[#86e3ce] bg-white/70 shadow-sm">
                    <h3 className="text-lg font-bold mb-2 text-[#1b1c1b]">Xprint 송장프린터로 감열 리본까지!</h3>
                    <p className="text-sm text-[#3e4946] leading-relaxed">별도 리본 프린터 구매 없이도 가지고 계신 Xprint 송장프린터로 예쁜 감열 리본을 척척 뽑아낼 수 있게 도와드릴게요. 사장님의 비용 부담은 줄이고, 작업 효율은 쑥쑥 올라가요!</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 3. 주문/드라이버 연결 */}
          <section className="py-24 scroll-mt-28" id="feature-connection">
            <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row-reverse items-center gap-16 lg:gap-24">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#dbcaff] text-[#61508b] text-xs font-bold mb-6">마스터피스 #3</div>
                <h3 className="text-3xl lg:text-4xl font-extrabold mb-6 text-[#665590]">PC를 켜기만 하세요,<br />비서는 이미 준비 끝!</h3>
                <p className="text-base lg:text-lg text-[#3e4946] mb-8 leading-relaxed">윈도우 부팅과 동시에 당신의 비서가 업무를 시작합니다. 별도의 프로그램 실행 없이도 실시간 대응이 가능해요.</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#665590] mt-1">power_settings_new</span>
                    <span className="text-sm lg:text-base text-[#1b1c1b]">지능형 백그라운드 자동 실행 서비스</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-[#665590] mt-1">memory</span>
                    <span className="text-sm lg:text-base text-[#1b1c1b]">다른 작업 중에도 멈춤 없는 리소스 최적화 서포트</span>
                  </li>
                </ul>
                <div className="mt-8 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-start gap-3 shadow-sm">
                  <span className="material-symbols-outlined text-emerald-600">info</span>
                  <div className="text-xs lg:text-sm text-emerald-800 leading-relaxed">
                    <strong>💡 가입 즉시 꽃집 맞춤 기초 데이터 무료 탑재!</strong><br />
                    상품, 자재, 거래처, 배송비 등 표준 기초 자료가 가입과 동시에 기본 세팅됩니다. 사장님 매장에 맞게 살짝만 수정해서 바로 편리하게 사용해 보세요!
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full max-w-[500px] lg:max-w-none relative">
                <div className="bg-white/70 border border-white/60 backdrop-blur-md rounded-[40px] p-3 shadow-xl">
                  <img alt="Background Service Connection" className="w-full h-auto rounded-[32px]" src={LANDING_IMAGES.connection} />
                </div>
                {/* Floating reminder panel */}
                <div className="absolute -top-6 -right-6 bg-white/90 border border-[#dbcaff]/50 backdrop-blur-md p-5 rounded-3xl shadow-2xl max-w-[240px] z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-[#dbcaff] flex items-center justify-center">
                      <span className="material-symbols-outlined text-[#665590] text-[18px]">alarm_on</span>
                    </div>
                    <span className="font-bold text-sm text-[#665590]">오늘 내일 픽업/배송 🎀</span>
                  </div>
                  <p className="text-xs text-[#3e4946] mb-3 leading-tight">로그인과 동시에 오늘내일 픽업 및 배송 팝업알림으로 받은주문 잊지않도록 도와드려요</p>
                  <div className="space-y-2 text-xs">
                    <div className="p-2 rounded-xl bg-white/70 border border-[#bdc9c5]/30">
                      <p className="font-bold text-[#1b1c1b]">⏰ 14:00 픽업</p>
                      <p className="text-[#3e4946]">장미 꽃다발 (김사장님)</p>
                    </div>
                    <div className="p-2 rounded-xl bg-white/70 border border-[#bdc9c5]/30">
                      <p className="font-bold text-[#1b1c1b]">🚚 16:30 배송</p>
                      <p className="text-[#3e4946]">개업 화분 (이대표님)</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 4. 영수증 자동 장부 */}
          <section className="py-24 scroll-mt-28" id="feature-receipt">
            <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-855 text-xs font-bold mb-6">마스터피스 #4</div>
                <h3 className="text-3xl lg:text-4xl font-extrabold mb-6 text-orange-900">사진 한 장으로 장부 끝,<br />영수증 자동 관리</h3>
                <p className="text-base lg:text-lg text-[#3e4946] mb-8 leading-relaxed">꽃시장에서 수집한 수기 영수증들, 더 이상 직접 입력하지 마세요. AI가 눈으로 읽고 장부에 쏙 넣어드립니다.</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-orange-650 mt-1">photo_camera</span>
                    <span className="text-sm lg:text-base text-[#1b1c1b]">고성능 OCR 기술로 수기 영수증 항목 자동 분류</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-orange-650 mt-1">description</span>
                    <span className="text-sm lg:text-base text-[#1b1c1b]">월별 지출 보고서 자동 생성 및 투명한 자금 관리</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 w-full max-w-[500px] lg:max-w-none">
                <div className="bg-white/70 border border-white/60 backdrop-blur-md rounded-[40px] p-3 shadow-xl">
                  <img alt="Receipt AI OCR" className="w-full h-auto rounded-[32px]" src={LANDING_IMAGES.receipt} />
                </div>
              </div>
            </div>
          </section>

          {/* 5. 투명한 정산 엔진 */}
          <section className="py-24 scroll-mt-28" id="feature-settlement">
            <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row-reverse items-center gap-16 lg:gap-24">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold mb-6">마스터피스 #5</div>
                <h3 className="text-3xl lg:text-4xl font-extrabold mb-6 text-blue-900">새는 돈 없는 꼼꼼한 정산,<br />투명한 경영의 시작!</h3>
                <p className="text-base lg:text-lg text-[#3e4946] mb-8 leading-relaxed">복잡한 플랫폼 수수료와 정산 주기, 제가 계산해 드릴게요. 사장님은 정산된 금액만 확인하시면 됩니다.</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-blue-600 mt-1">account_balance</span>
                    <span className="text-sm lg:text-base text-[#1b1c1b]">매출 분석 및 플랫폼별 정산 데이터 자동 대조</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-blue-600 mt-1">trending_up</span>
                    <span className="text-sm lg:text-base text-[#1b1c1b]">일간/주간/월간 수익성 리포트 실시간 제공</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 w-full max-w-[500px] lg:max-w-none">
                <div className="bg-white/70 border border-white/60 backdrop-blur-md rounded-[40px] p-3 shadow-xl">
                  <img alt="Settlement Engine" className="w-full h-auto rounded-[32px]" src={LANDING_IMAGES.settlement} />
                </div>
              </div>
            </div>
          </section>

          {/* 6. 스마트 타이밍 알림 */}
          <section className="py-24 scroll-mt-28" id="feature-notification">
            <div className="max-w-7xl mx-auto px-6 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-100 text-pink-800 text-xs font-bold mb-6">마스터피스 #6</div>
                <h3 className="text-3xl lg:text-4xl font-extrabold mb-6 text-pink-900">사장님, 지금이에요!<br />스마트 타이밍 알림</h3>
                <p className="text-base lg:text-lg text-[#3e4946] mb-8 leading-relaxed">제작 완료부터 배송 출발까지, 사장님이 잊지 않도록 제가 똑똑하게 알려드릴게요.</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-pink-600 mt-1">notifications_active</span>
                    <span className="text-sm lg:text-base text-[#1b1c1b]">주문 단계별 자동 상태 변경 및 푸시 알림</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-pink-600 mt-1">schedule</span>
                    <span className="text-sm lg:text-base text-[#1b1c1b]">예약 시간 기반의 사전 제작 리마인드 (예약 3시간 전 모바일 앱 알림 자동 발송)</span>
                  </li>
                </ul>
              </div>
              <div className="flex-1 w-full max-w-[300px] flex justify-center relative">
                <div className="rounded-[3rem] border-[8px] border-[#30302f] shadow-2xl overflow-hidden aspect-[9/19.5] w-full bg-white">
                  <img alt="Smart Notification Screen" className="w-full h-full object-cover object-top" src={LANDING_IMAGES.notificationMobile} />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-white/90 border border-pink-200 p-4 rounded-2xl shadow-xl z-10">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-pink-600 animate-bounce">notifications</span>
                    <span className="text-xs font-bold text-pink-600">제작 시작 시간입니다!</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* 7. 확장 운영 — 다매장 & 회원사 수발주 */}
          <section className="py-24 bg-white scroll-mt-28" id="feature-scale">
            <div className="max-w-7xl mx-auto px-6">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-100 text-violet-800 text-xs font-bold mb-4">
                  {L("확장 운영", "Scale your shop", "Mở rộng vận hành", "拡張運営", "扩展运营", "Escala tu negocio", "Expanda sua loja", "Faites évoluer votre activité", "Skalierung", "Масштабирование")}
                </div>
                <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-[#1b1c1b]">
                  {L(
                    "여러 지점도, 전국 꽃집 네트워크도",
                    "Multi-store HQ & partner network",
                    "Nhiều chi nhánh & mạng đối tác",
                    "多店舗も、全国ネットワークも",
                    "多门店与全国花店网络",
                    "Multi-tienda y red nacional",
                    "Multi-loja e rede nacional",
                    "Multi-magasins & réseau national",
                    "Multi-Filiale & Partnernetz",
                    "Сеть филиалов и партнёров",
                  )}
                </h2>
                <p className="text-base text-[#3e4946] max-w-2xl mx-auto">
                  {L(
                    "한 매장을 넘어 커지는 사장님을 위해 — 본사·지점 통합과 회원사 간 발주·수주를 한 흐름으로.",
                    "For growing shops — HQ branch oversight and partner order handoffs in one flow.",
                  )}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10">
                {/* 다매장 관리 */}
                <div
                  id="feature-multi-store"
                  className="scroll-mt-28 rounded-[32px] border border-violet-200/60 bg-gradient-to-br from-violet-50/80 to-white p-8 lg:p-10 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-violet-600 text-white flex items-center justify-center shadow-lg shadow-violet-600/20">
                      <span className="material-symbols-outlined text-[28px]">corporate_fare</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-violet-600 mb-0.5">
                        {L("본사·다매장", "HQ & branches", "Trụ sở & chi nhánh", "本社・多店舗")}
                      </p>
                      <h3 className="text-xl lg:text-2xl font-extrabold text-[#1b1c1b]">{summaryMultiStore}</h3>
                    </div>
                  </div>
                  <p className="text-sm lg:text-base text-[#3e4946] mb-6 leading-relaxed">
                    {L(
                      "여러 지점을 운영하시나요? 본사에서는 지점 매출·이관·정산을 한눈에, 각 지점에서는 평소처럼 주문만 받으시면 됩니다.",
                      "Run multiple branches? HQ sees sales, transfers, and settlements — each branch keeps taking orders as usual.",
                    )}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {[
                      L("지점 간 주문 이관 — 수주 팝업 & 수락 시 주문서·인수증 자동 출력", "Branch order transfers — popup on receive, auto print on accept"),
                      L("본사 대시보드 — 지점별 실적·지출·자재 요청 취합", "HQ dashboard — per-branch performance, expenses, material requests"),
                      L("공동 상품·본사 게시판으로 지점 운영 표준화", "Shared products & HQ board to standardize branches"),
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-2.5 text-sm text-[#1b1c1b]">
                        <span className="material-symbols-outlined text-violet-600 text-[18px] mt-0.5 shrink-0">check_circle</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-2xl border border-violet-100 bg-white/80 p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-violet-600">store</span>
                    <p className="text-xs text-[#3e4946] leading-relaxed">
                      {L(
                        "같은 조직(본사) 소속 지점끼리 주문 제작·배송을 나눠 맡길 때 사용합니다.",
                        "For branches under the same organization sharing production and delivery.",
                      )}
                    </p>
                  </div>
                </div>

                {/* 회원사간 수발주 */}
                <div
                  id="feature-partner-network"
                  className="scroll-mt-28 rounded-[32px] border border-teal-200/60 bg-gradient-to-br from-teal-50/80 to-white p-8 lg:p-10 shadow-sm"
                >
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-teal-600 text-white flex items-center justify-center shadow-lg shadow-teal-600/20">
                      <span className="material-symbols-outlined text-[28px]">hub</span>
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 mb-0.5">
                        {L("전국 네트워크", "Partner network", "Mạng đối tác", "全国ネットワーク")}
                      </p>
                      <h3 className="text-xl lg:text-2xl font-extrabold text-[#1b1c1b]">{summaryPartnerOrders}</h3>
                    </div>
                  </div>
                  <p className="text-sm lg:text-base text-[#3e4946] mb-6 leading-relaxed">
                    {L(
                      "멀리 있는 배송·제작은 수주 등록 꽃집에 맡기세요. 발주하면 수주점 플로싱크 데스크탑에 실시간 알림, 수락 시 주문서·마스킹 인수증이 자동 출력됩니다.",
                      "Hand off distant orders to partner shops. They get a real-time alert on the FloXync desktop app; accept prints order form + masked receipt.",
                    )}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {[
                      L("발주점 → 수주점 실시간 수주 요청 (팝업·알림음)", "Ordering shop → real-time partner alert (popup & sound)"),
                      L("수락 & 인쇄 — 발주점 정보 주문서 + 고객 마스킹 인수증", "Accept & print — sender on order form, masked customer receipt"),
                      L("수주함·발주함에서 이력 관리", "Received & sent history"),
                    ].map((line) => (
                      <li key={line} className="flex items-start gap-2.5 text-sm text-[#1b1c1b]">
                        <span className="material-symbols-outlined text-teal-600 text-[18px] mt-0.5 shrink-0">check_circle</span>
                        {line}
                      </li>
                    ))}
                  </ul>
                  <div className="rounded-2xl border border-teal-100 bg-white/80 p-4 flex items-start gap-3">
                    <span className="material-symbols-outlined text-teal-600">public</span>
                    <p className="text-xs text-[#3e4946] leading-relaxed">
                      {L(
                        "서로 다른 가입 꽃집(회원사) 간 위탁 발주·수주입니다. 플랫폼은 중개 도구이며 대금 정산은 매장 간 직거래입니다.",
                        "Between independent member shops — FloXync is the handoff tool; payment is between shops.",
                      )}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Platform Specific System */}
        <section className="py-24 bg-[#f5f3f1]/30 scroll-mt-20" id="details">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 pr-16 sm:pr-6 w-full min-w-0 box-border">
            <div className="text-center mb-20">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-[#1b1c1b]">안정적인 매장 운영 시스템</h2>
              <p className="text-base text-[#3e4946] max-w-xl mx-auto">PC 대시보드와 모바일 앱이 유기적으로 연결되어 최적의 업무 환경을 제공합니다.</p>
            </div>

            {/* Windows Desktop */}
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-24 mb-32">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#86e3ce] text-[#006657] text-xs font-bold mb-6">Windows Desktop App</div>
                <h3 className="text-2xl lg:text-3xl font-extrabold mb-6">매장 안을 든든하게 지키는 똑똑한 센터장!</h3>
                <p className="text-base lg:text-lg text-[#3e4946] mb-8 leading-relaxed">카운터 PC에서 매장의 모든 상황을 파악하고 복잡한 하드웨어를 완벽하게 제어합니다.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-white border border-[#bdc9c5]/30 flex gap-3 shadow-sm">
                    <span className="material-symbols-outlined text-[#006b5c]">print_connect</span>
                    <div className="font-bold text-sm text-[#1b1c1b]">다이렉트 프린터 제어</div>
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-[#bdc9c5]/30 flex gap-3 shadow-sm">
                    <span className="material-symbols-outlined text-[#006b5c]">bolt</span>
                    <div className="font-bold text-sm text-[#1b1c1b]">부팅 시 자동 업무 대기</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full max-w-[500px] lg:max-w-none">
                <div className="bg-white/70 border border-[#bdc9c5]/20 backdrop-blur-md rounded-[32px] p-2 shadow-2xl">
                  <img alt="Windows PC App" className="w-full h-auto rounded-[24px]" src={LANDING_IMAGES.windowsDesktop} />
                </div>
              </div>
            </div>

            {/* Android Mobile */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-8 lg:gap-12 w-full min-w-0">
              <div className="flex-1 w-full min-w-0 max-w-full">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fdcada] text-[#795260] text-xs font-bold mb-6">Android Mobile App</div>
                <h3 className="text-2xl lg:text-3xl font-extrabold mb-6">꽃 제작대에서도, 시장에서도!<br />사장님 손안의 비서</h3>
                <p className="text-base lg:text-lg text-[#3e4946] mb-8 leading-relaxed">언제 어디서든 주문을 확인하고 완료 사진을 전송하세요. (iOS 추후 지원 예정)</p>
                <div className="space-y-4 w-full max-w-full">
                  <div className="flex items-center gap-4 p-4 rounded-3xl bg-white border border-[#bdc9c5]/20 shadow-sm hover:translate-y-[-2px] transition-transform duration-300">
                    <span className="material-symbols-outlined text-[#7a5361] text-[32px] shrink-0">add_a_photo</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-[#1b1c1b]">제작 완료 사진 촬영 및 저장</h4>
                      <p className="text-xs text-[#3e4946]">완성 사진을 찍어 주문 내역에 자동 매칭합니다.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-3xl bg-[#86e3ce]/10 border border-[#86e3ce]/30 shadow-sm hover:translate-y-[-2px] transition-transform duration-300">
                    <span className="material-symbols-outlined text-[#006b5c] text-[32px] shrink-0">send_and_archive</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-[#1b1c1b]">고객 안심 실시간 전송</h4>
                      <p className="text-xs text-[#3e4946]">제작 완료 알림을 고객에게 즉시 전송합니다.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-3xl bg-white border border-[#bdc9c5]/20 shadow-sm hover:translate-y-[-2px] transition-transform duration-300">
                    <span className="material-symbols-outlined text-[#7a5361] text-[32px] shrink-0">photo_camera</span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-[#1b1c1b] break-keep">꽃시장에서 영수증 촬영으로 저장 및 지출관리 자동입력</h4>
                      <p className="text-xs text-[#3e4946]">영수증을 카메라로 찍으면 자동으로 내역을 분석해 장부에 기록합니다.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full min-w-0 max-w-full flex justify-center lg:justify-start">
                <div className="relative w-full max-w-[220px] md:max-w-[440px] mx-auto box-border pb-16">
                  {/* 세로 스택(기본) — 폰 프레임·스크린 가로 잘림 방지 */}
                  <div className="flex flex-col items-center gap-6 md:hidden">
                    <div className="w-full max-w-[200px]">
                      <div className="rounded-[1.75rem] border-4 border-[#30302f] shadow-xl overflow-hidden w-full bg-[#30302f] box-border max-h-[min(52vh,380px)]">
                        <img
                          alt="FloXync 지출·영수증 OCR"
                          className="block w-full h-auto"
                          src={LANDING_IMAGES.androidMobileExpense}
                        />
                      </div>
                      <p className="mt-2 text-center text-[10px] font-bold text-[#3e4946]">영수증 OCR · 지출 등록</p>
                    </div>
                    <div className="w-full max-w-[220px]">
                      <div className="rounded-[1.75rem] border-4 border-[#30302f] shadow-2xl overflow-hidden w-full bg-[#30302f] box-border max-h-[min(52vh,400px)]">
                        <img
                          alt="FloXync 픽업·배송 관리"
                          className="block w-full h-auto"
                          src={LANDING_IMAGES.androidMobile}
                        />
                      </div>
                      <p className="mt-2 text-center text-[10px] font-bold text-[#3e4946]">픽업 · 배송 관리</p>
                    </div>
                  </div>

                  {/* md 이상: 나란히 — 스크린은 contain(가로 전체), 하단만 잘림 */}
                  <div className="hidden md:grid md:grid-cols-2 md:gap-3 md:items-start w-full box-border">
                    <div className="min-w-0">
                      <div className="rounded-[1.75rem] border-4 border-[#30302f] shadow-xl overflow-hidden w-full bg-[#30302f] box-border max-h-[min(58vh,420px)]">
                        <img
                          alt="FloXync 지출·영수증 OCR"
                          className="block w-full h-auto"
                          src={LANDING_IMAGES.androidMobileExpense}
                        />
                      </div>
                      <p className="mt-2 text-center text-[10px] font-bold text-[#3e4946] leading-tight">영수증 OCR · 지출 등록</p>
                    </div>
                    <div className="min-w-0">
                      <div className="rounded-[1.75rem] border-4 border-[#30302f] shadow-2xl overflow-hidden w-full bg-[#30302f] box-border max-h-[min(58vh,420px)]">
                        <img
                          alt="FloXync 픽업·배송 관리"
                          className="block w-full h-auto"
                          src={LANDING_IMAGES.androidMobile}
                        />
                      </div>
                      <p className="mt-2 text-center text-[10px] font-bold text-[#3e4946] leading-tight">픽업 · 배송 관리</p>
                    </div>
                  </div>

                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[200px] bg-white/90 border border-[#fdcada]/50 backdrop-blur-md px-3 py-2 rounded-2xl shadow-xl">
                    <div className="flex items-center justify-center gap-1.5">
                      <span className="material-symbols-outlined text-[#7a5361] text-base animate-bounce">check_circle</span>
                      <span className="text-[10px] font-bold text-[#7a5361]">완료 알림 전송됨!</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Final Preview */}
        <section className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-[#1b1c1b]">한눈에 파악하는 매장 대시보드</h2>
            <p className="text-base lg:text-lg text-[#3e4946] mb-12 max-w-2xl mx-auto">매장의 모든 상황을 가장 직관적으로 정리해 드릴게요.</p>
            <div className="relative mx-auto max-w-5xl">
              <div className="bg-white/70 border border-[#bdc9c5]/30 backdrop-blur-md rounded-[40px] p-3 shadow-2xl overflow-hidden">
                <img alt="Dashboard Full View" className="w-full h-auto rounded-[30px]" src={LANDING_IMAGES.platformOverview} />
              </div>
            </div>
          </div>
        </section>

        {/* Referral Program Section */}
        <section className="py-24 bg-gradient-to-br from-indigo-50 via-white to-blue-50 border-y border-indigo-100/50 scroll-mt-20">
          <div className="max-w-5xl mx-auto px-6">
            <div className="text-center mb-10 bg-indigo-600 rounded-3xl py-6 px-4 shadow-lg transform -rotate-1 hover:rotate-0 transition-transform duration-300">
              <h2 className="text-xl md:text-2xl font-black text-white tracking-tight drop-shadow-sm">
                💡 추천한 사장님께는 플로싱크에서 가장 높은 <span className="text-yellow-300">플러스 등급(66,000원)</span>으로 1달을 추가하여 드립니다!
              </h2>
            </div>

            <div className="bg-white/80 backdrop-blur-xl rounded-[40px] p-8 md:p-16 shadow-2xl border border-white/50 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-[80px] pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-400/10 rounded-full blur-[80px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col md:flex-row items-center gap-12">
                <div className="flex-1 text-center md:text-left">
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold mb-6 shadow-sm">
                    <span className="material-symbols-outlined text-[18px]">handshake</span>
                    플로싱크 추천 프로그램
                  </div>
                  <h2 className="text-3xl lg:text-4xl font-extrabold mb-6 text-slate-800 leading-tight">
                    친구 추천하고 <br className="hidden md:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-blue-500">1개월 무료 연장</span> 받으세요!
                  </h2>
                  <p className="text-base text-slate-600 mb-8 leading-relaxed max-w-lg mx-auto md:mx-0">
                    주변 화훼업계 사장님들께 FloXync를 추천해주세요. 추천받은 사장님이 내 코드로 가입하시면, <strong>신청하신 분과 추천하신 분 모두에게 구독 기간 1개월 무료 연장 혜택</strong>을 드립니다.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start">
                    <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 w-full sm:w-auto">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                        <span className="material-symbols-outlined font-bold">person_add</span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-slate-500 font-medium">추천한 사장님</p>
                        <p className="font-bold text-slate-800">+1개월 무료 혜택</p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-400">
                      <span className="material-symbols-outlined text-[16px]">add</span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-50 px-5 py-3 rounded-2xl border border-slate-100 w-full sm:w-auto">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                        <span className="material-symbols-outlined font-bold">group_add</span>
                      </div>
                      <div className="text-left">
                        <p className="text-xs text-slate-500 font-medium">가입한 사장님</p>
                        <p className="font-bold text-slate-800">+1개월 무료 혜택</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex-1 w-full max-w-sm">
                  <div className="bg-gradient-to-br from-indigo-500 to-blue-600 rounded-3xl p-8 text-white shadow-xl relative transform transition-transform hover:scale-105 duration-300">
                    <div className="absolute top-4 right-4 text-white/20">
                      <span className="material-symbols-outlined text-6xl">loyalty</span>
                    </div>
                    <h3 className="text-xl font-bold mb-2">무제한 누적 연장!</h3>
                    <p className="text-indigo-100 text-sm mb-6 leading-relaxed">
                      가장 높은 <strong className="text-white">프로플러스 요금제로</strong>, 추천 인원 수에 제한 없이 1개월씩 끝없이 추가 연장해 드립니다! (예: 10명 추천 시 10개월 꽁짜)
                    </p>
                    <Link
                      href={loginHref}
                      className="inline-flex items-center justify-center w-full gap-2 bg-white text-indigo-600 px-6 py-3 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-sm"
                    >
                      내 추천인 코드 확인하기
                      <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-24 bg-[#ffffff]" id="testimonials">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-4">
              <div>
                <h2 className="text-3xl lg:text-4xl font-extrabold mb-2 text-[#1b1c1b]">저와 함께 행복해진 사장님들의 이야기예요</h2>
                <p className="text-sm lg:text-base text-[#3e4946]">전세계의 꽃집이 Floxync와 함께하고 있습니다.</p>
              </div>
              <div className="flex gap-4">
                <button className="w-12 h-12 rounded-full bg-white/70 border border-[#bdc9c5]/30 flex items-center justify-center text-[#006b5c] hover:bg-[#006b5c] hover:text-white transition-all shadow-sm">
                  <span className="material-symbols-outlined">chevron_left</span>
                </button>
                <button className="w-12 h-12 rounded-full bg-white/70 border border-[#bdc9c5]/30 flex items-center justify-center text-[#006b5c] hover:bg-[#006b5c] hover:text-white transition-all shadow-sm">
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Review 1 */}
              <div className="bg-white border border-[#bdc9c5]/20 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 p-8 rounded-[32px] border-b-4 border-b-[#006b5c] shadow-sm flex flex-col h-full">
                <div className="flex items-center gap-1 text-[#006b5c] mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="material-symbols-outlined text-[20px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <p className="text-sm lg:text-base text-[#1b1c1b] mb-8 flex-1 leading-relaxed italic">&quot;리본 글씨 오타 때문에 진땀 뺐던 날들이 이제는 추억이에요. 제가 놓친 오타까지 비서가 꼼꼼히 체크해주니 마음이 너무 편해요!&quot;</p>
                <div className="flex items-center gap-4 pt-6 border-t border-[#efedec]">
                  <div className="w-12 h-12 rounded-full bg-[#86e3ce]/30 flex items-center justify-center text-[#006b5c]">
                    <span className="material-symbols-outlined">local_florist</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#1b1c1b]">[꽃피는 하루] 사장님</p>
                    <p className="text-xs text-[#3e4946]">Floxync 파트너</p>
                  </div>
                </div>
              </div>

              {/* Review 2 */}
              <div className="bg-white border border-[#bdc9c5]/20 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 p-8 rounded-[32px] border-b-4 border-b-[#7a5361] shadow-sm flex flex-col h-full">
                <div className="flex items-center gap-1 text-[#7a5361] mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="material-symbols-outlined text-[20px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <p className="text-sm lg:text-base text-[#1b1c1b] mb-8 flex-1 leading-relaxed italic">&quot;PC 켜자마자 뜨는 &apos;오늘 내일 픽업/배송&apos; 팝업 덕분에 바쁜 시즌에도 단 하나의 주문도 놓치지 않고 완벽하게 배송했어요.&quot;</p>
                <div className="flex items-center gap-4 pt-6 border-t border-[#efedec]">
                  <div className="w-12 h-12 rounded-full bg-[#fdcada]/30 flex items-center justify-center text-[#7a5361]">
                    <span className="material-symbols-outlined">notifications_active</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#1b1c1b]">[라벤더 가든] 대표님</p>
                    <p className="text-xs text-[#3e4946]">Floxync 파트너</p>
                  </div>
                </div>
              </div>

              {/* Review 3 */}
              <div className="bg-white border border-[#bdc9c5]/20 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 p-8 rounded-[32px] border-b-4 border-b-[#665590] shadow-sm flex flex-col h-full">
                <div className="flex items-center gap-1 text-[#665590] mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="material-symbols-outlined text-[20px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <p className="text-sm lg:text-base text-[#1b1c1b] mb-8 flex-1 leading-relaxed italic">&quot;복잡한 정산 업무가 매일 숙제 같았는데, 이제는 자동으로 정리가 되니까 꽃 디자인에만 온전히 집중할 수 있어 행복합니다.&quot;</p>
                <div className="flex items-center gap-4 pt-6 border-t border-[#efedec]">
                  <div className="w-12 h-12 rounded-full bg-[#dbcaff]/30 flex items-center justify-center text-[#665590]">
                    <span className="material-symbols-outlined">calculate</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#1b1c1b]">[플로라 스튜디오] 원장님</p>
                    <p className="text-xs text-[#3e4946]">Floxync 파트너</p>
                  </div>
                </div>
              </div>

              {/* Review 4 */}
              <div className="bg-white border border-[#bdc9c5]/20 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 p-8 rounded-[32px] border-b-4 border-b-blue-300 shadow-sm flex flex-col h-full">
                <div className="flex items-center gap-1 text-blue-600 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="material-symbols-outlined text-[20px] font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
                  ))}
                </div>
                <p className="text-sm lg:text-base text-[#1b1c1b] mb-8 flex-1 leading-relaxed italic">&quot;손님께 보내는 배송 사진 전송이 은근히 번거로웠는데, 알아서 척척 보내주니 손님들 만족도가 정말 높아졌어요. 강력 추천합니다!&quot;</p>
                <div className="flex items-center gap-4 pt-6 border-t border-[#efedec]">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <span className="material-symbols-outlined">photo_camera</span>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-[#1b1c1b]">[블룸 앤 그리너리] 사장님</p>
                    <p className="text-xs text-[#3e4946]">Floxync 파트너</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4 Gifts Section */}
        <section className="py-24 bg-[#f5f3f1]/40 scroll-mt-20">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#86e3ce] text-[#006657] text-xs font-bold mb-6 shadow-sm">
                <span className="material-symbols-outlined text-[18px]">card_giftcard</span>
                사장님만을 위한 특별한 혜택
              </div>
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-[#1b1c1b]">사장님을 위한 4가지 특별한 선물</h2>
              <p className="text-base text-[#3e4946]">더 편안한 매장 운영을 위해 제가 준비한 새로운 기능들이에요!</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
              {/* Gift 1 */}
              <div className="bg-white/60 border border-[#006b5c]/10 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 p-8 rounded-[32px] flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#86e3ce]/30 flex items-center justify-center text-2xl">⭐</div>
                <h3 className="text-lg lg:text-xl font-bold text-[#006b5c]">카카오톡 리뷰 자동 요청</h3>
                <p className="text-xs lg:text-sm text-[#3e4946] leading-relaxed">배송 완료 메일과 메시지 전달 시에 리뷰 요청도 함께 올라갑니다. 리뷰 고객께 포인트를 추가해 드릴 수 있어요!</p>
              </div>

              {/* Gift 2 */}
              <div className="bg-white/60 border border-[#7a5361]/10 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 p-8 rounded-[32px] flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#fdcada]/30 flex items-center justify-center text-2xl">🌸</div>
                <h3 className="text-lg lg:text-xl font-bold text-[#7a5361]">고객 메시지 출력</h3>
                <p className="text-xs lg:text-sm text-[#3e4946] leading-relaxed">주문받을 때 고객이 요청한 메시지를 폼텍 용지 및 라벨 프린터로 출력해 드립니다. 스티커 용지에 출력해서 붙여주면 끝!</p>
              </div>

              {/* Gift 3 */}
              <div className="bg-white/60 border border-[#665590]/10 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 p-8 rounded-[32px] flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-[#dbcaff]/30 flex items-center justify-center text-2xl">📑</div>
                <h3 className="text-lg lg:text-xl font-bold text-[#665590]">똑똑한 캘린더 제공</h3>
                <p className="text-xs lg:text-sm text-[#3e4946] leading-relaxed">배송, 픽업, 고정비 지출일, 직원 스케줄, 특이 사항이나 메모 등이 캘린더에 한눈에 보입니다.</p>
              </div>

              {/* Gift 4 */}
              <div className="bg-white/60 border border-pink-200 hover:shadow-xl hover:translate-y-[-4px] transition-all duration-300 p-8 rounded-[32px] flex flex-col gap-4">
                <div className="w-12 h-12 rounded-2xl bg-pink-100 flex items-center justify-center text-2xl">🎂</div>
                <h3 className="text-lg lg:text-xl font-bold text-pink-800">단골 고객 생일/기념일 알림</h3>
                <p className="text-xs lg:text-sm text-[#3e4946] leading-relaxed">소중한 단골 손님의 특별한 날, 미리 알려드려요. 센스 있는 사장님이 되실 수 있게 제가 도와드릴게요!</p>
              </div>
            </div>
          </div>
        </section>

        {/* Beta Version Early Access Form */}
        <section
          id="test-user-apply"
          className="relative py-24 md:py-32 bg-gradient-to-b from-[#fbf9f7] via-[#f5f3f1] to-[#fbf9f7] border-t border-[#bdc9c5]/30 overflow-hidden"
        >
          <div className="absolute top-1/3 right-0 w-[420px] h-[420px] bg-[#96f4de]/10 rounded-full blur-[120px] pointer-events-none" />
          <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-[#e9ddff]/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-4xl">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-14"
            >
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-[#86e3ce] text-[#006657] font-bold text-xs mb-6 border border-[#006657]/20 uppercase tracking-[0.2em]">
                <FlaskConical className="w-4 h-4" />
                Beta · Early Access
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-[#1b1c1b] tracking-tight leading-tight md:leading-[1.1] mb-5">
                {t.title}
              </h2>
              <p 
                className="text-[#3e4946] text-base md:text-lg leading-relaxed max-w-2xl mx-auto"
                dangerouslySetInnerHTML={{ __html: t.description }}
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="rounded-[2rem] border border-[#bdc9c5]/40 bg-white/70 backdrop-blur-xl p-6 md:p-10 shadow-[0_0_60px_rgba(0,107,92,0.05)]"
            >
              <div className="mb-6 p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-sm text-amber-900 leading-relaxed shadow-sm">
                <span className="material-symbols-outlined text-amber-600">redeem</span>
                <div>
                  <strong>🎁 가입 & 구독 신청 사장님 한정 특별 혜택!</strong><br />
                  매장 운영을 바로 시작하실 수 있도록, 꽃집 맞춤형 <strong>기초 데이터(상품 정보, 자재 목록, 표준 거래처, 배송비 구성)를 기본 탑재</strong>해 드립니다. 
                  처음부터 일일이 입력하실 필요 없이, 사장님 매장에 맞게 살짝만 수정해서 즉시 시작해 보세요!
                </div>
              </div>
              {toBaseLocale(uiLocale) === "ko" && t.printerPromo ? (
                <div className="mb-6 p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-sm text-emerald-950 leading-relaxed shadow-sm">
                  <span className="material-symbols-outlined text-emerald-600 shrink-0">print</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 mb-1.5">
                      {t.printerPromo.badge}
                    </p>
                    <p className="font-black text-emerald-900 mb-2">📠 {t.printerPromo.title}</p>
                    <p
                      className="mb-2"
                      dangerouslySetInnerHTML={{ __html: t.printerPromo.body }}
                    />
                    <p
                      className="text-xs text-emerald-800/90"
                      dangerouslySetInnerHTML={{ __html: t.printerPromo.footnote }}
                    />
                  </div>
                </div>
              ) : null}
              <div className="grid md:grid-cols-2 gap-6 mb-8 text-sm text-[#3e4946] leading-relaxed">
                <div className="p-5 rounded-2xl bg-white border border-[#bdc9c5]/30">
                  <p className="font-black text-[#006657] text-xs uppercase tracking-widest mb-2">{t.sectionUser}</p>
                  <ul className="space-y-2 list-disc pl-4 marker:text-[#006b5c]">
                    <li>{t.userLine1}</li>
                    <li>{t.userLine2}</li>
                    <li>{t.userLine3}</li>
                    <li>
                      {t.userLine4}
                    </li>
                  </ul>
                </div>
                <div className="p-5 rounded-2xl bg-white border border-[#bdc9c5]/30">
                  <p className="font-black text-[#665590] text-xs uppercase tracking-widest mb-2">{t.sectionOps}</p>
                  <p>
                    {t.opsBody}
                  </p>
                </div>
              </div>

              {status === "success" ? (
                <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
                  <CheckCircle2 className="w-16 h-16 text-[#006b5c]" />
                  <p className="text-xl font-black text-[#1b1c1b]">{message}</p>
                  <p className="text-[#3e4946] text-sm max-w-md">{t.successSub}</p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="space-y-6">
                  <div className="hidden" aria-hidden="true">
                    <label htmlFor="tu-website">
                      {L(
                        "웹사이트 (자동 입력 금지)",
                        "Website (leave blank)",
                        "Website (để trống)",
                        "ウェブサイト（空欄のまま）",
                        "网站（请留空）",
                        "Sitio web (déjelo en blanco)",
                        "Site (deixe em branco)",
                        "Site web (laissez vide)",
                        "Website (leer lassen)",
                        "Сайт (оставьте пустым)",
                      )}
                    </label>
                    <input id="tu-website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div>
                      <label htmlFor="tu-name" className="block text-xs font-black text-[#3e4946] uppercase tracking-wider mb-2">
                        {t.name} <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id="tu-name"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-white border border-[#bdc9c5]/40 text-[#1b1c1b] placeholder:text-[#bdc9c5] focus:outline-none focus:ring-2 focus:ring-[#006b5c]/50"
                        placeholder={L("홍길동", "Jane Doe", "Nguyễn Văn A", "山田太郎", "张三", "María López", "Maria Silva", "Marie Dupont", "Max Mustermann", "Иван Иванов")}
                      />
                    </div>
                    <div>
                      <label htmlFor="tu-business" className="block text-xs font-black text-[#3e4946] uppercase tracking-wider mb-2">
                        {t.business} <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id="tu-business"
                        required
                        value={businessName}
                        onChange={(e) => setBusinessName(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-white border border-[#bdc9c5]/40 text-[#1b1c1b] placeholder:text-[#bdc9c5] focus:outline-none focus:ring-2 focus:ring-[#006b5c]/50"
                        placeholder={L(
                          "○○플라워",
                          "Your Flower Shop",
                          "Cửa hàng hoa của bạn",
                          "○○フラワー",
                          "○○花店",
                          "Tu floristería",
                          "Sua floricultura",
                          "Votre fleuriste",
                          "Ihr Blumenladen",
                          "Ваш цветочный магазин",
                        )}
                      />
                    </div>
                    <div>
                      <label htmlFor="tu-contact" className="block text-xs font-black text-[#3e4946] uppercase tracking-wider mb-2">
                        {t.contact} <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id="tu-contact"
                        required
                        value={contact}
                        onChange={(e) => setContact(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-white border border-[#bdc9c5]/40 text-[#1b1c1b] placeholder:text-[#bdc9c5] focus:outline-none focus:ring-2 focus:ring-[#006b5c]/50"
                        placeholder={L(
                          "010-0000-0000",
                          "+1 555-000-0000",
                          "0909 000 000",
                          "090-1234-5678",
                          "138-0000-0000",
                          "+34 600 000 000",
                          "+55 11 90000-0000",
                          "+33 6 12 34 56 78",
                          "+49 170 0000000",
                          "+7 900 000-00-00",
                        )}
                      />
                    </div>
                    <div>
                      <label htmlFor="tu-email" className="block text-xs font-black text-[#3e4946] uppercase tracking-wider mb-2">
                        {t.email} <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id="tu-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full h-12 px-4 rounded-xl bg-white border border-[#bdc9c5]/40 text-[#1b1c1b] placeholder:text-[#bdc9c5] focus:outline-none focus:ring-2 focus:ring-[#006b5c]/50"
                        placeholder={L(
                          "email@example.com",
                          "you@example.com",
                          "email@company.com",
                          "you@example.com",
                          "you@example.com",
                          "tu@ejemplo.com",
                          "voce@exemplo.com",
                          "vous@exemple.com",
                          "sie@beispiel.de",
                          "vy@primer.ru",
                        )}
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="tu-reason" className="block text-xs font-black text-[#3e4946] uppercase tracking-wider mb-2">
                      {t.reason} <span className="text-rose-400">*</span>
                    </label>
                    <textarea
                      id="tu-reason"
                      required
                      value={applyReason}
                      onChange={(e) => setApplyReason(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#bdc9c5]/40 text-[#1b1c1b] placeholder:text-[#bdc9c5] focus:outline-none focus:ring-2 focus:ring-[#006b5c]/50 resize-y min-h-[100px]"
                      placeholder={t.reasonPlaceholder}
                    />
                  </div>

                  <div>
                    <label htmlFor="tu-notes" className="block text-xs font-black text-[#3e4946] uppercase tracking-wider mb-2">
                      {t.notes}
                    </label>
                    <textarea
                      id="tu-notes"
                      value={featureNotes}
                      onChange={(e) => setFeatureNotes(e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 rounded-xl bg-white border border-[#bdc9c5]/40 text-[#1b1c1b] placeholder:text-[#bdc9c5] focus:outline-none focus:ring-2 focus:ring-[#006b5c]/50 resize-y min-h-[100px]"
                      placeholder={t.notesPlaceholder}
                    />
                  </div>

                  {status === "error" && message && (
                    <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 text-sm font-medium">{message}</div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-4 pt-2">
                    <button
                      type="submit"
                      disabled={status === "loading"}
                      className="flex-1 inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-gradient-to-r from-[#006b5c] to-[#665590] text-white font-black text-sm uppercase tracking-widest hover:opacity-95 disabled:opacity-50 shadow-lg shadow-[#006b5c]/20"
                    >
                      {status === "loading" ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          {t.sending}
                        </>
                      ) : (
                        <>
                          <Send className="w-5 h-5" />
                          {t.submit}
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={openMailtoFallback}
                      className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-2xl border border-[#bdc9c5]/40 text-[#3e4946] font-bold text-sm hover:bg-[#efedec]"
                    >
                      <Mail className="w-5 h-5 text-[#006b5c]" />
                      {t.mailSend}
                    </button>
                  </div>

                  {status === "error" && mailFallbackHint ? (
                    <p className="text-center text-xs text-[#3e4946]">
                      {L("위 ", "Tap ", "Nhấn ", "「", "点击 ", "Toca ", "Toque em ", "Appuyez sur ", "Tippen Sie auf ", "Нажмите ")}
                      <strong className="text-[#1b1c1b]">{t.mailSend}</strong>
                      {L(
                        "를 누르면 입력하신 내용이 메일 작성창에 채워집니다.",
                        " to open your mail app with the form pre-filled.",
                        " để mở ứng dụng thư với nội dung đã điền sẵn.",
                        "」를タップすると、入力内容がメール作成画面에 자동입력됩니다.",
                        "即可在邮件应用中预填您填写的内容。",
                        " para abrir el correo con el formulario rellenado.",
                        " para abrir o e-mail com o formulário preenchido.",
                        " pour ouvrir votre messagerie avec le formulaire prérempli.",
                        ", um die E-Mail-App mit vorausgefülltem Formular zu öffnen.",
                        ", чтобы открыть почту с уже заполненой формой.",
                      )}
                    </p>
                  ) : null}

                  <p className="text-[11px] text-[#3e4946] text-center leading-relaxed">{t.policy}</p>
                </form>
              )}
            </motion.div>
          </div>
        </section>

        {/* Re-designed Premium Footer to match Luminous Theme */}
        <footer className="bg-[#efedec] border-t border-[#bdc9c5]/40 pt-20 pb-12 text-sm relative overflow-hidden">
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-[#96f4de]/10 rounded-full blur-[100px] pointer-events-none" />

          <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-7xl">
            <div className="flex flex-col xl:flex-row justify-between items-start gap-16 mb-20">
              <div className="max-w-md">
                <Link href={homeHref} className="flex items-center gap-2 mb-8 group">
                  <img 
                    alt="Floxync Logo" 
                    className="h-16 w-auto object-contain" 
                    src="/images/floxync-logo-dark.png" 
                  />
                </Link>
                <p className="text-[#3e4946] mb-10 leading-relaxed text-lg font-light max-w-2xl">
                  {getMessages(uiLocale).landing.footer.line1}
                  <br />
                  {getMessages(uiLocale).landing.footer.line2.split('\n').map((line, idx) => (
                    <span key={idx}>
                      {line}
                      {idx !== getMessages(uiLocale).landing.footer.line2.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </p>
                <div className="grid grid-cols-1 gap-6 text-[#3e4946] text-xs uppercase tracking-widest font-black">
                  <div className="flex flex-col gap-2">
                    <span className="text-[#6e7a76]">{getMessages(uiLocale).landing.footer.officialMail}</span>
                    <a href="mailto:admin@floxync.com" className="text-[#006b5c] hover:underline">admin@floxync.com</a>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-12 lg:gap-24">
                <div>
                  <h4 className="font-black text-[#006b5c] mb-6 uppercase tracking-[0.2em] text-[10px]">{getMessages(uiLocale).landing.footer.architecture}</h4>
                  <ul className="space-y-4">
                    <li><Link href={`${homeHref}#feature-automation`} className="text-[#3e4946] hover:text-[#006b5c] transition-colors flex items-center gap-2 group"><Monitor size={14} className="opacity-50 group-hover:opacity-100" /> {getMessages(uiLocale).landing.footer.coreEngine}</Link></li>
                    <li><Link href={`${homeHref}#feature-connection`} className="text-[#3e4946] hover:text-[#006b5c] transition-colors flex items-center gap-2 group"><Terminal size={14} className="opacity-50 group-hover:opacity-100" /> {getMessages(uiLocale).landing.footer.aiModules}</Link></li>
                    <li><Link href={`${homeHref}#feature-ribbon`} className="text-[#665590] font-bold hover:text-[#006b5c] transition-colors flex items-center gap-2 group"><Cpu size={14} className="animate-pulse" /> {getMessages(uiLocale).landing.footer.printBridge}</Link></li>
                    <li><Link href={`${homeHref}#feature-multi-store`} className="text-[#3e4946] hover:text-[#006b5c] transition-colors flex items-center gap-2 group"><Monitor size={14} className="opacity-50 group-hover:opacity-100" /> {summaryMultiStore}</Link></li>
                    <li><Link href={`${homeHref}#feature-partner-network`} className="text-[#3e4946] hover:text-[#006b5c] transition-colors flex items-center gap-2 group"><Terminal size={14} className="opacity-50 group-hover:opacity-100" /> {summaryPartnerOrders}</Link></li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-black text-[#006b5c] mb-6 uppercase tracking-[0.2em] text-[10px]">{getMessages(uiLocale).landing.footer.businessColumn}</h4>
                  <ul className="space-y-4">
                    <li><Link href="#" className="text-[#3e4946] hover:text-[#006b5c] transition-colors">{getMessages(uiLocale).landing.footer.partnerProgram}</Link></li>
                    <li><Link href="#" className="text-[#3e4946] hover:text-[#006b5c] transition-colors">{getMessages(uiLocale).landing.footer.contactSales}</Link></li>
                  </ul>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <h4 className="font-black text-[#006b5c] mb-6 uppercase tracking-[0.2em] text-[10px]">{getMessages(uiLocale).landing.footer.legal}</h4>
                  <ul className="space-y-4">
                    <li><Link href={localizePath(uiLocale, '/terms')} className="text-[#3e4946] hover:text-[#006b5c] transition-colors">{getMessages(uiLocale).landing.footer.terms}</Link></li>
                    <li><Link href={localizePath(uiLocale, '/privacy')} className="text-[#7a5361] hover:underline transition-colors font-bold">{getMessages(uiLocale).landing.footer.privacy}</Link></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-12 border-t border-[#bdc9c5]/30 flex flex-col md:flex-row items-center justify-between gap-6 text-[#6e7a76] text-xs">
              <div className="flex flex-col md:flex-row items-center gap-2 md:gap-6">
                <p>© {new Date().getFullYear()} Lilymag Lab. {getMessages(uiLocale).landing.footer.rights}</p>
                <div className="flex items-center gap-4">
                  <span className="hover:text-[#1b1c1b] transition-colors cursor-pointer">{getMessages(uiLocale).landing.footer.securityStatus}</span>
                  <span className="hover:text-[#1b1c1b] transition-colors cursor-pointer">{getMessages(uiLocale).landing.footer.apiStatus}</span>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <Link href="https://github.com/mokflw-lilymag" className="hover:text-[#006b5c] transition-colors text-[#3e4946]">
                  <Github size={20} />
                </Link>
              </div>
            </div>
          </div>
        </footer>
      </main>

      <LandingSectionNav
        items={[
          { id: 'top', label: '맨 위', kind: 'top' },
          { id: 'features-summary', label: '주요 기능', num: '01', kind: 'section' },
          { id: 'feature-automation', label: '원스톱 자동화', num: '02', kind: 'section' },
          { id: 'feature-ribbon', label: '리본 솔루션', num: '03', kind: 'section' },
          { id: 'feature-scale', label: scaleNavLabel, num: '04', kind: 'section' },
          { id: 'testimonials', label: '후기', num: '05', kind: 'section' },
          { id: 'test-user-apply', label: '베타 신청', kind: 'cta' },
        ]}
      />
    </div>
  );
}
