"use client";

import { useState, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { subDays, format } from 'date-fns';

export interface DailySettlementRecord {
  id: string;
  tenant_id: string;
  date: string;
  previous_vault_balance: number;
  cash_sales_today: number;
  delivery_cost_cash_today: number;
  cash_expense_today: number;
  vault_deposit: number;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export function useDailySettlements() {
  const supabase = createClient();
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(false);

  const getSettlement = useCallback(async (date: string): Promise<DailySettlementRecord | null> => {
    if (!tenantId) return null;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_settlements')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('date', date)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as DailySettlementRecord | null;
    } catch (error) {
      console.error('Error fetching settlement:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  const saveSettlement = useCallback(async (record: Partial<DailySettlementRecord>): Promise<boolean> => {
    if (!tenantId || !record.date) return false;

    try {
      setLoading(true);
      const payload = {
        ...record,
        tenant_id: tenantId,
      };

      const { error } = await supabase
        .from('daily_settlements')
        .upsert(payload, { onConflict: 'tenant_id, date' });

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error saving settlement:', error);
      return false;
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  const findLastSettlementBefore = useCallback(async (date: string): Promise<DailySettlementRecord | null> => {
    if (!tenantId) return null;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('daily_settlements')
        .select('*')
        .eq('tenant_id', tenantId)
        .lt('date', date)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;
      return data as DailySettlementRecord | null;
    } catch (error) {
      console.error('Error finding last settlement:', error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  return {
    getSettlement,
    saveSettlement,
    findLastSettlementBefore,
    loading
  };
}
