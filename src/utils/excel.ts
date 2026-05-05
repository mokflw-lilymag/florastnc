import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { toBaseLocale, type AppLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

function resolveExcelBase(uiLocale?: string): string {
  return uiLocale ? toBaseLocale(uiLocale as AppLocale) : "ko";
}

/**
 * Download a template for product/material registration.
 * `uiLocale`가 있으면 자재(material) 양식의 헤더·파일명을 해당 로케일에 맞춥니다.
 */
export function downloadTemplate(type: "product" | "material" | "supplier", uiLocale?: string) {
  let headers: string[] = [];
  let sample: any[] = [];
  let filename = "";
  const base = resolveExcelBase(uiLocale);

  if (type === "product") {
    if (base === "ko") {
      headers = ["상품코드", "상품명", "대분류", "중분류", "판매가", "재고", "공급처", "상태(active/inactive)"];
      sample = [["P01", "축하화환 3단", "경조사화환", "축하화환", 100000, 10, "자체제작", "active"]];
      filename = "상품등록_양식.xlsx";
    } else if (base === "vi") {
      headers = [
        "Mã SP",
        "Tên sản phẩm",
        "Nhóm lớn",
        "Nhóm nhỏ",
        "Giá bán",
        "Tồn kho",
        "Nhà cung cấp",
        "Trạng thái (active/inactive)",
      ];
      sample = [["P01", "Vòng hoa khai trương 3 tầng", "Hoa sự kiện", "Chúc mừng", 100000, 10, "Tự làm", "active"]];
      filename = "mau_dang_ky_san_pham.xlsx";
    } else if (base === "ja") {
      headers = [
        "商品コード",
        "商品名",
        "大分類",
        "中分類",
        "販売価格",
        "在庫",
        "仕入先",
        "状態(active/inactive)",
      ];
      sample = [["P01", "祝い花輪3段", "慶弔", "祝花", 100000, 10, "自社制作", "active"]];
      filename = "shohin_toroku_template.xlsx";
    } else if (base === "zh") {
      headers = [
        "商品编码",
        "商品名称",
        "大类",
        "中类",
        "售价",
        "库存",
        "供应商",
        "状态(active/inactive)",
      ];
      sample = [["P01", "祝贺花篮三层", "庆典花篮", "祝贺", 100000, 10, "自制", "active"]];
      filename = "product_registration_zh.xlsx";
    } else if (base === "es") {
      headers = [
        "Código",
        "Nombre del producto",
        "Categoría principal",
        "Subcategoría",
        "Precio",
        "Stock",
        "Proveedor",
        "Estado (activo/inactivo)",
      ];
      sample = [["P01", "Corona de felicitación 3 niveles", "Eventos", "Felicitación", 100000, 10, "Propio", "active"]];
      filename = "plantilla_registro_productos.xlsx";
    } else if (base === "pt") {
      headers = [
        "Código",
        "Nome do produto",
        "Categoria principal",
        "Subcategoria",
        "Preço",
        "Estoque",
        "Fornecedor",
        "Status (ativo/inativo)",
      ];
      sample = [["P01", "Coroa de parabéns 3 níveis", "Eventos", "Parabéns", 100000, 10, "Próprio", "active"]];
      filename = "modelo_cadastro_produtos.xlsx";
    } else if (base === "fr") {
      headers = [
        "Code",
        "Nom du produit",
        "Catégorie principale",
        "Sous-catégorie",
        "Prix",
        "Stock",
        "Fournisseur",
        "Statut (actif/inactif)",
      ];
      sample = [["P01", "Couronne félicitations 3 niveaux", "Événements", "Félicitations", 100000, 10, "Interne", "active"]];
      filename = "modele_enregistrement_produits.xlsx";
    } else if (base === "de") {
      headers = [
        "Artikelnr.",
        "Produktname",
        "Hauptkategorie",
        "Unterkategorie",
        "Preis",
        "Bestand",
        "Lieferant",
        "Status (aktiv/inaktiv)",
      ];
      sample = [["P01", "Glückwunschkranz 3-stufig", "Anlässe", "Gratulation", 100000, 10, "Eigen", "active"]];
      filename = "produkt_registrierung_vorlage.xlsx";
    } else if (base === "ru") {
      headers = [
        "Артикул",
        "Наименование",
        "Основная категория",
        "Подкатегория",
        "Цена",
        "Остаток",
        "Поставщик",
        "Статус (active/inactive)",
      ];
      sample = [["P01", "Поздравительный венок 3 яруса", "Мероприятия", "Поздравление", 100000, 10, "Собственное", "active"]];
      filename = "shablon_registracii_tovarov.xlsx";
    } else {
      headers = [
        "SKU",
        "Product name",
        "Main category",
        "Sub category",
        "Price",
        "Stock",
        "Supplier",
        "Status (active/inactive)",
      ];
      sample = [["P01", "Congrats wreath 3-tier", "Events", "Congratulations", 100000, 10, "In-house", "active"]];
      filename = "product_registration_template.xlsx";
    }
  } else if (type === "supplier") {
    if (base === "ko") {
      headers = ["거래처명", "유형", "연락처", "담당자", "이메일", "주소", "메모"];
      sample = [["(주)꽃도매상사", "생화", "02-123-4567", "김담당", "contact@flower.com", "서울 서초구 양재동", "오전 배송 전용"]];
      filename = "거래처등록_양식.xlsx";
    } else if (base === "vi") {
      headers = ["Tên đối tác", "Loại", "Liên hệ", "Người phụ trách", "Email", "Địa chỉ", "Ghi chú"];
      sample = [
        ["ABC Bán sỉ hoa", "Tươi", "02-123-4567", "Nguyễn A", "contact@flower.com", "Seoul", "Giao sáng"],
      ];
      filename = "mau_dang_ky_nha_cung_cap.xlsx";
    } else if (base === "ja") {
      headers = ["取引先名", "種類", "連絡先", "担当", "メール", "住所", "メモ"];
      sample = [
        ["株式会社フラワー卸", "生花", "02-123-4567", "担当者", "contact@flower.com", "ソウル", "午前配送"],
      ];
      filename = "torihikisaki_toroku_template.xlsx";
    } else if (base === "zh") {
      headers = ["伙伴名称", "类型", "联系方式", "负责人", "邮箱", "地址", "备注"];
      sample = [
        ["ABC鲜花批发", "鲜切花", "02-123-4567", "王经理", "contact@flower.com", "首尔", "上午配送"],
      ];
      filename = "supplier_registration_zh.xlsx";
    } else if (base === "es") {
      headers = ["Nombre del socio", "Tipo", "Contacto", "Responsable", "Email", "Dirección", "Notas"];
      sample = [
        ["Mayorista ABC Flores", "Flores frescas", "02-123-4567", "Ana López", "contact@flower.com", "Seúl", "Solo entrega por la mañana"],
      ];
      filename = "plantilla_registro_proveedores.xlsx";
    } else if (base === "pt") {
      headers = ["Nome do parceiro", "Tipo", "Contato", "Responsável", "Email", "Endereço", "Observações"];
      sample = [
        ["Atacado ABC Flores", "Flores frescas", "02-123-4567", "Maria Silva", "contact@flower.com", "Seul", "Entrega só de manhã"],
      ];
      filename = "modelo_cadastro_fornecedores.xlsx";
    } else if (base === "fr") {
      headers = ["Nom du partenaire", "Type", "Contact", "Responsable", "Email", "Adresse", "Notes"];
      sample = [
        ["Grossiste ABC Fleurs", "Fleurs fraîches", "02-123-4567", "Marie Dupont", "contact@flower.com", "Séoul", "Livraison matin uniquement"],
      ];
      filename = "modele_enregistrement_fournisseurs.xlsx";
    } else if (base === "de") {
      headers = ["Partnername", "Typ", "Kontakt", "Ansprechpartner", "E-Mail", "Adresse", "Notizen"];
      sample = [
        ["ABC Blumen Großhandel", "Schnittblumen", "02-123-4567", "Max Mustermann", "contact@flower.com", "Seoul", "Nur Vormittagslieferung"],
      ];
      filename = "lieferanten_registrierung_vorlage.xlsx";
    } else if (base === "ru") {
      headers = ["Название контрагента", "Тип", "Контакт", "Ответственный", "Email", "Адрес", "Примечание"];
      sample = [
        ["ООО «ЦветОпт»", "Срез", "02-123-4567", "Иванов И.", "contact@flower.com", "Сеул", "Доставка только утром"],
      ];
      filename = "shablon_registracii_postavshchikov.xlsx";
    } else {
      headers = ["Partner name", "Type", "Contact", "Account manager", "Email", "Address", "Notes"];
      sample = [
        ["ABC Wholesale Co.", "Fresh", "02-123-4567", "Kim", "contact@flower.com", "Seoul", "AM delivery only"],
      ];
      filename = "supplier_registration_template.xlsx";
    }
  } else {
    if (base === "ko") {
      headers = ["번호", "자재ID", "자재명", "대분류", "중분류", "단위", "규격", "가격", "색상", "재고", "공급업체", "메모"];
      sample = [["1", "", "대형 리본(핑크)", "부자재", "리본", "롤", "10cm*50m", 5000, "핑크", 20, "ABC상사", ""]];
      filename = "자재등록_양식.xlsx";
    } else if (base === "vi") {
      headers = [
        "STT",
        "ID vật tư",
        "Tên vật tư",
        "Nhóm lớn",
        "Nhóm nhỏ",
        "Đơn vị",
        "Quy cách",
        "Giá",
        "Màu sắc",
        "Tồn kho",
        "Nhà cung cấp",
        "Ghi chú",
      ];
      sample = [["1", "", "Ruy băng lớn (hồng)", "Phụ liệu", "Ruy băng", "cuộn", "10cm*50m", 5000, "Hồng", 20, "Nhà cung ABC", ""]];
      filename = "mau_dang_ky_vat_tu.xlsx";
    } else if (base === "ja") {
      headers = [
        "番号",
        "資材ID",
        "資材名",
        "大分類",
        "中分類",
        "単位",
        "規格",
        "価格",
        "色",
        "在庫",
        "仕入先",
        "メモ",
      ];
      sample = [["1", "", "大きなリボン(ピンク)", "副資材", "リボン", "ロール", "10cm*50m", 5000, "ピンク", 20, "ABC商事", ""]];
      filename = "zaizai_toroku_template.xlsx";
    } else if (base === "zh") {
      headers = [
        "编号",
        "物料ID",
        "物料名称",
        "大类",
        "中类",
        "单位",
        "规格",
        "价格",
        "颜色",
        "库存",
        "供应商",
        "备注",
      ];
      sample = [["1", "", "大号丝带(粉)", "辅料", "丝带", "卷", "10cm*50m", 5000, "粉色", 20, "ABC贸易", ""]];
      filename = "material_registration_zh.xlsx";
    } else if (base === "es") {
      headers = [
        "N.º",
        "ID material",
        "Nombre del material",
        "Categoría principal",
        "Subcategoría",
        "Unidad",
        "Especificación",
        "Precio",
        "Color",
        "Stock",
        "Proveedor",
        "Notas",
      ];
      sample = [["1", "", "Cinta grande (rosa)", "Suministros", "Cinta", "rollo", "10cm*50m", 5000, "Rosa", 20, "ABC Trading", ""]];
      filename = "plantilla_registro_materiales.xlsx";
    } else if (base === "pt") {
      headers = [
        "N.º",
        "ID do material",
        "Nome do material",
        "Categoria principal",
        "Subcategoria",
        "Unidade",
        "Especificação",
        "Preço",
        "Cor",
        "Estoque",
        "Fornecedor",
        "Observações",
      ];
      sample = [["1", "", "Fita grande (rosa)", "Insumos", "Fita", "rolo", "10cm*50m", 5000, "Rosa", 20, "ABC Trading", ""]];
      filename = "modelo_cadastro_materiais.xlsx";
    } else if (base === "fr") {
      headers = [
        "N°",
        "ID matériau",
        "Nom du matériau",
        "Catégorie principale",
        "Sous-catégorie",
        "Unité",
        "Spécification",
        "Prix",
        "Couleur",
        "Stock",
        "Fournisseur",
        "Notes",
      ];
      sample = [["1", "", "Ruban large (rose)", "Fournitures", "Ruban", "rouleau", "10cm*50m", 5000, "Rose", 20, "ABC Trading", ""]];
      filename = "modele_enregistrement_materiaux.xlsx";
    } else if (base === "de") {
      headers = [
        "Nr.",
        "Material-ID",
        "Materialname",
        "Hauptkategorie",
        "Unterkategorie",
        "Einheit",
        "Spezifikation",
        "Preis",
        "Farbe",
        "Bestand",
        "Lieferant",
        "Notizen",
      ];
      sample = [["1", "", "Großes Band (rosa)", "Zubehör", "Band", "Rolle", "10cm*50m", 5000, "Rosa", 20, "ABC Trading", ""]];
      filename = "material_registrierung_vorlage.xlsx";
    } else if (base === "ru") {
      headers = [
        "№",
        "ID материала",
        "Наименование",
        "Основная категория",
        "Подкатегория",
        "Ед.",
        "Спецификация",
        "Цена",
        "Цвет",
        "Остаток",
        "Поставщик",
        "Примечание",
      ];
      sample = [["1", "", "Лента широкая (розовая)", "Расходники", "Лента", "рулон", "10cm*50m", 5000, "Розовый", 20, "ABC Трейдинг", ""]];
      filename = "shablon_registracii_materialov.xlsx";
    } else {
      headers = [
        "No.",
        "Material ID",
        "Material name",
        "Main category",
        "Sub category",
        "Unit",
        "Spec",
        "Price",
        "Color",
        "Stock",
        "Supplier",
        "Memo",
      ];
      sample = [["1", "", "Large ribbon (pink)", "Supplies", "Ribbon", "roll", "10cm*50m", 5000, "Pink", 20, "ABC Trading", ""]];
      filename = "material_template.xlsx";
    }
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...sample]);
  const workbook = XLSX.utils.book_new();
  const sheetLabel = pickUiText(
    base,
    "양식",
    "Template",
    "Mẫu",
    "テンプレート",
    "模板",
    "Plantilla",
    "Modelo",
    "Modèle",
    "Vorlage",
    "Шаблон",
  );
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetLabel);

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const data = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(data, filename);
}

