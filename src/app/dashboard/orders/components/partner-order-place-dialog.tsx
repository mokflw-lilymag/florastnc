"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Globe, Info, Loader2, MapPin, Search } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Order } from "@/types/order";
import { placePartnerExternalOrder } from "@/lib/partner-order-service";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface PartnerTenant {
  id: string;
  name: string;
  country?: string | null;
  partner_region?: string | null;
  contact_phone?: string | null;
}

interface PartnerOrderPlaceDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
  onSuccess?: () => void;
}

export function PartnerOrderPlaceDialog({
  isOpen,
  onOpenChange,
  order,
  onSuccess,
}: PartnerOrderPlaceDialogProps) {
  const supabase = createClient();
  const { tenantId } = useAuth();

  const [partners, setPartners] = useState<PartnerTenant[]>([]);
  const [loadingPartners, setLoadingPartners] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPartnerId, setSelectedPartnerId] = useState("");
  const [fulfillmentAmount, setFulfillmentAmount] = useState(0);
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [senderBranding, setSenderBranding] = useState({
    name: "",
    logo_url: "",
    contact: "",
    address: "",
  });

  const orderTotal = Math.round(Number(order?.summary?.total || 0));

  useEffect(() => {
    if (!isOpen || !tenantId) return;
    setLoadingPartners(true);
    void Promise.all([
      supabase
        .from("tenants")
        .select("id, name, country, partner_region, contact_phone")
        .eq("can_receive_orders", true)
        .neq("id", tenantId)
        .order("name"),
      supabase
        .from("tenants")
        .select("name, logo_url, contact_phone, address")
        .eq("id", tenantId)
        .maybeSingle(),
    ])
      .then(([partnersRes, senderRes]) => {
        setPartners((partnersRes.data || []) as PartnerTenant[]);
        if (senderRes.data) {
          setSenderBranding({
            name: senderRes.data.name || "",
            logo_url: senderRes.data.logo_url || "",
            contact: senderRes.data.contact_phone || "",
            address: senderRes.data.address || "",
          });
        }
      })
      .finally(() => setLoadingPartners(false));
  }, [isOpen, tenantId, supabase]);

  useEffect(() => {
    if (isOpen && order) {
      setSelectedPartnerId("");
      setNotes("");
      setSearchTerm("");
      setFulfillmentAmount(Math.round(orderTotal * 0.8));
    }
  }, [isOpen, order, orderTotal]);

  const filteredPartners = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return partners;
    return partners.filter((p) => {
      return (
        p.name.toLowerCase().includes(term) ||
        (p.partner_region || "").toLowerCase().includes(term) ||
        (p.contact_phone || "").includes(term)
      );
    });
  }, [partners, searchTerm]);

  const selectedPartner = partners.find((p) => p.id === selectedPartnerId);

  const handleSubmit = useCallback(async () => {
    if (!order || !tenantId || !selectedPartnerId || fulfillmentAmount <= 0) {
      toast.error("수주 꽃집과 수주 금액을 확인해 주세요.");
      return;
    }
    setIsSubmitting(true);
    try {
      await placePartnerExternalOrder({
        supabase,
        senderTenantId: tenantId,
        receiverTenantId: selectedPartnerId,
        order,
        senderBranding,
        fulfillmentAmount,
        notes,
      });
      toast.success(`${selectedPartner?.name || "수주 매장"}에 회원사 발주를 전송했습니다.`);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("[PartnerOrderPlaceDialog]", err);
      toast.error("회원사 발주 전송 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }, [
    order,
    tenantId,
    selectedPartnerId,
    fulfillmentAmount,
    notes,
    senderBranding,
    supabase,
    selectedPartner?.name,
    onSuccess,
    onOpenChange,
  ]);

  if (!order) return null;

  const flagMap: Record<string, string> = {
    KR: "🇰🇷",
    VN: "🇻🇳",
    JP: "🇯🇵",
    US: "🇺🇸",
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[640px] max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Globe className="h-5 w-5 text-blue-600" />
            회원사 수발주 발주
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-2xl border space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">주문 상품</span>
              <span className="font-bold">
                {order.items[0]?.name}
                {order.items.length > 1 ? ` 외 ${order.items.length - 1}건` : ""}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">주문 금액</span>
              <span className="font-extrabold text-blue-600">₩{orderTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">배송 희망</span>
              <span className="font-bold">
                {order.delivery_info?.date || order.pickup_info?.date || "—"}{" "}
                {order.delivery_info?.time || order.pickup_info?.time || ""}
              </span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-blue-800">
            <div className="flex gap-2 items-start">
              <Info className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                기본 정산: 발주 20% / 수주 80%. 수주 매장에 실시간 알림이 전송되며, 수락 시
                주문서·인수증이 자동 출력됩니다.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="font-bold">수주 꽃집 선택 *</Label>
            <div className="flex items-center border rounded-xl px-3 bg-white">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <Input
                className="border-0 shadow-none focus-visible:ring-0 h-10"
                placeholder="꽃집명·지역·연락처 검색"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="border rounded-2xl overflow-hidden max-h-[200px] overflow-y-auto">
              {loadingPartners ? (
                <div className="p-6 text-center text-slate-400">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                </div>
              ) : filteredPartners.length === 0 ? (
                <div className="p-6 text-center text-slate-400">등록된 수주 회원사가 없습니다.</div>
              ) : (
                filteredPartners.map((p) => {
                  const flag = flagMap[p.country || "KR"] || "🇰🇷";
                  const selected = selectedPartnerId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSelectedPartnerId(p.id)}
                      className={cn(
                        "w-full text-left px-4 py-3 border-b last:border-b-0 transition-colors",
                        selected ? "bg-blue-50" : "hover:bg-slate-50",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-slate-900">
                          {flag} {p.name}
                        </span>
                        {selected ? (
                          <span className="text-[10px] font-bold text-blue-600">선택됨</span>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500">
                        {p.partner_region ? (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {p.partner_region}
                          </span>
                        ) : null}
                        {p.contact_phone ? <span>{p.contact_phone}</span> : null}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fulfillmentAmount" className="font-bold">
              수주 금액 (발주처 → 수주처 지급액) *
            </Label>
            <Input
              id="fulfillmentAmount"
              type="number"
              value={fulfillmentAmount || ""}
              onChange={(e) => setFulfillmentAmount(Number(e.target.value))}
              className="rounded-xl"
            />
            <p className="text-[10px] text-slate-400">
              80% 기준 ₩{Math.round(orderTotal * 0.8).toLocaleString()} · 발주처 수익 ₩
              {Math.max(0, orderTotal - fulfillmentAmount).toLocaleString()}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="partnerNotes" className="font-bold">
              수주처 전달사항
            </Label>
            <Textarea
              id="partnerNotes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="제작·배송 시 참고 사항"
              className="rounded-xl text-xs"
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            취소
          </Button>
          <Button
            onClick={() => void handleSubmit()}
            disabled={isSubmitting || !selectedPartnerId || fulfillmentAmount <= 0}
            className="bg-blue-600 hover:bg-blue-500 font-bold rounded-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                전송 중…
              </>
            ) : (
              "발주 전송"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
