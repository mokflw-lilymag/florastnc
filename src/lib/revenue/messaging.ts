import type { SupabaseClient } from "@supabase/supabase-js";

export interface SendMessageResult {
  ok: boolean;
  channel: "alimtalk" | "sms" | "log";
  error?: string;
}

export interface AnniversaryMessagePayload {
  tenantId: string;
  to: string;
  text: string;
  customerName: string;
}

/**
 * 기념일 D-7 알림 — Solapi/알림톡 연동 전까지 log + SMS fallback 준비
 */
export async function sendAnniversaryReminder(
  db: SupabaseClient,
  payload: AnniversaryMessagePayload
): Promise<SendMessageResult> {
  const phone = payload.to.replace(/\D/g, "");
  if (phone.length < 10) {
    return { ok: false, channel: "log", error: "invalid_phone" };
  }

  const solapiKey = process.env.SOLAPI_API_KEY;
  const solapiSecret = process.env.SOLAPI_API_SECRET;
  const from = process.env.SOLAPI_SENDER_NUMBER;

  if (solapiKey && solapiSecret && from) {
    try {
      const res = await fetch("https://api.solapi.com/messages/v4/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${Buffer.from(`${solapiKey}:${solapiSecret}`).toString("base64")}`,
        },
        body: JSON.stringify({
          message: {
            to: phone,
            from,
            text: payload.text,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.text();
        console.error("[messaging] Solapi error:", body);
        return { ok: false, channel: "sms", error: "solapi_failed" };
      }
      return { ok: true, channel: "alimtalk" };
    } catch (e) {
      console.error("[messaging] Solapi exception:", e);
      return { ok: false, channel: "sms", error: "solapi_exception" };
    }
  }

  console.log("[messaging] anniversary reminder (mock)", {
    tenantId: payload.tenantId,
    to: phone,
    customerName: payload.customerName,
    preview: payload.text.slice(0, 80),
  });

  void db;
  return { ok: true, channel: "log" };
}
