"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { useAuth } from "./use-auth";
import { useUiText } from "@/hooks/use-ui-text";
import { DASHBOARD_LIST_PAGE_SIZE } from "@/lib/dashboard-list-limit";
import { Product, ProductData } from "@/types/product";

export type DeleteProductResult = { ok: true } | { ok: false; message: string };

export type ProductGlobalStats = {
  total: number;
  active: number;
  lowStock: number;
  outOfStock: number;
};

const emptyProductStats: ProductGlobalStats = {
  total: 0,
  active: 0,
  lowStock: 0,
  outOfStock: 0,
};

async function loadProductGlobalStats(
  supabase: ReturnType<typeof createClient>,
  tenantId: string
): Promise<ProductGlobalStats> {
  const [t, a, l, o] = await Promise.all([
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .gt("stock", 0),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .gt("stock", 0)
      .lt("stock", 10),
    supabase
      .from("products")
      .select("*", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .lte("stock", 0),
  ]);
  return {
    total: t.count ?? 0,
    active: a.count ?? 0,
    lowStock: l.count ?? 0,
    outOfStock: o.count ?? 0,
  };
}

export function useProducts(initialFetch = true) {
  const supabase = useMemo(() => createClient(), []);
  const { tenantId, isLoading: authLoading } = useAuth();
  const { tr } = useUiText();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(initialFetch);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [listPage, setListPage] = useState(0);
  const [productsTotalCount, setProductsTotalCount] = useState(0);
  const [productStats, setProductStats] = useState<ProductGlobalStats>(emptyProductStats);
  const listPageRef = useRef(0);
  listPageRef.current = listPage;

  const formatProductDeleteError = useCallback(
    (error: unknown): string => {
      if (error && typeof error === "object" && "code" in error) {
        const code = String((error as { code?: string }).code ?? "");
        const msg = String((error as { message?: string }).message ?? "");
        if (code === "42501" || /permission denied|row-level security/i.test(msg)) {
          return tr(
            "삭제 권한이 없습니다. DB 정책(RLS)를 확인하거나 관리자에게 문의하세요.",
            "You don't have permission to delete. Check DB policies (RLS) or contact an admin.",
            "Bạn không có quyền xóa. Kiểm tra RLS hoặc liên hệ quản trị.",
            "削除権限がありません。RLSを確認するか管理者に問い合わせてください。",
            "没有删除权限。请检查 RLS 策略或联系管理员。",
            "No tienes permiso para eliminar. Revisa las políticas RLS o contacta a un administrador.",
            "Sem permissão para excluir. Verifique as políticas RLS ou fale com um administrador.",
            "Pas d’autorisation de suppression. Vérifiez les politiques RLS ou contactez un admin.",
            "Keine Löschberechtigung. Prüfen Sie RLS-Richtlinien oder wenden Sie sich an einen Admin.",
            "Нет прав на удаление. Проверьте политики RLS или обратитесь к администратору.",
          );
        }
        if (code === "23503") {
          return tr(
            "다른 데이터(주문 등)에서 이 상품을 참조 중이라 삭제할 수 없습니다.",
            "This product is referenced by other records (e.g. orders) and cannot be deleted.",
            "Sản phẩm đang được tham chiếu (ví dụ đơn hàng) nên không thể xóa.",
            "この商品は他データ（注文など）から参照されているため削除できません。",
            "该商品仍被其他记录（如订单）引用，无法删除。",
            "Este producto está referenciado por otros registros (p. ej. pedidos) y no se puede eliminar.",
            "Este produto é referenciado por outros registros (ex.: pedidos) e não pode ser excluído.",
            "Ce produit est référencé par d’autres enregistrements (ex. commandes) et ne peut pas être supprimé.",
            "Dieses Produkt wird noch referenziert (z. B. Bestellungen) und kann nicht gelöscht werden.",
            "На товар ссылаются другие записи (например заказы), удаление невозможно.",
          );
        }
        if (msg) return msg;
      }
      if (error instanceof Error && error.message) return error.message;
      return tr(
        "상품 삭제에 실패했습니다.",
        "Failed to delete the product.",
        "Xóa sản phẩm thất bại.",
        "商品の削除に失敗しました。",
        "删除商品失败。",
        "No se pudo eliminar el producto.",
        "Falha ao excluir o produto.",
        "Échec de la suppression du produit.",
        "Produkt konnte nicht gelöscht werden.",
        "Не удалось удалить товар.",
      );
    },
    [tr],
  );

  const fetchProductStats = useCallback(async () => {
    if (!tenantId) return;
    try {
      const stats = await loadProductGlobalStats(supabase, tenantId);
      setProductStats(stats);
    } catch (e) {
      console.error("fetchProductStats", e);
    }
  }, [tenantId, supabase]);

  const fetchProductsPage = useCallback(
    async (page: number) => {
      if (!tenantId) return;
      const safePage = Math.max(0, page);
      const from = safePage * DASHBOARD_LIST_PAGE_SIZE;
      const to = from + DASHBOARD_LIST_PAGE_SIZE - 1;

      const { data, error, count } = await supabase
        .from("products")
        .select("*", { count: "exact" })
        .eq("tenant_id", tenantId)
        .order("name", { ascending: true })
        .range(from, to);

      if (error) {
        console.error("Error fetching products:", error);
        return;
      }
      setProducts(data || []);
      setProductsTotalCount(count ?? 0);
      setListPage(safePage);
    },
    [tenantId, supabase]
  );

  const fetchProducts = useCallback(async () => {
    if (!tenantId) return;
    setIsRefreshing(true);
    try {
      await fetchProductStats();
      await fetchProductsPage(listPageRef.current);
    } finally {
      setIsRefreshing(false);
    }
  }, [tenantId, fetchProductStats, fetchProductsPage]);

  const setListPageAndFetch = useCallback(
    async (page: number) => {
      setIsRefreshing(true);
      try {
        await fetchProductsPage(page);
      } finally {
        setIsRefreshing(false);
      }
    },
    [fetchProductsPage]
  );

  const reloadAfterMutation = useCallback(async () => {
    if (!tenantId) return;
    await fetchProductStats();
    await fetchProductsPage(listPageRef.current);
  }, [tenantId, fetchProductStats, fetchProductsPage]);

  const addProduct = async (productData: ProductData): Promise<string | null> => {
    if (!tenantId) return null;

    try {
      const { data, error } = await supabase
        .from("products")
        .insert([{ ...productData, tenant_id: tenantId }])
        .select()
        .single();

      if (error) throw error;
      await reloadAfterMutation();
      return data.id;
    } catch (error) {
      console.error("Error adding product:", error);
      return null;
    }
  };

  const updateProduct = async (id: string, updates: Partial<ProductData>): Promise<boolean> => {
    if (!tenantId) return false;

    try {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id)
        .eq("tenant_id", tenantId);

      if (error) throw error;
      await reloadAfterMutation();
      return true;
    } catch (error) {
      console.error("Error updating product:", error);
      return false;
    }
  };

  const deleteProduct = async (id: string): Promise<DeleteProductResult> => {
    if (!tenantId) {
      return {
        ok: false,
        message: tr(
          "매장(테넌트) 정보를 불러오지 못했습니다.",
          "Could not load shop (tenant) information.",
          "Không tải được thông tin cửa hàng (tenant).",
          "店舗（テナント）情報を読み込めませんでした。",
          "无法加载门店（租户）信息。",
          "No se pudo cargar la información de la tienda (inquilino).",
          "Não foi possível carregar os dados da loja (tenant).",
          "Impossible de charger les informations de la boutique (locataire).",
          "Shop-(Tenant-)Daten konnten nicht geladen werden.",
          "Не удалось загрузить данные магазина (арендатора).",
        ),
      };
    }

    try {
      const { data, error } = await supabase
        .from("products")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenantId)
        .select("id");

      if (error) {
        console.error("Error deleting product:", error);
        return { ok: false, message: formatProductDeleteError(error) };
      }
      if (!data?.length) {
        return {
          ok: false,
          message: tr(
            "삭제된 행이 없습니다. 권한이 없거나, 이미 삭제된 상품일 수 있습니다. (Supabase에서 products DELETE RLS를 확인하세요.)",
            "No row was deleted. You may lack permission or the product was already removed. (Check products DELETE RLS in Supabase.)",
            "Không có dòng nào bị xóa. Có thể thiếu quyền hoặc sản phẩm đã bị xóa. (Kiểm tra RLS DELETE bảng products trên Supabase.)",
            "削除された行がありません。権限がないか、既に削除済みの可能性があります。（Supabase の products DELETE RLS を確認してください。）",
            "没有删除任何行。可能没有权限或商品已删除。（请在 Supabase 检查 products 的 DELETE RLS。）",
            "No se eliminó ninguna fila. Puede faltar permiso o el producto ya no existe. (Revise RLS DELETE de products en Supabase.)",
            "Nenhuma linha foi excluída. Falta de permissão ou produto já removido. (Verifique o RLS DELETE de products no Supabase.)",
            "Aucune ligne supprimée. Droits insuffisants ou produit déjà supprimé. (Vérifiez le RLS DELETE sur products dans Supabase.)",
            "Keine Zeile gelöscht. Fehlende Berechtigung oder Produkt bereits entfernt. (Prüfen Sie products-DELETE-RLS in Supabase.)",
            "Строка не удалена. Возможно нет прав или товар уже удалён. (Проверьте RLS DELETE для products в Supabase.)",
          ),
        };
      }
      await reloadAfterMutation();
      return { ok: true };
    } catch (error) {
      console.error("Error deleting product:", error);
      return { ok: false, message: formatProductDeleteError(error) };
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!tenantId) {
      setLoading(false);
      setProductStats(emptyProductStats);
      setProducts([]);
      setProductsTotalCount(0);
      setListPage(0);
      return;
    }

    if (!initialFetch) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const stats = await loadProductGlobalStats(supabase, tenantId);
        if (cancelled) return;
        setProductStats(stats);

        const { data, error, count } = await supabase
          .from("products")
          .select("*", { count: "exact" })
          .eq("tenant_id", tenantId)
          .order("name", { ascending: true })
          .range(0, DASHBOARD_LIST_PAGE_SIZE - 1);

        if (cancelled) return;
        if (error) {
          console.error("Error fetching products:", error);
          return;
        }
        setProducts(data || []);
        setProductsTotalCount(count ?? 0);
        setListPage(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const onChange = () => {
      void fetchProductStats();
      void fetchProductsPage(listPageRef.current);
    };

    const channel = supabase
      .channel(`products-tenant-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "products",
          filter: `tenant_id=eq.${tenantId}`,
        },
        onChange
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [tenantId, authLoading, initialFetch, supabase, fetchProductStats, fetchProductsPage]);

  return {
    products,
    loading: loading || authLoading,
    isRefreshing,
    productStats,
    productsTotalCount,
    listPage,
    setListPageAndFetch,
    fetchProducts,
    fetchProductStats,
    addProduct,
    updateProduct,
    deleteProduct,
  };
}
