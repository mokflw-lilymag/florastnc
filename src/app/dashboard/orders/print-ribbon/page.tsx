"use client";
import { getMessages } from "@/i18n/getMessages";

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useSearchParams } from 'next/navigation';
import { Order } from '@/types/order';
import { RibbonPrintLayout } from './components/ribbon-print-layout';
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

const RedirectIfAndroidApp = dynamic(
  () =>
    import("@/components/capacitor/redirect-if-android-app").then((m) => m.RedirectIfAndroidApp),
  { ssr: false, loading: () => <div className="max-w-4xl mx-auto p-6"><Skeleton className="h-96 w-full" /></div> }
);

export default function PrintRibbonPage() {
    return (
        <Suspense fallback={<div className="max-w-4xl mx-auto p-6"><Skeleton className="h-96 w-full" /></div>}>
            <RedirectIfAndroidApp>
                <PrintRibbonContent />
            </RedirectIfAndroidApp>
        </Suspense>
    );
}

function PrintRibbonContent() {
    const { profile, isLoading: authLoading, tenantId } = useAuth();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const [orderData, setOrderData] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const orderId = searchParams.get('orderId') || '';
    const messageContent = searchParams.get('messageContent') || '';
    const senderName = searchParams.get('senderName') || '';

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setError(tf.f00623);
                setIsLoading(false);
                return;
            }

            if (!tenantId && !authLoading) {
                setError(tf.f00176);
                setIsLoading(false);
                return;
            }

            if (tenantId) {
                try {
                    const { data, error: fetchError } = await supabase
                        .from('orders')
                        .select('*')
                        .eq('id', orderId)
                        .eq('tenant_id', tenantId)
                        .maybeSingle();

                    if (fetchError) throw fetchError;
                    if (data) {
                        setOrderData(data as Order);
                    } else {
                        setError(tf.f00635);
                    }
                } catch (err) {
                    setError(tf.f00591);
                    console.error('Error fetching order:', err);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        if (!authLoading) {
            fetchOrder();
        }
    }, [orderId, tenantId, authLoading]);

    if (authLoading || isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error || !orderData) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">{tf.f00467}</h2>
                    <p className="text-gray-600 font-light">{error || tf.f00616}</p>
                </div>
            </div>
        );
    }

    return (
        <RibbonPrintLayout
            order={orderData}
            initialContent={messageContent}
            initialSender={senderName}
        />
    );
}
