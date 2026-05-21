"use client";
import { getMessages } from "@/i18n/getMessages";

import { useState, useMemo, useRef } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerTable } from "./components/customer-table";
import { CustomerForm } from "./components/customer-form";
import { CustomerDetailDialog } from "./components/customer-detail-dialog";
import { StatementDialog } from "./components/statement-dialog";
import { EstimateDialog } from "./components/estimate-dialog";
import { DocumentRegistryDialog } from "./components/document-registry-dialog";
import { useCustomers } from "@/hooks/use-customers";
import { Customer, CustomerData } from "@/types/customer";
import { Plus, Search, RefreshCw, Users, UserCheck, Star, Clock, Download, History as HistoryIcon, Trophy, Medal, Archive } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/utils/supabase/client";
import { AccessDenied } from "@/components/access-denied";
import { useTenantPlanAccess } from "@/hooks/use-tenant-plan-access";
import { ErpTrialBanner } from "@/components/subscription/erp-trial-banner";
import { requireErpPersist } from "@/lib/subscription/erp-trial";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToExcel } from "@/lib/excel-export";
import { format } from "date-fns";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { dateFnsLocaleForBase } from "@/lib/date-fns-locale";
import {
  buildDuplicateCustomerDisplayNames,
  computeCustomerOrderStats,
  filterOrdersForCustomer,
  getCustomerDisplayName,
} from "@/lib/customer-order-match";

