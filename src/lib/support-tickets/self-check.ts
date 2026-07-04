import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveUserTenantId } from "@/lib/support-tickets/access";
import type { SelfCheckItem } from "@/lib/support-tickets/self-check-guide";

export type { SelfCheckItem } from "@/lib/support-tickets/self-check-guide";
export { SELF_CHECK_GUIDE_MARKDOWN } from "@/lib/support-tickets/self-check-guide";

export type SelfCheckResult = {
  items: SelfCheckItem[];
  summary: string;
  canSubmitTicket: boolean;
};

export async function runSupportSelfCheck(
  supabase: SupabaseClient,
  userId: string,
): Promise<SelfCheckResult> {
  const items: SelfCheckItem[] = [];

  const tenantId = await resolveUserTenantId(supabase, userId);
  items.push({
    id: "tenant",
    ok: !!tenantId,
    label: "매장 연결",
    hint: tenantId
      ? "계정에 매장이 연결되어 있습니다."
      : "매장이 연결되지 않았습니다. 온보딩을 완료하거나 본사에 문의하세요.",
    severity: tenantId ? "ok" : "error",
  });

  if (!tenantId) {
    return {
      items,
      summary: "매장 연결부터 확인이 필요합니다.",
      canSubmitTicket: true,
    };
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("plan, status, subscription_end, name")
    .eq("id", tenantId)
    .maybeSingle();

  const suspended = tenant?.status === "suspended";
  const subEnd = tenant?.subscription_end as string | null;
  const expired = !subEnd || new Date(subEnd) < new Date();

  items.push({
    id: "subscription",
    ok: !suspended && !expired,
    label: "구독 상태",
    hint: suspended
      ? "계정이 정지 상태입니다. 고객센터로 문의해 주세요."
      : expired
        ? `구독 만료일(${subEnd ? subEnd.slice(0, 10) : "없음"})이 지났습니다.`
        : `플랜 ${tenant?.plan ?? "free"} · 만료 ${subEnd ? subEnd.slice(0, 10) : "—"}`,
    severity: suspended || expired ? "error" : "ok",
  });

  const { data: settingsRow } = await supabase
    .from("system_settings")
    .select("data")
    .eq("id", `settings_${tenantId}`)
    .maybeSingle();

  const ppEnabled = (settingsRow?.data as { ppBridgeEnabled?: boolean })?.ppBridgeEnabled !== false;
  items.push({
    id: "ppbridge",
    ok: ppEnabled,
    label: "ppBridge 설정",
    hint: ppEnabled
      ? "설정에서 ppBridge가 켜져 있습니다."
      : "ppBridge가 꺼져 있습니다. 설정 → 프린터에서 켜 주세요.",
    severity: ppEnabled ? "ok" : "warn",
  });

  items.push({
    id: "browser-bridge",
    ok: false,
    label: "브릿지 연결 (이 PC)",
    hint: "이 PC에서 ppBridge 실행 여부는 설정 → 프린터 「연결 확인」으로 확인하세요.",
    severity: "warn",
  });

  const errorCount = items.filter((i) => i.severity === "error").length;
  const warnCount = items.filter((i) => i.severity === "warn").length;

  let summary = "기본 점검 결과 문제가 없어 보입니다.";
  if (errorCount > 0) {
    summary = `확인 필요 ${errorCount}건 — 아래 안내 후 문의해 주세요.`;
  } else if (warnCount > 0) {
    summary = `참고 ${warnCount}건 — FAQ·안내를 확인해 보세요.`;
  }

  return { items, summary, canSubmitTicket: true };
}
