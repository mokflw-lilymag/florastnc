import { pickUiText } from "@/i18n/pick-ui-text";

export function errAdminJsonInvalid(bl: string) {
  return pickUiText(
    bl,
    "JSON 형식이 올바르지 않습니다.",
    "Invalid JSON body.",
    "Nội dung JSON không hợp lệ.",
    "JSON が無効です。",
    "JSON 无效。",
    "JSON no válido.",
    "JSON inválido.",
    "JSON invalide.",
    "Ungültiges JSON.",
    "Некорректный JSON.",
  );
}

export function errAdminGallerySlugRule(bl: string) {
  return pickUiText(
    bl,
    "slug은 영문 소문자, 숫자, 하이픈, 밑줄만 1~64자입니다.",
    "slug must be 1–64 characters: lowercase letters, digits, hyphen, or underscore only.",
    "slug chỉ gồm chữ thường, số, gạch ngang/gạch dưới, 1–64 ký tự.",
    "slug は英小文字・数字・ハイフン・アンダースコアのみ 1〜64 文字です。",
    "slug 须为 1–64 位小写字母、数字、连字符或下划线。",
    "El slug debe tener 1–64 caracteres (minúsculas, números, guion o guion bajo).",
    "O slug deve ter 1–64 caracteres (minúsculas, números, hífen ou sublinhado).",
    "Le slug doit faire 1–64 caractères (minuscules, chiffres, tiret ou underscore).",
    "slug: 1–64 Zeichen, nur Kleinbuchstaben, Ziffern, Bindestrich oder Unterstrich.",
    "slug: 1–64 символа, только строчные латинские буквы, цифры, дефис или подчёркивание.",
  );
}

export function errAdminGalleryLabelRequired(bl: string) {
  return pickUiText(
    bl,
    "label이 필요합니다.",
    "label is required.",
    "Cần label.",
    "label が必要です。",
    "需要 label。",
    "Se requiere label.",
    "label é obrigatório.",
    "label est requis.",
    "label ist erforderlich.",
    "Нужен label.",
  );
}

export function errAdminGalleryLabelEmpty(bl: string) {
  return pickUiText(
    bl,
    "label이 비어 있습니다.",
    "label cannot be empty.",
    "label không được để trống.",
    "label を空にできません。",
    "label 不能为空。",
    "label no puede estar vacío.",
    "label não pode ficar vazio.",
    "label ne peut pas être vide.",
    "label darf nicht leer sein.",
    "label не может быть пустым.",
  );
}

export function errAdminGallerySortOrderInvalid(bl: string) {
  return pickUiText(
    bl,
    "sort_order 값이 올바르지 않습니다.",
    "sort_order is invalid.",
    "sort_order không hợp lệ.",
    "sort_order が無効です。",
    "sort_order 无效。",
    "sort_order no es válido.",
    "sort_order inválido.",
    "sort_order invalide.",
    "sort_order ungültig.",
    "Некорректный sort_order.",
  );
}

export function errAdminGalleryNoPatchFields(bl: string) {
  return pickUiText(
    bl,
    "변경할 필드가 없습니다.",
    "No fields to update.",
    "Không có trường nào để cập nhật.",
    "更新するフィールドがありません。",
    "没有可更新的字段。",
    "No hay campos para actualizar.",
    "Nenhum campo para atualizar.",
    "Aucun champ à mettre à jour.",
    "Keine Felder zum Aktualisieren.",
    "Нет полей для обновления.",
  );
}

export function errAdminGalleryThemeIdRequired(bl: string) {
  return pickUiText(
    bl,
    "theme_id가 필요합니다.",
    "theme_id is required.",
    "Cần theme_id.",
    "theme_id が必要です。",
    "需要 theme_id。",
    "Se requiere theme_id.",
    "theme_id é obrigatório.",
    "theme_id est requis.",
    "theme_id ist erforderlich.",
    "Нужен theme_id.",
  );
}

export function errAdminGalleryImageUrlRequired(bl: string) {
  return pickUiText(
    bl,
    "유효한 http(s) 이미지 URL이 필요합니다.",
    "A valid http(s) image URL is required.",
    "Cần URL ảnh http(s) hợp lệ.",
    "有効な http(s) 画像 URL が必要です。",
    "需要有效的 http(s) 图片 URL。",
    "Se requiere una URL de imagen http(s) válida.",
    "É necessária uma URL de imagem http(s) válida.",
    "Une URL d’image http(s) valide est requise.",
    "Eine gültige http(s)-Bild-URL ist erforderlich.",
    "Нужен действительный http(s) URL изображения.",
  );
}

export function errAdminGalleryHttpUrlRequired(bl: string) {
  return pickUiText(
    bl,
    "유효한 http(s) URL이 필요합니다.",
    "A valid http(s) URL is required.",
    "Cần URL http(s) hợp lệ.",
    "有効な http(s) URL が必要です。",
    "需要有效的 http(s) URL。",
    "Se requiere una URL http(s) válida.",
    "É necessária uma URL http(s) válida.",
    "Une URL http(s) valide est requise.",
    "Eine gültige http(s)-URL ist erforderlich.",
    "Нужен действительный http(s) URL.",
  );
}

export function errAdminSeedConfirmRequired(bl: string) {
  return pickUiText(
    bl,
    "confirm: true가 필요합니다.",
    "confirm: true is required.",
    "Cần confirm: true.",
    "confirm: true が必要です。",
    "需要 confirm: true。",
    "Se requiere confirm: true.",
    "confirm: true é obrigatório.",
    "confirm: true est requis.",
    "confirm: true ist erforderlich.",
    "Нужно confirm: true.",
  );
}

