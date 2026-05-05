import { pickUiText } from "@/i18n/pick-ui-text";

/** GET: 스키마 미적용 시 안내 warning */
export function warnBranchMatSchemaToQuery(bl: string) {
  return pickUiText(
    bl,
    "branch_material_requests_schema.sql 을 적용하면 자재 요청을 조회할 수 있습니다.",
    "Apply branch_material_requests_schema.sql in Supabase to load material requests.",
    "Áp dụng branch_material_requests_schema.sql trên Supabase để xem yêu cầu vật tư.",
    "Supabase に branch_material_requests_schema.sql を適用すると資材リクエストを表示できます。",
    "在 Supabase 应用 branch_material_requests_schema.sql 后即可查询物料申请。",
    "Aplique branch_material_requests_schema.sql en Supabase para consultar solicitudes de material.",
    "Aplique branch_material_requests_schema.sql no Supabase para carregar solicitações de material.",
    "Appliquez branch_material_requests_schema.sql dans Supabase pour charger les demandes de matériel.",
    "Wenden Sie branch_material_requests_schema.sql in Supabase an, um Materialanfragen zu laden.",
    "Примените branch_material_requests_schema.sql в Supabase, чтобы загружать заявки на материалы.",
  );
}

export function errBranchMatOnlyBranchAccount(bl: string) {
  return pickUiText(
    bl,
    "지점(매장)에 배정된 계정에서만 자재 요청을 보낼 수 있습니다.",
    "Material requests can only be sent from accounts assigned to a branch store.",
    "Chỉ tài khoản được gán cho cửa hàng chi nhánh mới gửi được yêu cầu vật tư.",
    "店舗に割り当てられたアカウントのみ資材リクエストを送信できます。",
    "仅分配给门店的账号可发送物料申请。",
    "Solo las cuentas asignadas a una tienda sucursal pueden enviar solicitudes de material.",
    "Somente contas atribuídas a uma filial podem enviar solicitações de material.",
    "Seuls les comptes affectés à une succursale peuvent envoyer des demandes de matériel.",
    "Materialanfragen sind nur von Konten möglich, die einer Filiale zugewiesen sind.",
    "Заявки на материалы могут отправлять только учётные записи, привязанные к филиалу.",
  );
}

export function errBranchMatNeedOneLine(bl: string) {
  return pickUiText(
    bl,
    "요청 품목을 1개 이상 추가하세요.",
    "Add at least one line item.",
    "Thêm ít nhất một dòng hàng.",
    "品目を1行以上追加してください。",
    "请至少添加一行物料。",
    "Añada al menos una línea de artículo.",
    "Adicione pelo menos um item de linha.",
    "Ajoutez au moins une ligne d’article.",
    "Fügen Sie mindestens eine Position hinzu.",
    "Добавьте хотя бы одну строку позиции.",
  );
}

export function errBranchMatMaxLines(bl: string) {
  return pickUiText(
    bl,
    "한 번에 최대 100품목까지 요청할 수 있습니다.",
    "You can request at most 100 line items at once.",
    "Mỗi lần chỉ có thể yêu cầu tối đa 100 dòng.",
    "1回のリクエストは最大100行までです。",
    "单次最多申请 100 行物料。",
    "Como máximo 100 líneas por solicitud.",
    "No máximo 100 linhas por solicitação.",
    "100 lignes maximum par demande.",
    "Höchstens 100 Positionen pro Anfrage.",
    "Не более 100 строк за один запрос.",
  );
}

export function errBranchMatStoreNotLinkedToOrg(bl: string) {
  return pickUiText(
    bl,
    "이 매장은 본사 조직에 연결되어 있지 않아 요청을 보낼 수 없습니다.",
    "This store is not linked to a head-office organization, so requests cannot be sent.",
    "Cửa hàng này chưa liên kết tổ chức trụ sở nên không gửi được yêu cầu.",
    "この店舗は本部組織に未連携のためリクエストを送信できません。",
    "该门店未关联总部组织，无法发送申请。",
    "Esta tienda no está vinculada a la organización central.",
    "Esta filial não está vinculada à organização matriz.",
    "Ce magasin n’est pas rattaché à l’organisation siège.",
    "Dieser Laden ist nicht mit der Hauptorganisation verknüpft.",
    "Магазин не привязан к организации головного офиса.",
  );
}

export function errBranchMatInvalidPatchBody(bl: string) {
  return pickUiText(
    bl,
    "requestIds와 status를 확인하세요.",
    "Check requestIds and status.",
    "Kiểm tra requestIds và status.",
    "requestIds と status を確認してください。",
    "请检查 requestIds 与 status。",
    "Revise requestIds y status.",
    "Verifique requestIds e status.",
    "Vérifiez requestIds et status.",
    "Prüfen Sie requestIds und status.",
    "Проверьте requestIds и status.",
  );
}

