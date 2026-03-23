"use client";
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';

export interface Material {
    id: string;
    tenant_id: string;
    name: string;
    main_category: string;
    mid_category?: string;
    unit: string;
    spec?: string;
    price: number;
    color?: string;
    stock: number;
    supplier?: string;
    supplier_id?: string;
    memo?: string;
    updated_at: string;
}

export function useMaterials() {
    const supabase = createClient();
    const { tenantId } = useAuth();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({
        totalTypes: 0,
        totalStock: 0,
        lowStock: 0,
        outOfStock: 0
    });

    const fetchMaterials = useCallback(async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('materials')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('name', { ascending: true });

            if (error) throw error;
            setMaterials(data || []);

            // Calculate stats
            const s = (data || []).reduce((acc, curr) => {
                acc.totalTypes += 1;
                acc.totalStock += (curr.stock || 0);
                if (curr.stock === 0) acc.outOfStock += 1;
                else if (curr.stock < 10) acc.lowStock += 1;
                return acc;
            }, { totalTypes: 0, totalStock: 0, lowStock: 0, outOfStock: 0 });
            setStats(s);
        } catch (error) {
            console.error("Error fetching materials:", error);
        } finally {
            setLoading(false);
        }
    }, [tenantId, supabase]);

    const addMaterial = async (data: Partial<Material>) => {
        if (!tenantId) return;
        setLoading(true);
        try {
            const { error } = await supabase.from('materials').insert([{
                ...data,
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]);
            if (error) throw error;
            toast.success("새 자재가 추가되었습니다.");
            fetchMaterials();
        } catch (error) {
            console.error("Error adding material:", error);
            toast.error("자재 추가 실패");
        } finally {
            setLoading(false);
        }
    };

    const updateMaterial = async (id: string, data: Partial<Material>) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('materials').update({
                ...data,
                updated_at: new Date().toISOString()
            }).eq('id', id);
            if (error) throw error;
            toast.success("자재 정보가 수정되었습니다.");
            fetchMaterials();
        } catch (error) {
            console.error("Error updating material:", error);
            toast.error("자재 수정 실패");
        } finally {
            setLoading(false);
        }
    };

    const deleteMaterial = async (id: string) => {
        setLoading(true);
        try {
            const { error } = await supabase.from('materials').delete().eq('id', id);
            if (error) throw error;
            toast.success("자재가 삭제되었습니다.");
            fetchMaterials();
        } catch (error) {
            console.error("Error deleting material:", error);
            toast.error("자재 삭제 실패");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMaterials();
    }, [fetchMaterials]);

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
