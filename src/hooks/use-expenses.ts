"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Expense } from '@/types/expense';

export type { Expense };

export function useExpenses() {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId, isLoading: authLoading } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async (start?: Date, end?: Date) => {
    if (!tenantId) return;

    try {
      setLoading(true);
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('expense_date', { ascending: false });

      if (start) {
        query = query.gte('expense_date', start.toISOString());
      }
      if (end) {
        query = query.lte('expense_date', end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (e) {
      console.error('Error fetching expenses:', e);
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  const addExpense = async (data: Omit<Expense, 'id' | 'tenant_id' | 'created_at'>) => {
    if (!tenantId) return null;

    try {
      const { data: inserted, error } = await supabase
        .from('expenses')
        .insert([{ ...data, tenant_id: tenantId }])
        .select()
        .single();

      if (error) throw error;
      setExpenses(prev => [inserted, ...prev]);
      toast.success('지출이 등록되었습니다.');
      return inserted;
    } catch (e) {
      toast.error('지출 등록에 실패했습니다.');
      return null;
    }
  };

  const addExpenses = async (items: Omit<Expense, 'id' | 'tenant_id' | 'created_at'>[]) => {
    if (!tenantId || items.length === 0) return null;

    try {
      const payloads = items.map(item => ({ ...item, tenant_id: tenantId }));
      const { data: inserted, error } = await supabase
        .from('expenses')
        .insert(payloads)
        .select();

      if (error) throw error;
      setExpenses(prev => [...(inserted || []), ...prev]);
      toast.success(`${inserted?.length}건의 지출이 등록되었습니다.`);
      return inserted;
    } catch (e) {
      toast.error('지출 등록에 실패했습니다.');
      return null;
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success('지출이 삭제되었습니다.');
      return true;
    } catch (e) {
      toast.error('지출 삭제에 실패했습니다.');
      return false;
    }
  };

  const updateExpense = async (id: string, data: Partial<Omit<Expense, 'id' | 'tenant_id' | 'created_at'>>) => {
    if (!tenantId) return null;

    try {
      const { data: updated, error } = await supabase
        .from('expenses')
        .update({ ...data, tenant_id: tenantId })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      setExpenses(prev => prev.map(e => e.id === id ? updated : e));
      toast.success('지출이 수정되었습니다.');
      return updated;
    } catch (e) {
      toast.error('지출 수정에 실패했습니다.');
      return null;
    }
  };

  const updateExpenseByOrderId = async (orderId: string, data: any, subCategory?: string) => {
    if (!tenantId) return false;

    try {
      let query = supabase
        .from('expenses')
        .update({ ...data, tenant_id: tenantId })
        .eq('related_order_id', orderId)
        .eq('tenant_id', tenantId);

      if (subCategory) {
          query = query.eq('sub_category', subCategory);
      }

      const { data: updated, error } = await query.select();

      if (error) throw error;
      
      if (updated && updated.length > 0) {
          await fetchExpenses();
          return true;
      }
      return false;
    } catch (e) {
      console.error('Error updating expense by order id:', e);
      return false;
    }
  };

  const deleteExpenseByOrderId = async (orderId: string, subCategory?: string) => {
    if (!tenantId) return false;

    try {
      let query = supabase
        .from('expenses')
        .delete()
        .eq('related_order_id', orderId)
        .eq('tenant_id', tenantId);

      if (subCategory) {
          query = query.eq('sub_category', subCategory);
      }

      const { error } = await query;
      if (error) throw error;
      
      await fetchExpenses();
      return true;
    } catch (e) {
      console.error('Error deleting expense by order id:', e);
      return false;
    }
  };

  useEffect(() => {
    if (!authLoading && tenantId) {
      fetchExpenses();
    }
  }, [authLoading, tenantId, fetchExpenses]);

  return {
    expenses,
    loading: loading || authLoading,
    fetchExpenses,
    addExpense,
    addExpenses,
    updateExpense,
    deleteExpense,
    updateExpenseByOrderId,
    deleteExpenseByOrderId
  };
}

export function useExpenseStorage() {
  const supabase = createClient();
  const { tenantId } = useAuth();

  const uploadReceipt = async (file: File) => {
    if (!tenantId) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/${format(new Date(), 'yyyyMMdd')}/${crypto.randomUUID()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        path: data.path,
        id: fileName
      };
    } catch (e) {
      console.error('Error uploading receipt:', e);
      toast.error('영수증 업로드에 실패했습니다.');
      return null;
    }
  };

  return { uploadReceipt };
}
