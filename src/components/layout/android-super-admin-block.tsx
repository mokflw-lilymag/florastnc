"use client";

import { useRouter } from "next/navigation";
import { MonitorSmartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/utils/supabase/client";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { getMessages } from "@/i18n/getMessages";
import { toast } from "sonner";

export function AndroidSuperAdminBlock() {
  const router = useRouter();
  const locale = usePreferredLocale();
  const B = getMessages(locale).androidChrome.superAdminBlock;
  const t = getMessages(locale).dashboardCommon.header;

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success(t.logoutSuccess);
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="rounded-3xl border border-amber-200 bg-amber-50/80 p-6 dark:border-amber-900 dark:bg-amber-950/40">
        <MonitorSmartphone className="mx-auto mb-4 h-14 w-14 text-amber-700 dark:text-amber-300" aria-hidden />
        <h1 className="text-lg font-semibold text-amber-950 dark:text-amber-50">{B.title}</h1>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-amber-900/90 dark:text-amber-100/90">
          {B.body}
        </p>
        <Button className="mt-6 w-full max-w-xs rounded-2xl" variant="default" onClick={handleLogout}>
          {B.logout}
        </Button>
      </div>
    </div>
  );
}
