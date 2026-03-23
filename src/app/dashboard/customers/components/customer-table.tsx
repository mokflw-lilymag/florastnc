"use client";

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
  MoreHorizontal, 
  Pencil, 
  Trash2, 
  User, 
  Building2, 
  Phone,
  Star
} from "lucide-react";
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
import { Customer } from "@/types/customer";

interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  onDelete: (id: string) => void;
  onRowClick?: (customer: Customer) => void;
}

export function CustomerTable({ customers, onEdit, onDelete, onRowClick }: CustomerTableProps) {
  const getGradeBadge = (grade: string | null) => {
    switch (grade) {
      case 'VVIP':
        return <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-none"><Star className="h-3 w-3 mr-1 fill-purple-700" />VVIP</Badge>;
      case 'VIP':
        return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none"><Star className="h-3 w-3 mr-1 fill-amber-700" />VIP</Badge>;
      case 'GOLD':
        return <Badge className="bg-yellow-50 text-yellow-700 hover:bg-yellow-50 border-none">GOLD</Badge>;
      default:
        return <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-none">일반</Badge>;
    }
  };

  return (
    <Card className="border-none shadow-sm overflow-hidden bg-white/50 backdrop-blur-sm">
      <CardContent className="p-0">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">고객 정보</TableHead>
              <TableHead className="font-semibold text-slate-700">유형</TableHead>
              <TableHead className="font-semibold text-slate-700">연락처</TableHead>
              <TableHead className="font-semibold text-slate-700">등급</TableHead>
              <TableHead className="font-semibold text-slate-700 text-right">누적 구매</TableHead>
              <TableHead className="w-[80px]">
                <span className="sr-only">작업</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.length > 0 ? (
              customers.map((customer) => (
                <TableRow 
                  key={customer.id} 
                  className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  onClick={() => onRowClick?.(customer)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        {customer.type === 'company' ? <Building2 className="h-4 w-4" /> : <User className="h-4 w-4" />}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-900">{customer.name}</span>
                        {customer.company_name && (
                          <span className="text-xs text-slate-500">{customer.company_name}</span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-normal text-slate-500 border-slate-200">
                      {customer.type === 'company' ? '기업' : '개인'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-slate-600 text-sm">
                      <Phone className="h-3 w-3 mr-2 opacity-50" />
                      {customer.contact || '-'}
                    </div>
                  </TableCell>
                  <TableCell>
                    {getGradeBadge(customer.grade)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-mono text-slate-700 font-medium">
                        ₩{(customer.total_spent || 0).toLocaleString()}
                      </span>
                      <span className="text-[10px] text-slate-400">
                         {customer.order_count || 0}회 주문
                      </span>
                    </div>
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
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
                          <DropdownMenuItem onClick={() => onEdit(customer)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            수정
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <AlertDialogTrigger render={
                            <DropdownMenuItem className="text-red-600 focus:text-red-600">
                              <Trash2 className="mr-2 h-4 w-4" />
                              삭제
                            </DropdownMenuItem>
                          } />
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>고객 삭제</AlertDialogTitle>
                          <AlertDialogDescription>
                            정말로 '{customer.name}' 고객 정보를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>취소</AlertDialogCancel>
                          <AlertDialogAction 
                            className="bg-red-600 hover:bg-red-700"
                            onClick={() => onDelete(customer.id)}
                          >
                            삭제
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                    <User className="h-8 w-8 opacity-20" />
                    <p>등록된 고객이 없습니다.</p>
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
