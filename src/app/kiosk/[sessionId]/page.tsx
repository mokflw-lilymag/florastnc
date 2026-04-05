"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useKioskSession } from "@/hooks/use-kiosk-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import Textarea from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle2, MapPin, Truck, Store } from "lucide-react";

export default function KioskPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;

  // Pre-filled existing info if passed via URL
  const existingName = searchParams.get("name") || "";
  const existingPhone = searchParams.get("phone") || "";
  const basePrice = parseInt(searchParams.get("price") || "0", 10);
  const existingPoints = parseInt(searchParams.get("points") || "0", 10);
  const pointRate = parseFloat(searchParams.get("pointRate") || "0");
  const minPointUsage = parseInt(searchParams.get("minPoint") || "0", 10);

  const { connected, sendKioskSubmit } = useKioskSession(sessionId, false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [customerName, setCustomerName] = useState(existingName);
  const [customerPhone, setCustomerPhone] = useState(existingPhone);
  const [customerEmail, setCustomerEmail] = useState("");
  const [saveCustomer, setSaveCustomer] = useState(!existingName); // Default save for new
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [receiptType, setReceiptType] = useState<"delivery_reservation" | "store_pickup" | "pickup_reservation">("delivery_reservation");
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [time, setTime] = useState(() => {
    const now = new Date();
    const h = Math.max(7, Math.min(22, now.getHours()));
    const m = now.getMinutes() < 30 ? "00" : "30";
    return `${String(h).padStart(2, '0')}:${m}`;
  });
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [address, setAddress] = useState("");

  const [messageType, setMessageType] = useState<"none" | "card" | "ribbon">("none");
  const [messageContent, setMessageContent] = useState("");
  const [messageSender, setMessageSender] = useState("");

  // Simplified Delivery Fee mock
  const [deliveryFee, setDeliveryFee] = useState(receiptType === "delivery_reservation" ? 5000 : 0);

  useEffect(() => {
    setDeliveryFee(receiptType === "delivery_reservation" ? 5000 : 0);
  }, [receiptType]);

  // Load Daum Postcode script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const openAddressSearch = () => {
    if ((window as any).daum?.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          setAddress(data.address);
        }
      }).open();
    } else {
      toast.error("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
    }
  };

  const handleSubmit = async () => {
    if (!customerName && !isAnonymous) {
      toast.error("이름을 입력해주시거나 익명으로 진행해주세요.");
      return;
    }
    
    setLoading(true);
    const payload = {
      customerName: isAnonymous ? "익명고객" : customerName,
      customerPhone: isAnonymous ? "" : customerPhone,
      customerEmail: isAnonymous ? "" : customerEmail,
      saveCustomer: isAnonymous ? false : saveCustomer,
      receiptType,
      date,
      time,
      recipientName,
      recipientPhone,
      address,
      messageType,
      messageContent,
      messageSender
    };

    const res = await sendKioskSubmit(payload);
    setLoading(false);
    
    if (res !== null) {
      setSubmitted(true);
    } else {
      toast.error("직원 앱과 연결이 원활하지 않습니다. 직원에게 문의해주세요.");
    }
  };

  if (submitted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md text-center border-none shadow-xl">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl">입력이 완료되었습니다</CardTitle>
            <CardDescription className="text-lg mt-2">
              감사합니다. 화면을 직원에게 다시 전달해주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      <Card className="w-full max-w-2xl mx-auto shadow-none border-none flex flex-col flex-1 overflow-hidden rounded-none">
        
        {/* Connection Status Header */}
        <div className={`h-2 w-full rounded-t-xl shrink-0 ${connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
        
        <CardHeader className="text-center pb-2 shrink-0">
          {!connected && (
            <div className="text-xs text-amber-600 mb-2 flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> 직원 기기와 연결 중...
            </div>
          )}
          <CardTitle className="text-2xl font-bold">주문 정보 입력</CardTitle>
          <CardDescription className="text-base">
            예쁜 상품을 준비하기 위해 구매자/수령자 정보를 입력해주세요.
          </CardDescription>
        </CardHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 scrollbar-hide">
          
          {/* 0. Existing Customer Points Banner (only if store uses points) */}
          {existingName && pointRate > 0 && (
            <section className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <span className="font-semibold text-emerald-800">{existingName}님의 포인트</span>
                </div>
                <span className="text-2xl font-bold text-emerald-700">{existingPoints.toLocaleString()}<span className="text-sm font-normal ml-0.5">P</span></span>
              </div>
              {minPointUsage > 0 && existingPoints >= minPointUsage ? (
                <div className="bg-white/70 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <p className="text-xs text-emerald-800 font-medium">
                    보유 포인트가 <strong>{minPointUsage.toLocaleString()}P 이상</strong>이므로 <strong>현금처럼 사용 가능</strong>합니다! 직원에게 말씀해주세요.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-emerald-600">
                  {minPointUsage > 0 ? `${minPointUsage.toLocaleString()}P 이상 적립 시 현금과 동일하게 사용하실 수 있습니다.` : ''} (매 구매 시 {pointRate}% 적립)
                </p>
              )}
            </section>
          )}

          {/* 1. Customer Info (Only show fully if not pre-filled existing customer) */}
          {!existingName && (
            <section className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">구매자 정보</h3>
              
              <div className="flex items-center space-x-2 bg-slate-100 p-3 rounded-md">
                <Checkbox 
                  id="anonymous" 
                  checked={isAnonymous} 
                  onCheckedChange={(c) => setIsAnonymous(c as boolean)} 
                />
                <label htmlFor="anonymous" className="text-sm font-medium leading-none cursor-pointer">
                  개인정보를 입력하지 않고 익명으로 구매할게요
                </label>
              </div>

              {!isAnonymous && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>이름 (필수)</Label>
                    <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="홍길동" />
                  </div>
                  <div className="space-y-2">
                    <Label>연락처 (필수)</Label>
                    <Input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="010-0000-0000" />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>이메일 (선택)</Label>
                    <Input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="example@email.com" />
                  </div>
                  <div className="sm:col-span-2 flex items-start space-x-2 mt-2">
                    <Checkbox 
                      id="save-info" 
                      checked={saveCustomer} 
                      onCheckedChange={(c) => setSaveCustomer(c as boolean)} 
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="save-info" className="text-sm font-medium cursor-pointer">
                        입력한 정보를 매장 고객 정보로 저장하는 데 동의합니다.
                      </label>
                      <p className="text-xs text-slate-500">
                        저장 시 다음 번 주문할 때 더욱 빠르게 진행할 수 있습니다.
                      </p>
                      {pointRate > 0 && (
                        <div className="mt-1.5 flex items-start gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                          <span className="text-emerald-600 text-sm mt-0.5">🎁</span>
                          <p className="text-xs text-emerald-700 leading-relaxed">
                            정보 등록 시 <strong>포인트 멤버</strong>로 자동 가입되며,<br/>
                            매 구매 금액의 <strong className="text-emerald-900">{pointRate}%가 포인트로 적립</strong>됩니다!
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 2. Receipt Info */}
          <section className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">수령 방법</h3>
            <RadioGroup value={receiptType} onValueChange={(val: any) => setReceiptType(val)} className="grid grid-cols-2 gap-4">
              <Label
                htmlFor="delivery"
                className={`flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 cursor-pointer [&:has([data-state=checked])]:border-emerald-600 [&:has([data-state=checked])]:bg-emerald-50`}
              >
                <RadioGroupItem value="delivery_reservation" id="delivery" className="sr-only" />
                <Truck className="mb-3 h-6 w-6 text-slate-700" />
                배송
              </Label>
              <Label
                htmlFor="pickup"
                className={`flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 cursor-pointer [&:has([data-state=checked])]:border-emerald-600 [&:has([data-state=checked])]:bg-emerald-50`}
              >
                <RadioGroupItem value="store_pickup" id="pickup" className="sr-only" />
                <Store className="mb-3 h-6 w-6 text-slate-700" />
                매장 픽업
              </Label>
            </RadioGroup>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>희망 날짜</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>희망 시간</Label>
                <select
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {Array.from({ length: 31 }, (_, i) => {
                    const hour = Math.floor(i / 2) + 7;
                    const min = i % 2 === 0 ? "00" : "30";
                    const val = `${String(hour).padStart(2, '0')}:${min}`;
                    return <option key={val} value={val}>{val}</option>;
                  })}
                </select>
              </div>
            </div>

            {receiptType === "delivery_reservation" && (
              <div className="bg-slate-50 p-4 rounded-xl border space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>받는 분 성함</Label>
                    <Input value={recipientName} onChange={e => setRecipientName(e.target.value)} placeholder="김철수" />
                  </div>
                  <div className="space-y-2">
                    <Label>받는 분 연락처</Label>
                    <Input type="tel" value={recipientPhone} onChange={e => setRecipientPhone(e.target.value)} placeholder="010-0000-0000" />
                  </div>
                  <div className="space-y-2 sm:col-span-2 relative">
                    <Label>배송지 주소</Label>
                    <div className="flex gap-2">
                      <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="주소 검색 버튼을 눌러주세요" readOnly onClick={openAddressSearch} className="cursor-pointer" />
                      <Button variant="outline" type="button" className="shrink-0 gap-1 flex" onClick={openAddressSearch}>
                        <MapPin className="w-4 h-4" /> 주소 검색
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 3. Message Info */}
          <section className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">메시지 (리본/카드)</h3>
            <RadioGroup value={messageType} onValueChange={(val: any) => setMessageType(val)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="msg-none" />
                <Label htmlFor="msg-none">없음</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ribbon" id="msg-ribbon" />
                <Label htmlFor="msg-ribbon">리본</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="msg-card" />
                <Label htmlFor="msg-card">카드</Label>
              </div>
            </RadioGroup>

            {messageType !== "none" && (
              <div className="space-y-4 pt-2">
                {messageType === "ribbon" && (
                  <div className="bg-amber-50 p-4 rounded-xl text-sm text-amber-800 border border-amber-100 flex flex-col gap-2">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <Label className="text-amber-900 font-bold">경조사어 (오른쪽 리본)</Label>
                        <Input value={messageContent} onChange={e => setMessageContent(e.target.value)} placeholder="축 발전" className="bg-white" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-amber-900 font-bold">보내는 분 (왼쪽 리본)</Label>
                        <Input value={messageSender} onChange={e => setMessageSender(e.target.value)} placeholder="홍길동 올림" className="bg-white" />
                      </div>
                    </div>
                  </div>
                )}
                
                {messageType === "card" && (
                  <div className="space-y-2">
                    <Label>카드 내용</Label>
                    <Textarea 
                      value={messageContent} 
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageContent(e.target.value)} 
                      placeholder="카드에 적을 메시지를 자유롭게 작성해주세요" 
                      className="resize-none h-24 bg-white"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 4. Price Summary */}
          <section className="bg-slate-50 rounded-xl border p-4 space-y-2">
            <h3 className="font-semibold text-lg border-b pb-2">결제 내역</h3>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">상품 합계</span>
              <span className="font-medium">{basePrice.toLocaleString()}원</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600">예상 배송비</span>
                <span className="font-medium">{deliveryFee.toLocaleString()}원</span>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-2 mt-1">
              <span className="font-bold text-emerald-800">총 결제 금액</span>
              <span className="font-bold text-xl text-emerald-600">{(basePrice + deliveryFee).toLocaleString()}원</span>
            </div>
          </section>

        </div>

        {/* Footer - Compact fixed bottom */}
        <div className="shrink-0 border-t bg-white px-4 py-3 safe-area-pb">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="text-xs text-slate-500">총 결제 금액</p>
              <p className="text-xl font-bold text-emerald-700">{(basePrice + deliveryFee).toLocaleString()}원</p>
            </div>
            <Button 
              className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleSubmit}
              disabled={!connected || loading}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "입력 완료 ✅"}
            </Button>
          </div>
          {!connected && (
            <p className="text-xs text-amber-600 mt-1 text-center">인터넷 연결 상태를 확인해주세요.</p>
          )}
        </div>

      </Card>
    </div>
  );
}