/**
 * Export actual data to Excel.
 * 자재(material)보내기 시 `uiLocale`로 헤더·파일명·시트명을 맞춥니다.
 */
export function exportDataToExcel(type: "product" | "material" | "supplier", list: any[], uiLocale?: string) {
  let headers: string[] = [];
  let dataRows: any[] = [];
  let filename = "";
  const base = resolveExcelBase(uiLocale);

  const dateStamp = new Date().toISOString().split("T")[0];

  if (type === "product") {
    if (base === "ko") {
      headers = ["상품코드", "상품명", "대분류", "중분류", "판매가", "재고", "공급처", "상태"];
      filename = `상품목록_${dateStamp}.xlsx`;
    } else if (base === "vi") {
      headers = [
        "Mã SP",
        "Tên sản phẩm",
        "Nhóm lớn",
        "Nhóm nhỏ",
        "Giá bán",
        "Tồn kho",
        "Nhà cung cấp",
        "Trạng thái",
      ];
      filename = `danh_sach_san_pham_${dateStamp}.xlsx`;
    } else if (base === "ja") {
      headers = ["商品コード", "商品名", "大分類", "中分類", "販売価格", "在庫", "仕入先", "状態"];
      filename = `shohin_ichiran_${dateStamp}.xlsx`;
    } else if (base === "zh") {
      headers = ["商品编码", "商品名称", "大类", "中类", "售价", "库存", "供应商", "状态"];
      filename = `product_list_zh_${dateStamp}.xlsx`;
    } else if (base === "es") {
      headers = [
        "Código",
        "Nombre del producto",
        "Categoría principal",
        "Subcategoría",
        "Precio",
        "Stock",
        "Proveedor",
        "Estado",
      ];
      filename = `lista_productos_${dateStamp}.xlsx`;
    } else if (base === "pt") {
      headers = [
        "Código",
        "Nome do produto",
        "Categoria principal",
        "Subcategoria",
        "Preço",
        "Estoque",
        "Fornecedor",
        "Status",
      ];
      filename = `lista_produtos_${dateStamp}.xlsx`;
    } else if (base === "fr") {
      headers = [
        "Code",
        "Nom du produit",
        "Catégorie principale",
        "Sous-catégorie",
        "Prix",
        "Stock",
        "Fournisseur",
        "Statut",
      ];
      filename = `liste_produits_${dateStamp}.xlsx`;
    } else if (base === "de") {
      headers = [
        "Artikelnr.",
        "Produktname",
        "Hauptkategorie",
        "Unterkategorie",
        "Preis",
        "Bestand",
        "Lieferant",
        "Status",
      ];
      filename = `produktliste_${dateStamp}.xlsx`;
    } else if (base === "ru") {
      headers = [
        "Артикул",
        "Наименование",
        "Основная категория",
        "Подкатегория",
        "Цена",
        "Остаток",
        "Поставщик",
        "Статус",
      ];
      filename = `spisok_tovarov_${dateStamp}.xlsx`;
    } else {
      headers = [
        "SKU",
        "Product name",
        "Main category",
        "Sub category",
        "Price",
        "Stock",
        "Supplier",
        "Status",
      ];
      filename = `product_list_${dateStamp}.xlsx`;
    }
    dataRows = list.map((p) => [
      p.code || "",
      p.name || "",
      p.main_category || "",
      p.mid_category || "",
      p.price || 0,
      p.stock || 0,
      p.supplier || "",
      p.status || "",
    ]);
  } else if (type === "supplier") {
    if (base === "ko") {
      headers = ["업체명", "연락처", "이메일", "사업자번호", "주소", "메모"];
      filename = `거래처목록_${dateStamp}.xlsx`;
    } else if (base === "vi") {
      headers = [
        "Tên đối tác",
        "Liên hệ",
        "Email",
        "Mã số thuế",
        "Địa chỉ",
        "Ghi chú",
      ];
      filename = `danh_sach_nha_cung_cap_${dateStamp}.xlsx`;
    } else if (base === "ja") {
      headers = ["取引先名", "連絡先", "メール", "事業者番号", "住所", "メモ"];
      filename = `torihikisaki_ichiran_${dateStamp}.xlsx`;
    } else if (base === "zh") {
      headers = ["伙伴名称", "联系方式", "邮箱", "税号", "地址", "备注"];
      filename = `supplier_list_zh_${dateStamp}.xlsx`;
    } else if (base === "es") {
      headers = ["Nombre del socio", "Contacto", "Email", "ID fiscal", "Dirección", "Notas"];
      filename = `lista_proveedores_${dateStamp}.xlsx`;
    } else if (base === "pt") {
      headers = ["Nome do parceiro", "Contato", "Email", "ID fiscal", "Endereço", "Observações"];
      filename = `lista_fornecedores_${dateStamp}.xlsx`;
    } else if (base === "fr") {
      headers = ["Nom du partenaire", "Contact", "Email", "ID fiscal", "Adresse", "Notes"];
      filename = `liste_fournisseurs_${dateStamp}.xlsx`;
    } else if (base === "de") {
      headers = ["Partnername", "Kontakt", "E-Mail", "Steuer-ID", "Adresse", "Notizen"];
      filename = `lieferantenliste_${dateStamp}.xlsx`;
    } else if (base === "ru") {
      headers = ["Название", "Контакт", "Email", "ИНН", "Адрес", "Примечание"];
      filename = `spisok_postavshchikov_${dateStamp}.xlsx`;
    } else {
      headers = ["Partner name", "Contact", "Email", "Business ID", "Address", "Notes"];
      filename = `supplier_list_${dateStamp}.xlsx`;
    }
    dataRows = list.map((s) => [
      s.name || "",
      s.contact || "",
      s.email || "",
      s.business_number || "",
      s.address || "",
      s.memo || "",
    ]);
  } else {
    if (base === "ko") {
      headers = ["번호", "자재ID", "자재명", "대분류", "중분류", "단위", "규격", "가격", "색상", "재고", "공급업체", "메모"];
      filename = `자재목록_${dateStamp}.xlsx`;
    } else if (base === "vi") {
      headers = [
        "STT",
        "ID vật tư",
        "Tên vật tư",
        "Nhóm lớn",
        "Nhóm nhỏ",
        "Đơn vị",
        "Quy cách",
        "Giá",
        "Màu sắc",
        "Tồn kho",
        "Nhà cung cấp",
        "Ghi chú",
      ];
      filename = `danh_sach_vat_tu_${dateStamp}.xlsx`;
    } else if (base === "ja") {
      headers = [
        "番号",
        "資材ID",
        "資材名",
        "大分類",
        "中分類",
        "単位",
        "規格",
        "価格",
        "色",
        "在庫",
        "仕入先",
        "メモ",
      ];
      filename = `zaizai_ichiran_${dateStamp}.xlsx`;
    } else if (base === "zh") {
      headers = [
        "编号",
        "物料ID",
        "物料名称",
        "大类",
        "中类",
        "单位",
        "规格",
        "价格",
        "颜色",
        "库存",
        "供应商",
        "备注",
      ];
      filename = `material_list_zh_${dateStamp}.xlsx`;
    } else if (base === "es") {
      headers = [
        "N.º",
        "ID material",
        "Nombre del material",
        "Categoría principal",
        "Subcategoría",
        "Unidad",
        "Especificación",
        "Precio",
        "Color",
        "Stock",
        "Proveedor",
        "Notas",
      ];
      filename = `lista_materiales_${dateStamp}.xlsx`;
    } else if (base === "pt") {
      headers = [
        "N.º",
        "ID do material",
        "Nome do material",
        "Categoria principal",
        "Subcategoria",
        "Unidade",
        "Especificação",
        "Preço",
        "Cor",
        "Estoque",
        "Fornecedor",
        "Observações",
      ];
      filename = `lista_materiais_${dateStamp}.xlsx`;
    } else if (base === "fr") {
      headers = [
        "N°",
        "ID matériau",
        "Nom du matériau",
        "Catégorie principale",
        "Sous-catégorie",
        "Unité",
        "Spécification",
        "Prix",
        "Couleur",
        "Stock",
        "Fournisseur",
        "Notes",
      ];
      filename = `liste_materiaux_${dateStamp}.xlsx`;
    } else if (base === "de") {
      headers = [
        "Nr.",
        "Material-ID",
        "Materialname",
        "Hauptkategorie",
        "Unterkategorie",
        "Einheit",
        "Spezifikation",
        "Preis",
        "Farbe",
        "Bestand",
        "Lieferant",
        "Notizen",
      ];
      filename = `materialliste_${dateStamp}.xlsx`;
    } else if (base === "ru") {
      headers = [
        "№",
        "ID материала",
        "Наименование",
        "Основная категория",
        "Подкатегория",
        "Ед.",
        "Спецификация",
        "Цена",
        "Цвет",
        "Остаток",
        "Поставщик",
        "Примечание",
      ];
      filename = `spisok_materialov_${dateStamp}.xlsx`;
    } else {
      headers = [
        "No.",
        "Material ID",
        "Material name",
        "Main category",
        "Sub category",
        "Unit",
        "Spec",
        "Price",
        "Color",
        "Stock",
        "Supplier",
        "Memo",
      ];
      filename = `material_list_${dateStamp}.xlsx`;
    }
    dataRows = list.map((m, idx) => [
      idx + 1,
      m.id || "",
      m.name || "",
      m.main_category || "",
      m.mid_category || "",
      m.unit || "",
      m.spec || "",
      m.price || 0,
      m.color || "",
      m.stock || 0,
      m.supplier || "",
      m.memo || "",
    ]);
  }

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);
  const workbook = XLSX.utils.book_new();
  const dataSheet = pickUiText(
    base,
    "데이터",
    "Data",
    "Dữ liệu",
    "データ",
    "数据",
    "Datos",
    "Dados",
    "Données",
    "Daten",
    "Данные",
  );
  XLSX.utils.book_append_sheet(workbook, worksheet, dataSheet);

  const excelBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
  const dataBlob = new Blob([excelBuffer], { type: "application/octet-stream" });
  saveAs(dataBlob, filename);
}

