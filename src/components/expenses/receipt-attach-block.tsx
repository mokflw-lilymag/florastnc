"use client";

import { useRef } from "react";
import { ExternalLink, FileText, Image as ImageIcon, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function receiptLinkHref(url: string): string {
  const u = url.trim();
  if (/^https?:\/\//i.test(u)) return u;
  return u;
}

function isPdfUrl(url: string, file?: File | null): boolean {
  if (file?.type === "application/pdf") return true;
  return url.toLowerCase().includes(".pdf");
}

export interface ReceiptAttachBlockProps {
  receiptUrl?: string | null;
  previewUrl?: string | null;
  editable?: boolean;
  loading?: boolean;
  onUpload: (file: File) => void | Promise<void>;
  onRemove?: () => void | Promise<void>;
  className?: string;
}

export function ReceiptAttachBlock({
  receiptUrl,
  previewUrl,
  editable = true,
  loading = false,
  onUpload,
  onRemove,
  className,
}: ReceiptAttachBlockProps) {
  const uploadRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef<HTMLInputElement>(null);
  const displayUrl = previewUrl || receiptUrl || "";
  const hasReceipt = Boolean(displayUrl);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    void onUpload(file);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-sm font-semibold flex items-center justify-between">
        <span>영수증 첨부</span>
        {editable && hasReceipt && onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-rose-500 hover:text-rose-700 hover:bg-rose-50 p-1 rounded"
            disabled={loading}
            onClick={() => void onRemove()}
          >
            <Trash2 className="h-4 w-4 mr-1" />
            삭제
          </Button>
        ) : null}
      </Label>

      {hasReceipt ? (
        <div className="relative rounded-lg border bg-muted p-2 flex flex-col items-center justify-center gap-2 min-h-[150px]">
          {isPdfUrl(displayUrl) ? (
            <div className="flex flex-col items-center gap-2 p-4">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">PDF 영수증</span>
            </div>
          ) : (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={displayUrl.startsWith("blob:") ? displayUrl : receiptLinkHref(displayUrl)}
              alt="영수증 미리보기"
              className="max-h-[220px] max-w-full rounded-md object-contain border bg-white"
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          )}
          <div className="flex flex-wrap items-center gap-2 mt-2 w-full justify-center">
            <a
              href={displayUrl.startsWith("blob:") ? displayUrl : receiptLinkHref(displayUrl)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="h-3 w-3" />
              영수증 크게 보기
            </a>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border-2 border-dashed p-6 flex flex-col items-center justify-center text-center gap-2 bg-gray-50/50">
          <ImageIcon className="h-8 w-8 text-gray-400" />
          <p className="text-xs text-muted-foreground">등록된 영수증이 없습니다.</p>
          {editable ? (
            <div className="mt-1">
              <label
                htmlFor="receipt-attach-upload"
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-md bg-white hover:bg-gray-50 shadow-sm",
                  loading ? "pointer-events-none opacity-60" : "cursor-pointer",
                )}
              >
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                영수증 파일 선택
              </label>
              <input
                id="receipt-attach-upload"
                ref={uploadRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                disabled={loading}
                onChange={(e) => {
                  handleFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          ) : null}
        </div>
      )}

      {editable && hasReceipt ? (
        <div className="flex justify-end">
          <label
            htmlFor="receipt-attach-change"
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium border rounded-md bg-white hover:bg-gray-50 shadow-sm",
              loading ? "pointer-events-none opacity-60" : "cursor-pointer",
            )}
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            다른 파일로 변경
          </label>
          <input
            id="receipt-attach-change"
            ref={changeRef}
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            disabled={loading}
            onChange={(e) => {
              handleFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
