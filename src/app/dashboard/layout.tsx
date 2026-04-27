import { createClient } from "@/utils/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

import { QuickChat } from "@/components/chat/quick-chat";
import { DashboardMain } from "@/components/layout/dashboard-main";
import { AnnualRenewalReminder } from "@/components/layout/annual-renewal-reminder";
import { AndroidAppChrome } from "@/components/layout/android-app-chrome";
import { effectiveIsSuperAdmin } from "@/lib/auth-api-guards";
import { LOCALE_COOKIE, resolveLocale } from "@/i18n/config";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // 프로필과 tenants 는 분리 조회 (profiles → tenants FK가 tenant_id·org_work_tenant_id 두 개라 임베드 시 PGRST201 발생 가능)
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, tenant_id, org_work_tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("DashboardLayout: Error fetching profile:", error);
  }

  const isSuperAdmin = effectiveIsSuperAdmin(profile, user.email ?? undefined);

  let isOrgUser = false;
  const { count: orgMembershipCount, error: orgMemberError } = await supabase
    .from("organization_members")
    .select("organization_id", { count: "exact", head: true })
    .eq("user_id", user.id);

  if (!orgMemberError) {
    isOrgUser = (orgMembershipCount ?? 0) > 0;
  }
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

  let homeTenantData: TenantRow | null = null;
  if (profile?.tenant_id) {
    const { data: ht } = await supabase
      .from("tenants")
      .select("plan, logo_url, name, subscription_end, subscription_start, status")
      .eq("id", profile.tenant_id)
      .maybeSingle();
    homeTenantData = (ht as TenantRow | null) ?? null;
  }

  let tenantData: TenantRow | null = homeTenantData;
  if (hasOrgWorkContext && profile?.org_work_tenant_id) {
    const { data: workTenant } = await supabase
      .from("tenants")
      .select("plan, logo_url, name, subscription_end, subscription_start, status")
      .eq("id", profile.org_work_tenant_id)
      .maybeSingle();
    if (workTenant) tenantData = workTenant as TenantRow;
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
  const localeCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const isKo = resolveLocale(localeCookie).startsWith("ko");
  const storeName = (hqMenuOnly ? (isKo ? "본사·다매장" : "HQ · Multi-store") : tenantData?.name) ?? undefined;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar is fixed on the left */}
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
        className="hidden lg:flex" 
      />
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
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
        
        <DashboardMain>
          {children}
        </DashboardMain>

        <QuickChat />
        <AndroidAppChrome />
      </div>
    </div>
  );
}
