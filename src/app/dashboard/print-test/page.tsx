"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { isElectronClient } from "@/lib/electron-env";
import { listElectronPrinters } from "@/lib/electron-desktop-api";
import { useSettings } from "@/hooks/use-settings";
import { useRouter } from "next/navigation";

export default function PrintTestPage() {
  const router = useRouter();
  const { settings } = useSettings();
  const [printers, setPrinters] = useState<string[]>([]);
  const [selected, setSelected] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!isElectronClient()) return;
    void listElectronPrinters().then(setPrinters);
    if (settings.printerName) setSelected(settings.printerName);
  }, [settings.printerName]);

  if (!isElectronClient()) {
    return (
      <div className="p-8">
        <PageHeader title="인쇄 테스트" description="FloXync Desktop 앱에서만 사용할 수 있습니다." />
      </div>
    );
  }

  const runTest = async () => {
    if (!selected) {
      toast.error("프린터를 선택하세요.");
      return;
    }
    setTesting(true);
    try {
      const api = (window as Window & { electronAPI?: { printJob?: (p: unknown) => Promise<unknown> } }).electronAPI;
      const payload = { orderId: "TEST", branchName: settings.siteName || "test" };
      await api?.printJob?.({
        job: {
          id: `test-${Date.now()}`,
          job_type: "print_test",
          type: "print_test",
          payload,
          data: payload,
        },
        settings: { ...settings, printerName: selected },
        branchName: "test",
      });
      toast.success("테스트 인쇄를 요청했습니다.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "인쇄 테스트 실패");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-lg">
      <PageHeader
        title="인쇄 테스트"
        description="Desktop 앱에서 프린터 연결을 확인합니다."
      />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">테스트 출력</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selected} onValueChange={(v) => setSelected(v ?? "")}>
            <SelectTrigger>
              <SelectValue placeholder="프린터 선택" />
            </SelectTrigger>
            <SelectContent>
              {printers.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={() => void runTest()} disabled={testing}>
              {testing ? "출력 중..." : "인쇄 테스트"}
            </Button>
            <Button variant="ghost" onClick={() => router.push("/dashboard/settings")}>
              설정으로
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
