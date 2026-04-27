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
import { useSettings } from '@/hooks/use-settings';
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

interface PrintPreviewClientProps {
    orderId: string;
}

export function PrintPreviewClient({ orderId }: PrintPreviewClientProps) {
    const router = useRouter();
    const supabase = createClient();
    const { profile, isLoading: authLoading, tenantId } = useAuth();
    const { settings } = useSettings();
    const locale = usePreferredLocale();
    const isKo = toBaseLocale(locale) === "ko";
    const tr = (ko: string, en: string) => (isKo ? ko : en);
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
                else setError(tr('주문을 찾을 수 없습니다.', 'Order not found.'));
            } catch (error) {
                console.error("Error fetching order:", error);
                setError(tr('주문 데이터를 불러오는 중 오류가 발생했습니다.', 'Error while loading order data.'));
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading) {
            fetchOrder();
        }
    }, [orderId, authLoading, tenantId]);

    // Added auto-print logic to handle both direct access and silent printing
    useEffect(() => {
        if (!loading && order) {
            const isIframe = window.self !== window.top;
            if (!isIframe) {
                // If it's a direct browser tab, trigger print automatically
                const timer = setTimeout(() => {
                    window.print();
                }, 1000);
                return () => clearTimeout(timer);
            }
        }
    }, [loading, order]);

    if (authLoading || loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <p className="ml-2 text-slate-500 font-light">{tr("데이터를 불러오는 중입니다...", "Loading data...")}</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <div className="text-center">
                    <p className="text-red-500 mb-4 font-light">{error || tr('주문 정보가 없습니다.', 'No order information.')}</p>
                    <Button variant="outline" onClick={() => router.back()} className="font-light">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {tr("목록으로 돌아가기", "Back to list")}
                    </Button>
                </div>
            </div>
        );
    }

    const itemsText = (order.items || []).map(item => `${item.name}(${item.quantity})`).join(', ');
    const orderDateObject = new Date(order.order_date);
    
    // Formatting delivery date
    let formattedDeliveryDate = order.order_date;
    try {
        if (order.receipt_type === 'delivery_reservation' && order.delivery_info?.date) {
            const dateStr = `${order.delivery_info.date} ${order.delivery_info.time || '00:00'}`;
            formattedDeliveryDate = format(new Date(dateStr), "yyyy-MM-dd HH:mm (E)", { locale: ko });
        } else if (order.receipt_type === 'pickup_reservation' && order.pickup_info?.date) {
            const dateStr = `${order.pickup_info.date} ${order.pickup_info.time || '00:00'}`;
            formattedDeliveryDate = format(new Date(dateStr), "yyyy-MM-dd HH:mm (E)", { locale: ko });
        } else {
            formattedDeliveryDate = format(new Date(order.order_date), "yyyy-MM-dd HH:mm (E)", { locale: ko });
        }
    } catch (e) {
        console.error("Error formatting delivery date:", e);
    }

    // Mapping SaaS order to PrintableOrder format
    const printData: OrderPrintData = {
        orderDate: format(orderDateObject, "yyyy-MM-dd HH:mm (E)", { locale: ko }),
        ordererName: order.orderer?.name || tr("미지정", "N/A"),
        ordererCompany: order.orderer?.company || '',
        ordererContact: order.orderer?.contact || '-',
        items: itemsText,
        totalAmount: order.summary?.total || 0,
        deliveryFee: order.summary?.deliveryFee || 0,
        paymentMethod: order.payment?.method || 'cash',
        paymentStatus: ['paid', 'completed'].includes(order.payment?.status) ? tr('완결', 'Paid') : tr('미결', 'Pending'),
        deliveryDate: formattedDeliveryDate,
        recipientName: order.receipt_type === 'delivery_reservation' 
            ? order.delivery_info?.recipientName || "" 
            : order.pickup_info?.pickerName || "",
        recipientContact: order.receipt_type === 'delivery_reservation' 
            ? order.delivery_info?.recipientContact || "" 
            : order.pickup_info?.pickerContact || "",
        deliveryAddress: order.receipt_type === 'delivery_reservation' 
            ? order.delivery_info?.address || "" 
            : tr("매장 수령 (픽업)", "Store Pickup"),
        message: order.message?.content || "",
        messageType: order.message?.type === 'ribbon' ? 'ribbon' : 'card',
        isAnonymous: order.outsource_info?.hideCustomerInfo || false,
        shopInfo: {
            name: order.outsource_info?.sender_branding?.name || settings?.siteName || profile?.tenants?.name || "Floxync",
            address: order.outsource_info?.sender_branding?.address || settings?.address || profile?.tenants?.address || "",
            contact: order.outsource_info?.sender_branding?.contact || settings?.contactPhone || profile?.tenants?.contact_phone || "",
            account: profile?.tenants?.account || "",
            email: settings?.storeEmail || "",
            website: settings?.siteWebsite || "",
        },
        logoUrl: order.outsource_info?.sender_branding?.logo_url || profile?.tenants?.logo_url || ""
    };

    return (
        <div className="min-h-screen bg-white">
            <style jsx global>{`
                @media print {
                    @page { size: A4; margin: 0; }
                    body { margin: 0 !important; padding: 0 !important; }
                    /* Hide all UI elements except the printable area */
                    .no-print, 
                    header, 
                    aside, 
                    nav, 
                    footer,
                    [role="complementary"],
                    [role="navigation"],
                    .sidebar,
                    .app-header,
                    .quick-chat-container { 
                        display: none !important; 
                    }
                    /* Ensure containers don't restrict width or have padding */
                    main, .dashboard-main, #printable-area { 
                        display: block !important;
                        width: 100% !important;
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    /* Reset any transitions or positioning that might interfere */
                    * { 
                        transition: none !important; 
                        box-shadow: none !important;
                    }
                }
            `}</style>
            
            <div className="max-w-4xl mx-auto p-4 md:p-8 no-print">
                <PageHeader
                    title={tr("주문서 인쇄 미리보기", "Order Print Preview")}
                    description={`${tr("주문번호", "Order No")}: ${order.order_number}`}
                >
                    <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => router.back()} className="font-light">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {tr("목록", "List")}
                        </Button>
                        <Button size="sm" onClick={() => window.print()} className="font-light">
                            <Printer className="mr-2 h-4 w-4" />
                            {tr("Print (Ctrl+P)", "Print (Ctrl+P)")}
                        </Button>
                    </div>
                </PageHeader>
            </div>

            <div id="printable-area" className="flex items-center justify-center p-4">
                <Card className="border-none shadow-none w-full max-w-4xl mx-auto">
                    <CardContent className="p-0">
                        <PrintableOrder data={printData} locale={locale} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
