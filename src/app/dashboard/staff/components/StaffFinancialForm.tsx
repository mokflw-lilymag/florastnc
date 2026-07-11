"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import type { CompensationModel, EmploymentType, StaffFinancial } from "@/types/staff-salary";
import { defaultInsuranceFlags, defaultSalaryType } from "@/lib/staff-salary-calc";
import {
  defaultCompensationModel,
  isKrPayroll,
  syncFinancialFromAnnual,
  type PayrollTenantConfig,
} from "@/lib/payroll/types";
import { formatKrw } from "@/lib/staff-salary-calc";

interface StaffFinancialFormProps {
  value: StaffFinancial;
  onChange: (next: StaffFinancial) => void;
  payroll?: PayrollTenantConfig;
}

const EMPLOYMENT_OPTIONS: EmploymentType[] = ["정직원", "파트타임", "프리랜서"];

export function StaffFinancialForm({ value, onChange, payroll }: StaffFinancialFormProps) {
  const payrollCfg: PayrollTenantConfig = payroll ?? {
    payrollJurisdiction: "KR",
    payrollMode: "auto",
    fullTimeCompensationModel: "annual",
    country: "KR",
  };
  const krAuto = isKrPayroll(payrollCfg);
  const isManual = payrollCfg.payrollMode === "manual";

  const setEmploymentType = (type: EmploymentType) => {
    const defaults = defaultInsuranceFlags(type);
    const comp = defaultCompensationModel(type, payrollCfg);
    onChange(
      syncFinancialFromAnnual({
        ...value,
        employment_type: type,
        salary_type: defaultSalaryType(type),
        compensation_model: comp,
        ...defaults,
      }),
    );
  };

  const setAnnualSalary = (annual: number) => {
    onChange(
      syncFinancialFromAnnual({
        ...value,
        compensation_model: "annual",
        annual_salary: annual,
        salary_type: "월급",
      }),
    );
  };

  const isFreelancer = value.employment_type === "프리랜서";
  const isPartTime = value.employment_type === "파트타임";
  const isFullTime = value.employment_type === "정직원";
  const useAnnual =
    isFullTime &&
    (value.compensation_model === "annual" ||
      payrollCfg.fullTimeCompensationModel === "annual");

  const monthlyFromAnnual =
    value.annual_salary > 0 ? Math.floor(value.annual_salary / 12) : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {isManual && (
        <div className="md:col-span-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-900">
          수동 급여 모드: 자동 세금·보험 계산 없음. 급여 정산에서 지급·공제를 직접 입력하세요.
        </div>
      )}

      <div className="space-y-2 md:col-span-2">
        <Label>고용 형태 *</Label>
        <div className="flex flex-wrap gap-2">
          {EMPLOYMENT_OPTIONS.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setEmploymentType(type)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                value.employment_type === type
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {type}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-500">
          {isFreelancer && krAuto && "프리랜서: 3.3% 원천징수, 4대보험 미적용"}
          {isPartTime && krAuto && "파트타임: 시급·출퇴근 기반 주휴수당 (주 15시간 이상)"}
          {isFullTime && krAuto && useAnnual && "정직원: 년봉 ÷ 12 월 환산, 4대보험 기본 적용"}
          {isFullTime && !useAnnual && "정직원: 월급제"}
        </p>
      </div>

      {isFullTime && useAnnual && (
        <>
          <div className="space-y-2 md:col-span-2">
            <Label>년봉 (연봉, 원)</Label>
            <Input
              type="number"
              min={0}
              step={1000000}
              value={value.annual_salary || ""}
              onChange={(e) => setAnnualSalary(Number(e.target.value) || 0)}
              placeholder="36000000"
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <p className="text-sm text-indigo-700 font-medium">
              월 환산 기본급: {formatKrw(monthlyFromAnnual)}
            </p>
          </div>
        </>
      )}

      {(!isFullTime || !useAnnual) && (
        <div className="space-y-2">
          <Label>
            {isPartTime ? "시급 (원)" : isFreelancer ? "계약금 (원)" : "월급 (원)"}
          </Label>
          <Input
            type="number"
            min={0}
            value={value.base_salary || ""}
            onChange={(e) =>
              onChange({
                ...value,
                base_salary: Number(e.target.value) || 0,
                compensation_model: isPartTime
                  ? "hourly"
                  : isFreelancer
                    ? "project"
                    : "monthly",
              })
            }
          />
        </div>
      )}

      {!isFreelancer && krAuto && (
        <div className="space-y-2">
          <Label>식대 (월, 비과세 한도 20만원)</Label>
          <Input
            type="number"
            min={0}
            value={value.meal_allowance_monthly ?? 200000}
            onChange={(e) =>
              onChange({ ...value, meal_allowance_monthly: Number(e.target.value) || 0 })
            }
          />
        </div>
      )}

      <div className="space-y-2">
        <Label>은행</Label>
        <Input
          value={value.bank_name ?? ""}
          onChange={(e) => onChange({ ...value, bank_name: e.target.value })}
          placeholder="국민은행"
        />
      </div>
      <div className="space-y-2">
        <Label>계좌번호</Label>
        <Input
          value={value.account_number ?? ""}
          onChange={(e) => onChange({ ...value, account_number: e.target.value })}
        />
      </div>

      {!isFreelancer && krAuto && (
        <div className="md:col-span-2 rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/50">
          <Label className="text-sm font-semibold">4대보험 (근로자 부담분)</Label>
          <div className="flex flex-wrap gap-6">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={value.insurance_national_pension}
                onCheckedChange={(v) =>
                  onChange({ ...value, insurance_national_pension: v === true })
                }
              />
              국민연금 (4.5%)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={value.insurance_health}
                onCheckedChange={(v) =>
                  onChange({ ...value, insurance_health: v === true })
                }
              />
              건강보험 (3.545%)
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={value.insurance_employment}
                onCheckedChange={(v) =>
                  onChange({ ...value, insurance_employment: v === true })
                }
              />
              고용보험 (0.9%)
            </label>
          </div>
        </div>
      )}

      <div className="space-y-2 md:col-span-2">
        <Label>세무 메모</Label>
        <Input
          value={value.tax_note ?? ""}
          onChange={(e) => onChange({ ...value, tax_note: e.target.value })}
          placeholder="간이세액표 적용, 외국인 단일세율 등"
        />
      </div>
    </div>
  );
}
