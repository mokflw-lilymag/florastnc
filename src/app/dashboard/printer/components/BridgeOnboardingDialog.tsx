"use client";
import { useState, useEffect } from 'react';
import { Download, Monitor, CheckCircle2, AlertCircle, Play, X, RotateCw } from 'lucide-react';
import { usePreferredLocale } from '@/hooks/use-preferred-locale';
import { getMessages } from '@/i18n/getMessages';

interface BridgeOnboardingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckStatus: () => Promise<boolean>;
}

export function BridgeOnboardingDialog({ isOpen, onClose, onCheckStatus }: BridgeOnboardingDialogProps) {
  const locale = usePreferredLocale();
  const R = getMessages(locale).dashboard.ribbon;
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
        setError(R.bridgeOnboardStillNotDetected);
      }
    } catch (err) {
      setError(R.bridgeOnboardVerifyError);
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
              <h2 className="text-xl font-bold text-white leading-none">{R.bridgeOnboardTitle}</h2>
              <p className="text-xs text-slate-500 mt-1">{R.bridgeOnboardSubtitle}</p>
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
                <h3 className="text-lg font-semibold text-white">{R.bridgeOnboardStep1Title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {R.bridgeOnboardStep1Body1}<br/>
                  {R.bridgeOnboardStep1Body2}
                </p>
              </div>
              <a 
                href="/RibbonBridge_Setup_v25_0.exe" 
                download
                onClick={() => setStep(2)}
                className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold flex items-center justify-center gap-3 transition-all hover:scale-[1.02] shadow-lg shadow-blue-900/20"
              >
                <Download size={20} />
                {R.bridgeOnboardDownloadBtn}
              </a>
              <button 
                onClick={() => setStep(2)}
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition"
              >
                {R.bridgeOnboardAlreadyInstalled}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div className="text-center space-y-2">
                <div className="inline-flex p-4 bg-amber-600/10 rounded-full mb-2">
                  <Play className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{R.bridgeOnboardStep2Title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">
                  {R.bridgeOnboardStep2Body1} <b>RibbonBridge_Setup_v25_0.exe</b> {R.bridgeOnboardStep2Body2}<br/>
                  {R.bridgeOnboardStep2Body3}
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
                {isVerifying ? R.bridgeOnboardVerifying : R.bridgeOnboardVerifyAndFinish}
              </button>
              
              <button 
                onClick={() => setStep(1)}
                className="w-full text-xs text-slate-500 hover:text-slate-300 transition"
              >
                {R.bridgeOnboardBackToDownload}
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="text-center space-y-6 py-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="inline-flex p-4 bg-emerald-500/20 rounded-full">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 bounce-in" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-white">{R.bridgeOnboardSuccessTitle}</h3>
                <p className="text-slate-400 text-sm">
                  {R.bridgeOnboardSuccessBody1}<br/>
                  {R.bridgeOnboardSuccessBody2}
                </p>
              </div>
              <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-bold transition-all shadow-lg"
              >
                {R.bridgeOnboardStartWork}
              </button>
            </div>
          )}

          {/* Installation Troubleshooting Guide (Now more prominent for real users) */}
          {error && step === 2 && (
            <div className="mt-8 p-5 bg-blue-900/20 rounded-xl border border-blue-500/30 space-y-4">
              <h4 className="text-sm font-bold text-blue-300 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {R.bridgeOnboardTroubleTitle}
              </h4>
              <div className="space-y-3">
                <div className="text-[12px] text-slate-300 leading-relaxed">
                  <p className="font-bold text-white mb-1">{R.bridgeOnboardTrouble1Title}</p>
                  <p className="pl-4 opacity-80">{R.bridgeOnboardTrouble1BodyA} <span className="text-blue-400 underline font-bold cursor-default">{R.bridgeOnboardTroubleMoreInfo}</span> {R.bridgeOnboardTrouble1BodyB} <span className="text-white font-bold bg-blue-600/50 px-1.5 rounded">{R.bridgeOnboardTroubleRun}</span> {R.bridgeOnboardTrouble1BodyC}</p>
                </div>
                <div className="text-[12px] text-slate-300 leading-relaxed border-t border-blue-500/20 pt-3">
                  <p className="font-bold text-white mb-1">{R.bridgeOnboardTrouble2Title}</p>
                  <p className="pl-4 opacity-80">{R.bridgeOnboardTrouble2BodyA} <span className="text-white font-bold">{R.bridgeOnboardTroubleContinue}</span> {R.bridgeOnboardTroubleOr} <span className="text-white font-bold">{R.bridgeOnboardTroubleKeep}</span>{R.bridgeOnboardTrouble2BodyB}</p>
                </div>
                <div className="text-[12px] text-slate-300 leading-relaxed border-t border-blue-500/20 pt-3">
                  <p className="font-bold text-white mb-1">{R.bridgeOnboardTrouble3Title}</p>
                  <p className="pl-4 opacity-80">{R.bridgeOnboardTrouble3BodyA} <span className="text-blue-400 font-bold">Ribbon Bridge</span> {R.bridgeOnboardTrouble3BodyB}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-900/30 p-4 border-t border-slate-700/50 flex justify-center">
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-mono">
            {R.bridgeOnboardSupportedOs}
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
