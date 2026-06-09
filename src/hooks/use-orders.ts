import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { useSettings } from './use-settings';
import { Order, OrderData } from '@/types/order';
import { OrderService } from '@/services/order-service';

export function useOrders(initialFetch = true) {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId, isLoading: authLoading } = useAuth();
  const { settings } = useSettings();
  const [orders, setOrders] = useState<Order[]>([]);
  const [paginatedOrders, setPaginatedOrders] = useState<Order[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(initialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track the most recent fetch parameters
  const lastFetchParamsRef = useRef<{
    type: 'default' | 'range' | 'all';
    days?: number;
    start?: Date;
    end?: Date;
  }>({ type: 'default', days: 30 });

  const fetchOrders = useCallback(async (days: number = 30, dateField: 'order_date' | 'created_at' = 'order_date') => {
    if (!tenantId) return;

    try {
      lastFetchParamsRef.current = { type: 'default', days };
      if (orders.length === 0) setLoading(true);
      else setIsRefreshing(true);

      const data = await OrderService.fetchOrders(supabase, tenantId, days, dateField);
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [tenantId, supabase, orders.length]);

  const fetchOrdersByRange = useCallback(async (start: Date, end: Date, dateField: 'order_date' | 'created_at' = 'order_date') => {
    if (!tenantId) return;

    try {
      lastFetchParamsRef.current = { type: 'range', start, end };
      setLoading(true);

      const data = await OrderService.fetchOrdersByRange(supabase, tenantId, start, end, dateField);
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders by range:', error);
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  const fetchPaginatedList = useCallback(async (
    start: Date, 
    end: Date, 
    page: number = 1, 
    limit: number = 50,
    filters: { status?: string; receiptType?: string; searchTerm?: string } = {},
    dateField: 'order_date' | 'created_at' = 'order_date'
  ) => {
    if (!tenantId) return;
    try {
      setLoading(true);
      const { orders: newOrders, count } = await OrderService.fetchOrdersPaginated(
        supabase, tenantId, start, end, dateField, page, limit, filters
      );
      if (page === 1) {
        setPaginatedOrders(newOrders);
      } else {
        setPaginatedOrders(prev => [...prev, ...newOrders]);
      }
      setTotalCount(count);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  const fetchStatsOnly = useCallback(async (start: Date, end: Date, dateField: 'order_date' | 'created_at' = 'order_date') => {
    if (!tenantId) return [];
    try {
      return await OrderService.fetchOrderStats(supabase, tenantId, start, end, dateField);
    } catch (e) {
      console.error(e);
      return [];
    }
  }, [tenantId, supabase]);

  const addOrder = async (orderData: OrderData): Promise<string | null> => {
    if (!tenantId) return null;
    
    setLoading(true);
    try {
      const orderId = await OrderService.createOrder(supabase, tenantId, orderData);
      return orderId;
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
      await OrderService.updateOrder(supabase, tenantId, id, updates);
      return true;
    } catch (error) {
      console.error('Error updating order:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updatePaymentStatus = async (id: string, status: Order['payment']['status']): Promise<boolean> => {
    const order = orders.find(o => o.id === id);
    if (!order) return false;
    
    const updatedPayment = {
      ...(order.payment || {}),
      status: status
    };
    
    return updateOrder(id, { payment: updatedPayment });
  };

  const updateOrderStatus = async (id: string, status: Order['status']): Promise<boolean> => {
    const ok = await updateOrder(id, { status } as any);
    if (ok && status === "completed") {
      fetch("/api/revenue/order-followup/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: id }),
      }).catch(() => {});
    }
    return ok;
  };

  const cancelOrder = async (id: string): Promise<boolean> => {
    return updateOrder(id, { status: 'canceled' });
  };

  const deleteOrder = async (id: string): Promise<boolean> => {
    if (!tenantId) return false;

    try {
      await OrderService.deleteOrder(supabase, tenantId, id);
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

    const channelId = `orders-tenant-${tenantId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const channel = supabase
      .channel(channelId)
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
            const mapped = OrderService.mapRowToOrder(payload.new);
            
            // Play notification sound if enabled in DB settings
            if (settings.orderNotificationSound !== false) {
              try {
                const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                
                // Play two-tone "ding-dong" sound
                const playTone = (freq: number, start: number, duration: number) => {
                  const osc = audioCtx.createOscillator();
                  const gain = audioCtx.createGain();
                  
                  osc.type = 'sine';
                  osc.frequency.setValueAtTime(freq, start);
                  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, start + duration);
                  
                  gain.gain.setValueAtTime(0.5, start);
                  gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
                  
                  osc.connect(gain);
                  gain.connect(audioCtx.destination);
                  
                  osc.start(start);
                  osc.stop(start + duration);
                };

                const now = audioCtx.currentTime;
                playTone(880, now, 0.4);      // High tone
                playTone(660, now + 0.15, 0.5); // Slightly lower, overlapping
                
              } catch (err) {
                console.warn('Programmatic notification sound failed:', err);
              }
            }

            setOrders(prev => {
              const isExist = prev.some(o => o.id === mapped.id);
              if (isExist) return prev;
              
              // Only increment totalCount if it's a new item
              setTotalCount(c => c + 1);
              return [mapped, ...prev];
            });
            setPaginatedOrders(prev => {
              if (prev.some(o => o.id === mapped.id)) return prev;
              return [mapped, ...prev];
            });
          } else if (payload.eventType === 'UPDATE') {
            const mapped = OrderService.mapRowToOrder(payload.new);
            setOrders(prev => prev.map(o => o.id === mapped.id ? mapped : o));
            setPaginatedOrders(prev => prev.map(o => o.id === mapped.id ? mapped : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== (payload.old as any).id));
            setPaginatedOrders(prev => {
              const exists = prev.some(o => o.id === (payload.old as any).id);
              if (exists) setTotalCount(c => Math.max(0, c - 1));
              return prev.filter(o => o.id !== (payload.old as any).id);
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, authLoading, initialFetch, fetchOrders, supabase]);

  return {
    orders,
    paginatedOrders,
    totalCount,
    setOrders,
    loading: loading || authLoading,
    isRefreshing,
    fetchOrders,
    fetchOrdersByRange,
    fetchPaginatedList,
    fetchStatsOnly,
    addOrder,
    updateOrder,
    updateOrderStatus,
    updatePaymentStatus,
    cancelOrder,
    deleteOrder
  };
}
