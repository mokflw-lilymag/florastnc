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
  Trophy,
  Heart,
  Bell,
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
import { toast } from "sonner";
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
import type { CustomerAnniversaryInput } from "@/types/customer";
import { createClient } from "@/utils/supabase/client";
import { OrderDetailDialog } from "@/app/dashboard/orders/components/order-detail-dialog";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { PENDING_ANNIVERSARY_LABEL } from "@/lib/revenue/order-anniversary-register";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import {
  computeCustomerOrderStats,
  filterOrdersForCustomer,
  isPlaceholderContact,
} from "@/lib/customer-order-match";
import { attachPointBalances } from "@/lib/customers/point-transactions";
import { useSettings } from "@/hooks/use-settings";
import { formatMarketingMessage, sendMarketingEmail } from "@/lib/marketing-helper";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Send, MessageSquare } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface CustomerDetailDialogProps {
  customer: Customer | null;
  displayName?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onIssueStatement?: (customer: Customer) => void;
  onIssueReceipt?: (customer: Customer) => void;
  onIssueEstimate?: (customer: Customer) => void;
  onEdit?: (customer: Customer) => void;
}

export function CustomerDetailDialog({ 
  customer,
  displayName,
  isOpen, 
  onOpenChange,
  onIssueStatement,
  onIssueReceipt,
  onIssueEstimate,
  onEdit,
}: CustomerDetailDialogProps) {
  const supabase = createClient();
  const [orders, setOrders] = useState<any[]>([]);
  const [pointTransactions, setPointTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pointsLoading, setPointsLoading] = useState(false);
  const [anniversaries, setAnniversaries] = useState<CustomerAnniversaryInput[]>([]);
  const [anniversariesLoading, setAnniversariesLoading] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isOrderDetailOpen, setIsOrderDetailOpen] = useState(false);
  const [isSendingMarketing, setIsSendingMarketing] = useState(false);
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale));
  const { settings } = useSettings();
  const { profile } = useAuth();
  
  const handleMarketingKakao = async (type: 'first' | 'd7' | 'dayOf') => {
    if (!customer) return;
    const tpl = type === 'first' ? settings.marketingKakaoTemplateFirstPurchase 
              : type === 'd7' ? settings.marketingKakaoTemplateDaysBefore7 
              : settings.marketingKakaoTemplateDayOf;
    
    const annName = anniversaries[0]?.label || pickUiText(toBaseLocale(locale), "기념일", "Anniversary");
    
    const msg = formatMarketingMessage(tpl || '', {
      customerName: customer.name,
      customerPoint: customer.points,
      branchName: settings.siteName || profile?.tenants?.name || '',
      anniversaryName: annName,
      shopLogoUrl: (profile?.tenants as any)?.logo_url,
      pointRate: settings.pointRate,
      minPointUsage: settings.minPointUsage,
      isPlainText: true,
    });
    
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(msg);
        toast.success(pickUiText(toBaseLocale(locale), '메시지 문구가 클립보드에 복사되었습니다. 원하는 곳에 붙여넣기 해주세요.', 'Message text copied to clipboard.'));
      } else {
        toast.error(pickUiText(toBaseLocale(locale), '클립보드 복사 기능을 지원하지 않는 브라우저입니다.', 'Clipboard API not supported.'));
      }
    } catch (e) {
      toast.error(pickUiText(toBaseLocale(locale), '클립보드 복사에 실패했습니다.', 'Failed to copy to clipboard.'));
    }
  };

  const handleMarketingEmail = async (type: 'first' | 'd7' | 'dayOf') => {
    if (!customer?.email) {
      toast.error(pickUiText(toBaseLocale(locale), '고객의 이메일 주소가 없습니다.', 'Customer has no email address.'));
      return;
    }
    
    const subjectTpl = type === 'first' ? settings.marketingEmailSubjectFirstPurchase 
                     : type === 'd7' ? settings.marketingEmailSubjectDaysBefore7 
                     : settings.marketingEmailSubjectDayOf;
    const contentTpl = type === 'first' ? settings.marketingEmailContentFirstPurchase 
                     : type === 'd7' ? settings.marketingEmailContentDaysBefore7 
                     : settings.marketingEmailContentDayOf;

    const annName = anniversaries[0]?.label || pickUiText(toBaseLocale(locale), "기념일", "Anniversary");
    
    const data = {
      customerName: customer.name,
      customerPoint: customer.points,
      branchName: settings.siteName || profile?.tenants?.name || '',
      anniversaryName: annName,
      shopLogoUrl: (profile?.tenants as any)?.logo_url,
      pointRate: settings.pointRate,
      minPointUsage: settings.minPointUsage,
    };

    const subject = formatMarketingMessage(subjectTpl || '', data);
    const content = formatMarketingMessage(contentTpl || '', data);

    try {
      setIsSendingMarketing(true);
      toast.loading(pickUiText(toBaseLocale(locale), '이메일 발송 중...', 'Sending email...'), { id: 'marketing-email' });
      await sendMarketingEmail(customer.email, subject, content, customer.tenant_id);
      toast.success(pickUiText(toBaseLocale(locale), '이메일이 발송되었습니다.', 'Email sent.'), { id: 'marketing-email' });
    } catch (e: any) {
      toast.error(pickUiText(toBaseLocale(locale), '이메일 발송 실패: ', 'Email failed: ') + e.message, { id: 'marketing-email' });
    } finally {
      setIsSendingMarketing(false);
    }
  };

  const formatDayLabel = (d: Date) => format(d, "PPP", { locale: dfLoc });

  const formatOrderRowDate = (d: Date) => format(d, "PP", { locale: dfLoc });

  const pointTransactionsWithBalance = useMemo(() => {
    if (!customer) return [];
    return attachPointBalances(pointTransactions, customer.points || 0);
  }, [pointTransactions, customer?.points, customer]);

  useEffect(() => {
    if (isOpen && customer) {
      fetchCustomerOrders();
      fetchPointTransactions();
      fetchAnniversaries();
    }
  }, [isOpen, customer?.id, customer?.points]);

  const fetchAnniversaries = async () => {
    if (!customer) return;
    setAnniversariesLoading(true);
    try {
      const res = await fetch(`/api/revenue/anniversary?customerId=${customer.id}`);
      const json = await res.json();
      if (res.ok) setAnniversaries(json.anniversaries ?? []);
    } catch (err) {
      console.error("Error fetching anniversaries:", err);
    } finally {
      setAnniversariesLoading(false);
    }
  };

  const fetchCustomerOrders = async () => {
    if (!customer) return;
    setLoading(true);
    try {
      const queries = [
        supabase
          .from("orders")
          .select("*")
          .eq("tenant_id", customer.tenant_id)
          .eq("orderer->>id", customer.id)
          .neq("status", "canceled")
          .order("order_date", { ascending: false }),
      ];

      if (customer.contact && !isPlaceholderContact(customer.contact)) {
        const contactNoHyphens = customer.contact.replace(/-/g, "");
        queries.push(
          supabase
            .from("orders")
            .select("*")
            .eq("tenant_id", customer.tenant_id)
            .or(
              `orderer->>contact.eq.${customer.contact},orderer->>contact.eq.${contactNoHyphens}`
            )
            .neq("status", "canceled")
            .order("order_date", { ascending: false })
        );
      }

      const results = await Promise.all(queries);
      const fetchError = results.find((result) => result.error)?.error;
      if (fetchError) throw fetchError;

      type OrderRow = NonNullable<(typeof results)[number]["data"]>[number];
      const merged = new Map<string, OrderRow>();
      for (const result of results) {
        for (const row of result.data || []) {
          merged.set(row.id, row);
        }
      }

      const matched = filterOrdersForCustomer(Array.from(merged.values()), customer).sort(
        (a, b) =>
          new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
      );

      setOrders(
        matched.map((row) => ({
          ...row,
          completionPhotoUrl: row.completionphotourl,
        }))
      );
    } catch (err) {
      console.error("Error fetching customer orders:", err);
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
     const computed = computeCustomerOrderStats(orders);
     return {
        total: computed.total_spent,
        count: computed.order_count,
        lastDate: computed.last_order_date,
     };
  }, [orders]);

  const resolvedDisplayName = displayName || customer?.name || "";

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
                       <DialogTitle className="text-2xl font-black text-slate-900">{resolvedDisplayName}</DialogTitle>
                        <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-100 uppercase tracking-tighter font-black text-[10px]">
                           {customer.grade || tf.f00526}
                        </Badge>
                        {customer.source === 'pos' && (
                          <Badge className="bg-indigo-600 text-white border-none h-5 px-1.5 text-[9px] font-bold gap-1 flex items-center shadow-sm">
                            {tf.f00010}
                          </Badge>
                        )}
                        {customer.marketing_consent ? (
                          <Badge className="bg-emerald-600 text-white border-none h-5 px-1.5 text-[9px] font-bold gap-1 flex items-center shadow-sm">
                            <Bell className="h-3 w-3" />
                            알림동의
                          </Badge>
                        ) : null}
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
                  <DropdownMenu>
                    <DropdownMenuTrigger render={
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isSendingMarketing}
                        className="h-9 hover:bg-pink-50 border-slate-200 gap-2 font-bold text-pink-600 bg-white"
                      >
                        <Send className="h-4 w-4" />
                        마케팅 발송
                      </Button>
                    } />
                    <DropdownMenuContent align="end" className="w-56 font-medium">
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-yellow-600">
                          <MessageSquare className="h-3.5 w-3.5" />
                          메시지 복사 (문자/카카오톡)
                        </DropdownMenuLabel>
                        <DropdownMenuItem disabled={!customer?.contact} onClick={() => handleMarketingKakao('first')}>
                          첫 구매 감사 메시지
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!customer?.contact} onClick={() => handleMarketingKakao('d7')}>
                          기념일 D-7 안내
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!customer?.contact} onClick={() => handleMarketingKakao('dayOf')}>
                          당일 기념일 축하
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                      <DropdownMenuSeparator />
                      <DropdownMenuGroup>
                        <DropdownMenuLabel className="flex items-center gap-2 text-xs text-blue-600">
                          <Send className="h-3.5 w-3.5" />
                          이메일 발송
                        </DropdownMenuLabel>
                        <DropdownMenuItem disabled={!customer?.email} onClick={() => handleMarketingEmail('first')}>
                          첫 구매 감사 메일
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!customer?.email} onClick={() => handleMarketingEmail('d7')}>
                          기념일 D-7 안내
                        </DropdownMenuItem>
                        <DropdownMenuItem disabled={!customer?.email} onClick={() => handleMarketingEmail('dayOf')}>
                          당일 기념일 축하
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  <TabsTrigger value="points" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm text-amber-600">{tf.f00730} ({pointTransactions.length})</TabsTrigger>
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
                           ) : pointTransactionsWithBalance.length > 0 ? (
                              <div className="divide-y divide-slate-50">
                                 {pointTransactionsWithBalance.map((tx) => (
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
                                                   {tx.source === 'pos'
                                                     ? '📟 POS'
                                                     : tx.source === 'order'
                                                       ? tf.f00012
                                                       : tx.source === 'manual'
                                                         ? pickUiText(toBaseLocale(locale), '📝 수동', '📝 Manual')
                                                         : tf.f00009}
                                                </Badge>
                                                <span>{format(new Date(tx.created_at), "Pp", { locale: dfLoc })}</span>
                                             </div>
                                             <p className="text-xs font-semibold text-amber-700">
                                               {pickUiText(toBaseLocale(locale), "거래 후 잔액", "Balance after")}{" "}
                                               {tx.balanceAfter.toLocaleString()}P
                                             </p>
                                          </div>
                                       </div>
                                       <div className="text-right">
                                          <Badge className={cn(
                                             "text-[10px] px-1.5 py-0",
                                             tx.type === 'earn' ? 'bg-emerald-500' : tx.type === 'use' ? 'bg-rose-500' : 'bg-slate-500'
                                          )}>
                                             {tx.type === 'earn' ? tf.f00544 : tx.type === 'use' ? tf.f00302 : tx.type === 'cancel' ? tf.f00702 : tx.type === 'manual' ? pickUiText(toBaseLocale(locale), '수동', 'Manual') : tf.f00115}
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
                              <Label className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                {pickUiText(toBaseLocale(locale), "마케팅·기념일 알림", "Marketing & anniversary alerts")}
                              </Label>
                              <p className={cn(
                                "text-sm font-bold flex items-center gap-1.5",
                                customer.marketing_consent ? "text-emerald-700" : "text-slate-500",
                              )}>
                                {customer.marketing_consent ? (
                                  <><Bell className="h-4 w-4" /> {pickUiText(toBaseLocale(locale), "수신 동의", "Opted in")}</>
                                ) : (
                                  pickUiText(toBaseLocale(locale), "미동의", "Not opted in")
                                )}
                              </p>
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

                  <Card className="border-slate-200 shadow-sm bg-white mt-4">
                     <CardHeader className="pb-2 border-b border-slate-50">
                        <CardTitle className="text-sm font-black text-slate-700 flex items-center gap-2">
                           <Heart className="h-4 w-4 text-emerald-500" />
                           {pickUiText(toBaseLocale(locale), "기념일 · 기억하고 싶은 날", "Anniversaries & memorable dates")}
                        </CardTitle>
                     </CardHeader>
                     <CardContent className="pt-4">
                        {anniversariesLoading ? (
                           <Skeleton className="h-16 w-full rounded-xl" />
                        ) : anniversaries.length > 0 ? (
                           <div className="grid gap-2 sm:grid-cols-2">
                              {anniversaries.map((row) => (
                                 <div key={row.id} className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-3 py-2">
                                    <p className={cn(
                                      "text-sm font-bold",
                                      row.label === PENDING_ANNIVERSARY_LABEL ? "text-amber-700" : "text-slate-900",
                                    )}>{row.label || pickUiText(toBaseLocale(locale), "기념일", "Anniversary")}</p>
                                    <p className="text-xs text-slate-600 mt-0.5">
                                      {row.anniversary_date
                                        ? formatDayLabel(new Date(`${row.anniversary_date}T12:00:00`))
                                        : "-"}
                                    </p>
                                 </div>
                              ))}
                           </div>
                        ) : (
                           <p className="text-sm text-slate-500">
                             {pickUiText(toBaseLocale(locale), "등록된 기념일이 없습니다.", "No anniversaries registered yet.")}
                           </p>
                        )}
                     </CardContent>
                  </Card>
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
