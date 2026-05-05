import { pickUiText } from "@/i18n/pick-ui-text";

export function errCatalogTenantIdRequired(bl: string) {
  return pickUiText(
    bl,
    "tenantId가 필요합니다.",
    "tenantId is required.",
    "Cần tenantId.",
    "tenantId が必要です。",
    "需要 tenantId。",
    "Se requiere tenantId.",
    "tenantId é obrigatório.",
    "tenantId est requis.",
    "tenantId ist erforderlich.",
    "Нужен tenantId.",
  );
}

export function errCatalogBranchNotFound(bl: string) {
  return pickUiText(
    bl,
    "지점 또는 소속 조직을 찾을 수 없습니다.",
    "Branch or organization was not found.",
    "Không tìm thấy chi nhánh hoặc tổ chức.",
    "店舗または所属組織が見つかりません。",
    "未找到门店或所属组织。",
    "No se encontró la sucursal u organización.",
    "Filial ou organização não encontrada.",
    "Succursale ou organisation introuvable.",
    "Filiale oder Organisation nicht gefunden.",
    "Филиал или организация не найдены.",
  );
}

export function errCatalogOrgIdNameRequired(bl: string) {
  return pickUiText(
    bl,
    "organizationId와 name은 필수입니다.",
    "organizationId and name are required.",
    "Cần organizationId và name.",
    "organizationId と name は必須です。",
    "organizationId 与 name 为必填。",
    "organizationId y name son obligatorios.",
    "organizationId e name são obrigatórios.",
    "organizationId et name sont requis.",
    "organizationId und name sind erforderlich.",
    "Нужны organizationId и name.",
  );
}

export function errCatalogCategoriesRequired(bl: string) {
  return pickUiText(
    bl,
    "대분류(1차)·중분류(2차 카테고리)는 필수입니다.",
    "Main category and subcategory (2nd level) are required.",
    "Danh mục chính và phụ (cấp 2) là bắt buộc.",
    "大分類（1次）・中分類（2次カテゴリ）は必須です。",
    "主分类（一级）与子分类（二级）为必填。",
    "La categoría principal y la subcategoría (nivel 2) son obligatorias.",
    "Categoria principal e subcategoria (nível 2) são obrigatórias.",
    "La catégorie principale et la sous-catégorie (niveau 2) sont requises.",
    "Haupt- und Unterkategorie (Ebene 2) sind erforderlich.",
    "Основная и подкатегория (2-й уровень) обязательны.",
  );
}

export function errCatalogOrganizationIdRequired(bl: string) {
  return pickUiText(
    bl,
    "organizationId가 필요합니다.",
    "organizationId is required.",
    "Cần organizationId.",
    "organizationId が必要です。",
    "需要 organizationId。",
    "Se requiere organizationId.",
    "organizationId é obrigatório.",
    "organizationId est requis.",
    "organizationId ist erforderlich.",
    "Нужен organizationId.",
  );
}

export function warnCatalogSchemaSql(bl: string) {
  return pickUiText(
    bl,
    "Supabase에 organization_catalog_schema.sql을 적용하면 공유 상품 기능을 쓸 수 있습니다.",
    "Apply organization_catalog_schema.sql in Supabase to enable the shared catalog.",
    "Áp dụng organization_catalog_schema.sql trong Supabase để bật danh mục dùng chung.",
    "Supabase に organization_catalog_schema.sql を適用すると共有商品機能が使えます。",
    "在 Supabase 中执行 organization_catalog_schema.sql 即可使用共享商品功能。",
    "Aplique organization_catalog_schema.sql en Supabase para activar el catálogo compartido.",
    "Aplique organization_catalog_schema.sql no Supabase para habilitar o catálogo compartilhado.",
    "Appliquez organization_catalog_schema.sql dans Supabase pour activer le catalogue partagé.",
    "Wenden Sie organization_catalog_schema.sql in Supabase an, um den gemeinsamen Katalog zu nutzen.",
    "Выполните organization_catalog_schema.sql в Supabase, чтобы включить общий каталог.",
  );
}
