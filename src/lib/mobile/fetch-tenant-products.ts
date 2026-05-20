import { createClient } from "@/utils/supabase/client";
import type { Product } from "@/types/product";
import { normalizeMobileProducts } from "@/lib/mobile/product-categories";

export async function fetchTenantProductsForMobile(
  tenantId: string
): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("main_category", { ascending: true })
    .order("name", { ascending: true })
    .limit(500);

  if (error) throw error;
  return normalizeMobileProducts(data ?? []);
}