const _excelUniq = (keys: string[]) => [...new Set(keys.filter((k) => k && String(k).trim()))];

/**
 * 시트 행에서 헤더 별칭 중 첫 비어 있지 않은 값.
 */
export function pickExcelCell(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    const v = row[k];
    if (v !== undefined && v !== null && String(v).trim() !== "") return v;
  }
  return undefined;
}

export function pickExcelString(row: Record<string, unknown>, keys: string[]): string {
  const v = pickExcelCell(row, keys);
  return v === undefined || v === null ? "" : String(v);
}

/** 상품 엑셀 상태 셀 → DB status */
export function normalizeProductExcelStatus(cell: string): "active" | "inactive" {
  const t = cell.trim().toLowerCase();
  if (!t) return "active";
  if (
    /inactive|inactiv|inaktiv|неактив|非活跃|停用|ngừng|vô hiệu|inativo|inactif/i.test(t)
  ) {
    return "inactive";
  }
  return "active";
}

export function excelManagerMemoPrefix(uiLocale?: string): string {
  const base = resolveExcelBase(uiLocale);
  return (
    pickUiText(
      base,
      "담당자",
      "Account manager",
      "Người phụ trách",
      "担当",
      "负责人",
      "Responsable",
      "Responsável",
      "Responsable",
      "Ansprechpartner",
      "Ответственный",
    ) + ": "
  );
}

