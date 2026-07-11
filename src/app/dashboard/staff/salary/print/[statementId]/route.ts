import { headers } from "next/headers";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { createAdminClient } from "@/utils/supabase/admin";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { buildPayslipHtml } from "@/lib/staff-salary-payslip";
import { mergeTenantEmailSettings } from "@/lib/email/tenant-email-settings";
import { STAFF_FINANCIAL_SELECT, STAFF_SALARY_SELECT } from "@/types/staff-salary";
import type { StaffFinancial } from "@/types/staff-salary";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ statementId: string }> },
) {
  const headersList = await headers();
  const baseLocale = toBaseLocale((headersList.get("Accept-Language") as any) || "ko");
  const { statementId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  if (!admin) {
    return new Response("Not found", { status: 404 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("tenant_id, org_work_tenant_id")
    .eq("id", user.id)
    .single();

  const tenantId = profile?.org_work_tenant_id || profile?.tenant_id;
  if (!tenantId) {
    return new Response("Forbidden", { status: 403 });
  }

  const { data: stmt } = await admin
    .from("staff_salary_statements")
    .select(`${STAFF_SALARY_SELECT}, tenant_staff(name, position)`)
    .eq("id", statementId)
    .eq("tenant_id", tenantId)
    .single();

  if (!stmt) {
    return new Response("Not found", { status: 404 });
  }

  const { data: finRow } = await admin
    .from("staff_financials")
    .select(STAFF_FINANCIAL_SELECT)
    .eq("staff_id", stmt.staff_id)
    .maybeSingle();

  const { data: settingsRow } = await admin
    .from("system_settings")
    .select("data")
    .eq("tenant_id", tenantId)
    .maybeSingle();

  const shopName = mergeTenantEmailSettings(settingsRow?.data).siteName || "FloXync";
  const staffRaw = stmt.tenant_staff;
  const staff = (Array.isArray(staffRaw) ? staffRaw[0] : staffRaw) as {
    name: string;
    position?: string;
  } | null;

  const html = buildPayslipHtml({
    shopName,
    staffName: staff?.name || pickUiText(baseLocale, pickUiText(baseLocale, pickUiText(baseLocale, "직원", "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"), "employee", "người lao động", "従業員", "员工", "員工", "empleado", "funcionário", "employé", "Mitarbeiter", "сотрудник"),
    position: staff?.position,
    financial: (finRow as StaffFinancial) ?? null,
    statement: stmt,
  });

  return new Response(html, {
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}
