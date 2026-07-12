"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2, Barcode, Search, Edit2, Trash2, History,
  FileSpreadsheet, X, Package, Truck, Wrench, Archive,
  ChevronRight, CalendarDays, Building2, CheckSquare2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
import { DeviceBarcodePrintDialog } from "./DeviceBarcodePrintDialog";

type PrinterDevice = {
  id: string;
  device_type: "pos" | "label";
  model_name: string;
  serial_number: string;
  status: "in_stock" | "leased" | "repair" | "disposed";
  current_tenant_id: string | null;
  tenants?: {
    name: string;
    status?: string;
    subscription_end?: string | null;
  } | null;
  leased_at: string | null;
  memo: string | null;
  created_at: string;
};

type DeviceLog = {
  id: string;
  device_id: string;
  event_type: "registered" | "leased" | "returned" | "repair_in" | "repair_out" | "disposed";
  tenant_id?: string | null;
  tenant_name?: string | null;
  memo?: string | null;
  created_at: string;
};

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  in_stock:  { label: "재고(보관중)", color: "bg-blue-100 text-blue-700",    icon: <Package className="w-3 h-3" /> },
  leased:    { label: "임대중",       color: "bg-emerald-100 text-emerald-700", icon: <Truck className="w-3 h-3" /> },
  repair:    { label: "A/S 진행중",   color: "bg-amber-100 text-amber-700",  icon: <Wrench className="w-3 h-3" /> },
  disposed:  { label: "폐기",         color: "bg-slate-100 text-slate-700",  icon: <Archive className="w-3 h-3" /> },
};

const eventLabels: Record<string, { label: string; color: string }> = {
  registered: { label: "입고 등록",   color: "bg-blue-100 text-blue-700" },
  leased:     { label: "출고(임대)",   color: "bg-emerald-100 text-emerald-700" },
  returned:   { label: "반납(입고)",   color: "bg-slate-100 text-slate-700" },
  repair_in:  { label: "A/S 입고",    color: "bg-amber-100 text-amber-700" },
  repair_out: { label: "A/S 출고",    color: "bg-orange-100 text-orange-700" },
  disposed:   { label: "폐기 처리",   color: "bg-red-100 text-red-700" },
};

const ALL_STATUSES = ["all", "in_stock", "leased", "repair", "disposed"] as const;

