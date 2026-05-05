"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { useUiText } from '@/hooks/use-ui-text';
import { toast } from 'sonner';

export interface Partner {
  id: string;
  tenant_id: string;
  name: string;
  type?: string;
  category?: string;
  contact_person?: string;
  contact?: string;
  email?: string;
  address?: string;
  business_number?: string;
  ceo_name?: string;
  bank_account?: string;
  items?: string;
  memo?: string;
  default_margin_percent?: number;
  created_at?: string;
  updated_at?: string;
}

export function usePartners() {
  const supabase = createClient();
  const { tenantId, isLoading: authLoading } = useAuth();
  const { tr } = useUiText();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPartners = useCallback(async () => {
    if (!tenantId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });

      if (error) throw error;
      setPartners(data || []);
    } catch (e) {
      console.error('Error fetching partners:', e);
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  useEffect(() => {
    if (!authLoading && tenantId) {
      fetchPartners();
    }
  }, [authLoading, tenantId, fetchPartners]);

  const addPartner = async (data: Omit<Partner, 'id' | 'tenant_id' | 'created_at' | 'updated_at'>) => {
    if (!tenantId) return null;

    try {
      const { data: inserted, error } = await supabase
        .from('partners')
        .insert([{ ...data, tenant_id: tenantId }])
        .select()
        .single();

      if (error) throw error;
      setPartners(prev => [...prev, inserted].sort((a, b) => a.name.localeCompare(b.name)));
      toast.success(
        tr(
          '파트너가 등록되었습니다.',
          'Partner registered.',
          'Đã đăng ký đối tác.',
          'パートナーを登録しました。',
          '已添加合作伙伴。',
          'Socio registrado.',
          'Parceiro registrado.',
          'Partenaire enregistré.',
          'Partner wurde registriert.',
          'Партнёр зарегистрирован.',
        ),
      );
      return inserted;
    } catch (e) {
      toast.error(
        tr(
          '파트너 등록에 실패했습니다.',
          'Failed to register partner.',
          'Đăng ký đối tác thất bại.',
          'パートナーの登録に失敗しました。',
          '注册合作伙伴失败。',
          'No se pudo registrar el socio.',
          'Falha ao registrar parceiro.',
          'Échec de l’enregistrement du partenaire.',
          'Partner konnte nicht registriert werden.',
          'Не удалось зарегистрировать партнёра.',
        ),
      );
      return null;
    }
  };

  const updatePartner = async (id: string, data: Partial<Partner>) => {
    if (!tenantId) return false;

    try {
      const { error } = await supabase
        .from('partners')
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      await fetchPartners();
      toast.success(
        tr(
          '파트너 정보가 수정되었습니다.',
          'Partner updated.',
          'Đã cập nhật đối tác.',
          'パートナー情報を更新しました。',
          '合作伙伴信息已更新。',
          'Socio actualizado.',
          'Parceiro atualizado.',
          'Partenaire mis à jour.',
          'Partner wurde aktualisiert.',
          'Данные партнёра обновлены.',
        ),
      );
      return true;
    } catch (e) {
      toast.error(
        tr(
          '파트너 수정에 실패했습니다.',
          'Failed to update partner.',
          'Cập nhật đối tác thất bại.',
          'パートナーの更新に失敗しました。',
          '更新合作伙伴失败。',
          'No se pudo actualizar el socio.',
          'Falha ao atualizar parceiro.',
          'Échec de la mise à jour du partenaire.',
          'Partner konnte nicht aktualisiert werden.',
          'Не удалось обновить партнёра.',
        ),
      );
      return false;
    }
  };

  const deletePartner = async (id: string) => {
    if (!tenantId) return false;

    try {
      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setPartners(prev => prev.filter(p => p.id !== id));
      toast.success(
        tr(
          '파트너가 삭제되었습니다.',
          'Partner deleted.',
          'Đã xóa đối tác.',
          'パートナーを削除しました。',
          '已删除合作伙伴。',
          'Socio eliminado.',
          'Parceiro excluído.',
          'Partenaire supprimé.',
          'Partner wurde gelöscht.',
          'Партнёр удалён.',
        ),
      );
      return true;
    } catch (e) {
      toast.error(
        tr(
          '파트너 삭제에 실패했습니다.',
          'Failed to delete partner.',
          'Xóa đối tác thất bại.',
          'パートナーの削除に失敗しました。',
          '删除合作伙伴失败。',
          'No se pudo eliminar el socio.',
          'Falha ao excluir parceiro.',
          'Échec de la suppression du partenaire.',
          'Partner konnte nicht gelöscht werden.',
          'Не удалось удалить партнёра.',
        ),
      );
      return false;
    }
  };

  return {
    partners,
    loading: loading || authLoading,
    fetchPartners,
    addPartner,
    updatePartner,
    deletePartner
  };
}
