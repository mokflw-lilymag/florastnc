"use client";

import { useState, FormEvent } from "react";
import { motion } from "framer-motion";
import {
  FlaskConical,
  Send,
  Loader2,
  CheckCircle2,
  Mail,
} from "lucide-react";
import { AppLocale, toBaseLocale } from "@/i18n/config";
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
  const T = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
  const lines = [
    T("[Floxync 테스트 유저 신청]", "[Floxync] Test user application", "[Floxync] Đơn đăng ký dùng thử"),
    "",
    `${T("이름", "Name", "Họ tên")}: ${values.fullName}`,
    `${T("상호", "Business name", "Tên cửa hàng")}: ${values.businessName}`,
    `${T("연락처", "Contact", "Liên hệ")}: ${values.contact}`,
    `${T("이메일", "Email", "Email")}: ${values.email}`,
    "",
    `${T("신청 사유", "Reason for applying", "Lý do đăng ký")}:\n${values.applyReason}`,
    "",
    values.featureNotes
      ? `${T("추가로 남기는 말", "Additional notes", "Ghi chú thêm")}:\n${values.featureNotes}`
      : "",
  ].filter(Boolean);
  return lines.join("\n");
}

export function TestUserApplySection({ locale = "ko" }: { locale?: AppLocale }) {
  const t = getMessages(locale).landing.testApply;
  const baseLocale = toBaseLocale(locale);
  const L = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
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
      L("[Floxync] 테스트 유저 신청", "[Floxync] Test user application", "[Floxync] Đăng ký dùng thử"),
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
          ),
      );
    } catch {
      setStatus("error");
      setMessage(
        L(
          "네트워크 오류입니다. 메일로 보내 주시거나 잠시 후 다시 시도해 주세요.",
          "Network error. Email us or try again shortly.",
          "Lỗi mạng. Gửi email hoặc thử lại sau.",
        ),
      );
    }
  };

  return (
    <section
      id="test-user-apply"
      className="relative py-24 md:py-32 bg-gradient-to-b from-[#0A0F0D] via-[#0c1411] to-[#0A0F0D] border-t border-white/5 overflow-hidden"
    >
      <div className="absolute top-1/3 right-0 w-[420px] h-[420px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="container mx-auto px-6 md:px-12 relative z-10 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-emerald-500/10 text-emerald-400 font-bold text-xs mb-6 border border-emerald-500/25 uppercase tracking-[0.2em]">
            <FlaskConical className="w-4 h-4" />
            Beta · Early Access
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-tight md:leading-[1.1] mb-5">
            {t.title}
          </h2>
          <p className="text-slate-300 text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
            {t.description}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="rounded-[2rem] border border-white/10 bg-white/[0.03] backdrop-blur-xl p-6 md:p-10 shadow-[0_0_60px_rgba(16,185,129,0.08)]"
        >
          <div className="grid md:grid-cols-2 gap-6 mb-8 text-sm text-slate-300 leading-relaxed">
            <div className="p-5 rounded-2xl bg-black/30 border border-white/5">
              <p className="font-black text-emerald-400/90 text-xs uppercase tracking-widest mb-2">{t.sectionUser}</p>
              <ul className="space-y-2 list-disc pl-4 marker:text-emerald-600">
                <li>{t.userLine1}</li>
                <li>{t.userLine2}</li>
                <li>{t.userLine3}</li>
                <li>
                  {t.userLine4}
                </li>
              </ul>
            </div>
            <div className="p-5 rounded-2xl bg-black/30 border border-white/5">
              <p className="font-black text-cyan-400/90 text-xs uppercase tracking-widest mb-2">{t.sectionOps}</p>
              <p>
                {t.opsBody}
              </p>
            </div>
          </div>

          {status === "success" ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-400" />
              <p className="text-xl font-black text-white">{message}</p>
              <p className="text-slate-500 text-sm max-w-md">{t.successSub}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="hidden" aria-hidden="true">
                <label htmlFor="tu-website">
                  {L("웹사이트 (자동 입력 금지)", "Website (leave blank)", "Website (để trống)")}
                </label>
                <input id="tu-website" value={website} onChange={(e) => setWebsite(e.target.value)} tabIndex={-1} autoComplete="off" />
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="tu-name" className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                    {t.name} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="tu-name"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-black/45 border border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder={L("홍길동", "Jane Doe", "Nguyễn Văn A")}
                  />
                </div>
                <div>
                  <label htmlFor="tu-business" className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                    {t.business} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="tu-business"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-black/45 border border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder={L("○○플라워", "Your Flower Shop", "Cửa hàng hoa của bạn")}
                  />
                </div>
                <div>
                  <label htmlFor="tu-contact" className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                    {t.contact} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="tu-contact"
                    required
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-black/45 border border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder={L("010-0000-0000", "+1 555-000-0000", "0909 000 000")}
                  />
                </div>
                <div>
                  <label htmlFor="tu-email" className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                    {t.email} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="tu-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-black/45 border border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder={L("email@example.com", "you@example.com", "email@company.com")}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="tu-reason" className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                  {t.reason} <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id="tu-reason"
                  required
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-black/45 border border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y min-h-[100px]"
                  placeholder={t.reasonPlaceholder}
                />
              </div>

              <div>
                <label htmlFor="tu-notes" className="block text-xs font-black text-slate-300 uppercase tracking-wider mb-2">
                  {t.notes}
                </label>
                <textarea
                  id="tu-notes"
                  value={featureNotes}
                  onChange={(e) => setFeatureNotes(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl bg-black/45 border border-white/15 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-y min-h-[100px]"
                  placeholder={t.notesPlaceholder}
                />
              </div>

              {status === "error" && message && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-100 text-sm font-medium">{message}</div>
              )}

              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="flex-1 inline-flex items-center justify-center gap-2 h-14 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-[#0A0F0D] font-black text-sm uppercase tracking-widest hover:opacity-95 disabled:opacity-50 shadow-lg shadow-emerald-500/20"
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
                  className="inline-flex items-center justify-center gap-2 h-14 px-6 rounded-2xl border border-white/20 text-slate-100 font-bold text-sm hover:bg-white/10"
                >
                  <Mail className="w-5 h-5 text-emerald-400" />
                  {t.mailSend}
                </button>
              </div>

              {status === "error" && mailFallbackHint ? (
                <p className="text-center text-xs text-slate-300">
                  {L("위 ", "Tap ", "Nhấn ")}
                  <strong className="text-slate-100">{t.mailSend}</strong>
                  {L(
                    "를 누르면 입력하신 내용이 메일 작성창에 채워집니다.",
                    " to open your mail app with the form pre-filled.",
                    " để mở ứng dụng thư với nội dung đã điền sẵn.",
                  )}
                </p>
              ) : null}

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">{t.policy}</p>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
