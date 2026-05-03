"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { 
  Users, 
  Phone, 
  Mail, 
  MapPin, 
  Building2, 
  History, 
  FileText, 
  Receipt as ReceiptIcon,
  Package,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Target,
  Trophy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Customer } from "@/types/customer";
import { createClient } from "@/utils/supabase/client";
import { OrderDetailDialog } from "@/app/dashboard/orders/components/order-detail-dialog";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

interface CustomerDetailDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onIssueStatement?: (customer: Customer) => void;
  onIssueReceipt?: (customer: Customer) => void;
  onIssueEstimate?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
}

export function CustomerDetailDialog({ 
  customer, 
  isOpen, 
  onOpenChange,
  onIssueStatement,
  onIssueReceipt,
  onIssueEstimate,
  onEdit
}: CustomerDetailDialogProps) {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [pointTransactions, setPointTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale));

  const formatDayLabel = (d: Date) => format(d, "PPP", { locale: dfLoc });

  const formatOrderRowDate = (d: Date) => format(d, "PP", { locale: dfLoc });

  useEffect(() => {
    if (isOpen && customer) {
      fetchCustomerOrders();
      fetchPointTransactions();
    }
  }, [isOpen, customer]);

  const fetchCustomerOrders = async () => {
    if (!customer) return;
    setLoading(true);
    try {
      const contactNoHyphens = customer.contact?.replace(/-/g, '');
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', customer.tenant_id)
        .or(`orderer->>contact.eq.${customer.contact}${contactNoHyphens ? `,orderer->>contact.eq.${contactNoHyphens}` : ''}`)
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders((data || []).map(row => ({
        ...row,
        completionPhotoUrl: row.completionphotourl
      })));
    } catch (err) {
      console.error('Error fetching customer orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPointTransactions = async () => {
    if (!customer) return;
    setPointsLoading(true);
    try {
      const { data, error } = await supabase
        .from('point_transactions')
        .select('*')
        .eq('customer_id', customer.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPointTransactions(data || []);
    } catch (err) {
      console.error('Error fetching points:', err);
    } finally {
      setPointsLoading(false);
    }
  };

  const stats = useMemo(() => {
     if (orders.length === 0) return { total: 0, count: 0, lastDate: null };
     return {
        total: orders.reduce((sum, o) => sum + (o.summary?.total || 0), 0),
        count: orders.length,
        lastDate: orders[0].order_date
     };
  }, [orders]);

  const handleOrderClick = (order: any) => {
    setSelectedOrder(order);
    setIsOrderDetailOpen(true);
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 border-none bg-slate-50 shadow-2xl">
        <DialogHeader className="p-6 pb-0 bg-white border-b border-slate-100">
           <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-4">
                 <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-sm">
                    {customer.type === 'company' ? <Building2 size={28} /> : <Users size={28} />}
                 </div>
                 <div>
                    <div className="flex items-center gap-2">
                       <DialogTitle className="text-2xl font-black text-slate-900">{customer.name}</DialogTitle>
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 uppercase tracking-tighter font-black text-[10px]">
                           {customer.grade || tf.f00526}
                        </Badge>
                        {customer.source === 'pos' && (
                          <Badge className="bg-indigo-600 text-white border-none h-5 px-1.5 text-[9px] font-bold gap-1 flex items-center shadow-sm">
                            {tf.f00010}
                          </Badge>
                        )}
                     </div>
                    <DialogDescription className="text-slate-500 font-medium">
                       {customer.company_name ? `${customer.company_name} · ${customer.department || tf.f00295}` : tf.f00029}
                    </DialogDescription>
                 </div>
              </div>
              <div className="flex gap-2">
                  <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => onIssueReceipt?.(customer)}
                     className="h-9 hover:bg-emerald-50 border-slate-200 gap-2 font-bold text-emerald-600"
                  >
                     <ReceiptIcon className="h-4 w-4" />
                     {tf.f00024}
                  </Button>
                  <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => onIssueStatement?.(customer)}
                     className="h-9 hover:bg-blue-50 border-slate-200 gap-2 font-bold text-blue-600"
                  >
                     <FileText className="h-4 w-4" />
                     {tf.f00032}
                  </Button>
                  <Button 
                     variant="outline" 
                     size="sm" 
                     onClick={() => onIssueEstimate?.(customer)}
                     className="h-9 hover:bg-amber-50 border-slate-200 gap-2 font-bold text-amber-600"
                  >
                     <FileText className="h-4 w-4" />
                     {tf.f00041}
                  </Button>
               </div>
            </div>
         </DialogHeader>

         <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Summary Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               <Card className="border-none shadow-sm bg-blue-600 text-white overflow-hidden">
                  <div className="p-4 relative">
                     <TrendingUp className="absolute right-4 top-4 h-12 w-12 opacity-10" />
                     <p className="text-blue-100 text-xs font-bold uppercase tracking-wider">{tf.f00684}</p>
                     <h3 className="text-2xl font-black mt-1">₩{stats.total.toLocaleString()}</h3>
                     <p className="text-blue-200 text-[10px] mt-1 font-medium italic">{stats.count}{tf.f00001}</p>
                  </div>
               </Card>
               <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <div className="p-4 border-l-4 border-l-indigo-500">
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{tf.f00189}</p>
                     <h3 className="text-lg font-bold text-slate-900 mt-1">
                        {stats.lastDate ? formatDayLabel(new Date(stats.lastDate)) : tf.f00680}
                     </h3>
                     <p className="text-slate-500 text-[10px] mt-1 font-medium">{stats.lastDate ? tf.f00119 : tf.f00350}</p>
                  </div>
               </Card>
               <Card className="border-none shadow-sm bg-white overflow-hidden">
                  <div className="p-4 border-l-4 border-l-amber-500">
                     <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{tf.f00286}</p>
                     <div className="flex items-center gap-2 mt-1">
                        <h3 className="text-xl font-bold text-slate-900">{(customer.points || 0).toLocaleString()} P</h3>
                        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none px-1.5 h-5 text-[10px]">REWARD</Badge>
                     </div>
                     <p className="text-slate-500 text-[10px] mt-1 font-medium">{tf.f00147}</p>
                  </div>
               </Card>
            </div>

            <Tabs defaultValue="history" className="w-full">
               <TabsList className="grid w-full grid-cols-3 bg-white/50 backdrop-blur-sm border border-slate-200 rounded-xl p-1">
                  <TabsTrigger value="history" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">{tf.f00606} ({orders.length})</TabsTrigger>
                  <TabsTrigger value="points" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm text-amber-600">{tf.f00730}</TabsTrigger>
                  <TabsTrigger value="info" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">{tf.f00315}</TabsTrigger>
               </TabsList>
               
               <TabsContent value="points" className="mt-4 animate-in fade-in duration-300">
                  <Card className="border-slate-200 shadow-sm bg-white overflow-hidden">
                     <CardHeader className="pb-3 border-b border-slate-50">
                        <CardTitle className="text-base font-black flex items-center gap-2 text-slate-800">
                           <TrendingUp className="h-4 w-4 text-amber-500" /> {tf.f00734}
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                           {pointsLoading ? (
                              <div className="p-4 space-y-4">
                                 {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                               </div>
                           ) : pointTransactions.length > 0 ? (
                              <div className="divide-y divide-slate-50">
                                 {pointTransactions.map((tx) => (
                                    <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                                       <div className="flex items-center gap-4">
                                          <div className={cn(
                                             "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shadow-sm",
                                             tx.amount > 0 
                                               ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                                               : "bg-rose-50 text-rose-600 border border-rose-100"
                                          )}>
                                             {tx.amount > 0 ? `+` : ``}{tx.amount.toLocaleString()}
                                          </div>
                                          <div className="space-y-0.5">
                                             <p className="text-sm font-bold text-slate-800">{tx.description || tf.f00731}</p>
                                             <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                                                <Badge variant="outline" className="text-[8px] h-4 px-1 leading-none border-slate-200 uppercase tracking-tighter">
                                                   {tx.source === 'pos' ? '📟 POS' : tx.source === 'order' ? tf.f00012 : tf.f00009}
                                                </Badge>
                                                <span>{format(new Date(tx.created_at), "Pp", { locale: dfLoc })}</span>
                                             </div>
                                          </div>
                                       </div>
                                       <div className="text-right">
                                          <Badge className={cn(
                                             "text-[10px] px-1.5 py-0",
                                             tx.type === 'earn' ? 'bg-emerald-500' : tx.type === 'use' ? 'bg-rose-500' : 'bg-slate-500'
                                          )}>
                                             {tx.type === 'earn' ? tf.f00544 : tx.type === 'use' ? tf.f00302 : tx.type === 'cancel' ? tf.f00702 : tf.f00115}
                                          </Badge>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                                 <Trophy className="h-12 w-12 opacity-10" />
                                 <p className="font-bold text-sm">{tf.f00729}</p>
                              </div>
                           )}
                        </ScrollArea>
                     </CardContent>
                  </Card>
               </TabsContent>

               <TabsContent value="history" className="mt-4 animate-in fade-in duration-300">
                  <Card className="border-slate-200 shadow-sm bg-white">
                     <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-slate-50">
                        <CardTitle className="text-base font-black flex items-center gap-2 text-slate-800">
                           <History className="h-4 w-4 text-blue-500" /> {tf.f00622}
                        </CardTitle>
                        <span className="text-xs text-slate-400 font-medium">{tf.f00690}</span>
                     </CardHeader>
                     <CardContent className="p-0">
                        <ScrollArea className="h-[400px]">
                           {loading ? (
                              <div className="p-4 space-y-4">
                                 {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
                              </div>
                           ) : orders.length > 0 ? (
                              <div className="divide-y divide-slate-50">
                                 {orders.map((order) => (
                                    <div key={order.id} className="p-5 hover:bg-slate-50/80 transition-all group cursor-pointer" onClick={() => handleOrderClick(order)}>
                                       <div className="flex justify-between items-start mb-2">
                                          <div>
                                             <div className="flex items-center gap-2 mb-1">
                                                <span className="text-sm font-black text-slate-900">
                                                  {formatOrderRowDate(new Date(order.order_date))}
                                                </span>
                                                <Badge className={
                                                   order.status === 'completed' 
                                                   ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                                   : 'bg-blue-50 text-blue-600 border-blue-100'
                                                }>
                                                   {order.status === 'completed' ? tf.f00272 : tf.f00671}
                                                </Badge>
                                             </div>
                                             <div className="flex flex-wrap gap-1 items-center">
                                                {order.items?.map((item: any, idx: number) => (
                                                   <Badge key={idx} variant="outline" className="text-[11px] font-bold border-slate-200 bg-white group-hover:bg-slate-50">
                                                      {item.name} ({item.quantity})
                                                   </Badge>
                                                ))}
                                             </div>
                                          </div>
                                          <div className="text-right">
                                             <p className="text-lg font-black text-slate-900 italic">₩{(order.summary?.total || 0).toLocaleString()}</p>
                                             <p className="text-[10px] text-slate-400 font-medium font-mono">#{order.order_number}</p>
                                          </div>
                                       </div>
                                       <div className="flex items-center justify-between mt-3">
                                          <div className="flex items-center gap-4 text-[11px] text-slate-500 font-medium">
                                             <div className="flex items-center gap-1">
                                                <Package className="h-3 w-3" />
                                                {order.receipt_type === 'delivery_reservation' ? tf.f00271 : tf.f00196}
                                             </div>
                                             {order.memo && (
                                                <div className="flex items-center gap-1 max-w-[300px] truncate italic text-slate-400">
                                                   " {order.memo} "
                                                </div>
                                             )}
                                          </div>
                                          <Button variant="ghost" size="sm" className="h-7 text-[10px] gap-1 opacity-40 group-hover:opacity-100 transition-all text-blue-600 font-black">
                                             {tf.f00627} <ChevronRight className="h-3 w-3" />
                                          </Button>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           ) : (
                              <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                                 <History className="h-12 w-12 opacity-10" />
                                 <p className="font-bold text-lg">{tf.f00431}</p>
                                 <Button 
                                    className="mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold gap-2"
                                    onClick={() => window.location.href = `/dashboard/orders/new?customerId=${customer.id}`}
                                 >
                                    <Package className="h-4 w-4" />
                                    {tf.f00341}
                                 </Button>
                              </div>
                           )}
                        </ScrollArea>
                     </CardContent>
                  </Card>
               </TabsContent>

               <TabsContent value="info" className="mt-4 animate-in fade-in duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="pb-2 border-b border-slate-50">
                           <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                              <Phone className="h-4 w-4 text-blue-500" /> {tf.f00446}
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{tf.f00781}</Label>
                              <p className="text-slate-900 font-bold">{customer.contact || tf.f00167}</p>
                           </div>
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{tf.f00504}</Label>
                              <p className="text-slate-900 font-bold">{customer.email || tf.f00169}</p>
                           </div>
                           <div className="space-y-1">
                              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">{tf.f00650}</Label>
                              <div className="flex items-start gap-1 p-3 bg-slate-50 rounded-lg text-slate-700 text-sm font-medium border border-slate-100">
                                 <MapPin className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                                 {customer.address || tf.f00108}
                              </div>
                           </div>
                        </CardContent>
                     </Card>

                     <Card className="border-slate-200 shadow-sm bg-white">
                        <CardHeader className="pb-2 border-b border-slate-50">
                           <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                              <FileText className="h-4 w-4 text-amber-500" /> {tf.f00604}
                           </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-4">
                           <div className="p-4 bg-amber-50 text-amber-900 rounded-xl min-h-[120px] text-sm leading-relaxed border border-amber-100 font-medium">
                              {customer.memo || tf.f00082}
                           </div>
                           <div className="mt-4 flex flex-wrap gap-2">
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold"># {customer.type === 'company' ? tf.f00110 : tf.f00030}</Badge>
                              <Badge variant="secondary" className="bg-slate-100 text-slate-600 border-none font-bold"># {customer.grade || tf.f00085}</Badge>
                           </div>
                        </CardContent>
                     </Card>
                  </div>
               </TabsContent>
            </Tabs>
         </div>

         <DialogFooter className="p-6 pt-2 bg-white border-t border-slate-100">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="px-8 font-bold border border-slate-200 text-slate-600">{tf.f00149}</Button>
            <Button 
               onClick={() => {
                  if (customer && onEdit) {
                     onEdit(customer);
                     onOpenChange(false);
                  }
               }}
               className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-black shadow-lg shadow-blue-200 gap-2"
            >
               {tf.f00567}
            </Button>
         </DialogFooter>
      </DialogContent>
      <OrderDetailDialog
        isOpen={isOrderDetailOpen}
        onOpenChange={setIsOrderDetailOpen}
        order={selectedOrder}
      />
    </Dialog>
  );
}
