"use client";
import { useState, useEffect } from 'react';
import { Download, Monitor, CheckCircle2, AlertCircle, Play, X, RotateCw } from 'lucide-react';

interface BridgeOnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckStatus: () => Promise<boolean>;
}

export function BridgeOnboardingDialog({ isOpen, onClose, onCheckStatus }: BridgeOnboardingDialogProps) {
  const [step, setStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      const isConnected = await onCheckStatus();
      if (isConnected) {
        setStep(3); // Success
      } else {
        setError("브릿지가 여전히 감지되지 않습니다. 프로그램을 실행 중인지 확인해 주세요.");
      }
    } catch (err) {
      setError("연결 확인 중 오류가 발생했습니다.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-slate-900/50 p-6 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <Monitor className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white leading-none">프린터 브릿지 설정</h2>
              <p className="text-xs text-slate-500 mt-1">로컬 프린터를 연결하기 위해 필요한 작업입니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-700 rounded transition text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 bg-blue-600/10 rounded-full mb-2">
                  <Download className="w-8 h-8 text-blue-400 animate-bounce" />
                </div>
                <h3 className="text-lg font-semibold text-white">1단계: 브릿지 프로그램 다운로드</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  리본 프린터와 웹 앱을 연결해주는 필수 프로그램입니다.<br/>
                  아래 버튼을 눌러 설치 파일을 다운로드 받으세요.
                </p>
              </div>
              <a 
                href="/RibbonBridge_Setup_v25_0.exe" 
                download
                onClick={() => setStep(2)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg shadow-blue-900/20"
              >
                <Download size={20} />
                설치 파일 다운로드 (v25.0 .exe)
              </a>
              <button 
                onClick={() => setStep(2)}
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition"
              >
                이미 설치하셨나요? 다음 단계로 이동
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 bg-amber-600/10 rounded-full mb-2">
                  <Play className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">2단계: 프로그램 실행 및 연결 확인</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  다운로드 받은 <b>RibbonBridge_Setup_v25_0.exe</b>를 실행한 후,<br/>
                  아래 '활성화 확인' 버튼을 눌러주세요.
                </p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg flex items-start gap-3 text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg shadow-emerald-900/20"
              >
                {isVerifying ? (
                  <RotateCw size={20} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={20} />
                )}
                {isVerifying ? "연결 확인 중..." : "활성화 확인 및 완료"}
              </button>
              
              <button 
                onClick={() => setStep(1)}
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition"
              >
                다시 다운로드 받으러 가기
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex p-4 bg-emerald-500/20 rounded-full">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 bounce-in" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">브릿지 연결 성공!</h3>
                <p className="text-slate-400 text-sm">
                  이제 리본 프린터를 사용하여 자유롭게 출력할 수 있습니다.<br/>
                  모든 준비가 끝났습니다.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all shadow-lg"
              >
                작업 시작하기
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/30 p-4 border-t border-slate-700/50 flex justify-center">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">
            Supported OS: Windows 10/11 x64
          </p>
        </div>

      </div>
    </div>
  );
}

// Add animation keyframes via style tag inside the file
function StyleInjector() {
  return (
    <style>{`
      @keyframes bounce-in {
        0% { transform: scale(0.3); opacity: 0; }
        50% { transform: scale(1.05); opacity: 1; }
        70% { transform: scale(0.9); }
        100% { transform: scale(1); }
      }
      .bounce-in { animation: bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
    `}</style>
  );
}
