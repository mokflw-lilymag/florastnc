import { createClient } from "@/utils/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { redirect } from "next/navigation";

import { QuickChat } from "@/components/chat/quick-chat";
import { DashboardMain } from "@/components/layout/dashboard-main";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the role and tenant details server-side
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, tenant_id, tenants(plan, logo_url, name, subscription_end, status)")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("DashboardLayout: Error fetching profile:", error);
  }

  const isSuperAdmin = !!(profile?.role === "super_admin" || user.email === 'lilymag0301@gmail.com');
  const tenantData = (profile as any)?.tenants;
  
  // Logic Fix: If subscription_end is empty (null), treat it as NO SUBSCRIPTION (Expired).
  // Unlimited access should use a far-future date (e.g. 2099) instead of null.
  const isExpired = !tenantData?.subscription_end || new Date(tenantData.subscription_end) < new Date();
  const isSuspended = tenantData?.status === 'suspended';
  
  // If expired or suspended, for non-admins, the effective plan is 'free' or restricted
  const effectivePlan = tenantData?.plan || (isSuperAdmin ? 'pro' : 'free');
  const logoUrl = tenantData?.logo_url;
  const storeName = tenantData?.name;

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
        />
        
        <DashboardMain>
          {children}
        </DashboardMain>

        <QuickChat />
      </div>
    </div>
  );
}
