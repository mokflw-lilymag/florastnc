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
import { syncTenantBackupPathToElectron } from '@/lib/electron-desktop-api';
import {
  getDefaultMessageTemplate,
  getDefaultKakaoTemplates,
  getDefaultEmailTemplates,
} from '@/lib/messenger/localized-templates';
import { DEFAULT_STAFF_MENU_PERMISSIONS, normalizeStaffMenuPermissions } from '@/lib/staff-menu-permissions';
import { useStaffPermissionsStore } from '@/stores/staff-permissions-store';

export type { CategoryData } from '@/lib/category-defaults';
export { DEFAULT_PRODUCT_CATEGORIES, DEFAULT_MATERIAL_CATEGORIES, DEFAULT_EXPENSE_CATEGORIES };

export interface MarketingAdTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
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
  useKakaoTDelivery?: boolean;
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
  /** Tenant UI language — synced with mobile via system_settings.data */
  uiLocale?: string;
  /** 영수증·주문서 출력 언어 — `auto`면 UI·국가 기본, `en` 등 지정 시 고정 */
  receiptLocale?: string;
  /** 대시보드 상단 전광판(날씨·예약·본사 공지 흐름) — 표시 여부(하위 호환) */
  dashboardTickerEnabled: boolean;
  /** true면 사용자가 환경설정에서 전광판을 끔. 미설정/false면 표시(기본). 구버전 false만 있던 저장은 무시하고 표시. */
  hideDashboardTicker?: boolean;
  /** 새 주문 발생 시 우렁찬 알림음 재생 여부 */
  orderNotificationSound?: boolean;
  ppBridgeEnabled: boolean;
  ribbonBridgeEnabled: boolean;
  printerName: string;
  posPrinterName: string;
  ribbonPrinterName: string;
  labelPrinterName: string;
  receiptPrinterType: 'pos' | 'label';
  printPickupMemo: boolean;
  printDeliveryShop: boolean;
  printDeliveryDriver: boolean;
  installedPrinters: string[];
  /** 제작완료·배송완료 이메일 자동 발송 (수동 발송은 항상 가능) */
  autoEmailProductionComplete: boolean;
  autoEmailDeliveryComplete: boolean;
  emailTemplateProductionComplete: string;
  emailTemplateDeliveryComplete: string;
  autoEmailAnniversaryD7: boolean;
  emailTemplateAnniversaryD7: string;
  /** 테넌트별 SMTP (미설정 시 env SMTP_USER/PASS 사용) */
  smtpEnabled?: boolean;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser?: string;
  smtpPass?: string;
  smtpSenderName?: string;
  /** PC 카카오톡 반자동 알림 텍스트 (클립보드 복사용, {사진링크} = URL) */
  kakaoTemplateProductionComplete?: string;
  kakaoTemplateDeliveryComplete?: string;
  
  /** 스마트 마케팅 카카오톡 템플릿 */
  marketingKakaoTemplateDayOf?: string;
  marketingKakaoTemplateDaysBefore7?: string;
  marketingKakaoTemplateFirstPurchase?: string;

  /** 스마트 마케팅 이메일 템플릿 */
  marketingEmailSubjectDayOf?: string;
  marketingEmailContentDayOf?: string;
  marketingEmailAutoDayOf?: boolean;

  marketingEmailSubjectDaysBefore7?: string;
  marketingEmailContentDaysBefore7?: string;
  marketingEmailAutoDaysBefore7?: boolean;

  marketingEmailSubjectFirstPurchase?: string;
  marketingEmailContentFirstPurchase?: string;
  marketingEmailAutoFirstPurchase?: boolean;

  /** 광고/마케팅 대량 메일 전용 커스텀 템플릿 목록 */
  marketingAdTemplates?: MarketingAdTemplate[];

  /** Windows 앱 로컬 저장·백업 루트 (비우면 문서/Floxync) */
  localBackupPath?: string;
  /** 기본 알림 메신저 (kakaotalk | zalo | line | whatsapp | sms) */
  preferredMessenger?: 'kakaotalk' | 'zalo' | 'line' | 'whatsapp' | 'sms';
  /** 사장님 PIN (작업자 전환·권한 복귀) — system_settings.data.ownerPinCode */
  ownerPinCode?: string;
  /** 직원(tenant_staff) 계정 로그인 시 표시할 사이드바 메뉴 ID 목록 */
  staffMenuPermissions?: string[];
  /** 출퇴근 일별 휴게 — key: staffId:YYYY-MM-DD */
  attendanceDayBreaks?: Record<string, { tookLunch: boolean; tookDinner: boolean }>;
  /** 급여 관할 국가 (ISO, 기본 country와 동일) */
  payrollJurisdiction?: string;
  /** auto = 국가 모듈, manual = 수동 명세 */
  payrollMode?: 'auto' | 'manual';
  /** 정직원 기본: annual | monthly */
  fullTimeCompensationModel?: 'annual' | 'monthly' | 'hourly' | 'project';
}

