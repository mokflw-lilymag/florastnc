export interface Purchase {
  id: string;
  tenant_id: string;
  batch_id?: string;
  batch_name?: string;
  supplier_id?: string;
  material_id?: string;
  name?: string;
  status: 'planned' | 'completed';
  total_price: number;
  quantity: number;
  scheduled_date?: string;
  purchase_date?: string;
  payment_method?: string;
  expense_id?: string;
  notes?: string;
  main_category?: string;
  mid_category?: string;
  created_at: string;
  updated_at: string;
}
