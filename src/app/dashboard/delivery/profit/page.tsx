"use client";
import { getMessages } from "@/i18n/getMessages";

import React, { useMemo, useState } from "react";
import { format } from "date-fns";
import { Truck, TrendingUp, DollarSign, Package, Search } from "lucide-react";

import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useOrders } from "@/hooks/use-orders";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function DeliveryProfitPage() {
  const { orders, loading } = useOrders();
  const [searchTerm, setSearchTerm] = useState("");
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const isKo = toBaseLocale(locale) === "ko";  const deliveryOrders = useMemo(() => {
    return orders.filter(
      (order) => 
        order.receipt_type === "delivery_reservation" &&
        (
          order.orderer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (order.delivery_info?.driverAffiliation || "").toLowerCase().includes(searchTerm.toLowerCase())
        )
    ).sort((a, b) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
  }, [orders, searchTerm]);

  const stats = useMemo(() => {
    let totalReceived = 0;
    let totalActual = 0;

    deliveryOrders.forEach((o) => {
      totalReceived += o.summary.deliveryFee || 0;
      totalActual += o.actual_delivery_cost || 0;
    });

    return {
      totalReceived,
      totalActual,
      profit: totalReceived - totalActual,
      count: deliveryOrders.length
    };
  }, [deliveryOrders]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <PageHeader 
        title={tf.f00263} 
        description={tf.f00083}
        icon={TrendingUp}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="border-none shadow-md bg-gradient-to-br from-indigo-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-indigo-700">
              <Package className="w-4 h-4" /> {tf.f00241}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-indigo-900">{stats.count}{tf.f00033}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-blue-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-blue-700">
              <DollarSign className="w-4 h-4" /> {tf.f00073}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">₩{stats.totalReceived.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-rose-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-rose-700">
              <Truck className="w-4 h-4" /> {tf.f00419}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-900">₩{stats.totalActual.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-md bg-gradient-to-br from-emerald-50 to-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2 text-emerald-700">
              <TrendingUp className="w-4 h-4" /> {tf.f00264}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
              {stats.profit > 0 ? "+" : ""}₩{stats.profit.toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-xl">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <div>
            <CardTitle>{tf.f00312}</CardTitle>
            <CardDescription>{tf.f00026}</CardDescription>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder={tf.f00625}
              className="pl-9 bg-gray-50 border-gray-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
             <div className="h-40 flex items-center justify-center text-gray-400">{tf.f00157}</div>
          ) : (
             <Table>
                <TableHeader>
                   <TableRow className="hover:bg-transparent">
                      <TableHead className="font-bold text-slate-700">{tf.f00128}</TableHead>
                      <TableHead className="font-bold text-slate-700">{tf.f00076}</TableHead>
                      <TableHead className="font-bold text-slate-700">{tf.f00266}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{tf.f00682}</TableHead>
                      <TableHead className="text-right font-bold text-slate-700">{tf.f00421}</TableHead>
                      <TableHead className="text-right font-black text-slate-700">{tf.f00672}</TableHead>
                   </TableRow>
                </TableHeader>
                <TableBody>
                   {deliveryOrders.length === 0 ? (
                      <TableRow>
                         <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">{tf.f00133}</TableCell>
                      </TableRow>
                   ) : (
                      deliveryOrders.map(order => {
                        const received = order.summary.deliveryFee || 0;
                        const actual = order.actual_delivery_cost || 0;
                        const profit = received - actual;
                        return (
                          <TableRow key={order.id} className="hover:bg-slate-50 transition-colors">
                             <TableCell>
                                <div className="font-medium text-slate-900">{format(new Date(order.order_date), "yyyy-MM-dd")}</div>
                                <div className="text-xs text-muted-foreground font-mono mt-0.5">#{order.order_number}</div>
                             </TableCell>
                             <TableCell className="font-bold text-slate-800">{order.orderer.name}</TableCell>
                             <TableCell>
                               <Badge variant="outline" className="bg-white">{order.delivery_info?.driverAffiliation || tf.f00226}</Badge>
                             </TableCell>
                             <TableCell className="text-right font-semibold text-blue-600">₩{received.toLocaleString()}</TableCell>
                             <TableCell className="text-right font-semibold text-rose-600">₩{actual.toLocaleString()}</TableCell>
                             <TableCell className={`text-right font-bold tracking-tight text-lg ${profit >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                               {profit > 0 ? "+" : ""}₩{profit.toLocaleString()}
                             </TableCell>
                          </TableRow>
                        )
                      })
                   )}
                </TableBody>
             </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
