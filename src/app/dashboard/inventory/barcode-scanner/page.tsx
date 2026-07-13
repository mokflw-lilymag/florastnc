"use client";

import React, { useState, useEffect, useRef } from "react";
import { useMaterials } from "@/hooks/use-materials";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScanLine, Camera, Keyboard, CheckCircle2, AlertCircle } from "lucide-react";
import { Html5QrcodeScanner, Html5QrcodeScanType } from "html5-qrcode";
import { motion, AnimatePresence } from "framer-motion";
import { Smartphone, Wifi } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

export default function BarcodeScannerPage() {
  const { tenantId } = useAuth();
  const supabase = createClient();
  const { toast } = useToast();
  const { materials, updateMaterial } = useMaterials();
  const [barcodeInput, setBarcodeInput] = useState("");
  const [scanMode, setScanMode] = useState<"manual" | "camera">("manual");
  const [isMobileScannerLinked, setIsMobileScannerLinked] = useState(false);
  const [scannedLogs, setScannedLogs] = useState<any[]>([]);
  
  const barcodeInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (scanMode === "manual" && barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, [scanMode]);

  // Supabase Realtime Mobile Scanner Link
  useEffect(() => {
    if (!isMobileScannerLinked || !tenantId) return;

    const channelName = `scanner_sync_${tenantId}`;
    const channel = supabase
      .channel(channelName)
      .on("broadcast", { event: "material_barcode_scanned" }, (payload) => {
        if (payload.payload?.barcode) {
          toast({
            title: "모바일 스캐너 수신",
            description: "바코드가 성공적으로 수신되었습니다."
          });
          processBarcode(payload.payload.barcode);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isMobileScannerLinked, tenantId, supabase, materials]);



  useEffect(() => {
    if (scanMode === "camera") {
      scannerRef.current = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          supportedScanTypes: [Html5QrcodeScanType.SCAN_TYPE_CAMERA]
        },
        false
      );

      scannerRef.current.render(
        (decodedText) => {
          // 일시 정지(연속 스캔 방지)
          if (scannerRef.current) {
             scannerRef.current.pause();
             processBarcode(decodedText);
             // 1.5초 후 다시 재개
             setTimeout(() => {
               if (scannerRef.current && scannerRef.current.getState() === 2) {
                 scannerRef.current.resume();
               }
             }, 1500);
          }
        },
        (error) => {
          // 인식 실패 로그 무시
        }
      );
    } else {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
        scannerRef.current = null;
      }
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.error(e));
      }
    };
  }, [scanMode, materials]);

  const processBarcode = async (barcode: string) => {
    const trimmed = barcode.trim();
    
    // 입력창 즉시 초기화 및 포커스 유지 (연속 스캔, 에러 리턴 시 텍스트 찌꺼기 방지)
    setBarcodeInput("");
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }

    if (!trimmed) return;

    if (trimmed.length > 10) {
      toast({
        variant: "destructive",
        title: "스캔 에러",
        description: "10자 이내의 규격화된 바코드만 처리할 수 있습니다."
      });
      return;
    }

    const material = materials.find(m => m.id.toLowerCase() === trimmed.toLowerCase());
    
    if (!material) {
      setScannedLogs(prev => [{
        id: Date.now().toString(),
        barcode: trimmed,
        status: "error",
        message: "등록되지 않은 자재입니다.",
        timestamp: new Date()
      }, ...prev].slice(0, 5));
      return;
    }

    if (material.stock <= 0) {
      setScannedLogs(prev => [{
        id: Date.now().toString(),
        barcode: trimmed,
        materialName: material.name,
        status: "error",
        message: "현재고가 0이어서 차감할 수 없습니다.",
        timestamp: new Date()
      }, ...prev].slice(0, 5));
      return;
    }

    // Auto-Save: 즉각 차감 처리
    const oldStock = material.stock;
    const newStock = oldStock - 1;
    
    // UI 상 즉각 반응을 위한 낙관적 로그
    const logId = Date.now().toString();
    setScannedLogs(prev => [{
      id: logId,
      barcode: trimmed,
      materialName: material.name,
      oldStock,
      newStock,
      status: "success",
      timestamp: new Date()
    }, ...prev].slice(0, 5));

    try {
      await updateMaterial(material.id, { stock: newStock }, { worker: "[스캐너]", logMemo: "바코드 현장 차감" });
    } catch (err) {
      // 롤백 (실제 구현 시 Zustand에서 에러 핸들링 해주지만 여기서도 처리 가능)
      console.error(err);
      toast({
        variant: "destructive",
        title: "서버 오류",
        description: "차감 중 서버에 문제가 발생했습니다."
      });
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader 
        title="바코드 스캐너 (현장 맞춤형)" 
        description="카메라나 실물 스캐너로 바코드를 찍어 덩어리(Unit) 단위 재고를 즉시 1씩 차감합니다."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="h-[600px] flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5" />
              스캔 모드 선택
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              className={cn("h-8 text-xs px-2.5 transition-colors", isMobileScannerLinked ? "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200" : "text-slate-500 hover:bg-slate-100")}
              onClick={() => setIsMobileScannerLinked(!isMobileScannerLinked)}
            >
              {isMobileScannerLinked ? <Wifi className="w-3.5 h-3.5 mr-1.5" /> : <Smartphone className="w-3.5 h-3.5 mr-1.5" />}
              {isMobileScannerLinked ? "모바일 스캐너 연동 중" : "모바일 앱 연결"}
            </Button>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col">
            <Tabs value={scanMode} onValueChange={(v) => setScanMode(v as any)} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual" className="flex items-center gap-2">
                  <Keyboard className="h-4 w-4" /> 하드웨어 스캐너
                </TabsTrigger>
                <TabsTrigger value="camera" className="flex items-center gap-2">
                  <Camera className="h-4 w-4" /> 폰 카메라
                </TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="mt-4 flex-1">
                <form 
                  className="flex gap-2" 
                  onSubmit={(e) => {
                    e.preventDefault();
                    processBarcode(barcodeInput);
                  }}
                >
                  <Input
                    ref={barcodeInputRef}
                    placeholder="바코드를 쏘거나 입력하세요..."
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    className="flex-1 text-lg py-6"
                    autoFocus
                  />
                  <Button type="submit" className="py-6">
                    확인
                  </Button>
                </form>
                <Alert className="mt-6 bg-slate-50">
                  <ScanLine className="h-4 w-4 text-slate-500" />
                  <AlertDescription className="text-slate-600">
                    <p className="font-semibold mb-1">사용 방법:</p>
                    <ul className="list-disc pl-5 space-y-1">
                      <li>블루투스나 USB 바코드 스캐너를 연결하세요.</li>
                      <li>바코드에 커서를 두고 쏘면 즉시 1개씩 차감됩니다.</li>
                      <li>10자 이내의 대/중분류 규격 바코드만 허용됩니다.</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </TabsContent>

              <TabsContent value="camera" className="mt-4 flex-1 flex flex-col">
                <div id="reader" className="w-full h-full bg-slate-100 rounded-lg overflow-hidden border"></div>
                <Alert className="mt-4 bg-slate-50">
                  <Camera className="h-4 w-4 text-slate-500" />
                  <AlertDescription className="text-slate-600">
                    카메라를 허용하고 라벨지나 A4에 인쇄된 바코드를 비추세요.
                  </AlertDescription>
                </Alert>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card className="h-[600px] flex flex-col overflow-hidden">
          <CardHeader className="bg-slate-50 border-b">
            <CardTitle>최근 스캔 & 차감 로그</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            <AnimatePresence>
              {scannedLogs.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="flex flex-col items-center justify-center h-full text-slate-400 gap-3"
                >
                  <ScanLine className="h-12 w-12 opacity-50" />
                  <p>스캔 대기 중입니다...</p>
                </motion.div>
              ) : (
                scannedLogs.map((log) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.3 }}
                    className={`p-4 rounded-xl shadow-sm border ${
                      log.status === "success" 
                        ? "bg-white border-green-200" 
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    {log.status === "success" ? (
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">차감 성공</Badge>
                            <span className="font-semibold text-lg">{log.materialName}</span>
                          </div>
                          <p className="text-sm text-slate-500 font-mono">{log.barcode}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-bold text-slate-400 line-through decoration-red-400">{log.oldStock}</span>
                          <span className="text-2xl font-bold text-slate-300">➔</span>
                          <motion.span 
                            initial={{ scale: 1.5, color: "#22c55e" }}
                            animate={{ scale: 1, color: "#0f172a" }}
                            transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                            className="text-3xl font-black text-slate-900"
                          >
                            {log.newStock}
                          </motion.span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-3 items-center text-red-600">
                        <AlertCircle className="h-6 w-6 shrink-0" />
                        <div>
                          <p className="font-semibold">스캔 실패: {log.barcode}</p>
                          <p className="text-sm opacity-80">{log.message}</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
