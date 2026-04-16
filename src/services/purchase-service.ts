import { SupabaseClient } from '@supabase/supabase-js';
import { Purchase } from '@/types/purchase';

export const PurchaseService = {
  async addPurchases(supabase: SupabaseClient, tenantId: string, items: Omit<Purchase, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>[]): Promise<Purchase[]> {
    if (items.length === 0) return [];

    const payloads = items.map(item => ({ ...item, tenant_id: tenantId }));
    const { data: inserted, error } = await supabase
      .from('purchases')
      .insert(payloads)
      .select();

    if (error) throw error;
    
    const result = (inserted || []) as Purchase[];

    // Side effects for completed items in the batch
    const completedItems = result.filter(p => p.status === 'completed');
    for (const p of completedItems) {
      await this.processCompletionSideEffects(supabase, tenantId, p);
    }

    return result;
  },

  async completePurchase(supabase: SupabaseClient, tenantId: string, purchase: Purchase, actualData: Partial<Purchase>): Promise<Purchase> {
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
      purchase_id: purchase.id 
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
      .eq('id', purchase.id)
      .select()
      .single();

    if (purchaseError) throw purchaseError;

    // 3. Update Material Inventory
    if (purchase.material_id) {
        await this.updateMaterialStock(supabase, purchase.material_id, (actualData.quantity ?? purchase.quantity), (actualData.total_price ?? purchase.total_price));
    }

    return updatedPurchase as Purchase;
  },

  async cancelConfirmation(supabase: SupabaseClient, tenantId: string, purchase: Purchase): Promise<Purchase> {
    if (purchase.status !== 'completed') throw new Error('Validated purchase not found');

    // 1. Revert Purchase Status and Disconnect Expense FIRST
    const { data: reverted, error } = await supabase
      .from('purchases')
      .update({ 
          status: 'planned' as const, 
          purchase_date: null, 
          expense_id: null,
          updated_at: new Date().toISOString() 
      })
      .eq('id', purchase.id)
      .select()
      .single();

    if (error) throw error;

    // 2. Delete associated Expense
    if (purchase.expense_id) {
        await supabase
          .from('expenses')
          .delete()
          .eq('id', purchase.expense_id);
    }

    // 3. Reverse Material Stock
    if (purchase.material_id) {
        await this.revertMaterialStock(supabase, purchase.material_id, purchase.quantity);
    }

    return reverted as Purchase;
  },

  // Helper functions
  async processCompletionSideEffects(supabase: SupabaseClient, tenantId: string, p: Purchase) {
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
      
    if (!expErr && exp) {
        await supabase
          .from('purchases')
          .update({ expense_id: exp.id })
          .eq('id', p.id);
        
        p.expense_id = exp.id; // Update local object for store sync context
    }

    // 2. Update Material Stock
    if (p.material_id) {
        await this.updateMaterialStock(supabase, p.material_id, p.quantity, p.total_price);
    }
  },

  async updateMaterialStock(supabase: SupabaseClient, materialId: string, quantity: number, totalPrice: number) {
    const { data: material } = await supabase
      .from('materials')
      .select('stock, price')
      .eq('id', materialId)
      .single();
      
    if (material) {
        const newStock = (Number(material.stock) || 0) + (quantity || 0);
        const unitPrice = quantity > 0 ? Math.round(totalPrice / quantity) : Number(material.price);
        
        await supabase
          .from('materials')
          .update({ 
            stock: newStock, 
            current_stock: newStock, 
            price: unitPrice,
            updated_at: new Date().toISOString() 
          })
          .eq('id', materialId);
    }
  },

  async revertMaterialStock(supabase: SupabaseClient, materialId: string, quantity: number) {
    const { data: material } = await supabase
      .from('materials')
      .select('stock')
      .eq('id', materialId)
      .single();
      
    if (material) {
        const newStock = Math.max(0, (Number(material.stock) || 0) - (quantity || 0));
        await supabase
          .from('materials')
          .update({ stock: newStock, current_stock: newStock, updated_at: new Date().toISOString() })
          .eq('id', materialId);
    }
  }
};
