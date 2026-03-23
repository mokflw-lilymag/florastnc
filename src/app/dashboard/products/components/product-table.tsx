"use client";

import { useState, useMemo } from "react";
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
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle, 
  AlertDialogTrigger 
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, Pencil, Trash2, Package } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Product } from "@/types/product";

interface ProductTableProps {
  products: Product[];
  onSelectionChange: (selectedIds: string[]) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  selectedProducts?: string[];
}

export function ProductTable({ 
  products, 
  onSelectionChange, 
  onEdit, 
  onDelete, 
  selectedProducts = [] 
}: ProductTableProps) {
  const [selectedRows, setSelectedRows] = useState<Record<string, boolean>>({});

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
    if (status === 'inactive') return { text: '비활성', variant: 'secondary' as const };
    if (stock <= 0 || status === 'sold_out') return { text: '품절', variant: 'destructive' as const };
    if (stock < 10) return { text: '재고 부족', variant: 'outline' as const };
    return { text: '판매중', variant: 'default' as const };
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
                  aria-label="모두 선택"
                />
              </TableHead>
              <TableHead className="font-semibold text-slate-700">상품명</TableHead>
              <TableHead className="font-semibold text-slate-700">카테고리</TableHead>
              <TableHead className="font-semibold text-slate-700">가격</TableHead>
              <TableHead className="font-semibold text-slate-700 text-right">재고</TableHead>
              <TableHead className="font-semibold text-slate-700">상태</TableHead>
              <TableHead className="w-[80px]">
                <span className="sr-only">작업</span>
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
                        aria-label={`${product.name} 선택`}
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
                      <AlertDialog>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          } />
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuGroup>
                              <DropdownMenuLabel className="text-xs text-slate-500 px-2 py-1.5">관리</DropdownMenuLabel>
                            </DropdownMenuGroup>
                            <DropdownMenuItem onClick={() => onEdit(product)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              수정
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <AlertDialogTrigger nativeButton={false} render={
                              <DropdownMenuItem className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                삭제
                              </DropdownMenuItem>
                            } />
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-slate-900">상품 삭제</AlertDialogTitle>
                            <AlertDialogDescription className="text-slate-500">
                              정말로 '{product.name}' 상품을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>취소</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-red-600 hover:bg-red-700"
                              onClick={() => onDelete(product.id)}
                            >
                              삭제
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                    <Package className="h-8 w-8 opacity-20" />
                    <p>등록된 상품이 없습니다.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
