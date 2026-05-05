"use client";
import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { useUiText } from '@/hooks/use-ui-text';
import { pickUiText } from '@/i18n/pick-ui-text';
import { toast } from 'sonner';
import {
  type CategoryData,
  DEFAULT_PRODUCT_CATEGORIES,
  DEFAULT_MATERIAL_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
} from '@/lib/category-defaults';
import { GWANGHWAMUN_DISTRICT_DELIVERY_FEES } from '@/lib/gwanghwamun-delivery-fees';

export type { CategoryData } from '@/lib/category-defaults';
export { DEFAULT_PRODUCT_CATEGORIES, DEFAULT_MATERIAL_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES };

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
  kakaoTDeliveryApiKey?: string;
  kakaoTDeliveryBizId?: string;
  autoDeliveryBooking?: boolean;
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
  isTaxExempt: boolean;
  defaultTaxRate: number;
  currency: string;
  country: string;
  /** 대시보드 상단 전광판(날씨·예약·본사 공지 흐름) — 표시 여부(하위 호환) */
  dashboardTickerEnabled: boolean;
  /** true면 사용자가 환경설정에서 전광판을 끔. 미설정/false면 표시(기본). 구버전 false만 있던 저장은 무시하고 표시. */
  hideDashboardTicker?: boolean;
  /** 새 주문 발생 시 우렁찬 알림음 재생 여부 */
  orderNotificationSound?: boolean;
}

export const defaultSettings: SystemSettings = {
  representative: "",
  businessNumber: "",
  contactPhone: "",
  address: "",
  country: "KR",
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
  kakaoTDeliveryApiKey: "",
  kakaoTDeliveryBizId: "",
  autoDeliveryBooking: false,
  useGoogleSheets: false,
  googleSheetId: "",
  googleSheetName: "",
  googleSheetOrdersId: "",
  googleSheetExpensesId: "",
  siteName: "Floxync SaaS",
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
  districtDeliveryFees: GWANGHWAMUN_DISTRICT_DELIVERY_FEES.map((r) => ({ ...r })),
  revenueRecognitionBasis: 'order_date',
  isTaxExempt: true,
  defaultTaxRate: 10,
  currency: 'KRW',
  dashboardTickerEnabled: true,
  hideDashboardTicker: false,
  orderNotificationSound: true,
};

function mergeTenantGeneralSettings(raw: unknown): SystemSettings {
  const partial = (raw && typeof raw === "object" ? raw : {}) as Partial<SystemSettings>;
  const merged = { ...defaultSettings, ...partial };
  if (merged.hideDashboardTicker === true) {
    merged.dashboardTickerEnabled = false;
  } else {
    merged.hideDashboardTicker = false;
    merged.dashboardTickerEnabled = true;
  }
  return merged;
}

export function useSettings() {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId, user } = useAuth();
  const { tr, baseLocale } = useUiText();
  const [settings, setSettings] = useState<SystemSettings>(defaultSettings);
  const [productCategories, setProductCategories] = useState<CategoryData | null>(null);
  const [materialCategories, setMaterialCategories] = useState<CategoryData | null>(null);
  const [expenseCategories, setExpenseCategories] = useState<CategoryData | null>(null);
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
      const exp = data.find(item => item.id === 'expense_categories');
      const general = data.find(item => item.id === `settings_${tid}` || item.id === 'general');

      if (prod) setProductCategories(prod.data as CategoryData);
      if (mat) setMaterialCategories(mat.data as CategoryData);
      if (exp) setExpenseCategories(exp.data as CategoryData);
      if (general) setSettings(mergeTenantGeneralSettings(general.data));

    } catch (err) {
      console.error('Error fetching settings:', err);
      setError(
        pickUiText(
          baseLocale,
          '설정을 불러오는 중 오류가 발생했습니다.',
          'Failed to load settings.',
          'Không thể tải cài đặt.',
          '設定の読み込みに失敗しました。',
          '加载设置失败。',
          'No se pudieron cargar los ajustes.',
          'Falha ao carregar as configurações.',
          'Échec du chargement des paramètres.',
          'Einstellungen konnten nicht geladen werden.',
          'Не удалось загрузить настройки.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.tenant_id, supabase, baseLocale]);

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
      toast.success(
        tr(
          '상품 카테고리가 저장되었습니다.',
          'Product categories saved.',
          'Đã lưu danh mục sản phẩm.',
          '商品カテゴリを保存しました。',
          '商品分类已保存。',
          'Categorías de producto guardadas.',
          'Categorias de produto salvas.',
          'Catégories produits enregistrées.',
          'Produktkategorien gespeichert.',
          'Категории товаров сохранены.',
        ),
      );
    } catch (err) {
      console.error('Error updating product categories:', err);
      toast.error(
        tr(
          '저장 실패',
          'Save failed',
          'Lưu thất bại',
          '保存に失敗しました',
          '保存失败',
          'Error al guardar',
          'Falha ao salvar',
          'Échec de l’enregistrement',
          'Speichern fehlgeschlagen',
          'Не удалось сохранить',
        ),
      );
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
      toast.success(
        tr(
          '자재 카테고리가 저장되었습니다.',
          'Material categories saved.',
          'Đã lưu danh mục nguyên vật liệu.',
          '資材カテゴリを保存しました。',
          '物料分类已保存。',
          'Categorías de materiales guardadas.',
          'Categorias de materiais salvas.',
          'Catégories matières enregistrées.',
          'Materialkategorien gespeichert.',
          'Категории материалов сохранены.',
        ),
      );
    } catch (err) {
      console.error('Error updating material categories:', err);
      toast.error(
        tr(
          '저장 실패',
          'Save failed',
          'Lưu thất bại',
          '保存に失敗しました',
          '保存失败',
          'Error al guardar',
          'Falha ao salvar',
          'Échec de l’enregistrement',
          'Speichern fehlgeschlagen',
          'Не удалось сохранить',
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const updateExpenseCategories = async (newData: CategoryData) => {
    const tid = tenantId || user?.tenant_id;
    if (!tid) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ id: 'expense_categories', tenant_id: tid, data: newData });

      if (error) throw error;
      setExpenseCategories(newData);
      toast.success(
        tr(
          '지출 카테고리가 저장되었습니다.',
          'Expense categories saved.',
          'Đã lưu danh mục chi phí.',
          '支出カテゴリを保存しました。',
          '支出分类已保存。',
          'Categorías de gastos guardadas.',
          'Categorias de despesas salvas.',
          'Catégories de dépenses enregistrées.',
          'Ausgabenkategorien gespeichert.',
          'Категории расходов сохранены.',
        ),
      );
    } catch (err) {
      console.error('Error updating expense categories:', err);
      toast.error(
        tr(
          '저장 실패',
          'Save failed',
          'Lưu thất bại',
          '保存に失敗しました',
          '保存失败',
          'Error al guardar',
          'Falha ao salvar',
          'Échec de l’enregistrement',
          'Speichern fehlgeschlagen',
          'Не удалось сохранить',
        ),
      );
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
    expenseCategories,
    loading,
    error,
    updateProductCategories,
    updateMaterialCategories,
    updateExpenseCategories,
    refresh: fetchData
  };
}
