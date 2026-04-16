"use client";

import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import type { Material } from '@/types/material';

export type { Material };

interface MaterialState {
    materials: Material[];
    isLoading: boolean;
    _initialized: boolean;
    _fetchPromise: Promise<void> | null;
    
    setMaterials: (materials: Material[]) => void;
    addMaterial: (material: Material) => void;
    updateMaterial: (id: string, updates: Partial<Material>) => void;
    removeMaterial: (id: string) => void;
    
    initialize: (tenantId: string) => Promise<void>;
    refresh: (tenantId: string) => Promise<void>;
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
    materials: [],
    isLoading: false,
    _initialized: false,
    _fetchPromise: null,

    setMaterials: (materials) => set({ materials }),
    addMaterial: (material) => set((state) => ({ materials: [material, ...state.materials] })),
    updateMaterial: (id, updates) => set((state) => ({
        materials: state.materials.map(m => m.id === id ? { ...m, ...updates } : m)
    })),
    removeMaterial: (id) => set((state) => ({
        materials: state.materials.filter(m => m.id !== id)
    })),

    initialize: async (tenantId) => {
        if (get()._initialized) return;
        return get().refresh(tenantId);
    },

    refresh: async (tenantId) => {
        if (!tenantId) return;
        
        // 중복 방지
        const existing = get()._fetchPromise;
        if (existing) return existing;

        const promise = (async () => {
            set({ isLoading: true });
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('materials')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('name', { ascending: true });

                if (error) throw error;
                set({ materials: data || [], _initialized: true });
            } catch (error) {
                console.error("Error refreshing materials:", error);
            } finally {
                set({ isLoading: false, _fetchPromise: null });
            }
        })();

        set({ _fetchPromise: promise });
        return promise;
    }
}));
