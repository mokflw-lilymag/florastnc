"use client";
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';

export interface RegionDeliveryFee {
    id: string;
    region_name: string;
    fee: number;
    tenant_id: string;
}

export function useDeliveryFees() {
    const supabase = createClient();
    const { tenantId } = useAuth();
    const [fees, setFees] = useState<RegionDeliveryFee[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFees = useCallback(async () => {
        if (!tenantId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('delivery_fees_by_region')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('region_name');
            
            if (error) throw error;
            setFees(data || []);
        } catch (err) {
            console.error('Error fetching delivery fees:', err);
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    const addFee = async (region: string, fee: number) => {
        if (!tenantId) return;
        try {
            const { error } = await supabase
                .from('delivery_fees_by_region')
                .upsert({ 
                    tenant_id: tenantId, 
                    region_name: region, 
                    fee 
                }, { onConflict: 'tenant_id, region_name' });
            
            if (error) throw error;
            toast.success('배송비가 설정되었습니다.');
            fetchFees();
        } catch (err) {
            console.error('Error adding delivery fee:', err);
            toast.error('배송비 설정 중 오류가 발생했습니다.');
        }
    };

    const deleteFee = async (id: string) => {
        try {
            const { error } = await supabase
                .from('delivery_fees_by_region')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            toast.success('삭제되었습니다.');
            fetchFees();
        } catch (err) {
            console.error('Error deleting fee:', err);
            toast.error('삭제 중 오류가 발생했습니다.');
        }
    };

    useEffect(() => {
        fetchFees();
    }, [fetchFees]);

    return { fees, loading, addFee, deleteFee, refresh: fetchFees };
}
