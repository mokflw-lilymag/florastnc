"use client";

import React, { useState, useEffect, Suspense } from "react";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea"; // [FIXED] Default import
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Loader2, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  X
} from "lucide-react";
import { toast } from "sonner";
import { useKioskSession } from "@/hooks/use-kiosk-session";
import { KioskPinEntry } from "@/components/kiosk/kiosk-pin-entry";
import { SearchParamsHandler } from "@/components/kiosk/search-params-handler";

export default function KioskPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [pinForForm, setPinForForm] = useState("");
  
  const [submitted, setSubmitted] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [saveCustomer, setSaveCustomer] = useState(true);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [receiptType, setReceiptType] = useState<"store_pickup" | "delivery_reservation">("store_pickup");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [address, setAddress] = useState("");
  const [messageType, setMessageType] = useState<"none" | "ribbon" | "card">("none");
  const [messageContent, setMessageContent] = useState("");
  const [messageSender, setMessageSender] = useState("");
  const [loading, setLoading] = useState(false);
  const [internalPrice, setInternalPrice] = useState(0);

  const { connected, sessionPrice, sendKioskSubmit } = useKioskSession(activeSessionId || "", false);

  useEffect(() => {
    // Daum Postcode Script Loading
    const script = document.createElement('script');
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const openAddressSearch = () => {
    if ((window as any).daum?.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          setAddress(data.address);
        }
      }).open();
    } else {
      toast.error("주소 검색 서비스를 불러오는 중입니다.");
    }
  };

  const handleSubmit = async () => {
    if (!customerName && !isAnonymous) {
      toast.error("성함을 입력해주시거나 익명으로 진행해주세요.");
      return;
    }
    setLoading(true);
    try {
      await sendKioskSubmit({
        customerName: isAnonymous ? "익명고객" : customerName,
        customerPhone: isAnonymous ? "" : customerPhone,
        customerEmail: isAnonymous ? "" : customerEmail,
        saveCustomer: isAnonymous ? false : saveCustomer,
        receiptType,
        date: date || new Date().toISOString().split('T')[0],
        time,
        recipientName,
        recipientPhone,
        address,
        messageType,
        messageContent,
        messageSender
      });
      setSubmitted(true);
      toast.success("전송되었습니다.");
    } catch (err) {
      toast.error("전송에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (!activeSessionId) {
    return (
      <div className="min-h-dvh bg-slate-50 flex flex-col items-center justify-center p-6">
        <KioskPinEntry onComplete={(pin) => {
          setPinForForm(pin);
          setActiveSessionId(pin);
          toast.success(`${pin}번 세션에 연결되었습니다.`);
        }} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md text-center border-none shadow-2xl animate-in fade-in zoom-in duration-500 rounded-3xl overflow-hidden">
          <CardHeader className="pt-10">
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-12 h-12 text-emerald-600" />
              </div>
            </div>
            <CardTitle className="text-3xl font-black text-slate-900 tracking-tight">전송 완료!</CardTitle>
            <CardDescription className="text-lg mt-4 text-slate-600 font-medium">
              주문 정보가 직원에게 전달되었습니다.<br/>잠시만 기다려주시면 안내해 드릴게요.
            </CardDescription>
          </CardHeader>
          <CardFooter className="pb-10 flex justify-center mt-6">
            <Button 
              variant="outline" 
              className="rounded-2xl px-10 h-14 font-black border-slate-200 hover:bg-slate-50 text-lg active:scale-95 transition-all"
              onClick={() => {
                setSubmitted(false);
                setPinForForm("");
                setActiveSessionId(null);
                setInternalPrice(0);
                setAddress("");
                setCustomerName("");
                setCustomerPhone("");
                setCustomerEmail("");
              }}
            >
              처음 화면으로
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const finalPrice = sessionPrice || internalPrice;

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col overflow-hidden">
      <Card className="w-full max-w-2xl mx-auto shadow-none border-none flex flex-col flex-1 overflow-hidden rounded-none bg-slate-50">
        
        <div className={`h-2 w-full shrink-0 transition-colors duration-500 ${connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
        
        <CardHeader className="text-center pb-4 shrink-0 bg-white border-b shadow-[0_1px_3px_rgba(0,0,0,0.05)] z-10">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-black text-slate-400 tracking-widest uppercase">PIN: {pinForForm}</div>
            <div className="flex items-center gap-1.5">
              <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
              <span className="text-[10px] font-black text-slate-500">{connected ? 'CONNECTED' : 'CONNECTING...'}</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-black text-slate-900 tracking-tighter">주문 정보 입력</CardTitle>
          <CardDescription className="text-sm font-bold text-slate-500 mt-1">태블릿을 통해 주문 정보를 전달합니다</CardDescription>
        </CardHeader>

        <div className="flex-1 overflow-y-auto px-6 py-10 space-y-12 scrollbar-hide bg-white">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs font-black">01</div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">주문자 정보</h2>
            </div>
            
            <div className="flex items-center gap-2 px-1">
              <Checkbox 
                id="isAnonymous" 
                checked={isAnonymous} 
                onCheckedChange={(checked) => setIsAnonymous(checked === true)}
                className="w-5 h-5 rounded-md border-2"
              />
              <Label htmlFor="isAnonymous" className="text-sm font-black text-slate-600 select-none">익명으로 작성하기</Label>
            </div>

            {!isAnonymous && (
              <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400 ml-1">이름</Label>
                  <Input 
                    placeholder="성함을 입력해주세요" 
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-lg font-bold"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400 ml-1">연락처</Label>
                  <Input 
                    placeholder="010-0000-0000" 
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 focus:bg-white transition-all text-lg font-bold"
                  />
                </div>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs font-black">02</div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">수령 방법</h2>
            </div>
            
            <RadioGroup 
              value={receiptType} 
              onValueChange={(v: any) => setReceiptType(v)}
              className="grid grid-cols-2 gap-4"
            >
              <Label
                htmlFor="store_pickup"
                className={`flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border-2 transition-all cursor-pointer h-36
                  ${receiptType === 'store_pickup' 
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-lg shadow-emerald-100' 
                    : 'border-slate-100 bg-white hover:border-slate-200'}`}
              >
                <RadioGroupItem value="store_pickup" id="store_pickup" className="sr-only" />
                <div className={`p-3 rounded-2xl ${receiptType === 'store_pickup' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <Truck className="w-6 h-6" />
                </div>
                <span className={`font-black text-lg ${receiptType === 'store_pickup' ? 'text-emerald-900' : 'text-slate-500'}`}>매장 수령</span>
              </Label>
              
              <Label
                htmlFor="delivery_reservation"
                className={`flex flex-col items-center justify-center gap-4 p-6 rounded-3xl border-2 transition-all cursor-pointer h-36
                  ${receiptType === 'delivery_reservation' 
                    ? 'border-emerald-600 bg-emerald-50/50 shadow-lg shadow-emerald-100' 
                    : 'border-slate-100 bg-white hover:border-slate-200'}`}
              >
                <RadioGroupItem value="delivery_reservation" id="delivery_reservation" className="sr-only" />
                <div className={`p-3 rounded-2xl ${receiptType === 'delivery_reservation' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                  <MapPin className="w-6 h-6" />
                </div>
                <span className={`font-black text-lg ${receiptType === 'delivery_reservation' ? 'text-emerald-900' : 'text-slate-500'}`}>배송 예약</span>
              </Label>
            </RadioGroup>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 ml-1">희망 날짜</Label>
                <Input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 text-lg font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black text-slate-400 ml-1">희망 시간</Label>
                <Input 
                  type="time" 
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 text-lg font-bold"
                />
              </div>
            </div>

            {receiptType === 'delivery_reservation' && (
              <div className="grid grid-cols-1 gap-5 p-6 bg-slate-50/50 rounded-3xl border-2 border-slate-50 animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400">받으시는 분 이름</Label>
                  <Input 
                    placeholder="수령인 성함" 
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    className="h-14 rounded-2xl border-white bg-white text-lg font-bold shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400">수령인 연락처</Label>
                  <Input 
                    placeholder="010-0000-0000" 
                    value={recipientPhone}
                    onChange={(e) => setRecipientPhone(e.target.value)}
                    className="h-14 rounded-2xl border-white bg-white text-lg font-bold shadow-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400">배송 주소</Label>
                  <div className="flex gap-2">
                    <Input 
                      placeholder="주소를 검색하거나 입력해주세요" 
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="h-14 rounded-2xl border-white bg-white flex-1 text-lg font-bold shadow-sm"
                    />
                    <Button 
                      type="button"
                      variant="outline"
                      onClick={openAddressSearch}
                      className="h-14 px-6 rounded-2xl font-black border-white shadow-sm bg-white"
                    >
                      검색
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs font-black">03</div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight">메시지 작성</h2>
            </div>
            
            <div className="p-1">
              <RadioGroup 
                value={messageType} 
                onValueChange={(v: any) => setMessageType(v)}
                className="flex flex-wrap gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="none" id="msg_none" className="w-5 h-5" />
                  <Label htmlFor="msg_none" className="text-sm font-black text-slate-600">안함</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="card" id="msg_card" className="w-5 h-5" />
                  <Label htmlFor="msg_card" className="text-sm font-black text-slate-600">메시지 카드</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="ribbon" id="msg_ribbon" className="w-5 h-5" />
                  <Label htmlFor="msg_ribbon" className="text-sm font-black text-slate-600">리본 문구</Label>
                </div>
              </RadioGroup>
            </div>

            {messageType !== 'none' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400 ml-1">메시지 내용</Label>
                  <Textarea 
                    placeholder="여기에 내용을 입력해주세요" 
                    value={messageContent}
                    onChange={(e) => setMessageContent(e.target.value)}
                    className="min-h-[140px] rounded-[2rem] border-slate-100 bg-slate-50/50 p-6 text-lg font-bold resize-none"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-black text-slate-400 ml-1">보내시는 분 (성함)</Label>
                  <Input 
                    placeholder="보내시는 분의 성함을 입력해주세요" 
                    value={messageSender}
                    onChange={(e) => setMessageSender(e.target.value)}
                    className="h-14 rounded-2xl border-slate-100 bg-slate-50/50 text-lg font-bold"
                  />
                </div>
              </div>
            )}
          </section>

          <section className="bg-emerald-950 rounded-[3rem] p-8 space-y-6 shadow-2xl shadow-emerald-900/40 border border-emerald-800/50">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-xl text-emerald-400 tracking-tighter uppercase font-sans">Payment Details</h3>
              <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest ${connected ? 'bg-emerald-500 text-white animate-pulse' : 'bg-slate-700 text-slate-400'}`}>
                {connected ? "SYNC ACTIVE" : "OFFLINE"}
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="font-bold text-emerald-100/60 text-lg">주문 상품 금액</span>
                <span className="font-black text-2xl text-emerald-50 tracking-tighter">{finalPrice.toLocaleString()}원</span>
              </div>
              <div className="flex justify-between items-center border-t border-emerald-800/50 pt-6 mt-4">
                <span className="font-black text-white text-2xl tracking-tighter">최종 결제 금액</span>
                <span className="font-black text-4xl text-emerald-400 tracking-tighter">{finalPrice.toLocaleString()}원</span>
              </div>
            </div>
          </section>

        </div>

        <div className="shrink-0 border-t bg-white px-8 py-8 safe-area-pb shadow-[0_-20px_40px_rgba(0,0,0,0.04)] z-30">
          <Button 
            className="w-full h-20 text-2xl font-black bg-emerald-600 hover:bg-emerald-700 rounded-[1.75rem] shadow-xl shadow-emerald-100 active:scale-[0.98] transition-all disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none" 
            onClick={handleSubmit}
            disabled={!connected || loading || finalPrice === 0}
          >
            {loading ? <Loader2 className="w-10 h-10 animate-spin" /> : "입력 완료하기"}
          </Button>
          {!connected && (
            <div className="text-[11px] text-amber-600 mt-4 text-center font-black bg-amber-50/50 py-3 rounded-2xl border border-amber-100 tracking-tight">
              ⚠️ 직원 대시보드에서 금액을 입력하면 작성 버튼이 활성화됩니다.
            </div>
          )}
        </div>
      </Card>

      <Suspense fallback={null}>
        <SearchParamsHandler onPriceFound={setInternalPrice} />
      </Suspense>
    </div>
  );
}
