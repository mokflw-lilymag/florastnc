export type PaymentStatus = "paid" | "pending" | "completed" | "split_payment";

export interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  source?: 'excel_upload' | 'manual';
  originalData?: string;
}

export interface Order {
  id: string;
  tenant_id: string;
  order_number: string;
  status: 'processing' | 'completed' | 'canceled';
  receipt_type: "store_pickup" | "pickup_reservation" | "delivery_reservation";
  order_date: string;
  orderer: {
    id?: string;
    name: string;
    contact: string;
    company?: string;
    email?: string;
  };
  summary: {
    subtotal: number;
    discountAmount: number;
    discountRate: number;
    deliveryFee: number;
    pointsUsed?: number;
    pointsEarned?: number;
    total: number;
  };
  payment: {
    method: "card" | "cash" | "transfer" | "mainpay" | "shopping_mall" | "epay" | "kakao" | "apple";
    status: PaymentStatus;
    completedAt?: string;
    isSplitPayment?: boolean;
    firstPaymentAmount?: number;
    firstPaymentDate?: string;
    firstPaymentMethod?: string;
    secondPaymentAmount?: number;
    secondPaymentDate?: string;
    secondPaymentMethod?: string;
  };
  items: OrderItem[];
  pickup_info: {
    date: string;
    time: string;
    pickerName: string;
    pickerContact: string;
  } | null;
  delivery_info: {
    date: string;
    time: string;
    recipientName: string;
    recipientContact: string;
    address: string;
    district: string;
    itemSize?: 'small' | 'medium' | 'large';
    isExpress?: boolean;
    driverAffiliation?: string;
    driverName?: string;
    driverContact?: string;
    completionPhotoUrl?: string;
    completedAt?: string;
    completedBy?: string;
  } | null;
  memo?: string;
  delivery_provider?: string;
  delivery_tracking_id?: string;
  delivery_tracking_url?: string;
  delivery_provider_status?: string;
  delivery_provider_fee?: number;
  message?: {
    type?: 'none' | 'card' | 'ribbon';
    content?: string;
    sender?: string;
  };
  actual_delivery_cost?: number;
  actual_delivery_payment_method?: "card" | "cash" | "transfer";
  actual_delivery_payment_status?: string;
  actual_delivery_cost_cash?: number;
  outsource_info?: {
    isOutsourced: boolean;
    partnerId: string;
    partnerName: string;
    partnerPrice: number;
    platformFee?: number;
    senderProfit?: number;
    hideCustomerInfo?: boolean;
    isNetworkPartner?: boolean;
    profit?: number;
    status: 'pending' | 'completed' | 'canceled';
    notes?: string;
    sender_branding?: {
      name: string;
      logo_url: string;
      contact: string;
      address: string;
    };
    outsourcedAt: string;
    updatedAt: string;
  } | null;
  extra_data?: any;
  completionPhotoUrl?: string; // 제작 완료 사진 URL
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  completed_by?: string;
}

export interface OrderData extends Omit<Order, 'id' | 'tenant_id' | 'order_number' | 'created_at' | 'updated_at'> {
  order_number?: string;
}
