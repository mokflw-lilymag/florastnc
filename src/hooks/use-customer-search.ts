"use client";

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { Customer } from '@/types/customer';

export function useCustomerSearch() {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId } = useAuth();
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);

  const searchCustomers = useCallback(async (query: string, limit = 20) => {
    if (!tenantId || !query.trim()) {
      setResults([]);
      return [];
    }
    
    setLoading(true);
    try {
      const q = query.trim();
      // Search by name or contact (remove non-digits for contact search if it's numbers)
      const isPhoneSearch = /^[0-9-+\s]+$/.test(q);
      
      let orQuery = `name.ilike.%${q}%`;
      if (isPhoneSearch) {
        const digits = q.replace(/[^0-9]/g, '');
        if (digits.length > 0) {
          orQuery += `,contact.ilike.%${digits}%`;
          if (q !== digits) {
            orQuery += `,contact.ilike.%${q}%`;
          }
        }
      } else {
        orQuery += `,contact.ilike.%${q}%`;
        const noSpace = q.replace(/\s+/g, '');
        if (noSpace !== q) {
            orQuery += `,name.ilike.%${noSpace}%`;
        }
      }

      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false)
        .or(orQuery)
        .order('name', { ascending: true })
        .limit(limit);

      if (error) throw error;
      
      const customers = data as Customer[];
      setResults(customers);
      return customers;
    } catch (error) {
      console.error('Error searching customers:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  return {
    results,
    loading,
    searchCustomers,
    setResults
  };
}
