"use client";
import { getMessages } from "@/i18n/getMessages";

import { useEffect, useState } from "react";
import { Loader2, Package } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HqCatalogSection } from "@/components/hq/hq-catalog-section";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function HqSharedProductsPage() {
  const router = useRouter();
  const { profile, isLoading: authLoading, isSuperAdmin } = useAuth();
  const [ctxLoading, setCtxLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [canManage, setCanManage] = useState(false);
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);  useEffect(() => {
    if (authLoading) return;
    let cancelled = false;
    (async () => {
      setCtxLoading(true);
      setForbidden(false);
      try {
        const res = await fetch("/api/hq/compose-context", { credentials: "include" });
        if (res.status === 401) {
          if (!cancelled) setForbidden(true);
          return;
        }
        if (!res.ok) {
          if (!cancelled) setForbidden(true);
          return;
        }
        const json = await res.json();
        if (!cancelled) {
          setOrganizations(json.organizations ?? []);
          setCanManage(json.canManageAnnouncements === true);
        }
      } catch {
        if (!cancelled) setForbidden(true);
      } finally {
        if (!cancelled) setCtxLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [authLoading]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  if (ctxLoading) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-8">
        <PageHeader
          title={tf.f00952}
          description={tf.f01853}
          icon={Package}
        />
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      </div>
    );
  }

  if (forbidden || (!isSuperAdmin && organizations.length === 0)) {
    return (
      <div className="container max-w-6xl mx-auto p-6 space-y-6">
        <PageHeader
          title={tf.f00952}
          description={tf.f01832}
          icon={Package}
        />
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>{tf.f01688}</CardTitle>
            <CardDescription>
              {tf.f01849}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/dashboard/hq")}>
              {tf.f01264}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={tf.f00952}
        description={tf.f01853}
        icon={Package}
      />
      <p className="text-sm text-muted-foreground">
        {tf.f00957}{" "}
        <Link href="/dashboard/org-board" className="text-primary font-medium underline underline-offset-4">
          {tf.f01266}
        </Link>
        {tf.f01549}
      </p>
      <HqCatalogSection orgNames={organizations} canManage={canManage} />
    </div>
  );
}
