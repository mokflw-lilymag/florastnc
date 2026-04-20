"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { 
  Sparkles, 
  Mic, 
  Image as ImageIcon, 
  Type, 
  Loader2, 
  Check, 
  X, 
  ArrowRight,
  History
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { toast } from "sonner";
import { parseOrderWithAi } from "@/app/actions/ai/order-parser";
import { setFlorasyncFloatingUiSuppressed } from "@/lib/floating-ui-bridge";
import { cn } from "@/lib/utils";

/** 마이크 녹음 시 사용자가 참고할 말하기 예시 (입력폼 안내용) */
const VOICE_ORDER_SCRIPT_EXAMPLE = `000님 주문, 0만 원 꽃다발, 0월 0일 0시 픽업 또는 배송.

주소: 도로명주소, 수령인 이름, 연락처.

카드/리본 메시지 — 메시지 블라블라 등 원하시는 문구.`;

interface AiOrderConciergeProps {
  onApply: (data: any) => void;
}

const DELIVERY_TYPES = [
  { value: "delivery_reservation", label: "배송 예약" },
  { value: "pickup_reservation", label: "픽업 예약" },
  { value: "store_pickup", label: "매장 픽업" },
] as const;

/** 분석 직후 검토·수정용으로 기본값을 채운 얕은 복사 */
function cloneAiDraftForReview(raw: unknown): Record<string, unknown> {
  const src = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const orderer = { ...(typeof src.orderer === "object" && src.orderer ? src.orderer : {}) } as Record<
    string,
    string
  >;
  const recipient = {
    ...(typeof src.recipient === "object" && src.recipient ? src.recipient : {}),
  } as Record<string, string>;
  const deliveryRaw =
    typeof src.delivery === "object" && src.delivery ? (src.delivery as Record<string, unknown>) : {};
  let type = String(deliveryRaw.type ?? "delivery_reservation");
  if (!DELIVERY_TYPES.some((t) => t.value === type)) type = "delivery_reservation";

  const itemsRaw = Array.isArray(src.items) ? src.items : [];
  const items =
    itemsRaw.length > 0
      ? itemsRaw.map((it: unknown) => {
          const o = it && typeof it === "object" ? (it as Record<string, unknown>) : {};
          return {
            name: String(o.name ?? ""),
            price: Number(o.price) || 0,
            quantity: Number(o.quantity) || 1,
          };
        })
      : [{ name: "", price: 0, quantity: 1 }];

  const msg =
    typeof src.message === "object" && src.message
      ? (src.message as Record<string, unknown>)
      : {};
  const memoVal = src.memo != null ? String(src.memo) : "";

  return {
    ...src,
    orderer: {
      name: String(orderer.name ?? ""),
      contact: String(orderer.contact ?? ""),
      company: String(orderer.company ?? ""),
    },
    recipient: {
      name: String(recipient.name ?? ""),
      contact: String(recipient.contact ?? ""),
      address: String(recipient.address ?? ""),
      detailAddress: String(recipient.detailAddress ?? ""),
    },
    delivery: {
      type,
      date: String(deliveryRaw.date ?? ""),
      time: String(deliveryRaw.time ?? ""),
    },
    items,
    message: { content: String(msg.content ?? "") },
    memo: memoVal,
  };
}

