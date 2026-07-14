"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { Customer, CustomerData } from '@/types/customer';
import { isElectronClient } from '@/lib/electron-env';
import { onElectronSyncStatus } from '@/lib/electron-sync-listener';
import { syncCustomerToGoogleSheets } from '@/lib/integrations/google-sheets';

export function useCustomers(initialFetch = true) {
  const supabase = useMemo(() => createClient(), []);
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
        .select('*, customer_anniversaries(id)')
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
  }, [tenantId, supabase]);

  const addCustomer = async (customerData: CustomerData): Promise<string | null> => {
    if (!tenantId) return null;

    try {
      const { anniversaries: _ann, ...row } = customerData;
      const { data, error } = await supabase
        .from('customers')
        .insert([{ ...row, tenant_id: tenantId, marketing_consent: customerData.marketing_consent ?? false }])
        .select()
        .single();

      if (error) throw error;

      const newCustomer = data as Customer;
      setCustomers((prev) => [newCustomer, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
      
      syncCustomerToGoogleSheets(tenantId, newCustomer).catch(e => console.error('Failed to sync customer to sheets', e));
      
      return newCustomer.id;
    } catch (error) {
      console.error('Error adding customer:', error);
      return null;
    }
  };

  const updateCustomer = async (id: string, updates: Partial<CustomerData>): Promise<boolean> => {
    if (!tenantId) return false;

    try {
      const { anniversaries: _ann, ...row } = updates;
      const { data, error } = await supabase
        .from('customers')
        .update(row)
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;

      if (data) {
        const updatedCustomer = data as Customer;
        setCustomers((prev) => prev.map((c) => (c.id === id ? { ...c, ...updatedCustomer } : c)));
        syncCustomerToGoogleSheets(tenantId, updatedCustomer).catch(e => console.error('Failed to sync customer to sheets', e));
      }
      return true;
    } catch (error) {
      console.error('Error updating customer:', error);
      return false;
    }
  };

  const bulkAddCustomers = async (
    rows: CustomerData[],
  ): Promise<{ newCount: number; updatedCount: number; skippedCount: number }> => {
    if (!tenantId) return { newCount: 0, updatedCount: 0, skippedCount: rows.length };

    let newCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;

    for (const customerData of rows) {
      if (!customerData.name?.trim() || !customerData.contact?.trim()) {
        skippedCount += 1;
        continue;
      }

      try {
        const { data: existing } = await supabase
          .from('customers')
          .select('id')
          .eq('tenant_id', tenantId)
          .eq('contact', customerData.contact.trim())
          .eq('is_deleted', false)
          .maybeSingle();

        const { anniversaries: _ann, ...row } = customerData;

        if (existing?.id) {
          const { error } = await supabase
            .from('customers')
            .update({
              ...row,
              marketing_consent: customerData.marketing_consent ?? false,
            })
            .eq('id', existing.id)
            .eq('tenant_id', tenantId);
          if (error) throw error;
          updatedCount += 1;
        } else {
          const { error } = await supabase.from('customers').insert([
            {
              ...row,
              tenant_id: tenantId,
              marketing_consent: customerData.marketing_consent ?? false,
            },
          ]);
          if (error) throw error;
          newCount += 1;
        }
      } catch (e) {
        console.warn('[bulkAddCustomers] row failed', e);
        skippedCount += 1;
      }
    }

    await fetchCustomers();
    return { newCount, updatedCount, skippedCount };
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

    if (isElectronClient()) {
      return;
    }

    const channel = supabase
      .channel(`customers-tenant-${tenantId}-${Date.now()}-${Math.floor(Math.random() * 1000)}`)
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

  useEffect(() => {
    if (!isElectronClient() || !tenantId) return;
    let lastAt: string | null = null;
    return onElectronSyncStatus((status) => {
      if (!status.lastSyncAt || status.lastSyncAt === lastAt) return;
      lastAt = status.lastSyncAt;
      fetchCustomers();
    });
  }, [tenantId, fetchCustomers]);

  return {
    customers,
    loading: loading || authLoading,
    isRefreshing,
    fetchCustomers,
    addCustomer,
    updateCustomer,
    bulkAddCustomers,
    deleteCustomer
  };
}