export function getDefaultSettings(locale: string = 'en'): SystemSettings {
  const kakao = getDefaultKakaoTemplates(locale);
  const email = getDefaultEmailTemplates(locale);
  const messageTemplate = getDefaultMessageTemplate(locale);

  return {
    representative: "",
    businessNumber: "",
    contactPhone: "",
    address: "",
    country: "KR",
    payrollJurisdiction: "KR",
    payrollMode: "auto",
    fullTimeCompensationModel: "annual",
    preferredMessenger: "kakaotalk",
    pointRate: 0,
    minPointUsage: 0,
    discountRates: [5, 10, 15, 20],
    defaultDeliveryFee: 0,
    freeDeliveryThreshold: 0,
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
    useKakaoTDelivery: false,
    autoDeliveryBooking: false,
    useGoogleSheets: false,
    googleSheetId: "",
    googleSheetName: "",
    googleSheetOrdersId: "",
    googleSheetExpensesId: "",
    siteName: "FloXync",
    siteDescription: "플라워샵 통합 관리 시스템",
    siteWebsite: "",
    storeEmail: "",
    contactEmail: "",
    messageFont: "Noto Sans KR",
    messageFontSize: 14,
    messageColor: "#000000",
    messageTemplate: messageTemplate,
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
    ppBridgeEnabled: true,
    ribbonBridgeEnabled: false,
    printerName: "",
    posPrinterName: "",
    ribbonPrinterName: "",
    labelPrinterName: "",
    receiptPrinterType: 'pos',
    printPickupMemo: true,
    printDeliveryShop: true,
    printDeliveryDriver: true,
    installedPrinters: [],
    autoEmailProductionComplete: true,
    autoEmailDeliveryComplete: true,
    emailTemplateProductionComplete: email.productionComplete,
    emailTemplateDeliveryComplete: email.deliveryComplete,
    autoEmailAnniversaryD7: false,
    emailTemplateAnniversaryD7: email.marketingDaysBefore7,
    smtpEnabled: false,
    smtpHost: 'smtp.gmail.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPass: '',
    smtpSenderName: '',
    kakaoTemplateProductionComplete: kakao.productionComplete,
    kakaoTemplateDeliveryComplete: kakao.deliveryComplete,
    staffMenuPermissions: [...DEFAULT_STAFF_MENU_PERMISSIONS],
    attendanceDayBreaks: {},
    marketingKakaoTemplateDayOf: kakao.marketingDayOf,
    marketingKakaoTemplateDaysBefore7: kakao.marketingDaysBefore7,
    marketingKakaoTemplateFirstPurchase: kakao.marketingFirstPurchase,
    marketingAdTemplates: [],
    marketingEmailSubjectDayOf: locale.startsWith("ko") ? "오늘 {기념일명}을 진심으로 축하드립니다!" : 
                               locale.startsWith("ja") ? "本日の{기념일명}、心よりお祝い申し上げます！" :
                               locale.startsWith("vi") ? "Chúc mừng {기념일명} của bạn hôm nay!" :
                               "Congratulations on your {기념일명} today!",
    marketingEmailContentDayOf: email.marketingDayOf,
    marketingEmailAutoDayOf: false,

    marketingEmailSubjectDaysBefore7: locale.startsWith("ko") ? "{기념일명}이 일주일 앞으로 다가왔습니다." :
                                     locale.startsWith("ja") ? "{기념일명}が来週に迫ってまいりました。" :
                                     locale.startsWith("vi") ? "{기념일명} đang đến gần vào tuần sau." :
                                     "Your {기념일명} is approaching next week.",
    marketingEmailContentDaysBefore7: email.marketingDaysBefore7,
    marketingEmailAutoDaysBefore7: false,

    marketingEmailSubjectFirstPurchase: locale.startsWith("ko") ? "첫 구매를 진심으로 감사드립니다." :
                                       locale.startsWith("ja") ? "初回購入、誠にありがとうございます。" :
                                       locale.startsWith("vi") ? "Cảm ơn bạn rất nhiều vì đơn hàng đầu tiên." :
                                       "Thank you for your first purchase.",
    marketingEmailContentFirstPurchase: email.marketingFirstPurchase,
    marketingEmailAutoFirstPurchase: false,

    localBackupPath: "",
  };
}

