import { toast } from "sonner";
import { pickUiText } from "@/i18n/pick-ui-text";
import { toBaseLocale } from "@/i18n/config";
import type { AccessContext } from "@/lib/subscription/plan-access";
import { canPersistErp, isErpTrialMode } from "@/lib/subscription/plan-access";

export function erpTrialBlockedMessage(locale: string): string {
  const base = toBaseLocale(locale as Parameters<typeof toBaseLocale>[0]);
  return pickUiText(
    base,
    "체험 모드입니다. 변경 사항은 저장되지 않습니다. ERP SMART 이상 플랜에서 실제 운영하세요.",
    "Trial mode: changes are not saved. Subscribe to ERP SMART or higher to run your shop.",
    "Chế độ dùng thử: không lưu. Đăng ký ERP SMART trở lên để vận hành thật.",
    "体験モードのため保存されません。ERP SMART以上で本番運用できます。",
    "体验模式不会保存。请订阅 ERP SMART 及以上正式使用。",
    "Modo prueba: no se guarda. Suscríbete a ERP SMART o superior.",
    "Modo teste: não salva. Assine ERP SMART ou superior.",
    "Mode essai : rien n’est enregistré. Abonnez-vous à ERP SMART ou plus.",
    "Testmodus: nichts wird gespeichert. ERP SMART oder höher abonnieren.",
    "Пробный режим: данные не сохраняются. Оформите ERP SMART или выше.",
  );
}

export function erpTrialAppliedMessage(locale: string): string {
  const base = toBaseLocale(locale as Parameters<typeof toBaseLocale>[0]);
  return pickUiText(
    base,
    "체험용으로만 반영되었습니다 (저장 안 됨).",
    "Applied for trial only (not saved).",
    "Chỉ áp dụng thử (không lưu).",
    "体験用にのみ反映（保存されません）。",
    "仅体验生效（未保存）。",
    "Solo en modo prueba (no guardado).",
    "Apenas no teste (não salvo).",
    "Essai uniquement (non enregistré).",
    "Nur zur Ansicht (nicht gespeichert).",
    "Только для пробы (не сохранено).",
  );
}

/** 유료 ERP가 아니면 false — 호출부에서 체험 로컬 처리 */
export function requireErpPersist(ctx: AccessContext, locale: string): boolean {
  if (canPersistErp(ctx)) return true;
  if (isErpTrialMode(ctx)) {
    toast.info(erpTrialBlockedMessage(locale));
    return false;
  }
  toast.error(erpTrialBlockedMessage(locale));
  return false;
}
