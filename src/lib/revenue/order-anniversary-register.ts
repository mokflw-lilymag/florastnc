/** 주문 화면에서 CRM에 넣는 임시 기념일 라벨 — 고객 관리에서 수정 */
export const PENDING_ANNIVERSARY_LABEL = "기념일 (이름 미입력)";

export async function postOrderAnniversary(input: {
  customerId: string;
  anniversaryDate: string;
  marketingConsent: boolean;
}): Promise<{ ok: boolean; duplicate?: boolean; error?: string }> {
  try {
    const res = await fetch("/api/revenue/anniversary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: input.customerId,
        anniversary_date: input.anniversaryDate,
        label: PENDING_ANNIVERSARY_LABEL,
        recurring_yearly: true,
        marketing_consent: input.marketingConsent,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as { error?: string; duplicate?: boolean };
    if (!res.ok) {
      return { ok: false, error: json.error ?? res.statusText };
    }
    return { ok: true, duplicate: json.duplicate === true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "UNKNOWN" };
  }
}

/** 배송·픽업 예약일 우선, 없으면 오늘 */
export function resolveAnniversaryDateFromSchedule(scheduleDate?: Date): string {
  if (scheduleDate && !Number.isNaN(scheduleDate.getTime())) {
    const y = scheduleDate.getFullYear();
    const m = String(scheduleDate.getMonth() + 1).padStart(2, "0");
    const d = String(scheduleDate.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