// For backward compatibility in case an external file needs a static constant
export const defaultSettings: SystemSettings = getDefaultSettings('ko');

function mergeTenantGeneralSettings(raw: unknown, locale: string = 'ko'): SystemSettings {
  const partial = (raw && typeof raw === "object" ? raw : {}) as Partial<SystemSettings>;
  const merged = { ...getDefaultSettings(locale), ...partial };
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
  // Initialize with localized defaults instead of static Korean constants
  const [settings, setSettings] = useState<SystemSettings>(() => getDefaultSettings(baseLocale));
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
      if (general) {
        const merged = mergeTenantGeneralSettings(general.data, baseLocale);
        setSettings(merged);
        useStaffPermissionsStore
          .getState()
          .setPermissions(
            normalizeStaffMenuPermissions(
              merged.staffMenuPermissions ?? [...DEFAULT_STAFF_MENU_PERMISSIONS],
            ),
          );
        void syncTenantBackupPathToElectron(tid, merged.localBackupPath);
      } else {
        // If no general settings exist, ensure we are using the localized default
        const defaults = getDefaultSettings(baseLocale);
        setSettings(defaults);
        useStaffPermissionsStore
          .getState()
          .setPermissions(
            normalizeStaffMenuPermissions(
              defaults.staffMenuPermissions ?? [...DEFAULT_STAFF_MENU_PERMISSIONS],
            ),
          );
      }

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
        }, { onConflict: 'id' });

      if (upsertError) throw upsertError;
      setSettings(newSettings);
      useStaffPermissionsStore
        .getState()
        .setPermissions(
          normalizeStaffMenuPermissions(
            newSettings.staffMenuPermissions ?? [...DEFAULT_STAFF_MENU_PERMISSIONS],
          ),
        );
      void syncTenantBackupPathToElectron(tid, newSettings.localBackupPath);
      toast.success(
        pickUiText(
          baseLocale,
          '설정이 성공적으로 저장되었습니다.',
          'Settings saved successfully.',
          'Đã lưu cài đặt thành công.'
        )
      );
      return true;
    } catch (err: any) {
      console.error('Error saving settings:', err);
      toast.error(
        pickUiText(
          baseLocale,
          '설정 저장에 실패했습니다: ' + err.message,
          'Failed to save settings: ' + err.message,
          'Lưu cài đặt thất bại: ' + err.message
        )
      );
      return false;
    } finally {
      setLoading(false);
    }
  }, [tenantId, user?.tenant_id, supabase, baseLocale]);

  const updateProductCategories = async (newData: CategoryData) => {
    const tid = tenantId || user?.tenant_id;
    if (!tid) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ id: 'product_categories', tenant_id: tid, data: newData }, { onConflict: 'id' });

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
        .upsert({ id: 'material_categories', tenant_id: tid, data: newData }, { onConflict: 'id' });

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
        .upsert({ id: 'expense_categories', tenant_id: tid, data: newData }, { onConflict: 'id' });

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
