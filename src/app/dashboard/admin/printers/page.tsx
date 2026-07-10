"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  Printer,
  Plus,
  Edit2,
  Trash2,
  Boxes,
  Activity,
  History,
  Store,
  Users,
  ChevronRight,
  X,
} from "lucide-react";
import { PrinterDevicesPanel } from "@/components/admin/PrinterDevicesPanel";

type InventoryItem = {
  id: string;
  device_type: "pos" | "label";
  model_name: string;
  total_stock: number;
  leased_count: number;
  available_count: number;
  created_at: string;
};

type ASLogItem = {
  tenant_id: string;
  tenant_name: string;
  device_type: "pos" | "label";
  model: string;
  date: string;
  memo: string;
};

type LeaseTenant = {
  tenant_id: string;
  tenant_name: string;
  device_type: "pos" | "label";
  model_name: string;
};

export default function PrintersAdminPage() {
  const { isSuperAdmin, isLoading: authLoading } = useAuth();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<ASLogItem[]>([]);
  const [currentLeases, setCurrentLeases] = useState<LeaseTenant[]>([]);
  const [loading, setLoading] = useState(true);

  const [rightTab, setRightTab] = useState<"leases" | "history">("leases");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deviceType, setDeviceType] = useState<"pos" | "label">("pos");
  const [modelName, setModelName] = useState("");
  const [totalStock, setTotalStock] = useState<number>(0);
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/printers");
      if (!res.ok) throw new Error("장비 목록 로드 실패");
      const data = await res.json();
      setInventory(data.inventory || []);
      setHistory(data.history || []);
      setCurrentLeases(data.currentLeases || []);
    } catch (err: any) {
      toast.error(err.message || "데이터를 불러오는 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isSuperAdmin) {
      loadData();
    } else if (!authLoading && !isSuperAdmin) {
      setLoading(false);
    }
  }, [authLoading, isSuperAdmin, loadData]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setDeviceType("pos");
    setModelName("");
    setTotalStock(0);
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setDeviceType(item.device_type);
    setModelName(item.model_name);
    setTotalStock(item.total_stock);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!modelName.trim() || totalStock < 0) {
      toast.error("올바른 기종명과 보유 수량을 입력하세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/printers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingItem?.id || undefined,
          device_type: deviceType,
          model_name: modelName,
          total_stock: totalStock,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "저장 실패");
      }

      toast.success("✅ 장비 정보가 정상적으로 저장되었습니다.");
      setDialogOpen(false);
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const item = inventory.find((i) => i.id === id);
    if (item && item.leased_count > 0) {
      toast.error("❌ 현재 대여/임대 중인 기종은 삭제할 수 없습니다. 임대 회수 후 삭제하세요.");
      return;
    }
    if (!confirm("정말 이 기종 자산 정보를 삭제하시겠습니까?")) return;

    try {
      const res = await fetch("/api/admin/printers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) throw new Error("삭제 실패");
      toast.success("✅ 정상적으로 삭제되었습니다.");
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (authLoading || (loading && inventory.length === 0)) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  const totalPosStock = inventory.filter(i => i.device_type === "pos").reduce((acc, c) => acc + c.total_stock, 0);
  const totalPosLeased = inventory.filter(i => i.device_type === "pos").reduce((acc, c) => acc + c.leased_count, 0);
  const totalLabelStock = inventory.filter(i => i.device_type === "label").reduce((acc, c) => acc + c.total_stock, 0);
  const totalLabelLeased = inventory.filter(i => i.device_type === "label").reduce((acc, c) => acc + c.leased_count, 0);

  return (
    <div className="p-6 space-y-6 max-w-none">
      <div className="flex items-center justify-between pb-2">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Printer className="w-6 h-6 text-blue-600" />
            본사 임대 장비 및 자산 관리
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            본사에서 보유 중인 포스/라벨 프린터 기종별 총보유량과 현재 매장에 나가있는 실물 임대량을 한눈에 집계하고 AS 이력을 관리합니다.
          </p>
        </div>
      </div>

      <Tabs defaultValue="devices" className="space-y-6">
        <TabsList className="bg-slate-100/50 p-1">
          <TabsTrigger value="devices" className="text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">개별 기기(시리얼) 관리</TabsTrigger>
          <TabsTrigger value="summary" className="text-sm font-bold data-[state=active]:bg-white data-[state=active]:text-blue-700 data-[state=active]:shadow-sm">기종별 재고 요약</TabsTrigger>
        </TabsList>

        <TabsContent value="devices" className="mt-0 outline-none">
          <PrinterDevicesPanel />
        </TabsContent>

        <TabsContent value="summary" className="space-y-6 mt-0 outline-none">
          <div className="flex justify-end mb-4">
            <Button onClick={handleOpenCreate} className="bg-blue-600 hover:bg-blue-700 text-white gap-1 text-xs px-3 h-9 rounded-xl font-bold border-0">
              <Plus className="w-4 h-4" />
              신규 기종 추가
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-slate-50/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Boxes className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-slate-500 font-bold">포스 프린터 본사 재고</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-slate-900">{totalPosStock - totalPosLeased}대</p>
                  <span className="text-[10px] text-slate-400">총 {totalPosStock}대 보유</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-slate-50/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs text-slate-500 font-bold">포스 프린터 임대중</span>
                </div>
                <p className="text-2xl font-black text-emerald-600">{totalPosLeased}대</p>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-slate-50/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Boxes className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-slate-500 font-bold">라벨 프린터 본사 재고</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-black text-slate-900">{totalLabelStock - totalLabelLeased}대</p>
                  <span className="text-[10px] text-slate-400">총 {totalLabelStock}대 보유</span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-slate-50/50">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Activity className="w-4 h-4 text-purple-500" />
                  <span className="text-xs text-slate-500 font-bold">라벨 프린터 임대중</span>
                </div>
                <p className="text-2xl font-black text-purple-600">{totalLabelLeased}대</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 border-0 shadow-sm ring-1 ring-slate-100">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-1.5 text-slate-800">
                  <Boxes className="w-4 h-4 text-blue-600" />
                  보유 프린터 자산 기종 리스트
                </CardTitle>
                <CardDescription className="text-[11px]">본사에 등록되어 매장에 무상 임대 중이거나 보관 중인 실물 자산 대수 현황입니다.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50 hover:bg-slate-50">
                        <TableHead className="text-xs font-bold text-slate-700 py-3.5">구분</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 py-3.5">기종명</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 py-3.5 text-right">총 보유대수</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 py-3.5 text-right">임대중</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 py-3.5 text-right">본사 재고</TableHead>
                        <TableHead className="text-xs font-bold text-slate-700 py-3.5 text-center w-24">관리</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {inventory.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12 text-slate-400 text-xs">
                            보유 자산 기종 정보가 등록되어 있지 않습니다.
                          </TableCell>
                        </TableRow>
                      ) : (
                        inventory.map((item) => (
                          <TableRow key={item.id} className="hover:bg-slate-50/50">
                            <TableCell className="py-3">
                              {item.device_type === "pos" ? (
                                <Badge className="bg-emerald-100 text-emerald-800 text-[10px] hover:bg-emerald-100 font-bold px-1.5 py-0.5 rounded-md">
                                  📠 POS
                                </Badge>
                              ) : (
                                <Badge className="bg-purple-100 text-purple-800 text-[10px] hover:bg-purple-100 font-bold px-1.5 py-0.5 rounded-md">
                                  🏷️ LABEL
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="font-semibold text-xs text-slate-900">{item.model_name}</TableCell>
                            <TableCell className="text-xs text-slate-600 text-right font-bold font-mono">{item.total_stock}대</TableCell>
                            <TableCell className="text-xs text-right">
                              <button
                                onClick={() => {
                                  setSelectedModel(selectedModel === item.model_name ? null : item.model_name);
                                  setRightTab("leases");
                                }}
                                className={cn(
                                  "font-bold font-mono px-2 py-0.5 rounded-md text-xs transition-colors",
                                  item.leased_count > 0
                                    ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 cursor-pointer"
                                    : "text-slate-400 cursor-default"
                                )}
                              >
                                {item.leased_count}대
                                {item.leased_count > 0 && <ChevronRight className="inline w-3 h-3 ml-0.5" />}
                              </button>
                            </TableCell>
                            <TableCell className="text-xs text-slate-900 text-right font-bold font-mono bg-slate-50/40">
                              <span className={item.available_count === 0 ? "text-rose-600 font-black" : "text-slate-800"}>
                                {item.available_count}대
                              </span>
                            </TableCell>
                            <TableCell className="py-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 rounded-lg hover:bg-slate-100 border-0"
                                  onClick={() => handleOpenEdit(item)}
                                >
                                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 rounded-lg hover:bg-rose-50 border-0"
                                  onClick={() => handleDelete(item.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm ring-1 ring-slate-100 bg-white">
              <div className="flex border-b border-slate-100 px-4 pt-4">
                <button
                  onClick={() => setRightTab("leases")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 pb-3 text-xs font-bold border-b-2 transition-colors",
                    rightTab === "leases"
                      ? "border-blue-600 text-blue-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Users className="w-3.5 h-3.5" />
                  임대 현황
                  <span className={cn(
                    "ml-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black",
                    rightTab === "leases" ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                  )}>
                    {selectedModel
                      ? currentLeases.filter(l => l.model_name === selectedModel).length
                      : currentLeases.length}
                  </span>
                </button>
                <button
                  onClick={() => setRightTab("history")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 pb-3 text-xs font-bold border-b-2 transition-colors",
                    rightTab === "history"
                      ? "border-slate-600 text-slate-700"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  )}
                >
                  <History className="w-3.5 h-3.5" />
                  AS 이력
                </button>
              </div>

              <CardContent className="px-4 pb-4 pt-3">
                {selectedModel && (
                  <div className="flex items-center gap-1.5 mb-3 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <span className="text-[11px] font-bold text-blue-700">🔍 {selectedModel} 필터 중</span>
                    <button
                      onClick={() => setSelectedModel(null)}
                      className="ml-auto text-blue-400 hover:text-blue-600"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {rightTab === "leases" && (
                  <div className="max-h-[480px] overflow-y-auto space-y-2 pr-1">
                    {(() => {
                      const filtered = selectedModel
                        ? currentLeases.filter(l => l.model_name === selectedModel)
                        : currentLeases;
                      if (filtered.length === 0) {
                        return (
                          <div className="text-center py-12 text-slate-400 text-xs">
                            {selectedModel ? `${selectedModel}을 임대중인 회원사가 없습니다.` : "현재 임대중인 회원사가 없습니다."}
                          </div>
                        );
                      }
                      return filtered.map((l, i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100/70 transition-colors">
                          <div className={cn(
                            "w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-black shrink-0",
                            l.device_type === "pos" ? "bg-emerald-100 text-emerald-700" : "bg-purple-100 text-purple-700"
                          )}>
                            {l.device_type === "pos" ? "📠" : "🏷️"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-slate-800 truncate">{l.tenant_name}</p>
                            <p className="text-[10px] text-slate-500">{l.model_name}</p>
                          </div>
                          <Badge className={cn(
                            "text-[9px] font-bold px-1.5 py-0.5 rounded-md shrink-0",
                            l.device_type === "pos"
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "bg-purple-100 text-purple-700 hover:bg-purple-100"
                          )}>
                            {l.device_type === "pos" ? "POS" : "LABEL"}
                          </Badge>
                        </div>
                      ));
                    })()}
                  </div>
                )}

                {rightTab === "history" && (
                  <div className="max-h-[480px] overflow-y-auto space-y-4 pr-1">
                    {history.length === 0 ? (
                      <div className="text-center py-12 text-slate-400 text-xs">
                        누적된 AS 교환 출고 내역이 없습니다.
                      </div>
                    ) : (
                      history.map((h, i) => (
                        <div key={i} className="relative pl-5 border-l-2 border-slate-100 pb-2 last:pb-0">
                          <div className={cn(
                            "absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white",
                            h.device_type === "pos" ? "bg-emerald-500" : "bg-purple-500"
                          )} />
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-0.5">
                              <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                                <Store className="w-3 h-3 text-slate-400" />
                                {h.tenant_name}
                              </span>
                              <p className="text-[10px] text-slate-500 leading-normal">
                                {h.device_type === "pos" ? "📠 포스" : "🏷️ 라벨"} · <span className="font-semibold text-slate-700">{h.model}</span>
                              </p>
                              {h.memo && (
                                <p className="text-[10px] text-slate-400 mt-1 bg-slate-50 p-1.5 rounded-md border border-slate-100">
                                  {h.memo}
                                </p>
                              )}
                            </div>
                            <span className="text-[9px] font-mono text-slate-400 shrink-0 mt-0.5">{h.date}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-0 shadow-2xl bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-black text-slate-900">
              {editingItem ? "기종 자산 정보 수정" : "신규 기종 등록"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-slate-500 font-bold">장비 구분</Label>
              <Select
                value={deviceType}
                onValueChange={(v) => setDeviceType(v as "pos" | "label")}
                disabled={!!editingItem}
              >
                <SelectTrigger className="h-10 text-xs rounded-xl bg-white">
                  <SelectValue placeholder="선택">
                    {deviceType === "pos" ? "📠 포스 프린터" : "🏷️ 라벨 프린터"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pos">📠 포스 프린터 (POS)</SelectItem>
                  <SelectItem value="label">🏷️ 라벨/리본 프린터 (LABEL)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-500 font-bold">기종명</Label>
              <Input
                className="h-10 rounded-xl text-xs bg-white"
                placeholder="예: PP-8000 또는 SEWOO-LK-B30"
                value={modelName}
                onChange={(e) => setModelName(e.target.value)}
                disabled={!!editingItem}
              />
              {editingItem && (
                <p className="text-[10px] text-slate-400">기존에 회원사에 임대 기록이 매핑된 기종명은 수정/변경이 불가능합니다.</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-500 font-bold">본사 보유 총 대수 (장비 수량)</Label>
              <Input
                type="number"
                className="h-10 rounded-xl text-xs bg-white font-mono"
                placeholder="보유 기기 댓수 입력"
                value={totalStock}
                onChange={(e) => setTotalStock(Number(e.target.value))}
              />
              <p className="text-[10px] text-slate-400">본사 물류창고에 보유 중인 장비 총수입니다.</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="ghost" className="rounded-xl h-10 px-5 text-xs text-slate-500 border-0" onClick={() => setDialogOpen(false)}>취소</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 px-6 text-xs font-bold border-0"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
              저장하기
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
