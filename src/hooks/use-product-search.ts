"use client";

import { useState, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { Product } from '@/types/product';

export function useProductSearch() {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId } = useAuth();
  const [results, setResults] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  const searchProducts = useCallback(async (query: string, category?: string, limit = 20) => {
    if (!tenantId) {
      console.log('[useProductSearch] No tenantId, returning empty array.');
      return [];
    }
    
    console.log(`[useProductSearch] searchProducts called: query="${query}", category="${category}", tenantId="${tenantId}"`);
    console.log('[useProductSearch] Supabase URL used in browser:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    setLoading(true);
    try {
      let supabaseQuery = supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (query) {
        supabaseQuery = supabaseQuery.ilike('name', `%${query}%`);
      }
      
      if (category) {
        // match category with main_category or mid_category
        supabaseQuery = supabaseQuery.or(`main_category.ilike.%${category}%,mid_category.ilike.%${category}%`);
      }

      const { data, error } = await supabaseQuery
        .order('name', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('[useProductSearch] Supabase query error:', error);
        throw error;
      }
      
      const products = data as Product[];
      console.log('[useProductSearch] query success. returned count:', products.length);
      setResults(products);
      return products;
    } catch (error) {
      console.error('[useProductSearch] Error searching products:', error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  return {
    results,
    loading,
    searchProducts
  };
}
