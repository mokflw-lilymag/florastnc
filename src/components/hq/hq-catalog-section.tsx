"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Package, Plus, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { parseExcelJsonToImportRows, peekSheetRowName } from "@/lib/hq/catalog-excel-map";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { getMessages } from "@/i18n/getMessages";
import { pickUiText } from "@/i18n/pick-ui-text";

type Org = { id: string; name: string };

type CatalogItem = {
  id: string;
  organization_id: string;
  name: string;
  main_category: string | null;
  mid_category: string | null;
  price: number;
  code: string | null;
  status: string;
  created_at: string;
};

export function HqCatalogSection({
  orgNames,
  canManage,
}: {
  orgNames: Org[];
  canManage: boolean;
}) {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const tf = getMessages(locale).tenantFlows;
  const L = (
    ko: string,
    en: string,
    vi?: string,
    ja?: string,
    zh?: string,
    es?: string,
    pt?: string,
    fr?: string,
    de?: string,
    ru?: string,
  ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [warning, setWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orgId, setOrgId] = useState("");
  const [name, setName] = useState("");
  const [price, setPrice] = useState("0");
  const [code, setCode] = useState("");
  const [mainCategory, setMainCategory] = useState("");
  const [midCategory, setMidCategory] = useState("");
  const [importing, setImporting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const bl = toBaseLocale(locale);
    const flows = getMessages(locale).tenantFlows;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/hq/catalog?uiLocale=${encodeURIComponent(locale)}`,
        { credentials: "include" }
      );
      const j = await res.json();
      if (!res.ok) {
        toast.error(
          j.error ??
            pickUiText(
              bl,
              "목록을 불러오지 못했습니다.",
              "Could not load the list.",
              "Không thể tải danh sách.",
              "一覧を読み込めませんでした",
              "无法加载列表",
              "No se pudo cargar la lista",
              "Não foi possível carregar a lista",
              "Impossible de charger la liste",
              "Liste konnte nicht geladen werden",
              "Не удалось загрузить список",
            ),
        );
        return;
      }
      setItems(j.items ?? []);
      setWarning(j.warning ?? null);
    } catch {
      toast.error(flows.f01047);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (orgNames.length > 0 && !orgId) {
      setOrgId(orgNames[0].id);
    }
  }, [orgNames, orgId]);

  const addItem = async () => {
    const n = name.trim();
    const main = mainCategory.trim();
    const mid = midCategory.trim();
    if (!orgId || !n) {
      toast.error(
        L(
          "조직·상품명을 확인하세요.",
          "Check organization and product name.",
          "Kiểm tra tổ chức và tên sản phẩm.",
          "組織と商品名を確認してください。",
          "请确认组织和商品名称。",
          "Revise organización y nombre del producto.",
          "Verifique organização e nome do produto.",
          "Vérifiez l’organisation et le nom du produit.",
          "Bitte Organisation und Produktnamen prüfen.",
          "Проверьте организацию и название товара.",
        ),
      );
      return;
    }
    if (!main || !mid) {
      toast.error(
        L(
          "대분류(1차)·중분류(2차 카테고리)를 모두 입력하세요.",
          "Enter both main and sub (2nd-level) categories.",
          "Nhập cả danh mục chính và phụ (cấp 2).",
          "大分類（1次）・中分類（2次）の両方を入力してください。",
          "请填写主分类（一级）和子分类（二级）。",
          "Introduzca categoría principal y subcategoría (2.º nivel).",
          "Informe categoria principal e subcategoria (2º nível).",
          "Saisissez la catégorie principale et la sous-catégorie (niveau 2).",
          "Haupt- und Unterkategorie (2. Ebene) eingeben.",
          "Укажите основную и подкатегорию (2-й уровень).",
        ),
      );
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/hq/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: orgId,
          name: n,
          price: Number(price) || 0,
          code: code.trim() || null,
          main_category: main,
          mid_category: mid,
          uiLocale: locale,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(
          j.error ??
            L(
              "저장 실패",
              "Save failed.",
              "Lưu thất bại.",
              "保存に失敗しました",
              "保存失败",
              "Error al guardar",
              "Falha ao salvar",
              "Échec de l’enregistrement",
              "Speichern fehlgeschlagen",
              "Не удалось сохранить",
            ),
        );
        return;
      }
      const syncRes = await fetch("/api/hq/catalog/sync-branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ organizationId: orgId, uiLocale: locale }),
      });
      const sj = await syncRes.json().catch(() => ({}));
      if (!syncRes.ok) {
        const errDetail =
          typeof sj?.error === "string"
            ? sj.error
            : L("오류", "Error", "Lỗi", "エラー", "错误", "Error", "Erro", "Erreur", "Fehler", "Ошибка");
        toast.warning(
          L(
            `상품은 저장했으나 지점 동기화 실패: ${errDetail}`,
            `Saved the product, but branch sync failed: ${errDetail}`,
            `Đã lưu sản phẩm nhưng đồng bộ chi nhánh thất bại: ${errDetail}`,
            `商品は保存しましたが、店舗同期に失敗しました: ${errDetail}`,
            `商品已保存，但门店同步失败：${errDetail}`,
            `Producto guardado, pero falló la sincronización de sucursales: ${errDetail}`,
            `Produto salvo, mas a sincronização das filiais falhou: ${errDetail}`,
            `Produit enregistré, mais échec de la synchro des succursales : ${errDetail}`,
            `Produkt gespeichert, aber Filial-Sync fehlgeschlagen: ${errDetail}`,
            `Товар сохранён, но синхронизация филиалов не удалась: ${errDetail}`,
          ),
        );
      } else {
        const st = sj?.syncTotals as
          | { inserted: number; updated: number; skipped: number }
          | undefined;
        if (st) {
          toast.success(
            L(
              `공유 상품 추가 · 전 지점: 신규 ${st.inserted} · 갱신 ${st.updated} · 건너뜀 ${st.skipped}`,
              `Shared product added · all branches: new ${st.inserted} · updated ${st.updated} · skipped ${st.skipped}`,
              `Đã thêm sản phẩm dùng chung · toàn chi nhánh: mới ${st.inserted} · cập nhật ${st.updated} · bỏ qua ${st.skipped}`,
              `共有商品を追加 · 全店舗: 新規 ${st.inserted} · 更新 ${st.updated} · スキップ ${st.skipped}`,
              `已添加共享商品 · 全门店：新增 ${st.inserted} · 更新 ${st.updated} · 跳过 ${st.skipped}`,
              `Producto compartido añadido · todas las sucursales: nuevos ${st.inserted} · actualizados ${st.updated} · omitidos ${st.skipped}`,
              `Produto compartilhado adicionado · todas as filiais: novos ${st.inserted} · atualizados ${st.updated} · ignorados ${st.skipped}`,
              `Produit partagé ajouté · toutes succursales : nouveaux ${st.inserted} · mis à jour ${st.updated} · ignorés ${st.skipped}`,
              `Gemeinsames Produkt hinzugefügt · alle Filialen: neu ${st.inserted} · aktualisiert ${st.updated} · übersprungen ${st.skipped}`,
              `Общий товар добавлен · по филиалам: новых ${st.inserted} · обновлено ${st.updated} · пропущено ${st.skipped}`,
            ),
          );
        } else {
          toast.success(
            L(
              "공유 상품을 추가했습니다.",
              "Shared product added.",
              "Đã thêm sản phẩm dùng chung.",
              "共有商品を追加しました。",
              "已添加共享商品。",
              "Producto compartido añadido.",
              "Produto compartilhado adicionado.",
              "Produit partagé ajouté.",
              "Gemeinsames Produkt hinzugefügt.",
              "Общий товар добавлен.",
            ),
          );
        }
      }
      setName("");
      setPrice("0");
      setCode("");
      setMainCategory("");
      setMidCategory("");
      await load();
    } finally {
      setSaving(false);
    }
  };

  const downloadExcelTemplate = () => {
    const wb = XLSX.utils.book_new();
    const data = [
      ["상품명", "가격", "코드", "대분류(1차)", "중분류(2차)", "상태"],
      ["샘플 꽃다발 M", 45000, "FL-M-001", "꽃다발", "M", "active"],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "공동상품");
    XLSX.writeFile(
      wb,
      L(
        "floxync_공동상품_양식.xlsx",
        "floxync_shared_catalog_template.xlsx",
        "floxync_shared_catalog_template.xlsx",
        "floxync_shared_catalog_template.xlsx",
        "floxync_shared_catalog_template.xlsx",
        "floxync_shared_catalog_template.xlsx",
        "floxync_shared_catalog_template.xlsx",
        "floxync_shared_catalog_template.xlsx",
        "floxync_shared_catalog_template.xlsx",
        "floxync_shared_catalog_template.xlsx",
      ),
    );
  };

  const onExcelSelected = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !orgId) return;

    setImporting(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const rows = parseExcelJsonToImportRows(json);
      const dataRowCount = json.filter((r) => peekSheetRowName(r).length > 0).length;
      if (rows.length === 0) {
        toast.error(
          L(
            "유효한 행이 없습니다. 상품명·대분류·중분류(2차)·가격 열을 확인하세요. (대분류/중분류는 필수)",
            "No valid rows. Check name, main/sub category, and price columns (main/sub required).",
            "Không có dòng hợp lệ. Kiểm tra tên, danh mục chính/phụ và cột giá (bắt buộc có chính/phụ).",
            "有効な行がありません。商品名・大分類・中分類（2次）・価格列を確認してください（大/中分類は必須）。",
            "没有有效行。请检查商品名、主/子分类与价格列（主/子分类必填）。",
            "No hay filas válidas. Revise nombre, categoría principal/sub y precio (principal/sub obligatorias).",
            "Nenhuma linha válida. Verifique nome, categorias principal/sub e preço (principal/sub obrigatórias).",
            "Aucune ligne valide. Vérifiez nom, catégories principale/sous et prix (obligatoires).",
            "Keine gültigen Zeilen. Name, Haupt-/Unterkategorie und Preis prüfen (Pflicht).",
            "Нет допустимых строк. Проверьте название, основную/подкатегорию и цену (обязательны).",
          ),
        );
        return;
      }
      if (dataRowCount > rows.length) {
        const skipped = dataRowCount - rows.length;
        toast.warning(
          L(
            `${skipped}행은 대분류·중분류(2차) 누락 등으로 제외했습니다.`,
            `${skipped} row(s) were skipped (missing main/sub category, etc.).`,
            `${skipped} dòng đã bị bỏ qua (thiếu danh mục chính/phụ, v.v.).`,
            `${skipped} 行は大・中分類（2次）欠落などで除外しました。`,
            `已跳过 ${skipped} 行（缺少主/子分类等）。`,
            `${skipped} fila(s) omitidas (falta categoría principal/sub, etc.).`,
            `${skipped} linha(s) ignoradas (falta categoria principal/sub, etc.).`,
            `${skipped} ligne(s) ignorées (catégorie principale/sous manquante, etc.).`,
            `${skipped} Zeile(n) übersprungen (fehlende Haupt-/Unterkategorie usw.).`,
            `Пропущено строк: ${skipped} (нет основной/подкатегории и т.д.).`,
          ),
        );
      }

      const res = await fetch("/api/hq/catalog/bulk-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          organizationId: orgId,
          items: rows,
          syncToBranches: true,
          uiLocale: locale,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(
          typeof j?.error === "string"
            ? j.error
            : L(
                "일괄 등록에 실패했습니다.",
                "Bulk import failed.",
                "Nhập hàng loạt thất bại.",
                "一括登録に失敗しました",
                "批量导入失败",
                "Error en la importación masiva",
                "Falha na importação em massa",
                "Échec de l’import en masse",
                "Massenimport fehlgeschlagen",
                "Массовый импорт не удался",
              ),
        );
        return;
      }

      const st = j?.syncTotals as
        | { inserted: number; updated: number; skipped: number }
        | undefined;
      const written = typeof j?.catalogWritten === "number" ? j.catalogWritten : rows.length;
      if (j?.syncError) {
        toast.warning(
          L(
            `카탈로그 ${written}건 저장했으나 지점 동기화 오류: ${j.syncError}`,
            `Saved ${written} catalog row(s), but branch sync error: ${j.syncError}`,
            `Đã lưu ${written} dòng danh mục nhưng lỗi đồng bộ chi nhánh: ${j.syncError}`,
            `カタログ ${written} 件は保存しましたが、店舗同期エラー: ${j.syncError}`,
            `已保存 ${written} 条目录，但门店同步出错：${j.syncError}`,
            `Se guardaron ${written} filas del catálogo, pero error de sincronización: ${j.syncError}`,
            `Salvas ${written} linhas do catálogo, mas erro de sincronização: ${j.syncError}`,
            `${written} ligne(s) catalogue enregistrées, erreur synchro succursales : ${j.syncError}`,
            `${written} Katalogzeilen gespeichert, Filial-Sync-Fehler: ${j.syncError}`,
            `Сохранено записей каталога: ${written}, ошибка синхронизации филиалов: ${j.syncError}`,
          ),
        );
      } else if (st) {
        toast.success(
          L(
            `카탈로그 ${written}건 반영 · 전 지점 동기화: 신규 ${st.inserted} · 갱신 ${st.updated} · 건너뜀 ${st.skipped}`,
            `Applied ${written} catalog row(s) · all branches: new ${st.inserted} · updated ${st.updated} · skipped ${st.skipped}`,
            `Đã áp dụng ${written} dòng danh mục · toàn chi nhánh: mới ${st.inserted} · cập nhật ${st.updated} · bỏ qua ${st.skipped}`,
            `カタログ ${written} 件を反映 · 全店舗同期: 新規 ${st.inserted} · 更新 ${st.updated} · スキップ ${st.skipped}`,
            `已应用 ${written} 条目录 · 全门店同步：新增 ${st.inserted} · 更新 ${st.updated} · 跳过 ${st.skipped}`,
            `Aplicadas ${written} filas · todas las sucursales: nuevas ${st.inserted} · actualizadas ${st.updated} · omitidas ${st.skipped}`,
            `Aplicadas ${written} linhas · todas as filiais: novas ${st.inserted} · atualizadas ${st.updated} · ignoradas ${st.skipped}`,
            `${written} ligne(s) appliquées · toutes succursales : nouveaux ${st.inserted} · mis à jour ${st.updated} · ignorés ${st.skipped}`,
            `${written} Katalogzeilen angewendet · alle Filialen: neu ${st.inserted} · aktualisiert ${st.updated} · übersprungen ${st.skipped}`,
            `Применено записей: ${written} · по филиалам: новых ${st.inserted} · обновлено ${st.updated} · пропущено ${st.skipped}`,
          ),
        );
      } else {
        toast.success(
          L(
            `카탈로그 ${written}건을 저장했습니다.`,
            `Saved ${written} catalog row(s).`,
            `Đã lưu ${written} dòng danh mục.`,
            `カタログ ${written} 件を保存しました。`,
            `已保存 ${written} 条目录记录。`,
            `Se guardaron ${written} filas del catálogo.`,
            `Salvas ${written} linhas do catálogo.`,
            `${written} ligne(s) catalogue enregistrée(s).`,
            `${written} Katalogzeilen gespeichert.`,
            `Сохранено записей каталога: ${written}.`,
          ),
        );
      }
      if (Array.isArray(j?.importErrors) && j.importErrors.length > 0) {
        toast.message(
          L(
            "일부 행 오류",
            "Some rows had errors",
            "Một số dòng lỗi",
            "一部の行にエラー",
            "部分行有误",
            "Algunas filas con errores",
            "Algumas linhas com erro",
            "Certaines lignes ont des erreurs",
            "Einige Zeilen mit Fehlern",
            "Ошибки в некоторых строках",
          ),
          {
            description: String(j.importErrors[0]).slice(0, 200),
          },
        );
      }
      await load();
    } catch {
      toast.error(
        L(
          "엑셀을 읽는 중 오류가 났습니다.",
          "Failed while reading the spreadsheet.",
          "Lỗi khi đọc tệp bảng tính.",
          "スプレッドシートの読み取り中にエラーが発生しました",
          "读取表格时出错",
          "Error al leer la hoja de cálculo",
          "Erro ao ler a planilha",
          "Erreur lors de la lecture du tableur",
          "Fehler beim Lesen der Tabelle",
          "Ошибка при чтении таблицы",
        ),
      );
    } finally {
      setImporting(false);
    }
  };

  if (orgNames.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {L(
              "브랜드 공유 상품",
              "Brand shared catalog",
              "Danh mục dùng chung thương hiệu",
              "ブランド共有カタログ",
              "品牌共享商品",
              "Catálogo compartido de marca",
              "Catálogo compartilhado da marca",
              "Catalogue partagé de la marque",
              "Marken-gemeinsamer Katalog",
              "Общий каталог бренда",
            )}
          </CardTitle>
          <CardDescription>
            {L(
              "엑셀 일괄 등록 시 카탈로그에 저장한 뒤 ",
              "When bulk-importing from Excel, rows are saved to the catalog and ",
              "Khi nhập hàng loạt từ Excel, dữ liệu được lưu vào danh mục và ",
              "Excel一括取込ではカタログに保存したうえで、",
              "从 Excel 批量导入时，会先保存到目录并",
              "Al importar desde Excel, las filas se guardan en el catálogo y ",
              "Ao importar do Excel, as linhas são salvas no catálogo e ",
              "Lors d’un import Excel, les lignes sont enregistrées dans le catalogue puis ",
              "Beim Excel-Import werden die Zeilen im Katalog gespeichert und ",
              "При импорте из Excel строки сохраняются в каталоге и ",
            )}
            <strong className="text-foreground">
              {L(
                "조직 소속 모든 지점 상품",
                "every branch catalog in the organization",
                "mọi danh mục chi nhánh trong tổ chức",
                "組織に属する全店舗の商品",
                "组织下属所有门店的商品",
                "todos los catálogos de sucursales de la organización",
                "todos os catálogos das filiais da organização",
                "tous les catalogues des succursales de l’organisation",
                "alle Filialkataloge der Organisation",
                "каталоги всех филиалов организации",
              )}
            </strong>
            {L(
              "에 자동 반영합니다. ",
              " are updated automatically. ",
              " được cập nhật tự động. ",
              "に自動反映されます。 ",
              "会自动同步。 ",
              " se actualizan automáticamente. ",
              " são atualizados automaticamente. ",
              " sont mis à jour automatiquement. ",
              " werden automatisch aktualisiert. ",
              " автоматически обновляются. ",
            )}
            {L(
              "지점 ",
              "If the branch ",
              "Nếu ",
              "店舗の",
              "若门店",
              "Si en la sucursal el ",
              "Se na filial o ",
              "Si le ",
              "Wenn der Filial-",
              "Если ",
            )}
            <strong className="text-foreground">
              {L("코드", "product code", "mã sản phẩm", "コード", "商品代码", "código", "código", "code", "Code", "код")}
            </strong>
            {L(
              "가 같으면 가격·이름 등을 갱신하고, 없으면 신규로 넣습니다.",
              " matches, price and name are updated; otherwise a new row is created.",
              " trùng, giá và tên được cập nhật; nếu không sẽ tạo dòng mới.",
              "が一致すれば価格・名称などを更新し、なければ新規行を追加します。",
              "一致则更新价格、名称等；否则新增一行。",
              " coincide, se actualizan precio y nombre; si no, se crea una fila nueva.",
              " coincidir, preço e nome são atualizados; senão, cria-se uma nova linha.",
              " correspond, prix et nom sont mis à jour ; sinon une nouvelle ligne est créée.",
              " übereinstimmt, werden Preis und Name aktualisiert; sonst wird eine neue Zeile angelegt.",
              " совпадает, обновляются цена и имя; иначе создаётся новая строка.",
            )}{" "}
            {L(
              "코드가 비어 있으면 매번 새 행으로 들어가므로 동기화에는 코드 사용을 권장합니다.",
              "Empty codes create duplicate rows—using codes is recommended for sync.",
              "Mã trống dễ tạo dòng trùng—nên dùng mã khi đồng bộ.",
              "コードが空だと毎回新しい行になるため、同期にはコードの利用を推奨します。",
              "代码为空时每次都会新增行，同步时建议使用代码。",
              "Los códigos vacíos generan filas duplicadas: se recomienda usar códigos al sincronizar.",
              "Códigos vazios geram linhas duplicadas — use códigos para sincronizar.",
              "Les codes vides créent des doublons — utilisez des codes pour la synchro.",
              "Leere Codes erzeugen Duplikate — Codes für die Synchronisation empfohlen.",
              "Пустые коды дают дубликаты — для синхронизации лучше указывать код.",
            )}{" "}
            <strong className="text-foreground">
              {L(
                "대분류·중분류(2차)",
                "Main and sub (2nd-level) categories",
                "Danh mục chính và phụ (cấp 2)",
                "大分類・中分類（2次）",
                "主分类与子分类（二级）",
                "Categoría principal y sub (nivel 2)",
                "Categoria principal e sub (2º nível)",
                "Catégorie principale et sous-catégorie (niveau 2)",
                "Haupt- und Unterkategorie (2. Ebene)",
                "Основная и подкатегория (2-й уровень)",
              )}
            </strong>
            {L(
              "는 개별 추가·엑셀 모두 필수입니다.",
              " are required for manual adds and Excel.",
              " là bắt buộc cho thêm thủ công và Excel.",
              "は手動追加・Excelのいずれでも必須です。",
              "在手动添加和 Excel 导入中均为必填。",
              " son obligatorias en altas manuales y en Excel.",
              " são obrigatórias em adições manuais e no Excel.",
              " sont obligatoires pour les ajouts manuels et Excel.",
              " sind für manuelle Einträge und Excel erforderlich.",
              " обязательны при ручном добавлении и в Excel.",
            )}
          </CardDescription>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-1 shrink-0" onClick={() => load()} disabled={loading}>
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          {L(
            "새로고침",
            "Refresh",
            "Làm mới",
            "再読込",
            "刷新",
            "Actualizar",
            "Atualizar",
            "Actualiser",
            "Aktualisieren",
            "Обновить",
          )}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {warning ? (
          <p className="text-sm text-amber-800 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/40 rounded-lg px-3 py-2">
            {warning}
          </p>
        ) : null}

        {canManage ? (
          <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/30">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {L(
                "엑셀 일괄 등록 · 전 지점 동기화",
                "Excel bulk import · sync all branches",
                "Nhập Excel hàng loạt · đồng bộ mọi chi nhánh",
                "Excel一括登録 · 全店舗同期",
                "Excel 批量导入 · 同步全门店",
                "Importación masiva Excel · sincronizar todas las sucursales",
                "Importação em massa Excel · sincronizar todas as filiais",
                "Import Excel en masse · synchro toutes succursales",
                "Excel-Massenimport · alle Filialen synchronisieren",
                "Массовый импорт Excel · синхронизация всех филиалов",
              )}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="sr-only"
                onChange={onExcelSelected}
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="gap-1.5"
                disabled={importing || !orgId}
                onClick={() => fileRef.current?.click()}
              >
                {importing ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                )}
                {L(
                  "엑셀 업로드",
                  "Upload Excel",
                  "Tải lên Excel",
                  "Excelをアップロード",
                  "上传 Excel",
                  "Subir Excel",
                  "Enviar Excel",
                  "Téléverser Excel",
                  "Excel hochladen",
                  "Загрузить Excel",
                )}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={downloadExcelTemplate}>
                {L(
                  "양식 다운로드",
                  "Download template",
                  "Tải mẫu",
                  "テンプレートをダウンロード",
                  "下载模板",
                  "Descargar plantilla",
                  "Baixar modelo",
                  "Télécharger le modèle",
                  "Vorlage herunterladen",
                  "Скачать шаблон",
                )}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              {L(
                "첫 번째 시트, 1행 헤더 — ",
                "Use the first sheet with a header row — ",
                "Dùng sheet đầu, hàng tiêu đề — ",
                "最初のシート、1行目ヘッダー — ",
                "使用第一个工作表，第 1 行为表头 — ",
                "Primera hoja, fila 1 de cabecera — ",
                "Primeira planilha, linha 1 de cabeçalho — ",
                "Première feuille, ligne 1 d’en-tête — ",
                "Erstes Blatt, Kopfzeile in Zeile 1 — ",
                "Первый лист, строка 1 — заголовки — ",
              )}
              <strong className="text-foreground">
                {L(
                  "상품명·대분류·중분류(2차)·가격",
                  "Name, main & sub category, price",
                  "Tên, danh mục chính/phụ, giá",
                  "商品名・大分類・中分類（2次）・価格",
                  "商品名、主/子分类（二级）、价格",
                  "Nombre, categoría principal/sub y precio",
                  "Nome, categoria principal/sub e preço",
                  "Nom, catégorie principale/sous et prix",
                  "Name, Haupt-/Unterkategorie und Preis",
                  "Название, основная/подкатегория и цена",
                )}
              </strong>
              {L(
                " 필수, 코드·상태 선택. 헤더 예: ",
                " required; code and status optional. Headers like ",
                " bắt buộc; mã và trạng thái tùy chọn. Ví dụ tiêu đề: ",
                " は必須、コード・状態は任意。ヘッダ例: ",
                " 必填；代码、状态可选。表头示例：",
                " obligatorios; código y estado opcionales. Ejemplos: ",
                " obrigatórios; código e status opcionais. Ex.: ",
                " obligatoires ; code et statut facultatifs. Ex. d’en-têtes : ",
                " erforderlich; Code und Status optional. Kopfzeilen z. B.: ",
                " обязательны; код и статус — по желанию. Примеры заголовков: ",
              )}
              <span className="font-mono">2차카테고리</span>·
              <span className="font-mono">중분류</span>
              {L(
                " 모두 인식합니다. CSV도 동일하면 업로드 가능합니다.",
                " are recognized. CSV works if columns match.",
                " đều được nhận. CSV được nếu cột khớp.",
                " のどちらも認識します。列が一致すればCSVもアップロードできます。",
                " 均可识别。列一致时也可上传 CSV。",
                " se reconocen. CSV si las columnas coinciden.",
                " são reconhecidos. CSV se as colunas coincidirem.",
                " sont reconnus. CSV si les colonnes correspondent.",
                " werden erkannt. CSV, wenn die Spalten passen.",
                " распознаются. CSV — если столбцы совпадают.",
              )}
            </p>

            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-2 border-t border-slate-200/80 dark:border-slate-700/80">
              {L(
                "항목 개별 추가",
                "Add items one by one",
                "Thêm từng mục",
                "項目を1件ずつ追加",
                "逐条添加",
                "Añadir artículos uno a uno",
                "Adicionar itens um a um",
                "Ajouter les articles un par un",
                "Artikel einzeln hinzufügen",
                "Добавлять позиции по одной",
              )}
            </p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {orgNames.length > 1 ? (
                <label className="text-xs space-y-1 sm:col-span-2 xl:col-span-2">
                  <span className="text-muted-foreground">
                    {L("조직", "Organization", "Tổ chức", "組織", "组织", "Organización", "Organização", "Organisation", "Organisation", "Организация")}
                  </span>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                  >
                    {orgNames.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">
                  {L(
                    "대분류 (1차) · 필수",
                    "Main category · required",
                    "Danh mục chính · bắt buộc",
                    "大分類（1次）·必須",
                    "主分类 · 必填",
                    "Categoría principal · obligatoria",
                    "Categoria principal · obrigatória",
                    "Catégorie principale · obligatoire",
                    "Hauptkategorie · Pflicht",
                    "Основная категория · обязательно",
                  )}
                </span>
                <Input
                  value={mainCategory}
                  onChange={(e) => setMainCategory(e.target.value)}
                  placeholder={L(
                    "예: 꽃다발",
                    "e.g. Bouquet",
                    "vd: Hoa bó",
                    "例: 花束",
                    "例如：花束",
                    "p. ej. Ramo",
                    "ex.: Buquê",
                    "ex. : Bouquet",
                    "z. B. Strauß",
                    "напр.: Букет",
                  )}
                />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">
                  {L(
                    "중분류 (2차) · 필수",
                    "Sub category (2nd) · required",
                    "Danh mục phụ (cấp 2) · bắt buộc",
                    "中分類（2次）·必須",
                    "子分类 · 必填",
                    "Subcategoría (2.º nivel) · obligatoria",
                    "Subcategoria (2º) · obrigatória",
                    "Sous-catégorie (niv. 2) · obligatoire",
                    "Unterkategorie (2.) · Pflicht",
                    "Подкатегория (2-й ур.) · обязательно",
                  )}
                </span>
                <Input
                  value={midCategory}
                  onChange={(e) => setMidCategory(e.target.value)}
                  placeholder={L("예: M", "e.g. M", "vd: M", "例: M", "例如：M", "p. ej. M", "ex.: M", "ex. : M", "z. B. M", "напр.: M")}
                />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">
                  {L(
                    "상품명",
                    "Product name",
                    "Tên sản phẩm",
                    "商品名",
                    "商品名称",
                    "Nombre del producto",
                    "Nome do produto",
                    "Nom du produit",
                    "Produktname",
                    "Название товара",
                  )}
                </span>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={L(
                    "예: 꽃다발 M",
                    "e.g. Bouquet M",
                    "vd: Hoa bó M",
                    "例: 花束 M",
                    "例如：花束 M",
                    "p. ej. Ramo M",
                    "ex.: Buquê M",
                    "ex. : Bouquet M",
                    "z. B. Strauß M",
                    "напр.: Букет M",
                  )}
                />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">
                  {L("가격", "Price", "Giá", "価格", "价格", "Precio", "Preço", "Prix", "Preis", "Цена")}
                </span>
                <Input value={price} onChange={(e) => setPrice(e.target.value)} type="number" min={0} />
              </label>
              <label className="text-xs space-y-1">
                <span className="text-muted-foreground">
                  {L(
                    "코드 (선택)",
                    "Code (optional)",
                    "Mã (tùy chọn)",
                    "コード（任意）",
                    "代码（可选）",
                    "Código (opcional)",
                    "Código (opcional)",
                    "Code (facultatif)",
                    "Code (optional)",
                    "Код (необязательно)",
                  )}
                </span>
                <Input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={L(
                    "중복 시 스킵",
                    "Skip if duplicate",
                    "Trùng thì bỏ qua",
                    "重複時はスキップ",
                    "重复则跳过",
                    "Omitir si duplicado",
                    "Ignorar se duplicado",
                    "Ignorer si doublon",
                    "Bei Duplikat überspringen",
                    "Пропустить при дубликате",
                  )}
                />
              </label>
            </div>
            <Button type="button" size="sm" className="w-fit gap-1" onClick={addItem} disabled={saving}>
              <Plus className="h-3.5 w-3.5" />
              {L("추가", "Add", "Thêm", "追加", "添加", "Añadir", "Adicionar", "Ajouter", "Hinzufügen", "Добавить")}
            </Button>
          </div>
        ) : null}

        {loading ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{tf.f01292}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {L(
              "등록된 공유 상품이 없습니다.",
              "No shared catalog items yet.",
              "Chưa có mục danh mục dùng chung.",
              "共有商品はまだありません。",
              "尚无共享商品。",
              "Aún no hay artículos del catálogo compartido.",
              "Ainda não há itens do catálogo compartilhado.",
              "Aucun article du catalogue partagé pour le moment.",
              "Noch keine gemeinsamen Katalogartikel.",
              "Общих позиций каталога пока нет.",
            )}
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{L("상품명", "Name", "Tên", "商品名", "名称", "Nombre", "Nome", "Nom", "Name", "Название")}</TableHead>
                <TableHead>{L("대분류", "Main", "Chính", "大分類", "主类", "Principal", "Principal", "Principal", "Haupt", "Основная")}</TableHead>
                <TableHead>{L("중분류", "Sub", "Phụ", "中分類", "子类", "Sub", "Sub", "Sous", "Sub", "Подкат.")}</TableHead>
                <TableHead>{L("코드", "Code", "Mã", "コード", "代码", "Código", "Código", "Code", "Code", "Код")}</TableHead>
                <TableHead className="text-right">
                  {L("가격", "Price", "Giá", "価格", "价格", "Precio", "Preço", "Prix", "Preis", "Цена")}
                </TableHead>
                <TableHead>{L("상태", "Status", "Trạng thái", "状態", "状态", "Estado", "Status", "Statut", "Status", "Статус")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((it) => (
                <TableRow key={it.id}>
                  <TableCell className="font-medium">{it.name}</TableCell>
                  <TableCell className="text-sm">{it.main_category ?? "—"}</TableCell>
                  <TableCell className="text-sm">{it.mid_category ?? "—"}</TableCell>
                  <TableCell className="font-mono text-xs">{it.code ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {Number(it.price).toLocaleString()}
                    {L("원", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{it.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