export default function CustomersPage() {
  const supabase = createClient();
  const { profile, tenantId, isSuperAdmin, isLoading: authLoading } = useAuth();
  const plan = profile?.tenants?.plan || (isSuperAdmin ? "pro" : "free");
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const dfLoc = dateFnsLocaleForBase(toBaseLocale(locale));
  const { 
    customers, 
    loading, 
    isRefreshing, 
    fetchCustomers, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer 
  } = useCustomers();

  const { hasErpViewAccess, isErpTrial, ctx: planCtx } = useTenantPlanAccess();
  const hasAccess = authLoading || isSuperAdmin || hasErpViewAccess;
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isEstimateOpen, setIsEstimateOpen] = useState(false);
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  const customerSaveLockRef = useRef(false);

  const customerDisplayNames = useMemo(
    () => buildDuplicateCustomerDisplayNames(customers),
    [customers]
  );

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const lowerSearch = searchTerm.toLowerCase();
    return customers.filter((c) => {
      const displayName = getCustomerDisplayName(c, customerDisplayNames).toLowerCase();
      return (
        displayName.includes(lowerSearch) ||
        c.name.toLowerCase().includes(lowerSearch) ||
        c.contact?.includes(searchTerm) ||
        c.company_name?.toLowerCase().includes(lowerSearch)
      );
    });
  }, [customers, searchTerm, customerDisplayNames]);

  const stats = useMemo(() => {
    return {
      total: customers.length,
      vip: customers.filter(c => c.grade === 'VIP' || c.grade === 'VVIP').length,
      recent: customers.filter(c => {
        const created = new Date(c.created_at);
        const now = new Date();
        const diff = (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
        return diff < 30;
      }).length,
      topSpenders: customers.filter(c => (c.total_spent || 0) > 1000000).length
    };
  }, [customers]);

  const rankings = useMemo(() => {
    return {
      topBuyers: [...customers].sort((a, b) => (Number(b.total_spent) || 0) - (Number(a.total_spent) || 0)).slice(0, 5),
      topPoints: [...customers].sort((a, b) => (b.points || 0) - (a.points || 0)).slice(0, 5)
    };
  }, [customers]);

  const handleCreateNew = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const handleExport = () => {
    if (filteredCustomers.length === 0) {
      toast.error(tf.f00130);
      return;
    }
    
    const dataToExport = filteredCustomers.map(customer => ({
        [tf.f00076]: customer.name || '',
        [tf.f00081]: customer.type === 'company' ? tf.f00109 : tf.f00028,
        [tf.f00779]: customer.company_name || '',
        [tf.f00444]: customer.contact || '',
        [tf.f00504]: customer.email || '',
        [tf.f00650]: customer.address || '',
        [tf.f00163]: customer.grade || tf.f00415,
        [tf.f00288]: customer.points || 0,
        [tf.f00146]: customer.total_spent || 0,
        [tf.f00649]: customer.order_count || 0,
        [tf.f00197]: customer.memo || '',
        [tf.f00170]: customer.created_at
          ? format(new Date(customer.created_at), "Pp", { locale: dfLoc })
          : "",
    }));
    
    const today = format(new Date(), 'yyyy-MM-dd');
    exportToExcel(dataToExport, `${tf.f00075}_${today}.xlsx`, tf.f00079);
    toast.success(
      tf.f00806.replace("{count}", String(dataToExport.length))
    );
  };

  const handleSyncFromOrders = async () => {
    if (!tenantId) return;
    try {
      const { data: oData, error: oErr } = await supabase
        .from("orders")
        .select("id, orderer, summary, order_date, status")
        .eq("tenant_id", tenantId);

      const { data: cData, error: cErr } = await supabase
        .from("customers")
        .select("id, contact")
        .eq("tenant_id", tenantId)
        .eq("is_deleted", false);

      if (oErr || cErr) throw oErr || cErr;

      let totalUpdated = 0;
      for (const customer of cData || []) {
        const matchingOrders = filterOrdersForCustomer(oData || [], customer);
        const stats = computeCustomerOrderStats(matchingOrders);

        await supabase
          .from("customers")
          .update({
            total_spent: stats.total_spent,
            order_count: stats.order_count,
            last_order_date: stats.last_order_date,
          })
          .eq("id", customer.id);
        totalUpdated++;
      }

      toast.success(tf.f00807.replace("{count}", String(totalUpdated)));
      fetchCustomers();
    } catch (err) {
      console.error("Sync error:", err);
      toast.error(tf.f00160);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
  };

  const handleRowClick = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailOpen(true);
  };

  const syncAnniversaries = async (customerId: string, data: CustomerData) => {
    const rows = (data.anniversaries ?? []).filter((row) => row.anniversary_date?.trim());
    await fetch("/api/revenue/anniversary", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        marketing_consent: data.marketing_consent,
        anniversaries: rows.map((row) => ({
          id: row.id,
          label: row.label || "기념일",
          anniversary_date: row.anniversary_date,
          recurring_yearly: row.recurring_yearly ?? true,
          preferred_flowers: row.preferred_flowers,
          allergies: row.allergies,
        })),
      }),
    });
  };

  const handleFormSubmit = async (data: CustomerData) => {
    if (!requireErpPersist(planCtx, locale)) return;
    if (!tenantId) return;
    if (customerSaveLockRef.current) return;

    customerSaveLockRef.current = true;
    setIsSavingCustomer(true);
    try {
      const {
        point_adjustment_reason,
        point_adjustment_idempotency_key,
        ...customerRow
      } = data;
      const newPoints = customerRow.points ?? 0;
      const { points: _omitPoints, ...customerRowWithoutPoints } = customerRow;

      const adjustPoints = async (customerId: string) => {
        const res = await fetch("/api/customers/point-adjustment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_id: customerId,
            target_points: newPoints,
            reason: point_adjustment_reason,
            idempotency_key: point_adjustment_idempotency_key,
          }),
        });
        const json = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          error?: string;
          points?: number;
        };
        if (!res.ok || json.ok === false) {
          throw new Error(json.error ?? "POINT_ADJUST_FAILED");
        }
        return json.points ?? newPoints;
      };

      if (editingCustomer) {
        const previousPoints = editingCustomer.points ?? 0;
        const pointsChanged = newPoints !== previousPoints;
        const success = await updateCustomer(editingCustomer.id, customerRowWithoutPoints);
        if (success) {
          const finalPoints = pointsChanged
            ? await adjustPoints(editingCustomer.id)
            : previousPoints;
          await syncAnniversaries(editingCustomer.id, data);
          if (selectedCustomer?.id === editingCustomer.id) {
            setSelectedCustomer((prev) =>
              prev ? { ...prev, ...customerRowWithoutPoints, points: finalPoints } : null,
            );
          }
          setEditingCustomer((prev) =>
            prev ? { ...prev, ...customerRowWithoutPoints, points: finalPoints } : null,
          );
          toast.success(tf.f00072);
          setIsFormOpen(false);
        }
      } else {
        const id = await addCustomer({ ...customerRowWithoutPoints, points: 0 });
        if (id) {
          const finalPoints = newPoints > 0 ? await adjustPoints(id) : 0;
          await syncAnniversaries(id, data);
          toast.success(tf.f00343);
          setIsFormOpen(false);
          void finalPoints;
        }
      }
    } catch (error) {
      console.error(error);
      toast.error(
        pickUiText(
          toBaseLocale(locale),
          "저장 중 오류가 발생했습니다. 포인트 내역이 중복되지 않았는지 확인해 주세요.",
          "Save failed. Check whether point history was duplicated.",
        ),
      );
    } finally {
      customerSaveLockRef.current = false;
      setIsSavingCustomer(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!requireErpPersist(planCtx, locale)) return;
    try {
      const success = await deleteCustomer(id);
      if (success) toast.success(tf.f00071);
    } catch (error) {
      toast.error(tf.f00307);
    }
  };

  if (!hasAccess) {
    return <AccessDenied requiredTier="ERP" />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {isErpTrial ? <ErpTrialBanner /> : null}
      <PageHeader
        title={tf.f00061}
        description={tf.f00080}
        icon={Users}
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => fetchCustomers()}
            disabled={isRefreshing}
            className="hidden sm:flex border-slate-200"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            {tf.f00348}
          </Button>
          <Button 
              variant="outline" 
              size="sm"
              className="gap-2 font-bold bg-white border-slate-200 h-9 px-4 rounded-lg hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
              onClick={() => setIsRegistryOpen(true)}
          >
            <Archive className="text-amber-500" size={16} />
            {tf.f00172}
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 font-bold bg-white border-slate-200 h-9 px-4 rounded-lg hover:bg-slate-50 transition-all text-slate-400 shadow-sm"
            onClick={handleExport}
          >
            <Download size={16} />
            {tf.f00443}
          </Button>
          <Button 
            size="sm"
            className="gap-2 font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 h-9 px-6 rounded-lg transition-all"
            onClick={handleCreateNew}
          >
            <Plus size={16} />
            {tf.f00418}
          </Button>
        </div>
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">{tf.f00554}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-900">{stats.total}</span>
              <Users className="h-4 w-4 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-purple-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-purple-600 font-semibold mb-1 uppercase tracking-wider">{tf.f00786}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-900">{stats.vip}</span>
              <Star className="h-4 w-4 text-purple-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-emerald-600 font-semibold mb-1 uppercase tracking-wider">{tf.f00416}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-900">{stats.recent}</span>
              <Clock className="h-4 w-4 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-amber-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-amber-600 font-semibold mb-1 uppercase tracking-wider">{tf.f00485}</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-amber-900">{stats.topSpenders}</span>
              <UserCheck className="h-4 w-4 text-amber-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rankings Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4 flex items-center justify-between">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-300" />
              {tf.f00145}
            </h3>
            <span className="text-blue-100 text-xs font-medium">{tf.f00691}</span>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {rankings.topBuyers.map((c, i) => (
                <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleRowClick(c)}>
                  <div className="flex items-center gap-3">
                    <span className={`w-5 text-center font-black ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-slate-300'}`}>
                      {i + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">
                        {getCustomerDisplayName(c, customerDisplayNames)}
                      </span>
                      <span className="text-[10px] text-slate-500">{c.company_name || tf.f00028}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-600">₩{(Number(c.total_spent) || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{c.order_count || 0}{tf.f00778}</p>
                  </div>
                </div>
              ))}
              {rankings.topBuyers.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">{tf.f00155}</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 flex items-center justify-between">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Medal className="h-5 w-5 text-white" />
              {tf.f00287}
            </h3>
            <span className="text-amber-100 text-xs font-medium">{tf.f00733}</span>
          </div>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-50">
              {rankings.topPoints.map((c, i) => (
                <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleRowClick(c)}>
                  <div className="flex items-center gap-3">
                    <span className={`w-5 text-center font-black ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-slate-400' : i === 2 ? 'text-amber-600' : 'text-slate-300'}`}>
                      {i + 1}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-slate-800">
                        {getCustomerDisplayName(c, customerDisplayNames)}
                      </span>
                      <span className="text-[10px] text-slate-500">{c.company_name || tf.f00028}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-amber-600">{(c.points || 0).toLocaleString()} P</p>
                    <p className="text-[10px] text-slate-400 font-medium">{tf.f00303}</p>
                  </div>
                </div>
              ))}
              {rankings.topPoints.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">{tf.f00155}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder={tf.f00077}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-slate-200 bg-white shadow-sm focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Customer Table */}
      <CustomerTable
        customers={filteredCustomers}
        displayNames={customerDisplayNames}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRowClick={handleRowClick}
      />

      <CustomerDetailDialog
        customer={selectedCustomer}
        displayName={
          selectedCustomer
            ? getCustomerDisplayName(selectedCustomer, customerDisplayNames)
            : undefined
        }
        isOpen={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={handleEdit}
        onIssueStatement={(c) => {
          setSelectedCustomer(c);
          setIsStatementOpen(true);
        }}
        onIssueReceipt={(c) => {
          setSelectedCustomer(c);
          setIsReceiptOpen(true);
        }}
        onIssueEstimate={(c) => {
          setSelectedCustomer(c);
          setIsEstimateOpen(true);
        }}
      />

      <StatementDialog 
        customer={selectedCustomer} 
        isOpen={isStatementOpen} 
        onOpenChange={setIsStatementOpen} 
        type="statement"
      />

      <StatementDialog 
        customer={selectedCustomer} 
        isOpen={isReceiptOpen} 
        onOpenChange={setIsReceiptOpen} 
        type="receipt"
      />

      <CustomerForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        customer={editingCustomer}
        isSaving={isSavingCustomer}
      />
      <EstimateDialog
        customer={selectedCustomer}
        isOpen={isEstimateOpen}
        onOpenChange={setIsEstimateOpen}
      />
    </div>
  );
}
