"use client";

import { useState, useMemo } from "react";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CustomerTable } from "./components/customer-table";
import { CustomerForm } from "./components/customer-form";
import { useCustomers } from "@/hooks/use-customers";
import { Customer, CustomerData } from "@/types/customer";
import { Plus, Search, RefreshCw, Users, UserCheck, Star, Clock } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { Skeleton } from "@/components/ui/skeleton";

export default function CustomersPage() {
  const { profile, isLoading: authLoading } = useAuth();
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

  const handleCreateNew = () => {
    setEditingCustomer(null);
    setIsFormOpen(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsFormOpen(true);
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
        <div className="flex items-center gap-2">
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
            onClick={handleCreateNew}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
          >
            <Plus className="h-4 w-4 mr-2" />
            고객 추가
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
      />

      <CustomerForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        customer={editingCustomer}
      />
    </div>
  );
}
