"use client";

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { Product, ProductData } from '@/types/product';

export type DeleteProductResult = { ok: true } | { ok: false; message: string };

function formatProductDeleteError(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: string }).code ?? '');
    const msg = String((error as { message?: string }).message ?? '');
    if (code === '42501' || /permission denied|row-level security/i.test(msg)) {
      return '삭제 권한이 없습니다. DB 정책(RLS)을 확인하거나 관리자에게 문의하세요.';
    }
    if (code === '23503') {
      return '다른 데이터(주문 등)에서 이 상품을 참조 중이라 삭제할 수 없습니다.';
    }
    if (msg) return msg;
  }
  if (error instanceof Error && error.message) return error.message;
  return '상품 삭제에 실패했습니다.';
}

export function useProducts(initialFetch = true) {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId, isLoading: authLoading } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(initialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchProducts = useCallback(async () => {
    if (!tenantId) return;

    try {
      if (products.length === 0) setLoading(true);
      else setIsRefreshing(true);

      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [tenantId, supabase]);

  const addProduct = async (productData: ProductData): Promise<string | null> => {
    if (!tenantId) return null;
    
    try {
      const { data, error } = await supabase
        .from('products')
        .insert([{ ...productData, tenant_id: tenantId }])
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error adding product:', error);
      return null;
    }
  };

  const updateProduct = async (id: string, updates: Partial<ProductData>): Promise<boolean> => {
    if (!tenantId) return false;

    try {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error updating product:', error);
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<DeleteProductResult> => {
    if (!tenantId) {
      return { ok: false, message: '매장(테넌트) 정보를 불러오지 못했습니다.' };
    }

    try {
      const { data, error } = await supabase
        .from('products')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select('id');

      if (error) {
        console.error('Error deleting product:', error);
        return { ok: false, message: formatProductDeleteError(error) };
      }
      if (!data?.length) {
        return {
          ok: false,
          message:
            '삭제된 행이 없습니다. 권한이 없거나, 이미 삭제된 상품일 수 있습니다. (Supabase에서 products DELETE RLS를 확인하세요.)',
        };
      }
      setProducts((prev) => prev.filter((p) => p.id !== id));
      return { ok: true };
    } catch (error) {
      console.error('Error deleting product:', error);
      return { ok: false, message: formatProductDeleteError(error) };
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!tenantId) {
      setLoading(false);
      return;
    }

    if (initialFetch) {
      fetchProducts();
    }

    const channel = supabase
      .channel(`products-tenant-${tenantId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'products',
          filter: `tenant_id=eq.${tenantId}`
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setProducts(prev => [payload.new as Product, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
          } else if (payload.eventType === 'UPDATE') {
            setProducts(prev => prev.map(p => p.id === payload.new.id ? payload.new as Product : p));
          } else if (payload.eventType === 'DELETE') {
            setProducts(prev => prev.filter(p => p.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, authLoading, initialFetch, fetchProducts, supabase]);

  return {
    products,
    loading: loading || authLoading,
    isRefreshing,
    fetchProducts,
    addProduct,
    updateProduct,
    deleteProduct
  };
}
