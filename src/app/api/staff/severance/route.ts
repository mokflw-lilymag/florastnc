import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getStaffManagerContext,
  isManagerContext,
} from "@/lib/staff-api-context";
import { estimateKRSeverance } from "@/lib/payroll/severance-kr";
import { monthlyBaseFromFinancial, resolvePayrollConfig } from "@/lib/payroll/types";
import { STAFF_FINANCIAL_SELECT, STAFF_SALARY_SELECT } from "@/types/staff-salary";
import type { StaffFinancial } from "@/types/staff-salary";

export async function GET(req: Request) {
  const ctx = await getStaffManagerContext();
  if (!isManagerContext(ctx)) return ctx;

  const url = new URL(req.url);
  const staffId = url.searchParams.get("staffId");
  if (!staffId) {
    return NextResponse.json({ error: "staffId required" }, { status: 400 });
  }

  const admin = createAdminClient()!;

  const { data: settingsRow } = await admin
    .from("system_settings")
    .select("data")
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();

  const settingsData = (settingsRow?.data ?? {}) as Record<string, unknown>;
  const payroll = resolvePayrollConfig({
    country: (settingsData.country as string) || "KR",
    payrollJurisdiction: settingsData.payrollJurisdiction as string,
    payrollMode: settingsData.payrollMode as "auto" | "manual",
  });

  if (payroll.payrollJurisdiction !== "KR" || payroll.payrollMode === "manual") {
    return NextResponse.json({
      estimate: null,
      message: "퇴직금 자동 계산은 한국(KR) 자동 모드에서만 제공됩니다.",
    });
  }

  const { data: staff } = await admin
    .from("tenant_staff")
    .select("id, hire_date")
    .eq("id", staffId)
    .eq("tenant_id", ctx.tenantId)
    .single();

  if (!staff) {
    return NextResponse.json({ error: "Staff not found" }, { status: 404 });
  }

  const { data: finRow } = await admin
    .from("staff_financials")
    .select(STAFF_FINANCIAL_SELECT)
    .eq("staff_id", staffId)
    .maybeSingle();

  const financial = finRow as StaffFinancial | null;

  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 6);
  const fromYm = threeMonthsAgo.toISOString().slice(0, 7);

  const { data: statements } = await admin
    .from("staff_salary_statements")
    .select(STAFF_SALARY_SELECT)
    .eq("staff_id", staffId)
    .eq("tenant_id", ctx.tenantId)
    .gte("payment_year_month", fromYm)
    .order("payment_year_month", { ascending: false });

  const fallbackMonthly = financial
    ? monthlyBaseFromFinancial(financial, payroll)
    : 0;

  const estimate = estimateKRSeverance({
    hireDate: staff.hire_date,
    salaryStatements: statements || [],
    fallbackMonthlyPay: fallbackMonthly,
  });

  return NextResponse.json({ estimate });
}
