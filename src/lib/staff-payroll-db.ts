import type { StaffFinancial } from "@/types/staff-salary";
import {
  STAFF_FINANCIAL_SELECT,
  STAFF_SALARY_SELECT,
} from "@/types/staff-salary";

export const STAFF_FINANCIAL_BASIC_SELECT =
  "id, tenant_id, staff_id, employment_type, salary_type, base_salary, meal_allowance_monthly, insurance_national_pension, insurance_health, insurance_employment, bank_name, account_number, tax_note";

export const MIGRATION_HINT =
  "Supabase SQL Editor에서 supabase/migrations/20260711000003_staff_salary_leave.sql 과 20260711000004_staff_annual_salary.sql 을 실행해주세요.";

export function isSchemaMissingError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("does not exist") ||
    m.includes("could not find") ||
    m.includes("schema cache") ||
    m.includes("relation") && m.includes("staff_")
  );
}

export function normalizeFinancialRow(
  row: Record<string, unknown>,
): StaffFinancial {
  return {
    id: row.id as string | undefined,
    tenant_id: row.tenant_id as string | undefined,
    staff_id: row.staff_id as string,
    employment_type: (row.employment_type as StaffFinancial["employment_type"]) || "정직원",
    salary_type: (row.salary_type as StaffFinancial["salary_type"]) || "월급",
    compensation_model:
      (row.compensation_model as StaffFinancial["compensation_model"]) || "annual",
    annual_salary: Number(row.annual_salary) || 0,
    base_salary: Number(row.base_salary) || 0,
    meal_allowance_monthly: Number(row.meal_allowance_monthly) ?? 200000,
    insurance_national_pension: row.insurance_national_pension !== false,
    insurance_health: row.insurance_health !== false,
    insurance_employment: row.insurance_employment !== false,
    bank_name: (row.bank_name as string) ?? null,
    account_number: (row.account_number as string) ?? null,
    tax_note: (row.tax_note as string) ?? null,
  };
}

export async function fetchStaffFinancials(
  admin: ReturnType<typeof import("@/utils/supabase/admin").createAdminClient>,
  tenantId: string,
  staffId?: string | null,
): Promise<{ data: StaffFinancial[]; schemaWarning?: string }> {
  if (!admin) return { data: [] };

  let query = admin
    .from("staff_financials")
    .select(STAFF_FINANCIAL_SELECT)
    .eq("tenant_id", tenantId);

  if (staffId) query = query.eq("staff_id", staffId);

  let { data, error } = await query;

  if (error && isSchemaMissingError(error.message)) {
    let basicQuery = admin
      .from("staff_financials")
      .select(STAFF_FINANCIAL_BASIC_SELECT)
      .eq("tenant_id", tenantId);
    if (staffId) basicQuery = basicQuery.eq("staff_id", staffId);
    const fallback = await basicQuery;
    if (fallback.error) {
      if (isSchemaMissingError(fallback.error.message)) {
        return { data: [], schemaWarning: MIGRATION_HINT };
      }
      throw new Error(fallback.error.message);
    }
    return {
      data: (fallback.data || []).map((r) => normalizeFinancialRow(r)),
      schemaWarning:
        "년봉 컬럼 마이그레이션(000004)이 필요합니다. " + MIGRATION_HINT,
    };
  }

  if (error) throw new Error(error.message);

  return {
    data: (data || []).map((r) => normalizeFinancialRow(r)),
  };
}

export async function fetchSalaryStatements(
  admin: ReturnType<typeof import("@/utils/supabase/admin").createAdminClient>,
  tenantId: string,
  filters: { staffId?: string | null; yearMonth?: string | null },
): Promise<{ data: unknown[]; schemaWarning?: string }> {
  if (!admin) return { data: [] };

  let query = admin
    .from("staff_salary_statements")
    .select(`${STAFF_SALARY_SELECT}, tenant_staff(name, position, email)`)
    .eq("tenant_id", tenantId)
    .order("payment_year_month", { ascending: false });

  if (filters.yearMonth) query = query.eq("payment_year_month", filters.yearMonth);
  if (filters.staffId) query = query.eq("staff_id", filters.staffId);

  const { data, error } = await query;

  if (error) {
    if (isSchemaMissingError(error.message)) {
      return { data: [], schemaWarning: MIGRATION_HINT };
    }
    throw new Error(error.message);
  }

  return { data: data ?? [] };
}

export async function upsertStaffFinancial(
  admin: ReturnType<typeof import("@/utils/supabase/admin").createAdminClient>,
  payload: Record<string, unknown>,
): Promise<{ data: StaffFinancial; usedBasicSchema?: boolean }> {
  if (!admin) throw new Error("Admin client not configured");

  const full = await admin
    .from("staff_financials")
    .upsert(payload, { onConflict: "tenant_id,staff_id" })
    .select(STAFF_FINANCIAL_SELECT)
    .single();

  if (!full.error) {
    return { data: normalizeFinancialRow(full.data) };
  }

  if (!isSchemaMissingError(full.error.message)) {
    throw new Error(full.error.message);
  }

  const {
    compensation_model: _c,
    annual_salary: _a,
    ...basicPayload
  } = payload;

  const basic = await admin
    .from("staff_financials")
    .upsert(basicPayload, { onConflict: "tenant_id,staff_id" })
    .select(STAFF_FINANCIAL_BASIC_SELECT)
    .single();

  if (basic.error) {
    if (isSchemaMissingError(basic.error.message)) {
      throw new Error(MIGRATION_HINT);
    }
    throw new Error(basic.error.message);
  }

  return {
    data: normalizeFinancialRow(basic.data),
    usedBasicSchema: true,
  };
}
