"use client";
import { useState, useCallback, useEffect, useMemo } from 'react';
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
  isTaxExempt: true,
  defaultTaxRate: 10,
  currency: 'KRW',
  dashboardTickerEnabled: true,
  hideDashboardTicker: false,
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

export const DEFAULT_PRODUCT_CATEGORIES: CategoryData = {
  main: ['꽃다발', '꽃바구니', '식물/화분', '경조사화환', '어버이날상품', '기프티콘/기프트상품', '서양란', '동양란', '웨딩상품', '플라워', '플랜트', '화병/화기', '부자재', '기타'],
  mid: {
    '꽃다발': ['기본형', '대형', '한송이', '돈꽃다발', '에센셜', '프리미엄'],
    '꽃바구니': ['S사이즈', 'M사이즈', 'L사이즈', '오색꽃바구니', '핸들', '돈바구니'],
    '식물/화분': ['공기정화', '관엽', '다육/선인장', '난', '개업/축하용', '행잉'],
    '경조사화환': ['축하화환', '근조화환', '오브제', '축하 3단', '근조 3단'],
    '어버이날상품': ['어버이날컬렉션', '카네이션 바구니', '카네이션 박스'],
    '기프티콘/기프트상품': ['기프트컬렉션', '용돈박스', '플라워박스'],
    '서양란': ['호접란', '심비디움', '미니호접'],
    '동양란': ['동양란', '철골소심', '옥화'],
    '웨딩상품': ['웨딩컬렉션', '부케', '코사지'],
    '플라워': ['경조화환', '꽃다발', '꽃바구니', '센터피스', '플라워박스', '행사용꽃'],
    '플랜트': ['대품', '동서양난', '소품', '중품'],
    '화병/화기': ['유리병', '세라믹', '바스켓'],
    '부자재': ['포장지', '리본', '박스', '기타'],
    '기타': ['리스', '기타']
  }
};

export const DEFAULT_MATERIAL_CATEGORIES: CategoryData = {
  main: ["생화", "식물", "부자재", "포장재", "리본", "기타"],
  mid: {
    "생화": ["장미류", "거베라류", "리시안서스류", "튤립류", "카네이션류", "소재(그린)", "절지류"],
    "식물": ["선인장", "관엽소품", "관엽중품", "관엽대품", "서양란", "동양란"],
    "부자재": ["화기", "도자기", "유리", "비누꽃", "조화", "소품"],
    "포장재": ["포장지", "리본", "텍", "부직포", "비닐"],
    "리본": ["리본(폭넓음)", "리본(폭좁음)", "텍"],
    "기타": ["원예자재", "배송장비", "기타"]
  }
};

export const DEFAULT_EXPENSE_CATEGORIES: CategoryData = {
  main: ["판매관리비", "시설/운영비", "인건비", "세금/공과금", "자재/상품매입", "기타"],
  mid: {
    "판매관리비": ["마케팅/광고", "배송비", "포장비", "소모품비"],
    "시설/운영비": ["임대료", "관리비", "수도광열비", "통신비", "보험료"],
    "인건비": ["급여", "상여금", "퇴직급여", "사대보험", "식대/복리후생"],
    "세금/공과금": ["부가가치세", "종합소득세", "지방세", "협회비"],
    "자재/상품매입": ["생화매입", "부자재매입", "식물매입", "운반비"],
    "기타": ["잡비", "기부금", "이자비용"]
  }
};

export function useSettings() {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId, user } = useAuth();
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
      toast.success('지출 카테고리가 저장되었습니다.');
    } catch (err) {
      console.error('Error updating expense categories:', err);
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
    expenseCategories,
    loading,
    error,
    updateProductCategories,
    updateMaterialCategories,
    updateExpenseCategories,
    refresh: fetchData
  };
}
