"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import { Monitor, Printer, FolderOpen, Trash2, Download, Archive } from "lucide-react";
import { toast } from "sonner";
import { isElectronClient } from "@/lib/electron-env";
import { useAuth } from "@/hooks/use-auth";
import { useSettings } from "@/hooks/use-settings";
import {
  clearPrintSpooler,
  openElectronPrintLogFolder,
  openMonthlyBackupFolder,
  previousMonthYyyyMm,
  readElectronPrintLog,
  runMonthlyPhotoBackup,
} from "@/lib/electron-desktop-api";

type ElectronAPI = {
  getStartupSetting?: () => Promise<boolean>;
  setStartupSetting?: (enabled: boolean) => Promise<boolean>;
  clearOfflineData?: () => Promise<void>;
};

export function DesktopElectronSettingsCard() {
  const { tenantId } = useAuth();
  const { settings, saveSettings } = useSettings();
  const [startup, setStartup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [printLog, setPrintLog] = useState("");
  const [logLoading, setLogLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupPath, setBackupPath] = useState("");
  const [pathSaving, setPathSaving] = useState(false);
  const defaultMonth = useMemo(() => previousMonthYyyyMm(), []);
  const [backupMonth, setBackupMonth] = useState(defaultMonth);

  const basePathLabel = settings.localBackupPath?.trim() || "문서/Floxync";

  useEffect(() => {
    setBackupPath(settings.localBackupPath || "");
  }, [settings.localBackupPath]);

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

  const handleSaveBackupPath = async () => {
    setPathSaving(true);
    try {
      const ok = await saveSettings({ ...settings, localBackupPath: backupPath.trim() });
      if (ok) toast.success("로컬 저장 경로가 저장되었습니다.");
      else toast.error("저장 경로 저장에 실패했습니다.");
    } finally {
      setPathSaving(false);
    }
  };

  const handleMonthlyBackup = async (force: boolean) => {
    setBackupLoading(true);
    try {
      const result = await runMonthlyPhotoBackup({ targetMonth: backupMonth, force });
      if (!result?.ok) {
        toast.error(result?.error || "월별 백업에 실패했습니다.");
        return;
      }
      if (result.skipped) {
        toast.info(`${backupMonth} 백업 zip이 이미 있습니다. 다시 받으려면 「덮어쓰기」를 누르세요.`);
        return;
      }
      toast.success(
        `${backupMonth} 백업 완료 — 배송 ${result.deliveryCount ?? 0}장 · 영수증 ${result.receiptCount ?? 0}장` +
          (result.receiptExpensesCount != null
            ? ` (지출관리 ${result.receiptExpensesCount} · 간편 ${result.receiptSimpleCount ?? 0})`
            : ""),
      );
    } finally {
      setBackupLoading(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Monitor className="h-4 w-4" />
          FloXync Desktop
        </CardTitle>
        <CardDescription>
          Windows 앱 전용 — 로컬 DB, 원격 인쇄, 월별 사진 백업
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

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <FolderOpen className="h-4 w-4" />
            로컬 저장·백업 경로 (테넌트별)
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            주문 상세 「사진 저장」은 <code className="text-[10px]">ImageDownload</code> 하위에,
            월별 zip은 <code className="text-[10px]">monthly image</code> ·{" "}
            <code className="text-[10px]">monthly receipt</code> 하위에 저장됩니다.
            <br />
            영수증 zip: <strong>지출관리(expenses)</strong> + <strong>간편지출(simple_expenses)</strong> 통합
          </p>
          <div className="space-y-2">
            <Label htmlFor="local-backup-path" className="text-xs text-muted-foreground">
              루트 폴더 (비우면 {basePathLabel})
            </Label>
            <div className="flex flex-wrap gap-2">
              <Input
                id="local-backup-path"
                placeholder="예: D:\FloXyncBackup"
                value={backupPath}
                onChange={(e) => setBackupPath(e.target.value)}
                className="max-w-md h-9 text-sm"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={pathSaving}
                onClick={() => void handleSaveBackupPath()}
              >
                경로 저장
              </Button>
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
            <Archive className="h-4 w-4" />
            월별 사진·영수증 백업 (zip)
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            저장 위치:{" "}
            <code className="text-[10px]">{basePathLabel}/monthly image</code> ·{" "}
            <code className="text-[10px]">{basePathLabel}/monthly receipt</code>
            <br />
            자동: 매월 <strong>1일~72시간</strong> 안에 전월 zip이 없을 때만 1회 시도합니다.
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="backup-month" className="text-xs text-muted-foreground">
                대상 월
              </Label>
              <input
                id="backup-month"
                type="month"
                value={backupMonth}
                onChange={(e) => setBackupMonth(e.target.value)}
                className="mt-1 block h-9 rounded-md border border-slate-200 bg-white px-2 text-sm"
              />
            </div>
            <Button
              type="button"
              size="sm"
              disabled={backupLoading}
              onClick={() => void handleMonthlyBackup(false)}
            >
              <Download className="h-3.5 w-3.5 mr-1" />
              zip 받기
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={backupLoading}
              onClick={() => void handleMonthlyBackup(true)}
            >
              덮어쓰기
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void openMonthlyBackupFolder("delivery", tenantId ?? undefined)}
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1" />
              배송 폴더
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void openMonthlyBackupFolder("receipt", tenantId ?? undefined)}
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1" />
              영수증 폴더
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">
            zip 예: <code>202505_delivery.zip</code> · <code>202505_receipt.zip</code>
          </p>
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50/50 p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-red-800">
            <Trash2 className="h-4 w-4" />
            오프라인 데이터 초기화 (캐시 삭제)
          </div>
          <p className="text-xs text-red-600/90 leading-relaxed">
            동일한 PC에서 다른 지점 아이디로 로그인 시 기존 로컬 캐시를 
            삭제하고 완전히 새로운 데이터를 받아오고 싶을 때 사용하세요.
            <br />
            초기화 시 브라우저가 새로고침됩니다.
          </p>
          <div className="flex items-center">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              onClick={async () => {
                if (window.confirm("정말로 로컬 오프라인 데이터를 모두 초기화하시겠습니까?\n이 작업은 되돌릴 수 없으며 앱이 새로고침됩니다.")) {
                  try {
                    await api?.clearOfflineData?.();
                    window.location.reload();
                  } catch (e) {
                    toast.error("데이터 초기화에 실패했습니다.");
                    console.error(e);
                  }
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              로컬 데이터 초기화
            </Button>
          </div>
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
