"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Loader2,
  Barcode,
  Upload,
  Search,
  Plus,
  Edit2,
  Trash2,
  AlertTriangle,
  History,
  FileSpreadsheet
} from "lucide-react";
import * as XLSX from "xlsx";

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

const statusLabels: Record<string, { label: string; color: string }> = {
  in_stock: { label: "재고(보관중)", color: "bg-blue-100 text-blue-700" },
  leased: { label: "임대중", color: "bg-emerald-100 text-emerald-700" },
  repair: { label: "A/S 진행중", color: "bg-amber-100 text-amber-700" },
  disposed: { label: "폐기", color: "bg-slate-100 text-slate-700" },
};

export function PrinterDevicesPanel() {
  const [devices, setDevices] = useState<PrinterDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // 모달 상태
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<PrinterDevice | null>(null);

  // 폼 상태
  const [submitting, setSubmitting] = useState(false);
  const [formDeviceType, setFormDeviceType] = useState<"pos" | "label">("pos");
  const [formModel, setFormModel] = useState("");
  const [formSerial, setFormSerial] = useState("");
  const [formMemo, setFormMemo] = useState("");
  const [formStatus, setFormStatus] = useState<string>("in_stock");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    loadDevices();
  }, []);

  const handleAdd = async () => {
    if (!formModel.trim() || !formSerial.trim()) {
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
          model_name: formModel,
          serial_number: formSerial,
          memo: formMemo
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
      
      // 스캐너 연속 입력을 위해 포커스 유지
      setTimeout(() => {
        scannerInputRef.current?.focus();
      }, 100);
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
        body: JSON.stringify({
          id: selectedDevice.id,
          status: formStatus,
          memo: formMemo,
        }),
      });
      if (!res.ok) throw new Error("수정 실패");
      toast.success("기기 정보가 수정되었습니다.");
      setIsEditOpen(false);
      loadDevices();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("이 기기를 삭제하시겠습니까? (임대 중인 기기는 가급적 상태를 '폐기'로 변경하세요)")) return;
    try {
      const res = await fetch("/api/admin/printers/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error("삭제 실패");
      toast.success("기기가 삭제되었습니다.");
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
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        // Data format mapping expected: { "구분": "pos" | "label", "기종명": string, "시리얼번호": string, "메모": string }
        const items = data.map((row: any) => ({
          device_type: row["구분"] === "라벨" || row["device_type"] === "label" ? "label" : "pos",
          model_name: row["기종명"] || row["model_name"],
          serial_number: String(row["시리얼번호"] || row["serial_number"]),
          memo: row["메모"] || row["memo"] || "",
        })).filter(i => i.model_name && i.serial_number);

        if (items.length === 0) {
          toast.error("업로드할 유효한 데이터가 없습니다. 양식을 확인해주세요.");
          return;
        }

        const res = await fetch("/api/admin/printers/devices", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "일괄 등록 실패");
        }

        toast.success(`총 ${items.length}대의 기기가 일괄 등록되었습니다.`);
        loadDevices();
      } catch (err: any) {
        toast.error("엑셀 처리 중 오류: " + err.message);
      }
      // reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsBinaryString(file);
  };

  // 스캐너 입력 감지 (엔터 키 입력 시 즉시 폼 서밋)
  const handleScannerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && formSerial.trim()) {
      e.preventDefault();
      handleAdd();
    }
  };

  const filteredDevices = devices.filter(d => 
    d.serial_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.model_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.tenants?.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 엑셀 업로드 숨김 인풋 */}
      <input 
        type="file" 
        accept=".xlsx, .xls, .csv" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileUpload} 
      />

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-2 w-full sm:w-auto relative">
          <Search className="w-4 h-4 absolute left-3 text-slate-400" />
          <Input 
            placeholder="시리얼 번호, 기종, 회원사명 검색..." 
            className="pl-9 w-full sm:w-80 h-9 bg-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="h-9">
            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
            엑셀 일괄등록
          </Button>
          <Button onClick={() => {
            setFormSerial("");
            setFormMemo("");
            setIsAddOpen(true);
            setTimeout(() => scannerInputRef.current?.focus(), 100);
          }} className="bg-blue-600 hover:bg-blue-700 h-9 text-white border-0">
            <Barcode className="w-4 h-4 mr-2" />
            스캐너/수동 등록
          </Button>
        </div>
      </div>

      <Card className="border-0 shadow-sm ring-1 ring-slate-100">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead className="font-bold text-slate-600 py-3 text-xs">구분</TableHead>
                <TableHead className="font-bold text-slate-600 py-3 text-xs">시리얼 번호</TableHead>
                <TableHead className="font-bold text-slate-600 py-3 text-xs">기종명</TableHead>
                <TableHead className="font-bold text-slate-600 py-3 text-xs text-center">상태</TableHead>
                <TableHead className="font-bold text-slate-600 py-3 text-xs">현재 대여 회원사</TableHead>
                <TableHead className="font-bold text-slate-600 py-3 text-xs">메모</TableHead>
                <TableHead className="font-bold text-slate-600 py-3 text-xs text-right">관리</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7} className="h-16 text-center">
                      <Loader2 className="h-5 w-5 animate-spin mx-auto text-slate-300" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredDevices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center text-slate-500 text-sm">
                    등록된 기기가 없습니다.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDevices.map((d) => (
                  <TableRow key={d.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <Badge variant="outline" className={d.device_type === "pos" ? "text-blue-600 border-blue-200" : "text-purple-600 border-purple-200"}>
                        {d.device_type === "pos" ? "POS" : "LABEL"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded text-xs">{d.serial_number}</span>
                    </TableCell>
                    <TableCell className="text-sm font-medium">{d.model_name}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary" className={statusLabels[d.status]?.color || ""}>
                        {statusLabels[d.status]?.label || d.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {d.tenants?.name ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-bold text-slate-800">{d.tenants.name}</span>
                          <div className="flex items-center gap-1">
                            {d.leased_at && <span className="text-[10px] text-slate-400">출고: {format(new Date(d.leased_at), "yyyy.MM.dd")}</span>}
                            {d.tenants.status !== "active" || (d.tenants.subscription_end && new Date(d.tenants.subscription_end) < new Date()) ? (
                              <Badge className="bg-red-50 text-red-600 border-red-200 text-[9px] px-1 py-0 shadow-none font-bold">회수 필요</Badge>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-500 max-w-[150px] truncate" title={d.memo || ""}>
                      {d.memo || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="이력 조회 (A/S 기록 등)"
                          onClick={() => {
                            setSelectedDevice(d);
                            setIsHistoryOpen(true);
                          }}
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-500 hover:text-slate-800"
                          onClick={() => {
                            setSelectedDevice(d);
                            setFormStatus(d.status);
                            setFormMemo(d.memo || "");
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>
                        {!d.current_tenant_id && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleDelete(d.id)}
                          >
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
      </Card>

      {/* 등록 다이얼로그 */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Barcode className="w-5 h-5 text-blue-600" />
              신규 기기 스캔 / 등록
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>구분</Label>
                <Select value={formDeviceType} onValueChange={(v: any) => setFormDeviceType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pos">포스 프린터 (POS)</SelectItem>
                    <SelectItem value="label">라벨 프린터 (LABEL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>기종명</Label>
                <Input 
                  placeholder="예: SRP-330II" 
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                />
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
              <Input 
                placeholder="입고 당시 특이사항 등" 
                value={formMemo}
                onChange={(e) => setFormMemo(e.target.value)}
              />
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
          <DialogHeader>
            <DialogTitle>기기 정보 수정</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-slate-50 p-3 rounded text-sm mb-4 border border-slate-100">
              <p><strong>시리얼:</strong> <span className="font-mono">{selectedDevice?.serial_number}</span></p>
              <p><strong>기종명:</strong> {selectedDevice?.model_name}</p>
            </div>

            <div className="space-y-2">
              <Label>기기 상태</Label>
              <Select value={formStatus} onValueChange={(val) => setFormStatus(val || "in_stock")} disabled={!!selectedDevice?.current_tenant_id}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_stock">재고(보관중)</SelectItem>
                  <SelectItem value="leased" disabled>임대중 (회원사 관리에서 처리)</SelectItem>
                  <SelectItem value="repair">A/S 진행중</SelectItem>
                  <SelectItem value="disposed">폐기 처리</SelectItem>
                </SelectContent>
              </Select>
              {selectedDevice?.current_tenant_id && (
                <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" /> 임대 중인 기기는 임의로 상태를 바꿀 수 없습니다.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Input 
                placeholder="A/S 사유 등 기록" 
                value={formMemo}
                onChange={(e) => setFormMemo(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>취소</Button>
            <Button onClick={handleEdit} disabled={submitting}>저장하기</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 타임라인 (이력 조회) 다이얼로그 */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-5 h-5 text-slate-600" />
              기기 상세 이력 조회
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
              <div className="flex justify-between items-center mb-2">
                <Badge variant="outline" className={selectedDevice?.device_type === "pos" ? "text-blue-600 border-blue-200 bg-white" : "text-purple-600 border-purple-200 bg-white"}>
                  {selectedDevice?.device_type === "pos" ? "POS" : "LABEL"}
                </Badge>
                <Badge variant="secondary" className={statusLabels[selectedDevice?.status || ""]?.color || ""}>
                  {statusLabels[selectedDevice?.status || ""]?.label || selectedDevice?.status}
                </Badge>
              </div>
              <h3 className="font-mono text-lg font-bold text-slate-800 tracking-tight">{selectedDevice?.serial_number}</h3>
              <p className="text-sm text-slate-500">{selectedDevice?.model_name}</p>
            </div>

            <div className="relative pl-4 border-l-2 border-slate-100 space-y-6 mt-6 ml-2">
              {/* 현재 상태 (임대중일 경우) */}
              {selectedDevice?.current_tenant_id && (
                <div className="relative">
                  <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></div>
                  <p className="text-xs text-slate-400 font-medium mb-1">현재 상태</p>
                  <p className="text-sm font-bold text-slate-800">{selectedDevice.tenants?.name} 임대 중</p>
                  {selectedDevice.leased_at && <p className="text-xs text-slate-500">출고일: {format(new Date(selectedDevice.leased_at), "yyyy년 MM월 dd일")}</p>}
                </div>
              )}
              
              <div className="relative">
                <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-blue-50"></div>
                <p className="text-xs text-slate-400 font-medium mb-1">최초 등록</p>
                <p className="text-sm font-bold text-slate-800">시스템에 자산 등록</p>
                {selectedDevice?.created_at && <p className="text-xs text-slate-500">{format(new Date(selectedDevice.created_at), "yyyy년 MM월 dd일 HH:mm")}</p>}
              </div>
            </div>
            
            <div className="bg-blue-50/50 p-3 rounded border border-blue-100 mt-6 text-xs text-blue-700 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p>추후 회원사 관리 메뉴에서 임대/회수/AS 처리를 할 때마다 이 타임라인에 이력이 누적되어 기기의 불량 여부(블랙리스트)를 판독할 수 있습니다.</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
