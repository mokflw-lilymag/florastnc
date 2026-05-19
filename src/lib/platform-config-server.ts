import { createClient } from "@/utils/supabase/server";
import {
  PARTNER_ORDERS_ENABLED_KEY,
  parsePlatformConfigBoolean,
} from "@/lib/platform-feature-flags";

/** 전역 협력사 수발주 기능 — DB 미설정 시 false(비공개) */
export async function getPartnerOrdersEnabled(): Promise<boolean> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("platform_config")
      .select("value")
      .eq("key", PARTNER_ORDERS_ENABLED_KEY)
      .maybeSingle();

    if (error) return false;
    return parsePlatformConfigBoolean(data?.value, false);
  } catch {
    return false;
  }
}
