"use client";

import { Suspense, useEffect, useState } from 'react';
import { getItemData, uuidToShortCode } from "@/lib/data-fetch";
import { LabelItemData } from "./components/label-item";
import { PrintLayout } from "./components/print-layout";
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import { useSearchParams } from 'next/navigation';

function PrintLabelsContent() {
    const searchParams = useSearchParams();
    const { profile, isLoading: authLoading } = useAuth();
    const [rawLabels, setRawLabels] = useState<LabelItemData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const type = searchParams.get('type') as 'product' | 'material';
    const startPosition = parseInt(searchParams.get('start') || '1');
    const itemsParam = searchParams.get('items');
    const idsParam = searchParams.get('ids');
    const quantity = parseInt(searchParams.get('quantity') || '1');

    useEffect(() => {
        const fetchLabels = async () => {
            if (!profile && !authLoading) {
                setError('로그인이 필요합니다.');
                setIsLoading(false);
                return;
            }

            if (profile) {
                try {
                    let labelsToPrint: LabelItemData[] = [];
                    
                    if (itemsParam) {
                        const itemRequests = itemsParam.split(',').map(item => {
                            const [id, qty] = item.split(':');
                            return { id, quantity: parseInt(qty) || 1 };
                        });
                        const fetchedItems = await Promise.all(itemRequests.map(async req => {
                            const itemData = await getItemData(req.id, type);
                            return itemData ? { ...itemData, quantity: req.quantity } : null;
                        }));
                        
                        fetchedItems.forEach(item => {
                            if (item && item.id) {
                                for (let i = 0; i < item.quantity; i++) {
                                    labelsToPrint.push({ id: item.id, name: item.name, barcode: item.barcode || uuidToShortCode(item.id) });
                                }
                            }
                        });
                    } else if (idsParam) {
                        const ids = idsParam.split(',').filter(id => id);
                        if (ids.length > 0) {
                            const fetchedItems = await Promise.all(ids.map(id => getItemData(id, type)));
                            const validItems = fetchedItems.filter((item): item is LabelItemData => item !== null);
                            // 선택한 모든 아이템을 quantity만큼 반복
                            for (const item of validItems) {
                                for (let i = 0; i < quantity; i++) {
                                    labelsToPrint.push(item);
                                }
                            }
                        }
                    }

                    setRawLabels(labelsToPrint);
                } catch (err) {
                    setError('라벨 데이터를 가져오는 중 오류가 발생했습니다.');
                    console.error('Error fetching labels:', err);
                } finally {
                    setIsLoading(false);
                }
            }
        };

        if (type) {
            fetchLabels();
        }
    }, [type, itemsParam, idsParam, quantity, profile, authLoading]);

    if (authLoading || isLoading) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <Skeleton className="h-96 w-full"/>
            </div>
        );
    }

    if (error) {
        return (
            <div className="max-w-4xl mx-auto p-6">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-4">오류 발생</h2>
                    <p className="text-slate-600">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <PrintLayout 
          rawLabels={rawLabels} 
          initialStart={startPosition}
          initialPresetId={searchParams.get('preset') || '3108'}
        />
    );
}

export default function PrintLabelsPage() {
    return (
        <Suspense fallback={<div className="max-w-4xl mx-auto p-6"><Skeleton className="h-96 w-full" /></div>}>
            <PrintLabelsContent />
        </Suspense>
    );
}
