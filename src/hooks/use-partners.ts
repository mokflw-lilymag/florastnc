"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';

export interface Partner {
  id: string;
  tenant_id: string;
  name: string;
  type?: string;
  category?: string;
  contact_person?: string;
  contact?: string;
  email?: string;
  address?: string;
  business_number?: string;
  ceo_name?: string;
  bank_account?: string;
  items?: string;
  memo?: string;
  default_margin_percent?: number;
  created_at?: string;
  updated_at?: string;
}

export function usePartners() {
  const supabase = createClient();
  const { tenantId, isLoading: authLoading } = useAuth();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartners = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;
      setPartners(data || []);
    } catch (e) {
      console.error('Error fetching partners:', e);
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  useEffect(() => {
    if (!authLoading && tenantId) {
      fetchPartners();
    }
  }, [authLoading, tenantId, fetchPartners]);

  const addPartner = async (data: Omit<Partner, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    if (!tenantId) return null;

    try {
      const { data: inserted, error } = await supabase
        .from('partners')
        .insert([{ ...data, tenant_id: tenantId }])
        .select()
        .single();

      if (error) throw error;
      setPartners(prev => [...prev, inserted].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success('파트너가 등록되었습니다.');
      return inserted;
    } catch (e) {
      toast.error('파트너 등록에 실패했습니다.');
      return null;
    }
  };

  const updatePartner = async (id: string, data: Partial<Partner>) => {
    if (!tenantId) return false;

    try {
      const { error } = await supabase
        .from('partners')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      await fetchPartners();
      toast.success('파트너 정보가 수정되었습니다.');
      return true;
    } catch (e) {
      toast.error('파트너 수정에 실패했습니다.');
      return false;
    }
  };

  const deletePartner = async (id: string) => {
    if (!tenantId) return false;

    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setPartners(prev => prev.filter(p => p.id !== id));
      toast.success('파트너가 삭제되었습니다.');
      return true;
    } catch (e) {
      toast.error('파트너 삭제에 실패했습니다.');
      return false;
    }
  };

  return {
    partners,
    loading: loading || authLoading,
    fetchPartners,
    addPartner,
    updatePartner,
    deletePartner
  };
}
