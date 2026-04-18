"use client";

import { Suspense, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { createClient } from '@/utils/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useSearchParams } from 'next/navigation';
import { Order } from '@/types/order';
import { RibbonPrintLayout } from './components/ribbon-print-layout';

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

    const orderId = searchParams.get('orderId') || '';
    const messageContent = searchParams.get('messageContent') || '';
    const senderName = searchParams.get('senderName') || '';

    useEffect(() => {
        const fetchOrder = async () => {
            if (!orderId) {
                setError('주문 ID가 필요합니다.');
                setIsLoading(false);
                return;
            }

            if (!tenantId && !authLoading) {
                setError('로그인이 필요합니다.');
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
                        setError('주문을 찾을 수 없습니다.');
                    }
                } catch (err) {
                    setError('주문 데이터를 가져오는 중 오류가 발생했습니다.');
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
                    <h2 className="text-2xl font-bold text-red-600 mb-4">오류 발생</h2>
                    <p className="text-gray-600 font-light">{error || '주문 정보가 없습니다.'}</p>
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
