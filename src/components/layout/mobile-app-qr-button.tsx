"use client";

import { useState } from "react";
import { X, Smartphone } from "lucide-react";
import QRCode from "react-qr-code";
import { ANDROID_APK_DOWNLOAD_URL } from "@/lib/downloads/android-apk";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export function MobileAppQrButton() {
  const [closed, setClosed] = useState(false);
  const base = toBaseLocale(usePreferredLocale());

  const title = pickUiText(
    base,
    "📱 모바일 앱 다운로드",
    "📱 Download mobile app",
    "📱 Tải ứng dụng di động",
    "📱 モバイルアプリをダウンロード",
    "📱 下载移动应用",
    "📱 Descargar app móvil",
    "📱 Baixar app móvel",
    "📱 Télécharger l'app mobile",
    "📱 Mobile-App herunterladen",
    "📱 Скачать мобильное приложение",
  );
  const scanHint = pickUiText(
    base,
    "카메라로 QR 스캔",
    "Scan QR with your camera",
    "Quét QR bằng camera",
    "カメラでQRをスキャン",
    "用相机扫描二维码",
    "Escanee el QR con la cámara",
    "Escaneie o QR com a câmera",
    "Scannez le QR avec l'appareil photo",
    "QR mit der Kamera scannen",
    "Отсканируйте QR камерой",
  );
  const restoreLabel = pickUiText(
    base,
    "모바일 앱 QR 보기",
    "Show mobile app QR",
    "Xem mã QR app",
    "モバイルQRを表示",
    "显示移动应用二维码",
    "Ver QR de la app",
    "Ver QR do app",
    "Afficher le QR de l'app",
    "Mobile-QR anzeigen",
    "Показать QR приложения",
  );
  const closeTitle = pickUiText(
    base,
    "닫기",
    "Close",
    "Đóng",
    "閉じる",
    "关闭",
    "Cerrar",
    "Fechar",
    "Fermer",
    "Schließen",
    "Закрыть",
  );

  if (closed) {
    return (
      <button
        type="button"
        onClick={() => setClosed(false)}
        className="w-full flex items-center justify-center gap-2 mb-2 py-2.5 rounded-xl border-2 border-emerald-500/60 hover:border-emerald-400 transition-all hover:scale-[1.02] bg-gradient-to-br from-slate-900 to-emerald-950"
      >
        <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
        <span className="text-emerald-200 text-[11px] font-bold">{restoreLabel}</span>
      </button>
    );
  }

  return (
    <div className="w-full rounded-xl mb-2 overflow-hidden border border-emerald-200/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950">
      <div className="flex items-start justify-between px-3 pt-3 pb-1">
        <div>
          <p className="text-white text-[11px] font-bold tracking-wide">{title}</p>
          <p className="text-emerald-300/90 text-[9px]">{scanHint}</p>
        </div>
        <button
          type="button"
          onClick={() => setClosed(true)}
          className="text-white/30 hover:text-white/70 transition-colors mt-0.5"
          title={closeTitle}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex justify-center px-3 pb-3 pt-1">
        <div className="rounded-lg overflow-hidden bg-white p-1.5 shadow-md">
          <QRCode
            value={ANDROID_APK_DOWNLOAD_URL}
            size={120}
            bgColor="#ffffff"
            fgColor="#0f172a"
            level="M"
          />
        </div>
      </div>
    </div>
  );
}
