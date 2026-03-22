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
  extra_data?: any;
  last_order_date?: string;
  created_at: string;
  updated_at: string;
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
  extra_data?: any;
}
