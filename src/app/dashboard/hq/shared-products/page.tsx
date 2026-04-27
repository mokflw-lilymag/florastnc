"use client";

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
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);

  useEffect(() => {
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
          title={tr("공동상품관리", "Shared Product Management")}
          description={tr("조직에 속한 지점으로 배포할 공유 상품을 등록합니다. 지점 화면의 상품 메뉴에서 가져올 수 있습니다.", "Register shared products to distribute to organization branches. Branches can import from products menu.")}
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
          title={tr("공동상품관리", "Shared Product Management")}
          description={tr("조직 단위로 지점에 내려보낼 공유 상품(브랜드 상품)을 등록·관리합니다.", "Register/manage shared (brand) products distributed to branches by organization.")}
          icon={Package}
        />
        <Card className="max-w-lg border-slate-200">
          <CardHeader>
            <CardTitle>{tr("이용할 수 없습니다", "Not available")}</CardTitle>
            <CardDescription>
              {tr("조직에 배정된 계정만 공동 상품을 관리할 수 있습니다. 플랫폼 관리자에게 멤버 배정을 요청하세요.", "Only organization-assigned accounts can manage shared products. Ask platform admin for membership assignment.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => router.push("/dashboard/hq")}>
              {tr("본사 개요로", "Back to HQ")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto p-6 space-y-8 animate-in fade-in duration-500">
      <PageHeader
        title={tr("공동상품관리", "Shared Product Management")}
        description={tr("조직에 속한 지점으로 배포할 공유 상품을 등록합니다. 지점 화면의 상품 메뉴에서 가져올 수 있습니다.", "Register shared products to distribute to organization branches. Branches can import from products menu.")}
        icon={Package}
      />
      <p className="text-sm text-muted-foreground">
        {tr("공지·게시는 사이드바", "Announcements are managed from sidebar")}{" "}
        <Link href="/dashboard/org-board" className="text-primary font-medium underline underline-offset-4">
          {tr("본사 게시판", "HQ Board")}
        </Link>
        {tr("에서 처리합니다.", ".")}
      </p>
      <HqCatalogSection orgNames={organizations} canManage={canManage} />
    </div>
  );
}
