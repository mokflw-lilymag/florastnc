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
import { useSuppliers } from "@/hooks/use-suppliers";
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
  const [senderInfo, setSenderInfo] = useState<any>(null);
  const [paymentMethod, setPaymentMethod] = useState<'transfer' | 'cash'>('transfer');
  const [currentBranchName, setCurrentBranchName] = useState("");
  const [isApp, setIsApp] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const checkApp = (
        window.navigator.userAgent.toLowerCase().includes("electron") ||
        window.navigator.userAgent.toLowerCase().includes("floxync-app") ||
        !!(window as any).isFloxyncApp
      );
      setIsApp(checkApp);
    }
  }, []);

  const { addExpense, updateExpenseByOrderId, deleteExpenseByOrderId } = useExpenses();
  const { suppliers, loading: partnersLoading } = useSuppliers();

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
      fetchSenderInfo();
    }
  }, [supabase, tenantId]);

  const allPartners = useMemo(() => {
    // 네트워크 파트너는 완전 배제하고, 오직 사장님이 직접 등록한 도매 거래처(suppliers)만 반환합니다.
    return (suppliers || []).map((p) => ({ ...p, isNetwork: false })).sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
  }, [suppliers]);

  const filteredPartners = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return allPartners;

    return allPartners.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(term);
      const regionMatch = (p.address || "").toLowerCase().includes(term);
      const categoryMatch = (p.supplier_type || "").toLowerCase().includes(term);
      const descMatch = (p.memo || "").toLowerCase().includes(term);

      return nameMatch || regionMatch || categoryMatch || descMatch;
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
  
