export interface Product {
  id: string;
  tenant_id: string;
  name: string;
  main_category: string | null;
  mid_category: string | null;
  price: number;
  stock: number;
  supplier: string | null;
  supplier_id: string | null;
  code: string | null;
  status: 'active' | 'inactive' | 'sold_out';
  extra_data?: any;
  created_at: string;
  updated_at: string;
}

export interface ProductData {
  name: string;
  main_category?: string;
  mid_category?: string;
  price?: number;
  stock?: number;
  supplier?: string;
  supplier_id?: string;
  code?: string;
  status?: 'active' | 'inactive' | 'sold_out';
  extra_data?: any;
}
