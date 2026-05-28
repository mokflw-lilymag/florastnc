"use client";
import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
const supabase = createClient();
import { useToast } from './use-toast';
export interface BranchFormValues {
  name: string;
  type: string;
  address: string;
  phone: string;
  manager?: string;
  businessNumber?: string;
  employeeCount?: number;
  account?: string;
}

export interface DeliveryFee {
  district: string;
  fee: number;
}

export interface Surcharges {
  mediumItem?: number;
  largeItem?: number;
  express?: number;
}

export interface AlimtalkConfig {
  apiKey: string;
  apiSecret: string;
  pfid: string;
  templateId: string;
}

export interface Branch extends BranchFormValues {
  id: string;
  email?: string;
  extraData?: any;
  deliveryFees?: DeliveryFee[];
  surcharges?: Surcharges;
  alimtalkConfig?: AlimtalkConfig;
}

export function useBranches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchBranches = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('branches')
        .select('*');

      if (error) throw error;

      const branchesData = (data || []).map(row => ({
        id: row.id,
        name: row.name,
        type: row.type,
        address: row.address,
        phone: row.phone,
        email: row.extra_data?.email || '',
        extraData: row.extra_data || {},
        manager: row.manager,
        businessNumber: row.business_number,
        employeeCount: row.employee_count,
        deliveryFees: row.delivery_fees,
        surcharges: row.surcharges,
        alimtalkConfig: row.alimtalk_config,
        account: row.account
      } as Branch));

      branchesData.sort((a, b) => {
        if (a.type === '본사') return -1;
        if (b.type === '본사') return 1;
        return a.name.localeCompare(b.name);
      });

      setBranches(branchesData);
    } catch (error: any) {
      console.error('Error fetching branches:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: '지점 정보를 불러오는 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchBranches();
  }, [fetchBranches]);

  const addBranch = async (branch: Branch) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('branches')
        .insert([{
          id: branch.id || crypto.randomUUID(), 
          name: branch.name,
          type: branch.type,
          address: branch.address,
          phone: branch.phone,
          manager: branch.manager,
          business_number: branch.businessNumber,
          employee_count: branch.employeeCount,
          account: branch.account,
          delivery_fees: branch.deliveryFees || [],
          surcharges: branch.surcharges || {},
          alimtalk_config: branch.alimtalkConfig || { apiKey: '', apiSecret: '', pfid: '', templateId: '' },
          extra_data: { ...(branch.extraData || {}), email: branch.email }
        }]);

      if (error) throw error;

      toast({
        title: '성공',
        description: '새 지점이 성공적으로 추가되었습니다.',
      });
      await fetchBranches();
    } catch (error: any) {
      console.error('Error adding branch:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: error.message || '지점 추가 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBranch = async (branchId: string, branch: Branch) => {
    try {
      console.log('업데이트 시도:', { branchId, branch });
      setLoading(true);
      
      const updatePayload: any = {
        name: branch.name,
        type: branch.type,
        address: branch.address,
        phone: branch.phone,
        manager: branch.manager,
        business_number: branch.businessNumber,
        employee_count: branch.employeeCount,
        account: branch.account,
        extra_data: { ...(branch.extraData || {}), email: branch.email }
      };

      // deliveryFees나 surcharges가 존재하면 함께 업데이트
      if (branch.deliveryFees) updatePayload.delivery_fees = branch.deliveryFees;
      if (branch.surcharges) updatePayload.surcharges = branch.surcharges;
      if (branch.alimtalkConfig) updatePayload.alimtalk_config = branch.alimtalkConfig;

      const { error } = await supabase
        .from('branches')
        .update(updatePayload)
        .eq('id', branchId);

      if (error) {
        console.error('Supabase Update Error:', error);
        throw error;
      }

      toast({
        title: '성공',
        description: '지점 정보가 성공적으로 수정되었습니다.',
      });
      await fetchBranches();
    } catch (error: any) {
      console.error('Error updating branch:', error);
      toast({
        variant: 'destructive',
        title: '오류',
        description: error.message || '지점 정보 수정 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  const deleteBranch = async (branchId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from('branches')
        .delete()
        .eq('id', branchId);

      if (error) throw error;

      toast({
        title: '성공',
        description: '지점이 성공적으로 삭제되었습니다.',
      });
      await fetchBranches();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: '오류',
        description: '지점 삭제 중 오류가 발생했습니다.',
      });
    } finally {
      setLoading(false);
    }
  };

  return { branches, loading, addBranch, updateBranch, deleteBranch, fetchBranches };
}

