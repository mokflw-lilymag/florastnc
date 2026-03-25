"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { 
  User, Phone, Mail, Building, MapPin, Calendar, Clock, 
  Package, MessageSquare, FileText, CreditCard, Truck, 
  Save, X, Plus, Minus 
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Textarea from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { useOrders } from "@/hooks/use-orders";
import { useExpenses } from "@/hooks/use-expenses";
import { useSettings } from "@/hooks/use-settings";
import { Order, OrderItem } from "@/types/order";
import { parseDate } from "@/lib/date-utils";

interface OrderEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export function OrderEditDialog({ isOpen, onOpenChange, order }: OrderEditDialogProps) {
  const { updateOrder } = useOrders();
  const { settings } = useSettings();
  const { updateExpenseByOrderId, addExpense, deleteExpenseByOrderId } = useExpenses();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    orderer: {
      name: '',
      contact: '',
      company: '',
      email: ''
    },
    receipt_type: 'store_pickup' as Order['receipt_type'],
    order_date: '',
    recipient: {
      name: '',
      contact: ''
    },
    address: '',
    items: [] as OrderItem[],
    message: {
      type: 'none',
      sender: '',
      content: ''
    },
    status: 'processing' as Order['status'],
    payment: {
      method: 'card' as Order['payment']['method'],
      status: 'pending' as Order['payment']['status']
    },
    memo: '',
    driverAffiliation: '',
    actual_delivery_cost: 0,
    actual_delivery_payment_method: 'card' as Order['actual_delivery_payment_method'],
    customer_paid_delivery_fee: 0
  });

  useEffect(() => {
    if (order && isOpen) {
      setFormData({
        orderer: {
          name: order.orderer.name || '',
          contact: order.orderer.contact || '',
          company: order.orderer.company || '',
          email: order.orderer.email || ''
        },
        receipt_type: (order.receipt_type || 'store_pickup') as Order['receipt_type'],
        order_date: order.order_date ? format(parseDate(order.order_date), "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
        recipient: {
          name: order.delivery_info?.recipientName || order.pickup_info?.pickerName || '',
          contact: order.delivery_info?.recipientContact || order.pickup_info?.pickerContact || ''
        },
        address: order.delivery_info?.address || '',
        items: [...order.items],
        message: {
          type: (order.extra_data?.message?.type || 'none') as any,
          sender: order.extra_data?.message?.sender || '',
          content: order.extra_data?.message?.content || ''
        },
        status: (order.status || 'processing') as Order['status'],
        payment: {
          method: (order.payment?.method || 'card') as Order['payment']['method'],
          status: (order.payment?.status || 'pending') as Order['payment']['status']
        },
        memo: order.memo || '',
        driverAffiliation: order.delivery_info?.driverAffiliation || '',
        actual_delivery_cost: order.actual_delivery_cost || 0,
        actual_delivery_payment_method: order.actual_delivery_payment_method || 'card',
        customer_paid_delivery_fee: order.summary?.deliveryFee || 0
      });
    }
  }, [order, isOpen]);

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => {
      if (field === '') return { ...prev, [section]: value };
      const currentSection = (prev as any)[section];
      return {
        ...prev,
        [section]: {
          ...currentSection,
          [field]: value
        }
      };
    });
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  };

  const addItem = () => {
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, { id: crypto.randomUUID(), name: '', quantity: 1, price: 0 }]
    }));
  };

  const removeItem = (index: number) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const calculateTotal = () => {
    const subtotal = formData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    // Simple logic for now. Can add delivery fee, discount later.
    return subtotal;
  };

  const handleSave = async () => {
    if (!order) return;
    setIsLoading(true);
    try {
      const updates: any = {
        orderer: formData.orderer,
        receipt_type: formData.receipt_type,
        status: formData.status,
        payment: {
          ...order.payment,
          ...formData.payment
        },
        items: formData.items,
        memo: formData.memo,
        extra_data: {
          ...order.extra_data,
          message: formData.message
        }
      };

      if (formData.receipt_type === 'delivery_reservation') {
        updates.delivery_info = {
          ...order.delivery_info,
          recipientName: formData.recipient.name,
          recipientContact: formData.recipient.contact,
          address: formData.address,
          date: formData.order_date, // Should ideally have its own field
          driverAffiliation: formData.driverAffiliation
        };
        updates.actual_delivery_cost = formData.actual_delivery_cost;
        updates.actual_delivery_payment_method = formData.actual_delivery_payment_method;
        updates.pickup_info = null;
      } else {
        updates.pickup_info = {
          ...order.pickup_info,
          pickerName: formData.recipient.name,
          pickerContact: formData.recipient.contact,
          date: formData.order_date
        };
        updates.delivery_info = null;
        updates.actual_delivery_cost = 0;
      }

      await updateOrder(order.id, updates);
      
      // Handle expense synchronization for delivery costs
      if (formData.receipt_type === 'delivery_reservation' && formData.actual_delivery_cost > 0) {
        const expenseData = {
          category: "transportation",
          sub_category: "delivery_fee",
          amount: formData.actual_delivery_cost,
          description: `[배송비] ${order.order_number} (${formData.driverAffiliation || '자체배송'})`,
          expense_date: formData.order_date ? new Date(formData.order_date).toISOString() : new Date().toISOString(),
          payment_method: formData.actual_delivery_payment_method || "card",
        };
        const updateSuccess = await updateExpenseByOrderId(order.id, expenseData, "delivery_fee");
        if (!updateSuccess) {
          await addExpense({
            ...expenseData,
            related_order_id: order.id
          });
        }
      } else if (order.actual_delivery_cost && order.actual_delivery_cost > 0) {
        await deleteExpenseByOrderId(order.id, "delivery_fee");
      }

      toast.success("주문이 수정되었습니다.");
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("주문 수정에 실패했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-slate-900">
            <Package className="h-5 w-5" />
            주문 수정 ({order.order_number})
          </DialogTitle>
          <DialogDescription className="text-slate-500">주문 정보를 수정합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> 주문자 정보</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">주문자명</Label>
                <Input value={formData.orderer.name} onChange={(e) => handleInputChange('orderer', 'name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">연락처</Label>
                <Input value={formData.orderer.contact} onChange={(e) => handleInputChange('orderer', 'contact', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">회사명</Label>
                <Input value={formData.orderer.company} onChange={(e) => handleInputChange('orderer', 'company', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> 수령 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700">수령 방법</Label>
                <Select value={formData.receipt_type} onValueChange={(val) => val && handleInputChange('receipt_type', '', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store_pickup">매장픽업</SelectItem>
                    <SelectItem value="pickup_reservation">픽업예약</SelectItem>
                    <SelectItem value="delivery_reservation">배송예약</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">수령자명</Label>
                  <Input value={formData.recipient.name} onChange={(e) => handleInputChange('recipient', 'name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">수령자 연락처</Label>
                  <Input value={formData.recipient.contact} onChange={(e) => handleInputChange('recipient', 'contact', e.target.value)} />
                </div>
              </div>
              {formData.receipt_type === 'delivery_reservation' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-700">배송 주소</Label>
                    <Textarea value={formData.address} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('address', '', e.target.value)} />
                  </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">고객 결제 배송비</Label>
                      <div className="h-10 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-md text-slate-600 font-medium">
                        ₩{(formData.customer_paid_delivery_fee || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">배송업체</Label>
                      <Select 
                        value={formData.driverAffiliation || ""} 
                        onValueChange={(val) => handleInputChange('driverAffiliation', '', val)}
                      >
                        <SelectTrigger><SelectValue placeholder="배송업체 선택" /></SelectTrigger>
                        <SelectContent>
                          {(settings?.deliveryCarriers || []).map((carrier) => (
                            <SelectItem key={carrier} value={carrier}>{carrier}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-slate-700 font-bold text-indigo-600 flex items-center gap-1">
                        실제 배송비 지출
                        {formData.customer_paid_delivery_fee > 0 && formData.actual_delivery_cost > 0 && (
                          <Badge variant="outline" className={`ml-2 text-[10px] ${formData.customer_paid_delivery_fee - formData.actual_delivery_cost >= 0 ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-rose-600 border-rose-200 bg-rose-50'}`}>
                            손익: ₩{(formData.customer_paid_delivery_fee - formData.actual_delivery_cost).toLocaleString()}
                          </Badge>
                        )}
                      </Label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">₩</span>
                          <Input 
                            type="number"
                            className="pl-8"
                            value={formData.actual_delivery_cost === 0 ? "" : formData.actual_delivery_cost} 
                            onChange={(e) => handleInputChange('actual_delivery_cost', '', e.target.value ? parseInt(e.target.value) : 0)} 
                          />
                        </div>
                        <Button
                          type="button"
                          variant={formData.actual_delivery_payment_method === 'card' ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleInputChange('actual_delivery_payment_method', '', 'card')}
                        >
                          카드
                        </Button>
                        <Button
                          type="button"
                          variant={formData.actual_delivery_payment_method === 'cash' ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleInputChange('actual_delivery_payment_method', '', 'cash')}
                        >
                          현금
                        </Button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> 상품 정보</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border p-4 rounded-lg">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-slate-700">상품명</Label>
                    <Input value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">수량</Label>
                    <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">단가</Label>
                    <Input type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', parseInt(e.target.value) || 0)} />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500"><Minus className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-2" /> 상품 추가</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> 상태 및 결제</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">주문 상태</Label>
                <Select value={formData.status} onValueChange={(val) => val && handleInputChange('status', '', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">처리중</SelectItem>
                    <SelectItem value="completed">완료</SelectItem>
                    <SelectItem value="canceled">취소</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">결제 방법</Label>
                <Select value={formData.payment.method} onValueChange={(val) => val && handleInputChange('payment', 'method', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">카드</SelectItem>
                    <SelectItem value="cash">현금</SelectItem>
                    <SelectItem value="transfer">계좌이체</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>취소</DialogClose>
          <Button onClick={handleSave} disabled={isLoading}>{isLoading ? "저장 중..." : "저장"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