export function errAdminSeedTenantAndVersionRequired(bl: string) {
  return pickUiText(
    bl,
    "tenantId와 versionId가 필요합니다.",
    "tenantId and versionId are required.",
    "Cần tenantId và versionId.",
    "tenantId と versionId が必要です。",
    "需要 tenantId 与 versionId。",
    "Se requieren tenantId y versionId.",
    "tenantId e versionId são obrigatórios.",
    "tenantId et versionId sont requis.",
    "tenantId und versionId sind erforderlich.",
    "Нужны tenantId и versionId.",
  );
}

export function errAdminSeedVersionRequired(bl: string) {
  return pickUiText(
    bl,
    "versionId가 필요합니다.",
    "versionId is required.",
    "Cần versionId.",
    "versionId が必要です。",
    "需要 versionId。",
    "Se requiere versionId.",
    "versionId é obrigatório.",
    "versionId est requis.",
    "versionId ist erforderlich.",
    "Нужен versionId.",
  );
}

export function errAdminSeedUnknownVersion(bl: string) {
  return pickUiText(
    bl,
    "알 수 없는 시드 버전입니다.",
    "Unknown seed version.",
    "Phiên bản seed không xác định.",
    "不明なシードバージョンです。",
    "未知的种子版本。",
    "Versión de seed desconocida.",
    "Versão de seed desconhecida.",
    "Version de seed inconnue.",
    "Unbekannte Seed-Version.",
    "Неизвестная версия сида.",
  );
}

export function errAdminSeedTenantNotFound(bl: string) {
  return pickUiText(
    bl,
    "테넌트(매장)를 찾을 수 없습니다.",
    "Tenant (branch) was not found.",
    "Không tìm thấy tenant (chi nhánh).",
    "テナント（店舗）が見つかりません。",
    "未找到租户（门店）。",
    "No se encontró el inquilino (sucursal).",
    "Inquilino (filial) não encontrado.",
    "Locataire (succursale) introuvable.",
    "Mandant (Filiale) nicht gefunden.",
    "Тенант (филиал) не найден.",
  );
}

export function errAdminSeedVersionQueryRequired(bl: string) {
  return pickUiText(
    bl,
    "versionId 쿼리가 필요합니다.",
    "versionId query parameter is required.",
    "Cần tham số truy vấn versionId.",
    "versionId クエリパラメータが必要です。",
    "需要 versionId 查询参数。",
    "Se requiere el parámetro de consulta versionId.",
    "O parâmetro de consulta versionId é obrigatório.",
    "Le paramètre de requête versionId est requis.",
    "Abfrageparameter versionId ist erforderlich.",
    "Нужен параметр запроса versionId.",
  );
}

export function errAdminSeedBulkTenantLimit(bl: string, detail: string) {
  return pickUiText(
    bl,
    `매장 수가 너무 많습니다. 관리자에게 문의하세요. (${detail})`,
    `Too many branches. Contact an administrator. (${detail})`,
    `Quá nhiều chi nhánh. Liên hệ quản trị viên. (${detail})`,
    `店舗数が多すぎます。管理者に連絡してください。(${detail})`,
    `门店数量过多，请联系管理员。（${detail}）`,
    `Demasiadas sucursales. Contacte a un administrador. (${detail})`,
    `Filiais em excesso. Contate um administrador. (${detail})`,
    `Trop de succursales. Contactez un administrateur. (${detail})`,
    `Zu viele Filialen. Administrator kontaktieren. (${detail})`,
    `Слишком много филиалов. Обратитесь к администратору. (${detail})`,
  );
}

export function errAdminSeedApplyFailedGeneric(bl: string) {
  return pickUiText(
    bl,
    "시드 적용에 실패했습니다.",
    "Failed to apply seed.",
    "Áp dụng seed thất bại.",
    "シードの適用に失敗しました。",
    "应用种子失败。",
    "Error al aplicar el seed.",
    "Falha ao aplicar o seed.",
    "Échec de l’application du seed.",
    "Seed konnte nicht angewendet werden.",
    "Не удалось применить сид.",
  );
}

export function errAdminSeedPreviewFailedGeneric(bl: string) {
  return pickUiText(
    bl,
    "시드 미리보기에 실패했습니다.",
    "Failed to preview seed.",
    "Xem trước seed thất bại.",
    "シードのプレビューに失敗しました。",
    "种子预览失败。",
    "Error al previsualizar el seed.",
    "Falha na pré-visualização do seed.",
    "Échec de l’aperçu du seed.",
    "Seed-Vorschau fehlgeschlagen.",
    "Не удалось просмотреть сид.",
  );
}

export function errAdminSeedBulkApplyFailedGeneric(bl: string) {
  return pickUiText(
    bl,
    "일괄 적용에 실패했습니다.",
    "Bulk apply failed.",
    "Áp dụng hàng loạt thất bại.",
    "一括適用に失敗しました。",
    "批量应用失败。",
    "Error en la aplicación masiva.",
    "Falha na aplicação em lote.",
    "Échec de l’application groupée.",
    "Massenanwendung fehlgeschlagen.",
    "Массовое применение не удалось.",
  );
}

export function errAdminSeedBulkPreviewFailedGeneric(bl: string) {
  return pickUiText(
    bl,
    "일괄 미리보기에 실패했습니다.",
    "Bulk preview failed.",
    "Xem trước hàng loạt thất bại.",
    "一括プレビューに失敗しました。",
    "批量预览失败。",
    "Error en la vista previa masiva.",
    "Falha na pré-visualização em lote.",
    "Échec de l’aperçu groupé.",
    "Massenvorschau fehlgeschlagen.",
    "Массовый предпросмотр не удался.",
  );
}

