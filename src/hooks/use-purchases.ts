import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';
import { usePurchaseStore, Purchase } from '@/stores/purchase-store';
import { useMaterialStore } from '@/stores/material-store';
import { useEffect } from 'react';

export type { Purchase };

export function usePurchases() {
  const supabase = createClient();
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
    if (tenantId) await usePurchaseStore.getState().initialize(tenantId);
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
      const payloads = items.map(item => ({ ...item, tenant_id: tenantId }));
      const { data: inserted, error } = await supabase
        .from('purchases')
        .insert(payloads)
        .select();

      if (error) throw error;
      
      if (inserted) {
        addBatchToStore(inserted);
        
        // If any items are completed, we need to create expense records and update materials
        const completedItems = inserted.filter(p => p.status === 'completed');
        if (completedItems.length > 0) {
            for (const p of completedItems) {
                // 1. Create Expense
                const expensePayload = {
                  tenant_id: tenantId,
                  category: 'materials',
                  amount: p.total_price,
                  description: `[매입확정] ${p.name || '자재 사입'}`,
                  expense_date: p.purchase_date || new Date().toISOString(),
                  payment_method: p.payment_method || 'card',
                  supplier_id: p.supplier_id,
                  material_id: p.material_id,
                  quantity: p.quantity,
                  purchase_id: p.id 
                };
                
                const { data: exp, error: expErr } = await supabase
                  .from('expenses')
                  .insert([expensePayload])
                  .select()
                  .single();
                  
                if (expErr) console.error("Expense creation error for batch item:", expErr);
                else {
                    // Update the purchase with the expense link
                    await supabase
                      .from('purchases')
                      .update({ expense_id: exp.id })
                      .eq('id', p.id);
                    
                    // CRITICAL: Update local store to track the expense_id for cancellation
                    updatePurchaseInStore(p.id, { expense_id: exp.id });
                }

                // 2. Update Material Stock
                if (p.material_id) {
                    const { data: material } = await supabase
                      .from('materials')
                      .select('stock, price')
                      .eq('id', p.material_id)
                      .single();
                      
                    if (material) {
                        const newStock = (Number(material.stock) || 0) + (p.quantity || 0);
                        const unitPrice = p.quantity > 0 ? Math.round(p.total_price / p.quantity) : Number(material.price);
                        
                        await supabase
                          .from('materials')
                          .update({ 
                            stock: newStock, 
                            current_stock: newStock, 
                            price: unitPrice,
                            updated_at: new Date().toISOString() 
                          })
                          .eq('id', p.material_id);
                        
                        useMaterialStore.getState().updateMaterial(p.material_id, { 
                          stock: newStock, 
                          current_stock: newStock,
                          price: unitPrice
                        });
                    }
                }
            }
        }
      }
      
      toast.success(`${inserted?.length}건의 매입 내역이 등록되었습니다.`);
      return inserted;
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

      // 1. Create Expense
      const expensePayload = {
        tenant_id: tenantId,
        category: 'materials',
        amount: actualData.total_price ?? purchase.total_price,
        description: `[매입확정] ${actualData.name ?? purchase.name ?? '자재 사입'}`,
        expense_date: new Date().toISOString(),
        payment_method: actualData.payment_method ?? purchase.payment_method ?? 'card',
        supplier_id: purchase.supplier_id,
        material_id: purchase.material_id,
        quantity: actualData.quantity ?? purchase.quantity,
        purchase_id: id 
      };

      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert([expensePayload])
        .select()
        .single();

      if (expenseError) throw expenseError;

      // 2. Update Purchase
      const purchaseUpdates = {
        ...actualData,
        status: 'completed' as const,
        expense_id: expense.id,
        purchase_date: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: updatedPurchase, error: purchaseError } = await supabase
        .from('purchases')
        .update(purchaseUpdates)
        .eq('id', id)
        .select()
        .single();

      if (purchaseError) throw purchaseError;
      if (updatedPurchase) updatePurchaseInStore(id, updatedPurchase);

      // 3. Update Material Inventory if applicable
      if (purchase.material_id) {
          const { data: material } = await supabase
            .from('materials')
            .select('stock')
            .eq('id', purchase.material_id)
            .single();
            
          if (material) {
              const newStock = (Number(material.stock) || 0) + (actualData.quantity ?? purchase.quantity);
              await supabase
                .from('materials')
                .update({ stock: newStock, current_stock: newStock, updated_at: new Date().toISOString() })
                .eq('id', purchase.material_id);
              
              // Update Material Store as well
              useMaterialStore.getState().updateMaterial(purchase.material_id, { stock: newStock, current_stock: newStock });
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
      if (!purchase || purchase.status !== 'completed') throw new Error('Validated purchase not found');

      // 1. Revert Purchase Status and Disconnect Expense FIRST (to avoid FK constraint error)
      const { data: reverted, error } = await supabase
        .from('purchases')
        .update({ 
            status: 'planned' as const, 
            purchase_date: null, 
            expense_id: null,
            updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // 2. Delete associated Expense (Now safe to delete)
      if (purchase.expense_id) {
          const { error: expError } = await supabase
            .from('expenses')
            .delete()
            .eq('id', purchase.expense_id);
          if (expError) console.error("Error deleting linked expense:", expError);
      }

      // 3. Reverse Material Stock
      if (purchase.material_id) {
          const { data: material } = await supabase
            .from('materials')
            .select('stock')
            .eq('id', purchase.material_id)
            .single();
            
          if (material) {
              const newStock = Math.max(0, (Number(material.stock) || 0) - (purchase.quantity || 0));
              await supabase
                .from('materials')
                .update({ stock: newStock, current_stock: newStock, updated_at: new Date().toISOString() })
                .eq('id', purchase.material_id);
              
              useMaterialStore.getState().updateMaterial(purchase.material_id, { stock: newStock, current_stock: newStock });
          }
      }

      if (reverted) updatePurchaseInStore(id, reverted);

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
