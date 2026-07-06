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
  is_product?: boolean;
  linked_product_category?: string;
  updated_at: string;
}

export interface MaterialLog {
  id: string;
  tenant_id: string;
  material_id: string;
  change_amount: number;
  type: "IN" | "OUT" | "ADJUST";
  after_stock: number;
  worker?: string;
  memo?: string;
  created_at: string;
}
