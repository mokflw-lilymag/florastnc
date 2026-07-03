"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

function AuthWaitingContent() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [seconds, setSeconds] = useState(0);
  const base = toBaseLocale(usePreferredLocale());

  const title = pickUiText(
    base,
    "대시보드를 준비하고 있습니다",
    "Preparing your dashboard",
    "Đang chuẩn bị bảng điều khiển",
    "ダッシュボードを準備しています",
    "正在准备仪表盘",
    "Preparando el panel",
    "Preparando o painel",
    "Préparation du tableau de bord",
    "Dashboard wird vorbereitet",
    "Подготовка панели управления",
  );
  const subtitle = pickUiText(
    base,
    "로그인은 완료되었습니다. 첫 접속·개발 모드에서는 1분 정도 걸릴 수 있습니다.",
    "Sign-in succeeded. First load in dev mode may take up to a minute.",
    "Đăng nhập thành công. Lần tải đầu trong dev có thể mất đến 1 phút.",
    "ログイン完了。開発モードの初回読み込みは最大1分かかることがあります。",
    "登录成功。开发模式首次加载可能需要约1分钟。",
    "Inicio de sesión correcto. La primera carga en dev puede tardar 1 minuto.",
    "Login concluído. A primeira carga em dev pode levar até 1 minuto.",
    "Connexion réussie. Le premier chargement en dev peut prendre 1 minute.",
    "Anmeldung erfolgreich. Erster Dev-Ladevorgang kann bis zu 1 Minute dauern.",
    "Вход выполнен. Первая загрузка в dev может занять до минуты.",
  );
  const hint = pickUiText(
    base,
    "다음부터는 훨씬 빨라집니다",
    "It will be much faster next time",
    "Lần sau sẽ nhanh hơn nhiều",
    "次回からはずっと速くなります",
    "下次会快很多",
    "Será mucho más rápido la próxima vez",
    "Na próxima será bem mais rápido",
    "Ce sera beaucoup plus rapide ensuite",
    "Beim nächsten Mal geht es viel schneller",
    "В следующий раз будет намного быстрее",
  );

  useEffect(() => {
    const tick = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(tick);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const warmAndGo = async () => {
      while (!cancelled) {
        try {
          const res = await fetch(next, {
            credentials: "include",
            cache: "no-store",
            redirect: "follow",
          });
          if (res.ok && !cancelled) {
            window.location.replace(next);
            return;
          }
        } catch {
          /* dev compile in progress */
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    };

    void warmAndGo();
    return () => {
      cancelled = true;
    };
  }, [next]);

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-slate-50 px-6">
      <Image
        src="/images/floxync-logo-dark.png"
        alt="FloXync"
        width={160}
        height={48}
        className="h-10 w-auto mb-8"
        priority
      />
      <Loader2 className="h-10 w-10 text-emerald-600 animate-spin mb-5" />
      <h1 className="text-lg font-bold text-slate-900 text-center">{title}</h1>
      <p className="mt-2 text-sm text-slate-500 text-center max-w-sm leading-relaxed">
        {subtitle}
      </p>
      <p className="mt-4 text-xs text-emerald-700 font-medium">{hint}</p>
      {seconds >= 5 && (
        <p className="mt-2 text-[11px] text-slate-400 tabular-nums">{seconds}s</p>
      )}
    </div>
  );
}

export default function AuthWaitingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[100dvh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
        </div>
      }
    >
      <AuthWaitingContent />
    </Suspense>
  );
}
