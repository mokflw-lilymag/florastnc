"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';

export interface SystemSettings {
  siteName: string;
  siteDescription: string;
  contactEmail: string;
  contactPhone: string;
  representative: string;
  businessNumber: string;
  address: string;
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number;
  messageFont: string;
  messageFontSize: number;
  messageColor: string;
  messageTemplate: string;
  availableFonts: string[];
}

export const defaultSettings: SystemSettings = {
  siteName: "FloraSync SaaS",
  siteDescription: "플라워샵 통합 관리 시스템",
  contactEmail: "",
  contactPhone: "",
  representative: "",
  businessNumber: "",
  address: "",
  defaultDeliveryFee: 3000,
  freeDeliveryThreshold: 50000,
  messageFont: "Noto Sans KR",
  messageFontSize: 14,
  messageColor: "#000000",
  messageTemplate: "안녕하세요! {고객명}님의 주문이 {상태}되었습니다. 감사합니다.",
  availableFonts: ["Noto Sans KR", "Nanum Gothic", "Nanum Myeongjo", "Gaegu"],
};

export function useSettings() {
  const supabase = createClient();
  const { user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    if (!user?.tenant_id) return;
    
    try {
      setLoading(true);
      const { data, error: fetchError } = await supabase
        .from('system_settings')
        .select('data')
        .eq('tenant_id', user.tenant_id)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (data?.data) {
        setSettings({ ...defaultSettings, ...data.data });
      }
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [user?.tenant_id]);

  const saveSettings = useCallback(async (newSettings: SystemSettings) => {
    if (!user?.tenant_id) return false;

    try {
      setError(null);
      const { error: upsertError } = await supabase
        .from('system_settings')
        .upsert({ 
          id: `settings_${user.tenant_id}`,
          tenant_id: user.tenant_id, 
          data: newSettings, 
          updated_at: new Date().toISOString() 
        });

      if (upsertError) throw upsertError;
      setSettings(newSettings);
      return true;
    } catch (err) {
      console.error('Error saving settings:', err);
      setError('설정 저장 중 오류가 발생했습니다.');
      return false;
    }
  }, [user?.tenant_id]);

  useEffect(() => {
    if (user?.tenant_id) {
      fetchSettings();
    }
  }, [user?.tenant_id, fetchSettings]);

  return { settings, loading, error, saveSettings, refresh: fetchSettings };
}
