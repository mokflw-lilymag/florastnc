"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { DesignGalleryAdminPanel } from "@/components/design-studio/DesignGalleryAdminPanel";
import { Layers } from "lucide-react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function DesignTemplatesAdminPage() {
  const { isSuperAdmin, isLoading } = useAuth();
  const router = useRouter();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);  useEffect(() => {
    if (!isLoading && !isSuperAdmin) {
      router.push("/dashboard");
    }
  }, [isLoading, isSuperAdmin, router]);

  if (isLoading || !isSuperAdmin) {
    return null; // Or a loading spinner
  }

  return (
    <div className="flex h-full flex-col bg-slate-50 animate-in fade-in duration-500">
      <header className="flex h-24 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-8">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm">
            <Layers size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight">{tf.f01125}</h1>
            <p className="text-sm font-medium text-slate-500 mt-1">{tf.f01482}</p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-hidden p-8">
        <div className="h-full rounded-[2rem] border border-slate-200 bg-white shadow-xl shadow-slate-100/50 overflow-hidden flex flex-col relative z-0">
          <DesignGalleryAdminPanel />
        </div>
      </div>
    </div>
  );
}
