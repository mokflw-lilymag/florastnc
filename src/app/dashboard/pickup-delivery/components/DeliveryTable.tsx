"use client";

import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, CheckCircle, Phone, MapPin, X, Truck } from "lucide-react";
import { Order } from "@/types/order";;
import { DeliveryPhotoUpload } from "@/components/delivery-photo-upload";
import { useAuth } from "@/hooks/use-auth";

interface DeliveryTableProps {
    orders: Order[];
    onComplete: (orderId: string, photoUrl?: string) => void;
    onDeletePhoto: (orderId: string, photoUrl: string) => void;
    onEditDriver: (order: Order) => void;
    onRowClick: (order: Order) => void;
    formatDateTime: (date: string, time: string) => string;
    getStatusBadge: (status: string) => React.ReactNode;
}

export function DeliveryTable({
    orders,
    onComplete,
    onDeletePhoto,
    onEditDriver,
    onRowClick,
    formatDateTime,
    getStatusBadge
}: DeliveryTableProps) {
    const { user } = useAuth();
    const userBranch = (user as any)?.franchise || (user as any)?.tenantName;

    if (orders.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                <p>배송 예약 주문이 없습니다.</p>
                <p className="text-sm">주문 접수에서 '배송예약'으로 주문을 생성하면 여기에 표시됩니다.</p>
            </div>
        );
    }

    return (
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50 text-xs">
                            <TableHead className="whitespace-nowrap">주문번호</TableHead>
                            <TableHead className="whitespace-nowrap">주문자</TableHead>
                            <TableHead className="whitespace-nowrap">수령자</TableHead>
                            <TableHead className="whitespace-nowrap">예정일시</TableHead>
                            <TableHead className="w-full min-w-[200px]">배송지</TableHead>
                            <TableHead className="whitespace-nowrap">실제배송비</TableHead>
                            <TableHead className="whitespace-nowrap">지점</TableHead>
                            <TableHead className="whitespace-nowrap">상태</TableHead>
                            <TableHead className="whitespace-nowrap text-center">작업</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orders.map((order) => {
                            const isTransferred = !!order.transferInfo?.isTransferred && !!order.transferInfo.processBranchName;
                            const myBranch = userBranch?.replace('릴리맥', '') || '';
                            const sender = order.tenantName?.replace('릴리맥', '') || '';
                            const receiver = order.transferInfo?.processBranchName?.replace('릴리맥', '') || '';
                            const isUserReceived = isTransferred && myBranch && receiver === myBranch;
                            
                            const badgeText = isUserReceived ? '수주' : (myBranch === sender ? '발주' : '이관');
                            const badgeClass = isUserReceived ? 'bg-amber-100 text-amber-700' : (myBranch === sender ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700');
                            
                            return (
                            <TableRow
                                key={order.id}
                                className={`cursor-pointer hover:bg-muted/50 transition-colors ${isTransferred ? (isUserReceived ? 'bg-amber-50/50 hover:bg-amber-100/50' : 'bg-slate-50/50 hover:bg-slate-100/50') : ''}`}
                                onClick={() => onRowClick(order)}
                            >
                                <TableCell className="font-mono text-[10px] text-blue-600 whitespace-nowrap">
                                    {order.id.slice(0, 8)}
                                </TableCell>
                                <TableCell className="text-sm whitespace-nowrap">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium">{order.orderer.name}</span>
                                        {isTransferred && (
                                            <Badge variant="secondary" className={`${badgeClass} border-none px-1 h-4 text-[9px]`}>
                                                {badgeText}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-sm whitespace-nowrap">
                                    {order.delivery_info?.recipientName || '-'}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    <div className="flex items-center gap-1 text-[11px] text-slate-600">
                                        <CalendarIcon className="w-3 h-3 text-slate-400" />
                                        {formatDateTime(order.delivery_info?.date || '', order.delivery_info?.time || '')}
                                    </div>
                                </TableCell>
                                <TableCell className="max-w-[1px] w-full">
                                    <div className="flex items-center gap-1">
                                        <MapPin className="w-3 h-3 flex-shrink-0 text-slate-400" />
                                        <span className="flex-1 truncate text-[11px]" title={order.delivery_info?.address}>
                                            {order.delivery_info?.address || '-'}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {order.actual_delivery_cost || order.actual_delivery_cost_cash ? (
                                        <div className="text-[11px] font-bold">
                                            ₩{((order.actual_delivery_cost || 0) + (order.actual_delivery_cost_cash || 0)).toLocaleString()}
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-[10px]">미입력</span>
                                    )}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">
                                    <div className="flex flex-col text-[11px]">
                                        <span className="font-medium">{order.tenantName}</span>
                                        {order.transferInfo?.isTransferred && (
                                            <Badge variant="outline" className="w-fit text-[9px] h-3.5 px-1 mt-0.5 border-orange-200 text-orange-600">
                                                {order.transferInfo.processBranchName}
                                            </Badge>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="whitespace-nowrap">{getStatusBadge(order.status)}</TableCell>
                                <TableCell className="text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                    {order.status === 'processing' ? (
                                        <div className="flex flex-col gap-1.5 items-center">
                                            <DeliveryPhotoUpload
                                                orderId={order.id}
                                                currentPhotoUrl={order.delivery_info?.completionPhotoUrl}
                                                onPhotoUploaded={(photoUrl) => onComplete(order.id, photoUrl)}
                                                onPhotoRemoved={() => { }}
                                            />
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => onComplete(order.id)}
                                                className="h-7 px-2 text-[10px] w-full"
                                            >
                                                사진 없이 완료
                                            </Button>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-1.5 items-center">
                                            <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none">완료됨</Badge>
                                            {order.delivery_info?.completionPhotoUrl && (
                                                <div className="flex gap-1 mt-1">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => window.open(order.delivery_info?.completionPhotoUrl, '_blank')}
                                                        className="h-6 px-1.5 text-[10px]"
                                                    >
                                                        📸 사진
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => onDeletePhoto(order.id, order.delivery_info?.completionPhotoUrl || '')}
                                                        className="h-6 px-1 w-6 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </TableCell>
                            </TableRow>
                        )})}
                    </TableBody>
                </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3">
                {orders.map((order) => {
                    const isTransferred = !!order.transferInfo?.isTransferred && !!order.transferInfo.processBranchName;
                    const myBranch = userBranch?.replace('릴리맥', '') || '';
                    const sender = order.tenantName?.replace('릴리맥', '') || '';
                    const receiver = order.transferInfo?.processBranchName?.replace('릴리맥', '') || '';
                    const isUserReceived = isTransferred && myBranch && receiver === myBranch;
                    
                    const badgeText = isUserReceived ? '수주' : (myBranch === sender ? '발주' : '이관');
                    const badgeClass = isUserReceived ? 'bg-amber-100 text-amber-700' : (myBranch === sender ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700');
                    
                    return (
                    <div
                        key={order.id}
                        className={`p-4 border rounded-xl shadow-sm active:bg-slate-50 relative cursor-pointer hover:border-primary transition-colors ${isTransferred ? (isUserReceived ? 'bg-amber-50/30 border-amber-200' : 'bg-slate-50/80 border-slate-200') : 'bg-white'}`}
                        onClick={() => onRowClick(order)}
                    >
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex-1">
                                <span className="text-[10px] text-slate-400 font-mono">#{order.id.slice(0, 8)}</span>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                    <h4 className="font-bold text-lg">{order.orderer.name} <span className="text-sm font-normal text-slate-500">님</span></h4>
                                    {isTransferred && (
                                        <Badge variant="secondary" className={`${badgeClass} border-none px-1 h-4 text-[9px]`}>
                                            {badgeText}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex flex-col items-end gap-1 shrink-0">
                                {getStatusBadge(order.status)}
                                <span className="text-[10px] font-medium text-slate-500">{order.tenantName}</span>
                            </div>
                        </div>

                        <div className="space-y-2 text-sm text-slate-600 mb-4 border-l-2 border-blue-100 pl-3">
                            <div className="flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-slate-400" />
                                <span className="font-medium">{formatDateTime(order.delivery_info?.date || '', order.delivery_info?.time || '')}</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                <span className="flex-1 leading-tight">{order.delivery_info?.address || '-'}</span>
                            </div>
                        </div>

                        {(order.actual_delivery_cost || order.actual_delivery_cost_cash) ? (
                            <div className="flex justify-between items-center mb-4 p-2 bg-slate-50 rounded-lg text-xs">
                                <span className="text-slate-500">실제 배송비 (총액)</span>
                                <div className="text-right">
                                    <div className="font-bold">₩{((order.actual_delivery_cost || 0) + (order.actual_delivery_cost_cash || 0)).toLocaleString()}</div>
                                </div>
                            </div>
                        ) : null}

                        <div className="flex items-center justify-end pt-3 border-t" onClick={(e) => e.stopPropagation()}>
                            {order.status === 'processing' ? (
                                <div className="flex gap-2">
                                    <DeliveryPhotoUpload
                                        orderId={order.id}
                                        currentPhotoUrl={order.delivery_info?.completionPhotoUrl}
                                        onPhotoUploaded={(photoUrl) => onComplete(order.id, photoUrl)}
                                        onPhotoRemoved={() => { }}
                                    />
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => onComplete(order.id)}
                                        className="h-8 text-[10px] text-slate-400 underline"
                                    >
                                        사진 없이
                                    </Button>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    {order.delivery_info?.completionPhotoUrl && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => window.open(order.delivery_info?.completionPhotoUrl, '_blank')}
                                            className="h-8 text-xs"
                                        >
                                            📸 사진 보기
                                        </Button>
                                    )}
                                    <Badge variant="secondary" className="h-8 flex items-center bg-slate-100 text-slate-500 border-none">완료됨</Badge>
                                </div>
                            )}
                        </div>
                    </div>
                )})}
            </div>
        </>
    );
}
