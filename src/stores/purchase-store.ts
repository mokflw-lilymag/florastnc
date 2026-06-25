"use client";

import { create } from 'zustand';
import { createClient } from '@/utils/supabase/client';
import type { Purchase } from '@/types/purchase';

export type { Purchase };

interface PurchaseState {
    purchases: Purchase[];
    isLoading: boolean;
    _initialized: boolean;
    _fetchPromise: Promise<void> | null;
    
    setPurchases: (purchases: Purchase[]) => void;
    addPurchase: (purchase: Purchase) => void;
    addPurchases: (newItems: Purchase[]) => void;
    updatePurchase: (id: string, updates: Partial<Purchase>) => void;
    removePurchase: (id: string) => void;
    
    initialize: (tenantId: string) => Promise<void>;
    refresh: (tenantId: string) => Promise<void>;
}


export const usePurchaseStore = create<PurchaseState>((set, get) => ({
    purchases: [],
    isLoading: false,
    _initialized: false,
    _fetchPromise: null,

    setPurchases: (purchases) => set({ purchases }),
    addPurchase: (purchase) => set((state) => ({ purchases: [purchase, ...state.purchases] })),
    addPurchases: (newItems) => set((state) => ({ purchases: [...newItems, ...state.purchases] })),
    updatePurchase: (id, updates) => set((state) => ({
        purchases: state.purchases.map(p => p.id === id ? { ...p, ...updates } : p)
    })),
    removePurchase: (id) => set((state) => ({
        purchases: state.purchases.filter(p => p.id !== id)
    })),

    initialize: async (tenantId) => {
        if (get()._initialized || !tenantId) return;
        return get().refresh(tenantId);
    },

    refresh: async (tenantId) => {
        if (!tenantId) return;
        set({ isLoading: true });
        try {
            const supabase = createClient();
            const { data: purchasesData, error } = await supabase
                .from('purchases')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const { data: expensesData } = await supabase
                .from('expenses')
                .select('id, receipt_url, receipt_file_id')
                .eq('tenant_id', tenantId);

            const expenseMap = new Map<string, { receipt_url?: string; receipt_file_id?: string }>();
            expensesData?.forEach((exp) => {
                expenseMap.set(exp.id, {
                    receipt_url: exp.receipt_url || undefined,
                    receipt_file_id: exp.receipt_file_id || undefined,
                });
            });

            const mappedPurchases = (purchasesData || []).map((p: any) => ({
                ...p,
                expense: p.expense_id ? expenseMap.get(p.expense_id) || null : null
            }));

            set({ purchases: mappedPurchases, _initialized: true });
        } catch (error) {
            console.error("Error refreshing purchases:", error);
        } finally {
            set({ isLoading: false, _fetchPromise: null });
        }
    }


}));