export function errAdminSeedBulkOrgTenantExclusive(bl: string) {
  return pickUiText(
    bl,
    "organizationId와 tenantIds를 함께 보낼 수 없습니다. 한 가지만 지정하세요.",
    "Cannot send organizationId and tenantIds together. Specify only one.",
    "Không thể gửi organizationId và tenantIds cùng lúc. Chỉ chọn một.",
    "organizationId と tenantIds は同時に送れません。どちらか一方だけ指定してください。",
    "不能同时发送 organizationId 与 tenantIds，请只选其一。",
    "No puede enviar organizationId y tenantIds a la vez. Elija uno.",
    "Não envie organizationId e tenantIds juntos. Escolha apenas um.",
    "Impossible d’envoyer organizationId et tenantIds ensemble. Choisissez-en un.",
    "organizationId und tenantIds dürfen nicht zusammen gesendet werden.",
    "Нельзя передавать organizationId и tenantIds вместе. Укажите что-то одно.",
  );
}

export function errAdminSeedBulkMaxBranches(bl: string, max: number) {
  return pickUiText(
    bl,
    `한 번에 최대 ${max}곳까지 선택할 수 있습니다.`,
    `You can select at most ${max} branches per request.`,
    `Mỗi lần chỉ chọn tối đa ${max} chi nhánh.`,
    `1回のリクエストで最大 ${max} 店舗まで選択できます。`,
    `每次最多选择 ${max} 个门店。`,
    `Puede seleccionar como máximo ${max} sucursales por solicitud.`,
    `No máximo ${max} filiais por solicitação.`,
    `Maximum ${max} succursales par envoi.`,
    `Höchstens ${max} Filialen pro Anfrage.`,
    `Не более ${max} филиалов за запрос.`,
  );
}

export function errAdminSeedBulkUnknownBranchIds(bl: string, sample: string, moreSuffix: string) {
  return pickUiText(
    bl,
    `존재하지 않는 매장 ID가 있습니다: ${sample}${moreSuffix}`,
    `Some branch IDs do not exist: ${sample}${moreSuffix}`,
    `Có ID chi nhánh không tồn tại: ${sample}${moreSuffix}`,
    `存在しない店舗 ID があります: ${sample}${moreSuffix}`,
    `存在无效的门店 ID：${sample}${moreSuffix}`,
    `Hay IDs de sucursal inexistentes: ${sample}${moreSuffix}`,
    `Há IDs de filial inexistentes: ${sample}${moreSuffix}`,
    `Des IDs de succursale sont inexistants : ${sample}${moreSuffix}`,
    `Nicht existierende Filial-IDs: ${sample}${moreSuffix}`,
    `Несуществующие ID филиалов: ${sample}${moreSuffix}`,
  );
}

export function errAdminSeedBulkOrgOrBranchesRequired(bl: string) {
  return pickUiText(
    bl,
    "organizationId 또는 tenantIds(비어 있지 않은 배열)가 필요합니다.",
    "organizationId or a non-empty tenantIds array is required.",
    "Cần organizationId hoặc mảng tenantIds không rỗng.",
    "organizationId または空でない tenantIds 配列が必要です。",
    "需要 organizationId 或非空的 tenantIds 数组。",
    "Se requiere organizationId o un array tenantIds no vacío.",
    "organizationId ou array tenantIds não vazio é obrigatório.",
    "organizationId ou un tableau tenantIds non vide est requis.",
    "organizationId oder ein nicht leeres tenantIds-Array ist erforderlich.",
    "Нужны organizationId или непустой массив tenantIds.",
  );
}

export function errAdminOrganizationNotFound(bl: string) {
  return pickUiText(
    bl,
    "조직을 찾을 수 없습니다.",
    "Organization was not found.",
    "Không tìm thấy tổ chức.",
    "組織が見つかりません。",
    "未找到组织。",
    "No se encontró la organización.",
    "Organização não encontrada.",
    "Organisation introuvable.",
    "Organisation nicht gefunden.",
    "Организация не найдена.",
  );
}

export function errAdminSeedOrgHasNoBranches(bl: string) {
  return pickUiText(
    bl,
    "이 조직에 연결된 매장(tenants.organization_id)이 없습니다.",
    "No branches are linked to this organization (tenants.organization_id).",
    "Tổ chức này chưa có chi nhánh liên kết (tenants.organization_id).",
    "この組織に紐づく店舗がありません（tenants.organization_id）。",
    "该组织下没有关联门店（tenants.organization_id）。",
    "No hay sucursales vinculadas a esta organización.",
    "Não há filiais vinculadas a esta organização.",
    "Aucune succursale liée à cette organisation.",
    "Keine Filialen mit dieser Organisation verknüpft.",
    "Нет филиалов, привязанных к этой организации.",
  );
}

export function errAdminSeedOrgTooManyBranches(bl: string, max: number) {
  return pickUiText(
    bl,
    `매장 수가 너무 많습니다. 관리자에게 문의하세요. (최대 ${max}곳)`,
    `Too many branches. Contact an administrator. (max ${max})`,
    `Quá nhiều chi nhánh. Liên hệ quản trị viên. (tối đa ${max})`,
    `店舗数が多すぎます。管理者に連絡してください（最大 ${max}）。`,
    `门店数量过多，请联系管理员（最多 ${max}）。`,
    `Demasiadas sucursales. Contacte a un administrador. (máx. ${max})`,
    `Filiais em excesso. Contate um administrador. (máx. ${max})`,
    `Trop de succursales. Contactez un administrateur (max ${max}).`,
    `Zu viele Filialen. Administrator kontaktieren (max. ${max}).`,
    `Слишком много филиалов. Обратитесь к администратору (макс. ${max}).`,
  );
}

