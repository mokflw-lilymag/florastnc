"use client";

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';

export interface Expense {
  id: string;
  tenant_id: string;
  category: string;
  sub_category?: string;
  amount: number;
  description: string;
  expense_date: string;
  payment_method: string;
  supplier_id?: string;
  related_order_id?: string;
  created_at: string;
}

export function useExpenses() {
  const supabase = createClient();
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
    deleteExpense,
    updateExpenseByOrderId,
    deleteExpenseByOrderId
  };
}
