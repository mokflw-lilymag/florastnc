export interface Expense {
  id: string;
  tenant_id: string;
  category: string;
  sub_category?: string;
  amount: number;
  description: string;
  expense_date: string;
  payment_method: string;
  supplier_id?: string;
  related_order_id?: string;
  /** 지점→본사 자재 요청으로 자동 생성된 지출 */
  related_branch_material_request_id?: string;
  material_id?: string;
  quantity?: number;
  unit?: string;
  receipt_url?: string;
  receipt_file_id?: string;
  storage_provider?: string;
  purchase_id?: string;
  created_at: string;
}
