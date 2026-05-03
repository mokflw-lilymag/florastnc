"use client";
import { getMessages } from "@/i18n/getMessages";

import React, { useState, useEffect } from "react";
import { 
    Package, Clock, CheckCircle2, XCircle, 
    ArrowUpRight, Info, Building2, MapPin,
    Search, Filter, ChevronRight, Eye,
    Truck, Camera, MessageSquare, ExternalLink,
    DollarSign, Printer, Download, RefreshCw
} from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export default function ReceivedOrdersPage() {
    const supabase = createClient();
    const { tenantId } = useAuth();
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const baseLocale = toBaseLocale(locale);
    const tr = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
    const [loading, setLoading] = useState(true);
    const [orders, setOrders] = useState<any[]>([]);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState("all");
    const [selectedOrder, setSelectedOrder] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    useEffect(() => {
        if (tenantId) {
            fetchReceivedOrders();
            
            // Real-time subscription
            const channel = supabase
                .channel('external_orders_received')
                .on('postgres_changes', { 
                    event: '*', 
                    schema: 'public', 
                    table: 'external_orders',
                    filter: `receiver_tenant_id=eq.${tenantId}`
                }, () => {
                    fetchReceivedOrders();
                })
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }
    }, [tenantId]);

    const fetchReceivedOrders = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('external_orders')
                .select('*, sender:tenants!external_orders_sender_tenant_id_fkey(name, contact_phone)')
                .eq('receiver_tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (err) {
            console.error(err);
            toast.error(tf.f00399);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (orderId: string, newStatus: string) => {
        try {
            const { error } = await supabase
                .from('external_orders')
                .update({ status: newStatus })
                .eq('id', orderId);

            if (error) throw error;
            
            // If completed, update origin order status too
            if (newStatus === 'completed') {
                const order = orders.find(o => o.id === orderId);
                if (order?.origin_order_id) {
                    await supabase.from('orders').update({ status: 'completed' }).eq('id', order.origin_order_id);
                }
            }

            toast.success(
                newStatus === "processing"
                    ? tf.f00327
                    : tf.f00326
            );
            fetchReceivedOrders();
        } catch (err) {
            console.error(err);
            toast.error(tf.f00323);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200 rounded-full px-4 h-6 font-bold text-[10px] animate-pulse">{tf.f00400}</Badge>;
            case 'processing': return <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 rounded-full px-4 h-6 font-bold text-[10px]">{tf.f00583}</Badge>;
            case 'completed': return <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-200 rounded-full px-4 h-6 font-bold text-[10px]">{tf.f00247}</Badge>;
            case 'canceled': return <Badge variant="outline" className="bg-rose-50 text-rose-600 border-rose-200 rounded-full px-4 h-6 font-bold text-[10px]">{tf.f00703}</Badge>;
            default: return <Badge variant="outline" className="rounded-full px-4 h-6 font-bold text-[10px]">{status}</Badge>;
        }
    };

    const filteredOrders = orders.filter(o => {
        const matchSearch = !search || 
            (o.order_data?.orderer?.name || "").includes(search) || 
            (o.sender?.name || "").includes(search);
        const matchStatus = filterStatus === "all" || o.status === filterStatus;
        return matchSearch && matchStatus;
    });

    const StatsSection = () => {
        const pendingCount = orders.filter(o => o.status === 'pending').length;
        const todayRevenue = orders
            .filter(o => o.status === 'completed' && format(parseISO(o.created_at), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd'))
            .reduce((acc, curr) => acc + (curr.fulfillment_amount || 0), 0);

        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 shadow-2xl bg-indigo-600 text-white rounded-[2.5rem] overflow-hidden group">
                    <CardContent className="p-8 relative">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-150 transition-all duration-700" />
                         <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-200 mb-2">
                            {tr("신규 요청", "New requests", "Yêu cầu mới")}
                         </div>
                         <div className="text-4xl font-black">{pendingCount} <span className="text-base font-light">{tf.f00033}</span></div>
                         <p className="text-xs text-indigo-100/60 mt-2">{tf.f00771}</p>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-2xl bg-white rounded-[2.5rem] overflow-hidden group">
                    <CardContent className="p-8">
                         <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">
                            {tr("오늘 매출", "Today's earnings", "Doanh thu hôm nay")}
                         </div>
                         <div className="text-4xl font-black text-slate-900">₩{todayRevenue.toLocaleString()}</div>
                         <div className="flex items-center gap-2 mt-2">
                             <Badge className="bg-emerald-100 text-emerald-600 border-0 h-5 text-[9px]">
                                {tr("정산 완료", "Settled", "Đã quyết toán")}
                             </Badge>
                             <span className="text-xs text-slate-400 font-light italic">{tf.f00461}</span>
                         </div>
                    </CardContent>
                </Card>
                <Card className="border-0 shadow-2xl bg-slate-900 text-white rounded-[2.5rem] overflow-hidden group">
                    <CardContent className="p-8">
                         <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
                            {tr("누적 수신", "Total received", "Tổng đã nhận")}
                         </div>
                         <div className="text-4xl font-black text-indigo-400">{orders.length} <span className="text-base font-light text-white">{tf.f00033}</span></div>
                         <p className="text-xs text-slate-500 mt-2 font-light">{tf.f00142}</p>
                    </CardContent>
                </Card>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 space-y-10 pb-32">
            <PageHeader 
                title={tf.f00011} 
                description={tf.f00549} 
                icon={Package}
            >
                <div className="flex gap-3">
                    <Button variant="outline" className="h-12 px-6 rounded-2xl bg-white border-slate-100 shadow-sm font-bold" onClick={fetchReceivedOrders}>
                        <RefreshCw className={cn("w-4 h-4 mr-3", loading && "animate-spin")} /> {tf.f00348}
                    </Button>
                    <Button className="h-12 px-8 rounded-2xl bg-slate-900 hover:bg-indigo-600 text-white shadow-xl font-bold flex items-center gap-3">
                        <MessageSquare className="w-4 h-4" /> {tf.f00718}
                    </Button>
                </div>
            </PageHeader>

            <StatsSection />

            <div className="space-y-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white/70 backdrop-blur-xl p-3 rounded-[2rem] border border-white shadow-xl">
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 grow scrollbar-hide">
                        {['all', 'pending', 'processing', 'completed', 'canceled'].map((s) => (
                            <Button 
                                key={s}
                                variant={filterStatus === s ? "default" : "ghost"} 
                                size="sm" 
                                className={cn(
                                    "rounded-full px-6 h-10 text-[11px] font-bold transition-all", 
                                    filterStatus === s ? "bg-slate-900 text-white shadow-xl shadow-slate-200" : "text-slate-400"
                                )}
                                onClick={() => setFilterStatus(s)}
                            >
                                {s === 'all' ? tf.f00553 : s === 'pending' ? tf.f00403 : s === 'processing' ? tf.f00584 : s === 'completed' ? tf.f00272 : tf.f00703}
                            </Button>
                        ))}
                    </div>
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input 
                            placeholder={tf.f00641} 
                            className="h-11 pl-11 rounded-full border-0 bg-slate-50/50 text-xs focus:ring-2 focus:ring-indigo-500 shadow-inner"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-[3rem] border border-slate-100 shadow-3xl overflow-hidden p-2">
                    <Table>
                        <TableHeader className="bg-slate-50/50 text-[10px] uppercase font-black tracking-widest text-slate-400">
                            <TableRow className="hover:bg-transparent border-none">
                                <TableHead className="px-8 py-6">{tf.f00563}</TableHead>
                                <TableHead className="px-8 py-6">{tf.f00236}</TableHead>
                                <TableHead className="px-8 py-6">{tf.f00328}</TableHead>
                                <TableHead className="px-8 py-6 text-right">{tf.f00408}</TableHead>
                                <TableHead className="px-8 py-6 text-center">{tf.f00319}</TableHead>
                                <TableHead className="px-8 py-6 text-right pr-12">{tf.f00087}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-300">
                                            <RefreshCw className="w-10 h-10 animate-spin opacity-20" />
                                            <p className="text-sm font-bold">{tf.f00401}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : filteredOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-64 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-200">
                                            <Package className="w-16 h-16 opacity-10" />
                                            <p className="text-sm font-bold">{tf.f00746}</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredOrders.map((order) => (
                                    <ReceivedOrderRow 
                                        key={order.id} 
                                        order={order} 
                                        onViewDetail={() => { setSelectedOrder(order); setIsDetailOpen(true); }}
                                        onUpdateStatus={updateStatus}
                                        getStatusBadge={getStatusBadge}
                                    />
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>

            <OrderReceivedDetailDialog 
                isOpen={isDetailOpen} 
                onOpenChange={setIsDetailOpen} 
                order={selectedOrder} 
                onUpdateStatus={updateStatus}
                getStatusBadge={getStatusBadge}
            />
        </div>
    );
}

function ReceivedOrderRow({ order, onViewDetail, onUpdateStatus, getStatusBadge }: any) {
    const orderData = order.order_data || {};
    const items = orderData.items || [];
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const baseLocale = toBaseLocale(locale);
    return (
        <TableRow className="group hover:bg-slate-50/50 transition-all duration-300 cursor-pointer h-24" onClick={onViewDetail}>
            <TableCell className="px-8 py-6">
                <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-400">{format(parseISO(order.created_at), 'MM/dd')}</span>
                    <span className="text-[10px] text-slate-300">{format(parseISO(order.created_at), 'HH:mm')}</span>
                </div>
            </TableCell>
            <TableCell className="px-8 py-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                        <div className="text-sm font-black text-slate-800">{order.sender?.name}</div>
                        <div className="text-[10px] text-slate-400 font-light underline decoration-slate-100">{order.sender?.contact_phone || tf.f00447}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="px-8 py-6">
                <div className="space-y-1">
                    <div className="text-xs font-black text-slate-800 line-clamp-1">
                        {items[0]?.name || tf.f00334} {items.length > 1 && `${tf.f00475} ${items.length - 1}${tf.f00033}`}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <Badge className="bg-slate-100 text-slate-500 border-0 h-4 text-[8px] font-black uppercase">{orderData.receipt_type === 'delivery_reservation' ? tf.f00550 : tf.f00196}</Badge>
                        <span className="font-light truncate max-w-[150px]">{order.hide_customer_info ? tf.f00643 : orderData.orderer?.name}</span>
                    </div>
                </div>
            </TableCell>
            <TableCell className="px-8 py-6 text-right">
                <div className="text-sm font-black text-indigo-600">₩{(order.fulfillment_amount || 0).toLocaleString()}</div>
                <div className="text-[10px] text-slate-400 font-light italic mt-0.5">{tf.f00570}</div>
            </TableCell>
            <TableCell className="px-8 py-6 text-center">
                {getStatusBadge(order.status)}
            </TableCell>
            <TableCell className="px-8 py-6 text-right pr-12" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-end gap-2">
                    {order.status === 'pending' && (
                        <Button className="bg-indigo-600 hover:bg-slate-900 text-white rounded-xl h-9 px-5 text-[10px] font-black" onClick={() => onUpdateStatus(order.id, 'processing')}>
                            {tf.f00612}
                        </Button>
                    )}
                    {order.status === 'processing' && (
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl h-9 px-5 text-[10px] font-black" onClick={() => onUpdateStatus(order.id, 'completed')}>
                            {tf.f00250}
                        </Button>
                    )}
                    <Button variant="ghost" className="rounded-xl h-9 w-9 p-0 text-slate-300 hover:bg-slate-100 hover:text-slate-600" onClick={onViewDetail}>
                        <ChevronRight className="w-5 h-5" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
}

function OrderReceivedDetailDialog({ isOpen, onOpenChange, order, onUpdateStatus, getStatusBadge }: any) {
    const locale = usePreferredLocale();
    const tf = getMessages(locale).tenantFlows;
    const baseLocale = toBaseLocale(locale);
    const tr = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);
    if (!order) return null;
    const orderData = order.order_data || {};
    const items = orderData.items || [];
    const messageTypeLabel = (() => {
        const raw = orderData.message?.type as string | undefined;
        if (raw === "ribbon") return tf.f00179;
        if (raw === "none") return tf.f00441;
        return tf.f00207;
    })();

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl rounded-[3rem] p-0 overflow-hidden border-0 shadow-3xl bg-[#F8FAFC]">
                <div className="bg-slate-900 p-10 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-indigo-400">
                                <Package className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black">{tf.f00402}</h3>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                    {tr("네트워크 주문 상세", "Network order details", "Chi tiết đơn liên kết")}
                                </p>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 mt-8">
                             <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl">
                                <span className="text-[10px] text-slate-400 block mb-1">{tf.f00236}</span>
                                <span className="text-sm font-black">{order.sender?.name}</span>
                             </div>
                             <div className="bg-white/5 border border-white/10 px-6 py-3 rounded-2xl ml-auto">
                                <span className="text-[10px] text-slate-400 block mb-1">{tf.f00124}</span>
                                <span className="text-xl font-black text-indigo-400">₩{(order.fulfillment_amount || 0).toLocaleString()}</span>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="p-10 space-y-8 max-h-[60vh] overflow-y-auto scrollbar-hide">
                    {/* Status Logic */}
                    <div className="flex items-center justify-between bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                         <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                <Clock className="w-6 h-6" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                                    {tr("상태", "Status", "Trạng thái")}
                                </div>
                                {getStatusBadge(order.status)}
                            </div>
                         </div>
                         <div className="flex gap-2">
                             {order.status === 'pending' && (
                                <Button className="bg-indigo-600 hover:bg-slate-900 text-white rounded-2xl font-bold h-12 px-8" onClick={() => onUpdateStatus(order.id, 'processing')}>{tf.f00613}</Button>
                             )}
                             {order.status === 'processing' && (
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold h-12 px-8" onClick={() => onUpdateStatus(order.id, 'completed')}>{tf.f00695}</Button>
                             )}
                             {order.status === 'completed' && <div className="text-emerald-500 font-bold flex items-center gap-2"><CheckCircle2 className="w-5 h-5" /> {tf.f00273}</div>}
                         </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Order Items */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Separator className="w-8" /> {tf.f00581}
                            </h4>
                            <div className="space-y-2">
                                {items.map((item: any, idx: number) => (
                                    <div key={idx} className="bg-white p-5 rounded-3xl border border-slate-100 flex items-center justify-between">
                                        <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                                        <div className="text-xs text-indigo-600 font-black">{item.quantity}{tf.f00025}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Delivery Info */}
                        <div className="space-y-4">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                                <Separator className="w-8" /> {tf.f00251}
                            </h4>
                            <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-4 shadow-xl">
                                <div>
                                    <div className="text-[10px] text-white/40 font-bold mb-1">{tf.f00387}</div>
                                    <div className="text-sm font-black">{orderData.delivery_info?.recipientName || tf.f00224}</div>
                                    <div className="text-xs text-white/60 font-medium mt-0.5">{orderData.delivery_info?.recipientContact || ''}</div>
                                </div>
                                <Separator className="bg-white/10" />
                                <div>
                                    <div className="text-[10px] text-white/40 font-bold mb-1">{tf.f00276}</div>
                                    <div className="text-xs font-medium leading-relaxed">{orderData.delivery_info?.address || tf.f00653}</div>
                                </div>
                                <Separator className="bg-white/10" />
                                <div className="flex justify-between items-end">
                                    <div>
                                        <div className="text-[10px] text-white/40 font-bold mb-1">{tf.f00257}</div>
                                        <div className="text-sm font-black text-amber-400">{orderData.delivery_info?.date} {orderData.delivery_info?.time}</div>
                                    </div>
                                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[9px] font-black">
                                        {orderData.delivery_info?.itemSize || "S"}{" "}
                                        {tr("사이즈", "SIZE", "Cỡ")}
                                    </Badge>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Branding / Message Section */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                        <div className="flex items-center gap-4 py-4 border-b border-slate-50">
                             <div className="w-14 h-14 rounded-full bg-slate-50 flex items-center justify-center p-2 border border-slate-100 italic font-black text-indigo-600 text-xs">
                                {orderData.sender_branding?.logo_url ? (
                                    <img src={orderData.sender_branding.logo_url} alt={tr("로고", "Logo", "Logo")} />
                                ) : (
                                    tr("브랜드", "Brand", "Thương hiệu")
                                )}
                             </div>
                             <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase">{tf.f00235}</div>
                                <div className="text-sm font-black text-slate-800">{orderData.sender_branding?.name || order.sender?.name}</div>
                             </div>
                             <div className="ml-auto flex items-center gap-2">
                                <Button variant="ghost" className="rounded-full w-10 h-10 p-0 text-slate-400 hover:text-indigo-600"><Printer size={18} /></Button>
                                <Button variant="ghost" className="rounded-full w-10 h-10 p-0 text-slate-400 hover:text-indigo-600"><Download size={18} /></Button>
                             </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-[10px] font-black text-slate-400 uppercase">
                                {tf.f00200} ({messageTypeLabel})
                            </div>
                            <div className="p-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 min-h-[100px] text-sm text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">
                                {orderData.message?.content || tf.f00184}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="text-[10px] font-black text-slate-400 uppercase">{tf.f00234}</div>
                            <div className="p-4 bg-amber-50 rounded-2xl text-xs text-amber-700 font-medium">
                                {order.notes || tf.f00719}
                            </div>
                        </div>
                    </div>

                    {/* Delivery Evidence Section */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
                            <Separator className="w-8" /> {tf.f00255}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                             <div className="aspect-[4/3] rounded-3xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-indigo-400 hover:text-indigo-400 transition-all cursor-pointer">
                                <Camera className="w-10 h-10 opacity-20" />
                                <span className="text-[10px] font-black">{tf.f00576}</span>
                             </div>
                             <div className="aspect-[4/3] rounded-3xl border-2 border-dashed border-slate-200 bg-white flex flex-col items-center justify-center gap-2 text-slate-300 hover:border-indigo-400 hover:text-indigo-400 transition-all cursor-pointer">
                                <Camera className="w-10 h-10 opacity-20" />
                                <span className="text-[10px] font-black">{tf.f00248}</span>
                             </div>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-8 bg-white border-t border-slate-50 flex gap-4">
                    <Button variant="ghost" className="flex-1 rounded-2xl h-14 font-bold text-slate-400" onClick={() => onOpenChange(false)}>{tf.f00674}</Button>
                    <Button className="flex-[2] rounded-2xl bg-slate-900 text-white h-14 font-black shadow-2xl hover:bg-indigo-600 transition-all">{tf.f00498}</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
