"use client";

import { useState, useCallback, useEffect, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './use-auth';
import { useUiText } from '@/hooks/use-ui-text';
import { toast } from 'sonner';
import { format } from 'date-fns';
import type { Expense } from '@/types/expense';

export type { Expense };

/** receipts 버킷에 올린 경로(`{tenantId}/…`)만 — 외부 URL·다른 버킷은 삭제 대상 아님 */
function isManagedExpenseReceiptPath(path: string, tenantId: string): boolean {
  const p = path.trim();
  if (!p || p.includes('..') || p.includes('//')) return false;
  return p.startsWith(`${tenantId}/`);
}

export function useExpenses() {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId, isLoading: authLoading } = useAuth();
  const { tr } = useUiText();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async (start?: Date, end?: Date) => {
    if (!tenantId) return;

    try {
      setLoading(true);
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('expense_date', { ascending: false });

      if (start) {
        query = query.gte('expense_date', start.toISOString());
      }
      if (end) {
        query = query.lte('expense_date', end.toISOString());
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (e) {
      console.error('Error fetching expenses:', e);
    } finally {
      setLoading(false);
    }
  }, [tenantId, supabase]);

  const addExpense = async (data: Omit<Expense, 'id' | 'tenant_id' | 'created_at'>) => {
    if (!tenantId) return null;

    try {
      const { data: inserted, error } = await supabase
        .from('expenses')
        .insert([{ ...data, tenant_id: tenantId }])
        .select()
        .single();

      if (error) throw error;
      setExpenses(prev => [inserted, ...prev]);
      toast.success(
        tr(
          '지출이 등록되었습니다.',
          'Expense recorded.',
          'Đã ghi nhận chi phí.',
          '支出を登録しました。',
          '已登记支出。',
          'Gasto registrado.',
          'Despesa registrada.',
          'Dépense enregistrée.',
          'Ausgabe erfasst.',
          'Расход записан.',
        ),
      );
      return inserted;
    } catch (e) {
      toast.error(
        tr(
          '지출 등록에 실패했습니다.',
          'Failed to record expense.',
          'Ghi nhận chi phí thất bại.',
          '支出の登録に失敗しました。',
          '登记支出失败。',
          'No se pudo registrar el gasto.',
          'Falha ao registrar despesa.',
          'Échec de l’enregistrement de la dépense.',
          'Ausgabe konnte nicht erfasst werden.',
          'Не удалось записать расход.',
        ),
      );
      return null;
    }
  };

  const addExpenses = async (items: Omit<Expense, 'id' | 'tenant_id' | 'created_at'>[]) => {
    if (!tenantId || items.length === 0) return null;

    try {
      const payloads = items.map(item => ({ ...item, tenant_id: tenantId }));
      const { data: inserted, error } = await supabase
        .from('expenses')
        .insert(payloads)
        .select();

      if (error) throw error;
      setExpenses(prev => [...(inserted || []), ...prev]);
      toast.success(
        tr(
          `${inserted?.length}건의 지출이 등록되었습니다.`,
          `${inserted?.length} expenses recorded.`,
          `Đã ghi nhận ${inserted?.length} khoản chi.`,
          `支出を${inserted?.length}件登録しました。`,
          `已登记 ${inserted?.length} 笔支出。`,
          `Se registraron ${inserted?.length} gastos.`,
          `Foram registradas ${inserted?.length} despesas.`,
          `${inserted?.length} dépenses enregistrées.`,
          `${inserted?.length} Ausgaben erfasst.`,
          `Записано расходов: ${inserted?.length}.`,
        ),
      );
      return inserted;
    } catch (e) {
      toast.error(
        tr(
          '지출 등록에 실패했습니다.',
          'Failed to record expenses.',
          'Ghi nhận chi phí thất bại.',
          '支出の登録に失敗しました。',
          '登记支出失败。',
          'No se pudieron registrar los gastos.',
          'Falha ao registrar despesas.',
          'Échec de l’enregistrement des dépenses.',
          'Ausgaben konnten nicht erfasst werden.',
          'Не удалось записать расходы.',
        ),
      );
      return null;
    }
  };

  const deleteExpense = async (id: string) => {
    if (!tenantId) return false;
    try {
      const { data: row, error: selErr } = await supabase
        .from('expenses')
        .select('receipt_file_id')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (selErr) throw selErr;

      const path = row?.receipt_file_id?.trim();
      if (path && isManagedExpenseReceiptPath(path, tenantId)) {
        const { error: rmErr } = await supabase.storage.from('receipts').remove([path]);
        if (rmErr) console.warn("[expenses] failed to delete receipt from storage:", rmErr);
      }

      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

      if (error) throw error;
      setExpenses(prev => prev.filter(e => e.id !== id));
      toast.success(
        tr(
          '지출이 삭제되었습니다.',
          'Expense deleted.',
          'Đã xóa chi phí.',
          '支出を削除しました。',
          '已删除支出。',
          'Gasto eliminado.',
          'Despesa excluída.',
          'Dépense supprimée.',
          'Ausgabe gelöscht.',
          'Расход удалён.',
        ),
      );
      return true;
    } catch (e) {
      toast.error(
        tr(
          '지출 삭제에 실패했습니다.',
          'Failed to delete expense.',
          'Xóa chi phí thất bại.',
          '支出の削除に失敗しました。',
          '删除支出失败。',
          'No se pudo eliminar el gasto.',
          'Falha ao excluir despesa.',
          'Échec de la suppression de la dépense.',
          'Ausgabe konnte nicht gelöscht werden.',
          'Не удалось удалить расход.',
        ),
      );
      return false;
    }
  };

  const updateExpense = async (id: string, data: Partial<Omit<Expense, 'id' | 'tenant_id' | 'created_at'>>) => {
    if (!tenantId) return null;

    try {
      const { data: current, error: curErr } = await supabase
        .from('expenses')
        .select('receipt_file_id')
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .single();

      if (curErr) throw curErr;

      const oldPath = (current?.receipt_file_id as string | undefined)?.trim() ?? '';
      const nextPath =
        data.receipt_file_id !== undefined
          ? String(data.receipt_file_id).trim()
          : oldPath;

      const receiptKeyChanging = data.receipt_file_id !== undefined && nextPath !== oldPath;
      const shouldRemoveOldFile =
        oldPath.length > 0 &&
        isManagedExpenseReceiptPath(oldPath, tenantId) &&
        receiptKeyChanging;

      if (shouldRemoveOldFile) {
        const { error: rmErr } = await supabase.storage.from('receipts').remove([oldPath]);
        if (rmErr) console.warn("[expenses] failed to delete previous receipt file:", rmErr);
      }

      const { data: updated, error } = await supabase
        .from('expenses')
        .update({ ...data, tenant_id: tenantId })
        .eq('id', id)
        .eq('tenant_id', tenantId)
        .select()
        .single();

      if (error) throw error;
      setExpenses(prev => prev.map(e => e.id === id ? updated : e));
      toast.success(
        tr(
          '지출이 수정되었습니다.',
          'Expense updated.',
          'Đã cập nhật chi phí.',
          '支出を更新しました。',
          '支出已更新。',
          'Gasto actualizado.',
          'Despesa atualizada.',
          'Dépense mise à jour.',
          'Ausgabe aktualisiert.',
          'Расход обновлён.',
        ),
      );
      return updated;
    } catch (e) {
      toast.error(
        tr(
          '지출 수정에 실패했습니다.',
          'Failed to update expense.',
          'Cập nhật chi phí thất bại.',
          '支出の更新に失敗しました。',
          '更新支出失败。',
          'No se pudo actualizar el gasto.',
          'Falha ao atualizar despesa.',
          'Échec de la mise à jour de la dépense.',
          'Ausgabe konnte nicht aktualisiert werden.',
          'Не удалось обновить расход.',
        ),
      );
      return null;
    }
  };

  const updateExpenseByOrderId = async (orderId: string, data: any, subCategory?: string) => {
    if (!tenantId) return false;

    try {
      let query = supabase
        .from('expenses')
        .update({ ...data, tenant_id: tenantId })
        .eq('related_order_id', orderId)
        .eq('tenant_id', tenantId);

      if (subCategory) {
          query = query.eq('sub_category', subCategory);
      }

      const { data: updated, error } = await query.select();

      if (error) throw error;
      
      if (updated && updated.length > 0) {
          await fetchExpenses();
          return true;
      }
      return false;
    } catch (e) {
      console.error('Error updating expense by order id:', e);
      return false;
    }
  };

  const deleteExpenseByOrderId = async (orderId: string, subCategory?: string) => {
    if (!tenantId) return false;

    try {
      let query = supabase
        .from('expenses')
        .delete()
        .eq('related_order_id', orderId)
        .eq('tenant_id', tenantId);

      if (subCategory) {
          query = query.eq('sub_category', subCategory);
      }

      const { error } = await query;
      if (error) throw error;
      
      await fetchExpenses();
      return true;
    } catch (e) {
      console.error('Error deleting expense by order id:', e);
      return false;
    }
  };

  useEffect(() => {
    if (!authLoading && tenantId) {
      fetchExpenses();
    }
  }, [authLoading, tenantId, fetchExpenses]);

  return {
    expenses,
    loading: loading || authLoading,
    fetchExpenses,
    addExpense,
    addExpenses,
    updateExpense,
    deleteExpense,
    updateExpenseByOrderId,
    deleteExpenseByOrderId
  };
}

export function useExpenseStorage() {
  const supabase = createClient();
  const { tenantId } = useAuth();
  const { tr } = useUiText();

  const uploadReceipt = async (file: File) => {
    if (!tenantId) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${tenantId}/${format(new Date(), 'yyyyMMdd')}/${crypto.randomUUID()}.${fileExt}`;
      const filePath = `receipts/${fileName}`;

      const { data, error } = await supabase.storage
        .from('receipts')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('receipts')
        .getPublicUrl(fileName);

      return {
        url: publicUrl,
        path: data.path,
        id: fileName
      };
    } catch (e: unknown) {
      console.error('Error uploading receipt:', e);
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('Bucket not found') || msg.includes('not found')) {
        toast.error(
          tr(
            '스토리지 버킷이 없습니다.',
            'Storage bucket missing.',
            'Thiếu bucket lưu trữ.',
            'ストレージバケットがありません。',
            '缺少存储桶。',
            'Falta el bucket de almacenamiento.',
            'Bucket de armazenamento ausente.',
            'Bucket de stockage introuvable.',
            'Speicher-Bucket fehlt.',
            'Отсутствует bucket хранилища.',
          ),
          {
            description: tr(
              'Supabase에서 receipts 버킷을 만드세요. 저장소의 supabase/storage_buckets.sql 을 실행합니다.',
              'Create a receipts bucket in Supabase. Run supabase/storage_buckets.sql from the repo.',
              'Hãy tạo bucket receipts trong Supabase. Chạy supabase/storage_buckets.sql trong repo.',
              'Supabaseにreceiptsバケットを作成してください。リポジトリのsupabase/storage_buckets.sqlを実行します。',
              '请在 Supabase 中创建 receipts 存储桶。运行仓库中的 supabase/storage_buckets.sql。',
              'Cree el bucket receipts en Supabase. Ejecute supabase/storage_buckets.sql del repositorio.',
              'Crie o bucket receipts no Supabase. Execute supabase/storage_buckets.sql do repositório.',
              'Créez le bucket receipts dans Supabase. Exécutez supabase/storage_buckets.sql du dépôt.',
              'Legen Sie den receipts-Bucket in Supabase an. Führen Sie supabase/storage_buckets.sql aus dem Repo aus.',
              'Создайте bucket receipts в Supabase. Выполните supabase/storage_buckets.sql из репозитория.',
            ),
            duration: 8000,
          },
        );
      } else {
        toast.error(
          tr(
            '영수증 업로드에 실패했습니다.',
            'Receipt upload failed.',
            'Tải biên lai thất bại.',
            '領収書のアップロードに失敗しました。',
            '收据上传失败。',
            'Error al subir el recibo.',
            'Falha no upload do recibo.',
            'Échec du téléversement du reçu.',
            'Upload des Belegs fehlgeschlagen.',
            'Не удалось загрузить чек.',
          ),
          { description: msg },
        );
      }
      return null;
    }
  };

  return { uploadReceipt };
}
