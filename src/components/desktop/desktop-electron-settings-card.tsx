"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import Textarea from "@/components/ui/textarea";
import { Monitor, Printer, FolderOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { isElectronClient } from "@/lib/electron-env";
import {
  clearPrintSpooler,
  openElectronPrintLogFolder,
  readElectronPrintLog,
} from "@/lib/electron-desktop-api";

type ElectronAPI = {
  getStartupSetting?: () => Promise<boolean>;
  setStartupSetting?: (enabled: boolean) => Promise<boolean>;
};

export function DesktopElectronSettingsCard() {
  const [startup, setStartup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [printLog, setPrintLog] = useState("");
  const [logLoading, setLogLoading] = useState(false);

  useEffect(() => {
    if (!isElectronClient()) return;
    const api = (window as Window & { electronAPI?: ElectronAPI }).electronAPI;
    void api?.getStartupSetting?.()
      .then((v) => setStartup(!!v))
      .finally(() => setLoading(false));
  }, []);

  if (!isElectronClient()) return null;

  const api = (window as Window & { electronAPI?: ElectronAPI }).electronAPI;

  const onStartupChange = async (checked: boolean) => {
    setStartup(checked);
    try {
      await api?.setStartupSetting?.(checked);
    } catch (err) {
      console.error("[DesktopSettings] startup toggle failed:", err);
      setStartup(!checked);
    }
  };

  const loadPrintLog = async () => {
    setLogLoading(true);
    try {
      const result = await readElectronPrintLog();
      setPrintLog(result?.content || "(로그 없음)");
    } finally {
      setLogLoading(false);
    }
  };

  const handleClearSpooler = async () => {
    const result = await clearPrintSpooler();
    if (result?.success) toast.success(result.message || "인쇄 대기열 초기화 완료");
    else toast.error(result?.message || "대기열 초기화 실패");
  };

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Monitor className="h-4 w-4" />
          FloXync Desktop
        </CardTitle>
        <CardDescription>
          Windows 앱 전용 — 로컬 DB, 원격 인쇄, 인쇄 유틸
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <Label htmlFor="startup-toggle" className="font-medium">
              Windows 시작 시 자동 실행
            </Label>
            <p className="text-xs text-muted-foreground mt-1">
              PC 부팅 후 트레이에서 FloXync가 자동 실행됩니다.
            </p>
          </div>
          <Switch
            id="startup-toggle"
            checked={startup}
            disabled={loading}
            onCheckedChange={onStartupChange}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => void loadPrintLog()} disabled={logLoading}>
            <Printer className="h-3.5 w-3.5 mr-1" />
            인쇄 로그 불러오기
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void openElectronPrintLogFolder()}>
            <FolderOpen className="h-3.5 w-3.5 mr-1" />
            로그 폴더 열기
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => void handleClearSpooler()}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            스풀러 초기화
          </Button>
        </div>

        {printLog ? (
          <Textarea readOnly value={printLog} className="h-32 text-[11px] font-mono" />
        ) : null}

        <Link
          href="/dashboard/print-test"
          className="text-xs text-primary hover:underline inline-block"
        >
          인쇄 테스트 페이지 →
        </Link>
      </CardContent>
    </Card>
  );
}
