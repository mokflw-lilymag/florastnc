"use client";

import { useState } from "react";
import { Bell, CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import {
  getRegionalIntegrations,
  RegionalApp,
  IntegrationStatus,
} from "@/lib/regional-integrations";

// ─── 국가 메타 ──────────────────────────────────────────
const COUNTRY_META: Record<string, { flag: string; name: string }> = {
  KR: { flag: "🇰🇷", name: "대한민국" },
  VN: { flag: "🇻🇳", name: "베트남" },
  JP: { flag: "🇯🇵", name: "일본" },
  CN: { flag: "🇨🇳", name: "중국" },
  ID: { flag: "🇮🇩", name: "인도네시아" },
  MY: { flag: "🇲🇾", name: "말레이시아" },
  TH: { flag: "🇹🇭", name: "태국" },
  US: { flag: "🇺🇸", name: "미국" },
  GB: { flag: "🇬🇧", name: "영국" },
  FR: { flag: "🇫🇷", name: "프랑스" },
  DE: { flag: "🇩🇪", name: "독일" },
  ES: { flag: "🇪🇸", name: "스페인" },
  RU: { flag: "🇷🇺", name: "러시아" },
};

const SECTION_LABELS: Record<string, string> = {
  delivery: "🚚 배달 대행",
  messaging: "💬 메신저 / 알림",
  ecommerce: "🛒 쇼핑몰 / 마켓플레이스",
};

// ─── 앱 카드 ────────────────────────────────────────────
function AppCard({
  app,
  tenantId,
  countryCode,
}: {
  app: RegionalApp;
  tenantId: string;
  countryCode: string;
}) {
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleNotifyRequest = async () => {
    setSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.from("integration_notify_requests").upsert(
        {
          tenant_id: tenantId,
          platform: app.platform,
          country_code: countryCode,
          requested_at: new Date().toISOString(),
        },
        { onConflict: "tenant_id,platform" }
      );
      toast.success("알림 신청 완료!", {
        description: `${app.label} 연동이 준비되면 가장 먼저 알려드릴게요 😊`,
      });
      setNotifyOpen(false);
    } catch {
      toast.error("신청 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  const isActive = app.status === "active";

  return (
    <>
      <div
        className={`relative flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 ${
          isActive
            ? "bg-white border-emerald-200 shadow-sm hover:shadow-md"
            : "bg-slate-50/60 border-slate-200 hover:border-slate-300"
        }`}
      >
        {/* 아이콘 */}
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow"
          style={{ backgroundColor: app.iconBg, color: app.iconBg === "#FEE500" ? "#1a1a1a" : "white" }}
        >
          {app.iconText}
        </div>

        {/* 내용 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold text-sm text-slate-800">{app.label}</span>
            {isActive ? (
              <Badge className="bg-emerald-100 text-emerald-700 border-0 text-[10px] h-4 px-1.5 gap-0.5">
                <CheckCircle2 className="w-2.5 h-2.5" />
                연동 가능
              </Badge>
            ) : (
              <Badge className="bg-slate-100 text-slate-500 border-0 text-[10px] h-4 px-1.5 gap-0.5">
                <Clock className="w-2.5 h-2.5" />
                준비 중
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{app.description}</p>
        </div>

        {/* 액션 버튼 */}
        <div className="shrink-0">
          {isActive ? (
            <Button size="sm" variant="outline" className="h-7 text-xs rounded-full border-emerald-300 text-emerald-700 hover:bg-emerald-50">
              <ExternalLink className="w-3 h-3 mr-1" />
              설정
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs rounded-full text-slate-500 hover:bg-slate-100"
              onClick={() => setNotifyOpen(true)}
            >
              <Bell className="w-3 h-3 mr-1" />
              알림 받기
            </Button>
          )}
        </div>
      </div>

      {/* 알림 신청 다이얼로그 */}
      <Dialog open={notifyOpen} onOpenChange={setNotifyOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-extrabold shadow"
                style={{ backgroundColor: app.iconBg, color: app.iconBg === "#FEE500" ? "#1a1a1a" : "white" }}
              >
                {app.iconText}
              </div>
              {app.label} 연동 알림 신청
            </DialogTitle>
            <DialogDescription>
              현재 <strong>{app.label}</strong> 연동을 개발 중입니다.
              준비가 완료되면 이메일로 가장 먼저 알려드릴게요! 🎉
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setNotifyOpen(false)}>
              취소
            </Button>
            <Button
              className="bg-slate-800 hover:bg-slate-700 text-white"
              onClick={handleNotifyRequest}
              disabled={submitting}
            >
              <Bell className="w-3.5 h-3.5 mr-1.5" />
              {submitting ? "신청 중..." : "알림 신청하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── 메인 컴포넌트 ───────────────────────────────────────
export function RegionalIntegrationPanel({
  countryCode,
  tenantId,
}: {
  countryCode: string;
  tenantId: string;
}) {
  const config = getRegionalIntegrations(countryCode);
  const meta = COUNTRY_META[countryCode];
  const sections = (["delivery", "messaging", "ecommerce"] as const).filter(
    (s) => config[s].length > 0
  );

  return (
    <Card className="border-0 shadow-sm ring-1 ring-violet-200 bg-violet-50/10 overflow-hidden my-6">
      <CardHeader className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white">
        <div className="flex items-center gap-2">
          <span className="text-xl">{meta?.flag ?? "🌐"}</span>
          <div>
            <CardTitle className="text-base">
              {meta?.name ?? countryCode} 지역 서비스 연동
            </CardTitle>
            <p className="text-violet-200 text-xs mt-0.5">
              현재 국가에서 사용 가능한 배달·메신저·쇼핑몰 앱을 연결하세요
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        {sections.map((section) => (
          <div key={section} className="space-y-3">
            <h4 className="font-bold text-sm text-slate-700">
              {SECTION_LABELS[section]}
            </h4>
            <div className="space-y-2">
              {config[section].map((app) => (
                <AppCard
                  key={app.platform}
                  app={app}
                  tenantId={tenantId}
                  countryCode={countryCode}
                />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
