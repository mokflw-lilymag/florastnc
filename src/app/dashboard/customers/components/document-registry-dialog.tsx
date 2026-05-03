"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  FileText, 
  Receipt as ReceiptIcon, 
  Search, 
  Trash2, 
  Download, 
  Clock, 
  AlertTriangle,
  Calendar,
  ExternalLink,
  Archive
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { format, addDays, isAfter } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { printDocument } from "@/lib/print-document";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";

interface DocumentLog {
  id: string;
  type: string;
  recipient_info: any;
  items: any[];
  total_amount: number;
  use_vat: boolean;
  created_at: string;
}

interface DocumentRegistryDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  tenantId: string | null;
}

export function DocumentRegistryDialog({ isOpen, onOpenChange, tenantId }: DocumentRegistryDialogProps) {
  const supabase = createClient();
  const [logs, setLogs] = useState<DocumentLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale));
  const fetchLogs = async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('document_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (err) {
      console.error("Error fetching document logs:", err);
      toast.error(tf.f00354);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchLogs();
    }
  }, [isOpen, tenantId]);

  const filteredLogs = logs.filter(log => {
    const name = log.recipient_info?.name || "";
    const company = log.recipient_info?.company || "";
    return name.includes(searchTerm) || company.includes(searchTerm);
  });

  const handlePrint = (log: DocumentLog) => {
    const itemsJson = JSON.stringify(log.items);
    const params = new URLSearchParams({
      recipient: log.recipient_info?.name || "",
      company: log.recipient_info?.company || "",
      contact: log.recipient_info?.contact || "",
      email: log.recipient_info?.email || "",
      type: log.type,
      use_vat: (log.use_vat || false).toString(),
      manual_items: btoa(encodeURIComponent(itemsJson))
    });
    
    toast.promise(printDocument(`/dashboard/customers/print?${params.toString()}`), {
      loading: tf.f00353,
      success: tf.f00352,
      error: tf.f00518
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm(tf.f00564)) return;
    try {
      const { error } = await supabase.from('document_logs').delete().eq('id', id);
      if (error) throw error;
      setLogs(logs.filter(l => l.id !== id));
      toast.success(tf.f00351);
    } catch (err) {
      toast.error(tf.f00308);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl">
        <DialogHeader className="p-8 bg-slate-900 text-white shrink-0">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <DialogTitle className="text-2xl font-black flex items-center gap-3">
                <Archive className="text-amber-400" size={28} />
                {tf.f00171}
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-medium">
                {tf.f00468}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-4 bg-white/10 px-6 py-3 rounded-2xl border border-white/10">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{tf.f00280}</p>
                <p className="text-sm font-black text-amber-400">{tf.f00238}</p>
              </div>
              <Clock className="text-amber-400/50" size={20} />
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 bg-slate-50 flex-1 flex flex-col gap-6 overflow-hidden">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <Input 
              placeholder={tf.f00393} 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-14 bg-white border-none shadow-sm rounded-2xl font-bold text-slate-700 placeholder:text-slate-300 focus-visible:ring-2 focus-visible:ring-slate-900 transition-all"
            />
          </div>

          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="grid grid-cols-[100px_120px_1fr_120px_140px_140px_120px] gap-4 p-4 bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-slate-200">
              <div className="pl-4">{tf.f02628}</div>
              <div>{tf.f02629}</div>
              <div>{tf.f02630}</div>
              <div className="text-right">{tf.f02631}</div>
              <div className="text-center">{tf.f02632}</div>
              <div className="text-center">{tf.f02633}</div>
              <div className="text-center">{tf.f02634}</div>
            </div>

            <ScrollArea className="flex-1">
              <div className="divide-y divide-slate-100">
                {loading ? (
                  <div className="p-20 text-center space-y-4">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-slate-900"></div>
                    <p className="text-sm font-black text-slate-400">{tf.f00157}</p>
                  </div>
                ) : filteredLogs.length === 0 ? (
                  <div className="p-20 text-center space-y-2">
                    <Archive size={48} className="mx-auto text-slate-200 mb-4" />
                    <p className="text-base font-black text-slate-900">{tf.f00542}</p>
                    <p className="text-sm text-slate-400">{tf.f00239}</p>
                  </div>
                ) : (
                  filteredLogs.map((log) => {
                    const createdAt = new Date(log.created_at);
                    const expiryDate = addDays(createdAt, 30);
                    const isExpiredSoon = !isAfter(expiryDate, addDays(new Date(), 3));

                    return (
                      <div key={log.id} className="grid grid-cols-[100px_120px_1fr_120px_140px_140px_120px] gap-4 p-4 items-center hover:bg-slate-50 transition-colors group">
                        <div className="pl-2">
                          <Badge className={
                            log.type === 'estimate' ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border-none font-black" :
                            log.type === 'receipt' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-none font-black" :
                            "bg-amber-100 text-amber-700 hover:bg-amber-200 border-none font-black"
                          }>
                            {log.type === 'estimate' ? tf.f00041 : log.type === 'receipt' ? tf.f00448 : tf.f00212}
                          </Badge>
                        </div>
                        <div className="font-black text-slate-900">
                          {log.recipient_info?.company || log.recipient_info?.name}
                        </div>
                        <div className="text-xs text-slate-500 font-medium truncate">
                          {log.items?.map((i: any) => i.name).join(', ')}
                        </div>
                        <div className="text-right font-black text-slate-900">
                          ₩{(log.total_amount || 0).toLocaleString()}
                        </div>
                        <div className="text-center text-[11px] font-bold text-slate-400 flex flex-col items-center">
                          <Calendar size={12} className="mb-1" />
                          {format(createdAt, "Pp", { locale: dfLoc })}
                        </div>
                        <div className={`text-center text-[11px] font-black flex flex-col items-center py-1.5 px-2 rounded-xl transition-colors ${
                          isExpiredSoon ? 'bg-red-50 text-red-600' : 'text-slate-500'
                        }`}>
                          <Clock size={12} className="mb-1" />
                          {format(expiryDate, "P", { locale: dfLoc })}
                          {isExpiredSoon && <span className="text-[8px] mt-0.5 animate-pulse">{tf.f00727}</span>}
                        </div>
                        <div className="flex items-center justify-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-slate-400 hover:text-slate-900 hover:bg-slate-200 rounded-xl"
                            onClick={() => handlePrint(log)}
                            title={tf.f02635}
                          >
                            <ExternalLink size={18} />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl"
                            onClick={() => handleDelete(log.id)}
                            title={tf.f02636}
                          >
                            <Trash2 size={18} />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="p-6 bg-slate-900 border-t border-white/5 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4 text-slate-400 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div> {tf.f00041}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div> {tf.f00212}
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500"></div> {tf.f00448}
            </div>
          </div>
          <Button 
            className="bg-white text-slate-900 hover:bg-slate-100 font-black px-8 h-12 rounded-2xl shadow-xl transition-all"
            onClick={() => onOpenChange(false)}
          >
            {tf.f00776}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
