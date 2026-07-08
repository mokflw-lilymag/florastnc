"use client";

import React, { useEffect, useState } from "react";
import { DownloadCloud, RefreshCw, X } from "lucide-react";
import { Button } from "./ui/button";

interface UpdaterStatus {
  status: 'available' | 'downloading' | 'downloaded' | 'error';
  version?: string;
  percent?: number;
  speed?: number;
  message?: string;
}

export function UpdaterBadge() {
  const [status, setStatus] = useState<UpdaterStatus | null>(null);
  const [visible, setVisible] = useState(true);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electronAPI?.onUpdaterStatus) {
      const unsubscribe = (window as any).electronAPI.onUpdaterStatus((data: UpdaterStatus) => {
        setStatus(data);
        setVisible(true); // 새 상태가 올 때마다 다시 표시
      });
      return () => unsubscribe();
    }
  }, []);

  if (!status || !visible) return null;

  if (isInstalling) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/95 backdrop-blur-md">
        <div className="flex flex-col items-center gap-5 text-center max-w-md mx-auto p-8 rounded-2xl shadow-2xl border border-slate-100 bg-white">
          <RefreshCw className="w-12 h-12 text-blue-600 animate-spin" />
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">업데이트 설치를 시작합니다</h2>
            <p className="text-slate-600 text-base leading-relaxed">
              잠시 후 앱이 자동으로 닫히며 <strong>약 10~20초 뒤에</strong><br />
              최신 버전으로 다시 실행됩니다.<br/>
              <span className="text-red-500 font-semibold mt-2 inline-block">절대 PC를 끄지 마시고 잠시만 기다려주세요!</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status.status === 'downloading') {
    const percent = status.percent ? status.percent.toFixed(1) : "0.0";
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-white/95 backdrop-blur-sm border border-blue-200 shadow-lg rounded-full px-4 py-2 flex items-center gap-3 animate-in slide-in-from-bottom-5">
        <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
        <span className="text-sm font-medium text-slate-700">새 버전 준비 중... {percent}%</span>
      </div>
    );
  }

  if (status.status === 'downloaded') {
    return (
      <div className="fixed bottom-6 right-6 z-50 bg-emerald-50 border border-emerald-200 shadow-xl rounded-2xl p-4 flex flex-col gap-3 animate-in slide-in-from-bottom-5 max-w-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-100 p-2 rounded-full">
              <DownloadCloud className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-bold text-emerald-900">새 버전({status.version}) 준비 완료</p>
              <p className="text-xs text-emerald-700 mt-0.5">앱을 재시작하면 최신 기능이 적용됩니다.</p>
            </div>
          </div>
          <button onClick={() => setVisible(false)} className="text-emerald-400 hover:text-emerald-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <Button 
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
          onClick={() => {
            setIsInstalling(true);
            setTimeout(() => {
              if ((window as any).electronAPI?.installUpdate) {
                (window as any).electronAPI.installUpdate();
              }
            }, 3000);
          }}
        >
          지금 재시작하여 적용하기
        </Button>
      </div>
    );
  }

  return null;
}
