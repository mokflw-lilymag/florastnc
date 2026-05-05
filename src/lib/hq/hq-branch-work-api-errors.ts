import { pickUiText } from "@/i18n/pick-ui-text";

export function errHqInvalidBranchTenantId(bl: string) {
  return pickUiText(
    bl,
    "유효하지 않은 지점 ID입니다.",
    "Invalid branch id.",
    "ID chi nhánh không hợp lệ.",
    "店舗 ID が無効です。",
    "门店 ID 无效。",
    "ID de sucursal no válido.",
    "ID da filial inválido.",
    "ID de succursale invalide.",
    "Ungültige Filial-ID.",
    "Некорректный ID филиала.",
  );
}

export function errHqBranchNotFound(bl: string) {
  return pickUiText(
    bl,
    "지점을 찾을 수 없습니다.",
    "Branch was not found.",
    "Không tìm thấy chi nhánh.",
    "店舗が見つかりません。",
    "未找到门店。",
    "No se encontró la sucursal.",
    "Filial não encontrada.",
    "Succursale introuvable.",
    "Filiale nicht gefunden.",
    "Филиал не найден.",
  );
}

export function errHqBranchOrgRequired(bl: string) {
  return pickUiText(
    bl,
    "조직에 연결된 지점만 처리할 수 있습니다.",
    "Only branches linked to an organization can be processed.",
    "Chỉ có thể xử lý chi nhánh đã liên kết với tổ chức.",
    "組織に紐づいた店舗のみ処理できます。",
    "仅可处理已关联组织的门店。",
    "Solo se pueden procesar sucursales vinculadas a una organización.",
    "Somente filiais vinculadas a uma organização podem ser processadas.",
    "Seules les succursales liées à une organisation peuvent être traitées.",
    "Nur Filialen mit Organisationszuordnung sind möglich.",
    "Обрабатывать можно только филиалы, привязанные к организации.",
  );
}

export function errHqServiceRoleRequired(bl: string) {
  return pickUiText(
    bl,
    "SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
    "SUPABASE_SERVICE_ROLE_KEY is required.",
    "Cần SUPABASE_SERVICE_ROLE_KEY.",
    "SUPABASE_SERVICE_ROLE_KEY が必要です。",
    "需要 SUPABASE_SERVICE_ROLE_KEY。",
    "Se requiere SUPABASE_SERVICE_ROLE_KEY.",
    "SUPABASE_SERVICE_ROLE_KEY é obrigatória.",
    "SUPABASE_SERVICE_ROLE_KEY est requis.",
    "SUPABASE_SERVICE_ROLE_KEY ist erforderlich.",
    "Требуется SUPABASE_SERVICE_ROLE_KEY.",
  );
}

export function errFulfillRequestIdItems(bl: string) {
  return pickUiText(
    bl,
    "requestId와 items가 필요합니다.",
    "requestId and items are required.",
    "Cần requestId và items.",
    "requestId と items が必要です。",
    "需要 requestId 与 items。",
    "Se requiere requestId e items.",
    "requestId e items são obrigatórios.",
    "requestId et items sont requis.",
    "requestId und items sind erforderlich.",
    "Нужны requestId и items.",
  );
}

export function errFulfillRequestNotFound(bl: string) {
  return pickUiText(
    bl,
    "요청을 찾을 수 없습니다.",
    "Request was not found.",
    "Không tìm thấy yêu cầu.",
    "リクエストが見つかりません。",
    "未找到请求。",
    "No se encontró la solicitud.",
    "Solicitação não encontrada.",
    "Demande introuvable.",
    "Anfrage nicht gefunden.",
    "Запрос не найден.",
  );
}

export function errFulfillAlreadyDone(bl: string) {
  return pickUiText(
    bl,
    "이미 처리 완료된 요청입니다.",
    "This request has already been fulfilled.",
    "Yêu cầu này đã được xử lý xong.",
    "このリクエストはすでに処理済みです。",
    "该请求已处理完成。",
    "Esta solicitud ya está completada.",
    "Esta solicitação já foi concluída.",
    "Cette demande est déjà traitée.",
    "Diese Anfrage ist bereits erledigt.",
    "Запрос уже выполнен.",
  );
}

