import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';
import { useSupplierStore, Supplier } from '@/stores/supplier-store';
import { useEffect } from 'react';

export type { Supplier };

export function useSuppliers() {
    const supabase = createClient();
    const { tenantId } = useAuth();
    
    const { 
        suppliers, 
        isLoading: loading, 
        initialize, 
        addSupplier: addSupplierToStore, 
        updateSupplier: updateSupplierInStore, 
        removeSupplier: removeSupplierFromStore 
    } = useSupplierStore();

    const fetchSuppliers = async () => {
        if (tenantId) await useSupplierStore.getState().initialize(tenantId);
    };

    const addSupplier = async (data: Partial<Supplier>) => {
        if (!tenantId) return;
        try {
            const { data: inserted, error } = await supabase.from('suppliers').insert([{
                ...data,
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]).select().single();

            if (error) throw error;
            if (inserted) addSupplierToStore(inserted);
            toast.success("새 거래처가 등록되었습니다.");
            return inserted;
        } catch (error) {
            console.error("Error adding supplier:", error);
            toast.error("거래처 등록 실패");
        }
    };

    const updateSupplier = async (id: string, data: Partial<Supplier>) => {
        try {
            const { data: updated, error } = await supabase.from('suppliers').update({
                ...data,
                updated_at: new Date().toISOString()
            }).eq('id', id).select().single();

            if (error) throw error;
            if (updated) updateSupplierInStore(id, updated);
            toast.success("거래처 정보가 수정되었습니다.");
            return updated;
        } catch (error) {
            console.error("Error updating supplier:", error);
            toast.error("거래처 수정 실패");
        }
    };

    const deleteSupplier = async (id: string) => {
        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
            removeSupplierFromStore(id);
            toast.success("거래처가 삭제되었습니다.");
            return true;
        } catch (error) {
            console.error("Error deleting supplier:", error);
            toast.error("거래처 삭제 실패");
            return false;
        }
    };

    useEffect(() => {
        if (tenantId) initialize(tenantId);
    }, [tenantId, initialize]);

    return {
        suppliers,
        loading,
        fetchSuppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier
    };
}

