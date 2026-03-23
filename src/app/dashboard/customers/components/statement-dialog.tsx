"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { 
  Calendar as CalendarIcon, 
  FileText, 
  Search, 
  Loader2,
  CheckCircle2,
  Printer
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
import { useRouter } from "next/navigation";

interface StatementDialogProps {
  customer: Customer | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'statement' | 'receipt';
}

export function StatementDialog({ customer, isOpen, onOpenChange, type }: StatementDialogProps) {
  const router = useRouter();
  const supabase = createClient();
  const [startDate, setStartDate] = useState<Date | undefined>(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  );
  const [endDate, setEndDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [recipientName, setRecipientName] = useState("");

  useEffect(() => {
    if (isOpen && customer) {
      setRecipientName(customer.company_name || customer.name);
      fetchOrders();
    }
  }, [isOpen, customer, startDate, endDate]);

  const fetchOrders = async () => {
    if (!customer || !startDate || !endDate) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('tenant_id', customer.tenant_id)
        .eq('orderer->>phone', customer.contact)
        .gte('order_date', startDate.toISOString())
        .lte('order_date', new Date(endDate.getTime() + 86400000).toISOString())
        .order('order_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
      // Default select all
      setSelectedOrderIds((data || []).map(o => o.id));
    } catch (err) {
      console.error('Error fetching orders for statement:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleOrder = (id: string) => {
    setSelectedOrderIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handlePrint = () => {
    if (selectedOrderIds.length === 0) return;
    
    const params = new URLSearchParams({
      ids: selectedOrderIds.join(','),
      recipient: recipientName,
      type: type
    });
    
    // Open in new window for printing
    window.open(`/dashboard/customers/print?${params.toString()}`, '_blank');
    onOpenChange(false);
  };

  if (!customer) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            {type === 'statement' ? <FileText className="text-blue-600" /> : <Printer className="text-emerald-600" />}
            {type === 'statement' ? '거래명세서 발행' : '간이영수증 발행'}
          </DialogTitle>
          <DialogDescription>
            {customer.name} 고객님의 거래 내역을 선택하여 {type === 'statement' ? '명세서' : '영수증'}를 생성합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-semibold">조회 기간 (시작)</Label>
              <Popover>
                <PopoverTrigger>
                  <Button variant="outline" className="w-full justify-start text-left font-normal border-slate-200">
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                    {startDate ? format(startDate, "yyyy-MM-dd") : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none shadow-xl" align="start">
                  <Calendar mode="single" selected={startDate} onSelect={setStartDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-semibold">조회 기간 (종료)</Label>
              <Popover>
                <PopoverTrigger>
                  <Button variant="outline" className="w-full justify-start text-left font-normal border-slate-200">
                    <CalendarIcon className="mr-2 h-4 w-4 text-slate-400" />
                    {endDate ? format(endDate, "yyyy-MM-dd") : "날짜 선택"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 border-none shadow-xl" align="start">
                  <Calendar mode="single" selected={endDate} onSelect={setEndDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">수신인 명칭</Label>
            <Input 
              value={recipientName} 
              onChange={e => setRecipientName(e.target.value)} 
              placeholder="명세서에 표시될 이름이나 업체명"
              className="border-slate-200"
            />
          </div>

          <div className="flex-1 flex flex-col min-h-0 border rounded-xl bg-slate-50 overflow-hidden">
            <div className="p-3 bg-white border-b flex justify-between items-center bg-slate-50/50">
              <span className="text-xs font-bold text-slate-500">거래 내역 선택 ({selectedOrderIds.length}건)</span>
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 text-[10px] font-bold"
                onClick={() => setSelectedOrderIds(selectedOrderIds.length === orders.length ? [] : orders.map(o => o.id))}
              >
                {selectedOrderIds.length === orders.length ? '전체 해제' : '전체 선택'}
              </Button>
            </div>
            <ScrollArea className="flex-1 bg-white">
              {loading ? (
                <div className="h-40 flex items-center justify-center text-slate-400">
                  <Loader2 className="animate-spin mr-2" /> 로딩 중...
                </div>
              ) : orders.length > 0 ? (
                <div className="divide-y">
                  {orders.map(order => (
                    <div 
                      key={order.id} 
                      className={cn(
                        "p-4 flex items-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors",
                        selectedOrderIds.includes(order.id) ? "bg-blue-50/30" : ""
                      )}
                      onClick={() => handleToggleOrder(order.id)}
                    >
                      <Checkbox checked={selectedOrderIds.includes(order.id)} />
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <span className="text-sm font-bold text-slate-900">{format(new Date(order.order_date), 'MM/dd')}</span>
                          <span className="text-sm font-black text-slate-900">₩{(order.summary?.total || 0).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-500 truncate mt-1">
                          {order.items?.map((i: any) => i.name).join(', ')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 flex items-center justify-center text-slate-400 text-sm italic">
                  해당 기간의 거래 내역이 없습니다.
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-6 pt-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="font-bold">취소</Button>
          <Button 
            className={cn(
               "px-10 font-black shadow-lg shadow-blue-200 gap-2",
               type === 'statement' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'
            )}
            disabled={selectedOrderIds.length === 0}
            onClick={handlePrint}
          >
            <Printer size={18} />
            {type === 'statement' ? '거래명세서 출력' : '간이영수증 출력'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
