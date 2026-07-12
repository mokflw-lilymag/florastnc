"use client";
import { getMessages } from "@/i18n/getMessages";

import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Printer, Loader2, Eye, EyeOff } from "lucide-react";
import { useRouter } from 'next/navigation';
import { PrintableOrder, OrderPrintData } from '../../../components/printable-order';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/page-header';
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { createClient } from '@/utils/supabase/client';
import { Order } from '@/types/order';
import { useSettings } from '@/hooks/use-settings';
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { normalizeReceiptLocaleSetting } from "@/lib/receipt-locale-options";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import { signalPrintDocumentReady } from '@/lib/print-routes';
import { useReactToPrint } from 'react-to-print';

interface PrintPreviewClientProps {
    orderId: string;
}

export function PrintPreviewClient({ orderId }: PrintPreviewClientProps) {
    const router = useRouter();
    const supabase = createClient();
    const { profile, isLoading: authLoading, tenantId } = useAuth();
    const { settings } = useSettings();
    const uiLocale = usePreferredLocale();
    const receiptSetting = normalizeReceiptLocaleSetting(settings?.receiptLocale);
    const locale = receiptSetting === "auto" ? uiLocale : receiptSetting;
    const tf = getMessages(locale as any).tenantFlows;
    const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale as any));
    // 한국어 날짜: 2026년 7월 20일 (월) 오후 2:00
    const dateTimeWeekday = (d: Date) => format(d, "yyyy년 M월 d일 (EEE) a h:mm", { locale: ko });
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEmbed, setIsEmbed] = useState(false);
    const [maskPersonalInfo, setMaskPersonalInfo] = useState(true);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `주문서_${order?.order_number || orderId}`,
        pageStyle: `
            @media print {
                @page { size: A4; margin: 10mm 15mm; }
                body { margin: 0 !important; padding: 0 !important; }
                * { transition: none !important; box-shadow: none !important; }
            }
        `,
    });

    useEffect(() => {
        setIsEmbed(window.self !== window.top);
    }, []);

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
                else setError(tf.f00635);
            } catch (error) {
                console.error("Error fetching order:", error);
                setError(tf.f00592);
            } finally {
                setLoading(false);
            }
        }

        if (!authLoading) {
            fetchOrder();
        }
    }, [orderId, authLoading, tenantId]);

    // 숨김 iframe에서 로드될 때 부모가 인쇄 대화상자를 띄우도록 준비 신호만 보냄
    useEffect(() => {
        if (loading || !order) return;

        let cancelled = false;

        const notifyReady = async () => {
            try {
                await document.fonts?.ready;
            } catch {
                /* ignore */
            }
            if (cancelled) return;

            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    if (cancelled) return;
                    signalPrintDocumentReady();
                });
            });
        };

        void notifyReady();
        return () => {
            cancelled = true;
        };
    }, [loading, order]);

    if (authLoading || loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                <p className="ml-2 text-slate-500 font-light">{tf.f00158}</p>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-white">
                <div className="text-center">
                    <p className="text-red-500 mb-4 font-light">{error || tf.f00616}</p>
                    <Button variant="outline" onClick={() => router.back()} className="font-light">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {tf.f00216}
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
            formattedDeliveryDate = dateTimeWeekday(new Date(dateStr));
        } else if (order.receipt_type === 'pickup_reservation' && order.pickup_info?.date) {
            const dateStr = `${order.pickup_info.date} ${order.pickup_info.time || '00:00'}`;
            formattedDeliveryDate = dateTimeWeekday(new Date(dateStr));
        } else {
            formattedDeliveryDate = dateTimeWeekday(new Date(order.order_date));
        }
    } catch (e) {
        console.error("Error formatting delivery date:", e);
    }

    // Mapping order to PrintableOrder format
    const printData: OrderPrintData = {
        orderNumber: order.order_number || '',
        orderDate: dateTimeWeekday(orderDateObject),
        ordererName: order.orderer?.name || tf.f00224,
        ordererCompany: order.orderer?.company || '',
        ordererContact: order.orderer?.contact || '-',
        items: itemsText,
        totalAmount: order.summary?.total || 0,
        deliveryFee: order.summary?.deliveryFee || 0,
        paymentMethod: order.payment?.method || 'cash',
        paymentStatus: ['paid', 'completed'].includes(order.payment?.status) ? tf.f00470 : tf.f00217,
        deliveryDate: formattedDeliveryDate,
        recipientName: order.receipt_type === 'delivery_reservation' 
            ? order.delivery_info?.recipientName || "" 
            : order.pickup_info?.pickerName || "",
        recipientContact: order.receipt_type === 'delivery_reservation' 
            ? order.delivery_info?.recipientContact || "" 
            : order.pickup_info?.pickerContact || "",
        deliveryAddress: order.receipt_type === 'delivery_reservation' 
            ? order.delivery_info?.address || "" 
            : tf.f00192,
        message: order.message?.content || "",
        messageType: order.message?.type === 'ribbon' ? 'ribbon' : 'card',
        memo: order.memo || '',
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
                {!isEmbed && (
                <PageHeader
                    title={tf.f00630}
                    description={`${tf.f00624}: ${order.order_number}`}
                >
                    <div className="flex gap-2 flex-wrap">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setMaskPersonalInfo(prev => !prev)}
                            className={maskPersonalInfo
                                ? "font-light border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100"
                                : "font-light border-green-400 text-green-700 bg-green-50 hover:bg-green-100"
                            }
                        >
                            {maskPersonalInfo
                                ? <><EyeOff className="mr-2 h-4 w-4" /> 마스킹 ON (인쇄 시 개인정보 가림)</>
                                : <><Eye className="mr-2 h-4 w-4" /> 마스킹 OFF (원본 표시)</>}
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => router.back()} className="font-light">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            {tf.f00214}
                        </Button>
                        <Button size="sm" onClick={() => handlePrint()} className="font-light">
                            <Printer className="mr-2 h-4 w-4" />
                            {tf.f00785}
                        </Button>
                    </div>
                </PageHeader>
                )}
            </div>

            <div id="printable-area" className="flex items-center justify-center p-4">
                <Card className="border-none shadow-none w-full max-w-4xl mx-auto">
                    <CardContent className="p-0">
                        <div ref={printRef}>
                            <PrintableOrder data={printData} locale={locale} maskPersonalInfo={maskPersonalInfo} />
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
