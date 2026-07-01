import { createClient } from "@/utils/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { RealtimeTransferListener } from "@/components/layout/realtime-transfer-listener";
import { RealtimePartnerOrderListener } from "@/components/layout/realtime-partner-order-listener";

import { DashboardShell } from "@/components/layout/dashboard-shell";
import { AnnualRenewalReminder } from "@/components/layout/annual-renewal-reminder";
import { effectiveIsSuperAdmin } from "@/lib/auth-api-guards";
import { LOCALE_COOKIE, resolveLocale, toBaseLocale } from "@/i18n/config";
import { extractUiLocaleFromTenantSettings } from "@/i18n/apply-ui-locale";
import { pickUiText } from "@/i18n/pick-ui-text";
import {
  GUEST_BROWSE_COOKIE,
  isGuestBrowseCookieValue,
} from "@/lib/subscription/guest-trial";
import { GuestBrowseBootstrap } from "@/components/layout/guest-browse-bootstrap";
import { getPartnerOrdersEnabled } from "@/lib/platform-config-server";
import { PartnerOrdersFeatureProvider } from "@/components/providers/partner-orders-feature-provider";
import { AppMessagesProvider } from "@/components/providers/app-messages-provider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const cookieLocale = resolveLocale(cookieStore.get(LOCALE_COOKIE)?.value);
  const supabase = await createClient();
  const [{ data: { user } }, partnerOrdersEnabled] = await Promise.all([
    supabase.auth.getUser(),
    getPartnerOrdersEnabled(),
  ]);
  const isGuestBrowse = isGuestBrowseCookieValue(
    cookieStore.get(GUEST_BROWSE_COOKIE)?.value,
  );

  if (!user && !isGuestBrowse) {
    redirect(`/${cookieLocale}/login`);
  }

  if (!user && isGuestBrowse) {
    const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
    const baseLocale = toBaseLocale(resolveLocale(localeCookie));
    const guestEmail = pickUiText(
      baseLocale,
      "구경 모드 (미가입)",
      "Browse mode (not signed in)",
      "Chế độ xem (chưa đăng ký)",
      "閲覧モード（未登録）",
      "浏览模式（未注册）",
      "Modo exploración (sin cuenta)",
      "Modo visita (sem cadastro)",
      "Mode visite (non inscrit)",
      "Browse-Modus (nicht angemeldet)",
      "Режим просмотра (без входа)",
    );
    const storeName = pickUiText(
      baseLocale,
      "FloXync 체험",
      "FloXync trial",
      "FloXync dùng thử",
      "FloXync 体験",
      "FloXync 体验",
      "FloXync prueba",
      "FloXync teste",
      "FloXync essai",
      "FloXync Test",
      "FloXync проба",
    );

    return (
      <AppMessagesProvider locale={cookieLocale}>
      <PartnerOrdersFeatureProvider enabled={partnerOrdersEnabled}>
        <GuestBrowseBootstrap />
        <DashboardShell
          serverIsSuperAdmin={false}
          storeDisplayName={storeName}
          sidebar={
            <Sidebar
              isSuperAdmin={false}
              plan="free"
              isExpired={false}
              isSuspended={false}
              storeName={storeName}
              partnerOrdersEnabled={partnerOrdersEnabled}
              className="hidden lg:flex"
            />
          }
          header={
            <Header
              userEmail={guestEmail}
              isSuperAdmin={false}
              plan="free"
              isExpired={false}
              isSuspended={false}
              storeName={storeName}
              subscriptionEnd={null}
            />
          }
        >
          {children}
        </DashboardShell>
      </PartnerOrdersFeatureProvider>
      </AppMessagesProvider>
    );
  }

  if (!user) {
    redirect(`/${cookieLocale}/login`);
  }

  // 프로필과 tenants 는 분리 조회 (profiles → tenants FK가 tenant_id·org_work_tenant_id 두 개라 임베드 시 PGRST201 발생 가능)
  const [{ data: profile, error: profileError }, { count: orgMembershipCount, error: orgMemberError }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("role, tenant_id, org_work_tenant_id")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("organization_members")
        .select("organization_id", { count: "exact", head: true })
        .eq("user_id", user.id),
    ]);

  if (profileError) {
    console.error("DashboardLayout: Error fetching profile:", profileError);
  }

  const isSuperAdmin = effectiveIsSuperAdmin(profile, user.email ?? undefined);
  const isOrgUser = !orgMemberError && (orgMembershipCount ?? 0) > 0;
  const isOrgOnly = isOrgUser && !profile?.tenant_id;
  const hasOrgWorkContext = !!profile?.org_work_tenant_id;
  /** 본사 계정이 지점 업무 모드가 아닐 때만 사이드바를 HQ 전용으로 제한 */
  const hqMenuOnly = isOrgOnly && !hasOrgWorkContext;

  let showOrgBoardLink = false;
  let showBranchMaterialRequestLink = false;
  if (!isSuperAdmin) {
    if (isOrgUser) showOrgBoardLink = true;
    const branchNavTenantId = profile?.org_work_tenant_id ?? profile?.tenant_id;
    if (branchNavTenantId) {
      const { data: tenantOrgRow } = await supabase
        .from("tenants")
        .select("organization_id")
        .eq("id", branchNavTenantId)
        .maybeSingle();
      const linked = !!tenantOrgRow?.organization_id;
      if (linked) showBranchMaterialRequestLink = true;
      if (!isOrgUser) showOrgBoardLink = linked;
    } else if (profile?.tenant_id) {
      const { data: tenantOrg } = await supabase
        .from("tenants")
        .select("organization_id")
        .eq("id", profile.tenant_id)
        .maybeSingle();
      showOrgBoardLink = !!tenantOrg?.organization_id;
    }
  }

  type TenantRow = {
    plan?: string | null;
    logo_url?: string | null;
    name?: string | null;
    subscription_end?: string | null;
    subscription_start?: string | null;
    status?: string | null;
  };

  const tenantSelect =
    "plan, logo_url, name, subscription_end, subscription_start, status" as const;
  const tenantIds = [
    profile?.tenant_id,
    hasOrgWorkContext ? profile?.org_work_tenant_id : null,
  ].filter((id): id is string => Boolean(id));
  const uniqueTenantIds = [...new Set(tenantIds)];

  const tenantRows = await Promise.all(
    uniqueTenantIds.map((id) =>
      supabase.from("tenants").select(tenantSelect).eq("id", id).maybeSingle()
    )
  );
  const tenantById = new Map<string, TenantRow>();
  uniqueTenantIds.forEach((id, i) => {
    const row = tenantRows[i]?.data as TenantRow | null;
    if (row) tenantById.set(id, row);
  });

  const homeTenantData = profile?.tenant_id ? tenantById.get(profile.tenant_id) ?? null : null;
  let tenantData: TenantRow | null = homeTenantData;
  if (hasOrgWorkContext && profile?.org_work_tenant_id) {
    tenantData = tenantById.get(profile.org_work_tenant_id) ?? tenantData;
  }

  if (!isSuperAdmin && !profile?.tenant_id && !isOrgUser) {
    redirect("/onboarding");
  }

  const applySubscriptionGate = !isSuperAdmin && (!isOrgOnly || hasOrgWorkContext);

  // Logic Fix: If subscription_end is empty (null), treat it as NO SUBSCRIPTION (Expired).
  const isExpired =
    applySubscriptionGate &&
    (!tenantData?.subscription_end || new Date(tenantData.subscription_end) < new Date());
  const isSuspended = applySubscriptionGate && tenantData?.status === "suspended";

  const effectivePlan =
    tenantData?.plan || (isSuperAdmin ? "pro" : isOrgOnly ? "pro" : "free");
  const logoUrl = tenantData?.logo_url ?? undefined;
  const effectiveTenantId = hasOrgWorkContext
    ? profile?.org_work_tenant_id
    : profile?.tenant_id;

  let dashboardLocale = cookieLocale;
  if (effectiveTenantId) {
    const { data: settingsRow } = await supabase
      .from("system_settings")
      .select("data")
      .eq("id", `settings_${effectiveTenantId}`)
      .maybeSingle();
    const dbUiLocale = extractUiLocaleFromTenantSettings(
      settingsRow?.data as Record<string, unknown> | undefined,
    );
    if (dbUiLocale) dashboardLocale = dbUiLocale;
  }

  const localeCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  const baseLocale = toBaseLocale(resolveLocale(localeCookie ?? dashboardLocale));
  const storeName =
    (hqMenuOnly
      ? pickUiText(
          baseLocale,
          "본사·다매장",
          "HQ · Multi-store",
          "Trụ sở · Đa cửa hàng",
          "本部・複数店舗",
          "总部 · 多门店",
          "Matriz · multi-tienda",
          "Matriz · várias lojas",
          "Siège · multi-magasins",
          "Zentrale · mehrere Shops",
          "Офис · сеть магазинов",
        )
      : tenantData?.name) ?? undefined;

  return (
    <AppMessagesProvider locale={dashboardLocale}>
    <PartnerOrdersFeatureProvider enabled={partnerOrdersEnabled}>
    <DashboardShell
      serverIsSuperAdmin={isSuperAdmin}
      tenantId={hasOrgWorkContext ? profile?.org_work_tenant_id : profile?.tenant_id}
      storeDisplayName={storeName}
      sidebar={
        <Sidebar
          isSuperAdmin={isSuperAdmin}
          plan={effectivePlan}
          isExpired={isExpired}
          isSuspended={isSuspended}
          logoUrl={logoUrl}
          storeName={storeName}
          isOrgUser={isOrgUser}
          isOrgOnly={isOrgOnly}
          hqMenuOnly={hqMenuOnly}
          showOrgBoardLink={showOrgBoardLink}
          showBranchMaterialRequestLink={showBranchMaterialRequestLink}
          partnerOrdersEnabled={partnerOrdersEnabled}
          className="hidden lg:flex"
        />
      }
      header={
        <>
          <Header
            userEmail={user.email ?? "Unknown"}
            isSuperAdmin={isSuperAdmin}
            plan={effectivePlan}
            isExpired={isExpired}
            isSuspended={isSuspended}
            logoUrl={logoUrl}
            storeName={storeName}
            subscriptionEnd={tenantData?.subscription_end ?? null}
            isOrgOnly={isOrgOnly}
            hqMenuOnly={hqMenuOnly}
            isOrgUser={isOrgUser}
            showOrgBoardLink={showOrgBoardLink}
            showBranchMaterialRequestLink={showBranchMaterialRequestLink}
          />
          <AnnualRenewalReminder
            userId={user.id}
            subscriptionStart={tenantData?.subscription_start ?? null}
            subscriptionEnd={tenantData?.subscription_end ?? null}
            isSuperAdmin={isSuperAdmin}
            isExpired={isExpired}
            plan={effectivePlan}
          />
        </>
      }
    >
      <RealtimeTransferListener />
      <RealtimePartnerOrderListener />
      {children}
    </DashboardShell>
    </PartnerOrdersFeatureProvider>
    </AppMessagesProvider>
  );
}
