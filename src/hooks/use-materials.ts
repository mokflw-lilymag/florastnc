import { createClient } from "@/utils/supabase/client";
import { useAuth } from "./use-auth";
import { toast } from "sonner";
import { useMaterialStore, Material } from "@/stores/material-store";
import { useEffect } from "react";

export type { Material };

export function useMaterials() {
  const supabase = createClient();
  const { tenantId } = useAuth();

  const {
    materials,
    globalStats: stats,
    materialsTotalCount,
    listPage,
    isLoading: loading,
    initialize,
    refresh,
    fetchPage,
    reloadAfterMutation,
  } = useMaterialStore();

  const fetchMaterials = async () => {
    if (tenantId) await refresh(tenantId);
  };

  const setListPage = async (page: number) => {
    if (!tenantId) return;
    await fetchPage(tenantId, page);
  };

  const addMaterial = async (data: Partial<Material>): Promise<Material | null> => {
    if (!tenantId) return null;
    try {
      const { data: inserted, error } = await supabase
        .from("materials")
        .insert([
          {
            ...data,
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;
      await reloadAfterMutation(tenantId);
      toast.success("새 자재가 추가되었습니다.");
      return inserted as Material;
    } catch (error) {
      console.error("Error adding material:", error);
      toast.error("자재 추가 실패");
      return null;
    }
  };

  const updateMaterial = async (id: string, data: Partial<Material>): Promise<Material | null> => {
    if (!tenantId) return null;
    try {
      const { data: updated, error } = await supabase
        .from("materials")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select()
        .single();

      if (error) throw error;
      await reloadAfterMutation(tenantId);
      toast.success("자재 정보가 수정되었습니다.");
      return updated as Material;
    } catch (error) {
      console.error("Error updating material:", error);
      toast.error("자재 수정 실패");
      return null;
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!tenantId) return false;
    try {
      const { error } = await supabase.from("materials").delete().eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
      await reloadAfterMutation(tenantId);
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
    materialsTotalCount,
    listPage,
    setListPage,
    fetchMaterials,
    addMaterial,
    updateMaterial,
    deleteMaterial,
  };
}
