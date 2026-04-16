import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';
import { usePurchaseStore, Purchase } from '@/stores/purchase-store';
import { useMaterialStore } from '@/stores/material-store';
import { useEffect, useMemo } from 'react';
import { PurchaseService } from '@/services/purchase-service';

export type { Purchase };

export function usePurchases() {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId, isLoading: authLoading } = useAuth();
  
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
      toast.success('매입 내역이 등록되었습니다.');
      return inserted;
    } catch (e) {
      console.error('Error adding purchase:', e);
      toast.error('매입 내역 등록에 실패했습니다.');
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
      
      toast.success(`${insertedItems.length}건의 매입 내역이 등록되었습니다.`);
      return insertedItems;
    } catch (e) {
      console.error('Error adding batch purchases:', e);
      toast.error('매입 내역 일괄 등록에 실패했습니다.');
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
      toast.success('매입 내역이 수정되었습니다.');
      return updated;
    } catch (e) {
      console.error('Error updating purchase:', e);
      toast.error('매입 내역 수정에 실패했습니다.');
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
      toast.success('매입 내역이 삭제되었습니다.');
      return true;
    } catch (e) {
      console.error('Error deleting purchase:', e);
      toast.error('매입 내역 삭제에 실패했습니다.');
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

      toast.success('매입이 확정되었으며 지출에 반영되었습니다.');
      return updatedPurchase;
    } catch (e) {
      console.error('Error completing purchase:', e);
      toast.error('매입 확정에 실패했습니다.');
      return null;
    }
  };

  const completeBatch = async (batchId: string, updates: Partial<Purchase>) => {
    if (!tenantId) return;
    const batchItems = purchases.filter(p => p.batch_id === batchId && p.status === 'planned');
    if (batchItems.length === 0) {
        toast.info('확정할 예정인 품목이 없습니다.');
        return;
    }

    try {
        for (const item of batchItems) {
            await completePurchase(item.id, updates);
        }
        toast.success(`${batchItems.length}건의 매입을 모두 확정했습니다.`);
    } catch (error) {
        console.error("Error completing batch:", error);
        toast.error("일괄 확정 중 오류가 발생했습니다.");
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

      toast.success('매입 확정이 취소되었으며 지출/재고가 복구되었습니다.');
      return reverted;
    } catch (e) {
      console.error('Error canceling confirmation:', e);
      toast.error('확정 취소에 실패했습니다.');
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