export function errAdminOrgProfileNotFound(bl: string) {
  return pickUiText(
    bl,
    "해당 이메일의 프로필이 없습니다.",
    "No profile exists for this email.",
    "Không có hồ sơ cho email này.",
    "このメールのプロフィールがありません。",
    "该邮箱没有对应用户资料。",
    "No hay perfil para este correo.",
    "Não há perfil para este e-mail.",
    "Aucun profil pour cet e-mail.",
    "Kein Profil für diese E-Mail.",
    "Нет профиля с таким email.",
  );
}

export function errAdminForbidden(bl: string) {
  return pickUiText(
    bl,
    "권한이 없습니다.",
    "Access denied.",
    "Không có quyền truy cập.",
    "アクセスが拒否されました。",
    "没有访问权限。",
    "Acceso denegado.",
    "Acesso negado.",
    "Accès refusé.",
    "Zugriff verweigert.",
    "Доступ запрещён.",
  );
}

export function errAdminUnauthorized(bl: string) {
  return pickUiText(
    bl,
    "로그인이 필요합니다.",
    "Sign in required.",
    "Cần đăng nhập.",
    "ログインが必要です。",
    "请先登录。",
    "Inicie sesión.",
    "Faça login.",
    "Connexion requise.",
    "Anmeldung erforderlich.",
    "Требуется вход.",
  );
}

export function errAdminServerMisconfigured(bl: string) {
  return pickUiText(
    bl,
    "서버 설정 오류입니다. 관리자에게 문의하세요.",
    "Server configuration error. Please contact support.",
    "Lỗi cấu hình máy chủ. Liên hệ quản trị viên.",
    "サーバー設定エラーです。サポートにお問い合わせください。",
    "服务器配置错误，请联系支持。",
    "Error de configuración del servidor. Contacte al soporte.",
    "Erro de configuração do servidor. Contate o suporte.",
    "Erreur de configuration serveur. Contactez le support.",
    "Serverkonfigurationsfehler. Bitte Support kontaktieren.",
    "Ошибка конфигурации сервера. Обратитесь в поддержку.",
  );
}

export function errAdminOperationFailed(bl: string) {
  return pickUiText(
    bl,
    "요청을 처리하지 못했습니다.",
    "Could not complete the request.",
    "Không xử lý được yêu cầu.",
    "リクエストを処理できませんでした。",
    "无法完成请求。",
    "No se pudo completar la solicitud.",
    "Não foi possível concluir a solicitação.",
    "Impossible de traiter la requête.",
    "Anfrage konnte nicht abgeschlossen werden.",
    "Не удалось выполнить запрос.",
  );
}

export function errAdminDataLoadFailed(bl: string) {
  return pickUiText(
    bl,
    "데이터를 불러오지 못했습니다.",
    "Could not load data.",
    "Không tải được dữ liệu.",
    "データを読み込めませんでした。",
    "无法加载数据。",
    "No se pudieron cargar los datos.",
    "Não foi possível carregar os dados.",
    "Impossible de charger les données.",
    "Daten konnten nicht geladen werden.",
    "Не удалось загрузить данные.",
  );
}

export function errAdminInvalidBody(bl: string) {
  return pickUiText(
    bl,
    "요청 본문이 올바르지 않습니다.",
    "Invalid request body.",
    "Nội dung yêu cầu không hợp lệ.",
    "リクエスト本文が無効です。",
    "请求体无效。",
    "Cuerpo de la solicitud no válido.",
    "Corpo da solicitação inválido.",
    "Corps de requête invalide.",
    "Ungültiger Anforderungstext.",
    "Некорректное тело запроса.",
  );
}

export function errAdminGalleryMutationFailed(bl: string) {
  return pickUiText(
    bl,
    "갤러리 데이터를 저장하지 못했습니다.",
    "Could not save gallery data.",
    "Không lưu được dữ liệu thư viện.",
    "ギャラリーデータを保存できませんでした。",
    "无法保存图库数据。",
    "No se pudieron guardar los datos de la galería.",
    "Não foi possível salvar os dados da galeria.",
    "Impossible d’enregistrer les données de la galerie.",
    "Galeriedaten konnten nicht gespeichert werden.",
    "Не удалось сохранить данные галереи.",
  );
}

export function errAdminOrgMemberMutationFailed(bl: string) {
  return pickUiText(
    bl,
    "조직 멤버를 변경하지 못했습니다.",
    "Could not update organization membership.",
    "Không cập nhật được thành viên tổ chức.",
    "組織メンバーを更新できませんでした。",
    "无法更新组织成员。",
    "No se pudo actualizar la membresía de la organización.",
    "Não foi possível atualizar a associação à organização.",
    "Impossible de mettre à jour l’appartenance à l’organisation.",
    "Mitgliedschaft konnte nicht aktualisiert werden.",
    "Не удалось обновить членство в организации.",
  );
}