export function errBranchMatRequestsNotFound(bl: string) {
  return pickUiText(
    bl,
    "요청을 찾을 수 없습니다.",
    "No matching requests were found.",
    "Không tìm thấy yêu cầu phù hợp.",
    "該当するリクエストが見つかりません。",
    "未找到匹配的申请。",
    "No se encontraron solicitudes coincidentes.",
    "Nenhuma solicitação correspondente encontrada.",
    "Aucune demande correspondante.",
    "Keine passenden Anfragen gefunden.",
    "Подходящие заявки не найдены.",
  );
}

export function errBranchMatSomeInvalidRequestIds(bl: string) {
  return pickUiText(
    bl,
    "일부 요청 id가 유효하지 않습니다.",
    "Some request ids are invalid.",
    "Một số id yêu cầu không hợp lệ.",
    "一部のリクエスト id が無効です。",
    "部分请求 id 无效。",
    "Algunos ids de solicitud no son válidos.",
    "Alguns ids de solicitação são inválidos.",
    "Certains ids de demande sont invalides.",
    "Einige Anfrage-IDs sind ungültig.",
    "Некоторые id заявок недействительны.",
  );
}

export function errBranchMatLineRequiredFields(bl: string, lineNum: number) {
  const ko = `${lineNum}번째 줄: 품목명·대분류·중분류(2차)는 필수입니다.`;
  const en = `Line ${lineNum}: name, main category, and sub (2nd-level) category are required.`;
  return pickUiText(
    bl,
    ko,
    en,
    `Dòng ${lineNum}: tên, danh mục chính và phụ (cấp 2) là bắt buộc.`,
    `${lineNum} 行目: 品名・大分類・中分類（2次）は必須です。`,
    `第 ${lineNum} 行：名称、主分类与子分类（二级）为必填。`,
    `Línea ${lineNum}: nombre, categoría principal y sub (nivel 2) obligatorios.`,
    `Linha ${lineNum}: nome, categoria principal e sub (nível 2) obrigatórios.`,
    `Ligne ${lineNum} : nom, catégorie principale et sous-catégorie (niveau 2) requis.`,
    `Zeile ${lineNum}: Name, Haupt- und Unterkategorie (Ebene 2) erforderlich.`,
    `Строка ${lineNum}: нужны название, основная и подкатегория (2-й уровень).`,
  );
}

export function errBranchMatLineBadQty(bl: string, lineNum: number) {
  return pickUiText(
    bl,
    `${lineNum}번째 줄: 수량을 확인하세요.`,
    `Line ${lineNum}: check the quantity.`,
    `Dòng ${lineNum}: kiểm tra số lượng.`,
    `${lineNum} 行目: 数量を確認してください。`,
    `第 ${lineNum} 行：请检查数量。`,
    `Línea ${lineNum}: revise la cantidad.`,
    `Linha ${lineNum}: verifique a quantidade.`,
    `Ligne ${lineNum} : vérifiez la quantité.`,
    `Zeile ${lineNum}: Menge prüfen.`,
    `Строка ${lineNum}: проверьте количество.`,
  );
}

export function errBranchMatLineMaterialNotFound(bl: string, lineNum: number) {
  return pickUiText(
    bl,
    `${lineNum}번째 줄: 선택한 자재를 이 매장에서 찾을 수 없습니다.`,
    `Line ${lineNum}: the selected material was not found for this store.`,
    `Dòng ${lineNum}: không tìm thấy vật tư đã chọn tại cửa hàng này.`,
    `${lineNum} 行目: 選択した資材がこの店舗に見つかりません。`,
    `第 ${lineNum} 行：本门店未找到所选物料。`,
    `Línea ${lineNum}: no se encontró el material seleccionado en esta tienda.`,
    `Linha ${lineNum}: material selecionado não encontrado nesta filial.`,
    `Ligne ${lineNum} : matériau sélectionné introuvable pour ce magasin.`,
    `Zeile ${lineNum}: ausgewähltes Material in dieser Filiale nicht gefunden.`,
    `Строка ${lineNum}: выбранный материал не найден в этой точке.`,
  );
}

