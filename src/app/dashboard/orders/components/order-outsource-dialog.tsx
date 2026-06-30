"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { usePartners } from "@/hooks/use-partners";
import { toast } from "sonner";
import { Order } from "@/types/order";
import { useExpenses } from "@/hooks/use-expenses";
import { createClient } from "@/utils/supabase/client";
import {
  Package,
  Calculator,
  Info,
  Check,
  ChevronsUpDown,
  Search,
  Loader2,
  MapPin,
  ShieldCheck,
  DollarSign,
  Copy,
  Download,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { usePartnerOrdersEnabled } from "@/components/providers/partner-orders-feature-provider";
import { toPng, toBlob } from "html-to-image";
import { format } from "date-fns";

interface OrderOutsourceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess?: () => void;
}

const SUPER_ADMIN_EMAILS = ["lilymag0301@gmail.com"];

export function OrderOutsourceDialog({
  isOpen,
  onOpenChange,
  order,
  onSuccess,
}: OrderOutsourceDialogProps) {
  const supabase = createClient();
  const { tenantId } = useAuth();
  const partnerOrdersEnabled = usePartnerOrdersEnabled();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const receiptRef = useRef<HTMLDivElement>(null);

  const [partnerId, setPartnerId] = useState("");
  const [partnerPrice, setPartnerPrice] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [autoCalc, setAutoCalc] = useState(true);
  const [hideCustomerInfo, setHideCustomerInfo] = useState(false);
  const [networkPartners, setNetworkPartners] = useState<any[]>([]);
  const [senderInfo, setSenderInfo] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [currentBranchName, setCurrentBranchName] = useState("");

  const { addExpense, updateExpenseByOrderId } = useExpenses();
  const { partners, loading: partnersLoading } = usePartners();

  // 현재 지점의 정확한 지점명 조회 (DB에 tenant_name이 누락된 과거 테스트 주문 대응)
  useEffect(() => {
    async function loadCurrentBranchName() {
      if (!isOpen || !order) return;
      if (order.tenant_name) {
        setCurrentBranchName(order.tenant_name);
        return;
      }
      try {
        const { data, error } = await supabase
          .from("tenants")
          .select("name")
          .eq("id", order.tenant_id)
          .maybeSingle();
        if (!error && data) {
          setCurrentBranchName(data.name);
        } else {
          setCurrentBranchName("본점");
        }
      } catch (err) {
        setCurrentBranchName("본점");
      }
    }
    loadCurrentBranchName();
  }, [isOpen, order, supabase]);

  useEffect(() => {
    async function fetchNetworkPartners() {
      if (!tenantId) return;
      const { data } = await supabase
        .from("tenants")
        .select("id, name, partner_region, partner_category, partner_description")
        .eq("can_receive_orders", true)
        .neq("id", tenantId);
      if (data) setNetworkPartners(data);
    }

    async function fetchSenderInfo() {
      if (!tenantId) return;
      const { data } = await supabase
        .from("tenants")
        .select("name, logo_url, contact_phone, address")
        .eq("id", tenantId)
        .maybeSingle();
      if (data) setSenderInfo(data);
    }

    if (tenantId) {
      fetchNetworkPartners();
      fetchSenderInfo();
    }
  }, [supabase, tenantId]);

  const allPartners = useMemo(() => {
    const local = partners.map((p) => ({ ...p, isNetwork: false }));
    const network = networkPartners.map((p) => ({ ...p, isNetwork: true }));
    return [...local, ...network];
  }, [partners, networkPartners]);

  const filteredPartners = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allPartners;

    return allPartners.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(term);
      const regionMatch = (p.partner_region || "").toLowerCase().includes(term);
      const categoryMatch = (p.partner_category || p.category || "").toLowerCase().includes(term);
      const descMatch = (p.partner_description || "").toLowerCase().includes(term);
      const typeMatch = (p.type || "").toLowerCase().includes(term);

      return nameMatch || regionMatch || categoryMatch || descMatch || typeMatch;
    });
  }, [allPartners, searchTerm]);

  const handlePartnerSelect = (partner: any) => {
    setPartnerId(partner.id);
    setOpenCombobox(false);
    setSearchTerm("");

    if (autoCalc && order?.summary?.total) {
      const fulfillerRate = 0.79; // 79% 수주처 분배 비율
      setPartnerPrice(Math.round(order.summary.total * fulfillerRate));
    }
  };

  const selectedPartner = useMemo(() =>
    allPartners.find((p) => p.id === partnerId),
    [allPartners, partnerId]);

  const orderTotal = order?.summary?.total || 0;
  const isEditMode = !!order?.outsource_info?.isOutsourced;

  useEffect(() => {
    if (isOpen && order) {
      if (order.outsource_info?.isOutsourced) {
        setPartnerId(order.outsource_info.partnerId);
        setPartnerPrice(order.outsource_info.partnerPrice);
        setNotes(order.outsource_info.notes || "");
        setHideCustomerInfo(order.outsource_info.hideCustomerInfo || false);
        setAutoCalc(false);
      } else {
        setPartnerId("");
        setPartnerPrice(0);
        setNotes("");
        setHideCustomerInfo(false);
        setAutoCalc(true);
      }
    }
  }, [isOpen, order]);

  // 79/19/2 수익 모델 시뮬레이션
  const platformFee = Math.round(orderTotal * 0.02);
  const senderProfit = orderTotal - partnerPrice - platformFee;
  const fulfillerAmount = partnerPrice;
  const profitMargin = orderTotal > 0 ? (senderProfit / orderTotal) * 100 : 0;

  // html-to-image 캡처 (클립보드로 복사)
  const handleCopyReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      // 투명 배경 버그 방지를 위해 복사할 때 하얀색 배경 강제 주입 옵션 지정
      const blob = await toBlob(receiptRef.current, {
        backgroundColor: "#ffffff",
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });

      if (!blob) throw new Error("이미지 캡처 실패");

      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);

      toast.success("인수증 이미지가 클립보드에 복사되었습니다! 카카오톡이나 문자 대화창에 바로 붙여넣기(Ctrl + V) 하실 수 있습니다.");
    } catch (err) {
      console.error("클립보드 이미지 복사 실패:", err);
      toast.error("클립보드 복사를 지원하지 않는 브라우저이거나 오류가 발생했습니다.");
    }
  };

  // html-to-image 다운로드 (저장)
  const handleDownloadReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      const dataUrl = await toPng(receiptRef.current, {
        backgroundColor: "#ffffff",
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
      });

      const link = document.createElement("a");
      link.download = `인수증_${order?.order_number || "발주"}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("인수증 이미지 파일이 저장되었습니다.");
    } catch (err) {
      console.error("인수증 이미지 저장 실패:", err);
      toast.error("인수증 이미지를 저장하는 중 오류가 발생했습니다.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!partnerOrdersEnabled) {
      toast.error(tf.f00585);
      return;
    }

    if (!order || !partnerId || partnerPrice <= 0) {
      toast.error(tf.f00725);
      return;
    }

    try {
      setIsSubmitting(true);

      let sharedOrderData = {
        ...order,
        sender_branding: {
          name: senderInfo?.name || "",
          logo_url: senderInfo?.logo_url || "",
          contact: senderInfo?.contact_phone || "",
          address: senderInfo?.address || "",
        },
      };

      if (hideCustomerInfo) {
        sharedOrderData = {
          ...sharedOrderData,
          orderer: { name: tf.f00141, contact: "010-0000-0000" },
        };
      }

      const isNetworkPartner = !!allPartners.find((p) => p.id === partnerId)?.isNetwork;

      if (isNetworkPartner) {
        // 네트워크 파트너인 경우 예치금 잔액 확인 및 차감
        const { data: walletData, error: walletError } = await supabase
          .from("wallets")
          .select("balance")
          .eq("tenant_id", tenantId)
          .single();

        const requiredAmount = partnerPrice + platformFee;

        if (walletError && walletError.code !== "PGRST116") throw walletError;

        if (!walletData || walletData.balance < requiredAmount) {
          toast.error(
            tf.f00803.replace(
              "{amount}",
              `₩${(requiredAmount - (walletData?.balance || 0)).toLocaleString()}`
            )
          );
          setIsSubmitting(false);
          return;
        }

        const { data: extOrder, error: extError } = await supabase
          .from("external_orders")
          .insert([
            {
              sender_tenant_id: tenantId,
              receiver_tenant_id: partnerId,
              origin_order_id: order.id,
              status: "pending",
              total_amount: orderTotal,
              fulfillment_amount: partnerPrice,
              sender_profit: senderProfit,
              platform_fee: platformFee,
              order_data: sharedOrderData,
              notes,
              hide_customer_info: hideCustomerInfo,
            },
          ])
          .select()
          .single();

        if (extError) throw extError;

        const { error: balanceError } = await supabase
          .from("wallets")
          .update({ balance: walletData.balance - requiredAmount })
          .eq("tenant_id", tenantId);

        if (balanceError) throw balanceError;

        await supabase.from("wallet_transactions").insert([
          {
            tenant_id: tenantId,
            amount: -requiredAmount,
            type: "order_outsource",
            status: "completed",
            reference_id: extOrder.id,
            metadata: { order_number: order.order_number, partner_name: selectedPartner?.name },
          },
        ]);
      }

      const outsource_info = {
        isOutsourced: true,
        partnerId: partnerId,
        partnerName: selectedPartner?.name || "",
        partnerPrice: partnerPrice,
        platformFee,
        senderProfit,
        hideCustomerInfo,
        isNetworkPartner,
        status: order.outsource_info?.status || "pending",
        notes,
        sender_branding: sharedOrderData.sender_branding,
        outsourcedAt: order.outsource_info?.outsourcedAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error: updateError } = await supabase
        .from("orders")
        .update({
          outsource_info,
          status: "processing",
        })
        .eq("id", order.id);

      if (updateError) throw updateError;

      // 간편 지출 내역 자동 연동 등록
      const itemsDescription = (order.items || []).map((item) => `${item.name}(${item.quantity})`).join(", ");

      const expenseData = {
        expense_date: order.order_date,
        amount: partnerPrice,
        category: "material",
        sub_category: "outsource",
        description: isEditMode
          ? `외부발주(수정): ${itemsDescription} ${order.orderer?.name || ""}`
          : `외부발주: ${itemsDescription} ${order.orderer?.name || ""}`,
        supplier: selectedPartner?.name || tf.f00225,
        related_order_id: order.id,
        payment_method: paymentMethod,
      };

      if (isEditMode) {
        const wasUpdated = await updateExpenseByOrderId(order.id, expenseData, "outsource");
        if (!wasUpdated) {
          await addExpense(expenseData);
        }
      } else {
        await addExpense(expenseData);
      }

      toast.success(isEditMode ? tf.f00479 : tf.f00481);
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("외부 발주 처리 오류:", error);
      toast.error(tf.f00480);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Package className="h-5 w-5" />
            {isEditMode ? tf.f00477 : tf.f00478}
          </DialogTitle>
          <DialogDescription className="text-slate-500">
            외부 도매 거래처 및 파트너 화원에 발주를 넣고 정산 손익을 기록합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
          {/* 왼쪽 발주 설정 폼 */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-slate-50 p-4 rounded-lg space-y-2 border">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500 font-light">{tf.f00594}:</span>
                <span className="font-mono text-xs">{order.order_number}</span>
              </div>
              <div className="flex justify-between text-sm font-medium">
                <span className="text-slate-500 font-light">{tf.f00059}:</span>
                <span className="font-semibold text-blue-600">₩{orderTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* 파트너 수주처 선택 */}
            <div className="space-y-2">
              <Label className="font-medium text-slate-700">{tf.f00492}</Label>
              <div className="relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOpenCombobox(!openCombobox)}
                  className="w-full justify-between bg-white text-left font-normal"
                  disabled={partnersLoading}
                >
                  {partnersLoading ? (
                    <div className="flex items-center">
                      <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      {tf.f00177}
                    </div>
                  ) : (
                    partnerId
                      ? partners.find((p) => p.id === partnerId)?.name
                      : tf.f00440
                  )}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>

                {openCombobox && (
                  <div className="absolute top-full left-0 w-full mt-1 z-50 rounded-md border bg-white shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex items-center border-b px-3 bg-slate-50">
                      <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-slate-400" />
                      <input
                        className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400"
                        placeholder={tf.f00724}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-[200px] overflow-y-auto p-1">
                      {filteredPartners.length === 0 && (
                        <div className="py-6 text-center text-sm text-slate-400">{tf.f00036}</div>
                      )}
                      {filteredPartners.map((partner) => (
                        <div
                          key={partner.id}
                          onClick={() => handlePartnerSelect(partner)}
                          className={cn(
                            "relative flex w-full cursor-pointer select-none items-center rounded px-2 py-2 text-sm transition-colors",
                            partnerId === partner.id ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50"
                          )}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 text-indigo-600",
                              partnerId === partner.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold">{partner.name}</span>
                              {partner.isNetwork ? (
                                <Badge variant="outline" className="text-[9px] bg-blue-50 text-blue-600 border-blue-200">
                                  {tf.f00140}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 border-slate-200">
                                  {tf.f00178}
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {partner.partner_region && (
                                <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                                  <MapPin className="h-2 w-2" /> {partner.partner_region}
                                </span>
                              )}
                              {(partner.partner_category || partner.category) && (
                                <span className="text-[10px] text-slate-400">· {partner.partner_category || partner.category}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 발주 단가 설정 */}
            <div className="space-y-2">
              <Label htmlFor="partnerPrice" className="font-medium text-slate-700">{tf.f00230}</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-light text-slate-400">₩</span>
                <Input
                  id="partnerPrice"
                  type="number"
                  className="pl-8 bg-white font-medium"
                  placeholder={tf.f00661}
                  value={partnerPrice || ""}
                  onChange={(e) => {
                    setPartnerPrice(Number(e.target.value));
                    setAutoCalc(false);
                  }}
                />
              </div>
              {selectedPartner && (
                <p className="text-[11px] text-slate-400 flex items-center gap-1 font-light">
                  <Info className="h-3 w-3" />
                  {tf.f00092}: ₩{Math.round(orderTotal * (1 - (selectedPartner.default_margin_percent || 20) / 100)).toLocaleString()}
                </p>
              )}
            </div>

            {/* 79/19/2 시뮬레이션 */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                <Calculator className="h-4 w-4" />
                {tf.f00098}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-white p-2 rounded border border-slate-100">
                  <p className="text-[9px] text-slate-500 mb-1">{tf.f00404}</p>
                  <p className="text-xs font-semibold text-slate-900">₩{fulfillerAmount.toLocaleString()}</p>
                </div>
                <div className="bg-blue-50/50 p-2 rounded border border-blue-100">
                  <p className="text-[9px] text-blue-600 mb-1">{tf.f00232}</p>
                  <p className="text-xs font-semibold text-blue-700">₩{senderProfit.toLocaleString()}</p>
                </div>
                <div className="bg-amber-50/50 p-2 rounded border border-amber-100">
                  <p className="text-[9px] text-amber-600 mb-1">{tf.f00392}</p>
                  <p className="text-xs font-semibold text-amber-700">₩{platformFee.toLocaleString()}</p>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 font-light text-center">
                {tf.f00233}: {profitMargin.toFixed(1)}%
              </p>
            </div>

            {/* 개인 정보 가리기 필터 */}
            <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="hide-info" className="font-medium text-slate-700 cursor-pointer flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" /> {tf.f00074}
                </Label>
                <Switch id="hide-info" checked={hideCustomerInfo} onCheckedChange={setHideCustomerInfo} />
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed font-light">
                {hideCustomerInfo ? tf.f00406 : tf.f00407}
              </p>
            </div>

            {/* 결제 방법 */}
            <div className="space-y-2">
              <Label className="font-medium text-slate-700">{tf.f00050}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={paymentMethod === "transfer" ? "default" : "outline"}
                  className="flex-1 h-9 text-xs"
                  onClick={() => setPaymentMethod("transfer")}
                >
                  {tf.f00056}
                </Button>
                <Button
                  type="button"
                  variant={paymentMethod === "cash" ? "default" : "outline"}
                  className="flex-1 h-9 text-xs"
                  onClick={() => setPaymentMethod("cash")}
                >
                  <DollarSign className="h-3.5 w-3.5 mr-1" /> {tf.f00770}
                </Button>
              </div>
            </div>

            {/* 전달사항 */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="font-medium text-slate-700">{tf.f00301}</Label>
              <Textarea
                id="notes"
                placeholder={tf.f00720}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="bg-white text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                {tf.f00702}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !partnerId || partnerPrice <= 0}
              >
                {isSubmitting ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{tf.f00677}</>
                ) : (
                  isEditMode ? tf.f00566 : tf.f00231
                )}
              </Button>
            </DialogFooter>
          </form>

          {/* 오른쪽 인수증 미리보기 카드 및 제어 버튼 */}
          <div className="space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-indigo-600" />
                  발주 인수증 미리보기
                </Label>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                    onClick={handleCopyReceipt}
                    title="인수증 이미지를 클립보드에 복사 (카톡에 바로 붙여넣기 가능)"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    이미지 복사 📋
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700"
                    onClick={handleDownloadReceipt}
                    title="인수증 이미지 파일로 다운로드"
                  >
                    <Download className="h-3.5 w-3.5 mr-1" />
                    저장 📥
                  </Button>
                </div>
              </div>

              {/* 실물 영수증 스타일의 캡처 대상 컨테이너 */}
              <div className="border rounded-xl shadow-inner bg-slate-100 p-3 max-h-[460px] overflow-y-auto">
                <div
                  ref={receiptRef}
                  id="outsource-receipt-card"
                  className="bg-white p-6 rounded-lg border shadow-sm space-y-4 text-slate-800 font-sans max-w-[360px] mx-auto text-xs leading-relaxed"
                >
                  {/* 헤더 */}
                  <div className="border-b-2 border-dashed border-slate-300 pb-3 text-center">
                    <h2 className="text-base font-extrabold tracking-widest text-slate-900">발 주 인 수 증</h2>
                    <p className="text-[9px] text-slate-400 mt-0.5">Floxync 다매장 연동 발주서</p>
                  </div>

                  {/* 지점 및 파트너 기본 정보 */}
                  <div className="space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-400">발주지점:</span>
                      <span className="font-semibold text-slate-900">{currentBranchName || "로딩 중..."}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">수주처(도매):</span>
                      <span className="font-semibold text-slate-900">{selectedPartner?.name || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">발주일시:</span>
                      <span className="font-mono text-slate-900">
                        {format(new Date(order.order_date || new Date()), "yyyy-MM-dd HH:mm")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">주문번호:</span>
                      <span className="font-mono text-slate-900">{order.order_number}</span>
                    </div>
                  </div>

                  {/* 수령지 배송 정보 */}
                  <div className="bg-slate-50 p-3 rounded-lg border space-y-1.5 text-[11px]">
                    <h3 className="font-bold text-slate-900 border-b pb-1 mb-1.5">📦 배송 및 수령 정보</h3>
                    <div className="flex justify-between">
                      <span className="text-slate-400">배송구분:</span>
                      <span className="font-semibold text-slate-900">
                        {order.receipt_type === "delivery_reservation" ? "배송예약" :
                         order.receipt_type === "pickup_reservation" ? "픽업예약" : "매장수령"}
                      </span>
                    </div>
                    {order.delivery_info?.deliveryDate && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">배송희망일:</span>
                        <span className="font-semibold text-indigo-700">
                          {order.delivery_info.deliveryDate} {order.delivery_info.deliveryTime || ""}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">수령인명:</span>
                      <span className="font-semibold text-slate-900">{order.delivery_info?.recipientName || "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">연락처:</span>
                      <span className="font-mono text-slate-900">{order.delivery_info?.recipientContact || "—"}</span>
                    </div>
                    <div className="flex flex-col mt-1">
                      <span className="text-slate-400">배송지 주소:</span>
                      <span className="font-medium text-slate-950 mt-0.5 bg-white p-1.5 rounded border leading-relaxed">
                        {order.delivery_info?.address || "—"}
                      </span>
                    </div>
                  </div>

                  {/* 발주 상품 내역 */}
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-slate-900 border-b pb-1 text-[11px]">🌸 발주 상품 내역</h3>
                    <Table className="border-none">
                      <TableBody>
                        {(order.items || []).map((item, idx) => (
                          <TableRow key={idx} className="border-b last:border-0 hover:bg-transparent">
                            <TableCell className="p-1 font-medium text-slate-800 text-[11px]">{item.name}</TableCell>
                            <TableCell className="p-1 text-right text-slate-900 font-mono text-[11px]">{item.quantity}개</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* 리본 리포트 (중요) */}
                  {((order.items || []).some(i => i.ribbonMessage) || order.memo) && (
                    <div className="border-2 border-slate-800 p-3 rounded bg-amber-50/50 space-y-2">
                      <h3 className="font-extrabold text-slate-950 text-center border-b border-slate-800 pb-1 text-[11px]">
                        🎀 리본 / 카드 메시지
                      </h3>
                      {(order.items || []).map((item, idx) => {
                        if (!item.ribbonMessage) return null;
                        return (
                          <div key={idx} className="space-y-1 text-[11px] border-b last:border-b-0 pb-1.5 last:pb-0">
                            {item.ribbonMessage.ribbonLeft && (
                              <div>
                                <span className="text-slate-400 text-[9px] block">경조사어 (우측 리본):</span>
                                <span className="font-bold text-slate-900">{item.ribbonMessage.ribbonLeft}</span>
                              </div>
                            )}
                            {item.ribbonMessage.ribbonRight && (
                              <div className="mt-1">
                                <span className="text-slate-400 text-[9px] block">보내는 분 (좌측 리본):</span>
                                <span className="font-bold text-slate-900">{item.ribbonMessage.ribbonRight}</span>
                              </div>
                            )}
                            {item.ribbonMessage.cardMessage && (
                              <div className="mt-1 bg-white p-1.5 rounded border border-slate-200">
                                <span className="text-slate-400 text-[9px] block">카드 메시지:</span>
                                <span className="font-medium text-slate-800 whitespace-pre-wrap leading-relaxed">{item.ribbonMessage.cardMessage}</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {order.memo && (
                        <div className="text-[11px] pt-1">
                          <span className="text-slate-400 text-[9px] block">주문 특이사항:</span>
                          <span className="text-slate-800 font-light italic">{order.memo}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 발주점 전달사항 (notes) */}
                  {notes.trim() && (
                    <div className="border-t pt-2.5">
                      <span className="text-slate-400 text-[9px] block">도매상 전달사항:</span>
                      <p className="text-[11px] font-medium text-indigo-800 whitespace-pre-wrap bg-indigo-50 p-2 rounded border border-indigo-100 leading-relaxed mt-0.5">
                        {notes}
                      </p>
                    </div>
                  )}

                  {/* 하단 꼬리말 */}
                  <div className="border-t border-dashed border-slate-300 pt-3 text-center text-[9px] text-slate-400">
                    <p>본 인수증의 캡처본을 거래처에 전송하여 발주를 완료하세요.</p>
                    <p className="mt-0.5 font-mono">Floxync © {new Date().getFullYear()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 border p-3 rounded-lg text-slate-600 text-xs leading-relaxed space-y-1">
              <p className="font-semibold text-slate-900 flex items-center gap-1">💡 도매상 전송 팁 (카카오톡)</p>
              <p className="font-light">1. **[이미지 복사]** 버튼을 클릭합니다.</p>
              <p className="font-light">2. 카카오톡 대화방에 들어가 메시지 창을 클릭합니다.</p>
              <p className="font-light">3. **Ctrl + V**를 누르면 인수증 그림이 즉시 톡방에 붙여넣기 되어 전송됩니다!</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
