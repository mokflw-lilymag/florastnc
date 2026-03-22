import { createClient } from "@/utils/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the role and tenant plan from the Profiles table server-side
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, tenant_id, tenants(plan)")
    .eq("id", user.id)
    .maybeSingle();

  const isSuperAdmin = profile?.role === "super_admin";
  const plan = (profile as any)?.tenants?.plan || "free";

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar is fixed on the left */}
      <Sidebar isSuperAdmin={isSuperAdmin} plan={plan} />
      
      {/* Main content area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
        <Header userEmail={user.email ?? "Unknown"} isSuperAdmin={isSuperAdmin} />
        
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
