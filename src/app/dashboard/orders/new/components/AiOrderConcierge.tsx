"use client";

import React, { useState, useRef, useEffect } from "react";
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
import { toast } from "sonner";
import { parseOrderWithAi } from "@/app/actions/ai/order-parser";

interface AiOrderConciergeProps {
  onApply: (data: any) => void;
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

  // Image State
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Result State
  const [aiResult, setAiResult] = useState<any>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
      if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);

  const startRecording = async () => {
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
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = (reader.result as string).split(',')[1];
          runAiAnalysis(base64);
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

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
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
      startRecording();
      setActiveTab("smart");
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
        setActiveTab("image");
      };
      reader.readAsDataURL(file);
    }
  };

  const runAiAnalysis = async (audioBase64?: string | any) => {
    setIsProcessing(true);
    setProgress(10);
    
    try {
      const interval = setInterval(() => {
        setProgress(prev => (prev < 90 ? prev + 10 : prev));
      }, 500);

      let result;
      // React Event 객체가 넘어오는 것을 방지하기 위해 typeof 체크 추가
      if (typeof audioBase64 === 'string' && audioBase64) {
        result = await parseOrderWithAi({ audio: audioBase64, mimeType: "audio/webm" });
      } else if (activeTab === "smart") {
        result = await parseOrderWithAi({ text: textInput });
      } else if (activeTab === "image" && imagePreview) {
        const base64 = imagePreview.split(',')[1];
        const mimeType = imagePreview.split(';')[0].split(':')[1];
        result = await parseOrderWithAi({ image: base64, mimeType });
      }

      clearInterval(interval);
      setProgress(100);
      setAiResult(result);
      toast.success("AI 분석이 완료되었습니다!");
    } catch (error) {
      toast.error("분석에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    onApply(aiResult);
    setIsOpen(false);
    setAiResult(null);
    setTextInput("");
    setImagePreview(null);
    toast.success("주문 정보가 자동 입력되었습니다.");
  };

  return (
    <div className="relative z-10">
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

      {/* Main Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute top-16 left-0 w-full md:w-[500px] bg-white rounded-3xl shadow-2xl border border-indigo-50 p-6 overflow-hidden"
          >
            {!aiResult ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <History className="w-4 h-4 text-violet-500" />
                    AI에게 주문 알려주기
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-100 rounded-xl">
                  {[
                    { id: "smart", icon: Sparkles, label: "음성/텍스트 통합 입력" },
                    { id: "image", icon: ImageIcon, label: "주문서 이미지/사진" }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                        activeTab === tab.id ? "bg-white text-violet-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      <tab.icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Tab Contents */}
                <div className="min-h-[200px] flex flex-col justify-center">
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
                        <div className="relative group">
                          <textarea
                            value={textInput}
                            onChange={(e) => setTextInput(e.target.value)}
                            placeholder={isListening ? "사장님의 말씀을 듣고 있습니다. 말씀이 끝나면 마이크를 다시 눌러주세요!" : "카톡 내용을 붙여넣거나 마이크를 눌러 말씀해 주세요..."}
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
                        <div className="flex flex-col items-center">
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
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full aspect-video border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                            >
                              <ImageIcon className="w-8 h-8 text-slate-400" />
                              <span className="text-sm font-medium text-slate-500">주문서 캡처 사진 올리기</span>
                            </button>
                          )}
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
                    onClick={runAiAnalysis}
                    className="w-full h-12 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold"
                  >
                    AI 비서에게 건네주기 <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b pb-4">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2 text-violet-600">
                    <Check className="w-5 h-5" />
                    AI가 분석한 주문 내용
                  </h3>
                  <Button variant="ghost" size="icon" onClick={() => setAiResult(null)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>

                <div className="bg-violet-50/50 p-4 rounded-2xl border border-violet-100 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-400 mb-1">주문자</p>
                      <p className="font-bold text-slate-800">{aiResult.orderer?.name || "미입력"}</p>
                      <p className="text-xs text-slate-500">{aiResult.orderer?.contact || ""}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 mb-1">수령인</p>
                      <p className="font-bold text-slate-800">{aiResult.recipient?.name || "미입력"}</p>
                      <p className="text-xs text-slate-500">{aiResult.recipient?.contact || ""}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-violet-100">
                    <p className="text-xs text-slate-400 mb-1">배송지</p>
                    <p className="text-sm font-medium text-slate-700">
                      {aiResult.recipient?.address} {aiResult.recipient?.detailAddress}
                    </p>
                  </div>
                  <div className="pt-2 border-t border-violet-100">
                    <p className="text-xs text-slate-400 mb-1">일시 및 상품</p>
                    <p className="text-sm font-bold text-violet-700">
                      {aiResult.delivery?.date} {aiResult.delivery?.time}
                    </p>
                    <p className="text-sm font-medium text-slate-800 mt-1">
                      {aiResult.items?.[0]?.name} {aiResult.items?.[0]?.price?.toLocaleString()}원
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setAiResult(null)}
                    className="flex-1 rounded-xl h-12"
                  >
                    다시 하기
                  </Button>
                  <Button 
                    onClick={handleApply}
                    className="flex-2 rounded-xl h-12 bg-violet-600 hover:bg-violet-700 text-white font-bold px-8"
                  >
                    이대로 입력하기 <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
