"use client";
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { toast } from 'sonner';

export interface CategoryData {
  main: string[];
  mid: Record<string, string[]>;
}

export interface SystemSettings {
  representative: string;
  businessNumber: string;
  contactPhone: string;
  address: string;
  pointRate: number;
  minPointUsage: number;
  discountRates: number[];
  defaultDeliveryFee: number;
  freeDeliveryThreshold: number;
  photoStorageType: 'supabase' | 'google_drive' | 'cloudinary';
  googleDriveFolderId: string;
  isGalleryPublic: boolean;
  galleryTheme: 'grid' | 'masonry' | 'carousel';
  useKakaoTalk: boolean;
  kakaoApiKey: string;
  kakaoSenderId: string;
  kakaoDefaultMessage: string;
  useGoogleSheets: boolean;
  googleSheetId: string;
  googleSheetName: string;
  googleSheetOrdersId: string;
  googleSheetExpensesId: string;
  siteName: string;
  siteDescription: string;
  siteWebsite: string;
  storeEmail: string;
  contactEmail: string;
  messageFont: string;
  messageFontSize: number;
  messageColor: string;
  messageTemplate: string;
  availableFonts: string[];
  isStorefrontPublic: boolean;
  deliveryCarriers: string[];
  districtDeliveryFees: Array<{ district: string, fee: number }>;
  revenueRecognitionBasis: 'order_date' | 'payment_completed';
}

export const defaultSettings: SystemSettings = {
  representative: "",
  businessNumber: "",
  contactPhone: "",
  address: "",
  pointRate: 0,
  minPointUsage: 0,
  discountRates: [5, 10, 15, 20],
  defaultDeliveryFee: 3000,
  freeDeliveryThreshold: 50000,
  photoStorageType: 'supabase',
  googleDriveFolderId: "",
  isGalleryPublic: false,
  galleryTheme: 'grid',
  useKakaoTalk: false,
  kakaoApiKey: "",
  kakaoSenderId: "",
  kakaoDefaultMessage: "",
  useGoogleSheets: false,
  googleSheetId: "",
  googleSheetName: "",
  googleSheetOrdersId: "",
  googleSheetExpensesId: "",
  siteName: "FloraSync SaaS",
  siteDescription: "플라워샵 통합 관리 시스템",
  siteWebsite: "",
  storeEmail: "",
  contactEmail: "",
  messageFont: "Noto Sans KR",
  messageFontSize: 14,
  messageColor: "#000000",
  messageTemplate: "안녕하세요! {고객명}님의 주문이 {상태}되었습니다. 감사합니다.",
  availableFonts: ["Noto Sans KR", "Nanum Gothic", "Nanum Myeongjo", "Gaegu"],
  isStorefrontPublic: false,
  deliveryCarriers: ["자체배송"],
  districtDeliveryFees: [
    { district: "종로구", fee: 10000 },
    { district: "동작구", fee: 18000 },
    { district: "중구", fee: 10000 },
    { district: "광진구", fee: 18000 },
    { district: "서대문구", fee: 13000 },
    { district: "중랑구", fee: 18000 },
    { district: "성북구", fee: 13000 },
    { district: "강북구", fee: 20000 },
    { district: "성동구", fee: 13000 },
    { district: "송파구", fee: 20000 },
    { district: "용산구", fee: 14000 },
    { district: "강동구", fee: 20000 },
    { district: "동대문구", fee: 14000 },
    { district: "구로구", fee: 20000 },
    { district: "영등포구", fee: 15000 },
    { district: "강서구", fee: 20000 },
    { district: "은평구", fee: 15000 },
    { district: "관악구", fee: 20000 },
    { district: "마포구", fee: 16000 },
    { district: "노원구", fee: 20000 },
    { district: "양천구", fee: 18000 },
    { district: "도봉구", fee: 20000 },
    { district: "강남구", fee: 18000 },
    { district: "금천구", fee: 20000 },
    { district: "서초구", fee: 18000 },
    { district: "기타", fee: 25000 }
  ],
  revenueRecognitionBasis: 'order_date',
};

export function useSettings() {
  const supabase = createClient();
  const { tenantId, user } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [productCategories, setProductCategories] = useState<CategoryData | null>(null);
  const [materialCategories, setMaterialCategories] = useState<CategoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    const tid = tenantId || user?.tenant_id;
    if (!tid) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('tenant_id', tid);

      if (error) throw error;

      const prod = data.find(item => item.id === 'product_categories');
      const mat = data.find(item => item.id === 'material_categories');
      const general = data.find(item => item.id === `settings_${tid}` || item.id === 'general');

      if (prod) setProductCategories(prod.data as CategoryData);
      if (mat) setMaterialCategories(mat.data as CategoryData);
      if (general) setSettings({ ...defaultSettings, ...general.data });

    } catch (err) {
      console.error('Error fetching settings:', err);
      setError('설정을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.tenant_id, supabase]);

  const saveSettings = useCallback(async (newSettings: SystemSettings) => {
    const tid = tenantId || user?.tenant_id;
    if (!tid) return false;

    try {
      setLoading(true);
      const { error: upsertError } = await supabase
        .from('system_settings')
        .upsert({ 
          id: `settings_${tid}`,
          tenant_id: tid, 
          data: newSettings, 
          updated_at: new Date().toISOString() 
        });

      if (upsertError) throw upsertError;
      setSettings(newSettings);
      return true;
    } catch (err) {
      console.error('Error saving settings:', err);
      return false;
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.tenant_id, supabase]);

  const updateProductCategories = async (newData: CategoryData) => {
    const tid = tenantId || user?.tenant_id;
    if (!tid) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ id: 'product_categories', tenant_id: tid, data: newData });

      if (error) throw error;
      setProductCategories(newData);
      toast.success('상품 카테고리가 저장되었습니다.');
    } catch (err) {
      console.error('Error updating product categories:', err);
      toast.error('저장 실패');
    } finally {
      setLoading(false);
    }
  };

  const updateMaterialCategories = async (newData: CategoryData) => {
    const tid = tenantId || user?.tenant_id;
    if (!tid) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ id: 'material_categories', tenant_id: tid, data: newData });

      if (error) throw error;
      setMaterialCategories(newData);
      toast.success('자재 카테고리가 저장되었습니다.');
    } catch (err) {
      console.error('Error updating material categories:', err);
      toast.error('저장 실패');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    settings,
    saveSettings,
    productCategories,
    materialCategories,
    loading,
    error,
    updateProductCategories,
    updateMaterialCategories,
    refresh: fetchData
  };
}
