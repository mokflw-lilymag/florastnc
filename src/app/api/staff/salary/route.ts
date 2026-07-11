import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getStaffManagerContext,
  isManagerContext,
} from "@/lib/staff-api-context";
import { buildDailyAttendanceRows } from "@/lib/staff-attendance-hours";
import { buildPayrollStatement } from "@/lib/payroll/registry";
import { resolvePayrollConfig } from "@/lib/payroll/types";
import { mergeTenantEmailSettings } from "@/lib/email/tenant-email-settings";
import type { StaffFinancial } from "@/types/staff-salary";
import { STAFF_FINANCIAL_SELECT, STAFF_SALARY_SELECT } from "@/types/staff-salary";
import {
  fetchSalaryStatements,
  fetchStaffFinancials,
  isSchemaMissingError,
  MIGRATION_HINT,
} from "@/lib/staff-payroll-db";

export async function GET(req: Request) {
  try {
    const ctx = await getStaffManagerContext();
    if (!isManagerContext(ctx)) return ctx;

    const url = new URL(req.url);
    const yearMonth = url.searchParams.get("yearMonth");
    const staffId = url.searchParams.get("staffId");

    const admin = createAdminClient()!;
    const { data, schemaWarning } = await fetchSalaryStatements(admin, ctx.tenantId, {
      staffId,
      yearMonth,
    });

    return NextResponse.json({ statements: data, schemaWarning });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const ctx = await getStaffManagerContext();
  if (!isManagerContext(ctx)) return ctx;

  const body = await req.json();
  const {
    staffId,
    yearMonth,
    recalculate = true,
    overtimePay,
    otherAllowance,
    otherAllowanceName,
    incomeTaxManual,
    mealAllowanceOverride,
    save = true,
    statement: manualStatement,
    applyAutoAdjustments = true,
  } = body;

  if (!staffId || !yearMonth) {
    return NextResponse.json({ error: "staffId and yearMonth required" }, { status: 400 });
  }

  const admin = createAdminClient()!;

  const { data: finList, schemaWarning: finWarning } = await fetchStaffFinancials(
    admin,
    ctx.tenantId,
    staffId,
  );
  const finRow = finList[0];

  if (!finRow) {
    return NextResponse.json(
      {
        error: "급여 계약 정보를 먼저 등록해주세요.",
        schemaWarning: finWarning,
      },
      { status: 400 },
    );
  }

  const financial = finRow;
  let statement = manualStatement;

  if (recalculate) {
    const [y, m] = yearMonth.split("-").map(Number);
    const monthStart = new Date(y, m - 1, 1);
    const monthEnd = new Date(y, m, 0, 23, 59, 59);

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
      fullTimeCompensationModel: settingsData.fullTimeCompensationModel as never,
    });

    const dayBreaks =
      (settingsData.attendanceDayBreaks as Record<string, unknown>) ?? {};

    const { data: logs, error: logErr } = await admin
      .from("staff_attendance_logs")
      .select("id, staff_id, type, recorded_at")
      .eq("tenant_id", ctx.tenantId)
      .eq("staff_id", staffId)
      .gte("recorded_at", monthStart.toISOString())
      .lte("recorded_at", monthEnd.toISOString())
      .order("recorded_at", { ascending: true });

    if (logErr) {
      return NextResponse.json({ error: logErr.message }, { status: 400 });
    }

    const dailyRows = buildDailyAttendanceRows(
      (logs || []).map((l) => ({ ...l, tenant_staff: null })),
      { dayBreaks: dayBreaks as never },
    );

    statement = buildPayrollStatement({
      financial,
      paymentYearMonth: yearMonth,
      dailyRows,
      payroll,
      applyAutoAdjustments: applyAutoAdjustments !== false,
      overtimePay:
        applyAutoAdjustments === false && overtimePay !== undefined
          ? Number(overtimePay) || 0
          : undefined,
      otherAllowance: Number(otherAllowance) || 0,
      otherAllowanceName,
      incomeTaxManual:
        applyAutoAdjustments === false && incomeTaxManual !== undefined
          ? Number(incomeTaxManual) || 0
          : undefined,
      mealAllowanceOverride:
        mealAllowanceOverride !== undefined
          ? Number(mealAllowanceOverride)
          : undefined,
      manualGrossPay: body.manualGrossPay !== undefined ? Number(body.manualGrossPay) : undefined,
      manualDeductions: body.manualDeductions !== undefined ? Number(body.manualDeductions) : undefined,
      manualIncomeTax: body.manualIncomeTax !== undefined ? Number(body.manualIncomeTax) : undefined,
      manualLocalTax: body.manualLocalTax !== undefined ? Number(body.manualLocalTax) : undefined,
      manualInsurance: body.manualInsurance !== undefined ? Number(body.manualInsurance) : undefined,
    });
  }

  if (!statement) {
    return NextResponse.json({ error: "No statement to save" }, { status: 400 });
  }

  if (!save) {
    return NextResponse.json({ statement });
  }

  const payload = {
    tenant_id: ctx.tenantId,
    staff_id: staffId,
    payment_year_month: yearMonth,
    employment_type: statement.employment_type,
    worked_minutes: statement.worked_minutes,
    weekly_holiday_minutes: statement.weekly_holiday_minutes,
    base_pay: statement.base_pay,
    overtime_pay: statement.overtime_pay,
    weekly_holiday_pay: statement.weekly_holiday_pay,
    meal_allowance: statement.meal_allowance,
    other_allowance_name: statement.other_allowance_name,
    other_allowance: statement.other_allowance,
    gross_pay: statement.gross_pay,
    national_pension: statement.national_pension,
    health_insurance: statement.health_insurance,
    long_term_care: statement.long_term_care,
    employment_insurance: statement.employment_insurance,
    income_tax: statement.income_tax,
    local_income_tax: statement.local_income_tax,
    freelancer_tax: statement.freelancer_tax,
    total_deductions: statement.total_deductions,
    net_pay: statement.net_pay,
    status: statement.status || "draft",
    memo: statement.memo ?? null,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("staff_salary_statements")
    .upsert(payload, { onConflict: "tenant_id,staff_id,payment_year_month" })
    .select(STAFF_SALARY_SELECT)
    .single();

  if (error) {
    if (isSchemaMissingError(error.message)) {
      return NextResponse.json({ error: MIGRATION_HINT }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ statement: data, schemaWarning: finWarning });
}

export async function PATCH(req: Request) {
  const ctx = await getStaffManagerContext();
  if (!isManagerContext(ctx)) return ctx;

  const body = await req.json();
  const { id, status, ...fields } = body;
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const admin = createAdminClient()!;
  const updatePayload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (status) updatePayload.status = status;
  const numericFields = [
    "overtime_pay",
    "other_allowance",
    "income_tax",
    "meal_allowance",
    "gross_pay",
    "net_pay",
    "total_deductions",
  ] as const;
  for (const f of numericFields) {
    if (fields[f] !== undefined) updatePayload[f] = fields[f];
  }
  if (fields.other_allowance_name !== undefined) {
    updatePayload.other_allowance_name = fields.other_allowance_name;
  }
  if (fields.memo !== undefined) updatePayload.memo = fields.memo;

  const { data, error } = await admin
    .from("staff_salary_statements")
    .update(updatePayload)
    .eq("id", id)
    .eq("tenant_id", ctx.tenantId)
    .select(STAFF_SALARY_SELECT)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ statement: data });
}
