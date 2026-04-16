export interface Material {
  id: string;
  tenant_id: string;
  name: string;
  main_category: string;
  mid_category?: string;
  unit: string;
  spec?: string;
  price: number;
  color?: string;
  stock: number;
  current_stock: number;
  supplier?: string;
  supplier_id?: string;
  memo?: string;
  updated_at: string;
}
