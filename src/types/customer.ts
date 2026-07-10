export interface Customer {
  id: string;
  tenant_id: string;
  name: string;
  contact: string;
  type: 'individual' | 'company';
  department: string | null;
  email: string | null;
  company_name: string | null;
  address: string | null;
  grade: string | null;
  points: number;
  memo: string | null;
  total_spent: number;
  order_count: number;
  is_deleted: boolean;
  marketing_consent?: boolean;
  extra_data?: any;
  source?: 'manual' | 'pos' | 'online';
  last_order_date?: string;
  created_at: string;
  updated_at: string;
  customer_anniversaries?: { id: string }[];
}

export interface CustomerData {
  name: string;
  contact: string;
  type: 'individual' | 'company';
  department?: string;
  email?: string;
  company_name?: string;
  address?: string;
  grade?: string | null;
  points?: number;
  memo?: string;
  marketing_consent?: boolean;
  /** 포인트 변경 시 point_transactions description (DB 저장 안 함) */
  point_adjustment_reason?: string;
  /** 저장 1회 = 내역 1건 (중복 insert 방지) */
  point_adjustment_idempotency_key?: string;
  /** 기념일 목록 (선택) — 저장 시 /api/revenue/anniversary PUT 동기화 */
  anniversaries?: CustomerAnniversaryInput[];
}

export interface CustomerAnniversaryInput {
  id?: string;
  label?: string;
  anniversary_date?: string;
  recurring_yearly?: boolean;
  preferred_flowers?: string;
  allergies?: string;
}

export interface CustomerAnniversary extends CustomerAnniversaryInput {
  id: string;
  customer_id: string;
  tenant_id: string;
  created_at?: string;
  updated_at?: string;
}