/* 중복 상태 제거 및 기존 senderInfo 활용 */

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
  // 텍스트 형태로 정보를 깔끔하게 복사
  const handleCopyTextReceipt = async () => {
    if (!order) return;
    try {
      const recipientName = order.delivery_info?.recipientName || "—";
      const recipientContact = order.delivery_info?.recipientContact || "—";
      const senderName = hideCustomerInfo ? "비공개" : (order.orderer?.name || "—");
      const deliveryDate = `${order.delivery_info?.date || ""} ${order.delivery_info?.time || ""}`.trim() || "—";
      const address = order.delivery_info?.address || "—";
      
      const itemsListText = (order.items || [])
        .map((item) => `• ${item.name} x ${item.quantity}개`)
        .join("\n");
        
      let ribbonMessageText = "";
      const hasRibbon = (order.items || []).some(i => i.ribbonMessage);
      if (hasRibbon) {
        ribbonMessageText = "\n[🎀 리본/카드 메시지]\n" + (order.items || [])
          .map((item) => {
            if (!item.ribbonMessage) return "";
            const left = item.ribbonMessage.ribbonLeft ? `경조사어: ${item.ribbonMessage.ribbonLeft}` : "";
            const right = item.ribbonMessage.ribbonRight ? `보내는이: ${item.ribbonMessage.ribbonRight}` : "";
            const card = item.ribbonMessage.messageCard ? `카드내용: ${item.ribbonMessage.messageCard}` : "";
            return [left, right, card].filter(Boolean).join("\n");
          })
          .filter(Boolean)
          .join("\n---\n");
      }

      const copyText = `[인수증]
주문번호: #${order.order_number || "—"}

• 받는 분: ${recipientName}
• 연락처: ${recipientContact}
• 보내는 분: ${senderName}
• 배송희망일: ${deliveryDate}
• 배송지 주소: ${address}

[🌸 주문 상품 내역]
${itemsListText}
${ribbonMessageText ? "\n" + ribbonMessageText : ""}
----------------------------------
발행처: ${senderInfo?.name || currentBranchName || "발주 매장"}
Floxync Automate System`;

      await navigator.clipboard.writeText(copyText);
      toast.success("인수증 텍스트가 클립보드에 복사되었습니다! 카카오톡이나 문자 창에 바로 붙여넣기 하실 수 있습니다.");
    } catch (err) {
      console.error("텍스트 복사 실패:", err);
      toast.error("인수증 텍스트 복사 중 오류가 발생했습니다.");
    }
  };

  // 고화질 이미지 캡처 복사
  const handleCopyImageReceipt = async () => {
    if (!receiptRef.current) return;
    try {
      const blob = await toBlob(receiptRef.current, {
        backgroundColor: "#ffffff",
        style: {
          transform: "scale(1)",
          transformOrigin: "top left",
        },
        styleSheetsFilter: (sheet: any) => {
          try {
            const rules = sheet.cssRules;
            return true;
          } catch (e) {
            return false;
          }
        }
      } as any);

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

  // 외부발주 해제 (취소) 처리
  const handleCancelOutsource = async () => {
    if (!order) return;
    
    // 아직 지정된 외부발주 정보가 없는데 취소를 누른 경우 차단 안내
    if (!order.outsource_info?.isOutsourced) {
      toast.error("등록된 외부발주 내역이 없습니다.");
      return;
    }

    if (!window.confirm("외부발주 지정을 취소하시겠습니까? 등록된 지출 내역도 함께 삭제됩니다.")) return;
    
    setIsSubmitting(true);
    try {
      // 1. 주문 테이블의 outsource_info 를 null 로 해제하고 상태를 pending 으로 복원
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          outsource_info: null,
          status: "processing",
        })
        .eq("id", order.id);

      if (updateError) throw updateError;

      // 2. 연동되어 생성되었던 지출 내역을 자동 삭제
      await deleteExpenseByOrderId(order.id, "outsource");

      toast.success("외부발주가 성공적으로 해제되었으며, 연동된 지출 내역이 취소(삭제)되었습니다.");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("외부발주 취소 오류:", error);
      toast.error("외부발주 취소 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
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
          ? `외부발주(수정): ${itemsDescription} [${selectedPartner?.name || "도매처"}]`
          : `외부발주: ${itemsDescription} [${selectedPartner?.name || "도매처"}]`,
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
              <Label className="font-medium text-slate-700">외부발주처 선택 *</Label>
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
                      ? allPartners.find((p) => p.id === partnerId)?.name
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
                      {allPartners.length === 0 ? (
                        <div className="py-8 px-4 text-center text-xs text-rose-500 leading-relaxed font-semibold">
                          ⚠️ 등록된 외부발주처(거래처)가 없습니다.<br />
                          '거래처 관리' 메뉴에서 도매처를 먼저 등록해 주세요.
                        </div>
                      ) : filteredPartners.length === 0 ? (
                        <div className="py-6 text-center text-sm text-slate-400">{tf.f00036}</div>
                      ) : null}
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
                              <Badge variant="outline" className="text-[9px] bg-amber-50 text-amber-700 border-amber-200 font-bold px-1.5 py-0.5">
                                도매 거래처
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              {partner.address && (
                                <span className="text-[10px] text-blue-500 flex items-center gap-0.5 max-w-[150px] truncate">
                                  <MapPin className="h-2 w-2 shrink-0" /> {partner.address}
                                </span>
                              )}
                              {partner.supplier_type && (
                                <span className="text-[10px] text-slate-400">· {partner.supplier_type}</span>
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
                  {tf.f00092}: ₩{Math.round(orderTotal * (1 - ((selectedPartner as any).default_margin_percent || 20) / 100)).toLocaleString()}
                </p>
              )}
            </div>

            {/* 외부발주는 도매 단가 그대로 지출 등록 */}

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
              <Label htmlFor="notes" className="font-medium text-slate-700">비고 (외부발주처 전달 사항)</Label>
              <Textarea
                id="notes"
                placeholder={tf.f00720}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="bg-white text-xs"
              />
            </div>

            <DialogFooter className="pt-2 flex justify-between items-center w-full">
              <div>
                {isEditMode && (
                  <Button
                    type="button"
                    variant="outline"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700 bg-white"
                    onClick={handleCancelOutsource}
                    disabled={isSubmitting}
                  >
                    외부발주 취소
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
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
                    isEditMode ? "외부발주주문 수정" : "외부발주주문"
                  )}
                </Button>
              </div>
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
                <div className="flex gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                    onClick={handleCopyTextReceipt}
                    title="인수증 텍스트를 클립보드에 복사 (기사님 공유 시 강추)"
                  >
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    텍스트 복사 📋
                  </Button>
                  {isApp && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                      onClick={handleCopyImageReceipt}
                      title="인수증 이미지를 클립보드에 복사 (Ctrl + V 붙여넣기 가능)"
                    >
                      <FileText className="h-3.5 w-3.5 mr-1" />
                      이미지 복사 🖼️
                    </Button>
                  )}
                </div>
              </div>

              {/* 실물 영수증 스타일의 캡처 대상 컨테이너 (receipt-delivery-driver.html 동기화) */}
              <div className="border rounded-xl shadow-inner bg-slate-100 p-4 max-h-[480px] overflow-y-auto">
                <div
                  ref={receiptRef}
                  id="outsource-receipt-card"
                  className="bg-white p-6 border shadow-sm text-black font-extrabold max-w-[340px] mx-auto text-xs leading-relaxed select-none"
                  style={{ width: "72mm", boxSizing: "border-box", fontFamily: "sans-serif" }}
                >
                  {/* 헤더 로고/타이틀 */}
                  <div className="text-center pb-2 flex flex-col items-center justify-center gap-1">
                    {senderInfo?.logo_url && (
                      <img src={senderInfo.logo_url} alt="Logo" className="max-h-12 w-auto object-contain mb-1.5 select-none" />
                    )}
                    <h2 className="text-lg font-black tracking-wider text-black">인 수 증</h2>
                    <p className="text-[9px] text-black font-bold mt-0.5">
                      {format(new Date(order.order_date || new Date()), "yyyy-MM-dd HH:mm")}
                    </p>
                  </div>
                  
                  {/* 절단용 점선 */}
                  <div className="border-t border-dashed border-black my-2.5"></div>

                  {/* 수령인 성함 (초특대 28px 굵은 서체) */}
                  <div className="text-center text-[28px] font-black tracking-tight leading-tight my-4">
                    {order.delivery_info?.recipientName || "—"}
                  </div>
                  
                  {/* 수령인 연락처 (16px) */}
                  <div className="text-center text-base font-bold mb-3">
                    {order.delivery_info?.recipientContact || "—"}
                  </div>

                  {/* 절단용 점선 */}
                  <div className="border-t border-dashed border-black my-2.5"></div>

                  {/* 기본 배송 정보 */}
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="font-normal text-black">보내는 분:</span>
                      <span className="font-bold">{hideCustomerInfo ? "비공개" : (order.orderer?.name || "—")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-normal text-black">배송희망일:</span>
                      <span className="font-bold">
                        {order.delivery_info?.date || ""} {order.delivery_info?.time || ""}
                      </span>
                    </div>
                    <div className="flex flex-col mt-2">
                      <span className="font-normal text-black">배송지 주소:</span>
                      <span className="font-bold text-[14px] leading-relaxed mt-1 whitespace-pre-wrap border border-black p-2 bg-slate-50/50 rounded">
                        {order.delivery_info?.address || "—"}
                      </span>
                    </div>
                  </div>

                  {/* 절단용 점선 */}
                  <div className="border-t border-dashed border-black my-2.5"></div>

                  {/* 발주 상품 내역 */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-black uppercase tracking-wider block">🌸 주문 상품 내역</span>
                    <ul className="space-y-1">
                      {(order.items || []).map((item, idx) => (
                        <li key={idx} className="flex justify-between py-1 border-b border-dotted border-black/30 last:border-b-0">
                          <span className="font-bold">{item.name}</span>
                          <span className="font-bold font-mono">{item.quantity}개</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* 리본/카드 문구 */}
                  {((order.items || []).some(i => i.ribbonMessage) || order.memo) && (
                    <>
                      <div className="border-t border-dashed border-black my-2.5"></div>
                      <div className="border-2 border-black p-2.5 space-y-2">
                        <span className="text-[10px] font-bold block text-center border-b border-black pb-1">🎀 리본/카드 메시지</span>
                        {(order.items || []).map((item, idx) => {
                          if (!item.ribbonMessage) return null;
                          return (
                            <div key={idx} className="space-y-1 text-[11px] border-b border-black/20 last:border-b-0 pb-1.5 last:pb-0">
                              {item.ribbonMessage.ribbonLeft && (
                                <div>
                                  <span className="text-[9px] font-normal block text-black/60">경조사어 (우측 리본):</span>
                                  <span className="font-bold">{item.ribbonMessage.ribbonLeft}</span>
                                </div>
                              )}
                              {item.ribbonMessage.ribbonRight && (
                                <div className="mt-1">
                                  <span className="text-[9px] font-normal block text-black/60">보내는 분 (좌측 리본):</span>
                                  <span className="font-bold">{item.ribbonMessage.ribbonRight}</span>
                                </div>
                              )}
                              {item.ribbonMessage.cardMessage && (
                                <div className="mt-1 bg-slate-50 p-1.5 border border-black/30 rounded">
                                  <span className="text-[9px] font-normal block text-black/60">카드 메시지:</span>
                                  <span className="font-bold whitespace-pre-wrap leading-relaxed">{item.ribbonMessage.cardMessage}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {order.memo && (
                          <div className="text-[11px] pt-1">
                            <span className="text-[9px] font-normal block text-black/60">주문 특이사항:</span>
                            <span className="font-bold italic">{order.memo}</span>
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  {/* 도매상 전달사항 */}
                  {notes.trim() && (
                    <>
                      <div className="border-t border-dashed border-black my-2.5"></div>
                      <div className="bg-slate-50 p-2 border border-black rounded">
                        <span className="text-[9px] font-normal block text-black/60">도매상 전달사항:</span>
                        <p className="font-bold text-black whitespace-pre-wrap leading-relaxed mt-0.5">{notes}</p>
                      </div>
                    </>
                  )}

                  {/* 절단용 점선 */}
                  <div className="border-t border-dashed border-black my-2.5"></div>

                  {/* 하단 인수 확인 서명란 (이식완료) */}
                  <div className="py-2.5 text-[14px] font-black flex items-end">
                    <span>인수자 확인</span>
                    <span className="border-b-2 border-black w-36 ml-2 inline-block"></span>
                  </div>

                  {/* 하단 발행 매장처 */}
                  <div className="border-t border-dashed border-black mt-3 pt-2 text-center text-[10px] font-bold">
                    <p>{senderInfo?.name || currentBranchName || "발주 매장"}</p>
                    {(senderInfo?.contact_phone || senderInfo?.contact) && (
                      <p className="mt-0.5 font-mono text-[9px] font-medium text-black/80">
                        {senderInfo.contact_phone || senderInfo.contact}
                      </p>
                    )}
                    <p className="mt-0.5 font-mono text-[8px] text-slate-400/80">Floxync Automate System</p>
                  </div>
                </div>
              </div>
            </div>


          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
