'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, Terminal, Smartphone, FlaskConical, Send, Loader2, CheckCircle2, Mail, Cpu, Monitor, Github } from 'lucide-react';
import Image from 'next/image';
import { AppLocale, LOCALE_COOKIE, localizePath, resolveLocale, SUPPORTED_LOCALES, toBaseLocale } from '@/i18n/config';
import { LANDING_LOCALE_SELECT_OPTIONS, resolveLandingSelectLocale } from '@/i18n/ui-locale-options';
import { getMessages } from "@/i18n/getMessages";
import { pickUiText } from "@/i18n/pick-ui-text";

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
    <div className="bg-[#fbf9f7] text-[#1b1c1b] font-sans antialiased selection:bg-[#86e3ce] selection:text-[#006657]">
      {/* Google Fonts / Material Icons link decoration is handled in layout, but icons are referenced below */}
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />

      {/* Decorative Blobs */}
      <div className="absolute top-0 -left-64 w-[500px] h-[500px] bg-[#96f4de]/20 rounded-full blur-[80px] pointer-events-none z-0" />
      <div className="absolute bottom-0 -right-32 w-[400px] h-[400px] bg-[#e9ddff]/20 rounded-full blur-[80px] pointer-events-none z-0" />

      <nav className="bg-[#fbf9f7]/80 backdrop-blur-md border-b border-[#bdc9c5]/30 sticky top-0 z-50 py-6 md:py-8 flex items-center">
        <div className="flex justify-between items-center w-full px-6 max-w-7xl mx-auto">
          <div className="flex items-center">
            <img 
              alt="Floxync Logo" 
              className="h-20 md:h-28 w-auto object-contain" 
              src="/images/floxync-logo-dark.png" 
            />
          </div>

          <div className="hidden md:flex gap-8 items-center">
            <a className="text-sm font-semibold text-[#3e4946] hover:text-[#006b5c] transition-colors" href="#features-summary">주요 기능</a>
            <a className="text-sm font-semibold text-[#3e4946] hover:text-[#006b5c] transition-colors" href="#feature-ribbon">리본 솔루션</a>
            <a className="text-sm font-semibold text-[#3e4946] hover:text-[#006b5c] transition-colors" href="#details">플랫폼 안내</a>
            <a className="text-sm font-semibold text-[#3e4946] hover:text-[#006b5c] transition-colors" href="#testimonials">후기</a>
            <Link className="text-sm font-semibold text-[#3e4946] hover:text-[#006b5c] transition-colors" href="/docs/manual">사용 설명서</Link>
            <Link className="text-sm font-semibold text-[#3e4946] hover:text-[#006b5c] transition-colors" href={`/${locale}/pricing`}>{pricingNavLabel}</Link>
          </div>

          <div className="flex gap-4 items-center">
            {/* Language Switcher */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full border border-[#bdc9c5]/30 bg-white/70 hover:bg-white transition-colors cursor-pointer">
              <Globe size={13} className="text-[#3e4946]" />
              <select
                value={selectLocale}
                onChange={(e) => handleLocaleChange(e.target.value as AppLocale)}
                className="bg-transparent text-[10px] font-black text-[#3e4946] outline-none cursor-pointer uppercase tracking-tight"
              >
                {LANDING_LOCALE_SELECT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} className="bg-white text-[#1b1c1b]">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <Link href={loginHref} className="text-sm font-semibold text-[#006b5c] hover:bg-[#006b5c]/5 px-4 py-2 rounded-full transition-all">
              로그인
            </Link>
            <Link href={loginHref} className="bg-[#006b5c] text-white text-sm font-bold px-6 py-2.5 rounded-full shadow-lg shadow-[#006b5c]/20 hover:scale-105 active:scale-95 transition-all">
              시작하기
            </Link>

            <button className="md:hidden p-2 text-[#1b1c1b]" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
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
              <a className="text-lg font-bold text-[#1b1c1b]" href="#features-summary" onClick={() => setMobileMenuOpen(false)}>주요 기능</a>
              <a className="text-lg font-bold text-[#1b1c1b]" href="#feature-ribbon" onClick={() => setMobileMenuOpen(false)}>리본 솔루션</a>
              <a className="text-lg font-bold text-[#1b1c1b]" href="#details" onClick={() => setMobileMenuOpen(false)}>플랫폼 안내</a>
              <a className="text-lg font-bold text-[#1b1c1b]" href="#testimonials" onClick={() => setMobileMenuOpen(false)}>후기</a>
              <Link className="text-lg font-bold text-[#1b1c1b]" href="/docs/manual" onClick={() => setMobileMenuOpen(false)}>사용 설명서</Link>
              <Link className="text-lg font-bold text-[#1b1c1b]" href={`/${locale}/pricing`} onClick={() => setMobileMenuOpen(false)}>{pricingNavLabel}</Link>
              <div className="flex flex-col gap-3 pt-4 border-t border-[#efedec]">
                <Link href={loginHref} className="py-4 text-center font-bold text-[#3e4946] border border-[#bdc9c5]/30 rounded-full bg-white flex items-center justify-center gap-2">
                  <Smartphone size={18} /> 모바일 앱
                </Link>
                <Link href={loginHref} className="py-4 text-center font-bold bg-[#006b5c] text-white rounded-full">
                  대시보드 시작
                </Link>
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
                <Link href={loginHref} className="bg-[#006b5c] text-white font-bold text-center px-8 py-4 rounded-full shadow-xl shadow-[#006b5c]/20 hover:shadow-2xl transition-all">
                  지금 무료로 시작하기
                </Link>
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
                    src="https://lh3.googleusercontent.com/aida/AP1WRLuKBxyzYKGC9FdfQp9uyM3Pa2VRCQDtMjX1S2XfwonfzhJm0wfBipr8ftndylNn7pBJE0DRmOHCfww0bhFrayHuBUaBWQq8uFUiqW4cwMYpzIBJ2LZGoCBKxqTnR6YAR2-KDdFYyKcT5v0M8EVzi5FrYVtPsuoHgH_SjBK7dMIsfhDTjsTzvg4p5poBM4wpApyP4kpkE17k5HabChM_878cGbCuvms1ESe8PjeihhNVJCCtZFvsmw7aCHU" 
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

        {/* Service Summary Section */}
        <section className="py-20 bg-[#f5f3f1]/40 scroll-mt-20" id="features-summary">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl lg:text-4xl font-extrabold mb-4 text-[#1b1c1b]">복잡한 일은 제가 다 할게요,<br />사장님은 꽃만 생각하세요</h2>
              <p className="text-base text-[#3e4946]">원하시는 기능을 클릭하시면 상세 안내로 이동합니다.</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
                  <img alt="One-stop Automation Dashboard" className="w-full h-auto rounded-[32px]" src="https://lh3.googleusercontent.com/aida/AP1WRLuKBxyzYKGC9FdfQp9uyM3Pa2VRCQDtMjX1S2XfwonfzhJm0wfBipr8ftndylNn7pBJE0DRmOHCfww0bhFrayHuBUaBWQq8uFUiqW4cwMYpzIBJ2LZGoCBKxqTnR6YAR2-KDdFYyKcT5v0M8EVzi5FrYVtPsuoHgH_SjBK7dMIsfhDTjsTzvg4p5poBM4wpApyP4kpkE17k5HabChM_878cGbCuvms1ESe8PjeihhNVJCCtZFvsmw7aCHU" />
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
                    <img alt="Ribbon Printing Solution" className="w-full h-auto rounded-[32px]" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDryQHuOlCPPZPuq8nUvVWc-qOBL0qfHlM1qbTE0WHDbRGOMXLp3qmiKTddyFWl2uT1Br_fKaV2U2FdjJ2rcDzF1NoV4076fHmGFx4_nXBBPEOs7TikCyFuVsMbpP5yizeLLTNIbZ4PXqv7dB4AJ_sTgtp0_T2bvi87iy_gzPxHKh7EINCzbeBguGc2jdi8ZkMdca2upNRxs04W5TRNfehzQI9k2nMNfBJDaxVBkuhApFogVbXs8ErivGf4XOlpLhQ_ia1Cpckj71r8" />
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
                  <img alt="Background Service Connection" className="w-full h-auto rounded-[32px]" src="https://lh3.googleusercontent.com/aida/AP1WRLuKBxyzYKGC9FdfQp9uyM3Pa2VRCQDtMjX1S2XfwonfzhJm0wfBipr8ftndylNn7pBJE0DRmOHCfww0bhFrayHuBUaBWQq8uFUiqW4cwMYpzIBJ2LZGoCBKxqTnR6YAR2-KDdFYyKcT5v0M8EVzi5FrYVtPsuoHgH_SjBK7dMIsfhDTjsTzvg4p5poBM4wpApyP4kpkE17k5HabChM_878cGbCuvms1ESe8PjeihhNVJCCtZFvsmw7aCHU" />
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
                  <img alt="Receipt AI OCR" className="w-full h-auto rounded-[32px]" src="https://lh3.googleusercontent.com/aida/AP1WRLuKBxyzYKGC9FdfQp9uyM3Pa2VRCQDtMjX1S2XfwonfzhJm0wfBipr8ftndylNn7pBJE0DRmOHCfww0bhFrayHuBUaBWQq8uFUiqW4cwMYpzIBJ2LZGoCBKxqTnR6YAR2-KDdFYyKcT5v0M8EVzi5FrYVtPsuoHgH_SjBK7dMIsfhDTjsTzvg4p5poBM4wpApyP4kpkE17k5HabChM_878cGbCuvms1ESe8PjeihhNVJCCtZFvsmw7aCHU" />
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
                  <img alt="Settlement Engine" className="w-full h-auto rounded-[32px]" src="https://lh3.googleusercontent.com/aida/AP1WRLuKBxyzYKGC9FdfQp9uyM3Pa2VRCQDtMjX1S2XfwonfzhJm0wfBipr8ftndylNn7pBJE0DRmOHCfww0bhFrayHuBUaBWQq8uFUiqW4cwMYpzIBJ2LZGoCBKxqTnR6YAR2-KDdFYyKcT5v0M8EVzi5FrYVtPsuoHgH_SjBK7dMIsfhDTjsTzvg4p5poBM4wpApyP4kpkE17k5HabChM_878cGbCuvms1ESe8PjeihhNVJCCtZFvsmw7aCHU" />
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
                  <img alt="Smart Notification Screen" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AP1WRLuKBxyzYKGC9FdfQp9uyM3Pa2VRCQDtMjX1S2XfwonfzhJm0wfBipr8ftndylNn7pBJE0DRmOHCfww0bhFrayHuBUaBWQq8uFUiqW4cwMYpzIBJ2LZGoCBKxqTnR6YAR2-KDdFYyKcT5v0M8EVzi5FrYVtPsuoHgH_SjBK7dMIsfhDTjsTzvg4p5poBM4wpApyP4kpkE17k5HabChM_878cGbCuvms1ESe8PjeihhNVJCCtZFvsmw7aCHU" />
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
        </div>

        {/* Platform Specific System */}
        <section className="py-24 bg-[#f5f3f1]/30 scroll-mt-20" id="details">
          <div className="max-w-7xl mx-auto px-6">
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
                  <img alt="Windows PC App" className="w-full h-auto rounded-[24px]" src="https://lh3.googleusercontent.com/aida/AP1WRLuKBxyzYKGC9FdfQp9uyM3Pa2VRCQDtMjX1S2XfwonfzhJm0wfBipr8ftndylNn7pBJE0DRmOHCfww0bhFrayHuBUaBWQq8uFUiqW4cwMYpzIBJ2LZGoCBKxqTnR6YAR2-KDdFYyKcT5v0M8EVzi5FrYVtPsuoHgH_SjBK7dMIsfhDTjsTzvg4p5poBM4wpApyP4kpkE17k5HabChM_878cGbCuvms1ESe8PjeihhNVJCCtZFvsmw7aCHU" />
                </div>
              </div>
            </div>

            {/* Android Mobile */}
            <div className="flex flex-col lg:flex-row-reverse items-center gap-12 lg:gap-24">
              <div className="flex-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fdcada] text-[#795260] text-xs font-bold mb-6">Android Mobile App</div>
                <h3 className="text-2xl lg:text-3xl font-extrabold mb-6">꽃 제작대에서도, 시장에서도!<br />사장님 손안의 비서</h3>
                <p className="text-base lg:text-lg text-[#3e4946] mb-8 leading-relaxed">언제 어디서든 주문을 확인하고 완료 사진을 전송하세요. (iOS 추후 지원 예정)</p>
                <div className="space-y-4 w-full">
                  <div className="flex items-center gap-4 p-4 rounded-3xl bg-white border border-[#bdc9c5]/20 shadow-sm hover:translate-y-[-2px] transition-transform duration-300">
                    <span className="material-symbols-outlined text-[#7a5361] text-[32px]">add_a_photo</span>
                    <div>
                      <h4 className="font-bold text-sm text-[#1b1c1b]">제작 완료 사진 촬영 및 저장</h4>
                      <p className="text-xs text-[#3e4946]">완성 사진을 찍어 주문 내역에 자동 매칭합니다.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-3xl bg-[#86e3ce]/10 border border-[#86e3ce]/30 shadow-sm hover:translate-y-[-2px] transition-transform duration-300">
                    <span className="material-symbols-outlined text-[#006b5c] text-[32px]">send_and_archive</span>
                    <div>
                      <h4 className="font-bold text-sm text-[#1b1c1b]">고객 안심 실시간 전송</h4>
                      <p className="text-xs text-[#3e4946]">제작 완료 알림을 고객에게 즉시 전송합니다.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-3xl bg-white border border-[#bdc9c5]/20 shadow-sm hover:translate-y-[-2px] transition-transform duration-300">
                    <span className="material-symbols-outlined text-[#7a5361] text-[32px]">photo_camera</span>
                    <div>
                      <h4 className="font-bold text-sm text-[#1b1c1b]">꽃시장에서 영수증촬영으로 영수증 저장및 지출관리 자동입력</h4>
                      <p className="text-xs text-[#3e4946]">영수증을 카메라로 찍으면 자동으로 내역을 분석해 장부에 기록합니다.</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 w-full max-w-[280px] flex justify-center relative">
                <div className="rounded-[3rem] border-[8px] border-[#30302f] shadow-2xl overflow-hidden aspect-[9/19.5] w-full bg-white">
                  <img alt="Mobile App Screen" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida/AP1WRLuKBxyzYKGC9FdfQp9uyM3Pa2VRCQDtMjX1S2XfwonfzhJm0wfBipr8ftndylNn7pBJE0DRmOHCfww0bhFrayHuBUaBWQq8uFUiqW4cwMYpzIBJ2LZGoCBKxqTnR6YAR2-KDdFYyKcT5v0M8EVzi5FrYVtPsuoHgH_SjBK7dMIsfhDTjsTzvg4p5poBM4wpApyP4kpkE17k5HabChM_878cGbCuvms1ESe8PjeihhNVJCCtZFvsmw7aCHU" />
                </div>
                <div className="absolute -bottom-6 -right-6 bg-white/90 border border-[#fdcada]/50 backdrop-blur-md p-4 rounded-2xl shadow-xl z-10">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#7a5361] animate-bounce">check_circle</span>
                    <span className="text-xs font-bold text-[#7a5361]">완료 알림 전송됨!</span>
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
                <img alt="Dashboard Full View" className="w-full h-auto rounded-[30px]" src="https://lh3.googleusercontent.com/aida/AP1WRLuKBxyzYKGC9FdfQp9uyM3Pa2VRCQDtMjX1S2XfwonfzhJm0wfBipr8ftndylNn7pBJE0DRmOHCfww0bhFrayHuBUaBWQq8uFUiqW4cwMYpzIBJ2LZGoCBKxqTnR6YAR2-KDdFYyKcT5v0M8EVzi5FrYVtPsuoHgH_SjBK7dMIsfhDTjsTzvg4p5poBM4wpApyP4kpkE17k5HabChM_878cGbCuvms1ESe8PjeihhNVJCCtZFvsmw7aCHU" />
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

      {/* Floating Section Navigator (Bottom Right) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 bg-white/70 backdrop-blur-md p-3 rounded-full border border-[#bdc9c5]/40 shadow-xl max-w-[280px]">
        <div className="flex flex-col gap-1.5">
          <a href="#" className="w-8 h-8 rounded-full bg-[#006b5c]/10 text-[#006b5c] flex items-center justify-center text-xs font-bold hover:bg-[#006b5c] hover:text-white transition-all" title="위로 가기">
            <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
          </a>
          <a href="#features-summary" className="w-8 h-8 rounded-full bg-[#efedec] text-[#3e4946] flex items-center justify-center text-xs font-bold hover:bg-[#006b5c] hover:text-white transition-all" title="주요기능 요약">
            1
          </a>
          <a href="#feature-automation" className="w-8 h-8 rounded-full bg-[#efedec] text-[#3e4946] flex items-center justify-center text-xs font-bold hover:bg-[#006b5c] hover:text-white transition-all" title="원스톱 자동화">
            2
          </a>
          <a href="#feature-ribbon" className="w-8 h-8 rounded-full bg-[#efedec] text-[#3e4946] flex items-center justify-center text-xs font-bold hover:bg-[#006b5c] hover:text-white transition-all" title="리본 솔루션">
            3
          </a>
          <a href="#test-user-apply" className="w-8 h-8 rounded-full bg-[#86e3ce] text-[#006657] flex items-center justify-center text-[10px] font-black hover:bg-[#006b5c] hover:text-white transition-all" title="베타 신청">
            Apply
          </a>
        </div>
      </div>
    </div>
  );
}
