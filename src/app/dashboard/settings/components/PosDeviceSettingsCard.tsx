"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MonitorSmartphone, ShieldCheck, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { isElectronClient } from "@/lib/electron-env";

export function PosDeviceSettingsCard() {
  const [isDesktopApp, setIsDesktopApp] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const desktop = isElectronClient();
    setIsDesktopApp(desktop);
    if (desktop) {
      setIsRegistered(true);
      setLoading(false);
      return;
    }
    void checkRegistration();
  }, []);

  const checkRegistration = async () => {
    try {
      const res = await fetch("/api/pos/register");
      if (res.ok) {
        const data = await res.json();
        setIsRegistered(data.isRegistered);
      }
    } catch (error) {
      console.error("Failed to check POS registration:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRegistration = async () => {
    const action = isRegistered ? "unregister" : "register";
    const confirmMsg = isRegistered 
      ? "이 기기를 출퇴근용 POS 기기에서 해제하시겠습니까?"
      : "이 기기를 매장의 공식 출퇴근용 POS 기기로 지정하시겠습니까?";
      
    if (!confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const res = await fetch("/api/pos/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "API Request Failed",
        );
      }

      setIsRegistered(!isRegistered);
      toast.success(isRegistered ? "POS 기기 해제 완료" : "출퇴근용 POS 기기로 지정 완료");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "처리 중 오류가 발생했습니다.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={cn("border-0 shadow-sm ring-1 transition-all", isRegistered ? "ring-emerald-200 bg-emerald-50/10" : "ring-slate-200")}>
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <CardTitle className="text-xl flex items-center gap-2">
            <MonitorSmartphone className={cn("h-5 w-5", isRegistered ? "text-emerald-500" : "text-slate-500")} />
            출퇴근용 기기로 지정
          </CardTitle>
          <CardDescription className="mt-1">
            웹 브라우저에서 출퇴근을 허용하려면 이 기기를 POS로 지정하세요.
            윈도우 앱(Floxync Desktop)은 매장 POS로 자동 인식됩니다.
            웹과 윈도우 앱의 지정 상태는 서로 공유되지 않습니다.
            <div className="mt-2 text-rose-600 font-medium bg-rose-50/80 px-2.5 py-1 rounded-md flex items-center gap-1.5 w-fit border border-rose-100">
              <AlertCircle className="h-4 w-4" />
              모바일 기기는 지원되지 않습니다.
            </div>
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isRegistered ? (
              <>
                <ShieldCheck className="h-10 w-10 text-emerald-500 bg-emerald-100 p-2 rounded-full" />
                <div>
                  <p className="font-semibold text-emerald-700">
                    {isDesktopApp ? "윈도우 앱 — 출퇴근 POS 자동 인식" : "현재 기기가 POS로 지정됨"}
                  </p>
                  <p className="text-sm text-emerald-600/80">
                    {isDesktopApp
                      ? "데스크톱 앱에서는 별도 지정 없이 출근·퇴근이 가능합니다."
                      : "이 브라우저에서만 직원들의 출퇴근 기록이 가능합니다."}
                  </p>
                </div>
              </>
            ) : (
              <>
                <MonitorSmartphone className="h-10 w-10 text-slate-400 bg-slate-100 p-2 rounded-full" />
                <div>
                  <p className="font-semibold text-slate-700">현재 기기가 POS로 지정되지 않음</p>
                  <p className="text-sm text-slate-500">지정되지 않은 상태에서는 출퇴근 기능이 제한됩니다.</p>
                </div>
              </>
            )}
          </div>
          {!isDesktopApp && (
            <Button 
              disabled={loading}
              onClick={toggleRegistration}
              variant={isRegistered ? "outline" : "default"}
              className={isRegistered ? "border-rose-200 text-rose-600 hover:bg-rose-50" : "bg-emerald-600 hover:bg-emerald-700"}
            >
              {loading ? "처리중..." : isRegistered ? "기기해제" : "기기지정"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
