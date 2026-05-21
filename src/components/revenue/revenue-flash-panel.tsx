"use client";

import { useCallback, useEffect, useState } from "react";
import { Package, Send, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

interface FlashCampaign {
  id: string;
  title: string;
  status: string;
  expected_revenue: number;
  metadata?: { message?: string; product_id?: string; stock?: number };
}

interface WasteReport {
  lowStockCount: number;
  atRiskInventoryValueKrw: number;
  wasteExpenseTotalKrw: number;
  recommendation: string;
}

function formatKrw(n: number) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency: "KRW", maximumFractionDigits: 0 }).format(n);
}

export function RevenueFlashPanel() {
  const locale = usePreferredLocale();
  const tr = (ko: string, en: string) => pickUiText(toBaseLocale(locale), ko, en);
  const [campaigns, setCampaigns] = useState<FlashCampaign[]>([]);
  const [waste, setWaste] = useState<WasteReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [flashRes, wasteRes] = await Promise.all([
        fetch("/api/revenue/flash"),
        fetch("/api/revenue/waste-report"),
      ]);
      if (flashRes.status === 403 || wasteRes.status === 403) {
        setCampaigns([]);
        setWaste(null);
        return;
      }
      const flashJson = await flashRes.json();
      const wasteJson = await wasteRes.json();
      if (flashRes.ok) setCampaigns((flashJson.flashCampaigns ?? []).filter((c: FlashCampaign) => c.status === "draft"));
      if (wasteRes.ok) setWaste(wasteJson);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const approve = async (campaignId: string) => {
    const res = await fetch("/api/revenue/flash/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, action: "approve" }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? tr("승인 실패", "Approve failed"));
      return;
    }
    toast.success(tr("플래시 캠페인 승인 — 문구를 복사해 발송하세요", "Flash approved — copy and send"));
    if (json.messagePreview) await navigator.clipboard.writeText(json.messagePreview);
    await load();
  };

  const cancel = async (campaignId: string) => {
    await fetch("/api/revenue/flash/approve", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId }),
    });
    await load();
  };

  if (loading) return null;

  return (
    <div className="space-y-4">
      {waste && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-amber-600" />
              {tr("폐기·재고 리스크", "Waste & inventory risk")}
            </CardTitle>
            <CardDescription>{waste.recommendation}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-3 text-sm">
            <div>
              <p className="text-muted-foreground">{tr("임박 SKU", "Low stock SKUs")}</p>
              <p className="font-semibold">{waste.lowStockCount}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{tr("재고 리스크 금액", "At-risk value")}</p>
              <p className="font-semibold">{formatKrw(waste.atRiskInventoryValueKrw)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{tr("폐기비(지출)", "Waste expenses")}</p>
              <p className="font-semibold">{formatKrw(waste.wasteExpenseTotalKrw)}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {campaigns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Package className="w-4 h-4" />
              {tr("플래시 승인 대기", "Flash pending approval")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {campaigns.map((c) => (
              <div key={c.id} className="rounded-lg border p-3 space-y-2">
                <p className="font-medium text-sm">{c.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-2">{c.metadata?.message}</p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approve(c.id)}>
                    <Send className="w-3 h-3 mr-1" />
                    {tr("승인·복사", "Approve & copy")}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => cancel(c.id)}>
                    {tr("취소", "Cancel")}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
