"use client";

import { createClient } from "@/utils/supabase/client";
import { useAuth } from "./use-auth";
import { useUiText } from "@/hooks/use-ui-text";
import { toast } from "sonner";
import { useMaterialStore, Material } from "@/stores/material-store";
import { useEffect } from "react";

export type { Material };

export function useMaterials() {
  const supabase = createClient();
  const { tenantId } = useAuth();
  const { tr } = useUiText();

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
      toast.success(
        tr(
          "새 자재가 추가되었습니다.",
          "Material added.",
          "Đã thêm nguyên vật liệu.",
          "資材を追加しました。",
          "已添加物料。",
          "Material añadido.",
          "Material adicionado.",
          "Matière ajoutée.",
          "Material hinzugefügt.",
          "Материал добавлен.",
        ),
      );
      return inserted as Material;
    } catch (error) {
      console.error("Error adding material:", error);
      toast.error(
        tr(
          "자재 추가 실패",
          "Failed to add material.",
          "Thêm nguyên vật liệu thất bại.",
          "資材の追加に失敗しました。",
          "添加物料失败。",
          "No se pudo añadir el material.",
          "Falha ao adicionar material.",
          "Échec de l’ajout de la matière.",
          "Material konnte nicht hinzugefügt werden.",
          "Не удалось добавить материал.",
        ),
      );
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
      toast.success(
        tr(
          "자재 정보가 수정되었습니다.",
          "Material updated.",
          "Đã cập nhật nguyên vật liệu.",
          "資材を更新しました。",
          "物料信息已更新。",
          "Material actualizado.",
          "Material atualizado.",
          "Matière mise à jour.",
          "Material aktualisiert.",
          "Материал обновлён.",
        ),
      );
      return updated as Material;
    } catch (error) {
      console.error("Error updating material:", error);
      toast.error(
        tr(
          "자재 수정 실패",
          "Failed to update material.",
          "Cập nhật nguyên vật liệu thất bại.",
          "資材の更新に失敗しました。",
          "更新物料失败。",
          "No se pudo actualizar el material.",
          "Falha ao atualizar material.",
          "Échec de la mise à jour.",
          "Material konnte nicht aktualisiert werden.",
          "Не удалось обновить материал.",
        ),
      );
      return null;
    }
  };

  const deleteMaterial = async (id: string) => {
    if (!tenantId) return false;
    try {
      const { error } = await supabase.from("materials").delete().eq("id", id).eq("tenant_id", tenantId);
      if (error) throw error;
      await reloadAfterMutation(tenantId);
      toast.success(
        tr(
          "자재가 삭제되었습니다.",
          "Material deleted.",
          "Đã xóa nguyên vật liệu.",
          "資材を削除しました。",
          "已删除物料。",
          "Material eliminado.",
          "Material excluído.",
          "Matière supprimée.",
          "Material gelöscht.",
          "Материал удалён.",
        ),
      );
      return true;
    } catch (error) {
      console.error("Error deleting material:", error);
      toast.error(
        tr(
          "자재 삭제 실패",
          "Failed to delete material.",
          "Xóa nguyên vật liệu thất bại.",
          "資材の削除に失敗しました。",
          "删除物料失败。",
          "No se pudo eliminar el material.",
          "Falha ao excluir material.",
          "Échec de la suppression.",
          "Material konnte nicht gelöscht werden.",
          "Не удалось удалить материал.",
        ),
      );
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