/** 테넌트 마스터 시드 상세 패널 설명 문구 (API `detail` 응답 notes) */
export function getTenantMasterSeedDetailNotes(bl: string, includeDelivery: boolean): string[] {
  const notes: string[] = [
    pickUiText(
      bl,
      "상품: 샘플·초안 (판매가 0원), 코드는 적용 시 FS-SEED-{버전}-{코드} 형태",
      "Products: sample/draft rows (price 0). On apply, codes become FS-SEED-{version}-{code}.",
      "Sản phẩm: bản mẫu/nháp (giá 0). Khi áp dụng, mã có dạng FS-SEED-{phiên bản}-{mã}.",
      "商品: サンプル・下書き（価格0）。適用時のコードは FS-SEED-{バージョン}-{コード} 形式。",
      "商品：示例/草稿（售价为 0）。应用时代码为 FS-SEED-{版本}-{代码}。",
      "Productos: filas de muestra/borrador (precio 0). Al aplicar, los códigos son FS-SEED-{versión}-{código}.",
      "Produtos: linhas de amostra/rascunho (preço 0). Ao aplicar, os códigos ficam FS-SEED-{versão}-{código}.",
      "Produits : lignes exemple/brouillon (prix 0). À l’application, les codes deviennent FS-SEED-{version}-{code}.",
      "Produkte: Beispiel-/Entwurfszeilen (Preis 0). Nach Anwendung: Codes als FS-SEED-{Version}-{Code}.",
      "Товары: черновые/примерные строки (цена 0). После применения коды: FS-SEED-{версия}-{код}.",
    ),
    pickUiText(
      bl,
      "자재: 단가·재고 0, 메모에 FS-SEED|버전|M|순번",
      "Materials: unit price and stock 0; memo format FS-SEED|version|M|index",
      "Vật tư: đơn giá & tồn 0; ghi chú dạng FS-SEED|phiên bản|M|thứ tự",
      "資材: 単価・在庫0、メモは FS-SEED|バージョン|M|連番",
      "物料：单价与库存为 0；备注格式 FS-SEED|版本|M|序号",
      "Materiales: precio unitario y stock 0; memo FS-SEED|versión|M|índice",
      "Materiais: preço unitário e estoque 0; memo FS-SEED|versão|M|índice",
      "Matières : prix unitaire et stock 0 ; mémo FS-SEED|version|M|index",
      "Materialien: Einzelpreis und Bestand 0; Notiz FS-SEED|Version|M|Index",
      "Материалы: цена и остаток 0; в памятке FS-SEED|версия|M|индекс",
    ),
    pickUiText(
      bl,
      "거래처: 샘플명만 (실제 사업자 정보는 매장에서 수정)",
      "Suppliers: sample names only (edit real business details at the branch).",
      "Nhà cung cấp: chỉ tên mẫu (chỉnh thông tin doanh nghiệp thật tại cửa hàng).",
      "取引先: サンプル名のみ（実名・事業者情報は店舗で編集）",
      "供应商：仅为示例名称（实际工商信息请在门店修改）。",
      "Proveedores: solo nombres de ejemplo (datos reales en la sucursal).",
      "Fornecedores: apenas nomes de exemplo (dados reais na filial).",
      "Fournisseurs : noms d’exemple seulement (infos réelles en succursale).",
      "Lieferanten: nur Beispielnamen (echte Daten in der Filiale).",
      "Поставщики: только примерные названия (реальные данные — в филиале).",
    ),
    pickUiText(
      bl,
      "카테고리(상품·자재·지출): system_settings 에 덮어쓰기",
      "Categories (products, materials, expenses): overwrite system_settings.",
      "Danh mục (hàng, vật tư, chi phí): ghi đè system_settings.",
      "カテゴリ（商品・資材・支出）: system_settings を上書き",
      "分类（商品、物料、支出）：覆盖 system_settings。",
      "Categorías (productos, materiales, gastos): sobrescribir system_settings.",
      "Categorias (produtos, materiais, despesas): sobrescrever system_settings.",
      "Catégories (produits, matières, dépenses) : écrasement de system_settings.",
      "Kategorien (Produkte, Materialien, Ausgaben): system_settings überschreiben.",
      "Категории (товары, материалы, расходы): перезапись system_settings.",
    ),
  ];
  if (includeDelivery) {
    notes.push(
      pickUiText(
        bl,
        "배송비: delivery_fees_by_region upsert + 일반 설정(settings_{tenant})의 districtDeliveryFees·기본료·무료배송 기준 병합",
        "Delivery fees: upsert delivery_fees_by_region and merge districtDeliveryFees, base fee, and free-shipping thresholds from general settings (settings_{tenant}).",
        "Phí giao: upsert delivery_fees_by_region và gộp districtDeliveryFees, phí cơ bản, ngưỡng miễn phí từ cài đặt chung (settings_{tenant}).",
        "送料: delivery_fees_by_region を upsert し、一般設定 (settings_{tenant}) の districtDeliveryFees・基本料金・送料無料条件をマージ。",
        "配送费：对 delivery_fees_by_region 执行 upsert，并合并常规设置 (settings_{tenant}) 中的 districtDeliveryFees、基础费与包邮门槛。",
        "Envío: upsert en delivery_fees_by_region y fusión de districtDeliveryFees, tarifa base y umbrales de envío gratis desde ajustes generales (settings_{tenant}).",
        "Entrega: upsert em delivery_fees_by_region e mesclar districtDeliveryFees, taxa base e limites de frete grátis das configurações gerais (settings_{tenant}).",
        "Livraison : upsert delivery_fees_by_region et fusion districtDeliveryFees, forfait et seuils de gratuité depuis les réglages généraux (settings_{tenant}).",
        "Lieferung: upsert delivery_fees_by_region und Zusammenführen von districtDeliveryFees, Grundgebühr und Gratisversand-Schwellen aus den allgemeinen Einstellungen (settings_{tenant}).",
        "Доставка: upsert delivery_fees_by_region и слияние districtDeliveryFees, базовой ставки и порогов бесплатной доставки из общих настроек (settings_{tenant}).",
      )
    );
  }
  return notes;
}

/** 외부·내부 API 공통: tenant_id 누락 */
export function errApiTenantIdRequired(bl: string) {
  return pickUiText(
    bl,
    "tenant_id가 필요합니다.",
    "tenant_id is required.",
    "Cần tenant_id.",
    "tenant_id が必要です。",
    "需要 tenant_id。",
    "Se requiere tenant_id.",
    "tenant_id é obrigatório.",
    "tenant_id est requis.",
    "tenant_id ist erforderlich.",
    "Нужен tenant_id.",
  );
}

