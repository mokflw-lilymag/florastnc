import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';
import { useMaterialStore, Material } from '@/stores/material-store';
import { useMemo, useEffect } from 'react';

export type { Material };

export function useMaterials() {
    const supabase = createClient();
    const { tenantId } = useAuth();
    
    // Zustand Store
    const { 
        materials, 
        isLoading: loading, 
        initialize, 
        addMaterial: addMaterialToStore, 
        updateMaterial: updateMaterialInStore, 
        removeMaterial: removeMaterialFromStore 
    } = useMaterialStore();

    // Memoized Stats
    const stats = useMemo(() => {
        return materials.reduce((acc, curr) => {
            acc.totalTypes += 1;
            acc.totalStock += (curr.stock || 0);
            if (curr.stock === 0) acc.outOfStock += 1;
            else if (curr.stock < 10) acc.lowStock += 1;
            return acc;
        }, { totalTypes: 0, totalStock: 0, lowStock: 0, outOfStock: 0 });
    }, [materials]);

    const fetchMaterials = async () => {
        if (tenantId) await useMaterialStore.getState().refresh(tenantId);
    };

    const addMaterial = async (data: Partial<Material>) => {
        if (!tenantId) return;
        try {
            const { data: inserted, error } = await supabase.from('materials').insert([{
                ...data,
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]).select().single();

            if (error) throw error;
            if (inserted) addMaterialToStore(inserted);
            toast.success("새 자재가 추가되었습니다.");
            return inserted;
        } catch (error) {
            console.error("Error adding material:", error);
            toast.error("자재 추가 실패");
        }
    };

    const updateMaterial = async (id: string, data: Partial<Material>) => {
        try {
            const { data: updated, error } = await supabase.from('materials').update({
                ...data,
                updated_at: new Date().toISOString()
            }).eq('id', id).select().single();

            if (error) throw error;
            if (updated) updateMaterialInStore(id, updated);
            toast.success("자재 정보가 수정되었습니다.");
            return updated;
        } catch (error) {
            console.error("Error updating material:", error);
            toast.error("자재 수정 실패");
        }
    };

    const deleteMaterial = async (id: string) => {
        try {
            const { error } = await supabase.from('materials').delete().eq('id', id);
            if (error) throw error;
            removeMaterialFromStore(id);
            toast.success("자재가 삭제되었습니다.");
            return true;
        } catch (error) {
            console.error("Error deleting material:", error);
            toast.error("자재 삭제 실패");
            return false;
        }
    };

    useEffect(() => {
        if (tenantId) initialize(tenantId);
    }, [tenantId, initialize]);

    return {
        materials,
        loading,
        stats,
        fetchMaterials,
        addMaterial,
        updateMaterial,
        deleteMaterial
    };
}

