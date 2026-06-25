"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle2 } from "lucide-react";
import { useOrders } from "@/hooks/use-orders";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/utils/supabase/client";
import {
  convertOrderExcelRowToOrderData,
  downloadOrderImportTemplate,
  parseOrderExcelFile,
  type OrderExcelImportRow,
} from "@/lib/order-excel-import";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
};

type UploadResult = {
  success: number;
  duplicate: number;
  error: number;
  errors: string[];
};

export function OrderExcelUploadDialog({ open, onOpenChange, onComplete }: Props) {
  const { tenantId } = useAuth();
  const supabase = createClient();
  const { addOrder } = useOrders(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState<UploadResult | null>(null);

  const checkDuplicate = async (row: OrderExcelImportRow): Promise<boolean> => {
    if (!tenantId) return false;
    const orderDate = new Date(row.orderDate);
    if (Number.isNaN(orderDate.getTime())) return false;

    const start = new Date(orderDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(orderDate);
    end.setHours(23, 59, 59, 999);

    const { data } = await supabase
      .from("orders")
      .select("items, summary")
      .eq("tenant_id", tenantId)
      .gte("order_date", start.toISOString())
      .lte("order_date", end.toISOString());

    for (const existing of data || []) {
      const names = Array.isArray(existing.items)
        ? existing.items.map((item: { name?: string }) => item.name).join(",")
        : "";
      const total = Number(existing.summary?.total || 0);
      if (names === row.orderItems && total === row.totalAmount) return true;
    }
    return false;
  };

  const handleUpload = async () => {
    if (!selectedFile || !tenantId) return;
    setUploading(true);
    setProgress(0);
    setResult(null);

    try {
      const rows = await parseOrderExcelFile(selectedFile);
      if (rows.length === 0) {
        toast.error("유효한 주문 데이터가 없습니다.");
        return;
      }

      const uploadResult: UploadResult = { success: 0, duplicate: 0, error: 0, errors: [] };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          if (await checkDuplicate(row)) {
            uploadResult.duplicate += 1;
          } else {
            const orderData = convertOrderExcelRowToOrderData(row);
            const id = await addOrder(orderData);
            if (id) uploadResult.success += 1;
            else {
              uploadResult.error += 1;
              uploadResult.errors.push(`행 ${i + 2}: 저장 실패`);
            }
          }
        } catch (e) {
          uploadResult.error += 1;
          uploadResult.errors.push(
            `행 ${i + 2}: ${e instanceof Error ? e.message : "알 수 없는 오류"}`,
          );
        }
        setProgress(((i + 1) / rows.length) * 100);
      }

      setResult(uploadResult);
      toast.success(
        `완료 — 성공 ${uploadResult.success}건, 중복 ${uploadResult.duplicate}건, 오류 ${uploadResult.error}건`,
      );
      onComplete?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            엑셀 주문 일괄 업로드
          </DialogTitle>
          <DialogDescription>
            과거 주문·외부 데이터를 엑셀로 일괄 등록합니다. (인쇄·재고·자동 지출은 실행하지 않습니다)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">템플릿</CardTitle>
            </CardHeader>
            <CardContent>
              <Button type="button" variant="outline" className="w-full" onClick={() => void downloadOrderImportTemplate()}>
                <Download className="mr-2 h-4 w-4" />
                주문 업로드 양식 다운로드
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">파일 선택</CardTitle>
            </CardHeader>
            <CardContent>
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-6 hover:bg-slate-50">
                <Upload className="h-10 w-10 text-slate-400" />
                <span className="text-sm text-slate-600">{selectedFile ? selectedFile.name : "엑셀 파일 선택 (.xlsx, .xls)"}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => {
                    setSelectedFile(e.target.files?.[0] ?? null);
                    setResult(null);
                  }}
                />
              </label>
            </CardContent>
          </Card>

          {uploading ? (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-xs text-muted-foreground text-center">업로드 중… {Math.round(progress)}%</p>
            </div>
          ) : null}

          {result ? (
            <div className="rounded-lg border bg-slate-50 p-3 text-sm space-y-1">
              <p className="flex items-center gap-1.5 font-semibold text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> 성공 {result.success}건
              </p>
              <p className="text-slate-600">중복 건너뜀 {result.duplicate}건 · 오류 {result.error}건</p>
              {result.errors.slice(0, 5).map((msg) => (
                <p key={msg} className="flex items-start gap-1 text-xs text-rose-600">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  {msg}
                </p>
              ))}
            </div>
          ) : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              닫기
            </Button>
            <Button type="button" disabled={!selectedFile || uploading} onClick={() => void handleUpload()}>
              {uploading ? "업로드 중…" : "업로드 시작"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
