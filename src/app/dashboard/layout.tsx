import { createClient } from "@/utils/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { GlobalQuickNav } from "@/components/layout/global-quick-nav";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the role and tenant plan from the Profiles table server-side
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, tenant_id, tenants(plan)")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("DashboardLayout: Error fetching profile:", error);
  }

  const isSuperAdmin = profile?.role === "super_admin" || user.email === 'lilymag0301@gmail.com';
  const plan = (profile as any)?.tenants?.plan || (user.email === 'lilymag0301@gmail.com' ? 'pro' : 'free');

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar is fixed on the left */}
      <Sidebar isSuperAdmin={isSuperAdmin} plan={plan} className="hidden lg:flex" />
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <Header userEmail={user.email ?? "Unknown"} isSuperAdmin={isSuperAdmin} plan={plan} />
        
        {/* Quick access for all modules */}
        <GlobalQuickNav />
        
        {/* Central main canvas background similar to Shadcn default */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-zinc-50 dark:bg-zinc-950/50 relative z-0">
          <div className="mx-auto w-full max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
