"use client";

import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { useUiText } from '@/hooks/use-ui-text';
import { toast } from 'sonner';
import { PosIntegration, PosType } from '@/services/pos/PosIntegrationService';

export function usePosSettings() {
  const supabase = createClient();
  const { tenantId } = useAuth();
  const { tr } = useUiText();
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
      toast.success(
        tr(
          'POS 연동 설정이 저장되었습니다.',
          'POS integration settings saved.',
          'Đã lưu cài đặt tích hợp POS.',
          'POS連携設定を保存しました。',
          'POS 对接设置已保存。',
          'Ajustes de integración POS guardados.',
          'Configurações de integração POS salvas.',
          'Paramètres d’intégration POS enregistrés.',
          'POS-Integration gespeichert.',
          'Настройки интеграции POS сохранены.',
        ),
      );
      return true;
    } catch (err) {
      console.error('[usePosSettings] Save error:', err);
      toast.error(
        tr(
          '설정 저장 중 오류가 발생했습니다.',
          'Error while saving settings.',
          'Lỗi khi lưu cài đặt.',
          '設定の保存中にエラーが発生しました。',
          '保存设置时出错。',
          'Error al guardar los ajustes.',
          'Erro ao salvar as configurações.',
          'Erreur lors de l’enregistrement.',
          'Fehler beim Speichern der Einstellungen.',
          'Ошибка при сохранении настроек.',
        ),
      );
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