export function errFulfillCancelled(bl: string) {
  return pickUiText(
    bl,
    "취소된 요청은 처리할 수 없습니다.",
    "Cancelled requests cannot be fulfilled.",
    "Không thể xử lý yêu cầu đã hủy.",
    "キャンセルされたリクエストは処理できません。",
    "已取消的请求无法处理。",
    "No se pueden procesar solicitudes canceladas.",
    "Não é possível processar solicitações canceladas.",
    "Les demandes annulées ne peuvent pas être traitées.",
    "Stornierte Anfragen können nicht bearbeitet werden.",
    "Отменённые запросы обработать нельзя.",
  );
}

export function errFulfillSupplierNotOnBranch(bl: string) {
  return pickUiText(
    bl,
    "해당 지점에 등록되지 않은 거래처가 있습니다.",
    "A supplier is not registered for this branch.",
    "Có nhà cung cấp chưa đăng ký tại chi nhánh này.",
    "この店舗に登録されていない仕入先が含まれています。",
    "存在未在该门店登记的供应商。",
    "Hay un proveedor no registrado en esta sucursal.",
    "Há um fornecedor não cadastrado nesta filial.",
    "Un fournisseur n’est pas enregistré pour cette succursale.",
    "Ein Lieferant ist für diese Filiale nicht registriert.",
    "Поставщик не зарегистрирован для этой точки.",
  );
}

export function errFulfillUnknownLineId(bl: string, lineId: string) {
  return pickUiText(
    bl,
    `알 수 없는 품목 줄: ${lineId}`,
    `Unknown line item: ${lineId}`,
    `Dòng hàng không xác định: ${lineId}`,
    `不明な明細行: ${lineId}`,
    `未知明细行：${lineId}`,
    `Línea desconocida: ${lineId}`,
    `Linha desconhecida: ${lineId}`,
    `Ligne inconnue : ${lineId}`,
    `Unbekannte Position: ${lineId}`,
    `Неизвестная строка: ${lineId}`,
  );
}

export function errFulfillUnitPriceNonNegative(bl: string) {
  return pickUiText(
    bl,
    "단가는 0 이상이어야 합니다.",
    "Unit price must be 0 or greater.",
    "Đơn giá phải ≥ 0.",
    "単価は 0 以上である必要があります。",
    "单价须 ≥ 0。",
    "El precio unitario debe ser ≥ 0.",
    "O preço unitário deve ser ≥ 0.",
    "Le prix unitaire doit être ≥ 0.",
    "Der Stückpreis muss ≥ 0 sein.",
    "Цена за единицу должна быть ≥ 0.",
  );
}

export function errFulfillExpenseColumnMissing(bl: string) {
  return pickUiText(
    bl,
    "expenses 테이블에 related_branch_material_request_id 컬럼이 필요합니다. supabase/branch_material_request_fulfillment.sql을 적용하세요.",
    "The expenses table needs the related_branch_material_request_id column. Apply supabase/branch_material_request_fulfillment.sql.",
    "Bảng expenses cần cột related_branch_material_request_id. Áp dụng supabase/branch_material_request_fulfillment.sql.",
    "expenses テーブルに related_branch_material_request_id 列が必要です。supabase/branch_material_request_fulfillment.sql を適用してください。",
    "expenses 表需要 related_branch_material_request_id 列。请执行 supabase/branch_material_request_fulfillment.sql。",
    "La tabla expenses necesita la columna related_branch_material_request_id. Aplique supabase/branch_material_request_fulfillment.sql.",
    "A tabela expenses precisa da coluna related_branch_material_request_id. Aplique supabase/branch_material_request_fulfillment.sql.",
    "La table expenses nécessite la colonne related_branch_material_request_id. Appliquez supabase/branch_material_request_fulfillment.sql.",
    "Die Tabelle expenses benötigt die Spalte related_branch_material_request_id. Wenden Sie supabase/branch_material_request_fulfillment.sql an.",
    "В таблице expenses нужен столбец related_branch_material_request_id. Выполните supabase/branch_material_request_fulfillment.sql.",
  );
}

