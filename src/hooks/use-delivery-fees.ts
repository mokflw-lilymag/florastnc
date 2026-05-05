"use client";
import { useState, useCallback, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { useUiText } from '@/hooks/use-ui-text';
import { toast } from 'sonner';

export interface RegionDeliveryFee {
    id: string;
    region_name: string;
    fee: number;
    tenant_id: string;
}

export function useDeliveryFees() {
    const supabase = createClient();
    const { tenantId } = useAuth();
    const { tr } = useUiText();
    const [fees, setFees] = useState<RegionDeliveryFee[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFees = useCallback(async () => {
        if (!tenantId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('delivery_fees_by_region')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('region_name');
            
            if (error) throw error;
            setFees(data || []);
        } catch (err) {
            console.error('Error fetching delivery fees:', err);
        } finally {
            setLoading(false);
        }
    }, [tenantId]);

    const addFee = async (region: string, fee: number) => {
        if (!tenantId) return;
        try {
            const { error } = await supabase
                .from('delivery_fees_by_region')
                .upsert({ 
                    tenant_id: tenantId, 
                    region_name: region, 
                    fee 
                }, { onConflict: 'tenant_id, region_name' });
            
            if (error) throw error;
            toast.success(
                tr(
                    '배송비가 설정되었습니다.',
                    'Delivery fee saved.',
                    'Đã lưu phí giao hàng.',
                    '送料を設定しました。',
                    '配送费已设置。',
                    'Tarifa de envío guardada.',
                    'Taxa de entrega salva.',
                    'Frais de livraison enregistrés.',
                    'Liefergebühr gespeichert.',
                    'Стоимость доставки сохранена.',
                ),
            );
            fetchFees();
        } catch (err) {
            console.error('Error adding delivery fee:', err);
            toast.error(
                tr(
                    '배송비 설정 중 오류가 발생했습니다.',
                    'Error while saving delivery fee.',
                    'Lỗi khi lưu phí giao hàng.',
                    '送料の設定中にエラーが発生しました。',
                    '设置配送费时出错。',
                    'Error al guardar la tarifa de envío.',
                    'Erro ao salvar taxa de entrega.',
                    'Erreur lors de l’enregistrement des frais.',
                    'Fehler beim Speichern der Liefergebühr.',
                    'Ошибка при сохранении стоимости доставки.',
                ),
            );
        }
    };

    const deleteFee = async (id: string) => {
        try {
            const { error } = await supabase
                .from('delivery_fees_by_region')
                .delete()
                .eq('id', id);
            
            if (error) throw error;
            toast.success(
                tr(
                    '삭제되었습니다.',
                    'Deleted.',
                    'Đã xóa.',
                    '削除しました。',
                    '已删除。',
                    'Eliminado.',
                    'Excluído.',
                    'Supprimé.',
                    'Gelöscht.',
                    'Удалено.',
                ),
            );
            fetchFees();
        } catch (err) {
            console.error('Error deleting fee:', err);
            toast.error(
                tr(
                    '삭제 중 오류가 발생했습니다.',
                    'Error while deleting.',
                    'Lỗi khi xóa.',
                    '削除中にエラーが発生しました。',
                    '删除时出错。',
                    'Error al eliminar.',
                    'Erro ao excluir.',
                    'Erreur lors de la suppression.',
                    'Fehler beim Löschen.',
                    'Ошибка при удалении.',
                ),
            );
        }
    };

    const importFees = async (feeList: Array<{ district: string, fee: number }>) => {
        if (!tenantId) return;
        try {
            setLoading(true);
            const { error } = await supabase
                .from('delivery_fees_by_region')
                .upsert(
                    feeList.map(f => ({
                        tenant_id: tenantId,
                        region_name: f.district,
                        fee: f.fee
                    })), 
                    { onConflict: 'tenant_id, region_name' }
                );
            
            if (error) throw error;
            toast.success(
                tr(
                    '배송비 리스트가 성공적으로 적용되었습니다.',
                    'Delivery fee list applied.',
                    'Đã áp dụng danh sách phí giao hàng.',
                    '送料リストを適用しました。',
                    '配送费列表已应用。',
                    'Lista de tarifas aplicada.',
                    'Lista de taxas aplicada.',
                    'Liste des frais appliquée.',
                    'Gebührenliste angewendet.',
                    'Список тарифов применён.',
                ),
            );
            await fetchFees();
        } catch (err) {
            console.error('Error importing delivery fees:', err);
            toast.error(
                tr(
                    '배송비 리스트 적용 중 오류가 발생했습니다.',
                    'Error while applying delivery fee list.',
                    'Lỗi khi áp dụng danh sách phí giao hàng.',
                    '送料リストの適用中にエラーが発生しました。',
                    '应用配送费列表时出错。',
                    'Error al aplicar la lista de tarifas.',
                    'Erro ao aplicar lista de taxas.',
                    'Erreur lors de l’application de la liste.',
                    'Fehler beim Anwenden der Gebührenliste.',
                    'Ошибка при применении списка тарифов.',
                ),
            );
        } finally {
            setLoading(false);
        }
    };

    const updateFee = async (id: string, fee: number) => {
        try {
            const { error } = await supabase
                .from('delivery_fees_by_region')
                .update({ fee })
                .eq('id', id);
            
            if (error) throw error;
            fetchFees();
        } catch (err) {
            console.error('Error updating delivery fee:', err);
            toast.error(
                tr(
                    '배송비 수정 중 오류가 발생했습니다.',
                    'Error while updating delivery fee.',
                    'Lỗi khi cập nhật phí giao hàng.',
                    '送料の更新中にエラーが発生しました。',
                    '更新配送费时出错。',
                    'Error al actualizar la tarifa.',
                    'Erro ao atualizar taxa.',
                    'Erreur lors de la mise à jour des frais.',
                    'Fehler beim Aktualisieren der Liefergebühr.',
                    'Ошибка при обновлении стоимости доставки.',
                ),
            );
        }
    };

    useEffect(() => {
        fetchFees();
    }, [fetchFees]);

    return { fees, loading, addFee, deleteFee, updateFee, importFees, refresh: fetchFees };
}
