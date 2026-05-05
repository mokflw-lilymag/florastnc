import { resolveLocale, toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export function bulkImportMessageBase(uiLocale?: string | null): string {
  return toBaseLocale(resolveLocale(uiLocale ?? undefined));
}

export function errBulkMissingBody(bl: string) {
  return pickUiText(
    bl,
    "organizationId와 items 배열이 필요합니다.",
    "organizationId and items array are required.",
    "Cần organizationId và mảng items.",
    "organizationId と items 配列が必要です。",
    "需要 organizationId 与 items 数组。",
    "Se requiere organizationId y un array items.",
    "organizationId e array items são obrigatórios.",
    "organizationId et le tableau items sont requis.",
    "organizationId und items-Array sind erforderlich.",
    "Нужны organizationId и массив items.",
  );
}

export function errBulkNoRows(bl: string) {
  return pickUiText(
    bl,
    "등록할 행이 없습니다.",
    "No rows to import.",
    "Không có dòng để nhập.",
    "登録する行がありません。",
    "没有可导入的行。",
    "No hay filas para importar.",
    "Não há linhas para importar.",
    "Aucune ligne à importer.",
    "Keine Zeilen zum Importieren.",
    "Нет строк для импорта.",
  );
}

export function errBulkMaxRows(bl: string, max: number) {
  return pickUiText(
    bl,
    `한 번에 최대 ${max}행까지 업로드할 수 있습니다.`,
    `You can upload at most ${max} rows per request.`,
    `Mỗi lần chỉ có thể tải lên tối đa ${max} dòng.`,
    `1回のリクエストで最大 ${max} 行までアップロードできます。`,
    `每次最多上传 ${max} 行。`,
    `Puedes subir como máximo ${max} filas por solicitud.`,
    `No máximo ${max} linhas por solicitação.`,
    `Maximum ${max} lignes par envoi.`,
    `Maximal ${max} Zeilen pro Anfrage.`,
    `Не более ${max} строк за один запрос.`,
  );
}

export function errBulkNoValidRows(bl: string) {
  return pickUiText(
    bl,
    "유효한 행이 없습니다. 상품명·대분류·중분류(2차 카테고리)를 모두 입력했는지 확인하세요.",
    "No valid rows. Check that product name, main category, and subcategory are all filled in.",
    "Không có dòng hợp lệ. Kiểm tra đã nhập đủ tên sản phẩm, nhóm lớn và nhóm nhỏ.",
    "有効な行がありません。商品名・大分類・中分類（2次）がすべて入っているか確認してください。",
    "没有有效行。请确认已填写商品名称、大类和子类。",
    "No hay filas válidas. Compruebe nombre, categoría principal y subcategoría.",
    "Nenhuma linha válida. Verifique nome, categoria principal e subcategoria.",
    "Aucune ligne valide. Vérifiez le nom, la catégorie principale et la sous-catégorie.",
    "Keine gültigen Zeilen. Name, Haupt- und Unterkategorie prüfen.",
    "Нет допустимых строк. Проверьте название, основную и подкатегорию.",
  );
}

export function errBulkCatalogSaveFailed(bl: string) {
  return pickUiText(
    bl,
    "카탈로그 저장에 실패했습니다.",
    "Failed to save catalog items.",
    "Không lưu được danh mục.",
    "カタログの保存に失敗しました。",
    "保存目录失败。",
    "No se pudieron guardar las filas del catálogo.",
    "Falha ao salvar o catálogo.",
    "Échec de l’enregistrement du catalogue.",
    "Katalog konnte nicht gespeichert werden.",
    "Не удалось сохранить каталог.",
  );
}