export function PrinterDevicesPanel() {
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [modelFilter, setModelFilter] = useState<string>("all");

  // 상세 패널
  const [detailDevice, setDetailDevice] = useState<PrinterDevice | null>(null);
  const [deviceLogs, setDeviceLogs] = useState<DeviceLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // 체크박스 선택
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPrintOpen, setIsPrintOpen] = useState(false);

  // 모달 상태
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<PrinterDevice | null>(null);

  // 폼 상태
  const [submitting, setSubmitting] = useState(false);
  const [formDeviceType, setFormDeviceType] = useState<"pos" | "label">("pos");
  const [formModel, setFormModel] = useState("");
  const [formModelOpen, setFormModelOpen] = useState(false);
  const [formSerial, setFormSerial] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const [formStatus, setFormStatus] = useState<string>("in_stock");
  const modelInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);

  // 기존 기종 목록
  const existingModels = Array.from(
    new Set(devices.filter(d => d.device_type === formDeviceType).map(d => d.model_name.trim()))
  ).sort();

  const modelSuggestions = formModel.trim().length >= 1
    ? existingModels.filter(m => m.toLowerCase().includes(formModel.trim().toLowerCase()))
    : existingModels;

  // 필터용 기종 목록 (전체 기기)
  const allModels = Array.from(new Set(devices.map(d => d.model_name.trim()))).sort();

  const loadDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/printers/devices");
      if (!res.ok) throw new Error("기기 목록 로드 실패");
      const data = await res.json();
      setDevices(data.devices || []);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDeviceLogs = async (deviceId: string) => {
    setLogsLoading(true);
    setDeviceLogs([]);
    try {
      const res = await fetch(`/api/admin/printers/devices/logs?device_id=${deviceId}`);
      if (res.ok) {
        const data = await res.json();
        setDeviceLogs(data.logs || []);
      }
    } catch {
      // 로그 API 없으면 조용히 무시
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => { loadDevices(); }, []);

  const handleRowClick = (d: PrinterDevice) => {
    setDetailDevice(d);
    loadDeviceLogs(d.id);
  };

  const handleAdd = async () => {
    const trimmedModel = formModel.trim();
    const trimmedSerial = formSerial.trim();
    if (!trimmedModel || !trimmedSerial) {
      toast.error("기종명과 시리얼 번호를 입력해주세요.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/printers/devices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_type: formDeviceType,
          model_name: trimmedModel,
          serial_number: trimmedSerial,
          memo: formMemo,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "등록 실패");
      }
      toast.success("기기가 성공적으로 등록되었습니다.");
      setIsAddOpen(false);
      setFormSerial("");
      loadDevices();
      setTimeout(() => scannerInputRef.current?.focus(), 100);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedDevice) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/printers/devices", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: selectedDevice.id, status: formStatus, memo: formMemo }),
      });
      if (!res.ok) throw new Error("수정 실패");
      toast.success("기기 정보가 수정되었습니다.");
      setIsEditOpen(false);
      loadDevices();
      // 상세 패널도 갱신
      if (detailDevice?.id === selectedDevice.id) {
        setDetailDevice(prev => prev ? { ...prev, status: formStatus as any, memo: formMemo } : null);
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 기기를 삭제하시겠습니까?")) return;
    try {
      const res = await fetch("/api/admin/printers/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("삭제 실패");
      toast.success("기기가 삭제되었습니다.");
      if (detailDevice?.id === id) setDetailDevice(null);
      loadDevices();
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);
        const items = data.map((row: any) => ({
          device_type: row["구분"] === "라벨" || row["device_type"] === "label" ? "label" : "pos",
          model_name: row["기종명"] || row["model_name"],
          serial_number: String(row["시리얼번호"] || row["serial_number"]),
          memo: row["메모"] || row["memo"] || "",
        })).filter((i: any) => i.model_name && i.serial_number);
        if (items.length === 0) { toast.error("유효한 데이터가 없습니다."); return; }
        const res = await fetch("/api/admin/printers/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || "일괄 등록 실패"); }
        toast.success(`총 ${items.length}대의 기기가 일괄 등록되었습니다.`);
        loadDevices();
      } catch (err: any) {
        toast.error("엑셀 처리 중 오류: " + err.message);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && formSerial.trim()) { e.preventDefault(); handleAdd(); }
  };

  // 필터 + 정렬 (등록일 내림차순)
  const filteredDevices = devices
    .filter(d => {
      const q = searchQuery.toLowerCase();
      const matchSearch = !q ||
        d.serial_number.toLowerCase().includes(q) ||
        d.model_name.toLowerCase().includes(q) ||
        (d.tenants?.name || "").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || d.status === statusFilter;
      const matchModel = modelFilter === "all" || d.model_name === modelFilter;
      return matchSearch && matchStatus && matchModel;
    })
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredDevices.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredDevices.map(d => d.id)));
  };
  const selectedDevices = filteredDevices.filter(d => selectedIds.has(d.id));

  const fmtDate = (v: string | null) =>
    v ? format(new Date(v), "yyyy.MM.dd", { locale: ko }) : "-";
  const fmtDateTime = (v: string | null) =>
    v ? format(new Date(v), "yyyy.MM.dd HH:mm", { locale: ko }) : "-";

  return (
    <div className="space-y-4">
      {/* 숨김 파일 인풋 */}
      <input type="file" accept=".xlsx,.xls,.csv" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

      {/* 상단 툴바 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto relative">
          <Search className="w-4 h-4 absolute left-3 text-slate-400" />
          <Input
            placeholder="시리얼·기종·회원사 검색..."
            className="pl-9 w-full sm:w-72 h-9 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {/* 바코드 출력 */}
          <Button
            variant="outline" size="sm"
            className={cn("h-9 gap-1.5 text-xs font-bold transition-all",
              selectedIds.size > 0
                ? "border-blue-500 text-blue-700 bg-blue-50 hover:bg-blue-100"
                : "text-slate-500"
            )}
            onClick={() => {
              if (selectedIds.size === 0) {
                setSelectedIds(new Set(filteredDevices.map(d => d.id)));
              }
              setIsPrintOpen(true);
            }}
          >
            <Barcode className="w-4 h-4" />
            바코드 출력
            {selectedIds.size > 0 && (
              <span className="ml-1 bg-blue-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full">
                {selectedIds.size}
              </span>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-9">
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />엑셀 일괄등록
          </Button>
          <Button
            onClick={() => {
              setFormDeviceType("pos"); setFormModel(""); setFormSerial(""); setFormMemo("");
              setIsAddOpen(true);
              setTimeout(() => scannerInputRef.current?.focus(), 100);
            }}
            className="bg-blue-600 hover:bg-blue-700 h-9 text-white border-0"
          >
            <Barcode className="w-4 h-4 mr-2" />스캐너/수동 등록
          </Button>
        </div>
      </div>

      {/* 필터 버튼 행 */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* 상태 필터 */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-xs text-slate-400 mr-1">상태</span>
          {ALL_STATUSES.map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-bold transition-all border",
                statusFilter === s
                  ? s === "all"
                    ? "bg-slate-800 text-white border-slate-800"
                    : `${statusLabels[s]?.color} border-transparent`
                  : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              )}
            >
              {s === "all" ? "전체" : statusLabels[s]?.label}
              {s !== "all" && (
                <span className="ml-1 opacity-60">
                  {devices.filter(d => d.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 기종명 필터 */}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-slate-400">기종</span>
          <Select value={modelFilter} onValueChange={(v: string | null) => setModelFilter(v ?? "all")}>
            <SelectTrigger className="h-8 text-xs w-44 bg-white">
              <SelectValue placeholder="전체 기종" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 기종</SelectItem>
              {allModels.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(statusFilter !== "all" || modelFilter !== "all" || searchQuery) && (
            <button
              onClick={() => { setStatusFilter("all"); setModelFilter("all"); setSearchQuery(""); }}
              className="text-xs text-slate-400 hover:text-slate-700 flex items-center gap-0.5"
            >
              <X className="w-3 h-3" />필터 초기화
            </button>
          )}
        </div>
      </div>

      {/* 테이블 + 상세 패널 */}
      <div className={cn("flex gap-4 transition-all", detailDevice ? "items-start" : "")}>
        {/* 메인 테이블 */}
        <Card className={cn("border-0 shadow-sm ring-1 ring-slate-100 transition-all flex-shrink-0",
          detailDevice ? "w-[58%]" : "w-full")}>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="w-10 py-3">
                    <input
                      type="checkbox"
                      className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                      checked={filteredDevices.length > 0 && selectedIds.size === filteredDevices.length}
                      onChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="font-bold text-slate-600 py-3 text-xs">구분</TableHead>
                  <TableHead className="font-bold text-slate-600 py-3 text-xs">시리얼 번호</TableHead>
                  <TableHead className="font-bold text-slate-600 py-3 text-xs">기종명</TableHead>
                  <TableHead className="font-bold text-slate-600 py-3 text-xs text-center">상태</TableHead>
                  <TableHead className="font-bold text-slate-600 py-3 text-xs">현재 대여 회원사</TableHead>
                  {!detailDevice && <TableHead className="font-bold text-slate-600 py-3 text-xs">메모</TableHead>}
                  <TableHead className="font-bold text-slate-600 py-3 text-xs text-center whitespace-nowrap">등록일</TableHead>
                  <TableHead className="font-bold text-slate-600 py-3 text-xs text-right">관리</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell colSpan={detailDevice ? 7 : 8} className="h-14 text-center">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto text-slate-300" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : filteredDevices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={detailDevice ? 7 : 8} className="h-32 text-center text-slate-400 text-sm">
                      등록된 기기가 없습니다.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDevices.map((d) => (
                    <TableRow
                      key={d.id}
                      className={cn(
                        "hover:bg-blue-50/40 transition-colors cursor-pointer",
                        detailDevice?.id === d.id && "bg-blue-50 ring-1 ring-inset ring-blue-200",
                        selectedIds.has(d.id) && "bg-blue-50/60"
                      )}
                      onClick={() => handleRowClick(d)}
                    >
                      <TableCell className="w-10" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          className="w-3.5 h-3.5 accent-blue-600 cursor-pointer"
                          checked={selectedIds.has(d.id)}
                          onChange={() => toggleSelect(d.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={d.device_type === "pos" ? "text-blue-600 border-blue-200" : "text-purple-600 border-purple-200"}>
                          {d.device_type === "pos" ? "POS" : "LABEL"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-xs">{d.serial_number}</span>
                      </TableCell>
                      <TableCell className="text-sm font-medium">{d.model_name}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary" className={cn("text-[10px] flex items-center gap-1 justify-center w-fit mx-auto", statusLabels[d.status]?.color)}>
                          {statusLabels[d.status]?.icon}
                          {statusLabels[d.status]?.label || d.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {d.tenants?.name ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xs font-bold text-slate-800">{d.tenants.name}</span>
                            {d.leased_at && <span className="text-[10px] text-slate-400">출고: {fmtDate(d.leased_at)}</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </TableCell>
                      {!detailDevice && (
                        <TableCell className="text-xs text-slate-500 max-w-[130px] truncate" title={d.memo || ""}>{d.memo || "-"}</TableCell>
                      )}
                      <TableCell className="text-xs text-slate-400 text-center whitespace-nowrap">
                        {fmtDate(d.created_at)}
                      </TableCell>
                      <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500 hover:text-slate-800"
                            onClick={() => { setSelectedDevice(d); setFormStatus(d.status); setFormMemo(d.memo || ""); setIsEditOpen(true); }}>
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          {!d.current_tenant_id && (
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDelete(d.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          {/* 결과 수 표시 */}
          {!loading && (
            <div className="px-4 py-2 border-t border-slate-100 text-[11px] text-slate-400">
              {filteredDevices.length}대 표시 / 전체 {devices.length}대
            </div>
          )}
        </Card>

        {/* 상세 패널 */}
        {detailDevice && (
          <Card className="flex-1 border-0 shadow-sm ring-1 ring-blue-100 bg-white min-w-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={detailDevice.device_type === "pos" ? "text-blue-600 border-blue-200" : "text-purple-600 border-purple-200"}>
                  {detailDevice.device_type === "pos" ? "POS" : "LABEL"}
                </Badge>
                <span className="font-bold text-sm text-slate-800">{detailDevice.model_name}</span>
              </div>
              <button onClick={() => setDetailDevice(null)} className="text-slate-400 hover:text-slate-700 p-1 rounded-md hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
              {/* 기본 정보 */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">기본 정보</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-400 text-[10px] mb-1">시리얼 번호</p>
                    <p className="font-mono font-bold text-slate-800 break-all">{detailDevice.serial_number}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-400 text-[10px] mb-1">현재 상태</p>
                    <Badge className={cn("text-[10px] flex items-center gap-1 w-fit", statusLabels[detailDevice.status]?.color)}>
                      {statusLabels[detailDevice.status]?.icon}
                      {statusLabels[detailDevice.status]?.label}
                    </Badge>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-slate-400 text-[10px] mb-1 flex items-center gap-1"><CalendarDays className="w-3 h-3" />입고(등록)일</p>
                    <p className="font-bold text-slate-800">{fmtDate(detailDevice.created_at)}</p>
                  </div>
                  {detailDevice.tenants?.name && (
                    <div className="bg-emerald-50 rounded-lg p-3">
                      <p className="text-emerald-600 text-[10px] mb-1 flex items-center gap-1"><Building2 className="w-3 h-3" />현재 임대 매장</p>
                      <p className="font-bold text-emerald-800 text-xs truncate">{detailDevice.tenants.name}</p>
                      {detailDevice.leased_at && (
                        <p className="text-[10px] text-emerald-600 mt-0.5">출고: {fmtDate(detailDevice.leased_at)}</p>
                      )}
                    </div>
                  )}
                </div>
                {detailDevice.memo && (
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                    <p className="text-[10px] text-amber-500 mb-1 font-bold">메모</p>
                    {detailDevice.memo}
                  </div>
                )}
              </div>

              {/* 이력 타임라인 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <History className="w-3 h-3" />입출고 이력
                  </p>
                </div>

                {logsLoading ? (
                  <div className="flex justify-center py-6"><Loader2 className="w-4 h-4 animate-spin text-slate-300" /></div>
                ) : deviceLogs.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs bg-slate-50 rounded-lg">
                    <History className="w-6 h-6 mx-auto mb-2 opacity-30" />
                    이력 데이터가 없습니다<br />
                    <span className="text-[10px]">※ printer_device_logs 테이블 적용 후 자동 기록됩니다</span>
                  </div>
                ) : (
                  <div className="relative pl-4 space-y-0">
                    <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                    {deviceLogs.map((log, i) => (
                      <div key={log.id} className="relative flex gap-3 pb-4 last:pb-0">
                        <div className={cn(
                          "absolute -left-1 top-1.5 w-3 h-3 rounded-full border-2 border-white z-10 flex-shrink-0",
                          log.event_type === "leased" ? "bg-emerald-400" :
                          log.event_type === "returned" ? "bg-blue-400" :
                          log.event_type === "repair_in" ? "bg-amber-400" :
                          log.event_type === "repair_out" ? "bg-orange-400" :
                          log.event_type === "disposed" ? "bg-red-400" : "bg-slate-400"
                        )} />
                        <div className="ml-4 flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <Badge className={cn("text-[9px] px-1.5 py-0.5 font-bold h-fit", eventLabels[log.event_type]?.color)}>
                              {eventLabels[log.event_type]?.label}
                            </Badge>
                            <span className="text-[10px] text-slate-400 font-mono">{fmtDateTime(log.created_at)}</span>
                          </div>
                          {log.tenant_name && (
                            <p className="text-xs text-slate-700 font-bold mt-0.5 flex items-center gap-1">
                              <Building2 className="w-3 h-3 text-slate-400" />{log.tenant_name}
                            </p>
                          )}
                          {log.memo && <p className="text-[10px] text-slate-500 mt-0.5">{log.memo}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 액션 버튼 */}
              <div className="flex gap-2 pt-2 border-t border-slate-100">
                <Button size="sm" variant="outline" className="flex-1 h-8 text-xs"
                  onClick={() => { setSelectedDevice(detailDevice); setFormStatus(detailDevice.status); setFormMemo(detailDevice.memo || ""); setIsEditOpen(true); }}>
                  <Edit2 className="w-3 h-3 mr-1" />상태/메모 수정
                </Button>
                {!detailDevice.current_tenant_id && (
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => handleDelete(detailDevice.id)}>
                    <Trash2 className="w-3 h-3 mr-1" />삭제
                  </Button>
                )}
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* 등록 다이얼로그 */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-blue-600" />신규 기기 스캔 / 등록
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>구분</Label>
                <Select value={formDeviceType} onValueChange={(v: any) => setFormDeviceType(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pos">포스 프린터 (POS)</SelectItem>
                    <SelectItem value="label">라벨 프린터 (LABEL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 relative">
                <Label>기종명</Label>
                <Input
                  ref={modelInputRef}
                  placeholder="예: SRP-330II"
                  value={formModel}
                  autoComplete="off"
                  onChange={(e) => { setFormModel(e.target.value); setFormModelOpen(true); }}
                  onFocus={() => setFormModelOpen(true)}
                  onBlur={() => setTimeout(() => setFormModelOpen(false), 150)}
                />
                {formModelOpen && modelSuggestions.length > 0 && (
                  <div className="absolute z-50 left-0 right-0 top-[calc(100%+2px)] bg-white border border-slate-200 rounded-lg shadow-lg max-h-44 overflow-y-auto">
                    {modelSuggestions.map((m) => (
                      <button key={m} type="button"
                        className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 hover:text-blue-700 font-mono transition-colors flex items-center gap-2"
                        onMouseDown={() => { setFormModel(m); setFormModelOpen(false); setTimeout(() => scannerInputRef.current?.focus(), 50); }}>
                        <span className="text-slate-300 text-[10px]">▸</span>{m}
                      </button>
                    ))}
                  </div>
                )}
                {formModel.trim() && formModelOpen && !existingModels.some(m => m.toLowerCase() === formModel.trim().toLowerCase()) && (
                  <p className="text-[10px] text-emerald-600 pt-0.5">✚ 신규 기종으로 등록됩니다</p>
                )}
              </div>
            </div>

            <div className="space-y-2 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <Label className="text-blue-600 flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5" /> 시리얼 번호 스캔
              </Label>
              <Input
                ref={scannerInputRef}
                placeholder="바코드 스캐너로 스캔하세요..."
                className="font-mono bg-white border-blue-200 focus-visible:ring-blue-500"
                value={formSerial}
                onChange={(e) => setFormSerial(e.target.value)}
                onKeyDown={handleScannerKeyDown}
                autoFocus
              />
              <p className="text-[10px] text-slate-500">스캐너 설정이 엔터(Enter)로 되어 있다면 스캔 즉시 자동 등록됩니다.</p>
            </div>

            <div className="space-y-2">
              <Label>메모 (선택)</Label>
              <Input placeholder="입고 당시 특이사항 등" value={formMemo} onChange={(e) => setFormMemo(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>취소</Button>
            <Button onClick={handleAdd} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "등록하기"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 수정 다이얼로그 */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>기기 정보 수정</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded text-sm mb-4 border border-slate-100">
              <p><strong>시리얼:</strong> <span className="font-mono">{selectedDevice?.serial_number}</span></p>
              <p><strong>기종명:</strong> {selectedDevice?.model_name}</p>
            </div>
            <div className="space-y-2">
              <Label>기기 상태</Label>
              <Select value={formStatus} onValueChange={(val) => setFormStatus(val || "in_stock")} disabled={!!selectedDevice?.current_tenant_id}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">재고(보관중)</SelectItem>
                  <SelectItem value="leased">임대중</SelectItem>
                  <SelectItem value="repair">A/S 진행중</SelectItem>
                  <SelectItem value="disposed">폐기</SelectItem>
                </SelectContent>
              </Select>
              {selectedDevice?.current_tenant_id && (
                <p className="text-[11px] text-amber-600">임대 중인 기기는 회원사 관리에서 먼저 반납 처리 후 상태를 변경하세요.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>메모</Label>
              <Input value={formMemo} onChange={(e) => setFormMemo(e.target.value)} placeholder="특이사항 등" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>취소</Button>
            <Button onClick={handleEdit} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white">
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "저장"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 바코드 라벨 출력 다이얼로그 */}
      <DeviceBarcodePrintDialog
        open={isPrintOpen}
        onClose={() => setIsPrintOpen(false)}
        devices={selectedDevices.length > 0 ? selectedDevices : filteredDevices}
      />
    </div>
  );
}
