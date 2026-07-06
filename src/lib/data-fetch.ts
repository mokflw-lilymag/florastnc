import { createClient } from "@/utils/supabase/client";

export function uuidToShortCode(id: string): string {
  // 이미 8~10자리 짧은 ID 체계 (예: MB123456)인 경우 그대로 사용
  if (id.length <= 10) {
    return id.toUpperCase();
  }
  // 구버전 긴 UUID인 경우 'M' + 앞 8자리
  return 'M' + id.replace(/-/g, '').substring(0, 8).toUpperCase();
}

export async function getItemData(id: string, type: 'product' | 'material') {
  const supabase = createClient();
  const tableName = type === 'product' ? 'products' : 'materials';

  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('id, name')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return {
        id: data.id,
        name: data.name,
        barcode: uuidToShortCode(data.id),
      };
    }
    return null;
  } catch (e) {
    console.error(`Error fetching ${type} data`, e);
    return null;
  }
}

export async function getItemsData(ids: string[], type: 'product' | 'material') {
  const results = await Promise.all(ids.map(id => getItemData(id, type)));
  return results.filter((item): item is { id: string; name: string; barcode: string } => item !== null);
}
