"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import { Order, OrderData } from '@/types/order';

export function useOrders(initialFetch = true) {
  const supabase = createClient();
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
  }>({ type: 'default', days: 60 });

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
    created_at: row.created_at,
    updated_at: row.updated_at,
    completed_at: row.completed_at,
    completed_by: row.completed_by
  }), []);

  const fetchOrders = useCallback(async (days: number = 60) => {
    if (!tenantId) return;

    try {
      lastFetchParamsRef.current = { type: 'default', days };
      if (orders.length === 0) setLoading(true);
      else setIsRefreshing(true);

      const startDateStr = subDays(startOfDay(new Date()), days).toISOString();

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('order_date', startDateStr)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders((data || []).map(mapRowToOrder));
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [tenantId, orders.length, mapRowToOrder, supabase]);

  const fetchOrdersByRange = useCallback(async (start: Date, end: Date) => {
    if (!tenantId) return;

    try {
      lastFetchParamsRef.current = { type: 'range', start, end };
      setLoading(true);

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('order_date', start.toISOString())
        .lte('order_date', end.toISOString())
        .order('order_date', { ascending: false });

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
      return true;
    } catch (error) {
      console.error('Error updating order:', error);
      return false;
    } finally {
      setLoading(false);
    }
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
    if (initialFetch && tenantId) {
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
  }, [tenantId, initialFetch, fetchOrders, mapRowToOrder, supabase]);

  return {
    orders,
    loading: loading || authLoading,
    isRefreshing,
    fetchOrders,
    fetchOrdersByRange,
    addOrder,
    updateOrder,
    updateOrderStatus,
    cancelOrder,
    deleteOrder
  };
}
