import { NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import {
  getStaffManagerContext,
  isManagerContext,
} from "@/lib/staff-api-context";
import type { StaffFinancial } from "@/types/staff-salary";
import { defaultInsuranceFlags, defaultSalaryType } from "@/lib/staff-salary-calc";
import { defaultCompensationModel, syncFinancialFromAnnual } from "@/lib/payroll/types";
import {
  fetchStaffFinancials,
  upsertStaffFinancial,
} from "@/lib/staff-payroll-db";

export async function GET(req: Request) {
  try {
    const ctx = await getStaffManagerContext();
    if (!isManagerContext(ctx)) return ctx;

    const url = new URL(req.url);
    const staffId = url.searchParams.get("staffId");

    const admin = createAdminClient()!;
    const { data, schemaWarning } = await fetchStaffFinancials(
      admin,
      ctx.tenantId,
      staffId,
    );

    return NextResponse.json({ financials: data, schemaWarning });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await getStaffManagerContext();
    if (!isManagerContext(ctx)) return ctx;

    const body = (await req.json()) as StaffFinancial;
    if (!body.staff_id) {
      return NextResponse.json({ error: "staff_id required" }, { status: 400 });
    }

    const admin = createAdminClient()!;

    const { data: staff } = await admin
      .from("tenant_staff")
      .select("id")
      .eq("id", body.staff_id)
      .eq("tenant_id", ctx.tenantId)
      .single();

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    const employmentType = body.employment_type || "정직원";
    const defaults = defaultInsuranceFlags(employmentType);

    let financialInput: StaffFinancial = {
      ...body,
      employment_type: employmentType,
      salary_type: body.salary_type || defaultSalaryType(employmentType),
      compensation_model:
        body.compensation_model ||
        defaultCompensationModel(employmentType, {
          payrollJurisdiction: "KR",
          payrollMode: "auto",
          fullTimeCompensationModel: "annual",
          country: "KR",
        }),
      annual_salary: Number(body.annual_salary) || 0,
      base_salary: Number(body.base_salary) || 0,
      meal_allowance_monthly: Number(body.meal_allowance_monthly) ?? 200000,
      insurance_national_pension:
        body.insurance_national_pension ?? defaults.insurance_national_pension,
      insurance_health: body.insurance_health ?? defaults.insurance_health,
      insurance_employment:
        body.insurance_employment ?? defaults.insurance_employment,
    };

    financialInput = syncFinancialFromAnnual(financialInput);

    const payload = {
      tenant_id: ctx.tenantId,
      staff_id: body.staff_id,
      employment_type: financialInput.employment_type,
      salary_type: financialInput.salary_type,
      compensation_model: financialInput.compensation_model,
      annual_salary: financialInput.annual_salary,
      base_salary: financialInput.base_salary,
      meal_allowance_monthly: financialInput.meal_allowance_monthly,
      insurance_national_pension: financialInput.insurance_national_pension,
      insurance_health: financialInput.insurance_health,
      insurance_employment: financialInput.insurance_employment,
      bank_name: body.bank_name?.trim() || null,
      account_number: body.account_number?.trim() || null,
      tax_note: body.tax_note?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data, usedBasicSchema } = await upsertStaffFinancial(admin, payload);

    return NextResponse.json({
      financial: data,
      schemaWarning: usedBasicSchema
        ? "년봉 컬럼 마이그레이션(000004)을 적용하면 년봉이 DB에 저장됩니다."
        : undefined,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
