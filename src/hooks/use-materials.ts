"use client";

import { createClient } from "@/utils/supabase/client";
import { useAuth } from "./use-auth";
import { useUiText } from "@/hooks/use-ui-text";
import { toast } from "sonner";
import { deleteById, isDeleteNoRows } from "@/lib/supabase/delete-by-id";
import { useMaterialStore, Material } from "@/stores/material-store";
import { useEffect } from "react";

export type { Material };

import { generateMaterialIdLocal } from "@/lib/constants/material-categories";

const generateNewId = async (supabase: any, tenantId: string, mainCategory: string, midCategory?: string) => {
  const { data } = await supabase
    .from('materials')
    .select('id')
    .eq('tenant_id', tenantId);
    
  const existingIds = data ? data.map((d: any) => d.id) : [];
  return generateMaterialIdLocal(existingIds, mainCategory, midCategory, '1');
};

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
      const newId = await generateNewId(supabase, tenantId, data.main_category || '', data.mid_category);
      const { data: inserted, error } = await supabase
        .from("materials")
        .insert([
          {
            ...data,
            id: newId,
            tenant_id: tenantId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // 자재->상품 자동 연동 (그림자 복사)
      if (data.is_product && data.linked_product_category) {
        const { error: prodError } = await supabase
          .from("products")
          .insert([
            {
              id: newId, // 자재와 동일한 ID 사용 (연결 고리)
              tenant_id: tenantId,
              name: data.name,
              main_category: data.linked_product_category,
              mid_category: "기타",
              price: data.price || 0,
              stock: data.stock || 0,
              code: newId,
              supplier: data.supplier,
              supplier_id: data.supplier_id,
              status: "active",
              extra_data: { from_material: true, material_category: data.main_category },
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            }
          ]);
        if (prodError) console.error("Error creating synced product:", prodError);
      }
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

  const updateMaterial = async (id: string, data: Partial<Material>, options?: { worker?: string; logMemo?: string }): Promise<Material | null> => {
    if (!tenantId) return null;
    try {
      const oldMaterial = materials.find(m => m.id === id);
      let targetId = id;
      let updated: any;
      
      // 잘못된 규칙의 ID(new-id, UUID 등)인 경우 새로 발급하여 교체
      if (id.length > 10 || id === 'new-id' || id.includes('-')) {
        const newId = generateMaterialIdLocal(
          materials.map(m => m.id),
          data.main_category || oldMaterial?.main_category || '기타',
          data.mid_category || oldMaterial?.mid_category,
          '1'
        );
        
        const newMaterialData = {
          ...oldMaterial,
          ...data,
          id: newId,
          tenant_id: tenantId,
          updated_at: new Date().toISOString()
        };
        
        // 1. 새 ID로 데이터 삽입
        const { data: inserted, error: insertError } = await supabase.from('materials').insert([newMaterialData]).select().single();
        if (insertError) throw insertError;
        
        // 2. 관련 로그(material_logs)의 material_id 덮어쓰기 (FK 관계가 없다면 무관, 있다면 주의)
        await supabase.from('material_logs').update({ material_id: newId }).eq('material_id', id).eq('tenant_id', tenantId);
        
        // 3. 기존 낡은 ID 삭제
        await supabase.from('materials').delete().eq('id', id).eq('tenant_id', tenantId);
        
        targetId = newId;
        updated = inserted;
      } else {
        const { data: updatedData, error } = await supabase
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
        updated = updatedData;
      }

      // 자재->상품 자동 연동 (그림자 복사) 업데이트
      if (data.is_product && data.linked_product_category) {
        const { error: prodError } = await supabase
          .from("products")
          .upsert([
            {
              id: targetId,
              tenant_id: tenantId,
              name: data.name || updated.name,
              main_category: data.linked_product_category,
              mid_category: "기타",
              price: data.price !== undefined ? data.price : updated.price,
              stock: data.stock !== undefined ? data.stock : updated.stock,
              code: targetId,
              supplier: data.supplier !== undefined ? data.supplier : updated.supplier,
              supplier_id: data.supplier_id !== undefined ? data.supplier_id : updated.supplier_id,
              status: "active",
              extra_data: { from_material: true, material_category: updated.main_category },
              updated_at: new Date().toISOString(),
            }
          ]);
        if (prodError) console.error("Error updating synced product:", prodError);
      } else if (data.is_product === false) {
        // 연동 해제 시 삭제
        await supabase.from("products").delete().eq("id", targetId).eq("tenant_id", tenantId);
      }
      // 재고가 변경되었다면 로그 기록
      if (oldMaterial && data.stock !== undefined && data.stock !== oldMaterial.stock) {
        const changeAmount = data.stock - oldMaterial.stock;
        let changeType = "ADJUST";
        if (changeAmount > 0) changeType = "IN";
        else if (changeAmount < 0) changeType = "OUT";

        await supabase.from("material_logs").insert([{
          tenant_id: tenantId,
          material_id: targetId,
          change_amount: changeAmount,
          type: changeType,
          after_stock: data.stock,
          worker: options?.worker || "시스템/스캐너",
          memo: options?.logMemo || data.memo || "재고 업데이트",
          created_at: new Date().toISOString(),
        }]);
      }

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
      const result = await deleteById(supabase, "materials", id);
      if (result.error) throw result.error;
      if (isDeleteNoRows(result)) {
        toast.error(
          tr(
            "삭제된 행이 없습니다. 권한이 없거나, 이미 삭제된 자재일 수 있습니다.",
            "No row was deleted. You may lack permission or the material was already removed.",
            "Không có dòng nào bị xóa.",
            "削除された行がありません。",
            "没有删除任何行。",
            "No se eliminó ninguna fila.",
            "Nenhuma linha foi excluída.",
            "Aucune ligne supprimée.",
            "Keine Zeile gelöscht.",
            "Строка не удалена.",
          ),
        );
        return false;
      }
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