export function errBranchMatLineSimilar(
  bl: string,
  lineNum: number,
  name: string,
  similarList: string,
) {
  const ko = `${lineNum}번째 줄 「${name}」이(가) 기존 자재·요청 줄과 유사합니다: ${similarList}`;
  const en = `Line ${lineNum}: "${name}" is too similar to existing materials or lines: ${similarList}`;
  return pickUiText(
    bl,
    ko,
    en,
    `Dòng ${lineNum}: 「${name}」 quá giống vật tư/dòng hiện có: ${similarList}`,
    `${lineNum} 行目:「${name}」は既存の資材・行と類似しています: ${similarList}`,
    `第 ${lineNum} 行：「${name}」与现有物料或行过于相似：${similarList}`,
    `Línea ${lineNum}: «${name}» es demasiado similar a materiales o líneas existentes: ${similarList}`,
    `Linha ${lineNum}: «${name}» é muito parecido com materiais ou linhas existentes: ${similarList}`,
    `Ligne ${lineNum} : «${name}» trop proche de matériaux ou lignes existants : ${similarList}`,
    `Zeile ${lineNum}: „${name}“ zu ähnlich zu vorhandenen Materialien/Zeilen: ${similarList}`,
    `Строка ${lineNum}: «${name}» слишком похоже на существующие материалы/строки: ${similarList}`,
  );
}

export function errBranchMatLineDupName(bl: string, lineNum: number) {
  return pickUiText(
    bl,
    `${lineNum}번째 줄: 같은 요청 안에 동일한 품목명이 이미 있습니다.`,
    `Line ${lineNum}: the same item name already exists in this request.`,
    `Dòng ${lineNum}: đã có cùng tên mặt hàng trong yêu cầu này.`,
    `${lineNum} 行目: 同一リクエスト内に同じ品名が既にあります。`,
    `第 ${lineNum} 行：本申请中已存在相同的物料名称。`,
    `Línea ${lineNum}: ya existe el mismo nombre de artículo en esta solicitud.`,
    `Linha ${lineNum}: o mesmo nome de item já existe nesta solicitação.`,
    `Ligne ${lineNum} : le même nom d’article existe déjà dans cette demande.`,
    `Zeile ${lineNum}: derselben Artikelname ist in dieser Anfrage bereits vorhanden.`,
    `Строка ${lineNum}: такое же название позиции уже есть в этой заявке.`,
  );
}

export function errBranchMatTableMissing(bl: string) {
  return pickUiText(
    bl,
    "자재 요청 테이블이 없습니다. Supabase에 branch_material_requests_schema.sql 을 적용하세요.",
    "The material requests table is missing. Apply branch_material_requests_schema.sql in Supabase.",
    "Thiếu bảng yêu cầu vật tư. Hãy áp dụng branch_material_requests_schema.sql trên Supabase.",
    "資材リクエストテーブルがありません。Supabase に branch_material_requests_schema.sql を適用してください。",
    "缺少物料申请表。请在 Supabase 应用 branch_material_requests_schema.sql。",
    "Falta la tabla de solicitudes de material. Aplique branch_material_requests_schema.sql en Supabase.",
    "Falta a tabela de solicitações de material. Aplique branch_material_requests_schema.sql no Supabase.",
    "Table des demandes de matériel absente. Appliquez branch_material_requests_schema.sql dans Supabase.",
    "Tabelle für Materialanfragen fehlt. Wenden Sie branch_material_requests_schema.sql in Supabase an.",
    "Отсутствует таблица заявок на материалы. Примените branch_material_requests_schema.sql в Supabase.",
  );
}

export function errBranchMatLinesTableMissing(bl: string) {
  return pickUiText(
    bl,
    "자재 요청 줄 테이블이 없습니다. Supabase에 branch_material_requests_schema.sql 을 적용하세요.",
    "The material request lines table is missing. Apply branch_material_requests_schema.sql in Supabase.",
    "Thiếu bảng dòng yêu cầu vật tư. Hãy áp dụng branch_material_requests_schema.sql trên Supabase.",
    "資材リクエスト行テーブルがありません。Supabase に branch_material_requests_schema.sql を適用してください。",
    "缺少物料申请行表。请在 Supabase 应用 branch_material_requests_schema.sql。",
    "Falta la tabla de líneas de solicitud. Aplique branch_material_requests_schema.sql en Supabase.",
    "Falta a tabela de linhas de solicitação. Aplique branch_material_requests_schema.sql no Supabase.",
    "Table des lignes de demande absente. Appliquez branch_material_requests_schema.sql dans Supabase.",
    "Tabelle für Anfragezeilen fehlt. Wenden Sie branch_material_requests_schema.sql in Supabase an.",
    "Отсутствует таблица строк заявок. Примените branch_material_requests_schema.sql в Supabase.",
  );
}