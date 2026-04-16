export interface Supplier {
  id: string;
  tenant_id: string;
  name: string;
  contact?: string;
  email?: string;
  address?: string;
  business_number?: string;
  supplier_type?: string;
  memo?: string;
  created_at: string;
  updated_at: string;
}