/** 상품 양식·목록 엑셀 컬럼명 (현재 UI 로케일 + 자주 쓰는 영문 키). */
export function productImportHeaderAliases(uiLocale?: string) {
  const base = resolveExcelBase(uiLocale);
  const X = _excelUniq;
  switch (base) {
    case "ko":
      return {
        code: X(["상품코드"]),
        name: X(["상품명"]),
        main_category: X(["대분류"]),
        mid_category: X(["중분류"]),
        price: X(["판매가"]),
        stock: X(["재고"]),
        supplier: X(["공급처"]),
        status: X(["상태(active/inactive)", "상태"]),
      };
    case "vi":
      return {
        code: X(["Mã SP"]),
        name: X(["Tên sản phẩm"]),
        main_category: X(["Nhóm lớn"]),
        mid_category: X(["Nhóm nhỏ"]),
        price: X(["Giá bán"]),
        stock: X(["Tồn kho"]),
        supplier: X(["Nhà cung cấp"]),
        status: X(["Trạng thái (active/inactive)", "Trạng thái"]),
      };
    case "ja":
      return {
        code: X(["商品コード"]),
        name: X(["商品名"]),
        main_category: X(["大分類"]),
        mid_category: X(["中分類"]),
        price: X(["販売価格"]),
        stock: X(["在庫"]),
        supplier: X(["仕入先"]),
        status: X(["状態(active/inactive)", "状態"]),
      };
    case "zh":
      return {
        code: X(["商品编码"]),
        name: X(["商品名称"]),
        main_category: X(["大类"]),
        mid_category: X(["中类"]),
        price: X(["售价"]),
        stock: X(["库存"]),
        supplier: X(["供应商"]),
        status: X(["状态(active/inactive)", "状态"]),
      };
    case "es":
      return {
        code: X(["Código"]),
        name: X(["Nombre del producto"]),
        main_category: X(["Categoría principal"]),
        mid_category: X(["Subcategoría"]),
        price: X(["Precio"]),
        stock: X(["Stock"]),
        supplier: X(["Proveedor"]),
        status: X(["Estado (activo/inactivo)", "Estado"]),
      };
    case "pt":
      return {
        code: X(["Código"]),
        name: X(["Nome do produto"]),
        main_category: X(["Categoria principal"]),
        mid_category: X(["Subcategoria"]),
        price: X(["Preço"]),
        stock: X(["Estoque"]),
        supplier: X(["Fornecedor"]),
        status: X(["Status (ativo/inativo)", "Status"]),
      };
    case "fr":
      return {
        code: X(["Code"]),
        name: X(["Nom du produit"]),
        main_category: X(["Catégorie principale"]),
        mid_category: X(["Sous-catégorie"]),
        price: X(["Prix"]),
        stock: X(["Stock"]),
        supplier: X(["Fournisseur"]),
        status: X(["Statut (actif/inactif)", "Statut"]),
      };
    case "de":
      return {
        code: X(["Artikelnr."]),
        name: X(["Produktname"]),
        main_category: X(["Hauptkategorie"]),
        mid_category: X(["Unterkategorie"]),
        price: X(["Preis"]),
        stock: X(["Bestand"]),
        supplier: X(["Lieferant"]),
        status: X(["Status (aktiv/inaktiv)", "Status"]),
      };
    case "ru":
      return {
        code: X(["Артикул"]),
        name: X(["Наименование"]),
        main_category: X(["Основная категория"]),
        mid_category: X(["Подкатегория"]),
        price: X(["Цена"]),
        stock: X(["Остаток"]),
        supplier: X(["Поставщик"]),
        status: X(["Статус (active/inactive)", "Статус"]),
      };
    default:
      return {
        code: X(["SKU", "code", "Code", "상품코드", "Mã SP", "商品コード", "Código", "Артикул"]),
        name: X(["Product name", "name", "Name", "상품명", "Tên sản phẩm", "商品名", "Nome do produto", "Наименование"]),
        main_category: X(["Main category", "main_category", "대분류", "Nhóm lớn", "大分類", "大类", "Categoría principal", "Основная категория"]),
        mid_category: X(["Sub category", "Subcategory", "mid_category", "중분류", "Nhóm nhỏ", "中分類", "中类", "Subcategoría", "Подкатегория"]),
        price: X(["Price", "price", "판매가", "Giá bán", "販売価格", "售价", "Preço", "Цена"]),
        stock: X(["Stock", "stock", "재고", "Tồn kho", "在庫", "库存", "Estoque", "Остаток"]),
        supplier: X(["Supplier", "supplier", "공급처", "Nhà cung cấp", "仕入先", "供应商", "Fornecedor", "Поставщик"]),
        status: X(["Status (active/inactive)", "Status", "상태(active/inactive)", "상태", "Trạng thái", "状態", "状态", "Статус"]),
      };
  }
}

