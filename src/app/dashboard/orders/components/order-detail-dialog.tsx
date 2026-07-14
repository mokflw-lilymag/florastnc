"use client";
import { getMessages } from "@/i18n/getMessages";

import React, { useState, useEffect, useRef } from "react";
import { uploadWithOptimalStorage, deleteFromOptimalStorage } from "@/lib/storage-manager";
import { isElectronClient } from "@/lib/electron-env";
import { downloadImageToLocal } from "@/lib/electron-desktop-api";
import { format } from "date-fns";
import { 
  User, Phone, Mail, Building, MapPin, Calendar, Clock, 
  Package, MessageSquare, FileText, CreditCard, Truck, 
  Printer, Settings, CheckCircle2, Trash2, RefreshCw, 
  Camera, Send, Image as ImageIcon, Loader2,
  AlertCircle, Check, X,
  MoreHorizontal, MessageCircle
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

import { parseDate } from "@/lib/date-utils";
import { isSettled } from "@/lib/order-utils";
import { useAuth } from "@/hooks/use-auth";
import { useOrders } from "@/hooks/use-orders";
import { useSettings } from "@/hooks/use-settings";
import { Order } from "@/types/order";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { enqueuePrintJob } from "@/lib/print-service";
import { useCurrency } from "@/hooks/use-currency";

interface OrderDetailDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onPrintMessage?: (order: Order) => void;
  onPrintRibbon?: (order: Order) => void;
  onUpdate?: () => void;
}

