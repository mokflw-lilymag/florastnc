"use client";

import { useState, useMemo } from "react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuGroup,
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuTrigger, 
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Trash2, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Product } from "@/types/product";

interface ProductTableProps {
  /** 현재 페이지에서 불러온 행(검색·필터 적용 후 표시) */
  products: Product[];
  /** 같은 페이지의 행(검색 전). 빈 상태 문구를 구분할 때 사용 */
  pageProducts?: Product[];
  /** 요약 카드의 전체 상품 수. 있으면 '빈 페이지'와 '진짜로 없음'을 구분 */
  registeredTotal?: number;
  onSelectionChange: (selectedIds: string[]) => void;
  onEdit: (product: Product) => void;
  /** true 이면 다이얼로그를 닫습니다. */
  onDelete: (id: string) => Promise<boolean>;
  selectedProducts?: string[];
}

export function ProductTable({ 
  products, 
  pageProducts,
  registeredTotal,
  onSelectionChange, 
  onEdit, 
  onDelete, 
  selectedProducts = [] 
}: ProductTableProps) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tr = (koText: string, enText: string) => (baseLocale === "ko" ? koText : enText);

  const pageRows = pageProducts ?? products;
  const emptyListMessage = useMemo(() => {
    if (pageRows.length > 0) return tr("검색 결과가 없습니다.", "No results match your search.");
    if (registeredTotal != null && registeredTotal > 0) {
      return tr(
        "이 페이지에 표시할 상품이 없습니다. 이전 페이지로 이동해 보세요.",
        "No products on this page. Try going to the previous page."
      );
    }
    return tr("등록된 상품이 없습니다.", "No products yet.");
  }, [pageRows.length, registeredTotal, baseLocale]);

  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleSelectionChange = (id: string) => {
    const newSelection = { ...selectedRows, [id]: !selectedRows[id] };
    if (!newSelection[id]) {
      delete newSelection[id];
    }
    setSelectedRows(newSelection);
    onSelectionChange(Object.keys(newSelection));
  };

  const handleSelectAll = (checked: boolean) => {
    const newSelection: Record<string, boolean> = {};
    if (checked) {
      products.forEach(p => newSelection[p.id] = true);
    }
    setSelectedRows(newSelection);
    onSelectionChange(Object.keys(newSelection));
  };

  const isAllSelected = useMemo(() => {
    return products.length > 0 && Object.keys(selectedRows).length === products.length;
  }, [selectedRows, products]);

  const getStatusInfo = (status: string, stock: number) => {
    if (status === "inactive") return { text: tr("비활성", "Inactive"), variant: "secondary" as const };
    if (stock <= 0 || status === "sold_out") return { text: tr("품절", "Sold out"), variant: "destructive" as const };
    if (stock < 10) return { text: tr("재고 부족", "Low stock"), variant: "outline" as const };
    return { text: tr("판매중", "Active"), variant: "default" as const };
  };

  return (
    <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="w-[50px]">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  aria-label={tr("모두 선택", "Select all")}
                />
              </TableHead>
              <TableHead className="font-semibold text-slate-700">{tr("상품명", "Product")}</TableHead>
              <TableHead className="font-semibold text-slate-700">{tr("카테고리", "Category")}</TableHead>
              <TableHead className="font-semibold text-slate-700">{tr("가격", "Price")}</TableHead>
              <TableHead className="font-semibold text-slate-700 text-right">{tr("재고", "Stock")}</TableHead>
              <TableHead className="font-semibold text-slate-700">{tr("상태", "Status")}</TableHead>
              <TableHead className="w-[80px]">
                <span className="sr-only">{tr("작업", "Actions")}</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length > 0 ? (
              products.map((product) => {
                const statusInfo = getStatusInfo(product.status, product.stock);
                return (
                  <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors">
                    <TableCell>
                      <Checkbox
                        checked={!!selectedRows[product.id]}
                        onCheckedChange={() => handleSelectionChange(product.id)}
                        aria-label={baseLocale === "ko" ? `${product.name} 선택` : `Select ${product.name}`}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{product.name}</span>
                        {product.code && (
                          <span className="text-xs text-slate-500 font-mono">{product.code}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-slate-600 text-sm">
                        <span>{product.main_category || '-'}</span>
                        {product.mid_category && (
                          <>
                            <span className="text-slate-300">/</span>
                            <span>{product.mid_category}</span>
                          </>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-slate-700">
                      ₩{product.price.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn(
                          "font-medium",
                          product.stock <= 0 ? "text-red-500" : 
                          product.stock < 10 ? "text-amber-500" : "text-slate-700"
                        )}>
                          {product.stock.toLocaleString()}
                        </span>
                        {product.supplier && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                            {product.supplier}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant} className="font-normal border-none">
                        {statusInfo.text}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          }
                        />
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuGroup>
                            <DropdownMenuLabel className="text-xs text-slate-500 px-2 py-1.5">{tr("관리", "Manage")}</DropdownMenuLabel>
                          </DropdownMenuGroup>
                          <DropdownMenuItem onClick={() => onEdit(product)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            {tr("수정", "Edit")}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => setPendingDelete(product)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            {tr("삭제", "Delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Package className="h-8 w-8 opacity-20" />
                    <p>{emptyListMessage}</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleting) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900">{tr("상품 삭제", "Delete product")}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              {tr(
                `정말로 '${pendingDelete?.name ?? ""}' 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
                `Delete "${pendingDelete?.name ?? ""}"? This cannot be undone.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>{tr("취소", "Cancel")}</AlertDialogCancel>
            <Button
              type="button"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deleting}
              onClick={async () => {
                if (!pendingDelete) return;
                setDeleting(true);
                try {
                  const ok = await onDelete(pendingDelete.id);
                  if (ok) setPendingDelete(null);
                } finally {
                  setDeleting(false);
                }
              }}
            >
              {deleting ? tr("삭제 중…", "Deleting…") : tr("삭제", "Delete")}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
