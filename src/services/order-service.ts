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
      summary: {
        total: Number(row.summary?.total || 0),
        subtotal: Number(row.summary?.subtotal || 0),
        deliveryFee: Number(row.summary?.deliveryFee || 0),
        discountAmount: Number(row.summary?.discountAmount || 0),
        discountRate: Number(row.summary?.discountRate || 0),
        pointsEarned: Number(row.summary?.pointsEarned || 0),
        pointsUsed: Number(row.summary?.pointsUsed || 0),
      },
      payment: row.payment || {},
      items: row.items || [],
      pickup_info: row.pickup_info || null,
      delivery_info: row.delivery_info || null,
      delivery_provider: row.delivery_provider,
      delivery_tracking_id: row.delivery_tracking_id,
      delivery_tracking_url: row.delivery_tracking_url,
      delivery_provider_status: row.delivery_provider_status,
      delivery_provider_fee: row.delivery_provider_fee,
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
        delivery_provider, delivery_tracking_id, delivery_tracking_url, delivery_provider_status, delivery_provider_fee,
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
        delivery_provider, delivery_tracking_id, delivery_tracking_url, delivery_provider_status, delivery_provider_fee,
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

  async fetchOrdersPaginated(
    supabase: SupabaseClient, 
    tenantId: string, 
    start: Date, 
    end: Date, 
    dateField: 'order_date' | 'created_at' = 'order_date',
    page: number = 1,
    limit: number = 50,
    filters: { status?: string; receiptType?: string; searchTerm?: string } = {}
  ): Promise<{ orders: Order[], count: number }> {
    let query = supabase
      .from('orders')
      .select(`
        id, tenant_id, order_number, status, receipt_type, order_date, 
        orderer, summary, payment, items, message, pickup_info, delivery_info, 
        delivery_provider, delivery_tracking_id, delivery_tracking_url, delivery_provider_status, delivery_provider_fee,
        memo, actual_delivery_cost, actual_delivery_cost_cash, 
        actual_delivery_payment_method, actual_delivery_payment_status,
        outsource_info, created_at, completionphotourl
      `, { count: 'exact' })
      .eq('tenant_id', tenantId)
      .gte(dateField, start.toISOString())
      .lte(dateField, end.toISOString());

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters.receiptType && filters.receiptType !== 'all') {
      query = query.eq('receipt_type', filters.receiptType);
    }
    if (filters.searchTerm) {
      const term = filters.searchTerm;
      query = query.or(`order_number.ilike.%${term}%,orderer->>name.ilike.%${term}%,orderer->>contact.ilike.%${term}%,delivery_info->>recipientName.ilike.%${term}%,delivery_info->>address.ilike.%${term}%`);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .order(dateField, { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { 
      orders: (data || []).map(this.mapRowToOrder),
      count: count || 0
    };
  },

  async fetchOrderStats(
    supabase: SupabaseClient, 
    tenantId: string, 
    start: Date, 
    end: Date, 
    dateField: 'order_date' | 'created_at' = 'order_date'
  ) {
    const { data, error } = await supabase
      .from('orders')
      .select('status, summary, order_date')
      .eq('tenant_id', tenantId)
      .gte(dateField, start.toISOString())
      .lte(dateField, end.toISOString());

    if (error) throw error;
    return data || [];
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

    // --- Side Effect 4: Trigger Print Job ---
    try {
      const { enqueuePrintJob } = await import('@/lib/print-service');
      let mappedOrderType: 'store' | 'pickup' | 'delivery' = 'store';
      if (orderData.receipt_type === 'delivery_reservation') mappedOrderType = 'delivery';
      else if (orderData.receipt_type === 'pickup_reservation') mappedOrderType = 'pickup';
      
      await enqueuePrintJob(supabase, tenantId, order.id, mappedOrderType, orderPayload, false);
    } catch (e) {
      console.error('Failed to trigger print job', e);
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
    // We handle two separate expenses: Card (actual_delivery_cost) and Cash (actual_delivery_cost_cash)
    const { data: currentOrder } = await supabase.from('orders').select('order_number, receipt_type, delivery_info, order_date, actual_delivery_cost, actual_delivery_cost_cash').eq('id', id).single();
    
    const orderNumber = updates.order_number || currentOrder?.order_number || '알수없음';
    const receiptType = updates.receipt_type || currentOrder?.receipt_type;
    
    if (receiptType === 'delivery_reservation') {
      const carrier = updates.delivery_info?.driverAffiliation || currentOrder?.delivery_info?.driverAffiliation || '기사';
      const expenseDate = updates.order_date || currentOrder?.order_date || new Date().toISOString();

      // 1. Sync Card Cost
      const cardCost = updates.hasOwnProperty('actual_delivery_cost') ? updates.actual_delivery_cost : currentOrder?.actual_delivery_cost;
      
      if (cardCost && cardCost > 0) {
        const { data: existingCard } = await supabase.from('expenses').select('id').eq('related_order_id', id).eq('sub_category', '배송비(카드)').limit(1);
        if (existingCard && existingCard.length > 0) {
          await supabase.from('expenses').update({ amount: cardCost, description: `[배송비-카드] ${orderNumber} (${carrier})` }).eq('id', existingCard[0].id);
        } else {
          await supabase.from('expenses').insert([{
            tenant_id: tenantId, category: 'transportation', sub_category: '배송비(카드)', amount: cardCost, description: `[배송비-카드] ${orderNumber} (${carrier})`, expense_date: expenseDate, payment_method: 'card', related_order_id: id
          }]);
        }
      } else {
        await supabase.from('expenses').delete().eq('related_order_id', id).eq('sub_category', '배송비(카드)');
      }

      // 2. Sync Cash Cost
      const cashCost = updates.hasOwnProperty('actual_delivery_cost_cash') ? updates.actual_delivery_cost_cash : currentOrder?.actual_delivery_cost_cash;

      if (cashCost && cashCost > 0) {
        const { data: existingCash } = await supabase.from('expenses').select('id').eq('related_order_id', id).eq('sub_category', '배송비(기사현금)').limit(1);
        if (existingCash && existingCash.length > 0) {
          await supabase.from('expenses').update({ amount: cashCost, description: `[배송비-기사현금] ${orderNumber} (${carrier})` }).eq('id', existingCash[0].id);
        } else {
          await supabase.from('expenses').insert([{
            tenant_id: tenantId, category: 'transportation', sub_category: '배송비(기사현금)', amount: cashCost, description: `[배송비-기사현금] ${orderNumber} (${carrier})`, expense_date: expenseDate, payment_method: 'cash', related_order_id: id
          }]);
        }
      } else {
        await supabase.from('expenses').delete().eq('related_order_id', id).eq('sub_category', '배송비(기사현금)');
      }
      
      // Cleanup old '배송비' just in case to migrate properly
      await supabase.from('expenses').delete().eq('related_order_id', id).eq('sub_category', '배송비');
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
