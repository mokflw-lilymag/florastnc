import { redirect } from "next/navigation";

/** @deprecated 통합 — 국가·CSV 기능은 /dashboard/tenants 로 이전 예정 */
export default function AdminTenantsRedirectPage() {
  redirect("/dashboard/tenants");
}
