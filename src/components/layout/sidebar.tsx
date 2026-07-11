"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { 
  Printer, ScrollText, Users, Store, 
  Settings, LayoutDashboard, ShieldCheck,
  CreditCard, Boxes, Truck, BarChart3,
  Zap, ArrowRight, Gem, Share2, FileText, PlusCircle, LogOut, ShoppingCart, Layout,
  Building2,
  Megaphone,
  Package,
  Receipt,
  ClipboardList,
  Database,
  Languages,
  Key,
  BookOpen,
  Smartphone,
  CalendarDays,
  Wallet,
  History,
  RefreshCw,
  Headphones,
  Mail,
  ScanLine,
} from "lucide-react";
import Image from "next/image";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { getMessages } from "@/i18n/getMessages";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { ERP_NAV_TIERS, navTierAllows } from "@/lib/subscription/plan-access";
import { MobileAppQrButton } from "@/components/layout/mobile-app-qr-button";
import { usePosSession } from "@/hooks/use-pos-session";
import { isStaffMenuAllowed } from "@/lib/staff-menu-permissions";
import { useStaffPermissionsStore } from "@/stores/staff-permissions-store";

interface SidebarProps {
  isSuperAdmin: boolean;
  plan: string;
  isExpired?: boolean;
  isSuspended?: boolean;
  className?: string;
  logoUrl?: string;
  storeName?: string;
  /** 조직 멤버(본사·다매장 메뉴) */
  isOrgUser?: boolean;
  /** 매장 tenant 없이 본사만 */
  isOrgOnly?: boolean;
  /** true면 사이드바에 본사 메뉴만(지점 업무 모드가 아닐 때) */
  hqMenuOnly?: boolean;
  /** 조직 본사 게시판 메뉴(연결 매장·본사 멤버) */
  showOrgBoardLink?: boolean;
  /** 조직 연결 매장 → 본사 자재 요청 */
  showBranchMaterialRequestLink?: boolean;
  /** platform_config.partner_orders_enabled */
  partnerOrdersEnabled?: boolean;
}

type Tiered = { tier?: string[] };

export type NavLinkItem = {
  name: string;
  href: string;
  icon: LucideIcon;
  /** 이 경로로 시작하면 이 메뉴는 활성 표시하지 않음 (예: 설정 vs 설정/pos) */
  activeExcludePrefix?: string;
} & Tiered;

type NavGroup = {
  id: string;
  label: string;
  hint?: string;
  links: NavLinkItem[];
};

function normalizePath(p: string) {
  return p.replace(/\/$/, "") || "/";
}

/** /dashboard 는 정확히 일치할 때만, 그 외 href 는 하위 경로까지 활성 */
function isNavActive(pathname: string, href: string, activeExcludePrefix?: string) {
  const p = normalizePath(pathname);
  const h = normalizePath(href);
  if (activeExcludePrefix) {
    const ex = normalizePath(activeExcludePrefix);
    if (p === ex || p.startsWith(`${ex}/`)) return false;
  }
  if (h === "/dashboard") return p === "/dashboard";
  return p === h || p.startsWith(`${h}/`);
}

function filterTenantLink(link: NavLinkItem, ctx: { isSuperAdmin: boolean; isExpired?: boolean; isSuspended?: boolean; plan: string }) {
  if (ctx.isSuperAdmin) return true;
  if (ctx.isSuspended) return !link.tier;
  if (!link.tier) return true;
  return navTierAllows(link.tier, {
    plan: ctx.plan,
    isExpired: ctx.isExpired,
    isSuspended: ctx.isSuspended,
    isSuperAdmin: ctx.isSuperAdmin,
  });
}

