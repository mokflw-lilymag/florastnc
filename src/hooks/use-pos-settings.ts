"use client";

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';
import { PosIntegration, PosType } from '@/services/pos/PosIntegrationService';

export function usePosSettings() {
  const supabase = createClient();
  const { tenantId } = useAuth();
  const [integration, setIntegration] = useState<PosIntegration | null>(null);
  const [loading, setLoading] = useState(true);

  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const fetchIntegration = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pos_integrations')
        .select('*')
        .eq('tenant_id', tenantId)
        .maybeSingle();

      if (error) throw error;
      setIntegration(data);
    } catch (err) {
      console.error('[usePosSettings] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  const fetchLogs = useCallback(async () => {
    if (!tenantId) return;
    setLogsLoading(true);
    try {
      const { data, error } = await supabase
        .from('pos_transactions')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error('[usePosSettings] Fetch logs error:', err);
    } finally {
      setLogsLoading(false);
    }
  }, [tenantId, supabase]);

  const saveIntegration = async (values: Partial<PosIntegration>) => {
    if (!tenantId) return false;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('pos_integrations')
        .upsert({
          ...values,
          tenant_id: tenantId,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      setIntegration(data);
      toast.success('POS 연동 설정이 저장되었습니다.');
      return true;
    } catch (err) {
      console.error('[usePosSettings] Save error:', err);
      toast.error('설정 저장 중 오류가 발생했습니다.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (active: boolean) => {
    if (!integration) return;
    await saveIntegration({ is_active: active });
  };

  useEffect(() => {
    fetchIntegration();
  }, [fetchIntegration]);

  return {
    integration,
    loading,
    logs,
    logsLoading,
    fetchLogs,
    saveIntegration,
    toggleActive,
    refresh: fetchIntegration
  };
}
