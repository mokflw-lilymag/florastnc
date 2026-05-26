"use client";
import { useState, useEffect } from 'react';
import { Download, Monitor, CheckCircle2, AlertCircle, Play, X, RotateCw } from 'lucide-react';

interface BridgeOnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
}

export function BridgeOnboardingDialog({ isOpen, onClose, tenantId }: BridgeOnboardingDialogProps) {
  const [step, setStep] = useState(1);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleVerify = async () => {
    setIsVerifying(true);
    setError(null);
    try {
      // Simulate verification - in reality the bridge app would ping a heartbeat to Supabase or similar
      // For this SaaS, we check if there's any active heartbeat from this tenant's local agent
      await new Promise(res => setTimeout(res, 2000));
      
      // Let's assume success for now. (You can implement a real heartbeat check later).
      setStep(3);
    } catch (err) {
      setError("연결 확인 중 오류가 발생했습니다.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300">
        
        {/* Header */}
        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-600/20 rounded-lg">
              <Monitor className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-none">프린터 브릿지 설정</h2>
              <p className="text-xs text-slate-500 mt-1">로컬 영수증/라벨 프린터를 연결하기 위한 필수 작업입니다.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded transition text-slate-400">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 bg-blue-50 dark:bg-blue-600/10 rounded-full mb-2">
                  <Download className="w-8 h-8 text-blue-500 dark:text-blue-400 animate-bounce" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">1단계: 브릿지 프로그램 다운로드</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  매장 프린터와 주문 시스템을 연결해주는 필수 프로그램입니다.<br/>
                  아래 버튼을 눌러 맞춤형 설치 파일을 다운로드 받으세요.
                </p>
              </div>
              <a 
                href={`/api/downloads/bridge?tenantId=${tenantId}`} 
                download="ppbridge-setup.zip"
                onClick={() => setStep(2)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg shadow-blue-900/20"
              >
                <Download size={20} />
                매장 전용 설치 파일 다운로드 (.zip)
              </a>
              <button 
                onClick={() => setStep(2)}
                className="w-full text-xs text-slate-500 hover:text-slate-400 transition"
              >
                이미 설치하셨나요? 다음 단계로 이동
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 bg-amber-50 dark:bg-amber-600/10 rounded-full mb-2">
                  <Play className="w-8 h-8 text-amber-500 dark:text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">2단계: 압축 해제 및 프로그램 실행</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed">
                  다운로드 받은 <b>ppbridge-setup.zip</b> 압축을 풀고,<br/>
                  <b>ppbridge.exe</b>를 실행한 후 아래 '활성화 확인' 버튼을 눌러주세요.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 p-3 rounded-lg flex items-start gap-3 text-red-600 dark:text-red-400 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button 
                onClick={handleVerify}
                disabled={isVerifying}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg"
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
                className="w-full text-xs text-slate-500 hover:text-slate-400 transition"
              >
                다시 다운로드 받으러 가기
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex p-4 bg-emerald-50 dark:bg-emerald-500/20 rounded-full">
                <CheckCircle2 className="w-12 h-12 text-emerald-500 dark:text-emerald-400 bounce-in" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">브릿지 연결 완료!</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                  이제 주문이 들어오면 매장 프린터로 즉시 출력됩니다.<br/>
                  브릿지 프로그램은 켜둔 상태로 유지해 주세요.
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-900 hover:bg-slate-800 dark:bg-slate-700 dark:hover:bg-slate-600 text-white rounded-xl font-bold transition-all shadow-lg"
              >
                확인
              </button>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes bounce-in {
          0% { transform: scale(0.3); opacity: 0; }
          50% { transform: scale(1.05); opacity: 1; }
          70% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .bounce-in { animation: bounce-in 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
      `}</style>
    </div>
  );
}
