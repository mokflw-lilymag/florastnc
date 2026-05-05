"use client";

import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { useUiText } from '@/hooks/use-ui-text';
import { toast } from 'sonner';
import { useSupplierStore, Supplier } from '@/stores/supplier-store';
import { useEffect } from 'react';

export type { Supplier };

export function useSuppliers() {
    const supabase = createClient();
    const { tenantId } = useAuth();
    const { tr } = useUiText();
    
    const { 
        suppliers, 
        isLoading: loading, 
        initialize, 
        addSupplier: addSupplierToStore, 
        updateSupplier: updateSupplierInStore, 
        removeSupplier: removeSupplierFromStore 
    } = useSupplierStore();

    const fetchSuppliers = async () => {
        if (tenantId) await useSupplierStore.getState().initialize(tenantId);
    };

    const addSupplier = async (data: Partial<Supplier>) => {
        if (!tenantId) return;
        try {
            const { data: inserted, error } = await supabase.from('suppliers').insert([{
                ...data,
                tenant_id: tenantId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            }]).select().single();

            if (error) throw error;
            if (inserted) addSupplierToStore(inserted);
            toast.success(
                tr(
                    '새 거래처가 등록되었습니다.',
                    'Supplier added.',
                    'Đã thêm nhà cung cấp.',
                    '取引先を登録しました。',
                    '已添加供应商。',
                    'Proveedor añadido.',
                    'Fornecedor adicionado.',
                    'Fournisseur ajouté.',
                    'Lieferant hinzugefügt.',
                    'Поставщик добавлен.',
                ),
            );
            return inserted;
        } catch (error) {
            console.error("Error adding supplier:", error);
            toast.error(
                tr(
                    '거래처 등록 실패',
                    'Failed to add supplier.',
                    'Thêm nhà cung cấp thất bại.',
                    '取引先の登録に失敗しました。',
                    '添加供应商失败。',
                    'No se pudo añadir el proveedor.',
                    'Falha ao adicionar fornecedor.',
                    'Échec de l’ajout du fournisseur.',
                    'Lieferant konnte nicht hinzugefügt werden.',
                    'Не удалось добавить поставщика.',
                ),
            );
        }
    };

    const updateSupplier = async (id: string, data: Partial<Supplier>) => {
        try {
            const { data: updated, error } = await supabase.from('suppliers').update({
                ...data,
                updated_at: new Date().toISOString()
            }).eq('id', id).select().single();

            if (error) throw error;
            if (updated) updateSupplierInStore(id, updated);
            toast.success(
                tr(
                    '거래처 정보가 수정되었습니다.',
                    'Supplier updated.',
                    'Đã cập nhật nhà cung cấp.',
                    '取引先を更新しました。',
                    '供应商信息已更新。',
                    'Proveedor actualizado.',
                    'Fornecedor atualizado.',
                    'Fournisseur mis à jour.',
                    'Lieferant aktualisiert.',
                    'Поставщик обновлён.',
                ),
            );
            return updated;
        } catch (error) {
            console.error("Error updating supplier:", error);
            toast.error(
                tr(
                    '거래처 수정 실패',
                    'Failed to update supplier.',
                    'Cập nhật nhà cung cấp thất bại.',
                    '取引先の更新に失敗しました。',
                    '更新供应商失败。',
                    'No se pudo actualizar el proveedor.',
                    'Falha ao atualizar fornecedor.',
                    'Échec de la mise à jour du fournisseur.',
                    'Lieferant konnte nicht aktualisiert werden.',
                    'Не удалось обновить поставщика.',
                ),
            );
        }
    };

    const deleteSupplier = async (id: string) => {
        try {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
            removeSupplierFromStore(id);
            toast.success(
                tr(
                    '거래처가 삭제되었습니다.',
                    'Supplier deleted.',
                    'Đã xóa nhà cung cấp.',
                    '取引先を削除しました。',
                    '已删除供应商。',
                    'Proveedor eliminado.',
                    'Fornecedor excluído.',
                    'Fournisseur supprimé.',
                    'Lieferant gelöscht.',
                    'Поставщик удалён.',
                ),
            );
            return true;
        } catch (error) {
            console.error("Error deleting supplier:", error);
            toast.error(
                tr(
                    '거래처 삭제 실패',
                    'Failed to delete supplier.',
                    'Xóa nhà cung cấp thất bại.',
                    '取引先の削除に失敗しました。',
                    '删除供应商失败。',
                    'No se pudo eliminar el proveedor.',
                    'Falha ao excluir fornecedor.',
                    'Échec de la suppression du fournisseur.',
                    'Lieferant konnte nicht gelöscht werden.',
                    'Не удалось удалить поставщика.',
                ),
            );
            return false;
        }
    };

    useEffect(() => {
        if (tenantId) initialize(tenantId);
    }, [tenantId, initialize]);

    return {
        suppliers,
        loading,
        fetchSuppliers,
        addSupplier,
        updateSupplier,
        deleteSupplier
    };
}