export function errApiMissingTrackingId(bl: string) {
  return pickUiText(
    bl,
    "trackingId가 없습니다.",
    "Missing trackingId.",
    "Thiếu trackingId.",
    "trackingId がありません。",
    "缺少 trackingId。",
    "Falta trackingId.",
    "Falta trackingId.",
    "trackingId manquant.",
    "trackingId fehlt.",
    "Нет trackingId.",
  );
}

export function errApiOrderNotFound(bl: string) {
  return pickUiText(
    bl,
    "주문을 찾을 수 없습니다.",
    "Order not found.",
    "Không tìm thấy đơn hàng.",
    "注文が見つかりません。",
    "未找到订单。",
    "Pedido no encontrado.",
    "Pedido não encontrado.",
    "Commande introuvable.",
    "Bestellung nicht gefunden.",
    "Заказ не найден.",
  );
}

export function errApiNoImageProvided(bl: string) {
  return pickUiText(
    bl,
    "이미지 데이터가 없습니다.",
    "No image provided.",
    "Không có dữ liệu ảnh.",
    "画像データがありません。",
    "未提供图片数据。",
    "No se proporcionó imagen.",
    "Nenhuma imagem fornecida.",
    "Aucune image fournie.",
    "Kein Bild übermittelt.",
    "Изображение не передано.",
  );
}

export function errApiContentRequired(bl: string) {
  return pickUiText(
    bl,
    "content가 필요합니다.",
    "content is required.",
    "Cần content.",
    "content が必要です。",
    "需要 content。",
    "Se requiere content.",
    "content é obrigatório.",
    "content est requis.",
    "content ist erforderlich.",
    "Нужен content.",
  );
}

export function errApiDbSaveFailed(bl: string) {
  return pickUiText(
    bl,
    "데이터를 저장하지 못했습니다.",
    "Could not save to the database.",
    "Không lưu được dữ liệu.",
    "データを保存できませんでした。",
    "无法保存到数据库。",
    "No se pudo guardar en la base de datos.",
    "Não foi possível salvar no banco de dados.",
    "Impossible d’enregistrer en base.",
    "Speichern in der Datenbank fehlgeschlagen.",
    "Не удалось сохранить в базу.",
  );
}

export function errApiMethodNotAllowed(bl: string) {
  return pickUiText(
    bl,
    "허용되지 않은 메서드입니다.",
    "Method not allowed.",
    "Phương thức không được phép.",
    "許可されていないメソッドです。",
    "不允许的请求方法。",
    "Método no permitido.",
    "Método não permitido.",
    "Méthode non autorisée.",
    "Methode nicht erlaubt.",
    "Метод не разрешён.",
  );
}

export function errApiAiOcrParseFailed(bl: string) {
  return pickUiText(
    bl,
    "AI 응답을 해석하지 못했습니다.",
    "Could not parse the AI response.",
    "Không phân tích được phản hồi AI.",
    "AI の応答を解析できませんでした。",
    "无法解析 AI 返回。",
    "No se pudo interpretar la respuesta de la IA.",
    "Não foi possível interpretar a resposta da IA.",
    "Impossible d’analyser la réponse de l’IA.",
    "KI-Antwort konnte nicht verarbeitet werden.",
    "Не удалось разобрать ответ ИИ.",
  );
}

/** AI 카드 문구 API(플레이스홀더) 성공 메시지 — theme 문자열 삽입 */
export function msgApiAiCardTagline(bl: string, theme: string) {
  return pickUiText(
    bl,
    `「${theme}」 무드에 어울리는 카드 한 줄입니다.`,
    `A beautiful card line for your ${theme} moment.`,
    `Một dòng thiệp hợp với tông «${theme}».`,
    `「${theme}」の雰囲気に合うカードの一文です。`,
    `契合「${theme}」氛围的一句贺卡文案。`,
    `Una línea de tarjeta para el ambiente «${theme}».`,
    `Uma linha de cartão no clima «${theme}».`,
    `Une ligne de carte pour l’ambiance «${theme}».`,
    `Eine Kartenzeile passend zum «${theme}»-Moment.`,
    `Строка для открытки в духе «${theme}».`,
  );
}

export function msgApiAiWarmFallback(bl: string) {
  return pickUiText(
    bl,
    "마음을 담은 짧은 인사말입니다.",
    "Warm wishes to you.",
    "Lời chúc ngắn gửi trọn tình.",
    "心のこもった短いメッセージです。",
    "一句温暖的问候。",
    "Un breve mensaje con cariño.",
    "Uma mensagem breve e calorosa.",
    "Un court message chaleureux.",
    "Ein kurzer herzlicher Gruß.",
    "Короткое тёплое пожелание.",
  );
}

export function errApiAiMessageEngineFallback(bl: string) {
  return pickUiText(
    bl,
    "메시지 엔진을 사용할 수 없어 대체 문구를 반환했습니다.",
    "Message engine fallback.",
    "Không dùng được công cụ tin nhắn, đã trả về câu dự phòng.",
    "メッセージエンジンが使えないため代替文を返しました。",
    "消息引擎不可用，已返回备用文案。",
    "Motor de mensajes no disponible; respuesta alternativa.",
    "Mecanismo de mensagens indisponível; resposta alternativa.",
    "Moteur de messages indisponible ; réponse de secours.",
    "Nachrichten-Engine nicht verfügbar; Ersatztext.",
    "Механизм сообщений недоступен; возвращён запасной текст.",
  );
}

export function errApiRequiredParamsMissing(bl: string) {
  return pickUiText(
    bl,
    "필수 파라미터가 누락되었습니다.",
    "Required parameters are missing.",
    "Thiếu tham số bắt buộc.",
    "必須パラメータが不足しています。",
    "缺少必填参数。",
    "Faltan parámetros obligatorios.",
    "Faltam parâmetros obrigatórios.",
    "Paramètres requis manquants.",
    "Erforderliche Parameter fehlen.",
    "Отсутствуют обязательные параметры.",
  );
}

