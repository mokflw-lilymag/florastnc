"use client";

import { useCallback, useEffect, useState } from "react";
import { Share2, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { getMessages } from "@/i18n/getMessages";
import {
  PARTNER_ORDERS_ENABLED_KEY,
  parsePlatformConfigBoolean,
} from "@/lib/platform-feature-flags";

export function PartnerOrdersFeatureSwitch() {
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const supabase = createClient();

  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const title = pickUiText(
    baseLocale,
    "회원사 수발주 메뉴",
    "Member store orders menu",
    "Menu don doi tac",
    "Torihikisaki hacchu menu",
    "Hezuo dingdan caidan",
    "Menu pedidos de socios",
    "Menu pedidos parceiros",
    "Menu commandes partenaires",
    "Partnerbestellungen-Menue",
    "Menu zakazov partnyorov",
  );
  const desc = pickUiText(
    baseLocale,
    "켜면 ERP/Pro/무료 체험 매장 사이드바에 회원사 수발주가 보입니다. 끄면 메뉴가 숨겨지고 해당 페이지는 준비 중 안내가 표시됩니다.",
    "When on, stores see member store orders in the sidebar. When off, the menu is hidden.",
    "Bat: hien menu. Tat: an menu.",
    "ON de hyoji, OFF de kakusu.",
    "Kaiqi hou xianshi; guanbi ze yincang.",
    "Activado: visible. Desactivado: oculto.",
    "Ativado: visivel. Desativado: oculto.",
    "Active: visible. Desactive: masque.",
    "Ein: sichtbar. Aus: versteckt.",
    "Vkl.: vidno. Vykl.: skryto.",
  );
  const labelOn = pickUiText(
    baseLocale,
    "전 매장에 공개",
    "Open to all stores",
    "Mo cho moi cua hang",
    "Zentenpo ni kokai",
    "Xiang suoyou mendian kaifang",
    "Abierto a todas las tiendas",
    "Aberto a todas as lojas",
    "Ouvert a toutes les boutiques",
    "Fuer alle Shops",
    "Dlya vseh magazinov",
  );
  const labelOff = pickUiText(
    baseLocale,
    "비공개 (메뉴 숨김)",
    "Hidden (menu off)",
    "An menu",
    "Hikokai",
    "Bu gongkai",
    "Oculto",
    "Oculto",
    "Masque",
    "Versteckt",
    "Skryto",
  );

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", PARTNER_ORDERS_ENABLED_KEY)
      .maybeSingle();

    if (error) {
      toast.error(tf.f01414);
      setLoading(false);
      return;
    }
    setEnabled(parsePlatformConfigBoolean(data?.value, false));
    setLoading(false);
  }, [supabase, tf.f01414]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (next: boolean) => {
    setSaving(true);
    const { error } = await supabase.from("platform_config").upsert(
      {
        key: PARTNER_ORDERS_ENABLED_KEY,
        value: next,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "key" },
    );

    if (error) {
      const msg = error.message.toLowerCase();
      const rlsBlocked =
        error.code === "42501" ||
        msg.includes("permission") ||
        msg.includes("row-level security");
      toast.error(rlsBlocked ? tf.f01768 : `${tf.f01417}: ${error.message}`);
      setSaving(false);
      return;
    }

    setEnabled(next);
    toast.success(tf.f01424);
    setSaving(false);
  };

  return (
    <Card className="border-indigo-100 ring-1 ring-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-indigo-950">
          <Share2 className="h-5 w-5 text-indigo-600" />
          {title}
        </CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between gap-4 py-2">
          <div className="space-y-0.5">
            <Label htmlFor="partner-orders-enabled">{enabled ? labelOn : labelOff}</Label>
            <p className="text-xs text-muted-foreground">
              {`platform_config.${PARTNER_ORDERS_ENABLED_KEY}`}
            </p>
          </div>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : (
            <Switch
              id="partner-orders-enabled"
              checked={enabled}
              disabled={saving}
              onCheckedChange={(v) => void save(v)}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
