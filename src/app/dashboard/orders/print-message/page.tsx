"use client";
import { getMessages } from "@/i18n/getMessages";

import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { MessagePrintLayout } from './components/message-print-layout';
import { useAuth } from '@/hooks/use-auth';
import { useSearchParams } from 'next/navigation';
import { Order } from '@/types/order';
import { usePreferredLocale } from "@/hooks/use-preferred-locale";

export default function PrintMessagePage() {
    const { profile, isLoading: authLoading, tenantId } = useAuth();
    const supabase = createClient();
    const searchParams = useSearchParams();
    const [orderData, setOrderData] = useState<Order | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const orderId = searchParams.get('orderId') || '';
    const labelType = searchParams.get('labelType') || 'formtec-3108';
    const startPosition = parseInt(searchParams.get('start') || '1');
    const messageFont = searchParams.get('messageFont') || 'Noto Sans KR';
    const messageFontSize = parseInt(searchParams.get('messageFontSize') || '14');
    const senderFont = searchParams.get('senderFont') || 'Noto Sans KR';
    const senderFontSize = parseInt(searchParams.get('senderFontSize') || '12');
    const messageContent = searchParams.get('messageContent') || '';
    const senderName = searchParams.get('senderName') || '';
    const positionsParam = searchParams.get('positions') || '';
    const selectedPositions = positionsParam ? positionsParam.split(',').map(p => parseInt(p)).filter(p => !isNaN(p)) : [startPosition];

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
        <Suspense fallback={<div className="max-w-4xl mx-auto p-6"><Skeleton className="h-96 w-full" /></div>}>
            <MessagePrintLayout
                order={orderData}
                labelType={labelType}
                startPosition={startPosition}
                messageFont={messageFont}
                messageFontSize={messageFontSize}
                senderFont={senderFont}
                senderFontSize={senderFontSize}
                messageContent={messageContent}
                senderName={senderName}
                selectedPositions={selectedPositions}
            />
        </Suspense>
    );
}