export function errApiWebhookConfigMissing(bl: string) {
  return pickUiText(
    bl,
    "Webhook 서버 설정이 누락되었습니다.",
    "Webhook server configuration is missing.",
    "Thiếu cấu hình máy chủ webhook.",
    "Webhook サーバー設定が不足しています。",
    "Webhook 服务器配置缺失。",
    "Falta la configuración del servidor webhook.",
    "Falta configuração do servidor webhook.",
    "Configuration serveur webhook manquante.",
    "Webhook-Serverkonfiguration fehlt.",
    "Отсутствует конфигурация webhook-сервера.",
  );
}

export function errApiN8nUrlMissing(bl: string) {
  return pickUiText(
    bl,
    "n8n 워크플로우 주소가 설정되지 않았습니다.",
    "n8n workflow URL is not configured.",
    "Chưa cấu hình URL workflow n8n.",
    "n8n ワークフロー URL が設定されていません。",
    "未配置 n8n 工作流 URL。",
    "No está configurada la URL de flujo de n8n.",
    "A URL do fluxo n8n não está configurada.",
    "URL du workflow n8n non configurée.",
    "n8n-Workflow-URL ist nicht konfiguriert.",
    "URL рабочего процесса n8n не настроен.",
  );
}

export function errApiPublishDispatchFailed(bl: string) {
  return pickUiText(
    bl,
    "로봇에게 신호를 보내는 중 오류가 발생했습니다.",
    "Failed to dispatch the signal to the bot.",
    "Gửi tín hiệu tới bot thất bại.",
    "ボットへの送信に失敗しました。",
    "向机器人发送信号失败。",
    "Error al enviar la señal al bot.",
    "Falha ao enviar o sinal para o robô.",
    "Échec de l'envoi du signal au bot.",
    "Signal an Bot konnte nicht gesendet werden.",
    "Не удалось отправить сигнал боту.",
  );
}

export function errApiUnsupportedPosProvider(bl: string) {
  return pickUiText(
    bl,
    "지원하지 않는 POS 유형입니다.",
    "Unsupported POS provider.",
    "Nhà cung cấp POS không được hỗ trợ.",
    "未対応の POS 種別です。",
    "不支持的 POS 类型。",
    "Proveedor POS no compatible.",
    "Provedor POS não suportado.",
    "Fournisseur POS non pris en charge.",
    "Nicht unterstützter POS-Anbieter.",
    "Неподдерживаемый POS-провайдер.",
  );
}

export function errApiInvalidJson(bl: string) {
  return pickUiText(
    bl,
    "잘못된 JSON 형식입니다.",
    "Invalid JSON format.",
    "Định dạng JSON không hợp lệ.",
    "JSON 形式が不正です。",
    "JSON 格式无效。",
    "Formato JSON no válido.",
    "Formato JSON inválido.",
    "Format JSON invalide.",
    "Ungültiges JSON-Format.",
    "Неверный формат JSON.",
  );
}

export function errApiStoreCodeMissing(bl: string) {
  return pickUiText(
    bl,
    "store_code가 없습니다.",
    "store_code is missing.",
    "Thiếu store_code.",
    "store_code がありません。",
    "缺少 store_code。",
    "Falta store_code.",
    "Falta store_code.",
    "store_code manquant.",
    "store_code fehlt.",
    "Нет store_code.",
  );
}

export function errApiSignatureVerificationFailed(bl: string) {
  return pickUiText(
    bl,
    "서명 검증 실패",
    "Signature verification failed.",
    "Xác minh chữ ký thất bại.",
    "署名検証に失敗しました。",
    "签名验证失败。",
    "Falló la verificación de firma.",
    "Falha na verificação da assinatura.",
    "Échec de vérification de signature.",
    "Signaturprüfung fehlgeschlagen.",
    "Проверка подписи не удалась.",
  );
}

export function errApiPosParseFailed(bl: string, detail?: string) {
  const suffix = detail ? ` (${detail})` : "";
  return pickUiText(
    bl,
    `결제 데이터 파싱 실패${suffix}`,
    `Failed to parse payment data${suffix}.`,
    `Phân tích dữ liệu thanh toán thất bại${suffix}.`,
    `決済データの解析に失敗しました${suffix}`,
    `解析支付数据失败${suffix}`,
    `No se pudo analizar los datos de pago${suffix}.`,
    `Falha ao analisar os dados de pagamento${suffix}.`,
    `Impossible d'analyser les données de paiement${suffix}.`,
    `Zahlungsdaten konnten nicht geparst werden${suffix}.`,
    `Не удалось разобрать платёжные данные${suffix}.`,
  );
}

export function errApiPosProcessingFailed(bl: string) {
  return pickUiText(
    bl,
    "POS 트랜잭션 처리에 실패했습니다.",
    "POS transaction processing failed.",
    "Xử lý giao dịch POS thất bại.",
    "POS 取引の処理に失敗しました。",
    "POS 交易处理失败。",
    "Falló el procesamiento de la transacción POS.",
    "Falha no processamento da transação POS.",
    "Échec du traitement de la transaction POS.",
    "POS-Transaktionsverarbeitung fehlgeschlagen.",
    "Не удалось обработать POS-транзакцию.",
  );
}

