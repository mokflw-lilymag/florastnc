"use client";
import { getMessages } from "@/i18n/getMessages";

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
import { createClient } from "@/utils/supabase/client";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

/** 지출 `sub_category` DB·기존 데이터 호환용 고정값 */
const DELIVERY_EXPENSE_SUB_CATEGORY = "배송비" as const;

interface OrderEditDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  order: Order | null;
}

export function OrderEditDialog({ isOpen, onOpenChange, order }: OrderEditDialogProps) {
  const { updateOrder } = useOrders();
  const { settings } = useSettings();
  const { updateExpenseByOrderId, addExpense, deleteExpenseByOrderId, updateExpense, deleteExpense } = useExpenses();
  const supabase = createClient();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const condolenceRibbonText = pickUiText(
    baseLocale,
    "삼가 故人의 冥福을 빕니다",
    "With deepest condolences",
    "Kính viếng người đã khuất",
    "謹んでお悔やみ申し上げます",
    "谨致哀悼",
    "Nuestro más sentido pésame",
    "Nossas condolências",
    "Sincères condoléances",
    "Aufrichtige Anteilnahme",
    "Примите соболезнования",
  );
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
          type: (order.message?.type || order.extra_data?.message?.type || 'none') as any,
          sender: order.message?.sender || order.extra_data?.message?.sender || '',
          content: order.message?.content || order.extra_data?.message?.content || ''
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
        message: formData.message,
        memo: formData.memo,
        extra_data: order.extra_data || {},
        actual_delivery_cost: formData.actual_delivery_cost,
        actual_delivery_payment_method: formData.actual_delivery_payment_method,
        actual_delivery_cost_cash: formData.actual_delivery_payment_method === 'cash' ? formData.actual_delivery_cost : 0
      };

      if (formData.receipt_type === 'delivery_reservation') {
        updates.delivery_info = {
          ...order.delivery_info,
          recipientName: formData.recipient.name,
          recipientContact: formData.recipient.contact,
          address: formData.address,
          date: formData.order_date,
          driverAffiliation: formData.driverAffiliation
        };
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
        updates.actual_delivery_cost_cash = 0;
      }

      await updateOrder(order.id, updates);
      
      // Handle expense synchronization for delivery costs
      if (formData.receipt_type === 'delivery_reservation' && formData.actual_delivery_cost > 0) {
        const deliveryDescPrefix = pickUiText(
          baseLocale,
          "[배송비]",
          "[Delivery fee]",
          "[Phí giao hàng]",
          "[送料]",
          "[配送费]",
          "[Gastos de envío]",
          "[Taxa de entrega]",
          "[Frais de livraison]",
          "[Liefergebühr]",
          "[Доставка]",
        );
        const expenseData = {
          category: "transportation",
          sub_category: DELIVERY_EXPENSE_SUB_CATEGORY,
          amount: formData.actual_delivery_cost,
          description: `${deliveryDescPrefix} ${order.order_number} (${formData.driverAffiliation || tf.f00534})`,
          expense_date: formData.order_date ? new Date(formData.order_date).toISOString() : new Date().toISOString(),
          payment_method: formData.actual_delivery_payment_method || "card",
        };
        
        const { data: existingExpenses } = await supabase
          .from('expenses')
          .select('id')
          .eq('related_order_id', order.id)
          .eq("sub_category", DELIVERY_EXPENSE_SUB_CATEGORY);

        if (existingExpenses && existingExpenses.length > 0) {
          await updateExpense(existingExpenses[0].id, expenseData);
          if (existingExpenses.length > 1) {
            for (let i = 1; i < existingExpenses.length; i++) {
              await deleteExpense(existingExpenses[i].id);
            }
          }
        } else {
          await addExpense({ ...expenseData, related_order_id: order.id });
        }
      } else if (order.actual_delivery_cost && order.actual_delivery_cost > 0) {
        await deleteExpenseByOrderId(order.id, DELIVERY_EXPENSE_SUB_CATEGORY);
      }

      toast.success(tf.f00637);
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error(tf.f00603);
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
            {tf.f00602} ({order.order_number})
          </DialogTitle>
          <DialogDescription className="text-slate-500">{tf.f00619}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" /> {tf.f00644}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">{tf.f00647}</Label>
                <Input value={formData.orderer.name} onChange={(e) => handleInputChange('orderer', 'name', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">{tf.f00444}</Label>
                <Input value={formData.orderer.contact} onChange={(e) => handleInputChange('orderer', 'contact', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">{tf.f00779}</Label>
                <Input value={formData.orderer.company} onChange={(e) => handleInputChange('orderer', 'company', e.target.value)} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4" /> {tf.f00381}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700">{tf.f00380}</Label>
                <Select value={formData.receipt_type} onValueChange={(val) => val && handleInputChange('receipt_type', '', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="store_pickup">{tf.f00196}</SelectItem>
                    <SelectItem value="pickup_reservation">{tf.f00756}</SelectItem>
                    <SelectItem value="delivery_reservation">{tf.f00271}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-700">{tf.f00391}</Label>
                  <Input value={formData.recipient.name} onChange={(e) => handleInputChange('recipient', 'name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700">{tf.f00390}</Label>
                  <Input value={formData.recipient.contact} onChange={(e) => handleInputChange('recipient', 'contact', e.target.value)} />
                </div>
              </div>
              {formData.receipt_type === 'delivery_reservation' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-slate-700">{tf.f00254}</Label>
                    <Textarea value={formData.address} onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('address', '', e.target.value)} />
                  </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">{tf.f00060}</Label>
                      <div className="h-10 flex items-center px-3 bg-slate-50 border border-slate-200 rounded-md text-slate-600 font-medium">
                        ₩{(formData.customer_paid_delivery_fee || 0).toLocaleString()}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-700">{tf.f00266}</Label>
                      <Select 
                        value={formData.driverAffiliation || ""} 
                        onValueChange={(val) => handleInputChange('driverAffiliation', '', val)}
                      >
                        <SelectTrigger><SelectValue placeholder={tf.f00269} /></SelectTrigger>
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
                        {tf.f00420}
                        {formData.customer_paid_delivery_fee > 0 && formData.actual_delivery_cost > 0 && (
                          <Badge variant="outline" className={`ml-2 text-[10px] ${formData.customer_paid_delivery_fee - formData.actual_delivery_cost >= 0 ? 'text-emerald-600 border-emerald-200 bg-emerald-50' : 'text-rose-600 border-rose-200 bg-rose-50'}`}>
                            {tf.f00367}: ₩{(formData.customer_paid_delivery_fee - formData.actual_delivery_cost).toLocaleString()}
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
                          {tf.f00704}
                        </Button>
                        <Button
                          type="button"
                          variant={formData.actual_delivery_payment_method === 'cash' ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleInputChange('actual_delivery_payment_method', '', 'cash')}
                        >
                          {tf.f00769}
                        </Button>
                      </div>
                    </div>
                  </div>
                  

                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Package className="h-4 w-4" /> {tf.f00333}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {formData.items.map((item, index) => (
                <div key={item.id} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end border p-4 rounded-lg">
                  <div className="md:col-span-2 space-y-2">
                    <Label className="text-slate-700">{tf.f00338}</Label>
                    <Input value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">{tf.f00377}</Label>
                    <Input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseInt(e.target.value) || 1)} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-700">{tf.f00148}</Label>
                    <Input type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', parseInt(e.target.value) || 0)} />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeItem(index)} className="text-red-500"><Minus className="h-4 w-4" /></Button>
                </div>
              ))}
              <Button variant="outline" onClick={addItem} className="w-full"><Plus className="h-4 w-4 mr-2" /> {tf.f00335}</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><MessageSquare className="h-4 w-4" /> {tf.f00201}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-700">{tf.f00209}</Label>
                <Select value={formData.message.type} onValueChange={(val) => handleInputChange('message', 'type', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{tf.f00441}</SelectItem>
                    <SelectItem value="card">{tf.f00207}</SelectItem>
                    <SelectItem value="ribbon">{tf.f00179}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">{tf.f00282}</Label>
                <Input value={formData.message.sender} onChange={(e) => handleInputChange('message', 'sender', e.target.value)} placeholder={tf.f00355} />
              </div>
              {formData.message.type === 'ribbon' && (
                <div className="flex flex-wrap gap-1.5 mb-2 notranslate" translate="no">
                  {[
                    { ko: "축발전", zh: "祝發展" },
                    { ko: "축개업", zh: "祝開業" },
                    { ko: "축승진", zh: "祝昇進" },
                    { ko: "축영전", zh: "祝榮轉" },
                    { ko: "근조", zh: "謹弔" },
                    { ko: "축결혼", zh: "祝結婚" },
                  ].map((msg) => (
                    <Button
                      key={msg.ko}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[11px] bg-primary/5 hover:bg-primary/10 border-primary/20 text-primary font-medium"
                      onClick={() => {
                        const content = `${msg.ko} / ${msg.zh}`;
                        handleInputChange('message', 'content', content);
                      }}
                    >
                      {msg.ko} / {msg.zh}
                    </Button>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[11px] bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700 font-medium"
                    onClick={() => handleInputChange('message', 'content', condolenceRibbonText)}
                  >
                    {tf.f00309}
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <Label className="text-slate-700">{tf.f00200}</Label>
                <Textarea 
                  value={formData.message.content || ""} 
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('message', 'content', e.target.value)} 
                  placeholder={formData.message.type === 'ribbon' ? tf.f00055 : tf.f00708} 
                  translate="no"
                  className="min-h-[100px] notranslate"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="h-4 w-4" /> {tf.f00321}</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">{tf.f00597}</Label>
                <Select value={formData.status} onValueChange={(val) => val && handleInputChange('status', '', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing">{tf.f00678}</SelectItem>
                    <SelectItem value="completed">{tf.f00471}</SelectItem>
                    <SelectItem value="canceled">{tf.f00702}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">{tf.f00046}</Label>
                <Select value={formData.payment.method} onValueChange={(val) => val && handleInputChange('payment', 'method', val)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card">{tf.f00704}</SelectItem>
                    <SelectItem value="cash">{tf.f00769}</SelectItem>
                    <SelectItem value="transfer">{tf.f00057}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>{tf.f00702}</DialogClose>
          <Button onClick={handleSave} disabled={isLoading}>{isLoading ? tf.f00541 : tf.f00539}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
