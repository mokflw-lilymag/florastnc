"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Order, OrderData } from '@/types/order';

export function useOrders(initialFetch = true) {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(initialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track the most recent fetch parameters
  const lastFetchParamsRef = useRef<{
    type: 'default' | 'range' | 'all';
    days?: number;
    start?: Date;
    end?: Date;
  }>({ type: 'default', days: 30 });

  const mapRowToOrder = useCallback((row: any): Order => ({
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
  }), []);

  const fetchOrders = useCallback(async (days: number = 30, dateField: 'order_date' | 'created_at' = 'order_date') => {
    if (!tenantId) return;

    try {
      lastFetchParamsRef.current = { type: 'default', days };
      if (orders.length === 0) setLoading(true);
      else setIsRefreshing(true);

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
      setOrders((data || []).map(mapRowToOrder));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [tenantId, mapRowToOrder, supabase]);

  const fetchOrdersByRange = useCallback(async (start: Date, end: Date, dateField: 'order_date' | 'created_at' = 'order_date') => {
    if (!tenantId) return;

    try {
      lastFetchParamsRef.current = { type: 'range', start, end };
      setLoading(true);

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
      setOrders((data || []).map(mapRowToOrder));
    } catch (error) {
      console.error('Error fetching orders by range:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, mapRowToOrder, supabase]);

  const addOrder = async (orderData: OrderData): Promise<string | null> => {
    if (!tenantId) return null;
    
    setLoading(true);
    try {
      const orderPayload = {
        ...orderData,
        tenant_id: tenantId,
        order_number: orderData.order_number || `ORD-${Date.now()}`,
        order_date: orderData.order_date || new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (error) throw error;

      // --- [NEW] CREATE EXPENSE ON ORDER CREATION ---
      // 배송 주문이고 배송비가 있는 경우 지출에 자동 추가
      // 실제 지출 배송비(actual_delivery_cost)가 있으면 그것을, 없으면 청구 배송비(summary.deliveryFee)를 사용
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
           related_order_id: data.id
        }]);
      }

      // --- [NEW] UPDATE PRODUCT STOCK ---
      try {
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
      } catch (stockErr) {
        console.error('Stock update failed:', stockErr);
      }

      // --- [NEW] UPDATE CUSTOMER STATS & POINTS ---
      if (orderData.orderer.id && orderData.orderer.id !== "") {
        try {
          // Fetch current stats and points in one go
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
        } catch (statErr) {
          console.error('Customer data update failed:', statErr);
        }
      }

      return data.id;
    } catch (error) {
      console.error('Error adding order:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const updateOrder = async (id: string, updates: Partial<OrderData>): Promise<boolean> => {
    if (!tenantId) return false;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;

      // --- [NEW] UPDATE EXPENSE ON ORDER UPDATE ---
      // 실재 배송비(actual_delivery_cost)가 업데이트되거나 배송비가 있는 경우 처리
      const actualCost = updates.actual_delivery_cost;
      const deliveryFee = updates.summary?.deliveryFee;
      
      // 실제 지불한 배송비가 있거나, 고객에게 받은 배송비가 있는 경우
      if ((actualCost !== undefined && actualCost > 0) || (deliveryFee !== undefined && deliveryFee > 0)) {
        // 기존 지출 내역 확인 (배송비 카테고리만)
        const { data: existingExpenses } = await supabase
          .from('expenses')
          .select('id, amount')
          .eq('related_order_id', id)
          .eq('sub_category', 'delivery_fee')
          .limit(1);

        const expenseAmount = actualCost || deliveryFee || 0;
        
        // 주문 정보를 가져와서 order_number와 receipt_type 확인
        const order = orders.find(o => o.id === id);
        const orderNumber = updates.order_number || order?.order_number || '주문';
        const receiptType = updates.receipt_type || order?.receipt_type;

        // 배송 예약인 경우에만 지출 생성/수정
        if (receiptType === 'delivery_reservation') {
          const carrier = updates.delivery_info?.driverAffiliation || order?.delivery_info?.driverAffiliation || '자체';
          
          if (expenseAmount > 0) {
            if (existingExpenses && existingExpenses.length > 0) {
              // 기존 지출이 있으면 금액 업데이트
              await supabase.from('expenses')
                .update({ 
                  amount: expenseAmount,
                  description: `[배송비] ${orderNumber} (${carrier})`,
                  category: 'transportation',
                  sub_category: '배송비',
                  updated_at: new Date().toISOString()
                })
                .eq('id', existingExpenses[0].id);
            } else {
              // 없으면 새로 생성
              await supabase.from('expenses').insert([{
                tenant_id: tenantId,
                category: 'transportation',
                sub_category: '배송비',
                amount: expenseAmount,
                description: `[배송비] ${orderNumber} (${carrier})`,
                expense_date: updates.order_date || order?.order_date || new Date().toISOString(),
                payment_method: updates.actual_delivery_payment_method || order?.actual_delivery_payment_method || 'cash',
                related_order_id: id
              }]);
            }
          } else if (existingExpenses && existingExpenses.length > 0) {
            // 배송비가 0으로 입력되면 기존 지출 내역 삭제
            await supabase.from('expenses')
              .delete()
              .eq('id', existingExpenses[0].id);
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Error updating order:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (id: string, status: Order['payment']['status']): Promise<boolean> => {
    // Find the order to get existing payment info
    const order = orders.find(o => o.id === id);
    if (!order) return false;
    
    const updatedPayment = {
      ...(order.payment || {}),
      status: status
    };
    
    return updateOrder(id, { payment: updatedPayment });
  };

  const updateOrderStatus = async (id: string, status: Order['status']): Promise<boolean> => {
    return updateOrder(id, { status } as any);
  };

  const cancelOrder = async (id: string): Promise<boolean> => {
    return updateOrder(id, { status: 'canceled' });
  };

  const deleteOrder = async (id: string): Promise<boolean> => {
    if (!tenantId) return false;

    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting order:', error);
      return false;
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!tenantId) {
      setLoading(false);
      return;
    }

    if (initialFetch) {
      fetchOrders();
    }

    if (!tenantId) return;

    const channel = supabase
      .channel(`orders-tenant-${tenantId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const mapped = mapRowToOrder(payload.new);
            setOrders(prev => [mapped, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            const mapped = mapRowToOrder(payload.new);
            setOrders(prev => prev.map(o => o.id === mapped.id ? mapped : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, authLoading, initialFetch, fetchOrders, mapRowToOrder, supabase]);

  return {
    orders,
    loading: loading || authLoading,
    isRefreshing,
    fetchOrders,
    fetchOrdersByRange,
    addOrder,
    updateOrder,
    updateOrderStatus,
    updatePaymentStatus,
    cancelOrder,
    deleteOrder
  };
}
