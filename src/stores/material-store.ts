"use client";

import { create } from "zustand";
import { createClient } from "@/utils/supabase/client";
import { DASHBOARD_LIST_PAGE_SIZE } from "@/lib/dashboard-list-limit";
import type { Material } from "@/types/material";

export type { Material };

export type MaterialGlobalStats = {
  totalTypes: number;
  totalStock: number;
  lowStock: number;
  outOfStock: number;
};

const emptyStats: MaterialGlobalStats = {
  totalTypes: 0,
  totalStock: 0,
  lowStock: 0,
  outOfStock: 0,
};

async function loadMaterialGlobalStats(tenantId: string): Promise<MaterialGlobalStats> {
  const supabase = createClient();

  // PostgREST may disallow select=col.sum() (PGRST123). One lightweight column + JS matches RLS-visible rows.
  const { data: rows, error } = await supabase
    .from("materials")
    .select("stock")
    .eq("tenant_id", tenantId);

  if (error) {
    console.warn("loadMaterialGlobalStats materials", error);
    return { ...emptyStats };
  }

  const stocks = rows ?? [];
  let totalStock = 0;
  let lowStock = 0;
  let outOfStock = 0;

  for (const r of stocks) {
    const n = Number(r.stock ?? 0);
    totalStock += n;
    if (n <= 0) outOfStock += 1;
    else if (n < 10) lowStock += 1;
  }

  return {
    totalTypes: stocks.length,
    totalStock,
    lowStock,
    outOfStock,
  };
}

interface MaterialState {
  materials: Material[];
  globalStats: MaterialGlobalStats;
  materialsTotalCount: number;
  listPage: number;
  isLoading: boolean;
  _fetchPromise: Promise<void> | null;

  setMaterials: (materials: Material[]) => void;
  addMaterial: (material: Material) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  removeMaterial: (id: string) => void;

  refreshStats: (tenantId: string) => Promise<void>;
  fetchPage: (tenantId: string, page: number) => Promise<void>;
  /** 통계 + 1페이지 */
  refresh: (tenantId: string) => Promise<void>;
  initialize: (tenantId: string) => Promise<void>;
  reloadAfterMutation: (tenantId: string) => Promise<void>;
}

export const useMaterialStore = create<MaterialState>((set, get) => ({
  materials: [],
  globalStats: emptyStats,
  materialsTotalCount: 0,
  listPage: 0,
  isLoading: false,
  _fetchPromise: null,

  setMaterials: (materials) => set({ materials }),
  addMaterial: (material) => set((state) => ({ materials: [material, ...state.materials] })),
  updateMaterial: (id, updates) =>
    set((state) => ({
      materials: state.materials.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    })),
  removeMaterial: (id) =>
    set((state) => ({
      materials: state.materials.filter((m) => m.id !== id),
    })),

  refreshStats: async (tenantId) => {
    if (!tenantId) return;
    try {
      const globalStats = await loadMaterialGlobalStats(tenantId);
      set({ globalStats });
    } catch (e) {
      console.error("refreshStats materials", e);
    }
  },

  fetchPage: async (tenantId, page) => {
    if (!tenantId) return;
    const supabase = createClient();
    const safePage = Math.max(0, page);
    const from = safePage * DASHBOARD_LIST_PAGE_SIZE;
    const to = from + DASHBOARD_LIST_PAGE_SIZE - 1;

    try {
      const { data, error, count } = await supabase
        .from("materials")
        .select("*", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true })
        .range(from, to);

      if (error) throw error;
      set({
        materials: data || [],
        listPage: safePage,
        materialsTotalCount: count ?? 0,
      });
    } catch (e) {
      console.error("fetchPage materials", e);
    }
  },

  refresh: async (tenantId) => {
    if (!tenantId) return;

    const existing = get()._fetchPromise;
    if (existing) return existing;

    const promise = (async () => {
      set({ isLoading: true });
      try {
        await get().refreshStats(tenantId);
        await get().fetchPage(tenantId, 0);
      } finally {
        set({ isLoading: false, _fetchPromise: null });
      }
    })();

    set({ _fetchPromise: promise });
    return promise;
  },

  initialize: async (tenantId) => get().refresh(tenantId),

  reloadAfterMutation: async (tenantId) => {
    if (!tenantId) return;
    await get().refreshStats(tenantId);
    await get().fetchPage(tenantId, get().listPage);
  },
}));
