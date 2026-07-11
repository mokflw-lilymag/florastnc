export interface TenantStaffHrProfile {
  id: string;
  name: string;
  full_name?: string;
  pin_code?: string;
  role: string;
  created_at?: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  birth_date?: string | null;
  hire_date?: string | null;
  position?: string | null;
  memo?: string | null;
  emergency_contact?: string | null;
  emergency_phone?: string | null;
}

export interface TenantStaffHrInput {
  name?: string;
  pin_code?: string;
  phone?: string;
  email?: string;
  address?: string;
  birth_date?: string;
  hire_date?: string;
  position?: string;
  memo?: string;
  emergency_contact?: string;
  emergency_phone?: string;
}

export const TENANT_STAFF_HR_SELECT =
  "id, name, pin_code, role, created_at, phone, email, address, birth_date, hire_date, position, memo, emergency_contact, emergency_phone";