export function errFulfillStatusUpdateFailed(bl: string) {
  return pickUiText(
    bl,
    "지출·재고는 반영되었으나 요청 상태 갱신에 실패했습니다. 관리자에게 문의하세요.",
    "Expenses and stock were updated, but updating the request status failed. Please contact an administrator.",
    "Chi phí và tồn kho đã cập nhật nhưng cập nhật trạng thái yêu cầu thất bại. Liên hệ quản trị viên.",
    "支出・在庫は反映されましたが、リクエスト状態の更新に失敗しました。管理者に連絡してください。",
    "支出与库存已更新，但请求状态更新失败。请联系管理员。",
    "Los gastos y el stock se actualizaron, pero falló el estado de la solicitud. Contacte a un administrador.",
    "Despesas e estoque foram atualizados, mas falhou a atualização do status. Contate o administrador.",
    "Les dépenses et le stock ont été mis à jour, mais la mise à jour du statut a échoué. Contactez un administrateur.",
    "Ausgaben und Bestand wurden aktualisiert, aber der Anfragestatus konnte nicht gesetzt werden. Bitte Administrator kontaktieren.",
    "Расходы и склад обновлены, но обновить статус запроса не удалось. Обратитесь к администратору.",
  );
}

export function errFulfillGeneric(bl: string) {
  return pickUiText(
    bl,
    "처리 중 오류가 발생했습니다.",
    "Something went wrong while processing the request.",
    "Đã xảy ra lỗi khi xử lý.",
    "処理中にエラーが発生しました。",
    "处理时发生错误。",
    "Ocurrió un error al procesar.",
    "Ocorreu um erro ao processar.",
    "Une erreur s’est produite pendant le traitement.",
    "Bei der Verarbeitung ist ein Fehler aufgetreten.",
    "При обработке произошла ошибка.",
  );
}

export function errExpenseDateOrder(bl: string) {
  return pickUiText(
    bl,
    "from은 to보다 이전이어야 합니다.",
    "`from` must be before or equal to `to`.",
    "`from` phải trước hoặc bằng `to`.",
    "`from` は `to` 以前である必要があります。",
    "`from` 必须早于或等于 `to`。",
    "`from` debe ser anterior o igual a `to`.",
    "`from` deve ser anterior ou igual a `to`.",
    "`from` doit être antérieur ou égal à `to`.",
    "`from` muss vor oder gleich `to` sein.",
    "`from` должен быть не позже `to`.",
  );
}

export function warnExpenseServiceKeySkipped(bl: string) {
  return pickUiText(
    bl,
    "서버에 SUPABASE_SERVICE_ROLE_KEY가 없어 지출 집계를 건너뜁니다.",
    "Expense aggregation was skipped because SUPABASE_SERVICE_ROLE_KEY is not set on the server.",
    "Thiếu SUPABASE_SERVICE_ROLE_KEY trên máy chủ nên đã bỏ qua tổng hợp chi phí.",
    "サーバーに SUPABASE_SERVICE_ROLE_KEY がないため支出集計をスキップしました。",
    "服务器未设置 SUPABASE_SERVICE_ROLE_KEY，已跳过支出汇总。",
    "Sin SUPABASE_SERVICE_ROLE_KEY en el servidor se omitió el agregado de gastos.",
    "Sem SUPABASE_SERVICE_ROLE_KEY no servidor, a agregação de despesas foi ignorada.",
    "Sans SUPABASE_SERVICE_ROLE_KEY sur le serveur, l’agrégation des dépenses a été ignorée.",
    "Ohne SUPABASE_SERVICE_ROLE_KEY auf dem Server wurde die Ausgabenaggregation übersprungen.",
    "Без SUPABASE_SERVICE_ROLE_KEY на сервере агрегация расходов пропущена.",
  );
}

export function warnExpenseTableMissing(bl: string) {
  return pickUiText(
    bl,
    "expenses 테이블을 찾을 수 없습니다.",
    "The expenses table was not found.",
    "Không tìm thấy bảng expenses.",
    "expenses テーブルが見つかりません。",
    "未找到 expenses 表。",
    "No se encontró la tabla expenses.",
    "Tabela expenses não encontrada.",
    "Table expenses introuvable.",
    "Tabelle expenses nicht gefunden.",
    "Таблица expenses не найдена.",
  );
}

export function errExpenseTooManyRows(bl: string) {
  return pickUiText(
    bl,
    "조회 행 수가 너무 많습니다. 기간을 나누어 조회하세요.",
    "Too many rows to load. Narrow the date range and try again.",
    "Quá nhiều dòng. Hãy chia nhỏ khoảng thời gian.",
    "取得行数が多すぎます。期間を分割してください。",
    "行数过多，请缩短日期范围分次查询。",
    "Demasiadas filas. Acorte el rango de fechas.",
    "Muitas linhas. Reduza o período.",
    "Trop de lignes. Réduisez la plage de dates.",
    "Zu viele Zeilen. Bitte Datumsbereich verkleinern.",
    "Слишком много строк. Сузьте период.",
  );
}
