"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { Customer, CustomerData } from '@/types/customer';

export function useCustomers(initialFetch = true) {
  const supabase = createClient();
  const { tenantId, isLoading: authLoading } = useAuth();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(initialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchCustomers = useCallback(async () => {
    if (!tenantId) return;

    try {
      if (customers.length === 0) setLoading(true);
      else setIsRefreshing(true);

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .order('name', { ascending: true });

      if (error) throw error;
      setCustomers(data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [tenantId, customers.length, supabase]);

  const addCustomer = async (customerData: CustomerData): Promise<string | null> => {
    if (!tenantId) return null;
    
    try {
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...customerData, tenant_id: tenantId }])
        .select()
        .single();

      if (error) throw error;
      
      const newCustomer = data as Customer;
      setCustomers(prev => [newCustomer, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      return newCustomer.id;
    } catch (error) {
      console.error('Error adding customer:', error);
      return null;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<CustomerData>): Promise<boolean> => {
    if (!tenantId) return false;

    try {
      const { data, error } = await supabase
        .from('customers')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      
      if (data) {
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...(data as Customer) } : c));
      }
      return true;
    } catch (error) {
      console.error('Error updating customer:', error);
      return false;
    }
  };

  const deleteCustomer = async (id: string): Promise<boolean> => {
    if (!tenantId) return false;

    try {
      const { error } = await supabase
        .from('customers')
        .update({ is_deleted: true })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      
      setCustomers(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (error) {
      console.error('Error deleting customer:', error);
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
      fetchCustomers();
    }

    const channel = supabase
      .channel(`customers-tenant-${tenantId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'customers',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setCustomers(prev => [payload.new as Customer, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.is_deleted) {
              setCustomers(prev => prev.filter(c => c.id !== payload.new.id));
            } else {
              setCustomers(prev => prev.map(c => c.id === payload.new.id ? payload.new as Customer : c));
            }
          } else if (payload.eventType === 'DELETE') {
            setCustomers(prev => prev.filter(c => c.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, authLoading, initialFetch, fetchCustomers, supabase]);

  return {
    customers,
    loading: loading || authLoading,
    isRefreshing,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    deleteCustomer
  };
}