export function OrderDetailDialog({ isOpen, onOpenChange, order, onPrintMessage, onPrintRibbon, onUpdate }: OrderDetailDialogProps) {
    const { symbol: currencySymbol } = useCurrency();
  const supabase = createClient();
  const { user, tenantId, profile } = useAuth();
  const { updateOrder } = useOrders();
  const { settings } = useSettings();
  const [enlargedMemoImage, setEnlargedMemoImage] = useState<string | null>(null);
  const resolvedMessenger =
    settings?.preferredMessenger ||
    (settings?.country === 'VN' ? 'zalo' : settings?.country === 'JP' ? 'line' : 'kakaotalk');

  const messengerNames: Record<string, string> = {
    kakaotalk: '카카오톡',
    zalo: 'Zalo',
    line: 'LINE',
    whatsapp: 'WhatsApp',
    sms: '일반 문자',
  };
  const currentMessengerName = messengerNames[resolvedMessenger] || '메신저';

  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const [isDateEditing, setIsDateEditing] = useState(false);
  const [editOrderDate, setEditOrderDate] = useState("");
  const [editPaymentDate, setEditPaymentDate] = useState("");
  const [editPaymentMethod, setEditPaymentMethod] = useState("");
  const [editFirstPaymentMethod, setEditFirstPaymentMethod] = useState("");
  const [customerEmailInput, setCustomerEmailInput] = useState("");
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  const [uploading, setUploading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [isAcceptingPartner, setIsAcceptingPartner] = useState(false);

  useEffect(() => {
    if (order && isOpen) {
      setEditOrderDate(order.order_date ? format(parseDate(order.order_date), "yyyy-MM-dd") : "");
      setEditPaymentDate(order.payment?.completedAt ? format(parseDate(order.payment.completedAt), "yyyy-MM-dd'T'HH:mm") : "");
      setEditPaymentMethod(order.payment?.method || "card");
      setEditFirstPaymentMethod(order.payment?.firstPaymentMethod || "card");
      setCustomerEmailInput(order.orderer?.email || "");
    }
  }, [order, isOpen]);

  if (!order) return null;

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const handleAcceptPartnerTransfer = async () => {
    if (!order || !tenantId) return;
    setIsAcceptingPartner(true);
    try {
      const currentTrInfo = (order as any).transfer_info || (order as any).transferInfo || {};
      const updatedTransferInfo = {
        ...currentTrInfo,
        status: 'accepted',
        acceptedAt: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('orders')
        .update({
          transfer_info: updatedTransferInfo
        })
        .eq('id', order.id);

      if (dbError) throw dbError;

      // 수락과 동시에 즉시 보안 마스킹된 인수증 인쇄 잡 발행
      const logoUrl = currentTrInfo?.sendBranchLogo || currentTrInfo?.send_branch_logo || currentTrInfo?.sender_branding?.logo_url || currentTrInfo?.senderBranding?.logo_url;
      const secureOrderData = {
        ...order,
        logo_url: logoUrl || null,
        orderer: {
          name: maskName(order.orderer?.name),
          contact: maskPhone(order.orderer?.contact),
          email: ""
        },
        orderer_name: maskName(order.orderer?.name),
        customer_name: maskName(order.orderer?.name),
        summary: {
          ...order.summary,
          total: order.transferInfo?.transferAmount || 0,
          subtotal: order.transferInfo?.transferAmount || 0
        }
      };

      let orderType: "store" | "pickup" | "delivery" = "store";
      if (order.receipt_type === 'delivery_reservation' || (order.receipt_type as string) === 'delivery') {
        orderType = "delivery";
      } else if (order.receipt_type === 'pickup_reservation') {
        orderType = "pickup";
      }

      await enqueuePrintJob(supabase, tenantId, order.id, orderType, secureOrderData, true, 'receipt');

      toast.success("주문 인수를 수락하였으며, 프린터로 인수증 출력을 전송했습니다!");
      if (onUpdate) onUpdate();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Partner accept error:", err);
      toast.error("수락 및 인쇄 처리에 실패했습니다: " + err.message);
    } finally {
      setIsAcceptingPartner(false);
    }
  };

  const handleSaveDateCorrection = async () => {
    // Logic for date correction
    toast.success(tf.f00154);
    setIsDateEditing(false);
    onUpdate?.();
  };

  const handleReprint = async (reprintType: 'order_form' | 'receipt' | 'receipt_self' | 'both') => {
    if (!order || !tenantId) return;
    
    try {
      let orderType: "store" | "pickup" | "delivery" = "store";
      if (order.receipt_type === 'delivery_reservation' || (order.receipt_type as string) === 'delivery') {
        orderType = "delivery";
      } else if (order.receipt_type === 'pickup_reservation') {
        orderType = "pickup";
      }

      // 회원사 수발주 건인 경우, 보안 가공한 페이로드로 인쇄 데몬에 전송
      const trInfoForPrint = (order as any).transfer_info || (order as any).transferInfo;
      if (trInfoForPrint?.type === 'partner' && order.tenant_id !== tenantId) {
        const logoUrl = trInfoForPrint?.sendBranchLogo || trInfoForPrint?.send_branch_logo || trInfoForPrint?.sender_branding?.logo_url || trInfoForPrint?.senderBranding?.logo_url;
        const secureOrderData = {
          ...order,
          logo_url: logoUrl || null,
          orderer: {
            name: maskName(order.orderer?.name),
            contact: maskPhone(order.orderer?.contact),
            email: ""
          },
          orderer_name: maskName(order.orderer?.name),
          customer_name: maskName(order.orderer?.name),
          summary: {
            ...order.summary,
            total: trInfoForPrint.transferAmount || 0,
            subtotal: trInfoForPrint.transferAmount || 0
          }
        };
        await enqueuePrintJob(createClient(), tenantId, order.id, orderType, secureOrderData, true, 'receipt');
      } else {
        await enqueuePrintJob(createClient(), tenantId, order.id, orderType, order, true, reprintType);
      }
      toast.success(tf.f00720);
    } catch (e) {
      console.error('Reprint failed:', e);
      toast.error(tf.f00721);
    }
  };

  const reprintOrderType: "store" | "pickup" | "delivery" =
    order.receipt_type === 'delivery_reservation' || (order.receipt_type as string) === 'delivery'
      ? "delivery"
      : order.receipt_type === 'pickup_reservation'
        ? "pickup"
        : "store";
  const receiptReprintLabel = reprintOrderType === "delivery" ? "인수증만 출력" : "예약증만 출력";
  const bothReprintLabel = reprintOrderType === "delivery" ? "둘 다 출력 (주문서+인수증)" : "둘 다 출력 (주문서+예약증)";

  const handleDownloadCompletionPhoto = async () => {
    if (!order.completionPhotoUrl) return;
    if (!isElectronClient()) {
      window.open(order.completionPhotoUrl, "_blank");
      return;
    }
    try {
      const ext = order.completionPhotoUrl.split(".").pop()?.split("?")[0] || "jpg";
      const filename = `order_${order.id.slice(0, 8)}_${Date.now()}.${ext}`;
      const result = await downloadImageToLocal(order.completionPhotoUrl, filename, tenantId ?? undefined);
      if (result?.success) {
        toast.success(`사진 저장: ${result.path}`);
      } else {
        toast.error(result?.error || "다운로드 실패");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "다운로드 실패");
    }
  };

  const handleUploadPhoto = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !tenantId) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드할 수 있습니다.");
      return;
    }

    setUploading(true);
    try {
      const storagePath = `${tenantId}/${order.id}_${Date.now()}.jpg`;
      const uploadResult = await uploadWithOptimalStorage(file, storagePath, {
        bucket: "order-photos",
      });

      if (order.completionPhotoUrl) {
        try {
          await deleteFromOptimalStorage(order.completionPhotoUrl);
        } catch {
          // ignore stale delete
        }
      }

      const { error: updateError } = await supabase
        .from("orders")
        .update({ completionphotourl: uploadResult.url })
        .eq("id", order.id);

      if (updateError) throw updateError;

      const sizeHint =
        uploadResult.compressionRatio > 0
          ? ` (${uploadResult.compressionRatio}% 압축 · Supabase 저장)`
          : " (Supabase 저장)";
      toast.success(`${tf.f00580}${sizeHint}`);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error(err);
      toast.error(tf.f00304);
    } finally {
      setUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  };

  const handleSendNotificationManually = async (type: 'production' | 'delivery') => {
    if (!order || !tenantId) return;

    const email = customerEmailInput.trim();
    const contact =
      order.orderer?.contact ||
      order.delivery_info?.recipientContact ||
      '';

    if (!email && !contact) {
      toast.error('고객 이메일 또는 연락처(휴대폰)가 필요합니다.');
      return;
    }

    setIsSendingNotification(true);
    try {
      if (email && email !== order.orderer?.email) {
        const updatedOrderer = { ...order.orderer, email };
        await supabase.from('orders').update({ orderer: updatedOrderer }).eq('id', order.id);
        await updateOrder(order.id, { orderer: updatedOrderer });

        const phoneForSearch = order.orderer?.contact || '';
        if (phoneForSearch) {
          const cleanPhone = phoneForSearch.replace(/[^0-9]/g, '');
          const { data: customerData } = await supabase
            .from('customers')
            .select('id, contact, email')
            .eq('tenant_id', tenantId)
            .or(`contact.ilike.%${cleanPhone}%,contact.eq.${phoneForSearch}`);

          if (customerData?.length) {
            for (const cust of customerData) {
              await supabase.from('customers').update({ email }).eq('id', cust.id);
            }
          }
        }
      }

      const photoUrl =
        order.completionPhotoUrl ||
        order.delivery_info?.completionPhotoUrl ||
        undefined;

      const customerName = order.orderer?.name || '고객';
      const orderNumber = order.order_number || order.id;
      const tenantShopName = profile?.tenants?.name as string | undefined;
      const tenantLogoUrl = profile?.tenants?.logo_url as string | undefined;
      const emailSettings = {
        ...settings,
        autoEmailProductionComplete: true,
        autoEmailDeliveryComplete: true,
      };

      let emailSent = false;
      let kakaoSent = false;

      if (email) {
        if (type === 'production') {
          const { sendProductionCompleteEmail } = await import('@/lib/email-service');
          await sendProductionCompleteEmail(
            email,
            customerName,
            orderNumber,
            emailSettings,
            photoUrl,
            tenantId,
            true,
            tenantShopName,
            tenantLogoUrl,
          );
          emailSent = true;
        } else {
          const { sendDeliveryCompleteEmail } = await import('@/lib/email-service');
          await sendDeliveryCompleteEmail(
            email,
            customerName,
            orderNumber,
            new Date().toLocaleDateString('ko-KR'),
            emailSettings,
            photoUrl,
            tenantId,
            order.delivery_info?.recipientName || order.pickup_info?.pickerName || customerName,
            true,
            tenantShopName,
            tenantLogoUrl,
          );
          emailSent = true;
        }
      }

      if (contact) {
        let customerPoint = 0;
        if ((order as any).customer_id) {
          const { data: cData } = await supabase.from('customers').select('points').eq('id', (order as any).customer_id).single();
          if (cData) customerPoint = cData.points || 0;
        }

        const { buildKakaoPcNotificationMessage } = await import('@/lib/kakao/build-kakao-pc-message');
        const { launchMessengerMessage } = await import('@/lib/messenger-helper');
        const message = buildKakaoPcNotificationMessage(type, settings, {
          customerName,
          tenantShopName,
          photoUrl,
          customerPoint,
        });

        // 1. 선호 메신저 결정 (설정값 우선 -> 국가 코드에 따른 폴백)
        const resolvedMessenger =
          settings.preferredMessenger ||
          (settings.country === 'VN' ? 'zalo' : settings.country === 'JP' ? 'line' : 'kakaotalk');

        const messengerNames: Record<string, string> = {
          kakaotalk: '카카오톡',
          zalo: 'Zalo',
          line: 'LINE',
          whatsapp: 'WhatsApp',
          sms: '일반 문자',
        };
        const currentMessengerName = messengerNames[resolvedMessenger] || '메신저';

        const messengerResult = await launchMessengerMessage(resolvedMessenger, contact, message, customerName);
        if (!messengerResult.success) {
          throw new Error(`${currentMessengerName} 실행에 실패했습니다.`);
        }
        kakaoSent = true;

        if (emailSent) {
          toast.success(`이메일 발송 + ${currentMessengerName} 메시지 복사가 완료되었습니다. (Ctrl+V로 붙여넣기)`);
        } else {
          toast.success(`${currentMessengerName}이 실행되었습니다. 메시지를 Ctrl+V로 붙여넣어 전송하세요.`);
        }
      } else if (emailSent) {
        toast.success(type === 'production' ? '제작완료 이메일을 발송했습니다.' : '배송완료 이메일을 발송했습니다.');
      }
    } catch (e: unknown) {
      console.error(e);
      const message = e instanceof Error ? e.message : '알림 발송 중 오류가 발생했습니다.';
      toast.error(message);
    } finally {
      setIsSendingNotification(false);
    }
  };

  const customerContact =
    order.orderer?.contact ||
    order.delivery_info?.recipientContact ||
    '';
  const canNotify = !!customerEmailInput.trim() || !!customerContact.replace(/[^0-9]/g, '');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processing': return <Badge className="bg-blue-500">{tf.f00678}</Badge>;
      case 'completed': return <Badge className="bg-emerald-500">{tf.f00471}</Badge>;
      case 'canceled': return <Badge variant="destructive">{tf.f00702}</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPaymentMethodText = (method: string) => {
    const maps: Record<string, string> = {
      card: tf.f00704,
      cash: tf.f00769,
      transfer: tf.f00057,
      mainpay: tf.f00211,
      shopping_mall: tf.f00368,
      epay: tf.f02604,
      kakao: tf.f02604,
      apple: tf.f02604,
      unknown: "모름",
    };
    return maps[method] || method;
  };

  const getPaymentStatusBadge = (order: Order) => {
    const status = order.payment?.status;
    const completedAt = order.payment?.completedAt;

    switch (status) {
      case 'paid':
      case 'completed':
        return (
          <div className="flex flex-col gap-1">
            <Badge className="bg-blue-500 text-white">{tf.f00470}</Badge>
            {completedAt && (
              <span className="text-sm font-medium text-gray-500">
                {format(parseDate(completedAt), 'MM/dd HH:mm')}
              </span>
            )}
          </div>
        );
      case 'split_payment':
        return (
          <div className="flex flex-col gap-1">
            <Badge className="bg-orange-500 text-white font-semibold">{tf.f00298}</Badge>
          </div>
        );
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-500 text-white">{tf.f00217}</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const isDelivery = order.receipt_type === 'delivery_reservation';
  const info = isDelivery ? order.delivery_info : order.pickup_info;

  return (
    <Dialog open={isOpen} onOpenChange={onOpen => { !onOpen && onOpenChange(false); }}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl p-0 border-none shadow-2xl flex flex-col">
        <ScrollArea className="flex-1 overflow-y-auto p-8">
        <div className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-3 text-slate-900">
                <div className="p-2 bg-slate-100 rounded-xl">
                  <Package className="h-5 w-5 text-slate-700" />
                </div>
                {tf.f00596}
              </DialogTitle>
              <DialogDescription className="mt-2 text-slate-500">
                {tf.f00624}: <span className="font-mono font-semibold text-slate-900">{order.order_number}</span>
              </DialogDescription>
            </div>
            <div className="flex items-center gap-2">
               {/* 외부발주 뱃지 */}
               {(() => {
                 const outsourceInfo = (order as any).outsource_info || (order as any).outsourceInfo;
                 if (outsourceInfo?.isOutsourced) {
                   return (
                     <Badge className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700 shadow-sm select-none">
                       외부발주
                     </Badge>
                   );
                 }
                 return null;
               })()}

               {/* 지점/회원 이관 수발주 5색 뱃지 */}
               {(() => {
                 const trInfo = (order as any).transfer_info || (order as any).transferInfo;
                 if (!trInfo?.isTransferred) return null;
                 
                 const isPartner = trInfo.type === 'partner';
                 const isSender = order.tenant_id === tenantId;
                 
                 let badgeStyle = "";
                 let labelText = "";
                 
                 if (isPartner) {
                   if (isSender) {
                     badgeStyle = "bg-indigo-50 text-indigo-700 border-indigo-200";
                     labelText = `회원발주 (${trInfo.processBranchName || trInfo.process_branch_name || "회원사"})`;
                   } else {
                     badgeStyle = "bg-purple-50 text-purple-700 border-purple-200";
                     labelText = `회원수주 (${trInfo.sendBranchName || trInfo.send_branch_name || "회원사"})`;
                   }
                 } else {
                   if (isSender) {
                     badgeStyle = "bg-blue-50 text-blue-700 border-blue-200";
                     labelText = `지점발주 (${trInfo.processBranchName || trInfo.process_branch_name || "지점"})`;
                   } else {
                     badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
                     labelText = `지점수주 (${trInfo.originalBranchName || trInfo.original_branch_name || "지점"})`;
                   }
                 }
                 
                 return (
                   <Badge className={cn("text-[10px] font-bold px-2.5 py-0.5 rounded-full border shadow-sm select-none", badgeStyle)}>
                     {labelText}
                   </Badge>
                 );
               })()}

               {getStatusBadge(order.status)}
               {getPaymentStatusBadge(order)}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Admin Correction Section */}
          {isAdmin && (
            <Card className="border-red-100 bg-red-50/30 overflow-hidden rounded-2xl">
              <CardHeader className="py-4 border-b border-red-100/50">
                <CardTitle className="text-sm font-semibold flex items-center justify-between text-red-800">
                   <div className="flex items-center gap-2">
                     <AlertCircle className="h-4 w-4" /> {tf.f00153}
                   </div>
                   <Button variant="ghost" size="sm" onClick={() => setIsDateEditing(!isDateEditing)} className="h-8 text-xs text-red-600 font-semibold hover:bg-red-100/50">
                     {isDateEditing ? tf.f00702 : tf.f00574}
                   </Button>
                </CardTitle>
              </CardHeader>
              {isDateEditing && (
                <CardContent className="p-4 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-red-400 uppercase">{tf.f00608}</Label>
                      <Input type="date" value={editOrderDate} onChange={e => setEditOrderDate(e.target.value)} className="h-9 bg-white" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-red-400 uppercase">{tf.f00049}</Label>
                      <Select value={editPaymentMethod} onValueChange={(val) => setEditPaymentMethod(val || "")}>
                        <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                        <SelectContent>
                           {['card', 'cash', 'transfer', 'kakao'].map(m => (
                             <SelectItem key={m} value={m}>{getPaymentMethodText(m)}</SelectItem>
                           ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button size="sm" className="w-full bg-red-600 hover:bg-red-700" onClick={handleSaveDateCorrection}>{tf.f00573}</Button>
                </CardContent>
              )}
            </Card>
          )}

          {/* Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-6">
              <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <User className="h-4 w-4 text-slate-400" />
                  <h3 className="font-semibold">{tf.f00642}</h3>
                </div>
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{tf.f00640}</span>
                    <span className="font-semibold">
                      {(() => {
                        const trInfo = (order as any).transfer_info || (order as any).transferInfo;
                        return trInfo?.type === 'partner' && order.tenant_id !== tenantId
                          ? `${maskName(order.orderer?.name)} (${maskPhone(order.orderer?.contact)})`
                          : `${order.orderer?.name || "-"} (${order.orderer?.contact || "-"})`;
                      })()}
                    </span>
                  </div>
                  <Separator className="bg-slate-100" />
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{tf.f00384}</span>
                    <span className="font-semibold">{isDelivery ? order.delivery_info?.recipientName : order.pickup_info?.pickerName}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{tf.f00444}</span>
                    <span className="font-semibold">{isDelivery ? order.delivery_info?.recipientContact : order.pickup_info?.pickerContact}</span>
                  </div>
                  {isDelivery && (
                    <div className="pt-2">
                       <Label className="text-[10px] font-bold text-slate-400 uppercase">{tf.f00254}</Label>
                       <div className="flex items-start justify-between gap-2 mt-1">
                         <div className="text-xs font-medium leading-relaxed">{order.delivery_info?.address}</div>
                         {order.delivery_info?.address && (
                           <Button
                             variant="outline"
                             size="sm"
                             className="h-6 text-[10px] px-2 shrink-0"
                             onClick={() => {
                               const addr = encodeURIComponent(order.delivery_info?.address || '');
                               const url = baseLocale === 'ko' 
                                 ? `https://map.naver.com/v5/search/${addr}` 
                                 : `https://www.google.com/maps/search/?api=1&query=${addr}`;
                               window.open(url, '_blank');
                             }}
                           >
                             <MapPin className="w-3 h-3 mr-1" />
                             {baseLocale === 'ko' ? '네이버 지도' : 'Google Maps'}
                           </Button>
                         )}
                       </div>
                    </div>
                  )}
                </div>
              </section>

              <section className="space-y-3">
                <div className="flex items-center gap-2 text-slate-900">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <h3 className="font-semibold">{tf.f00532}</h3>
                </div>
                <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">{tf.f00382}</span>
                    <span className="font-bold text-blue-600">{info?.date || '-'} {info?.time || '-'}</span>
                  </div>
                  {(order.memo || order.memo_image_url) && (
                    <div className="pt-2">
                       <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                         <FileText className="h-3 w-3" /> {tf.f00065}
                       </Label>
                       <div className="mt-1 p-3 bg-white rounded-xl border border-blue-100 text-xs font-medium text-slate-700 shadow-sm flex flex-col gap-2">
                         {order.memo && <div>{order.memo}</div>}
                         {order.memo_image_url && (
                           <img 
                             src={order.memo_image_url} 
                             alt="Memo Reference" 
                             className="h-24 w-auto rounded-md object-cover border border-slate-200 cursor-pointer hover:opacity-90 transition-opacity"
                             onClick={() => setEnlargedMemoImage(order.memo_image_url || null)}
                           />
                         )}
                       </div>
                    </div>
                  )}
                  {order.message?.type !== 'none' && order.message?.content !== order.memo && (
                    <div className="pt-2">
                       <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                         <MessageSquare className="h-3 w-3" /> {tf.f00198} ({order.message?.type})
                       </Label>
                       <div className="mt-1 p-3 bg-white rounded-xl border border-slate-200 text-xs italic text-slate-600">
                         {order.message?.content || tf.f00134}
                       </div>
                    </div>
                  )}
                </div>
              </section>
            </div>

            <div className="space-y-6">
              <section className="space-y-3">
                 <div className="flex items-center gap-2 text-slate-900">
                   <ImageIcon className="h-4 w-4 text-slate-400" />
                   <h3 className="font-bold">{tf.f00575}</h3>
                 </div>
                 <div className="grid grid-cols-1 gap-4">
                    <div className="bg-emerald-50/50 rounded-2xl p-4 border border-emerald-100">
                       <div className="flex items-center justify-between mb-3 gap-2">
                         <span className="text-xs font-bold text-emerald-800">{tf.f00579}</span>
                         <div className="flex gap-1">
                         {order.completionPhotoUrl ? (
                           <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold" onClick={() => void handleDownloadCompletionPhoto()}>
                             PC 저장
                           </Button>
                         ) : null}
                         <Button variant="ghost" size="sm" className="h-7 text-[10px] font-bold" onClick={() => photoInputRef.current?.click()}>
                          <Camera className="h-3 w-3 mr-1" /> {order.completionPhotoUrl ? tf.f00278 : tf.f00164}
                         </Button>
                         </div>
                       </div>
                       {order.completionPhotoUrl ? (
                         <div className="rounded-xl overflow-hidden shadow-sm aspect-video bg-black/5 cursor-pointer" onClick={() => setEnlargedMemoImage(order.completionPhotoUrl || null)}>
                           <img src={order.completionPhotoUrl} alt="Completion" className="w-full h-full object-cover" />
                         </div>
                       ) : (
                         <div className="h-24 flex flex-col items-center justify-center border-2 border-dashed border-emerald-200 rounded-xl text-emerald-400 bg-white/50">
                           <ImageIcon className="h-6 w-6 mb-1 opacity-50" />
                           <span className="text-[10px] font-bold">{tf.f00305}</span>
                         </div>
                       )}
                       <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={handleUploadPhoto} />
                    </div>

                    <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 space-y-3">
                       <Label className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                         <Mail className="h-3.5 w-3.5" />
                         알림 발송 (이메일 + {currentMessengerName} PC)
                       </Label>
                       <Input
                         type="email"
                         placeholder="고객 이메일 (선택 — 있으면 이메일도 발송)"
                         value={customerEmailInput}
                         onChange={(e) => setCustomerEmailInput(e.target.value)}
                         className="h-9 text-xs bg-white border-blue-200"
                       />
                       {customerContact ? (
                         <p className="text-[10px] text-slate-600 flex items-center gap-1">
                           <MessageCircle className="h-3 w-3 text-yellow-600" />
                           {currentMessengerName}: {customerContact}
                           {order.completionPhotoUrl ? ' · 완성사진 링크 포함' : ''}
                         </p>
                       ) : (
                         <p className="text-[10px] text-amber-600">
                           * 연락처가 없으면 {currentMessengerName} 알림은 보낼 수 없습니다.
                         </p>
                       )}
                       <div className="flex gap-2">
                         <Button
                           onClick={(e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             handleSendNotificationManually('production');
                           }}
                           disabled={isSendingNotification || !canNotify}
                           className="flex-1 h-9 text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white"
                         >
                           {isSendingNotification ? (
                             <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> 전송 중...</>
                           ) : (
                             '제작완료 알림'
                           )}
                         </Button>
                         <Button
                           onClick={(e) => {
                             e.preventDefault();
                             e.stopPropagation();
                             handleSendNotificationManually('delivery');
                           }}
                           disabled={isSendingNotification || !canNotify}
                           className="flex-1 h-9 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                         >
                           {isSendingNotification ? (
                             <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> 전송 중...</>
                           ) : (
                             '배송완료 알림'
                           )}
                         </Button>
                       </div>
                       {customerEmailInput.trim() && (
                         <p className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                           <Check className="h-3 w-3" />
                           이메일: 완성사진은 본문에 이미지로 표시됩니다.
                         </p>
                       )}
                       {customerContact && (
                         <p className="text-[10px] text-yellow-700 flex items-center gap-1 font-medium">
                           <Check className="h-3 w-3" />
                           {currentMessengerName}: 메시지 복사 후 {currentMessengerName}에서 Ctrl+V (사진은 URL 링크)
                         </p>
                       )}
                    </div>
                 </div>
              </section>

              <section className="space-y-3">
                 <div className="flex items-center gap-2 text-slate-900">
                   <CreditCard className="h-4 w-4 text-slate-400" />
                   <h3 className="font-bold">{tf.f00052}</h3>
                 </div>
                 <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl shadow-slate-200">
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs text-slate-400 font-medium">
                         <span>{tf.f00336}</span>
                         <span>{currencySymbol}{(order.summary?.subtotal || 0).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs text-rose-400 font-medium">
                         <span>{tf.f00760}</span>
                         <span>- {currencySymbol}{(order.summary?.discountAmount || 0).toLocaleString()}</span>
                       </div>
                       <div className="flex justify-between text-xs text-slate-400 font-medium">
                         <span>{tf.f00259}</span>
                         <span>+ {currencySymbol}{(order.summary?.deliveryFee || 0).toLocaleString()}</span>
                       </div>
                       <Separator className="bg-slate-800" />
                       <div className="flex justify-between items-end pt-1">
                         <span className="text-sm font-bold">{tf.f00693}</span>
                         <span className="text-2xl font-black text-emerald-400">{currencySymbol}{(order.summary?.total || 0).toLocaleString()}</span>
                       </div>
                       <div className="text-[10px] text-slate-500 text-right uppercase tracking-widest mt-2">
                         Payment: {getPaymentMethodText(order.payment?.method || '')}
                       </div>
                    </div>
                 </div>
              </section>
            </div>
          </div>
        </div>
        </ScrollArea>

        <div className="p-8 pt-4 flex justify-end gap-3 border-t bg-white/50 backdrop-blur-md rounded-b-3xl">
          <DialogClose render={<Button variant="ghost" className="rounded-2xl h-12 px-8 font-semibold text-slate-500 hover:bg-slate-100" />}>
            {tf.f00149}
          </DialogClose>
          {(() => {
            const trInfo = (order as any).transfer_info || (order as any).transferInfo;
            const isPartnerReceiver = trInfo?.type === 'partner' && order.tenant_id !== tenantId;
            if (isPartnerReceiver) {
              return trInfo.status !== 'accepted' ? (
                <Button 
                  onClick={handleAcceptPartnerTransfer}
                  disabled={isAcceptingPartner}
                  className="rounded-2xl h-12 px-12 font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-100 gap-2 border-none"
                >
                  {isAcceptingPartner ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-300 animate-bounce" />
                  )}
                  인수 수락 및 인수증 출력
                </Button>
              ) : (
                <Button 
                  onClick={() => handleReprint('receipt')}
                  className="rounded-2xl h-12 px-10 font-bold bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-200 gap-2"
                >
                  <Printer className="h-4 w-4" /> 인수증 재출력하기
                </Button>
              );
            }
            return null;
          })()}
          {((order as any).transfer_info || (order as any).transferInfo)?.type === 'partner' && order.tenant_id !== tenantId ? null : (
            <>
              {onPrintMessage && (
                <Button variant="outline" onClick={() => onPrintMessage?.(order)} className={cn(buttonVariants({ variant: "outline" }), "rounded-2xl h-12 px-8 font-semibold border-2 border-slate-200 hover:bg-slate-50 text-slate-700 gap-2")}>
                  <Printer className="h-4 w-4" /> {tf.f00707}
                </Button>
              )}
              {onPrintRibbon && (
                <Button variant="outline" onClick={() => onPrintRibbon?.(order)} className={cn(buttonVariants({ variant: "outline" }), "rounded-2xl h-12 px-8 font-semibold border-2 border-slate-200 hover:bg-slate-50 text-slate-700 gap-2")}>
                  <Printer className="h-4 w-4 text-indigo-500" /> {tf.f00180}
                </Button>
              )}
              
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button className="rounded-2xl h-12 px-10 font-bold bg-slate-900 hover:bg-black text-white shadow-xl shadow-slate-200 gap-2" />}>
                  <Printer className="h-4 w-4" /> {tf.f00722}
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80 rounded-xl p-2">
                  <DropdownMenuItem onClick={() => handleReprint('both')} className="font-semibold text-blue-600 rounded-lg py-3 cursor-pointer">
                    <Printer className="mr-2 h-4 w-4" />
                    <span>{bothReprintLabel}</span>
                  </DropdownMenuItem>
                  <Separator className="my-1" />
                  <DropdownMenuItem onClick={() => handleReprint('order_form')} className="rounded-lg py-2 cursor-pointer">
                    <FileText className="mr-2 h-4 w-4 text-slate-500" />
                    <span className="text-slate-700 font-medium">{tf.f00724}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleReprint('receipt')} className="rounded-lg py-2 cursor-pointer">
                    <Package className="mr-2 h-4 w-4 text-slate-500" />
                    <span className="text-slate-700 font-medium">{receiptReprintLabel}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleReprint('receipt_self')} className="rounded-lg py-2 cursor-pointer">
                    <Package className="mr-2 h-4 w-4 text-emerald-600" />
                    <span className="text-emerald-700 font-medium">{tf.f00726}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}

          <Button className="rounded-2xl h-12 px-10 font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-sm gap-2">
            <RefreshCw className="h-4 w-4" /> {tf.f00598}
          </Button>
        </div>
      </DialogContent>

      <Dialog open={!!enlargedMemoImage} onOpenChange={(open) => !open && setEnlargedMemoImage(null)}>
        <DialogContent className="sm:max-w-[800px] p-0 border-0 bg-transparent shadow-none" style={{ backgroundColor: 'transparent' }} aria-describedby="memo-image-dialog-description">
          <DialogTitle className="sr-only">상세 이미지</DialogTitle>
          <DialogDescription id="memo-image-dialog-description" className="sr-only">
            첨부된 원본 이미지입니다.
          </DialogDescription>
          {enlargedMemoImage && (
            <div className="relative flex items-center justify-center w-full h-[80vh]">
              <img 
                src={enlargedMemoImage} 
                alt="Enlarged image" 
                className="max-w-full max-h-full object-contain rounded-lg"
              />
              <button 
                onClick={() => setEnlargedMemoImage(null)}
                className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}

// 개인정보 마스킹 헬퍼 함수
function maskName(name?: string) {
  if (!name) return "";
  const trimmed = name.trim();
  if (trimmed.length <= 1) return trimmed;
  if (trimmed.length === 2) return trimmed[0] + "*";
  return trimmed[0] + "*".repeat(trimmed.length - 2) + trimmed[trimmed.length - 1];
}

function maskPhone(phone?: string) {
  if (!phone) return "";
  const trimmed = phone.trim();
  const parts = trimmed.split("-");
  if (parts.length === 3) {
    return `${parts[0]}-****-${parts[2]}`;
  }
  if (trimmed.length >= 8) {
    return trimmed.slice(0, 3) + "****" + trimmed.slice(7);
  }
  return trimmed;
}
