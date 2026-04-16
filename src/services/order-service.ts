import { SupabaseClient } from '@supabase/supabase-js';
import { Order, OrderData } from '@/types/order';
import { subDays, startOfDay } from 'date-fns';

export const OrderService = {
  mapRowToOrder(row: any): Order {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      order_number: row.order_number,
      status: row.status,
      receipt_type: row.receipt_type,
      order_date: row.order_date,
      orderer: row.orderer || {},
      summary: row.summary || {},
      payment: row.payment || {},
      items: row.items || [],
      pickup_info: row.pickup_info || null,
      delivery_info: row.delivery_info || null,
      memo: row.memo,
      message: row.message || {},
      extra_data: row.extra_data,
      actual_delivery_cost: row.actual_delivery_cost,
      actual_delivery_cost_cash: row.actual_delivery_cost_cash,
      actual_delivery_payment_method: row.actual_delivery_payment_method,
      actual_delivery_payment_status: row.actual_delivery_payment_status,
      outsource_info: row.outsource_info,
      created_at: row.created_at,
      updated_at: row.updated_at,
      completed_at: row.completed_at,
      completed_by: row.completed_by,
      completionPhotoUrl: row.completionphotourl
    };
  },

  async fetchOrders(supabase: SupabaseClient, tenantId: string, days: number = 30, dateField: 'order_date' | 'created_at' = 'order_date'): Promise<Order[]> {
    const startDateStr = subDays(startOfDay(new Date()), days).toISOString();
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, tenant_id, order_number, status, receipt_type, order_date, 
        orderer, summary, payment, items, message, pickup_info, delivery_info, 
        memo, actual_delivery_cost, actual_delivery_cost_cash, 
        actual_delivery_payment_method, actual_delivery_payment_status,
        outsource_info, created_at, completionphotourl
      `)
      .eq('tenant_id', tenantId)
      .gte(dateField, startDateStr)
      .order(dateField, { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapRowToOrder);
  },

  async fetchOrdersByRange(supabase: SupabaseClient, tenantId: string, start: Date, end: Date, dateField: 'order_date' | 'created_at' = 'order_date'): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, tenant_id, order_number, status, receipt_type, order_date, 
        orderer, summary, payment, items, message, pickup_info, delivery_info, 
        memo, actual_delivery_cost, actual_delivery_cost_cash, 
        actual_delivery_payment_method, actual_delivery_payment_status,
        outsource_info, created_at, completionphotourl
      `)
      .eq('tenant_id', tenantId)
      .gte(dateField, start.toISOString())
      .lte(dateField, end.toISOString())
      .order(dateField, { ascending: false });

    if (error) throw error;
    return (data || []).map(this.mapRowToOrder);
  },

  async createOrder(supabase: SupabaseClient, tenantId: string, orderData: OrderData): Promise<string> {
    const orderPayload = {
      ...orderData,
      tenant_id: tenantId,
      order_number: orderData.order_number || `ORD-${Date.now()}`,
      order_date: orderData.order_date || new Date().toISOString()
    };

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert([orderPayload])
      .select()
      .single();

    if (orderError) throw orderError;

    // --- Side Effect 1: Expense for Delivery ---
    const hasDeliveryFee = (orderData.actual_delivery_cost && orderData.actual_delivery_cost > 0) || 
                          (orderData.summary.deliveryFee && orderData.summary.deliveryFee > 0);
                          
    if (orderData.receipt_type === 'delivery_reservation' && hasDeliveryFee) {
      const expenseAmount = orderData.actual_delivery_cost || orderData.summary.deliveryFee || 0;
      const carrier = orderData.delivery_info?.driverAffiliation || '자체';
      
      await supabase.from('expenses').insert([{
         tenant_id: tenantId,
         category: 'transportation',
         sub_category: '배송비',
         amount: expenseAmount,
         description: `[배송비] ${orderPayload.order_number} (${carrier})`,
         expense_date: orderData.order_date || new Date().toISOString(),
         payment_method: orderData.actual_delivery_payment_method || 'cash',
         related_order_id: order.id
      }]);
    }

    // --- Side Effect 2: Update Product Stock ---
    for (const item of orderData.items) {
      if (item.id && !item.id.startsWith('custom_')) {
        const { data: p } = await supabase.from('products').select('stock').eq('id', item.id).single();
        if (p) {
           await supabase.from('products').update({ 
             stock: Math.max(0, p.stock - item.quantity) 
           }).eq('id', item.id);
        }
      }
    }

    // --- Side Effect 3: Update Customer Stats ---
    if (orderData.orderer.id && orderData.orderer.id !== "") {
      const { data: c } = await supabase
        .from('customers')
        .select('points, total_spent, order_count')
        .eq('id', orderData.orderer.id)
        .single();

      if (c) {
         const newPoints = (c.points || 0) + (orderData.summary.pointsEarned || 0) - (orderData.summary.pointsUsed || 0);
         const newTotalSpent = (Number(c.total_spent) || 0) + (orderData.summary.total || 0);
         const newOrderCount = (c.order_count || 0) + 1;
         const newLastOrderDate = orderData.order_date || new Date().toISOString();

         await supabase.from('customers').update({ 
           points: Math.max(0, newPoints),
           total_spent: newTotalSpent,
           order_count: newOrderCount,
           last_order_date: newLastOrderDate
         }).eq('id', orderData.orderer.id);
      }
    }

    return order.id;
  },

  async updateOrder(supabase: SupabaseClient, tenantId: string, id: string, updates: Partial<OrderData>): Promise<void> {
    const { error: updateError } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (updateError) throw updateError;

    // --- Side Effect: Sync Expense with actual delivery cost ---
    const actualCost = updates.actual_delivery_cost;
    const deliveryFee = updates.summary?.deliveryFee;
    
    if ((actualCost !== undefined && actualCost > 0) || (deliveryFee !== undefined && deliveryFee > 0)) {
      const { data: existingExpenses } = await supabase
        .from('expenses')
        .select('id, amount')
        .eq('related_order_id', id)
        .eq('sub_category', '배송비')
        .limit(1);

      const expenseAmount = actualCost || deliveryFee || 0;
      
      const { data: currentOrder } = await supabase.from('orders').select('order_number, receipt_type, delivery_info, order_date, actual_delivery_payment_method').eq('id', id).single();
      
      const orderNumber = updates.order_number || currentOrder?.order_number || '주문';
      const receiptType = updates.receipt_type || currentOrder?.receipt_type;

      if (receiptType === 'delivery_reservation') {
        const carrier = updates.delivery_info?.driverAffiliation || currentOrder?.delivery_info?.driverAffiliation || '자체';
        
        if (expenseAmount > 0) {
          if (existingExpenses && existingExpenses.length > 0) {
            await supabase.from('expenses')
              .update({ 
                amount: expenseAmount,
                description: `[배송비] ${orderNumber} (${carrier})`,
                updated_at: new Date().toISOString()
              })
              .eq('id', existingExpenses[0].id);
          } else {
            await supabase.from('expenses').insert([{
              tenant_id: tenantId,
              category: 'transportation',
              sub_category: '배송비',
              amount: expenseAmount,
              description: `[배송비] ${orderNumber} (${carrier})`,
              expense_date: updates.order_date || currentOrder?.order_date || new Date().toISOString(),
              payment_method: updates.actual_delivery_payment_method || currentOrder?.actual_delivery_payment_method || 'cash',
              related_order_id: id
            }]);
          }
        } else if (existingExpenses && existingExpenses.length > 0) {
          await supabase.from('expenses')
            .delete()
            .eq('id', existingExpenses[0].id);
        }
      }
    }
  },

  async deleteOrder(supabase: SupabaseClient, tenantId: string, id: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)
      .eq('tenant_id', tenantId);

    if (error) throw error;
  }
};