export function AiOrderConcierge({ onApply }: AiOrderConciergeProps) {
  const [isOpen, setIsOpen] = useState(false);
  // UI State
  const [activeTab, setActiveTab] = useState<"smart" | "image">("smart");
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Input State
  const [textInput, setTextInput] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [audioLevels, setAudioLevels] = useState<number[]>(new Array(10).fill(2));
  
  // Audio Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  /** Chrome/Edge: Web Speech API로 음성→텍스트 후 Gemini에 텍스트만 전달 */
  const speechRecognitionRef = useRef<{ stop: () => void; abort?: () => void } | null>(null);
  const usingSpeechRecognitionRef = useRef(false);
  const speechTranscriptRef = useRef("");
  const speechVizIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Image State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** AI 분석 결과 — 검토 화면에서 사용자가 직접 수정한 뒤 적용 */
  const [aiReviewDraft, setAiReviewDraft] = useState<Record<string, unknown> | null>(null);
  const [portalReady, setPortalReady] = useState(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  /** 패널 열릴 때 퀵챗 FAB 숨김 — 모바일·PC 공통 (뷰포트 고정 모달과 겹침 방지) */
  useEffect(() => {
    if (!isOpen) return;
    setFlorasyncFloatingUiSuppressed(true);
    return () => setFlorasyncFloatingUiSuppressed(false);
  }, [isOpen]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach((track) => track.stop());
      if (speechVizIntervalRef.current) {
        clearInterval(speechVizIntervalRef.current);
        speechVizIntervalRef.current = null;
      }
      try {
        speechRecognitionRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  function getSpeechRecognitionCtor(): (new () => EventTarget & { start: () => void; stop: () => void }) | null {
    if (typeof window === "undefined") return null;
    const w = window as unknown as {
      SpeechRecognition?: new () => EventTarget & { start: () => void; stop: () => void };
      webkitSpeechRecognition?: new () => EventTarget & { start: () => void; stop: () => void };
    };
    return w.SpeechRecognition || w.webkitSpeechRecognition || null;
  }

  const startBrowserSpeechRecognition = () => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) return false;

    speechTranscriptRef.current = "";
    setTextInput("");
    usingSpeechRecognitionRef.current = true;

    const rec = new Ctor() as EventTarget & {
      lang: string;
      continuous: boolean;
      interimResults: boolean;
      start: () => void;
      stop: () => void;
      onresult: ((this: unknown, ev: { results: { 0: { transcript: string }; length: number }[] }) => void) | null;
      onerror: ((this: unknown, ev: { error?: string }) => void) | null;
      onend: (() => void) | null;
    };

    rec.lang = "ko-KR";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: { results: ArrayLike<{ 0: { transcript: string }; isFinal?: boolean }> }) => {
      let txt = "";
      for (let i = 0; i < event.results.length; i++) {
        const r = event.results[i];
        if (r?.[0]?.transcript) txt += r[0].transcript;
      }
      speechTranscriptRef.current = txt;
      setTextInput(txt);
    };

    rec.onerror = (ev: { error?: string }) => {
      console.error("SpeechRecognition error:", ev);
      toast.error(
        ev.error === "not-allowed"
          ? "마이크·음성 인식 권한이 필요합니다."
          : `음성 인식 오류${ev.error ? `: ${ev.error}` : ""}`
      );
      stopSpeechRecognitionUi();
    };

    rec.onend = () => {
      if (!usingSpeechRecognitionRef.current) return;
      stopSpeechRecognitionUi();
      const t = speechTranscriptRef.current.trim();
      if (t) {
        void runAiAnalysis({ textOverride: t });
      } else {
        toast.error("인식된 말이 없습니다. 조금 더 크게 말하거나 텍스트로 입력해 보세요.");
      }
    };

    speechRecognitionRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
      speechVizIntervalRef.current = setInterval(() => {
        setAudioLevels(Array.from({ length: 10 }, () => 4 + Math.random() * 28));
      }, 120);
      return true;
    } catch (e) {
      console.error(e);
      usingSpeechRecognitionRef.current = false;
      speechRecognitionRef.current = null;
      return false;
    }
  };

  const stopSpeechRecognitionUi = () => {
    if (speechVizIntervalRef.current) {
      clearInterval(speechVizIntervalRef.current);
      speechVizIntervalRef.current = null;
    }
    setAudioLevels(new Array(10).fill(2));
    setIsListening(false);
    usingSpeechRecognitionRef.current = false;
    speechRecognitionRef.current = null;
  };

  const startMediaRecorder = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Visualizer logic
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 32;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const update = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        const levels = [];
        for (let i = 0; i < 10; i++) {
          const val = dataArray[i] || 0;
          levels.push(Math.max(2, (val / 255) * 40));
        }
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(update);
      };
      update();

      // Recorder logic
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(",")[1];
          void runAiAnalysis({ audioBase64: base64 });
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsListening(true);
    } catch (e) {
      console.error("Recording error:", e);
      toast.error("마이크를 시작할 수 없습니다. 권한 설정을 확인해 주세요.");
    }
  };

  const startRecording = async () => {
    usingSpeechRecognitionRef.current = false;
    if (startBrowserSpeechRecognition()) {
      toast.message("말씀해 주세요. 끝나면 마이크를 다시 눌러 주세요. (Chrome·Edge 권장)");
      return;
    }
    toast.message("이 브라우저는 음성→글자 변환을 지원하지 않아 녹음 파일로 시도합니다. 실패 시 크롬으로 시도하거나 텍스트를 입력해 주세요.");
    await startMediaRecorder();
  };

  const stopRecording = () => {
    if (usingSpeechRecognitionRef.current && speechRecognitionRef.current) {
      try {
        speechRecognitionRef.current.stop();
      } catch {
        /* onend still runs */
      }
      return;
    }

    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevels(new Array(10).fill(2));
    setIsListening(false);
  };

  const toggleListening = () => {
    if (isListening) {
      stopRecording();
    } else {
      void startRecording();
      setActiveTab("smart");
    }
  };

  const loadImageFromFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 붙여넣을 수 있어요.");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
      setActiveTab("image");
    };
    reader.readAsDataURL(file);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadImageFromFile(file);
    e.target.value = "";
  };

  /** 웹·캡처 등 클립보드 이미지 붙여넣기 (이미지 탭일 때만) */
  useEffect(() => {
    if (!isOpen || activeTab !== "image" || aiReviewDraft) return;

    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items?.length) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === "file" && item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            loadImageFromFile(file);
            toast.success("이미지를 붙여넣었습니다.");
          }
          return;
        }
      }
    };

    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [isOpen, activeTab, aiReviewDraft, loadImageFromFile]);

  const runAiAnalysis = async (opts?: { audioBase64?: string; textOverride?: string }) => {
    setIsProcessing(true);
    setProgress(10);

    try {
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 10 : prev));
      }, 500);

      const textForSmart = (opts?.textOverride ?? textInput).trim();

      let result: Awaited<ReturnType<typeof parseOrderWithAi>> | undefined;

      if (opts?.audioBase64) {
        try {
          result = await parseOrderWithAi({ audio: opts.audioBase64, mimeType: "audio/webm" });
        } catch (audioErr) {
          if (textForSmart) {
            result = await parseOrderWithAi({ text: textForSmart });
          } else {
            throw audioErr;
          }
        }
      } else if (activeTab === "smart") {
        if (!textForSmart) {
          clearInterval(interval);
          toast.error("내용을 입력하거나 음성으로 말씀해 주세요.");
          return;
        }
        result = await parseOrderWithAi({ text: textForSmart });
      } else if (activeTab === "image" && imagePreview) {
        const base64 = imagePreview.split(",")[1];
        const mimeType = imagePreview.split(";")[0].split(":")[1];
        result = await parseOrderWithAi({ image: base64, mimeType });
      }

      clearInterval(interval);
      setProgress(100);
      if (result) {
        setAiReviewDraft(cloneAiDraftForReview(result));
        toast.success("AI 분석이 완료되었습니다. 내용을 확인·수정한 뒤 적용해 주세요.");
      }
    } catch (error: unknown) {
      const msg =
        error instanceof Error
          ? error.message
          : "분석에 실패했습니다. 텍스트로 입력하거나 Chrome에서 다시 시도해 주세요.";
      toast.error(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!aiReviewDraft) return;
    onApply(aiReviewDraft);
    setIsOpen(false);
    setAiReviewDraft(null);
    setTextInput("");
    setImagePreview(null);
    toast.success("주문 정보가 자동 입력되었습니다.");
  };

  return (
    <div className="relative z-20 shrink-0">
      {/* Trigger Button */}
      <Button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative overflow-hidden group bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-2xl h-14 px-6 shadow-lg shadow-indigo-200"
      >
        <motion.div 
          animate={{ scale: [1, 1.2, 1] }} 
          transition={{ repeat: Infinity, duration: 2 }}
          className="mr-2"
        >
          <Sparkles className="w-5 h-5" />
        </motion.div>
        <span className="font-bold text-base">AI 주문 마스터 시작하기</span>
        
        {/* Animated background glow */}
        <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
      </Button>

      {/* Main Panel — body 포털: 상위 transform/스택에 묶이지 않고 항상 뷰포트 기준 */}
      {portalReady &&
        createPortal(
          <AnimatePresence>
            {isOpen && (
              <>
                <motion.div
                  key="ai-order-backdrop"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="fixed inset-0 z-[130] bg-black/45 md:bg-black/35"
                  aria-hidden
                  onClick={() => setIsOpen(false)}
                />
                <motion.div
                  key="ai-order-panel"
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 16, scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className={cn(
                    "fixed z-[140] flex flex-col overflow-hidden border border-indigo-50 bg-white shadow-2xl",
                    "left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
                    "w-[min(36rem,calc(100vw-1rem))] md:w-[min(32rem,calc(100vw-2rem))]",
                    "max-h-[min(90dvh,860px)] rounded-2xl md:rounded-3xl",
                    "p-6 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]"
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
            {!aiReviewDraft ? (
              <div className="flex flex-col flex-1 min-h-0 gap-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-violet-500" />
                    AI에게 주문 알려주기
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Tabs — 좁은 폭에서도 아이콘·긴 문구가 한 줄에 겹치지 않도록 세로 스택 */}
                <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-xl">
                  {[
                    { id: "smart", icon: Sparkles, label: "음성/텍스트 통합 입력" },
                    { id: "image", icon: ImageIcon, label: "주문서 이미지/사진" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id as "smart" | "image")}
                      className={cn(
                        "flex min-h-[4.25rem] min-w-0 flex-col items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-center transition-all",
                        activeTab === tab.id
                          ? "bg-white text-violet-600 shadow-sm"
                          : "text-slate-500 hover:bg-white/60 hover:text-slate-700"
                      )}
                    >
                      <tab.icon className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="text-[11px] font-medium leading-snug break-keep sm:text-xs">
                        {tab.label}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Tab Contents */}
                <div className="flex flex-1 min-h-0 flex-col justify-center overflow-y-auto">
                  {isProcessing ? (
                    <div className="flex flex-col items-center justify-center space-y-4">
                      <motion.div 
                        animate={{ rotate: 360 }} 
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="w-16 h-16 rounded-full border-4 border-violet-100 border-t-violet-600 flex items-center justify-center"
                      >
                        <Sparkles className="w-8 h-8 text-violet-600" />
                      </motion.div>
                      <div className="w-full max-w-xs space-y-2">
                        <p className="text-center text-sm font-medium text-slate-600">AI 비서가 분석 중입니다...</p>
                        <Progress value={progress} className="h-1 bg-slate-100" />
                      </div>
                    </div>
                  ) : (
                    <>
                      {activeTab === "smart" && (
                        <div className="relative group space-y-2">
                          <div className="rounded-xl border border-violet-100 bg-violet-50/60 px-3 py-2.5 text-xs text-slate-600 leading-relaxed">
                            <p className="font-semibold text-violet-800 mb-1">마이크로 말할 때 예시</p>
                            <pre className="whitespace-pre-wrap font-sans text-[11px] sm:text-xs text-slate-700">
                              {VOICE_ORDER_SCRIPT_EXAMPLE}
                            </pre>
                          </div>
                          <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder={
                              isListening
                                ? "사장님의 말씀을 듣고 있습니다. 말씀이 끝나면 마이크를 다시 눌러 주세요!"
                                : "위 예시처럼 말씀해 주시거나, 카톡·문자 내용을 여기에 붙여 넣어 주세요."
                            }
                            className={`w-full h-40 p-5 bg-slate-50 rounded-2xl border-2 transition-all text-sm resize-none ${
                              isListening 
                                ? "border-violet-400 bg-violet-50/30 ring-4 ring-violet-100" 
                                : "border-transparent focus:border-violet-500 bg-slate-50"
                            }`}
                          />
                          
                          {/* Floating Mic Button & Visualizer */}
                          <div className="absolute bottom-4 right-4 flex items-center gap-4">
                            <AnimatePresence>
                              {isListening && (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="flex items-end gap-1 bg-violet-100/50 p-2 rounded-xl h-12"
                                >
                                  {audioLevels.map((level, i) => (
                                    <motion.div 
                                      key={i}
                                      animate={{ height: level }}
                                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                                      className="w-1.5 bg-violet-600 rounded-full"
                                    />
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                            
                            <div className="flex flex-col items-center gap-2">
                              {/* Mic Help Tooltip/Link */}
                              {!isListening && activeTab === "smart" && (
                                <button 
                                  onClick={() => toast.info("마이크가 안 되시나요? 다른 마이크를 쓰시거나 카톡 내용을 복사해서 붙여넣어 보세요!")}
                                  className="text-[10px] text-slate-400 hover:text-violet-500 transition-colors"
                                >
                                  마이크가 안 되시나요?
                                </button>
                              )}
                              <Button
                                onClick={toggleListening}
                                size="icon"
                                className={`w-12 h-12 rounded-full shadow-lg transition-all ${
                                  isListening 
                                    ? "bg-red-500 hover:bg-red-600 animate-pulse" 
                                    : "bg-violet-600 hover:bg-violet-700"
                                }`}
                              >
                                <Mic className="w-5 h-5 text-white" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "image" && (
                        <div className="flex flex-col items-center w-full gap-2">
                          {imagePreview ? (
                            <div className="relative w-full aspect-video rounded-xl overflow-hidden border">
                              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                              <button 
                                onClick={() => setImagePreview(null)}
                                className="absolute top-2 right-2 p-1 bg-black/50 text-white rounded-full"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full aspect-video border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                            >
                              <ImageIcon className="w-8 h-8 text-slate-400" />
                              <span className="text-sm font-medium text-slate-500">주문서 캡처 사진 올리기</span>
                            </button>
                          )}
                          <p className="text-[11px] text-slate-500 text-center leading-relaxed px-1">
                            웹·카톡 등에서 이미지를 복사한 뒤, 이 탭을 연 상태에서{" "}
                            <kbd className="px-1 py-0.5 rounded bg-slate-100 border text-[10px]">Ctrl</kbd>
                            {" + "}
                            <kbd className="px-1 py-0.5 rounded bg-slate-100 border text-[10px]">V</kbd>
                            {" "}(Mac: ⌘V)로 붙여넣을 수 있어요.
                          </p>
                          <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleImageUpload} 
                            accept="image/*" 
                            className="hidden" 
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>

                {!isProcessing && (
                  <Button 
                    disabled={!textInput && !imagePreview}
                    onClick={() => void runAiAnalysis()}
                    className="w-full h-12 shrink-0 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold"
                  >
                    AI 비서에게 건네주기 <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex flex-col gap-3 flex-1 min-h-0 md:max-h-[min(78vh,580px)]">
                <div className="flex items-start justify-between gap-2 border-b pb-3 shrink-0">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 text-violet-600">
                      <Check className="w-5 h-5 shrink-0" />
                      AI가 분석한 주문 내용
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      아래에서 바로 수정한 뒤「이대로 입력하기」를 눌러 주세요.
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setAiReviewDraft(null)} className="shrink-0">
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1">
                  <div className="bg-violet-50/50 p-4 rounded-2xl border border-violet-100 space-y-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">주문자 이름</Label>
                        <Input
                          value={String((aiReviewDraft.orderer as Record<string, string> | undefined)?.name ?? "")}
                          onChange={(e) =>
                            setAiReviewDraft((prev) => {
                              if (!prev) return prev;
                              const o = { ...((prev.orderer as Record<string, string>) || {}) };
                              return { ...prev, orderer: { ...o, name: e.target.value } };
                            })
                          }
                          placeholder="미입력"
                          className="bg-white"
                        />
                        <Label className="text-xs text-slate-500">주문자 연락처</Label>
                        <Input
                          value={String((aiReviewDraft.orderer as Record<string, string> | undefined)?.contact ?? "")}
                          onChange={(e) =>
                            setAiReviewDraft((prev) => {
                              if (!prev) return prev;
                              const o = { ...((prev.orderer as Record<string, string>) || {}) };
                              return { ...prev, orderer: { ...o, contact: e.target.value } };
                            })
                          }
                          className="bg-white"
                        />
                        <Label className="text-xs text-slate-500">주문자 회사(선택)</Label>
                        <Input
                          value={String((aiReviewDraft.orderer as Record<string, string> | undefined)?.company ?? "")}
                          onChange={(e) =>
                            setAiReviewDraft((prev) => {
                              if (!prev) return prev;
                              const o = { ...((prev.orderer as Record<string, string>) || {}) };
                              return { ...prev, orderer: { ...o, company: e.target.value } };
                            })
                          }
                          className="bg-white"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-slate-500">수령인 이름</Label>
                        <Input
                          value={String((aiReviewDraft.recipient as Record<string, string> | undefined)?.name ?? "")}
                          onChange={(e) =>
                            setAiReviewDraft((prev) => {
                              if (!prev) return prev;
                              const r = { ...((prev.recipient as Record<string, string>) || {}) };
                              return { ...prev, recipient: { ...r, name: e.target.value } };
                            })
                          }
                          className="bg-white"
                        />
                        <Label className="text-xs text-slate-500">수령인 연락처</Label>
                        <Input
                          value={String((aiReviewDraft.recipient as Record<string, string> | undefined)?.contact ?? "")}
                          onChange={(e) =>
                            setAiReviewDraft((prev) => {
                              if (!prev) return prev;
                              const r = { ...((prev.recipient as Record<string, string>) || {}) };
                              return { ...prev, recipient: { ...r, contact: e.target.value } };
                            })
                          }
                          className="bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-violet-100">
                      <Label className="text-xs text-slate-500">배송·픽업 유형</Label>
                      <select
                        className="h-8 w-full rounded-lg border border-input bg-white px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                        value={String((aiReviewDraft.delivery as Record<string, string> | undefined)?.type ?? "delivery_reservation")}
                        onChange={(e) =>
                          setAiReviewDraft((prev) => {
                            if (!prev) return prev;
                            const del = { ...((prev.delivery as Record<string, string>) || {}) };
                            return { ...prev, delivery: { ...del, type: e.target.value } };
                          })
                        }
                      >
                        {DELIVERY_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-slate-500">날짜 (YYYY-MM-DD)</Label>
                          <Input
                            value={String((aiReviewDraft.delivery as Record<string, string> | undefined)?.date ?? "")}
                            onChange={(e) =>
                              setAiReviewDraft((prev) => {
                                if (!prev) return prev;
                                const del = { ...((prev.delivery as Record<string, string>) || {}) };
                                return { ...prev, delivery: { ...del, date: e.target.value } };
                              })
                            }
                            placeholder="2026-04-18"
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">시간 (HH:mm)</Label>
                          <Input
                            value={String((aiReviewDraft.delivery as Record<string, string> | undefined)?.time ?? "")}
                            onChange={(e) =>
                              setAiReviewDraft((prev) => {
                                if (!prev) return prev;
                                const del = { ...((prev.delivery as Record<string, string>) || {}) };
                                return { ...prev, delivery: { ...del, time: e.target.value } };
                              })
                            }
                            placeholder="15:00"
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-violet-100">
                      <Label className="text-xs text-slate-500">상품 (첫 줄)</Label>
                      <Input
                        value={String((aiReviewDraft.items as Array<Record<string, unknown>>)?.[0]?.name ?? "")}
                        onChange={(e) =>
                          setAiReviewDraft((prev) => {
                            if (!prev) return prev;
                            const items = [...((prev.items as Array<Record<string, unknown>>) || [{ name: "", price: 0, quantity: 1 }])];
                            items[0] = { ...items[0], name: e.target.value };
                            return { ...prev, items };
                          })
                        }
                        className="bg-white"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-slate-500">가격 (원)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={Number((aiReviewDraft.items as Array<Record<string, unknown>>)?.[0]?.price) || 0}
                            onChange={(e) =>
                              setAiReviewDraft((prev) => {
                                if (!prev) return prev;
                                const items = [...((prev.items as Array<Record<string, unknown>>) || [{ name: "", price: 0, quantity: 1 }])];
                                items[0] = { ...items[0], price: Number(e.target.value) || 0 };
                                return { ...prev, items };
                              })
                            }
                            className="bg-white"
                          />
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500">수량</Label>
                          <Input
                            type="number"
                            min={1}
                            value={Number((aiReviewDraft.items as Array<Record<string, unknown>>)?.[0]?.quantity) || 1}
                            onChange={(e) =>
                              setAiReviewDraft((prev) => {
                                if (!prev) return prev;
                                const items = [...((prev.items as Array<Record<string, unknown>>) || [{ name: "", price: 0, quantity: 1 }])];
                                items[0] = { ...items[0], quantity: Math.max(1, Number(e.target.value) || 1) };
                                return { ...prev, items };
                              })
                            }
                            className="bg-white"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-violet-100">
                      <Label className="text-xs text-slate-500">주소</Label>
                      <Input
                        value={String((aiReviewDraft.recipient as Record<string, string> | undefined)?.address ?? "")}
                        onChange={(e) =>
                          setAiReviewDraft((prev) => {
                            if (!prev) return prev;
                            const r = { ...((prev.recipient as Record<string, string>) || {}) };
                            return { ...prev, recipient: { ...r, address: e.target.value } };
                          })
                        }
                        className="bg-white"
                      />
                      <Label className="text-xs text-slate-500">상세 주소</Label>
                      <Input
                        value={String((aiReviewDraft.recipient as Record<string, string> | undefined)?.detailAddress ?? "")}
                        onChange={(e) =>
                          setAiReviewDraft((prev) => {
                            if (!prev) return prev;
                            const r = { ...((prev.recipient as Record<string, string>) || {}) };
                            return { ...prev, recipient: { ...r, detailAddress: e.target.value } };
                          })
                        }
                        className="bg-white"
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-violet-100">
                      <Label className="text-xs text-slate-500">리본·카드 문구</Label>
                      <Textarea
                        value={String((aiReviewDraft.message as Record<string, string> | undefined)?.content ?? "")}
                        onChange={(e) =>
                          setAiReviewDraft((prev) => {
                            if (!prev) return prev;
                            const m = { ...((prev.message as Record<string, string>) || {}) };
                            return { ...prev, message: { ...m, content: e.target.value } };
                          })
                        }
                        rows={3}
                        className="bg-white text-sm min-h-[72px]"
                        placeholder="리본·카드에 넣을 문구"
                      />
                    </div>

                    <div className="space-y-2 pt-2 border-t border-violet-100">
                      <Label className="text-xs text-slate-500">특이사항·메모</Label>
                      <Textarea
                        value={String(aiReviewDraft.memo ?? "")}
                        onChange={(e) => setAiReviewDraft((prev) => (prev ? { ...prev, memo: e.target.value } : prev))}
                        rows={2}
                        className="bg-white text-sm min-h-[56px]"
                        placeholder="배송 요청 등"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0 pt-1">
                  <Button
                    variant="outline"
                    onClick={() => setAiReviewDraft(null)}
                    className="flex-1 rounded-xl h-12"
                  >
                    다시 하기
                  </Button>
                  <Button
                    onClick={handleApply}
                    className="flex-[1.4] rounded-xl h-12 bg-violet-600 hover:bg-violet-700 text-white font-bold px-6"
                  >
                    이대로 입력하기 <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body
        )}
    </div>
  );
}