export function msgApiWebhookIgnored(bl: string) {
  return pickUiText(
    bl,
    "주문 생성 이벤트가 아니라서 무시했습니다.",
    "Ignored because this is not an order-create event.",
    "Đã bỏ qua vì không phải sự kiện tạo đơn hàng.",
    "注文作成イベントではないため無視しました。",
    "非创建订单事件，已忽略。",
    "Ignorado porque no es un evento de creación de pedido.",
    "Ignorado porque não é evento de criação de pedido.",
    "Ignoré car ce n'est pas un événement de création de commande.",
    "Ignoriert, da es kein Auftragserstellungsereignis ist.",
    "Игнорировано: это не событие создания заказа.",
  );
}

export function msgApiWebhookProcessed(bl: string, provider: string) {
  return pickUiText(
    bl,
    `${provider} 웹훅을 정상 처리했습니다.`,
    `${provider} webhook processed successfully.`,
    `Đã xử lý webhook ${provider} thành công.`,
    `${provider} webhook を正常に処理しました。`,
    `已成功处理 ${provider} webhook。`,
    `Webhook de ${provider} procesado correctamente.`,
    `Webhook de ${provider} processado com sucesso.`,
    `Webhook ${provider} traité avec succès.`,
    `${provider}-Webhook erfolgreich verarbeitet.`,
    `Webhook ${provider} успешно обработан.`,
  );
}

export function msgApiSyncIntegrationRequired(bl: string, provider: string) {
  return pickUiText(
    bl,
    `${provider} 연동 설정이 필요합니다.`,
    `${provider} integration setup is required.`,
    `Cần cấu hình tích hợp ${provider}.`,
    `${provider} 連携設定が必要です。`,
    `需要配置 ${provider} 集成。`,
    `Se requiere configurar la integración de ${provider}.`,
    `É necessário configurar a integração ${provider}.`,
    `Configuration d'intégration ${provider} requise.`,
    `${provider}-Integration muss eingerichtet werden.`,
    `Требуется настройка интеграции ${provider}.`,
  );
}

export function msgApiSyncDisabled(bl: string, provider: string) {
  return pickUiText(
    bl,
    `${provider} 동기화가 비활성화 상태입니다.`,
    `${provider} sync is currently disabled.`,
    `Đồng bộ ${provider} hiện đang tắt.`,
    `${provider} 同期は無効化されています。`,
    `${provider} 同步当前已禁用。`,
    `La sincronización de ${provider} está desactivada.`,
    `A sincronização de ${provider} está desativada.`,
    `La synchronisation ${provider} est désactivée.`,
    `${provider}-Synchronisierung ist deaktiviert.`,
    `Синхронизация ${provider} отключена.`,
  );
}

export function msgApiSyncAuthNotCompleted(bl: string, provider: string) {
  return pickUiText(
    bl,
    `${provider} 인증(로그인)이 완료되지 않았습니다.`,
    `${provider} authentication is not completed.`,
    `Xác thực ${provider} chưa hoàn tất.`,
    `${provider} の認証（ログイン）が完了していません。`,
    `${provider} 认证（登录）尚未完成。`,
    `La autenticación de ${provider} no se ha completado.`,
    `A autenticação do ${provider} não foi concluída.`,
    `L'authentification ${provider} n'est pas terminée.`,
    `${provider}-Authentifizierung ist nicht abgeschlossen.`,
    `Аутентификация ${provider} не завершена.`,
  );
}

export function msgApiSyncApiKeysNotConfigured(bl: string, provider: string) {
  return pickUiText(
    bl,
    `${provider} API 키 설정이 완료되지 않았습니다.`,
    `${provider} API key setup is not completed.`,
    `Thiết lập khóa API ${provider} chưa hoàn tất.`,
    `${provider} API キー設定が完了していません。`,
    `${provider} API 密钥配置尚未完成。`,
    `La configuración de la API key de ${provider} no está completada.`,
    `A configuração da API key do ${provider} não foi concluída.`,
    `La configuration de la clé API ${provider} n'est pas terminée.`,
    `Die Einrichtung des ${provider}-API-Schlüssels ist nicht abgeschlossen.`,
    `Настройка API-ключа ${provider} не завершена.`,
  );
}

export function msgApiSyncNoRecentOrders(bl: string, hoursOrDaysText: string) {
  return pickUiText(
    bl,
    `동기화 완료 (최근 ${hoursOrDaysText}의 새 주문이 없습니다.)`,
    `Sync complete (no new orders in the last ${hoursOrDaysText}).`,
    `Đồng bộ xong (không có đơn mới trong ${hoursOrDaysText} gần đây).`,
    `同期完了（直近 ${hoursOrDaysText} に新規注文はありません）。`,
    `同步完成（最近 ${hoursOrDaysText} 无新订单）。`,
    `Sincronización completa (sin pedidos nuevos en los últimos ${hoursOrDaysText}).`,
    `Sincronização concluída (sem novos pedidos nos últimos ${hoursOrDaysText}).`,
    `Synchronisation terminée (aucune nouvelle commande sur ${hoursOrDaysText}).`,
    `Synchronisierung abgeschlossen (keine neuen Bestellungen in den letzten ${hoursOrDaysText}).`,
    `Синхронизация завершена (новых заказов за последние ${hoursOrDaysText} нет).`,
  );
}

export function msgApiUnregisteredStoreIgnored(bl: string) {
  return pickUiText(
    bl,
    "등록되지 않은 매장 코드라서 무시했습니다.",
    "Ignored due to unregistered store code.",
    "Đã bỏ qua vì mã cửa hàng chưa đăng ký.",
    "未登録の店舗コードのため無視しました。",
    "因门店代码未注册已忽略。",
    "Ignorado por código de tienda no registrado.",
    "Ignorado por código de loja não registrado.",
    "Ignoré car code magasin non enregistré.",
    "Ignoriert wegen nicht registriertem Store-Code.",
    "Игнорировано из-за незарегистрированного кода магазина.",
  );
}
