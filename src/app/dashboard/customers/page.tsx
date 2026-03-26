"use client";

import { useState, useMemo } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { exportToExcel } from "@/lib/excel-export";
import { format } from "date-fns";

export default function CustomersPage() {
  const supabase = createClient();
  const { profile, tenantId, isLoading: authLoading } = useAuth();
  const plan = profile?.tenants?.plan || "free";
  const isSuperAdmin = profile?.role === 'super_admin';

  const { 
    customers, 
    loading, 
    isRefreshing, 
    fetchCustomers, 
    addCustomer, 
    updateCustomer, 
    deleteCustomer 
  } = useCustomers();

  const hasAccess = authLoading || isSuperAdmin || ['pro', 'erp_only'].includes(plan);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isStatementOpen, setIsStatementOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isEstimateOpen, setIsEstimateOpen] = useState(false);
  const [isRegistryOpen, setIsRegistryOpen] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!searchTerm) return customers;
    const lowerSearch = searchTerm.toLowerCase();
    return customers.filter(c => 
      c.name.toLowerCase().includes(lowerSearch) || 
      (c.contact?.includes(searchTerm)) ||
      (c.company_name?.toLowerCase().includes(lowerSearch))
    );
  }, [customers, searchTerm]);

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
      toast.error("내보낼 고객 데이터가 없습니다.");
      return;
    }
    
    const dataToExport = filteredCustomers.map(customer => ({
        '고객명': customer.name || '',
        '고객분류': customer.type === 'company' ? '기업' : '개인',
        '회사명': customer.company_name || '',
        '연락처': customer.contact || '',
        '이메일': customer.email || '',
        '주소': customer.address || '',
        '등급': customer.grade || '신규',
        '보유포인트': customer.points || 0,
        '누적구매액': customer.total_spent || 0,
        '주문횟수': customer.order_count || 0,
        '메모': customer.memo || '',
        '등록일': customer.created_at ? format(new Date(customer.created_at), 'yyyy-MM-dd HH:mm') : '',
    }));
    
    const today = format(new Date(), 'yyyy-MM-dd');
    exportToExcel(dataToExport, `고객리스트_${today}.xlsx`, "고객목록");
    toast.success(`${dataToExport.length}명의 고객 정보가 엑셀로 저장되었습니다.`);
  };

  const handleSyncFromOrders = async () => {
    if (!tenantId) return;
    try {
      const { data: oData, error: oErr } = await supabase
        .from('orders')
        .select('id, orderer, summary, order_date')
        .eq('tenant_id', tenantId);
      
      const { data: cData, error: cErr } = await supabase
        .from('customers')
        .select('id, contact')
        .eq('tenant_id', tenantId)
        .eq('is_deleted', false);

      if (oErr || cErr) throw oErr || cErr;

      // 2. Map and calculate updates
      let totalUpdated = 0;
      for (const customer of (cData || [])) {
        const contactNoHyphens = customer.contact?.replace(/-/g, '');
        const matchingOrders = (oData || []).filter((o: any) => 
          o.orderer?.contact === customer.contact || 
          (contactNoHyphens && o.orderer?.contact === contactNoHyphens)
        );

        if (matchingOrders.length > 0) {
          const total_spent = matchingOrders.reduce((sum: number, o: any) => sum + (Number(o.summary?.total) || 0), 0);
          const order_count = matchingOrders.length;
          const sorted = matchingOrders.sort((a: any, b: any) => new Date(b.order_date).getTime() - new Date(a.order_date).getTime());
          const last_order_date = sorted[0].order_date;

          await supabase.from('customers').update({
            total_spent,
            order_count,
            last_order_date
          }).eq('id', customer.id);
          totalUpdated++;
        }
      }

      toast.success(`${totalUpdated}명의 고객 정보가 최신 데이터로 동기화되었습니다.`);
      fetchCustomers();
    } catch (err) {
      console.error("Sync error:", err);
      toast.error("동기화 중 오류가 발생했습니다.");
    } finally {
      // isRefreshing is managed by hook, if we want to show loading during sync
      // we could add a local state, but for now we rely on toast and fetchCustomers reload
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

  const handleFormSubmit = async (data: CustomerData) => {
    try {
      if (editingCustomer) {
        const success = await updateCustomer(editingCustomer.id, data);
        if (success) toast.success("고객 정보가 수정되었습니다.");
      } else {
        const id = await addCustomer(data);
        if (id) toast.success("새 고객이 등록되었습니다.");
      }
      setIsFormOpen(false);
    } catch (error) {
      toast.error("저장 중 오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const success = await deleteCustomer(id);
      if (success) toast.success("고객 정보가 삭제되었습니다.");
    } catch (error) {
      toast.error("삭제 중 오류가 발생했습니다.");
    }
  };

  if (!hasAccess) {
    return <AccessDenied requiredTier="ERP" />;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <PageHeader
        title="고객 관리"
        description="고객별 구매 성향과 주문 내역을 통합 관리하여 맞춤형 서비스를 제공합니다."
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
            새로고침
          </Button>
          <Button 
              variant="outline" 
              size="sm"
              className="gap-2 font-bold bg-white border-slate-200 h-9 px-4 rounded-lg hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
              onClick={() => setIsRegistryOpen(true)}
          >
            <Archive className="text-amber-500" size={16} />
            디지털 서류함
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            className="gap-2 font-bold bg-white border-slate-200 h-9 px-4 rounded-lg hover:bg-slate-50 transition-all text-slate-400 shadow-sm"
            onClick={handleExport}
          >
            <Download size={16} />
            엑셀 내보내기
          </Button>
          <Button 
            size="sm"
            className="gap-2 font-black bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200 h-9 px-6 rounded-lg transition-all"
            onClick={handleCreateNew}
          >
            <Plus size={16} />
            신규 고객 등록
          </Button>
        </div>
      </PageHeader>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-none shadow-sm bg-blue-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-blue-600 font-semibold mb-1 uppercase tracking-wider">전체 고객</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-blue-900">{stats.total}</span>
              <Users className="h-4 w-4 text-blue-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-purple-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-purple-600 font-semibold mb-1 uppercase tracking-wider">VIP 고객</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-purple-900">{stats.vip}</span>
              <Star className="h-4 w-4 text-purple-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-emerald-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-emerald-600 font-semibold mb-1 uppercase tracking-wider">신규 (30일)</span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-900">{stats.recent}</span>
              <Clock className="h-4 w-4 text-emerald-300" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-amber-50/50">
          <CardContent className="p-4 flex flex-col pt-4">
            <span className="text-xs text-amber-600 font-semibold mb-1 uppercase tracking-wider">우수 고객</span>
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
              누적 구매 랭킹 TOP 5
            </h3>
            <span className="text-blue-100 text-xs font-medium">최우수 고객</span>
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
                      <span className="text-sm font-bold text-slate-800">{c.name}</span>
                      <span className="text-[10px] text-slate-500">{c.company_name || '개인'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-blue-600">₩{(Number(c.total_spent) || 0).toLocaleString()}</p>
                    <p className="text-[10px] text-slate-400 font-medium">{c.order_count || 0}회 주문</p>
                  </div>
                </div>
              ))}
              {rankings.topBuyers.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">데이터가 없습니다.</div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm overflow-hidden bg-white">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-4 flex items-center justify-between">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Medal className="h-5 w-5 text-white" />
              보유 포인트 랭킹 TOP 5
            </h3>
            <span className="text-amber-100 text-xs font-medium">포인트 우수 고객</span>
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
                      <span className="text-sm font-bold text-slate-800">{c.name}</span>
                      <span className="text-[10px] text-slate-500">{c.company_name || '개인'}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-amber-600">{(c.points || 0).toLocaleString()} P</p>
                    <p className="text-[10px] text-slate-400 font-medium">사용 가능 포인트</p>
                  </div>
                </div>
              ))}
              {rankings.topPoints.length === 0 && (
                <div className="p-8 text-center text-slate-400 text-sm">데이터가 없습니다.</div>
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
            placeholder="고객명, 연락처, 회사명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 border-slate-200 bg-white shadow-sm focus:ring-blue-500/20"
          />
        </div>
      </div>

      {/* Customer Table */}
      <CustomerTable
        customers={filteredCustomers}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onRowClick={handleRowClick}
      />

      <CustomerDetailDialog
        customer={selectedCustomer}
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
      />
      <EstimateDialog
        customer={selectedCustomer}
        isOpen={isEstimateOpen}
        onOpenChange={setIsEstimateOpen}
      />
    </div>
  );
}
