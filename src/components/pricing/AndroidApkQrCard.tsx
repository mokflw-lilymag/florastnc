"use client";

import QRCode from "react-qr-code";
import { Smartphone } from "lucide-react";
import { ANDROID_APK_DOWNLOAD_URL, ANDROID_APK_DRIVE_URL } from "@/lib/downloads/android-apk";

type Props = {
  buttonLabel: string;
  qrCaption: string;
  qrAlt: string;
  guidanceItems: string[];
};

export function AndroidApkQrCard({
  buttonLabel,
  qrCaption,
  qrAlt,
  guidanceItems,
}: Props) {
  return (
    <div className="w-full sm:w-auto flex flex-col items-center gap-3 rounded-2xl border border-[#bdc9c5]/40 bg-white/80 px-5 py-4 shadow-sm">
      <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center">
        {qrCaption}
      </p>
      <div
        className="rounded-xl bg-white p-3 shadow-inner border border-slate-100"
        aria-label={qrAlt}
      >
        <QRCode
          value={ANDROID_APK_DOWNLOAD_URL}
          size={148}
          level="M"
          bgColor="#ffffff"
          fgColor="#1b1c1b"
        />
      </div>
      {guidanceItems.length > 0 ? (
        <ul className="w-full text-left text-[11px] leading-relaxed text-slate-600 space-y-1.5 px-1">
          {guidanceItems.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-slate-400 shrink-0" aria-hidden>
                •
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <a
        href={ANDROID_APK_DRIVE_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full bg-slate-900 text-white font-bold px-6 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-md text-sm"
      >
        <Smartphone className="w-4 h-4" />
        {buttonLabel}
      </a>
    </div>
  );
}
