"use client";

import type { ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import Textarea from "@/components/ui/textarea";
import type { TenantStaffHrInput } from "@/types/tenant-staff";

interface StaffHrFieldsFormProps {
  value: TenantStaffHrInput;
  onChange: (next: TenantStaffHrInput) => void;
  showPin?: boolean;
}

/** 다이얼로그 내부 입력 — 반드시 파일 최상위 컴포넌트로 유지 (리마운트 시 한글 IME 깨짐 방지) */
export function StaffHrFieldsForm({ value, onChange, showPin }: StaffHrFieldsFormProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
      <div className="space-y-2 md:col-span-2">
        <label htmlFor="staff-hr-name" className="text-sm font-medium">
          이름 *
        </label>
        <Input
          id="staff-hr-name"
          name="staff-name"
          autoComplete="name"
          value={value.name ?? ""}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
          placeholder="홍길동"
        />
      </div>
      {showPin && (
        <div className="space-y-2">
          <label htmlFor="staff-hr-pin" className="text-sm font-medium">
            PIN 4자리 *
          </label>
          <Input
            id="staff-hr-pin"
            name="staff-pin"
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoComplete="off"
            value={value.pin_code ?? ""}
            onChange={(e) => onChange({ ...value, pin_code: e.target.value.replace(/\D/g, "").slice(0, 4) })}
            placeholder="1234"
          />
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="staff-hr-position" className="text-sm font-medium">
          직책
        </label>
        <Input
          id="staff-hr-position"
          value={value.position ?? ""}
          onChange={(e) => onChange({ ...value, position: e.target.value })}
          placeholder="플로리스트"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="staff-hr-phone" className="text-sm font-medium">
          연락처
        </label>
        <Input
          id="staff-hr-phone"
          type="tel"
          autoComplete="tel"
          value={value.phone ?? ""}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
          placeholder="010-0000-0000"
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="staff-hr-email" className="text-sm font-medium">
          이메일
        </label>
        <Input
          id="staff-hr-email"
          type="email"
          autoComplete="email"
          value={value.email ?? ""}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <label htmlFor="staff-hr-address" className="text-sm font-medium">
          주소
        </label>
        <Input
          id="staff-hr-address"
          autoComplete="street-address"
          value={value.address ?? ""}
          onChange={(e) => onChange({ ...value, address: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="staff-hr-birth" className="text-sm font-medium">
          생년월일
        </label>
        <Input
          id="staff-hr-birth"
          type="date"
          value={value.birth_date ?? ""}
          onChange={(e) => onChange({ ...value, birth_date: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="staff-hr-hire" className="text-sm font-medium">
          입사일
        </label>
        <Input
          id="staff-hr-hire"
          type="date"
          value={value.hire_date ?? ""}
          onChange={(e) => onChange({ ...value, hire_date: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="staff-hr-emergency-name" className="text-sm font-medium">
          비상 연락처 (이름)
        </label>
        <Input
          id="staff-hr-emergency-name"
          value={value.emergency_contact ?? ""}
          onChange={(e) => onChange({ ...value, emergency_contact: e.target.value })}
        />
      </div>
      <div className="space-y-2">
        <label htmlFor="staff-hr-emergency-phone" className="text-sm font-medium">
          비상 연락처 (전화)
        </label>
        <Input
          id="staff-hr-emergency-phone"
          type="tel"
          value={value.emergency_phone ?? ""}
          onChange={(e) => onChange({ ...value, emergency_phone: e.target.value })}
        />
      </div>
      <div className="space-y-2 md:col-span-2">
        <label htmlFor="staff-hr-memo" className="text-sm font-medium">
          메모
        </label>
        <Textarea
          id="staff-hr-memo"
          value={value.memo ?? ""}
          onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onChange({ ...value, memo: e.target.value })}
          rows={3}
          placeholder="특이사항, 계약 조건 등"
        />
      </div>
    </div>
  );
}
