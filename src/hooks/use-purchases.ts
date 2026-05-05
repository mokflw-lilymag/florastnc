"use client";

import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { useUiText } from '@/hooks/use-ui-text';
import { toast } from 'sonner';
import { usePurchaseStore, Purchase } from '@/stores/purchase-store';
import { useMaterialStore } from '@/stores/material-store';
import { useEffect, useMemo } from 'react';
import { PurchaseService } from '@/services/purchase-service';

export type { Purchase };

export function usePurchases() {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId, isLoading: authLoading } = useAuth();
  const { tr } = useUiText();
  
  const { 
    purchases, 
    isLoading: loading, 
    initialize,
    addPurchase: addPurchaseToStore,
    addPurchases: addBatchToStore,
    updatePurchase: updatePurchaseInStore,
    removePurchase: removePurchaseFromStore
  } = usePurchaseStore();

  const fetchPurchases = async () => {
    if (tenantId) await initialize(tenantId);
  };

  const addPurchase = async (data: Omit<Purchase, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    if (!tenantId) return null;
    try {
      const { data: inserted, error } = await supabase
        .from('purchases')
        .insert([{ ...data, tenant_id: tenantId }])
        .select()
        .single();

      if (error) throw error;
      if (inserted) addPurchaseToStore(inserted);
      toast.success(
        tr(
          '매입 내역이 등록되었습니다.',
          'Purchase recorded.',
          'Đã ghi nhận mua hàng.',
          '仕入れを登録しました。',
          '已登记进货。',
          'Compra registrada.',
          'Compra registrada.',
          'Achat enregistré.',
          'Einkauf erfasst.',
          'Закупка записана.',
        ),
      );
      return inserted;
    } catch (e) {
      console.error('Error adding purchase:', e);
      toast.error(
        tr(
          '매입 내역 등록에 실패했습니다.',
          'Failed to record purchase.',
          'Ghi nhận mua hàng thất bại.',
          '仕入れの登録に失敗しました。',
          '登记进货失败。',
          'No se pudo registrar la compra.',
          'Falha ao registrar compra.',
          'Échec de l’enregistrement de l’achat.',
          'Einkauf konnte nicht erfasst werden.',
          'Не удалось записать закупку.',
        ),
      );
      return null;
    }
  };

  const addPurchases = async (items: Omit<Purchase, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>[]) => {
    if (!tenantId || items.length === 0) return null;
    try {
      const insertedItems = await PurchaseService.addPurchases(supabase, tenantId, items);
      
      if (insertedItems.length > 0) {
        addBatchToStore(insertedItems);
        
        // Update local material store for any items that were completed
        const completedItems = insertedItems.filter(p => p.status === 'completed');
        for (const p of completedItems) {
          if (p.material_id) {
            // We need to fetch the new material state or calculate it
            const { data: material } = await supabase.from('materials').select('stock, price').eq('id', p.material_id).single();
            if (material) {
              useMaterialStore.getState().updateMaterial(p.material_id, { 
                stock: material.stock, 
                current_stock: material.stock,
                price: material.price
              });
            }
          }
        }
      }
      
      toast.success(
        tr(
          `${insertedItems.length}건의 매입 내역이 등록되었습니다.`,
          `${insertedItems.length} purchases recorded.`,
          `Đã ghi nhận ${insertedItems.length} mục mua hàng.`,
          `仕入れを${insertedItems.length}件登録しました。`,
          `已登记 ${insertedItems.length} 笔进货。`,
          `Se registraron ${insertedItems.length} compras.`,
          `Foram registradas ${insertedItems.length} compras.`,
          `${insertedItems.length} achats enregistrés.`,
          `${insertedItems.length} Einkäufe erfasst.`,
          `Записано закупок: ${insertedItems.length}.`,
        ),
      );
      return insertedItems;
    } catch (e) {
      console.error('Error adding batch purchases:', e);
      toast.error(
        tr(
          '매입 내역 일괄 등록에 실패했습니다.',
          'Failed to record batch purchases.',
          'Ghi nhận hàng loạt mua hàng thất bại.',
          '仕入れの一括登録に失敗しました。',
          '批量登记进货失败。',
          'No se pudieron registrar las compras en lote.',
          'Falha ao registrar compras em lote.',
          'Échec de l’enregistrement groupé des achats.',
          'Stapel-Einkäufe konnten nicht erfasst werden.',
          'Не удалось записать пакет закупок.',
        ),
      );
      return null;
    }
  };

  const updatePurchase = async (id: string, data: Partial<Omit<Purchase, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>>) => {
    if (!tenantId) return null;
    try {
      const { data: updated, error } = await supabase
        .from('purchases')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      if (updated) updatePurchaseInStore(id, updated);
      toast.success(
        tr(
          '매입 내역이 수정되었습니다.',
          'Purchase updated.',
          'Đã cập nhật mua hàng.',
          '仕入れを更新しました。',
          '进货记录已更新。',
          'Compra actualizada.',
          'Compra atualizada.',
          'Achat mis à jour.',
          'Einkauf aktualisiert.',
          'Закупка обновлена.',
        ),
      );
      return updated;
    } catch (e) {
      console.error('Error updating purchase:', e);
      toast.error(
        tr(
          '매입 내역 수정에 실패했습니다.',
          'Failed to update purchase.',
          'Cập nhật mua hàng thất bại.',
          '仕入れの更新に失敗しました。',
          '更新进货失败。',
          'No se pudo actualizar la compra.',
          'Falha ao atualizar compra.',
          'Échec de la mise à jour de l’achat.',
          'Einkauf konnte nicht aktualisiert werden.',
          'Не удалось обновить закупку.',
        ),
      );
      return null;
    }
  };

  const deletePurchase = async (id: string) => {
    try {
      const { error } = await supabase
        .from('purchases')
        .delete()
        .eq('id', id);

      if (error) throw error;
      removePurchaseFromStore(id);
      toast.success(
        tr(
          '매입 내역이 삭제되었습니다.',
          'Purchase deleted.',
          'Đã xóa mua hàng.',
          '仕入れを削除しました。',
          '已删除进货记录。',
          'Compra eliminada.',
          'Compra excluída.',
          'Achat supprimé.',
          'Einkauf gelöscht.',
          'Закупка удалена.',
        ),
      );
      return true;
    } catch (e) {
      console.error('Error deleting purchase:', e);
      toast.error(
        tr(
          '매입 내역 삭제에 실패했습니다.',
          'Failed to delete purchase.',
          'Xóa mua hàng thất bại.',
          '仕入れの削除に失敗しました。',
          '删除进货失败。',
          'No se pudo eliminar la compra.',
          'Falha ao excluir compra.',
          'Échec de la suppression de l’achat.',
          'Einkauf konnte nicht gelöscht werden.',
          'Не удалось удалить закупку.',
        ),
      );
      return false;
    }
  };

  const completePurchase = async (id: string, actualData: Partial<Purchase>) => {
    if (!tenantId) return null;
    try {
      const purchase = purchases.find(p => p.id === id);
      if (!purchase) throw new Error('Purchase not found');

      const updatedPurchase = await PurchaseService.completePurchase(supabase, tenantId, purchase, actualData);
      
      if (updatedPurchase) {
        updatePurchaseInStore(id, updatedPurchase);
        
        // Update Material Store
        if (purchase.material_id) {
            const { data: material } = await supabase.from('materials').select('stock').eq('id', purchase.material_id).single();
            if (material) {
                useMaterialStore.getState().updateMaterial(purchase.material_id, { stock: material.stock, current_stock: material.stock });
            }
        }
      }

      toast.success(
        tr(
          '매입이 확정되었으며 지출에 반영되었습니다.',
          'Purchase confirmed and reflected in expenses.',
          'Đã xác nhận mua hàng và phản ánh vào chi phí.',
          '仕入れを確定し、支出に反映しました。',
          '进货已确认并计入支出。',
          'Compra confirmada y reflejada en gastos.',
          'Compra confirmada e refletida nas despesas.',
          'Achat confirmé et reflété dans les dépenses.',
          'Einkauf bestätigt und in Ausgaben übernommen.',
          'Закупка подтверждена и отражена в расходах.',
        ),
      );
      return updatedPurchase;
    } catch (e) {
      console.error('Error completing purchase:', e);
      toast.error(
        tr(
          '매입 확정에 실패했습니다.',
          'Failed to confirm purchase.',
          'Xác nhận mua hàng thất bại.',
          '仕入れの確定に失敗しました。',
          '确认进货失败。',
          'No se pudo confirmar la compra.',
          'Falha ao confirmar compra.',
          'Échec de la confirmation de l’achat.',
          'Einkauf konnte nicht bestätigt werden.',
          'Не удалось подтвердить закупку.',
        ),
      );
      return null;
    }
  };

  const completeBatch = async (batchId: string, updates: Partial<Purchase>) => {
    if (!tenantId) return;
    const batchItems = purchases.filter(p => p.batch_id === batchId && p.status === 'planned');
    if (batchItems.length === 0) {
        toast.info(
          tr(
            '확정할 예정인 품목이 없습니다.',
            'No planned items to confirm.',
            'Không có mục dự kiến để xác nhận.',
            '確定する予定の項目がありません。',
            '没有待确认的计划项。',
            'No hay partidas planificadas para confirmar.',
            'Não há itens planejados para confirmar.',
            'Aucune ligne planifiée à confirmer.',
            'Keine geplanten Positionen zur Bestätigung.',
            'Нет запланированных позиций для подтверждения.',
          ),
        );
        return;
    }

    try {
        for (const item of batchItems) {
            await completePurchase(item.id, updates);
        }
        toast.success(
          tr(
            `${batchItems.length}건의 매입을 모두 확정했습니다.`,
            `Confirmed all ${batchItems.length} purchases.`,
            `Đã xác nhận tất cả ${batchItems.length} mục mua hàng.`,
            `仕入れ${batchItems.length}件をすべて確定しました。`,
            `已确认全部 ${batchItems.length} 笔进货。`,
            `Se confirmaron las ${batchItems.length} compras.`,
            `Todas as ${batchItems.length} compras foram confirmadas.`,
            `Tous les ${batchItems.length} achats ont été confirmés.`,
            `Alle ${batchItems.length} Einkäufe bestätigt.`,
            `Подтверждено закупок: ${batchItems.length}.`,
          ),
        );
    } catch (error) {
        console.error("Error completing batch:", error);
        toast.error(
          tr(
            '일괄 확정 중 오류가 발생했습니다.',
            'Error while confirming batch.',
            'Lỗi khi xác nhận hàng loạt.',
            '一括確定中にエラーが発生しました。',
            '批量确认时出错。',
            'Error al confirmar el lote.',
            'Erro ao confirmar em lote.',
            'Erreur lors de la confirmation groupée.',
            'Fehler bei der Stapelbestätigung.',
            'Ошибка при пакетном подтверждении.',
          ),
        );
    }
  };

  const cancelPurchaseConfirmation = async (id: string) => {
    if (!tenantId) return null;
    try {
      const purchase = purchases.find(p => p.id === id);
      if (!purchase) throw new Error('Validated purchase not found');

      const reverted = await PurchaseService.cancelConfirmation(supabase, tenantId, purchase);

      if (reverted) {
        updatePurchaseInStore(id, reverted);
        
        // Reverse Material Store
        if (purchase.material_id) {
            const { data: material } = await supabase.from('materials').select('stock').eq('id', purchase.material_id).single();
            if (material) {
                useMaterialStore.getState().updateMaterial(purchase.material_id, { stock: material.stock, current_stock: material.stock });
            }
        }
      }

      toast.success(
        tr(
          '매입 확정이 취소되었으며 지출/재고가 복구되었습니다.',
          'Confirmation canceled; expenses and stock restored.',
          'Đã hủy xác nhận; khôi phục chi phí và tồn kho.',
          '確定を取り消し、支出・在庫を復元しました。',
          '已取消确认，并恢复支出与库存。',
          'Confirmación anulada; gastos y stock restaurados.',
          'Confirmação cancelada; despesas e estoque restaurados.',
          'Confirmation annulée ; dépenses et stock restaurés.',
          'Bestätigung aufgehoben; Ausgaben und Bestand wiederhergestellt.',
          'Подтверждение отменено; расходы и склад восстановлены.',
        ),
      );
      return reverted;
    } catch (e) {
      console.error('Error canceling confirmation:', e);
      toast.error(
        tr(
          '확정 취소에 실패했습니다.',
          'Failed to cancel confirmation.',
          'Hủy xác nhận thất bại.',
          '確定の取り消しに失敗しました。',
          '取消确认失败。',
          'No se pudo anular la confirmación.',
          'Falha ao cancelar confirmação.',
          'Échec de l’annulation de la confirmation.',
          'Bestätigung konnte nicht aufgehoben werden.',
          'Не удалось отменить подтверждение.',
        ),
      );
      return null;
    }
  };

  const cancelBatchConfirmation = async (batchId: string) => {
    const batchItems = purchases.filter(p => p.batch_id === batchId && p.status === 'completed');
    if (batchItems.length === 0) return;

    try {
        for (const item of batchItems) {
            await cancelPurchaseConfirmation(item.id);
        }
    } catch (error) {
        console.error("Error canceling batch:", error);
    }
  };

  useEffect(() => {
    if (!authLoading && tenantId) {
      initialize(tenantId);
    }
  }, [authLoading, tenantId, initialize]);

  return {
    purchases,
    loading: loading || authLoading,
    fetchPurchases,
    addPurchase,
    addPurchases,
    updatePurchase,
    deletePurchase,
    completePurchase,
    completeBatch,
    cancelPurchaseConfirmation,
    cancelBatchConfirmation
  };
}
