import { pickUiText } from "@/i18n/pick-ui-text";

/** 주문·매출 집계 등 서비스 롤 키가 없을 때 HQ/지점 API 경고 */
export function warnHqOrdersAggregateServiceKey(bl: string) {
  return pickUiText(
    bl,
    "서버에 SUPABASE_SERVICE_ROLE_KEY가 없어 주문 집계를 건너뜁니다. Vercel/로컬 .env에 설정하세요.",
    "SUPABASE_SERVICE_ROLE_KEY is not set on the server; order aggregates are skipped. Add it in Vercel or local .env.",
    "Thiếu SUPABASE_SERVICE_ROLE_KEY trên máy chủ; bỏ qua tổng hợp đơn hàng. Thêm vào Vercel hoặc .env cục bộ.",
    "サーバーに SUPABASE_SERVICE_ROLE_KEY がありません。注文集計をスキップします。Vercel またはローカル .env に設定してください。",
    "服务器未设置 SUPABASE_SERVICE_ROLE_KEY，已跳过订单汇总。请在 Vercel 或本地 .env 中配置。",
    "No hay SUPABASE_SERVICE_ROLE_KEY en el servidor; se omiten los agregados de pedidos. Configúralo en Vercel o .env local.",
    "Sem SUPABASE_SERVICE_ROLE_KEY no servidor; agregações de pedidos ignoradas. Configure em Vercel ou .env local.",
    "SUPABASE_SERVICE_ROLE_KEY est absent du serveur ; agrégats de commandes ignorés. Ajoutez-le dans Vercel ou .env local.",
    "SUPABASE_SERVICE_ROLE_KEY fehlt auf dem Server; Bestellaggregationen werden übersprungen. In Vercel oder lokaler .env setzen.",
    "На сервере нет SUPABASE_SERVICE_ROLE_KEY; агрегаты заказов пропущены. Добавьте в Vercel или локальный .env.",
  );
}
