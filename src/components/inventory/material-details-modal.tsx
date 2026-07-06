"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Material } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Package, Tag, Hash, Box, Ruler, DollarSign, Palette, Building2, AlignLeft, ArrowUpRight, ArrowDownRight, ArrowRightLeft } from "lucide-react";
import { getMessages } from "@/i18n/getMessages";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { Barcode } from "@/components/barcode";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/utils/supabase/client";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

interface MaterialDetailsModalProps {
  material: Material | null;
  isOpen: boolean;
  onClose: () => void;
  getSupplierName: (material: Material) => string;
}

export function MaterialDetailsModal({ material, isOpen, onClose, getSupplierName }: MaterialDetailsModalProps) {
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const [logs, setLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (isOpen && material) {
      const fetchLogs = async () => {
        setLoadingLogs(true);
        const supabase = createClient();
        const { data } = await supabase
          .from("material_logs")
          .select("*")
          .eq("material_id", material.id)
          .order("created_at", { ascending: false })
          .limit(10);
        
        if (data) setLogs(data);
        setLoadingLogs(false);
      };
      fetchLogs();
    }
  }, [isOpen, material]);

  if (!material) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white border-none shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-slate-50 px-6 py-6 border-b border-slate-100 flex flex-col items-center justify-center relative shrink-0">
          <div className="absolute top-4 right-4">
            <Badge variant="outline" className="bg-white border-primary/20 text-primary px-3 py-1 text-xs font-bold shadow-sm">
              {material.main_category}
            </Badge>
          </div>
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mb-4">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-2xl font-bold text-slate-800 text-center mb-1">
            {material.name}
          </DialogTitle>
          <DialogDescription className="text-slate-500 flex items-center gap-2 text-sm">
            <span>{material.mid_category || tf.f01487}</span>
            {material.color && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="flex items-center gap-1.5">
                  <span 
                    className="w-3 h-3 inline-block rounded-full border border-slate-200"
                    style={{ backgroundColor: material.color }}
                  />
                  <span>{material.color}</span>
                </span>
              </>
            )}
          </DialogDescription>
        </div>

        <Tabs defaultValue="info" className="flex-1 flex flex-col overflow-hidden">
          <div className="px-6 pt-4 shrink-0">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="info">기본 정보</TabsTrigger>
              <TabsTrigger value="history">입출고 이력</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <TabsContent value="info" className="mt-0 outline-none">
              <div className="flex justify-center mb-8">
                <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm inline-flex justify-center">
                  <Barcode 
                    value={material.id}
                    options={{
                      format: "CODE128",
                      width: 2,
                      height: 80,
                      displayValue: true,
                      fontSize: 16,
                      margin: 10,
                      background: "transparent",
                      lineColor: "#0f172a",
                    }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                <DetailItem icon={<Hash />} label={tf.f00197} value={material.unit} />
                <DetailItem icon={<Box />} label={tf.f02374} value={`${material.stock.toLocaleString()} ${material.unit}`} highlight={material.stock <= 10} />
                <DetailItem icon={<DollarSign />} label={tf.f00021} value={`${material.price.toLocaleString()} ₩`} />
                <DetailItem icon={<Ruler />} label={tf.f02375} value={material.spec || '-'} />
                <DetailItem icon={<Building2 />} label={tf.f00087} value={getSupplierName(material)} />
                <DetailItem icon={<Palette />} label={tf.f00538} value={material.color || '-'} />
              </div>

              {material.memo && (
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-start gap-2.5">
                    <AlignLeft className="w-4 h-4 text-slate-400 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-500 mb-1">{tf.f00950}</p>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{material.memo}</p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-0 outline-none space-y-4">
              {loadingLogs ? (
                <div className="text-center py-8 text-slate-500 text-sm">기록을 불러오는 중입니다...</div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-sm">최근 입출고 기록이 없습니다.</div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {log.type === "IN" ? <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 py-0 text-[10px]">입고</Badge> : 
                           log.type === "OUT" ? <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 py-0 text-[10px]">출고</Badge> : 
                           <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 py-0 text-[10px]">조정</Badge>}
                          <span className="text-xs text-slate-500">{format(new Date(log.created_at), "MM.dd HH:mm", { locale: ko })}</span>
                        </div>
                        <p className="text-sm text-slate-600">{log.memo || (log.worker ? `${log.worker} 작업` : "시스템")}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-bold ${log.type === "IN" ? "text-emerald-600" : log.type === "OUT" ? "text-red-600" : "text-slate-600"}`}>
                          {log.change_amount > 0 ? `+${log.change_amount}` : log.change_amount}
                        </p>
                        <p className="text-xs text-slate-400">잔여: {log.after_stock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

function DetailItem({ icon, label, value, highlight = false }: { icon: React.ReactNode, label: string, value: string, highlight?: boolean }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
        <div className="w-4 h-4">{icon}</div>
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-0.5">{label}</p>
        <p className={`text-sm font-medium ${highlight ? 'text-orange-600' : 'text-slate-800'}`}>{value}</p>
      </div>
    </div>
  );
}
