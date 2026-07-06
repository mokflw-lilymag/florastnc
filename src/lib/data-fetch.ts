import { createClient } from "@/utils/supabase/client";

/** UUID에서 짧고 읽기 쉬운 바코드 코드를 생성 (M + UUID 앞 8자리 대문자) */
export function uuidToShortCode(id: string): string {
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
