"use client";

import { Suspense, useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { MessagePrintLayout } from './components/message-print-layout';
import type { Order } from '@/types/order';
import { useAuth } from '@/hooks/use-auth';
import { useSearchParams } from 'next/navigation';

export interface SerializableOrder extends Omit<Order, 'orderDate' | 'id'> {
    id: string;
    orderDate: string; // ISO string format
}

const toLocalDate = (dateVal: any): Date => {
    if (!dateVal) return new Date();
    if (typeof dateVal === 'string') return new Date(dateVal);
    if (typeof dateVal === 'number') return new Date(dateVal);
    if (dateVal instanceof Date) return dateVal;
    return new Date(dateVal);
};

async function getOrder(supabase: any, orderId: string): Promise<SerializableOrder | null> {
    try {
        const { data, error: fetchError } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (data) {
            const orderDateIso = toLocalDate(data.order_date).toISOString();
            return {
                ...data,
                id: data.id,
                orderDate: orderDateIso,
                items: data.items || [],
                summary: data.summary || {},
                orderer: data.orderer || {},
                is_anonymous: data.is_anonymous || false,
                payment: data.payment || {},
                message: data.message || {},
            } as SerializableOrder;
        }
        return null;
    } catch (error) {
        console.error("Error fetching order:", error);
        return null;
    }
}

function PrintMessageContent() {
    const supabase = createClient();
    const { tenantId, isLoading: authLoading } = useAuth();
    const searchParams = useSearchParams();
    const [orderData, setOrderData] = useState<SerializableOrder | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
                setError('주문 ID가 필요합니다.');
                setIsLoading(false);
                return;
            }
            if (tenantId) {
                try {
                    const data = await getOrder(supabase, orderId);
                    if (data) {
                        setOrderData(data);
                    } else {
                        setError('주문을 찾을 수 없습니다.');
                    }
                } catch (err) {
                    setError('주문 데이터를 가져오는 중 오류가 발생했습니다.');
                } finally {
                    setIsLoading(false);
                }
            } else if (!authLoading) {
                setError('로그인이 필요합니다.');
                setIsLoading(false);
            }
        };
        fetchOrder();
    }, [orderId, tenantId, authLoading, supabase]);

    if (authLoading || isLoading) return <div className="p-6"><Skeleton className="h-96 w-full" /></div>;
    if (error) return <div className="p-6 text-center text-red-600 font-bold">{error}</div>;
    if (!orderData) return <div className="p-6 text-center">주문을 찾을 수 없습니다.</div>;

    return (
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
    );
}

export default function PrintMessagePage() {
    return (
        <Suspense fallback={<div className="p-6 text-center">불러오는 중...</div>}>
            <PrintMessageContent />
        </Suspense>
    );
}
