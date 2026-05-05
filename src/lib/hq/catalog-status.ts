/** 카탈로그·엑셀 import 공통 상태 정규화 (클라이언트·서버 공용, 의존성 최소) */

export function normalizeCatalogStatus(raw: string | null | undefined): "active" | "inactive" | "sold_out" {
  const s = String(raw ?? "active").trim().toLowerCase();
  if (
    s === "inactive" ||
    s === "inactivo" ||
    s === "inativa" ||
    s === "inactif" ||
    s === "inaktiv" ||
    s === "неактив" ||
    s === "неактивен" ||
    s === "비활성" ||
    s === "중지" ||
    s === "停用" ||
    s === "ngừng" ||
    s === "vô hiệu"
  ) {
    return "inactive";
  }
  if (
    s === "sold_out" ||
    s === "품절" ||
    s === "agotado" ||
    s === "esgotado" ||
    s === "épuisé" ||
    s === "epuise" ||
    s === "售罄" ||
    s === "ausverkauft" ||
    s === "распродано"
  ) {
    return "sold_out";
  }
  return "active";
}
