"use client";
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';

export interface Supplier {
    id: string;
    tenant_id: string;
    name: string;
    contact?: string;
    email?: string;
    address?: string;
    business_number?: string;
    memo?: string;
    created_at: string;
    updated_at: string;
}

export function useSuppliers() {
    const supabase = createClient();
    const { tenantId } = useAuth();
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchSuppliers = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('suppliers')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('name', { ascending: true });

            if (error) throw error;
            setSuppliers(data || []);
        } catch (error) {
            console.error("Error fetching suppliers:", error);
        } finally {
            setLoading(false);
        }
    }, [tenantId, supabase]);

    const addSupplier = async (data: Partial<Supplier>) => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('suppliers').insert([{
                ...data,
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);
            if (error) throw error;
            toast.success("새 거래처가 등록되었습니다.");
            fetchSuppliers();
        } catch (error) {
            console.error("Error adding supplier:", error);
            toast.error("거래처 등록 실패");
        } finally {
            setLoading(false);
        }
    };

    const updateSupplier = async (id: string, data: Partial<Supplier>) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('suppliers').update({
                ...data,
                updated_at: new Date().toISOString()
            }).eq('id', id);
            if (error) throw error;
            toast.success("거래처 정보가 수정되었습니다.");
            fetchSuppliers();
        } catch (error) {
            console.error("Error updating supplier:", error);
            toast.error("거래처 수정 실패");
        } finally {
            setLoading(false);
        }
    };

    const deleteSupplier = async (id: string) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
            toast.success("거래처가 삭제되었습니다.");
            fetchSuppliers();
        } catch (error) {
            console.error("Error deleting supplier:", error);
            toast.error("거래처 삭제 실패");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, [fetchSuppliers]);

    return {
        suppliers,
        loading,
        fetchSuppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier
    };
}
