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
import { Package, Calculator, Info, Check, ChevronsUpDown, Search, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
    const [partnerId, setPartnerId] = useState("");
    const [partnerPrice, setPartnerPrice] = useState<number>(0);
    const [notes, setNotes] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [openCombobox, setOpenCombobox] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [autoCalc, setAutoCalc] = useState(true);

    const { addExpense, updateExpenseByOrderId } = useExpenses();
    const { partners, loading: partnersLoading } = usePartners();

    const filteredPartners = useMemo(() => {
        if (!searchTerm) return partners;
        return partners.filter((p) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [partners, searchTerm]);

    const handlePartnerSelect = (partner: any) => {
        setPartnerId(partner.id);
        setOpenCombobox(false);
        setSearchTerm("");
        
        if (autoCalc && order?.summary?.total) {
            const margin = partner.default_margin_percent || 20;
            setPartnerPrice(Math.round(order.summary.total * (1 - margin / 100)));
        }
    };

    const selectedPartner = useMemo(() =>
        partners.find(p => p.id === partnerId),
        [partners, partnerId]);

    const orderTotal = order?.summary?.total || 0;
    const isEditMode = !!order?.outsource_info?.isOutsourced;

    useEffect(() => {
        if (isOpen && order) {
            if (order.outsource_info?.isOutsourced) {
                setPartnerId(order.outsource_info.partnerId);
                setPartnerPrice(order.outsource_info.partnerPrice);
                setNotes(order.outsource_info.notes || "");
                setAutoCalc(false);
            } else {
                setPartnerId("");
                setPartnerPrice(0);
                setNotes("");
                setAutoCalc(true);
            }
        }
    }, [isOpen, order]);

    const profit = orderTotal - partnerPrice;
    const profitMargin = orderTotal > 0 ? (profit / orderTotal) * 100 : 0;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!order || !partnerId || partnerPrice <= 0) {
            toast.error("파트너와 가격을 정확히 입력해주세요.");
            return;
        }

        try {
            setIsSubmitting(true);

            const outsource_info = {
                isOutsourced: true,
                partnerId: partnerId,
                partnerName: selectedPartner?.name || "",
                partnerPrice: partnerPrice,
                profit,
                status: order.outsource_info?.status || 'pending',
                notes,
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

            // Automatically add to expenses
            const itemsDescription = (order.items || []).map(item => `${item.name}(${item.quantity})`).join(', ');
            const totalQuantity = (order.items || []).reduce((sum, item) => sum + item.quantity, 0);

            const expenseData = {
                expense_date: order.order_date,
                amount: partnerPrice,
                category: 'material',
                sub_category: 'outsource',
                description: isEditMode ? `외부발주(수정): ${itemsDescription} ${order.orderer?.name}` : `외부발주: ${itemsDescription} ${order.orderer?.name}`,
                supplier: selectedPartner?.name || "미지정 파트너",
                related_order_id: order.id,
                payment_method: 'transfer'
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
                        <div className="flex justify-between text-sm">
                            <span className="text-slate-500 font-light">고객 결제 금액:</span>
                            <span className="font-bold text-blue-600">₩{orderTotal.toLocaleString()}</span>
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
                                                <div className="flex flex-col">
                                                    <span>{partner.name}</span>
                                                    {partner.default_margin_percent && (
                                                        <span className="text-[10px] text-slate-500">기본 마진 {partner.default_margin_percent}%</span>
                                                    )}
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

                    <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 text-blue-700 font-medium text-sm">
                            <Calculator className="h-4 w-4" />
                            수익 리포트
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-[11px] text-blue-600 mb-1 font-light">예상 수익액</p>
                                <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    ₩{profit.toLocaleString()}
                                </p>
                            </div>
                            <div>
                                <p className="text-[11px] text-blue-600 mb-1 font-light">수익률</p>
                                <p className={`text-lg font-bold ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {profitMargin.toFixed(1)}%
                                </p>
                            </div>
                        </div>
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
