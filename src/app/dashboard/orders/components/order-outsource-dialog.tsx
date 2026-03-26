"use client";

import { useState, useEffect, useMemo } from "react";
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
import { usePartners } from "@/hooks/use-partners";
import { toast } from "sonner";
import { Order } from "@/types/order";
import { useExpenses } from "@/hooks/use-expenses";
import { createClient } from "@/utils/supabase/client";
import { Package, Calculator, Info, Check, ChevronsUpDown, Search, Loader2, MapPin, ShieldCheck, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";

interface OrderOutsourceDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    order: Order | null;
    onSuccess?: () => void;
}

export function OrderOutsourceDialog({
    isOpen,
    onOpenChange,
    order,
    onSuccess,
}: OrderOutsourceDialogProps) {
    const supabase = createClient();
    const { tenantId } = useAuth();
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

    const { addExpense, updateExpenseByOrderId } = useExpenses();
    const { partners, loading: partnersLoading } = usePartners();

    useEffect(() => {
        async function fetchNetworkPartners() {
            if (!tenantId) return;
            const { data, error } = await supabase
                .from('tenants')
                .select('id, name, partner_region, partner_category, partner_description')
                .eq('can_receive_orders', true)
                .neq('id', tenantId);
            if (data) setNetworkPartners(data);
        }

        async function fetchSenderInfo() {
            if (!tenantId) return;
            const { data } = await supabase.from('tenants').select('name, logo_url, contact_phone, address').eq('id', tenantId).single();
            if (data) setSenderInfo(data);
        }

        if (tenantId) {
            fetchNetworkPartners();
            fetchSenderInfo();
        }
    }, [supabase, tenantId]);

    const allPartners = useMemo(() => {
        const local = partners.map(p => ({ ...p, isNetwork: false }));
        const network = networkPartners.map(p => ({ ...p, isNetwork: true }));
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
        
        // 79/19/2 분배 모델 적용
        // 수주사(Fulfiller): 79%, 발주사(Sender): 19%, 플랫폼(Fee): 2%
        if (autoCalc && order?.summary?.total) {
            const fulfillerRate = 0.79; // 79%
            setPartnerPrice(Math.round(order.summary.total * fulfillerRate));
        }
    };

    const selectedPartner = useMemo(() =>
        allPartners.find(p => p.id === partnerId),
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

    // 수익 계산 (79/19/2 모델)
    const platformFee = Math.round(orderTotal * 0.02); // 2%
    const senderProfit = orderTotal - partnerPrice - platformFee; // 나머지가 발주사 수익
    const fulfillerAmount = partnerPrice;
    
    // 수익률 (발주사 기준)
    const profitMargin = orderTotal > 0 ? (senderProfit / orderTotal) * 100 : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!order || !partnerId || partnerPrice <= 0) {
            toast.error("파트너와 가격을 정확히 입력해주세요.");
            return;
        }

        try {
            setIsSubmitting(true);

            // 1. Prepare Order Data (Privacy Filtered)
            let sharedOrderData = { 
                ...order,
                sender_branding: {
                    name: senderInfo?.name || "",
                    logo_url: senderInfo?.logo_url || "",
                    contact: senderInfo?.contact_phone || "",
                    address: senderInfo?.address || ""
                }
            };
            
            if (hideCustomerInfo) {
                // Remove client/orderer details if chosen (Privacy)
                sharedOrderData = {
                    ...sharedOrderData,
                    orderer: { name: "네트워크 발주 건 (정보 비공개)", contact: "010-0000-0000" },
                };
            }

            // 2. external_orders 테이블에 기록 생성 및 예치금 차감
            const isNetworkPartner = !!allPartners.find(p => p.id === partnerId)?.isNetwork;
            
            if (isNetworkPartner) {
                // 예치금 확인
                const { data: walletData, error: walletError } = await supabase
                    .from('wallets')
                    .select('balance')
                    .eq('tenant_id', tenantId)
                    .single();

                const requiredAmount = partnerPrice + platformFee;
                
                if (walletError && walletError.code !== 'PGRST116') throw walletError;
                
                if (!walletData || walletData.balance < requiredAmount) {
                    toast.error(`예치금이 부족합니다. (충전 필요 금액: ₩${(requiredAmount - (walletData?.balance || 0)).toLocaleString()})`);
                    setIsSubmitting(false);
                    return;
                }

                // 주문 생성
                const { data: extOrder, error: extError } = await supabase
                    .from('external_orders')
                    .insert([{
                        sender_tenant_id: tenantId,
                        receiver_tenant_id: partnerId,
                        origin_order_id: order.id,
                        status: 'pending',
                        total_amount: orderTotal,
                        fulfillment_amount: partnerPrice,
                        sender_profit: senderProfit,
                        platform_fee: platformFee,
                        order_data: sharedOrderData,
                        notes,
                        hide_customer_info: hideCustomerInfo
                    }])
                    .select()
                    .single();

                if (extError) throw extError;

                // 예치금 차감 및 거래 내역 기록 (실제 상용 환경에서는 RPC 호출 권장)
                const { error: balanceError } = await supabase
                    .from('wallets')
                    .update({ balance: walletData.balance - requiredAmount })
                    .eq('tenant_id', tenantId);

                if (balanceError) throw balanceError;

                await supabase.from('wallet_transactions').insert([{
                    tenant_id: tenantId,
                    amount: -requiredAmount,
                    type: 'order_outsource',
                    status: 'completed',
                    reference_id: extOrder.id,
                    metadata: { order_number: order.order_number, partner_name: selectedPartner?.name }
                }]);
            }

            // 3. Update local order outsource_info
            const outsource_info = {
                isOutsourced: true,
                partnerId: partnerId,
                partnerName: selectedPartner?.name || "",
                partnerPrice: partnerPrice,
                platformFee,
                senderProfit,
                hideCustomerInfo,
                isNetworkPartner,
                status: order.outsource_info?.status || 'pending',
                notes,
                sender_branding: sharedOrderData.sender_branding,
                outsourcedAt: order.outsource_info?.outsourcedAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            const { error: updateError } = await supabase
                .from('orders')
                .update({
                    outsource_info,
                    status: 'processing'
                })
                .eq('id', order.id);

            if (updateError) throw updateError;

            // 지출 내역 자동 등록
            const itemsDescription = (order.items || []).map(item => `${item.name}(${item.quantity})`).join(', ');

            const expenseData = {
                expense_date: order.order_date,
                amount: partnerPrice, // 수주사에 지급할 금액
                category: 'material',
                sub_category: 'outsource',
                description: isEditMode ? `외부발주(수성): ${itemsDescription} ${order.orderer?.name}` : `외부발주: ${itemsDescription} ${order.orderer?.name}`,
                supplier: selectedPartner?.name || "미지정 파트너",
                related_order_id: order.id,
                payment_method: paymentMethod
            };

            if (isEditMode) {
                const wasUpdated = await updateExpenseByOrderId(order.id, expenseData, 'outsource');
                if (!wasUpdated) {
                    await addExpense(expenseData);
                }
            } else {
                await addExpense(expenseData);
            }

            toast.success(isEditMode ? "외부 발주 정보가 수정되었습니다." : "외부 발주가 등록되었습니다.");
            onSuccess?.();
            onOpenChange(false);
        } catch (error) {
            console.error("Outsource processing error:", error);
            toast.error("외부 발주 처리 중 오류가 발생했습니다.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!order) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-slate-900">
                        <Package className="h-5 w-5" />
                        {isEditMode ? "외부 발주 수정" : "외부 발주 위탁 처리"}
                    </DialogTitle>
                    <DialogDescription className="text-slate-500">
                        타 업체에 주문을 위탁하고 지출을 자동으로 관리합니다.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 pt-4">
                    <div className="bg-slate-50 p-4 rounded-lg space-y-2 border">
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-light">주문 번호:</span>
                            <span className="font-mono text-[10px]">{order.order_number}</span>
                        </div>
                        <div className="flex justify-between text-sm font-medium">
                            <span className="text-slate-500 font-light">고객 결제 금액:</span>
                            <span className="font-semibold text-blue-600">₩{orderTotal.toLocaleString()}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <Label className="font-light text-slate-700">위탁처 (파트너) 선택 *</Label>
                        
                        <div className="relative">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setOpenCombobox(!openCombobox)}
                                className="w-full justify-between font-light bg-white"
                                disabled={partnersLoading}
                            >
                                {partnersLoading ? (
                                    <div className="flex items-center"><Loader2 className="mr-2 h-3 w-3 animate-spin" />로딩 중...</div>
                                ) : (
                                    partnerId
                                        ? partners.find((p) => p.id === partnerId)?.name
                                        : "업체 검색 및 선택"
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>

                            {openCombobox && (
                                <div className="absolute top-full left-0 w-full mt-1 z-50 rounded-md border bg-white shadow-xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="flex items-center border-b px-3 bg-slate-50">
                                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50 text-slate-400" />
                                        <input
                                            className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-400 font-light"
                                            placeholder="파트너 이름 검색..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="max-h-[200px] overflow-y-auto p-1">
                                        {filteredPartners.length === 0 && (
                                            <div className="py-6 text-center text-sm text-slate-400 font-light">검색 결과가 없습니다.</div>
                                        )}
                                        {filteredPartners.map((partner) => (
                                            <div
                                                key={partner.id}
                                                onClick={() => handlePartnerSelect(partner)}
                                                className={cn(
                                                    "relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-2 text-sm outline-none transition-colors font-light",
                                                    partnerId === partner.id ? "bg-slate-100 text-slate-900" : "hover:bg-slate-50"
                                                )}
                                            >
                                                <Check
                                                    className={cn(
                                                        "mr-2 h-4 w-4",
                                                        partnerId === partner.id ? "opacity-100" : "opacity-0"
                                                    )}
                                                />
                                                <div className="flex flex-col flex-1">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-semibold">{partner.name}</span>
                                                        {partner.isNetwork ? (
                                                            <Badge variant="outline" className="text-[9px] bg-blue-50/50 text-blue-600 border-blue-200">네트워크</Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[9px] bg-slate-50 text-slate-500 border-slate-200">로컬파트너</Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        {partner.partner_region && (
                                                            <span className="text-[10px] text-blue-500 flex items-center gap-0.5">
                                                                <MapPin className="h-2 w-2" /> {partner.partner_region}
                                                            </span>
                                                        )}
                                                        {partner.partner_category && (
                                                            <span className="text-[10px] text-slate-400">· {partner.partner_category}</span>
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

                    <div className="space-y-2">
                        <Label htmlFor="partnerPrice" className="font-light text-slate-700">발주 금액 *</Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-light text-slate-400">₩</span>
                            <Input
                                id="partnerPrice"
                                type="number"
                                className="pl-8 bg-white font-light"
                                placeholder="지불할 금액"
                                value={partnerPrice || ''}
                                onChange={(e) => {
                                    setPartnerPrice(Number(e.target.value));
                                    setAutoCalc(false);
                                }}
                            />
                        </div>
                        {selectedPartner && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 font-light">
                                <Info className="h-3 w-3" />
                                권장 발주가: ₩{Math.round(orderTotal * (1 - (selectedPartner.default_margin_percent || 20) / 100)).toLocaleString()}
                            </p>
                        )}
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 text-slate-700 font-medium text-sm">
                            <Calculator className="h-4 w-4" />
                            금액 분배 리포트 (79 / 19 / 2)
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                            <div className="bg-white p-2 rounded border border-slate-100">
                                <p className="text-[10px] text-slate-500 mb-1 font-light">수주사 (79%)</p>
                                <p className="text-sm font-semibold text-slate-900">
                                    ₩{fulfillerAmount.toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-blue-50/50 p-2 rounded border border-blue-100">
                                <p className="text-[10px] text-blue-600 mb-1 font-light">발주사 (19%)</p>
                                <p className="text-sm font-semibold text-blue-700">
                                    ₩{senderProfit.toLocaleString()}
                                </p>
                            </div>
                            <div className="bg-amber-50/50 p-2 rounded border border-amber-100">
                                <p className="text-[10px] text-amber-600 mb-1 font-light">수수료 (2%)</p>
                                <p className="text-sm font-semibold text-amber-700">
                                    ₩{platformFee.toLocaleString()}
                                </p>
                            </div>
                        </div>
                        <p className="text-[10px] text-slate-400 font-light text-center">
                            발주사 순수익률: {profitMargin.toFixed(1)}%
                        </p>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="hide-info" className="font-medium text-slate-700 cursor-pointer flex items-center gap-2">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" /> 고객(주문자) 정보 숨기기
                            </Label>
                            <Switch 
                                id="hide-info"
                                checked={hideCustomerInfo}
                                onCheckedChange={setHideCustomerInfo}
                            />
                        </div>
                        <p className="text-[10px] text-slate-400 font-light leading-relaxed">
                            {hideCustomerInfo 
                                ? "수주점에서 주문 내역은 볼 수 있지만, 발주 고객의 개인정보는 가려집니다." 
                                : "수주점에서 주문자 정보를 포함한 전체 내용을 확인할 수 있습니다."}
                        </p>
                        <div className="pt-2 border-t flex items-center gap-2 text-[10px] text-blue-600 font-medium">
                            <Info className="h-3 w-3" />
                            브랜딩: 수주점에 내 꽃집 로고와 이름은 전송됩니다.
                        </div>
                    </div>

                    <div className="space-y-3 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                        <Label className="font-medium text-slate-700">결제 수단 및 지출 관리 *</Label>
                        <div className="flex gap-2">
                            <Button
                                type="button"
                                variant={paymentMethod === 'transfer' ? "default" : "outline"}
                                className={cn(
                                    "flex-1 rounded-xl h-11 font-bold",
                                    paymentMethod === 'transfer' ? "bg-slate-900" : "bg-white"
                                )}
                                onClick={() => setPaymentMethod('transfer')}
                            >
                                계좌 이체
                            </Button>
                            <Button
                                type="button"
                                variant={paymentMethod === 'cash' ? "default" : "outline"}
                                className={cn(
                                    "flex-1 rounded-xl h-11 font-bold",
                                    paymentMethod === 'cash' ? "bg-amber-500 hover:bg-amber-600 border-none" : "bg-white"
                                )}
                                onClick={() => setPaymentMethod('cash')}
                            >
                                <DollarSign className="h-4 w-4 mr-2" /> 현금 지급
                            </Button>
                        </div>
                        <p className="text-[10px] text-slate-400 font-light italic">
                            * 현금 선택 시 오늘의 금고 시재 지출(배송/기타)에 자동으로 합산됩니다.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes" className="font-light text-slate-700">비고 (위탁처 전달 사항)</Label>
                        <Textarea
                            id="notes"
                            placeholder="특이사항 입력"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={2}
                            className="bg-white font-light text-xs"
                        />
                    </div>

                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                            className="font-light"
                        >
                            취소
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !partnerId || partnerPrice <= 0}
                            className="font-light"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />처리 중...</>
                            ) : (
                                isEditMode ? "정보 수정" : "발주 위탁"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
