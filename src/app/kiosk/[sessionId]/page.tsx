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
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export default function KioskPage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const L = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);

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
      toast.error(
        L(
          "주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.",
          "Address search is still loading. Please try again shortly.",
          "Dịch vụ tìm địa chỉ đang tải. Vui lòng thử lại sau.",
        ),
      );
    }
  };

  const handleSubmit = async () => {
    if (!customerName && !isAnonymous) {
      toast.error(
        L(
          "이름을 입력해주시거나 익명으로 진행해주세요.",
          "Please enter your name or continue anonymously.",
          "Vui lòng nhập tên hoặc tiếp tục ẩn danh.",
        ),
      );
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
      toast.error(
        L(
          "직원 앱과 연결이 원활하지 않습니다. 직원에게 문의해주세요.",
          "Could not reach the staff app. Please ask a team member.",
          "Không kết nối được ứng dụng nhân viên. Vui lòng hỏi nhân viên.",
        ),
      );
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
            <CardTitle className="text-2xl">
              {L("입력이 완료되었습니다", "Submission complete", "Đã hoàn tất nhập liệu")}
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {L(
                "감사합니다. 화면을 직원에게 다시 전달해주세요.",
                "Thank you. Please hand the screen back to a staff member.",
                "Cảm ơn bạn. Vui lòng trả màn hình cho nhân viên.",
              )}
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
              <Loader2 className="w-3 h-3 animate-spin" />{" "}
              {L("직원 기기와 연결 중...", "Connecting to staff device...", "Đang kết nối thiết bị nhân viên...")}
            </div>
          )}
          <CardTitle className="text-2xl font-bold">
            {L("주문 정보 입력", "Order details", "Nhập thông tin đơn hàng")}
          </CardTitle>
          <CardDescription className="text-base">
            {L(
              "예쁜 상품을 준비하기 위해 구매자/수령자 정보를 입력해주세요.",
              "Please enter buyer and recipient details so we can prepare your order.",
              "Vui lòng nhập thông tin người mua và người nhận để chuẩn bị đơn hàng.",
            )}
          </CardDescription>
        </CardHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 scrollbar-hide">
          
          {/* 0. Existing Customer Points Banner (only if store uses points) */}
          {existingName && pointRate > 0 && (
            <section className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <span className="font-semibold text-emerald-800">
                    {existingName}
                    {L("님의 포인트", "'s points", " — điểm thưởng")}
                  </span>
                </div>
                <span className="text-2xl font-bold text-emerald-700">{existingPoints.toLocaleString()}<span className="text-sm font-normal ml-0.5">P</span></span>
              </div>
              {minPointUsage > 0 && existingPoints >= minPointUsage ? (
                <div className="bg-white/70 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <p className="text-xs text-emerald-800 font-medium">
                    {L(
                      `보유 포인트가 ${minPointUsage.toLocaleString()}P 이상이므로 현금처럼 사용 가능합니다! 직원에게 말씀해주세요.`,
                      `You have at least ${minPointUsage.toLocaleString()}P and can spend them like cash—please tell staff.`,
                      `Bạn có ít nhất ${minPointUsage.toLocaleString()}P và có thể dùng như tiền mặt—báo nhân viên nhé.`,
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-emerald-600">
                  {minPointUsage > 0
                    ? L(
                        `${minPointUsage.toLocaleString()}P 이상 적립 시 현금과 동일하게 사용하실 수 있습니다.`,
                        `Earn at least ${minPointUsage.toLocaleString()}P to use points like cash.`,
                        `Tích ít nhất ${minPointUsage.toLocaleString()}P để dùng như tiền mặt.`,
                      )
                    : ""}{" "}
                  {L(
                    `(매 구매 시 ${pointRate}% 적립)`,
                    `(${pointRate}% back on each purchase)`,
                    `(${pointRate}% mỗi lần mua)`,
                  )}
                </p>
              )}
            </section>
          )}

          {/* 1. Customer Info (Only show fully if not pre-filled existing customer) */}
          {!existingName && (
            <section className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                {L("구매자 정보", "Buyer details", "Thông tin người mua")}
              </h3>
              
              <div className="flex items-center space-x-2 bg-slate-100 p-3 rounded-md">
                <Checkbox 
                  id="anonymous" 
                  checked={isAnonymous} 
                  onCheckedChange={(c) => setIsAnonymous(c as boolean)} 
                />
                <label htmlFor="anonymous" className="text-sm font-medium leading-none cursor-pointer">
                  {L(
                    "개인정보를 입력하지 않고 익명으로 구매할게요",
                    "I’ll purchase anonymously without personal details",
                    "Tôi sẽ mua ẩn danh, không nhập thông tin cá nhân",
                  )}
                </label>
              </div>

              {!isAnonymous && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{L("이름 (필수)", "Name (required)", "Tên (bắt buộc)")}</Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={L("홍길동", "John Doe", "Nguyễn Văn A")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{L("연락처 (필수)", "Phone (required)", "SĐT (bắt buộc)")}</Label>
                    <Input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={L("010-0000-0000", "+1 234 567 8900", "0901 234 567")}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>{L("이메일 (선택)", "Email (optional)", "Email (tùy chọn)")}</Label>
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder={L("hong@example.com", "name@example.com", "ten@email.com")}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-start space-x-2 mt-2">
                    <Checkbox 
                      id="save-info" 
                      checked={saveCustomer} 
                      onCheckedChange={(c) => setSaveCustomer(c as boolean)} 
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="save-info" className="text-sm font-medium cursor-pointer">
                        {L(
                          "입력한 정보를 매장 고객 정보로 저장하는 데 동의합니다.",
                          "I agree to save this information as my store customer profile.",
                          "Tôi đồng ý lưu thông tin này làm hồ sơ khách tại cửa hàng.",
                        )}
                      </label>
                      <p className="text-xs text-slate-500">
                        {L(
                          "저장 시 다음 번 주문할 때 더욱 빠르게 진행할 수 있습니다.",
                          "Saved details make your next order faster.",
                          "Lưu lại giúp lần sau đặt nhanh hơn.",
                        )}
                      </p>
                      {pointRate > 0 && (
                        <div className="mt-1.5 flex items-start gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                          <span className="text-emerald-600 text-sm mt-0.5">🎁</span>
                          <p className="text-xs text-emerald-700 leading-relaxed">
                            {L(
                              `정보 등록 시 포인트 멤버로 자동 가입되며, 매 구매 금액의 ${pointRate}%가 포인트로 적립됩니다!`,
                              `Saving enrolls you in points—${pointRate}% of each purchase is credited as points!`,
                              `Lưu thông tin sẽ ghi danh điểm thưởng—${pointRate}% mỗi đơn được cộng điểm!`,
                            )}
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
            <h3 className="font-semibold text-lg border-b pb-2">
              {L("수령 방법", "Pickup / delivery", "Cách nhận hàng")}
            </h3>
            <RadioGroup value={receiptType} onValueChange={(val: any) => setReceiptType(val)} className="grid grid-cols-2 gap-4">
              <Label
                htmlFor="delivery"
                className={`flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 cursor-pointer [&:has([data-state=checked])]:border-emerald-600 [&:has([data-state=checked])]:bg-emerald-50`}
              >
                <RadioGroupItem value="delivery_reservation" id="delivery" className="sr-only" />
                <Truck className="mb-3 h-6 w-6 text-slate-700" />
                {L("배송", "Delivery", "Giao hàng")}
              </Label>
              <Label
                htmlFor="pickup"
                className={`flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 cursor-pointer [&:has([data-state=checked])]:border-emerald-600 [&:has([data-state=checked])]:bg-emerald-50`}
              >
                <RadioGroupItem value="store_pickup" id="pickup" className="sr-only" />
                <Store className="mb-3 h-6 w-6 text-slate-700" />
                {L("매장 픽업", "Store pickup", "Lấy tại cửa hàng")}
              </Label>
            </RadioGroup>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>{L("희망 날짜", "Preferred date", "Ngày mong muốn")}</Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>{L("희망 시간", "Preferred time", "Giờ mong muốn")}</Label>
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
                    <Label>{L("받는 분 성함", "Recipient name", "Tên người nhận")}</Label>
                    <Input
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={L("김철수", "Jane Doe", "Trần Thị B")}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{L("받는 분 연락처", "Recipient phone", "SĐT người nhận")}</Label>
                    <Input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder={L("010-0000-0000", "+1 234 567 8900", "0901 234 567")}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2 relative">
                    <Label>{L("배송지 주소", "Delivery address", "Địa chỉ giao hàng")}</Label>
                    <div className="flex gap-2">
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={L("주소 검색 버튼을 눌러주세요", "Tap search to find address", "Chạm tìm kiếm để nhập địa chỉ")}
                        readOnly
                        onClick={openAddressSearch}
                        className="cursor-pointer"
                      />
                      <Button variant="outline" type="button" className="shrink-0 gap-1 flex" onClick={openAddressSearch}>
                        <MapPin className="w-4 h-4" /> {L("주소 검색", "Address search", "Tìm địa chỉ")}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 3. Message Info */}
          <section className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">
              {L("메시지 (리본/카드)", "Message (ribbon / card)", "Lời nhắn (ruy băng / thiệp)")}
            </h3>
            <RadioGroup value={messageType} onValueChange={(val: any) => setMessageType(val)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="msg-none" />
                <Label htmlFor="msg-none">{L("없음", "None", "Không")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ribbon" id="msg-ribbon" />
                <Label htmlFor="msg-ribbon">{L("리본", "Ribbon", "Ruy băng")}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="msg-card" />
                <Label htmlFor="msg-card">{L("카드", "Card", "Thiệp")}</Label>
              </div>
            </RadioGroup>

            {messageType !== "none" && (
              <div className="space-y-4 pt-2">
                {messageType === "ribbon" && (
                  <div className="bg-amber-50 p-4 rounded-xl text-sm text-amber-800 border border-amber-100 flex flex-col gap-2">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <Label className="text-amber-900 font-bold">
                          {L("경조사어 (오른쪽 리본)", "Occasion text (right ribbon)", "Lời chúc (ruy băng phải)")}
                        </Label>
                        <Input
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder={L("축 발전", "e.g. Congratulations", "vd: Chúc mừng")}
                          className="bg-white"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-amber-900 font-bold">
                          {L("보내는 분 (왼쪽 리본)", "Sender (left ribbon)", "Người gửi (ruy băng trái)")}
                        </Label>
                        <Input
                          value={messageSender}
                          onChange={(e) => setMessageSender(e.target.value)}
                          placeholder={L("홍길동 올림", "From: Jane", "Từ: Nguyễn A")}
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {messageType === "card" && (
                  <div className="space-y-2">
                    <Label>{L("카드 내용", "Card message", "Nội dung thiệp")}</Label>
                    <Textarea
                      value={messageContent}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageContent(e.target.value)}
                      placeholder={L(
                        "카드에 적을 메시지를 자유롭게 작성해주세요",
                        "Write your card message here",
                        "Viết lời nhắn trên thiệp tại đây",
                      )}
                      className="resize-none h-24 bg-white"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 4. Price Summary */}
          <section className="bg-slate-50 rounded-xl border p-4 space-y-2">
            <h3 className="font-semibold text-lg border-b pb-2">
              {L("결제 내역", "Payment summary", "Thanh toán")}
            </h3>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">{L("상품 합계", "Subtotal", "Tạm tính")}</span>
              <span className="font-medium">
                {basePrice.toLocaleString()}
                {L("원", " KRW", " KRW")}
              </span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600">{L("예상 배송비", "Est. delivery fee", "Phí giao hàng dự kiến")}</span>
                <span className="font-medium">
                  {deliveryFee.toLocaleString()}
                  {L("원", " KRW", " KRW")}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-2 mt-1">
              <span className="font-bold text-emerald-800">{L("총 결제 금액", "Total", "Tổng cộng")}</span>
              <span className="font-bold text-xl text-emerald-600">
                {(basePrice + deliveryFee).toLocaleString()}
                {L("원", " KRW", " KRW")}
              </span>
            </div>
          </section>

        </div>

        {/* Footer - Compact fixed bottom */}
        <div className="shrink-0 border-t bg-white px-4 py-3 safe-area-pb">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="text-xs text-slate-500">{L("총 결제 금액", "Total", "Tổng cộng")}</p>
              <p className="text-xl font-bold text-emerald-700">
                {(basePrice + deliveryFee).toLocaleString()}
                {L("원", " KRW", " KRW")}
              </p>
            </div>
            <Button 
              className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleSubmit}
              disabled={!connected || loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                L("입력 완료 ✅", "Submit ✅", "Hoàn tất ✅")
              )}
            </Button>
          </div>
          {!connected && (
            <p className="text-xs text-amber-600 mt-1 text-center">
              {L(
                "인터넷 연결 상태를 확인해주세요.",
                "Please check your internet connection.",
                "Vui lòng kiểm tra kết nối mạng.",
              )}
            </p>
          )}
        </div>

      </Card>
    </div>
  );
}