/** 거래처 양식(7열) · 목록(6열) 컬럼명. */
export function supplierImportHeaderAliases(uiLocale?: string) {
  const base = resolveExcelBase(uiLocale);
  const X = _excelUniq;
  switch (base) {
    case "ko":
      return {
        name: X(["거래처명", "업체명", "상호"]),
        supplier_type: X(["유형"]),
        contact: X(["연락처", "전화번호"]),
        account_manager: X(["담당자"]),
        email: X(["이메일"]),
        address: X(["주소"]),
        business_number: X(["사업자번호"]),
        memo: X(["메모", "비고"]),
      };
    case "vi":
      return {
        name: X(["Tên đối tác"]),
        supplier_type: X(["Loại"]),
        contact: X(["Liên hệ"]),
        account_manager: X(["Người phụ trách"]),
        email: X(["Email"]),
        address: X(["Địa chỉ"]),
        business_number: X(["Mã số thuế"]),
        memo: X(["Ghi chú"]),
      };
    case "ja":
      return {
        name: X(["取引先名"]),
        supplier_type: X(["種類"]),
        contact: X(["連絡先"]),
        account_manager: X(["担当"]),
        email: X(["メール"]),
        address: X(["住所"]),
        business_number: X(["事業者番号"]),
        memo: X(["メモ"]),
      };
    case "zh":
      return {
        name: X(["伙伴名称"]),
        supplier_type: X(["类型"]),
        contact: X(["联系方式"]),
        account_manager: X(["负责人"]),
        email: X(["邮箱"]),
        address: X(["地址"]),
        business_number: X(["税号"]),
        memo: X(["备注"]),
      };
    case "es":
      return {
        name: X(["Nombre del socio"]),
        supplier_type: X(["Tipo"]),
        contact: X(["Contacto"]),
        account_manager: X(["Responsable"]),
        email: X(["Email"]),
        address: X(["Dirección"]),
        business_number: X(["ID fiscal"]),
        memo: X(["Notas"]),
      };
    case "pt":
      return {
        name: X(["Nome do parceiro"]),
        supplier_type: X(["Tipo"]),
        contact: X(["Contato"]),
        account_manager: X(["Responsável"]),
        email: X(["Email"]),
        address: X(["Endereço"]),
        business_number: X(["ID fiscal"]),
        memo: X(["Observações"]),
      };
    case "fr":
      return {
        name: X(["Nom du partenaire"]),
        supplier_type: X(["Type"]),
        contact: X(["Contact"]),
        account_manager: X(["Responsable"]),
        email: X(["Email"]),
        address: X(["Adresse"]),
        business_number: X(["ID fiscal"]),
        memo: X(["Notes"]),
      };
    case "de":
      return {
        name: X(["Partnername"]),
        supplier_type: X(["Typ"]),
        contact: X(["Kontakt"]),
        account_manager: X(["Ansprechpartner"]),
        email: X(["E-Mail"]),
        address: X(["Adresse"]),
        business_number: X(["Steuer-ID"]),
        memo: X(["Notizen"]),
      };
    case "ru":
      return {
        name: X(["Название контрагента", "Название"]),
        supplier_type: X(["Тип"]),
        contact: X(["Контакт"]),
        account_manager: X(["Ответственный"]),
        email: X(["Email"]),
        address: X(["Адрес"]),
        business_number: X(["ИНН"]),
        memo: X(["Примечание"]),
      };
    default:
      return {
        name: X(["Partner name", "name", "Name", "거래처명", "업체명", "상호", "Tên đối tác", "取引先名", "伙伴名称", "Название"]),
        supplier_type: X(["Type", "유형", "Loại", "種類", "类型", "Tipo", "Тип"]),
        contact: X(["Contact", "contact", "연락처", "전화번호", "Liên hệ", "連絡先", "联系方式", "Контакт"]),
        account_manager: X(["Account manager", "담당자", "Người phụ trách", "担当", "负责人", "Responsable", "Ответственный"]),
        email: X(["Email", "email", "이메일", "メール", "邮箱"]),
        address: X(["Address", "address", "주소", "Địa chỉ", "住所", "地址", "Адрес"]),
        business_number: X(["Business ID", "business_number", "Tax ID", "사업자번호", "Mã số thuế", "事業者番号", "税号", "ИНН"]),
        memo: X(["Notes", "memo", "Memo", "메모", "비고", "Ghi chú", "備考", "备注", "Примечание"]),
      };
  }
}