export function Sidebar({
  isSuperAdmin,
  plan,
  isExpired,
  isSuspended,
  className,
  logoUrl,
  isOrgUser = false,
  isOrgOnly = false,
  hqMenuOnly,
  showOrgBoardLink = false,
  showBranchMaterialRequestLink = false,
  partnerOrdersEnabled = false,
}: SidebarProps) {
  const sidebarHqOnly = hqMenuOnly ?? isOrgOnly;
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const t = getMessages(locale).dashboardCommon;
  const mobileStoreLabel = pickUiText(
    baseLocale,
    "모바일 매장",
    "Mobile store",
    "Cửa hàng di động",
    "モバイル店舗",
    "移动门店",
    "Tienda móvil",
    "Loja móvel",
    "Magasin mobile",
    "Mobiler Shop",
    "Мобильный магазин",
  );
  
  const { isStaffMode, clearSession } = usePosSession();
  const staffMenuPermissions = useStaffPermissionsStore((state) => state.permissions);

  const handleLogout = async () => {
    if (isStaffMode) {
      toast.error("직원 모드에서는 로그아웃할 수 없습니다. 작업자 전환에서 사장님 PIN으로 전환한 뒤 로그아웃해주세요.");
      return;
    }

    if (!navigator.onLine) {
      const confirmOffline = window.confirm("⚠️ 경고: 현재 인터넷이 끊긴 오프라인 상태입니다.\n\n이 상태에서 로그아웃하시면 서버로 올라가지 않은 방금 전 주문들이 모두 영구 삭제됩니다.\n\n정말로 로그아웃 하시겠습니까?");
      if (!confirmOffline) return;
    }

    clearSession();
    await supabase.auth.signOut();
    toast.success(t.header.logoutSuccess);
    router.push("/login");
  };

  const filterCtx = { isSuperAdmin, isExpired, isSuspended, plan };

  const adminSaasBillingLabel = pickUiText(
    baseLocale,
    "SaaS 구독 · 지출 관리",
    "SaaS subscriptions",
    "Đăng ký SaaS",
    "SaaSサブスク",
    "SaaS 订阅",
    "Suscripciones SaaS",
    "Assinaturas SaaS",
    "Abonnements SaaS",
    "SaaS-Abos",
    "Подписки SaaS",
  );
  const adminSubscriptionLogLabel = pickUiText(
    baseLocale,
    "구독·결제 이력",
    "Subscription & payment log",
    "Nhật ký đăng ký & thanh toán",
    "契約・決済履歴",
    "订阅与付款记录",
    "Registro de suscripción y pago",
    "Histórico de assinatura e pagamento",
    "Journal abonnements & paiements",
    "Abo- & Zahlungsprotokoll",
    "Журнал подписок и платежей",
  );
  const adminWalletLabel = pickUiText(
    baseLocale,
    "지갑·출금",
    "Wallets & payouts",
    "Ví & rút tiền",
    "ウォレット・出金",
    "钱包与提现",
    "Carteras y retiros",
    "Carteiras e saques",
    "Portefeuilles & retraits",
    "Wallets & Auszahlungen",
    "Кошельки и вывод",
  );
  const adminSubscriptionGroup = pickUiText(
    baseLocale,
    "구독 · SaaS",
    "Subscriptions · SaaS",
    "Đăng ký · SaaS",
    "契約 · SaaS",
    "订阅 · SaaS",
    "Suscripciones · SaaS",
    "Assinaturas · SaaS",
    "Abonnements · SaaS",
    "Abos · SaaS",
    "Подписки · SaaS",
  );
  const adminWalletGroup = pickUiText(
    baseLocale,
    "지갑 · 네트워크",
    "Wallets · network",
    "Ví · mạng lưới",
    "ウォレット · ネットワーク",
    "钱包 · 网络",
    "Carteras · red",
    "Carteiras · rede",
    "Portefeuilles · réseau",
    "Wallets · Netzwerk",
    "Кошельки · сеть",
  );
  const adminGlobalGroup = pickUiText(
    baseLocale,
    "글로벌 · 연동",
    "Global · integrations",
    "Toàn cầu · tích hợp",
    "グローバル · 連携",
    "全球 · 集成",
    "Global · integraciones",
    "Global · integrações",
    "Global · intégrations",
    "Global · Integrationen",
    "Глобаль · интеграции",
  );

  const adminGroups: NavGroup[] = [
    {
      id: "admin-overview",
      label: t.sidebar.groups.adminOverview,
      hint: t.sidebar.hints.adminOverview,
      links: [{ name: t.sidebar.links.systemDashboard, href: "/dashboard", icon: LayoutDashboard }],
    },
    {
      id: "admin-ops",
      label: t.sidebar.groups.adminOps,
      links: [
        { name: t.sidebar.links.staff, href: "/dashboard/admin/staff", icon: Users },
        { name: t.sidebar.links.checklist, href: "/dashboard/admin/checklist", icon: ShieldCheck },
        { name: t.sidebar.links.tenants, href: "/dashboard/tenants", icon: Store },
        { name: t.sidebar.links.seed, href: "/dashboard/admin/tenant-master-seed", icon: Database },
        { name: t.sidebar.links.organizations, href: "/dashboard/admin/organizations", icon: Building2 },
        { name: t.sidebar.links.announcements, href: "/dashboard/announcements", icon: ScrollText },
      ],
    },
    {
      id: "admin-subscription",
      label: adminSubscriptionGroup,
      links: [
        { name: adminSaasBillingLabel, href: "/dashboard/admin/billing", icon: Gem },
        { name: adminSubscriptionLogLabel, href: "/dashboard/admin/subscription-events", icon: History },
      ],
    },
    {
      id: "admin-content",
      label: t.sidebar.groups.adminContent,
      links: [
        { name: t.sidebar.links.faq, href: "/dashboard/admin/faq", icon: FileText },
        { name: pickUiText(baseLocale, "고객 문의", "Support tickets", "Vé hỗ trợ", "サポートチケット", "支持票", "支援票", "Tickets de soporte", "Tíquetes de suporte", "Billets d'assistance", "Support-Tickets", "Билеты в службу поддержки"), href: "/dashboard/admin/support", icon: Headphones },
        { name: pickUiText(baseLocale, "이메일 · SMTP", "Email hub", "Trung tâm email", "電子メールハブ", "电子邮件中心", "電子郵件中心", "Centro de correo electrónico", "Central de e-mail", "Centre de messagerie", "E-Mail-Hub", "Центр электронной почты"), href: "/dashboard/admin/email-hub", icon: Mail },
        { name: pickUiText(baseLocale, "임대 장비 관리", "Leased equipment", "Thiết bị cho thuê", "リース機器", "租赁设备", "租賃設備", "Equipo arrendado", "Equipamento alugado", "Matériel loué", "Geleaste Ausrüstung", "Арендованное оборудование"), href: "/dashboard/admin/printers", icon: Printer },
        { name: pickUiText(baseLocale, "출고 · 반납", "Shipment & return", "Lô hàng & trả lại", "発送と返品", "发货与退货", "出貨與退貨", "Envío y devolución", "Envio e devolução", "Expédition et retour", "Versand & Rückgabe", "Отгрузка и возврат"), href: "/dashboard/admin/printer-logistics", icon: Truck },
      ],
    },
    {
      id: "admin-system",
      label: t.sidebar.groups.adminSystem,
      links: [
        { name: t.sidebar.links.globalSettings, href: "/dashboard/system-settings", icon: Settings },
        { name: t.sidebar.links.storeSettings, href: "/dashboard/settings", icon: Settings },
      ],
    },
    {
      id: "admin-global",
      label: adminGlobalGroup,
      links: [
        { name: pickUiText(baseLocale, "한국 연동 API", "Korea integrations", "hội nhập Hàn Quốc", "韓国の統合", "韩国一体化", "韓國一體化", "integraciones de corea", "Integrações da Coreia", "Intégrations en Corée", "Korea-Integrationen", "Интеграция Кореи"), href: "/dashboard/admin/regional-keys", icon: Key },
        { name: pickUiText(baseLocale, "통합 운영 매뉴얼", "Operations manual", "Hướng dẫn vận hành", "操作マニュアル", "操作手册", "操作手冊", "manual de operaciones", "Manual de operações", "Manuel d'exploitation", "Betriebshandbuch", "Руководство по эксплуатации"), href: "/dashboard/admin/manual/guide", icon: BookOpen },
        { name: pickUiText(baseLocale, "번역 관리", "Translations", "Bản dịch", "翻訳", "翻译", "翻譯", "Traducciones", "Traduções", "Traductions", "Übersetzungen", "Переводы"), href: "/dashboard/admin/translations", icon: Languages },
      ],
    },
  ];

  const hqGroup: NavGroup = {
    id: "hq",
    label: t.sidebar.groups.hq,
    hint: t.sidebar.hints.hq,
    links: [
      { name: t.sidebar.links.hqOverview, href: "/dashboard/hq", icon: Building2 },
      {
        name: pickUiText(baseLocale, "본사 담당자 관리", "HQ team", "đội HQ", "本社チーム", "总部团队", "總部團隊", "equipo de la sede", "Equipe da sede", "Équipe du QG", "HQ-Team", "Штаб-квартира"),
        href: "/dashboard/hq/team",
        icon: Users,
      },
      { name: pickUiText(baseLocale, "다매장 수발주 정산", "HQ Order Transfers", "Chuyển lệnh HQ", "本社注文の転送", "总部订单转移", "總部訂單轉移", "Transferencias de pedidos de la sede central", "Transferências de pedidos da sede", "Transferts de commandes du siège social", "HQ-Auftragsübertragungen", "Заказ трансфера в штаб-квартире"), href: "/dashboard/hq/transfers", icon: RefreshCw },
      { 
        name: pickUiText(baseLocale, "공동상품/자재/카테고리관리", "Shared Products/Materials/Categories", "Sản phẩm/Tài liệu/Danh mục được chia sẻ", "共通製品/材料/カテゴリ", "共享产品/材料/类别", "共享產品/材料/類別", "Productos/materiales/categorías compartidos", "Produtos/materiais/categorias compartilhados", "Produits/Matériaux/Catégories partagés", "Geteilte Produkte/Materialien/Kategorien", "Общие продукты/материалы/категории"), 
        href: "/dashboard/hq/shared-products", 
        icon: Package 
      },
      { name: t.sidebar.links.branchExpenses, href: "/dashboard/hq/branch-expenses", icon: Receipt },
      { name: t.sidebar.links.hqMaterials, href: "/dashboard/hq/material-requests", icon: ClipboardList },
      { name: t.sidebar.links.hqBoard, href: "/dashboard/org-board", icon: Megaphone },
    ],
  };

  const tenantGroups: NavGroup[] = [
    {
      id: "tenant-home",
      label: t.sidebar.groups.tenantHome,
      hint: t.sidebar.hints.tenantHome,
      links: [
        { name: t.sidebar.links.home, href: "/dashboard", icon: LayoutDashboard },
        { name: t.sidebar.links.schedule, href: "/dashboard/schedule", icon: CalendarDays, tier: [...ERP_NAV_TIERS] },
      ],
    },
    {
      id: "tenant-ops",
      label: t.sidebar.groups.tenantOps,
      hint: t.sidebar.hints.tenantOps,
      links: [
        // 1순위: 본사 게시판 (조직이 있을 때만)
        ...(showOrgBoardLink
          ? [{ name: t.sidebar.links.hqBoard, href: "/dashboard/org-board", icon: Megaphone }]
          : []),
        // 2순위: 본사 자재 요청 (조직이 있을 때만)
        ...(showBranchMaterialRequestLink && !sidebarHqOnly
          ? ([
              {
                name: t.sidebar.links.branchMaterials,
                href: "/dashboard/material-requests",
                icon: ClipboardList,
                tier: [...ERP_NAV_TIERS],
              },
            ] as NavLinkItem[])
          : []),
        // 지점 주문이관 — 조직(본사·다매장) 소속만 사이드바 노출
        ...(showOrgBoardLink
          ? ([
              {
                name: pickUiText(baseLocale, "지점 수발주 내역", "Branch Transfers", "Chuyển chi nhánh", "支店移転", "分行转账", "分行轉帳", "Transferencias de sucursales", "Transferências de filiais", "Transferts de succursales", "Filialübertragungen", "Трансферы филиалов"),
                href: "/dashboard/orders/transfers",
                icon: RefreshCw,
                tier: [...ERP_NAV_TIERS],
              },
            ] as NavLinkItem[])
          : []),
        {
          name: mobileStoreLabel,
          href: "/dashboard/mobile/pickup",
          icon: Smartphone,
          tier: [...ERP_NAV_TIERS],
        },
        { name: t.sidebar.links.newOrder, href: "/dashboard/orders/new", icon: PlusCircle, tier: [...ERP_NAV_TIERS] },
        {
          name: t.sidebar.links.orders,
          href: "/dashboard/orders",
          icon: ScrollText,
          tier: [...ERP_NAV_TIERS],
          activeExcludePrefix: "/dashboard/orders/new",
        },
        { name: t.sidebar.links.delivery, href: "/dashboard/delivery", icon: Truck, tier: [...ERP_NAV_TIERS] },
        { name: t.sidebar.links.crm, href: "/dashboard/customers", icon: Users, tier: [...ERP_NAV_TIERS] },
        { name: t.sidebar.links.products, href: "/dashboard/products", icon: Boxes, tier: [...ERP_NAV_TIERS] },
        { name: t.sidebar.links.inventory, href: "/dashboard/inventory", icon: Boxes, tier: [...ERP_NAV_TIERS], activeExcludePrefix: "/dashboard/inventory/barcode-scanner" },
        { name: pickUiText(baseLocale, "바코드 스캐너", "Barcode Scanner", "Máy quét mã vạch", "バーコードスキャナー", "条码扫描仪", "條碼掃描儀", "Escáner de código de barras", "Leitor de código de barras", "Lecteur de codes à barres", "Barcode-Scanner", "Сканер штрих-кода"), href: "/dashboard/inventory/barcode-scanner", icon: ScanLine, tier: [...ERP_NAV_TIERS] },
        { name: pickUiText(baseLocale, "입출고 내역", "Inventory Logs", "Nhật ký hàng tồn kho", "インベントリログ", "库存日志", "庫存日誌", "Registros de inventario", "Registros de inventário", "Journaux d'inventaire", "Inventarprotokolle", "Журналы инвентаризации"), href: "/dashboard/inventory/logs", icon: ClipboardList, tier: [...ERP_NAV_TIERS] },
        { name: t.sidebar.links.suppliers, href: "/dashboard/suppliers", icon: Store, tier: [...ERP_NAV_TIERS] },
        { name: t.sidebar.links.purchases, href: "/dashboard/purchases", icon: ShoppingCart, tier: [...ERP_NAV_TIERS] },
        { name: t.sidebar.links.reports, href: "/dashboard/reports", icon: BarChart3, tier: [...ERP_NAV_TIERS] },
        { name: t.sidebar.links.analytics, href: "/dashboard/analytics", icon: BarChart3, tier: [...ERP_NAV_TIERS] },
        { name: t.sidebar.links.expenses, href: "/dashboard/expenses", icon: CreditCard, tier: [...ERP_NAV_TIERS] },
        { name: t.sidebar.links.tax, href: "/dashboard/tax", icon: FileText, tier: [...ERP_NAV_TIERS] },
        {
          name: pickUiText(baseLocale, "직원 · HR", "Staff · HR", "Nhân sự", "スタッフ・HR", "员工·人事", "員工·HR", "Personal · RR. HH.", "Pessoal · RH", "Personnel · RH", "Personal · HR", "Персонал · HR"),
          href: "/dashboard/staff",
          icon: Users,
          tier: [...ERP_NAV_TIERS],
        },
      ],
    },
    {
      id: "tenant-make",
      label: t.sidebar.groups.tenantMake,
      hint: t.sidebar.hints.tenantMake,
      links: [
        { name: t.sidebar.links.printer, href: "/dashboard/printer", icon: Printer, tier: ["pro", "ribbon_only", "free"] },
      ],
    },
    {
      id: "tenant-store",
      label: t.sidebar.groups.tenantStore,
      hint: t.sidebar.hints.tenantStore,
      links: [
        { name: pickUiText(baseLocale, "고객센터", "Support", "Ủng hộ", "サポート", "支持", "支援", "Apoyo", "Apoiar", "Soutien", "Unterstützung", "Поддерживать"), href: "/dashboard/support", icon: Headphones },
        { name: t.sidebar.links.settings, href: "/dashboard/settings", icon: Settings },
        { name: t.sidebar.links.subscription, href: "/dashboard/subscription", icon: Gem },
      ],
    },
  ];

  const tenantNavFiltered = tenantGroups
    .map((g) => ({
      ...g,
      links: g.links.filter((l) => {
        // Staff permission check — PIN 전환 또는 직원 로그인 시 허용된 메뉴만 표시
        if (isStaffMode && !isSuperAdmin) {
          if (!isStaffMenuAllowed(l.href, staffMenuPermissions)) return false;
        }

        return filterTenantLink(l, filterCtx);
      }),
    }))
    .filter((g) => g.links.length > 0);

  const navGroups = isSuperAdmin
    ? adminGroups
    : sidebarHqOnly
      ? [hqGroup]
      : isOrgUser && !isStaffMode
        ? [hqGroup, ...tenantNavFiltered]
        : tenantNavFiltered;

  return (
    <aside className={cn("flex w-64 flex-col bg-white border-r border-slate-100 h-full z-20 shadow-sm", className)}>
      <div className="p-6 pb-2">
        {logoUrl ? (
            <div className="relative mx-auto h-10 w-44 max-w-full">
              <Image
                src={logoUrl}
                alt={t.sidebar.altStoreLogo}
                fill
                priority
                sizes="176px"
                className="object-contain mix-blend-multiply dark:mix-blend-normal dark:invert"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-1 py-1">
              <div className="relative mx-auto h-9 w-40 max-w-full dark:hidden">
                <Image
                  src="/images/floxync-logo-dark.png"
                  alt={t.sidebar.altBrandLogo}
                  fill
                  priority
                  sizes="160px"
                  className="object-contain"
                />
              </div>
              <div className="relative mx-auto hidden h-9 w-40 max-w-full dark:block">
                <Image
                  src="/images/floxync-logo-white.png"
                  alt={t.sidebar.altBrandLogo}
                  fill
                  priority
                  sizes="160px"
                  className="object-contain"
                />
              </div>
          </div>
        )}
        <div className="mt-3 text-center">
           <span className={cn(
             "text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block border",
             isSuperAdmin
               ? "bg-blue-50 text-blue-600 border-blue-100"
               : sidebarHqOnly
                 ? "bg-violet-50 text-violet-700 border-violet-100"
                 : isOrgOnly
                   ? "bg-sky-50 text-sky-800 border-sky-100"
                   : "bg-emerald-50 text-emerald-600 border-emerald-100"
           )}>
             {isSuperAdmin ? t.sidebar.badgeAdmin : sidebarHqOnly ? t.sidebar.badgeHq : isOrgOnly ? t.sidebar.hqWorkMode : t.sidebar.badgePartner}
           </span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.id} className="mb-6 last:mb-2">
            <div className="px-3 mb-1.5">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-400">
                {group.label}
              </p>
              {group.hint ? (
                <p className="text-[10px] text-slate-400/90 mt-0.5 leading-snug">{group.hint}</p>
              ) : null}
            </div>
            <div className="space-y-0.5">
              {group.links.map((link) => {
                const isActive = isNavActive(pathname, link.href, link.activeExcludePrefix);
                const Icon = link.icon;
                return (
                  <Link
                    key={`${group.id}-${link.href}`}
                    href={link.href}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 text-[13px] font-medium rounded-lg transition-all duration-150",
                      isActive
                        ? "bg-slate-900 text-white shadow-md shadow-slate-200/80"
                        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                    )}
                  >
                    <Icon
                      className={cn(
                        "flex-shrink-0 h-[18px] w-[18px]",
                        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{link.name}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
        <div className="px-3 mb-2">
          <MobileAppQrButton />
        </div>
        {!isStaffMode && (
          <button
            onClick={handleLogout}
            className="w-full group flex items-center px-3 py-2.5 text-sm font-normal rounded-lg transition-all duration-200 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
          >
            <LogOut 
              className="mr-3 flex-shrink-0 h-5 w-5 transition-transform duration-200 group-hover:scale-110 text-red-400 group-hover:text-red-600" 
              aria-hidden="true" 
            />
            {t.sidebar.logout}
          </button>
        )}
      </nav>

      {/* Upgrade Promo for Tenants */}
      {!isSuperAdmin && !sidebarHqOnly && plan !== 'pro' && (
        <div className="px-4 pb-4">
          <Link href="/dashboard/subscription" className="block">
            <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[24px] p-6 text-white shadow-xl shadow-blue-100 dark:shadow-none hover:scale-[1.02] transition-all duration-300 group relative overflow-hidden">
               <Zap className="absolute -right-2 -bottom-2 h-14 w-14 opacity-20 group-hover:rotate-12 transition-transform" />
               <div className="relative z-10">
                  <p className="text-xs font-light uppercase tracking-[0.2em] opacity-80 mb-3">{t.sidebar.membershipUpgrade}</p>
                  <p className="text-xl font-normal leading-tight tracking-tight">PRO Plan<br />{t.sidebar.getBenefits}</p>
                  <div className="mt-5 inline-flex items-center text-xs font-light bg-white/20 px-4 py-2 rounded-2xl backdrop-blur-sm group-hover:bg-white/30 transition-colors">
                     {t.sidebar.checkPlan} <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
               </div>
            </div>
          </Link>
        </div>
      )}
      
      {/* Footer Info */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800">
        <p className="text-[10px] text-center text-slate-400 font-normal uppercase tracking-widest mb-1">Floxync v25.0</p>
        <p className="text-[10px] text-center text-slate-400/80">
          {t.sidebar.support}: <a href="mailto:admin@floxync.com" className="hover:text-slate-600 transition-colors font-medium">admin@floxync.com</a>
        </p>
      </div>
    </aside>
  );
}

