"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useEffect, useMemo } from "react";
import { format } from "date-fns";
import { 
  Calendar as CalendarIcon, 
  FileText, 
  Search, 
  Loader2,
  CheckCircle2,
  Printer,
  ChevronRight,
  Receipt as ReceiptIcon,
  Archive
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Customer } from "@/types/customer";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { printDocument } from "@/lib/print-document";
import { Badge } from "@/components/ui/badge";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import {
  applyLineDateOverrides,
  buildDocumentLineItemsFromOrders,
  buildLineDateOverrideMap,
  computeDocumentTotal,
  encodeLineDateOverrides,
  formatCustomerDocumentDate,
  formatDocumentDateParam,
  isExcludedOrderForDocument,
  orderBelongsToCustomer,
  parseDocumentDateParam,
} from "@/lib/customer-document-lines";

interface StatementDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'statement' | 'receipt' | 'estimate';
}

export function StatementDialog({ customer, isOpen, onOpenChange, type }: StatementDialogProps) {
  const supabase = createClient();
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [issueDate, setIssueDate] = useState<Date>(new Date());
  const [documentPeriodStart, setDocumentPeriodStart] = useState<Date | undefined>();
  const [documentPeriodEnd, setDocumentPeriodEnd] = useState<Date | undefined>();
  const [lineItemDates, setLineItemDates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  
  const [recipientName, setRecipientName] = useState("");
  const [recipientCompany, setRecipientCompany] = useState("");
  const [recipientContact, setRecipientContact] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");

  const locale = usePreferredLocale();
  const m = getMessages(locale);
  const tf = m.tenantFlows;
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale));
  const issueDateLabel = useMemo(
    () => format(issueDate, "PPP", { locale: dfLoc }),
    [issueDate, dfLoc]
  );
  const documentPeriodLabel = useMemo(() => {
    if (!documentPeriodStart || !documentPeriodEnd) return "";
    return `${format(documentPeriodStart, "PPP", { locale: dfLoc })} ~ ${format(documentPeriodEnd, "PPP", { locale: dfLoc })}`;
  }, [documentPeriodStart, documentPeriodEnd, dfLoc]);

  const [businessInfo, setBusinessInfo] = useState({
    name: "",
    representative: m.tenantFlows.f02625,
    address: m.tenantFlows.f02626,
    contact: "",
    businessNumber: ""
  });
  useEffect(() => {
    if (isOpen && customer) {
      if (viewMode === 'edit') {
        setIssueDate(new Date());
        setRecipientName(customer.name || "");
        setRecipientCompany(customer.company_name || "");
        setRecipientContact(customer.contact || "");
        setRecipientEmail(customer.email || "");
        fetchOrders();
        fetchBusinessInfo();
      }
    } else {
      setTimeout(() => setViewMode('edit'), 300);
    }
  }, [isOpen, customer, startDate, endDate, type]);

  const fetchBusinessInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.tenant_id) {
        // Fetch from tenants for the store name
        const { data: tenant } = await supabase
          .from('tenants')
          .select('name')
          .eq('id', profile.tenant_id)
          .single();

        const { data: settings } = await supabase
          .from('system_settings')
          .select('data')
          .eq('id', `settings_${profile.tenant_id}`)
          .single();
        
        if (settings?.data) {
          const d = settings.data;
          setBusinessInfo({
            name: d.siteName || tenant?.name || "",
            representative: d.representative || tf.f02625,
            address: d.address || tf.f02626,
            contact: d.contactPhone || "",
            businessNumber: d.businessNumber || ""
          });
        } else if (tenant?.name) {
          setBusinessInfo(prev => ({ ...prev, name: tenant.name }));
        }
      }
    } catch (err) {
      console.error("Error fetching business info:", err);
    }
  };

  const fetchOrders = async () => {
    if (!customer || !startDate || !endDate) return;
    setLoading(true);
    try {
      const rangeStart = startDate.toISOString();
      const rangeEnd = new Date(
        endDate.getFullYear(),
        endDate.getMonth(),
        endDate.getDate(),
        23,
        59,
        59
      ).toISOString();

      const baseQuery = () =>
        supabase
          .from("orders")
          .select("*")
          .eq("tenant_id", customer.tenant_id)
          .neq("status", "canceled")
          .gte("order_date", rangeStart)
          .lte("order_date", rangeEnd);

      const [{ data: byCustomerId, error: idError }, contactResult] =
        await Promise.all([
          baseQuery().eq("orderer->>id", customer.id),
          customer.contact
            ? baseQuery().eq("orderer->>contact", customer.contact)
            : Promise.resolve({ data: [], error: null }),
        ]);

      if (idError) throw idError;
      if (contactResult.error) throw contactResult.error;

      const uniqueOrders = new Map<string, (typeof byCustomerId)[number]>();
      [...(byCustomerId || []), ...(contactResult.data || [])].forEach((order) => {
        if (orderBelongsToCustomer(order, customer) && !isExcludedOrderForDocument(order)) {
          uniqueOrders.set(order.id, order);
        }
      });

      const mergedOrders = Array.from(uniqueOrders.values()).sort(
        (a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime()
      );

      setOrders(mergedOrders);
      setSelectedOrderIds(
        type === "receipt" ? [] : mergedOrders.map((order) => order.id)
      );
    } catch (err) {
      console.error("Error fetching orders for statement:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleGoPreview = () => {
    if (selectedOrderIds.length === 0) return;

    const selected = orders.filter((order) => selectedOrderIds.includes(order.id));
    if (type === "statement" && selected.length > 0) {
      const timestamps = selected.map((order) => new Date(order.order_date).getTime());
      setDocumentPeriodStart(new Date(Math.min(...timestamps)));
      setDocumentPeriodEnd(new Date(Math.max(...timestamps)));
    } else if (type === "statement") {
      setDocumentPeriodStart(startDate);
      setDocumentPeriodEnd(endDate);
    }

    const lines = buildDocumentLineItemsFromOrders(
      selected,
      type,
      { deliveryFee: tf.f00259, discount: tf.f00759 }
    );
    setLineItemDates(buildLineDateOverrideMap(lines));

    setViewMode("preview");
  };

  const handleLineItemDateChange = (lineKey: string, date: Date | undefined) => {
    if (!date) return;
    setLineItemDates((prev) => ({
      ...prev,
      [lineKey]: formatDocumentDateParam(date),
    }));
  };

   const handlePrint = () => {
    if (selectedOrderIds.length === 0) return;

    const selectedOrders = orders.filter((o) => selectedOrderIds.includes(o.id));
    const totalAmount = selectedOrders.reduce(
      (sum, o) => sum + (o.summary?.total ?? 0),
      0
    );

    void (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: profile } = await supabase.from('profiles').select('tenant_id').eq('id', user?.id).single();

        if (profile?.tenant_id) {
          await supabase.from('document_logs').insert({
            tenant_id: profile.tenant_id,
            type: type,
            recipient_info: {
              name: recipientName,
              company: recipientCompany,
              contact: recipientContact,
              email: recipientEmail
            },
            items: selectedOrders.map((o) => ({
              id: o.id,
              name: (o.items || []).map((item: { name: string }) => item.name).join(", "),
              price: o.summary?.total ?? 0,
              date:
                lineItemDates[o.id] ??
                lineItemDates[o.order_number] ??
                o.order_date,
            })),
            total_amount: totalAmount
          });
        }
      } catch (err) {
        console.error("Error saving document log:", err);
      }
    })();

    const params = new URLSearchParams({
      ids: selectedOrderIds.join(','),
      recipient: recipientName,
      company: recipientCompany,
      contact: recipientContact,
      email: recipientEmail,
      type: type,
      issue_date: formatDocumentDateParam(issueDate),
    });

    if (type === "statement" && documentPeriodStart && documentPeriodEnd) {
      params.set("period_start", formatDocumentDateParam(documentPeriodStart));
      params.set("period_end", formatDocumentDateParam(documentPeriodEnd));
    }

    if (Object.keys(lineItemDates).length > 0) {
      params.set("line_dates", encodeLineDateOverrides(lineItemDates));
    }
    
    toast.promise(printDocument(`/dashboard/customers/print?${params.toString()}`), {
      loading: tf.f00353,
      success: tf.f00352,
      error: tf.f00518
    });
    
    onOpenChange(false);
  };

  const selectedOrdersData = orders.filter((order) => selectedOrderIds.includes(order.id));
  const baseLocale = toBaseLocale(locale);
  const documentLabels = { deliveryFee: tf.f00259, discount: tf.f00759 };
  const previewLineItems = applyLineDateOverrides(
    buildDocumentLineItemsFromOrders(selectedOrdersData, type, documentLabels),
    lineItemDates
  );
  const subtotal = computeDocumentTotal(selectedOrdersData, type, previewLineItems);

  if (!customer) return null;

  const typeTitle = type === 'statement' ? tf.f00032 : type === 'estimate' ? tf.f00041 : tf.f00024;
  const typeIcon = type === 'statement' ? <FileText /> : type === 'receipt' ? <ReceiptIcon /> : <FileText />;
  const themeColor = type === 'statement' ? 'bg-blue-600' : 'bg-emerald-600';

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[850px] max-h-[95vh] flex flex-col p-0 border-none shadow-2xl overflow-hidden rounded-2xl">
        <DialogHeader className={`p-6 pb-4 border-b transition-colors duration-500 ${viewMode === 'preview' ? 'bg-slate-900 border-white/10' : themeColor}`}>
          <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
            <span className={viewMode === 'preview' ? 'text-amber-400' : 'text-white/80'}>{typeIcon}</span>
            {viewMode === 'edit'
              ? tf.f02638.replace('{title}', typeTitle)
              : tf.f02639.replace('{title}', typeTitle)}
          </DialogTitle>
          <DialogDescription className={`${viewMode === 'preview' ? 'text-slate-400' : 'text-white/70'} font-medium`}>
            {viewMode === 'edit'
              ? tf.f02640.replace('{name}', customer.name || '')
              : tf.f02641}
          </DialogDescription>
        </DialogHeader>

        <div className={`flex-1 overflow-hidden flex flex-col p-8 space-y-6 overflow-y-auto transition-all duration-500 ${viewMode === 'preview' ? 'bg-slate-200/50' : 'bg-white'}`}>
          
          {viewMode === 'edit' ? (
            <>
              {/* Recipient & Provider Section (Same as Estimate) */}
              <div className="grid grid-cols-2 gap-8 border-b-2 border-slate-900 pb-8 mb-4">
                <div className="space-y-4">
                    <div className="border-b-2 border-slate-200 pb-3 space-y-2">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{tf.f02605}</span>
                       <div className="flex flex-col gap-1.5 text-left">
                          <Input 
                            value={recipientCompany} 
                            onChange={e => setRecipientCompany(e.target.value)} 
                            className="text-xl font-black border-none p-0 focus-visible:ring-0 h-auto bg-transparent hover:bg-slate-50 transition-colors rounded-none placeholder:text-slate-300"
                            placeholder={tf.f02606}
                          />
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{tf.f02607}</span>
                            <Input 
                              value={recipientName} 
                              onChange={e => setRecipientName(e.target.value)} 
                              className="text-sm font-bold border-none p-0 focus-visible:ring-0 h-auto bg-transparent hover:bg-slate-50 transition-colors rounded-none placeholder:text-slate-300 w-full"
                              placeholder={tf.f02608}
                            />
                            <span className="text-xs font-bold text-slate-500 whitespace-nowrap">{tf.f02609}</span>
                          </div>
                       </div>
                    </div>
                </div>

                <div className="border-2 border-slate-900 p-4 rounded-sm bg-white relative text-left">
                   <div className="absolute top-2 right-2 w-10 h-10 border-2 border-red-500/20 rounded-full flex items-center justify-center text-red-500/20 font-black text-[8px] rotate-12">{tf.f02610}</div>
                   <div className="space-y-1.5 relative z-10">
                      <span className="text-[10px] font-black text-slate-400 uppercase block mb-1">{tf.f02611}</span>
                      <p className="text-sm font-black text-slate-900">{businessInfo.name}</p>
                      <p className="text-[10px] font-medium text-slate-500 flex gap-2">
                        <span className="text-slate-400 w-12 shrink-0">{tf.f02612}</span> <span>{businessInfo.businessNumber}</span>
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 flex gap-2">
                        <span className="text-slate-400 w-12 shrink-0">{tf.f02613}</span> <span>{businessInfo.representative}</span>
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 flex gap-2">
                         <span className="text-slate-400 w-12 shrink-0">{tf.f02614}</span>
                         <span className="leading-tight break-keep">{businessInfo.address}</span>
                      </p>
                      <p className="text-[10px] font-medium text-slate-500 flex gap-2">
                         <span className="text-slate-400 w-12 shrink-0">{tf.f00444}</span> <span>{businessInfo.contact}</span>
                      </p>
                   </div>
                </div>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{tf.f02642}</Label>
                  <Popover>
                    <PopoverTrigger render={(props) => (
                      <Button {...props} variant="outline" className="w-full justify-start text-left font-bold border-slate-200 h-11 rounded-xl bg-white">
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {startDate ? format(startDate, "PPP", { locale: dfLoc }) : tf.f02644}
                      </Button>
                    )} />
                    <PopoverContent className="w-auto p-0 border-none shadow-xl" align="start">
                      <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus locale={dfLoc} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{tf.f02643}</Label>
                  <Popover>
                    <PopoverTrigger render={(props) => (
                      <Button {...props} variant="outline" className="w-full justify-start text-left font-bold border-slate-200 h-11 rounded-xl bg-white">
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {endDate ? format(endDate, "PPP", { locale: dfLoc }) : tf.f02644}
                      </Button>
                    )} />
                    <PopoverContent className="w-auto p-0 border-none shadow-xl" align="start">
                      <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus locale={dfLoc} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black text-slate-400 tracking-widest uppercase">{tf.f02621}</Label>
                  <Popover>
                    <PopoverTrigger render={(props) => (
                      <Button {...props} variant="outline" className="w-full justify-start text-left font-bold border-slate-200 h-11 rounded-xl bg-white">
                        <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                        {issueDateLabel}
                      </Button>
                    )} />
                    <PopoverContent className="w-auto p-0 border-none shadow-xl" align="start">
                      <Calendar mode="single" selected={issueDate} onSelect={(date) => date && setIssueDate(date)} initialFocus locale={dfLoc} />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              {/* Order List */}
              <div className="flex-1 flex flex-col min-h-0 border rounded-xl overflow-hidden shadow-inner bg-slate-50/30">
                <div className="p-3 bg-slate-100/50 border-b flex justify-between items-center text-[10px] font-black text-slate-500 px-6 uppercase tracking-widest">
                  <span>{tf.f02645}</span>
                  <div className="flex items-center gap-4">
                    <span>{tf.f00097}</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-6 text-[10px] font-black text-blue-600 p-0 px-2"
                      onClick={() => setSelectedOrderIds(selectedOrderIds.length === orders.length ? [] : orders.map(o => o.id))}
                    >
                      {selectedOrderIds.length === orders.length ? tf.f00562 : tf.f00557}
                    </Button>
                  </div>
                </div>
                
                <ScrollArea className="flex-1">
                  {loading ? (
                    <div className="h-40 flex flex-col items-center justify-center text-slate-400 gap-2">
                      <Loader2 className="animate-spin h-6 w-6" />
                      <span className="text-xs font-bold">{tf.f00132}</span>
                    </div>
                  ) : orders.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                      {orders.map(order => (
                        <div 
                          key={order.id} 
                          className={cn(
                            "p-5 flex items-center gap-6 cursor-pointer hover:bg-slate-50 transition-all",
                            selectedOrderIds.includes(order.id) ? "bg-blue-50/30" : ""
                          )}
                          onClick={() => handleToggleOrder(order.id)}
                        >
                          <Checkbox checked={selectedOrderIds.includes(order.id)} className="w-5 h-5" />
                          <div className="flex-1 text-left">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-black text-slate-900">
                                {format(new Date(order.order_date), "PP", { locale: dfLoc })}
                              </span>
                              <span className="text-base font-black text-slate-900 italic">₩{(order.summary?.total || 0).toLocaleString()}</span>
                            </div>
                            <p className="text-xs text-slate-500 font-medium leading-relaxed truncate max-w-[450px]">
                              {order.items?.map((i: any) => i.name).join(', ')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-64 flex flex-col items-center justify-center text-slate-400 gap-2">
                       <FileText className="h-12 w-12 opacity-5" />
                       <span className="text-sm font-bold tracking-tight">{tf.f00665}</span>
                       <span className="text-[10px] font-medium opacity-60">{tf.f00586}</span>
                    </div>
                  )}
                </ScrollArea>
              </div>
            </>
          ) : (
            /* PREVIEW MODE (Same as Estimate) */
            <div className="flex-1 flex flex-col items-center py-4">
               <div className="w-full max-w-[650px] bg-white shadow-2xl p-12 min-h-[800px] border border-slate-200 flex flex-col scale-[0.98] origin-top text-left">
                  <div className="flex justify-between items-baseline border-b-2 border-slate-900 pb-6 mb-10">
                     <h1 className="text-3xl font-black tracking-tighter">{typeTitle}</h1>
                     <div className="text-right">
                        <p className="text-[10px] font-bold text-slate-400">{tf.f02621}</p>
                        <Popover>
                          <PopoverTrigger render={(props) => (
                            <button
                              {...props}
                              type="button"
                              className="text-sm font-black hover:text-blue-600 transition-colors underline-offset-4 hover:underline"
                            >
                              {issueDateLabel}
                            </button>
                          )} />
                          <PopoverContent className="w-auto p-0 border-none shadow-xl" align="end">
                            <Calendar
                              mode="single"
                              selected={issueDate}
                              onSelect={(date) => date && setIssueDate(date)}
                              initialFocus
                              locale={dfLoc}
                            />
                          </PopoverContent>
                        </Popover>
                     </div>
                  </div>

                  {type === "statement" && (
                    <div className="mb-8 rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">{tf.f02657}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <Popover>
                          <PopoverTrigger render={(props) => (
                            <Button {...props} variant="outline" className="w-full justify-start text-left font-bold border-slate-200 h-10 rounded-lg bg-white">
                              <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                              {documentPeriodStart
                                ? format(documentPeriodStart, "PPP", { locale: dfLoc })
                                : tf.f02644}
                            </Button>
                          )} />
                          <PopoverContent className="w-auto p-0 border-none shadow-xl" align="start">
                            <Calendar
                              mode="single"
                              selected={documentPeriodStart}
                              onSelect={setDocumentPeriodStart}
                              initialFocus
                              locale={dfLoc}
                            />
                          </PopoverContent>
                        </Popover>
                        <Popover>
                          <PopoverTrigger render={(props) => (
                            <Button {...props} variant="outline" className="w-full justify-start text-left font-bold border-slate-200 h-10 rounded-lg bg-white">
                              <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                              {documentPeriodEnd
                                ? format(documentPeriodEnd, "PPP", { locale: dfLoc })
                                : tf.f02644}
                            </Button>
                          )} />
                          <PopoverContent className="w-auto p-0 border-none shadow-xl" align="start">
                            <Calendar
                              mode="single"
                              selected={documentPeriodEnd}
                              onSelect={setDocumentPeriodEnd}
                              initialFocus
                              locale={dfLoc}
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      {documentPeriodLabel && (
                        <p className="text-[11px] text-slate-500 font-medium mt-3">{documentPeriodLabel}</p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-8 mb-10">
                     <div className="space-y-4">
                        <div className="space-y-1">
                           <span className="text-[10px] font-bold text-slate-400 uppercase">{tf.f02605}</span>
                           <div className="border-b border-slate-200 pb-2">
                              {recipientCompany && <p className="text-lg font-black mb-1">{recipientCompany}</p>}
                              <p className="text-base font-bold">
                                 <span className="text-slate-400 text-xs mr-2 font-medium">{tf.f02607}</span>
                                 {recipientName} <span className="text-xs font-medium text-slate-500">{tf.f02609}</span>
                              </p>
                           </div>
                        </div>
                        <p className="text-[10px] text-slate-500 font-bold leading-relaxed pt-2 border-t border-dashed border-slate-100 italic">
                            {type === 'statement'
                              ? tf.f00428
                              : type === 'receipt'
                                ? tf.f02637
                                : tf.f00429}
                        </p>
                     </div>

                     <div className="border border-slate-900 p-4 rounded-sm relative overflow-hidden flex flex-col justify-between">
                        <div className="absolute top-2 right-2 w-10 h-10 border-2 border-red-500/30 rounded-full flex items-center justify-center text-red-500/30 font-black text-[10px] rotate-12">{tf.f02610}</div>
                        <div className="space-y-1.5 relative z-10 w-full text-[10px]">
                           <span className="text-slate-400 font-bold block mb-1">{tf.f02611}</span>
                           <p className="text-xs font-black">{businessInfo.name}</p>
                           <p className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0 font-medium">{tf.f02612}</span> <span>{businessInfo.businessNumber}</span>
                           </p>
                           <p className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0 font-medium">{tf.f02613}</span> <span>{businessInfo.representative}</span>
                           </p>
                           <div className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0 font-medium">{tf.f02614}</span> 
                              <span className="leading-tight break-keep">{businessInfo.address}</span>
                           </div>
                           <div className="text-slate-600 flex gap-2">
                              <span className="text-slate-400 w-14 shrink-0 font-medium">{tf.f00444}</span> 
                              <span>{businessInfo.contact}</span>
                           </div>
                        </div>
                     </div>
                  </div>

                  <div className="flex-1">
                     <table className="w-full text-left">
                        <thead>
                           <tr className="bg-slate-900 text-white text-[9px] uppercase font-black tracking-widest">
                              <th className="p-2 pl-4 w-20">{tf.f01717}</th>
                              <th className="p-2">{tf.f02618}</th>
                              <th className="p-2 text-center w-12">{tf.f00377}</th>
                              <th className="p-2 text-right w-24">{tf.f00148}</th>
                              <th className="p-2 text-right w-32 pr-4">{tf.f00097}</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 border-b border-slate-200">
                           {previewLineItems.map((item) => {
                              const lineDate =
                                parseDocumentDateParam(item.date) ?? new Date(item.date);
                              return (
                              <tr key={item.lineKey} className="text-[11px] font-medium border-b border-slate-50">
                                 <td className="p-3 pl-4 text-slate-400 font-bold whitespace-nowrap">
                                   <Popover>
                                     <PopoverTrigger render={(props) => (
                                       <button
                                         {...props}
                                         type="button"
                                         className="hover:text-blue-600 transition-colors underline-offset-2 hover:underline text-left"
                                       >
                                         {formatCustomerDocumentDate(item.date, baseLocale)}
                                       </button>
                                     )} />
                                     <PopoverContent className="w-auto p-0 border-none shadow-xl" align="start">
                                       <Calendar
                                         mode="single"
                                         selected={lineDate}
                                         onSelect={(date) => handleLineItemDateChange(item.lineKey, date)}
                                         initialFocus
                                         locale={dfLoc}
                                       />
                                     </PopoverContent>
                                   </Popover>
                                 </td>
                                 <td className="p-3 font-bold">{item.name}</td>
                                 <td className="p-3 text-center">{item.quantity}</td>
                                 <td className="p-3 text-right">₩{item.price.toLocaleString()}</td>
                                 <td className="p-3 text-right pr-4 font-black">₩{item.amount.toLocaleString()}</td>
                              </tr>
                           )})}
                        </tbody>
                        <tfoot>
                           <tr className="bg-slate-100">
                              <td colSpan={2} className="p-4 pl-6 text-sm font-black uppercase tracking-widest text-slate-600 whitespace-nowrap">{tf.f02619}</td>
                              <td colSpan={3} className="p-4 pr-6 text-right text-2xl font-black text-slate-900 italic tracking-tighter">
                                 ₩{subtotal.toLocaleString()}
                              </td>
                           </tr>
                        </tfoot>
                     </table>
                  </div>

                   <div className="mt-auto pt-8 border-t border-dashed border-slate-200 h-10">
                      {/* Guidance text removed as requested */}
                   </div>
               </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-2 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-col text-left w-full sm:w-auto">
            <p className="text-[10px] font-bold text-amber-600">{tf.f02646}</p>
            <p className="text-[10px] text-slate-400">{tf.f02647}</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold text-slate-500">{tf.f00702}</Button>
            
            {viewMode === 'edit' ? (
              <Button 
                className={cn("px-10 font-black shadow-lg gap-2 h-11", themeColor, type === 'statement' ? 'shadow-blue-200' : 'shadow-emerald-200')}
                disabled={selectedOrderIds.length === 0}
                onClick={handleGoPreview}
              >
                {tf.f02648}
                <ChevronRight size={16} className="ml-1 opacity-50" />
              </Button>
            ) : (
              <>
                <Button 
                  variant="outline"
                  className="px-6 font-bold gap-2 border-slate-300 hover:bg-slate-100 h-11"
                  onClick={() => setViewMode('edit')}
                >
                  {tf.f02649}
                </Button>
                <Button 
                  className="px-10 font-black shadow-lg shadow-blue-200 gap-2 bg-slate-900 hover:bg-slate-800 h-11"
                  onClick={handlePrint}
                >
                  <Printer size={18} />
                  {tf.f00696}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