/** 자재 양식·목록 엑셀 컬럼명 (로케일별 템플릿과 동일). */
export function materialImportHeaderAliases(uiLocale?: string) {
  const base = resolveExcelBase(uiLocale);
  const X = _excelUniq;
  switch (base) {
    case "ko":
      return {
        name: X(["자재명"]),
        main_category: X(["대분류"]),
        mid_category: X(["중분류"]),
        unit: X(["단위"]),
        spec: X(["규격"]),
        price: X(["가격", "단가"]),
        color: X(["색상"]),
        stock: X(["재고"]),
        supplier: X(["공급업체", "공급처"]),
        memo: X(["메모"]),
      };
    case "vi":
      return {
        name: X(["Tên vật tư"]),
        main_category: X(["Nhóm lớn"]),
        mid_category: X(["Nhóm nhỏ"]),
        unit: X(["Đơn vị"]),
        spec: X(["Quy cách"]),
        price: X(["Giá"]),
        color: X(["Màu sắc"]),
        stock: X(["Tồn kho"]),
        supplier: X(["Nhà cung cấp"]),
        memo: X(["Ghi chú"]),
      };
    case "ja":
      return {
        name: X(["資材名"]),
        main_category: X(["大分類"]),
        mid_category: X(["中分類"]),
        unit: X(["単位"]),
        spec: X(["規格"]),
        price: X(["価格"]),
        color: X(["色"]),
        stock: X(["在庫"]),
        supplier: X(["仕入先"]),
        memo: X(["メモ"]),
      };
    case "zh":
      return {
        name: X(["物料名称"]),
        main_category: X(["大类"]),
        mid_category: X(["中类"]),
        unit: X(["单位"]),
        spec: X(["规格"]),
        price: X(["价格"]),
        color: X(["颜色"]),
        stock: X(["库存"]),
        supplier: X(["供应商"]),
        memo: X(["备注"]),
      };
    case "es":
      return {
        name: X(["Nombre del material"]),
        main_category: X(["Categoría principal"]),
        mid_category: X(["Subcategoría"]),
        unit: X(["Unidad"]),
        spec: X(["Especificación"]),
        price: X(["Precio"]),
        color: X(["Color"]),
        stock: X(["Stock"]),
        supplier: X(["Proveedor"]),
        memo: X(["Notas"]),
      };
    case "pt":
      return {
        name: X(["Nome do material"]),
        main_category: X(["Categoria principal"]),
        mid_category: X(["Subcategoria"]),
        unit: X(["Unidade"]),
        spec: X(["Especificação"]),
        price: X(["Preço"]),
        color: X(["Cor"]),
        stock: X(["Estoque"]),
        supplier: X(["Fornecedor"]),
        memo: X(["Observações"]),
      };
    case "fr":
      return {
        name: X(["Nom du matériau"]),
        main_category: X(["Catégorie principale"]),
        mid_category: X(["Sous-catégorie"]),
        unit: X(["Unité"]),
        spec: X(["Spécification"]),
        price: X(["Prix"]),
        color: X(["Couleur"]),
        stock: X(["Stock"]),
        supplier: X(["Fournisseur"]),
        memo: X(["Notes"]),
      };
    case "de":
      return {
        name: X(["Materialname"]),
        main_category: X(["Hauptkategorie"]),
        mid_category: X(["Unterkategorie"]),
        unit: X(["Einheit"]),
        spec: X(["Spezifikation"]),
        price: X(["Preis"]),
        color: X(["Farbe"]),
        stock: X(["Bestand"]),
        supplier: X(["Lieferant"]),
        memo: X(["Notizen"]),
      };
    case "ru":
      return {
        name: X(["Наименование"]),
        main_category: X(["Основная категория"]),
        mid_category: X(["Подкатегория"]),
        unit: X(["Ед."]),
        spec: X(["Спецификация"]),
        price: X(["Цена"]),
        color: X(["Цвет"]),
        stock: X(["Остаток"]),
        supplier: X(["Поставщик"]),
        memo: X(["Примечание"]),
      };
    default:
      return {
        name: X(["Material name", "name", "Name", "자재명", "Tên vật tư", "資材名", "物料名称", "Nombre del material", "Наименование"]),
        main_category: X(["Main category", "main_category", "대분류", "Nhóm lớn", "大分類", "大类", "Categoría principal", "Основная категория"]),
        mid_category: X(["Sub category", "mid_category", "중분류", "Nhóm nhỏ", "中分類", "中类", "Subcategoría", "Подкатегория"]),
        unit: X(["Unit", "unit", "단위", "Đơn vị", "単位", "单位", "Unidade", "Ед."]),
        spec: X(["Spec", "spec", "규격", "Quy cách", "規格", "规格", "Especificación", "Спецификация"]),
        price: X(["Price", "Unit price", "price", "가격", "단가", "Giá", "価格", "价格", "Preço", "Цена"]),
        color: X(["Color", "color", "색상", "Màu sắc", "色", "颜色", "Cor", "Цвет"]),
        stock: X(["Stock", "stock", "재고", "Tồn kho", "在庫", "库存", "Estoque", "Остаток"]),
        supplier: X(["Supplier", "supplier", "공급업체", "공급처", "Nhà cung cấp", "仕入先", "供应商", "Fornecedor", "Поставщик"]),
        memo: X(["Memo", "memo", "메모", "Ghi chú", "メモ", "备注", "Observações", "Примечание"]),
      };
  }
}

/**
 * Parse an Excel file and return an array of objects.
 */
export async function parseExcel(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(worksheet);
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
