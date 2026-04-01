"use client";

import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';

export interface Supplier {
    id: string;
    tenant_id: string;
    name: string;
    contact_phone?: string;
    contact_email?: string;
    address?: string;
    bank_account?: string;
    category?: string;
    rating?: number;
    business_number?: string;
    notes?: string;
    updated_at: string;
}

interface SupplierState {
    suppliers: Supplier[];
    isLoading: boolean;
    _initialized: boolean;
    _fetchPromise: Promise<void> | null;
    
    setSuppliers: (suppliers: Supplier[]) => void;
    addSupplier: (supplier: Supplier) => void;
    updateSupplier: (id: string, updates: Partial<Supplier>) => void;
    removeSupplier: (id: string) => void;
    
    initialize: (tenantId: string) => Promise<void>;
}

export const useSupplierStore = create<SupplierState>((set, get) => ({
    suppliers: [],
    isLoading: false,
    _initialized: false,
    _fetchPromise: null,

    setSuppliers: (suppliers) => set({ suppliers }),
    addSupplier: (supplier) => set((state) => ({ suppliers: [supplier, ...state.suppliers] })),
    updateSupplier: (id, updates) => set((state) => ({
        suppliers: state.suppliers.map(s => s.id === id ? { ...s, ...updates } : s)
    })),
    removeSupplier: (id) => set((state) => ({
        suppliers: state.suppliers.filter(s => s.id !== id)
    })),

    initialize: async (tenantId) => {
        if (get()._initialized || !tenantId) return;
        
        const existing = get()._fetchPromise;
        if (existing) return existing;

        const promise = (async () => {
            set({ isLoading: true });
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('suppliers')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .order('name', { ascending: true });

                if (error) throw error;
                set({ suppliers: data || [], _initialized: true });
            } catch (error) {
                console.error("Error refreshing suppliers:", error);
            } finally {
                set({ isLoading: false, _fetchPromise: null });
            }
        })();

        set({ _fetchPromise: promise });
        return promise;
    }
}));
