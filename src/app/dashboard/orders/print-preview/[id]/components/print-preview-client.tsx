"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Printer, Loader2 } from "lucide-react";
import { useRouter } from 'next/navigation';
import { PrintableOrder, OrderPrintData } from '../../../components/printable-order';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/page-header';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { createClient } from '@/utils/supabase/client';
import { Order } from '@/types/order';

interface PrintPreviewClientProps {
    orderId: string;
}

export function PrintPreviewClient({ orderId }: PrintPreviewClientProps) {
    const router = useRouter();
    const supabase = createClient();
    const { profile, isLoading: authLoading, tenantId } = useAuth();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchOrder() {
            if (!tenantId) return;

            try {
                setLoading(true);
                const { data, error: fetchError } = await supabase
                    .from('orders')
                    .select('*')
                    .eq('id', orderId)
                    .eq('tenant_id', tenantId)
                    .maybeSingle();

                if (fetchError) throw fetchError;
                if (data) setOrder(data as Order);
                else setError('주문을 찾을 수 없습니다.');
            } catch (error) {
                console.error("Error fetching order:", error);
                setError('주문 데이터를 불러오는 중 오류가 발생했습니다.');
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading) {
            fetchOrder();
        }
    }, [orderId, authLoading, tenantId]);

    if (authLoading || loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <p className="ml-2 text-slate-500 font-light">데이터를 불러오는 중입니다...</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <div className="text-center">
                    <p className="text-red-500 mb-4 font-light">{error || '주문 정보가 없습니다.'}</p>
                    <Button variant="outline" onClick={() => router.back()} className="font-light">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        목록으로 돌아가기
                    </Button>
                </div>
            </div>
        );
    }

    const itemsText = (order.items || []).map(item => `${item.name} / ${item.quantity}개`).join('\n');
    const orderDateObject = new Date(order.order_date);
    
    // Mapping SaaS order to PrintableOrder format
    const printData: OrderPrintData = {
        orderDate: format(orderDateObject, "yyyy-MM-dd HH:mm (E)", { locale: ko }),
        ordererName: order.orderer?.name || "미지정",
        ordererCompany: order.orderer?.company || '',
        ordererContact: order.orderer?.contact || '-',
        items: itemsText,
        totalAmount: order.summary?.total || 0,
        deliveryFee: order.summary?.deliveryFee || 0,
        paymentMethod: order.payment?.method || 'cash',
        paymentStatus: ['paid', 'completed'].includes(order.payment?.status) ? '완결' : '미결',
        deliveryDate: order.receipt_type === 'delivery_reservation' 
            ? `${order.delivery_info?.date} ${order.delivery_info?.time || ''}`
            : order.receipt_type === 'pickup_reservation'
                ? `${order.pickup_info?.date} ${order.pickup_info?.time || ''}`
                : order.order_date,
        recipientName: order.receipt_type === 'delivery_reservation' 
            ? order.delivery_info?.recipientName || "" 
            : order.pickup_info?.pickerName || "",
        recipientContact: order.receipt_type === 'delivery_reservation' 
            ? order.delivery_info?.recipientContact || "" 
            : order.pickup_info?.pickerContact || "",
        deliveryAddress: order.receipt_type === 'delivery_reservation' 
            ? order.delivery_info?.address || "" 
            : "매장 수령 (픽업)",
        message: order.message?.content || "",
        messageType: order.message?.type === 'ribbon' ? 'ribbon' : 'card',
        isAnonymous: order.extra_data?.isAnonymous || false,
        shopInfo: {
            name: profile?.tenants?.name || "플로라싱크",
            address: profile?.tenants?.address || "",
            contact: profile?.tenants?.phone || "",
            account: profile?.tenants?.account || "",
        }
    };

    return (
        <div className="min-h-screen bg-white">
            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0; }
                    .no-print { display: none !important; }
                    #printable-area { padding: 0 !important; }
                }
            `}</style>
            
            <div className="max-w-4xl mx-auto p-4 md:p-8 no-print">
                <PageHeader
                    title="주문서 인쇄 미리보기"
                    description={`주문번호: ${order.order_number}`}
                >
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.back()} className="font-light">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            목록
                        </Button>
                        <Button size="sm" onClick={() => window.print()} className="font-light">
                            <Printer className="mr-2 h-4 w-4" />
                            인쇄하기 (Ctrl+P)
                        </Button>
                    </div>
                </PageHeader>
            </div>

            <div id="printable-area" className="flex items-center justify-center p-4">
                <Card className="border-none shadow-none w-full max-w-4xl mx-auto">
                    <CardContent className="p-0">
                        <PrintableOrder data={printData} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
