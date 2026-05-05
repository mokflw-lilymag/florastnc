import { pickUiText } from "@/i18n/pick-ui-text";

export function errAnnComposeFieldsRequired(bl: string) {
  return pickUiText(
    bl,
    "organizationId, title, body가 필요합니다.",
    "organizationId, title, and body are required.",
    "Cần organizationId, title và body.",
    "organizationId、title、body が必要です。",
    "需要 organizationId、title、body。",
    "Se requiere organizationId, title y body.",
    "organizationId, title e body são obrigatórios.",
    "organizationId, title et body sont requis.",
    "organizationId, title und body sind erforderlich.",
    "Нужны organizationId, title и body.",
  );
}

export function errAnnTableMissing(bl: string) {
  return pickUiText(
    bl,
    "organization_announcements 테이블이 없습니다. Supabase에서 organization_announcements_schema.sql을 실행하세요.",
    "The organization_announcements table is missing. Run organization_announcements_schema.sql in Supabase.",
    "Thiếu bảng organization_announcements. Chạy organization_announcements_schema.sql trong Supabase.",
    "organization_announcements テーブルがありません。Supabase で organization_announcements_schema.sql を実行してください。",
    "缺少 organization_announcements 表。请在 Supabase 中执行 organization_announcements_schema.sql。",
    "Falta la tabla organization_announcements. Ejecute organization_announcements_schema.sql en Supabase.",
    "Falta a tabela organization_announcements. Execute organization_announcements_schema.sql no Supabase.",
    "Table organization_announcements manquante. Exécutez organization_announcements_schema.sql dans Supabase.",
    "Tabelle organization_announcements fehlt. Führen Sie organization_announcements_schema.sql in Supabase aus.",
    "Нет таблицы organization_announcements. Выполните organization_announcements_schema.sql в Supabase.",
  );
}

export function errAnnSchemaLegacy(bl: string) {
  return pickUiText(
    bl,
    "공지 테이블 스키마가 오래되었습니다. Supabase에서 organization_announcements_schema.sql(또는 organization_announcements_board_migration.sql)을 적용하세요.",
    "The announcements schema is outdated. Apply organization_announcements_schema.sql (or organization_announcements_board_migration.sql) in Supabase.",
    "Lược đồ thông báo đã cũ. Áp dụng organization_announcements_schema.sql (hoặc organization_announcements_board_migration.sql) trong Supabase.",
    "お知らせテーブルのスキーマが古いです。Supabase で organization_announcements_schema.sql（または organization_announcements_board_migration.sql）を適用してください。",
    "公告表结构已过时。请在 Supabase 中应用 organization_announcements_schema.sql（或 organization_announcements_board_migration.sql）。",
    "El esquema de anuncios está obsoleto. Aplique organization_announcements_schema.sql (u organization_announcements_board_migration.sql) en Supabase.",
    "O esquema de avisos está desatualizado. Aplique organization_announcements_schema.sql (ou organization_announcements_board_migration.sql) no Supabase.",
    "Le schéma des annonces est obsolète. Appliquez organization_announcements_schema.sql (ou organization_announcements_board_migration.sql) dans Supabase.",
    "Das Ankündigungsschema ist veraltet. Wenden Sie organization_announcements_schema.sql (oder organization_announcements_board_migration.sql) in Supabase an.",
    "Схема объявлений устарела. Примените organization_announcements_schema.sql (или organization_announcements_board_migration.sql) в Supabase.",
  );
}

export function errAnnRlsDenied(bl: string) {
  return pickUiText(
    bl,
    "공지 등록 권한이 없습니다. super_admin 또는 해당 조직 org_admin인지, organization_members에 연결돼 있는지 확인하세요.",
    "You don’t have permission to post announcements. Confirm you are super_admin or org_admin for the organization and listed in organization_members.",
    "Không có quyền đăng thông báo. Xác nhận bạn là super_admin hoặc org_admin và có trong organization_members.",
    "お知らせを投稿する権限がありません。super_admin または該当組織の org_admin で organization_members にいるか確認してください。",
    "无发布公告权限。请确认您是否为 super_admin 或该组织的 org_admin，且已在 organization_members 中。",
    "Sin permiso para publicar anuncios. Confirme que es super_admin u org_admin y está en organization_members.",
    "Sem permissão para publicar avisos. Confirme super_admin ou org_admin e membership em organization_members.",
    "Pas d’autorisation pour publier. Vérifiez super_admin ou org_admin et organization_members.",
    "Keine Berechtigung für Ankündigungen. Prüfen Sie super_admin bzw. org_admin und organization_members.",
    "Нет прав на публикацию. Убедитесь, что вы super_admin или org_admin и есть в organization_members.",
  );
}

export function errAnnPostNotFound(bl: string) {
  return pickUiText(
    bl,
    "게시물을 찾을 수 없습니다.",
    "Post was not found.",
    "Không tìm thấy bài đăng.",
    "投稿が見つかりません。",
    "未找到帖子。",
    "No se encontró la publicación.",
    "Post não encontrado.",
    "Publication introuvable.",
    "Beitrag nicht gefunden.",
    "Запись не найдена.",
  );
}

export function errAnnDeleteForbidden(bl: string) {
  return pickUiText(
    bl,
    "게시물을 삭제할 권한이 없습니다. 플랫폼 관리자 또는 해당 조직 org_admin만 가능합니다.",
    "You don’t have permission to delete this post. Only a platform admin or the organization’s org_admin can delete it.",
    "Không có quyền xóa bài. Chỉ quản trị nền tảng hoặc org_admin của tổ chức mới được xóa.",
    "この投稿を削除する権限がありません。プラットフォーム管理者または該当組織の org_admin のみ削除できます。",
    "无权删除帖子。仅平台管理员或该组织的 org_admin 可删除。",
    "Sin permiso para eliminar. Solo un administrador de la plataforma o org_admin puede hacerlo.",
    "Sem permissão para excluir. Apenas admin da plataforma ou org_admin.",
    "Pas d’autorisation de suppression. Admin plateforme ou org_admin uniquement.",
    "Keine Löschberechtigung. Nur Plattform-Admin oder org_admin.",
    "Нет прав на удаление. Только админ платформы или org_admin.",
  );
}

export function errAnnAnnouncementIdRequired(bl: string) {
  return pickUiText(
    bl,
    "announcement id가 필요합니다.",
    "Announcement id is required.",
    "Cần id thông báo.",
    "announcement id が必要です。",
    "需要公告 id。",
    "Se requiere el id del anuncio.",
    "Id do aviso é obrigatório.",
    "L’id de l’annonce est requis.",
    "Ankündigungs-ID ist erforderlich.",
    "Нужен id объявления.",
  );
}

export function errAnnIdsRequired(bl: string) {
  return pickUiText(
    bl,
    "id가 필요합니다.",
    "id is required.",
    "Cần id.",
    "id が必要です。",
    "需要 id。",
    "Se requiere id.",
    "id é obrigatório.",
    "id est requis.",
    "id ist erforderlich.",
    "Нужен id.",
  );
}

export function errAnnCommentsTableMissing(bl: string) {
  return pickUiText(
    bl,
    "댓글 테이블이 없습니다. organization_announcement_comments_schema.sql을 실행하세요.",
    "The comments table is missing. Run organization_announcement_comments_schema.sql.",
    "Thiếu bảng bình luận. Chạy organization_announcement_comments_schema.sql.",
    "コメントテーブルがありません。organization_announcement_comments_schema.sql を実行してください。",
    "缺少评论表。请执行 organization_announcement_comments_schema.sql。",
    "Falta la tabla de comentarios. Ejecute organization_announcement_comments_schema.sql.",
    "Falta a tabela de comentários. Execute organization_announcement_comments_schema.sql.",
    "Table des commentaires manquante. Exécutez organization_announcement_comments_schema.sql.",
    "Kommentartabelle fehlt. Führen Sie organization_announcement_comments_schema.sql aus.",
    "Нет таблицы комментариев. Выполните organization_announcement_comments_schema.sql.",
  );
}

export function errAnnCommentBodyRequired(bl: string) {
  return pickUiText(
    bl,
    "댓글 내용을 입력하세요.",
    "Please enter comment text.",
    "Vui lòng nhập nội dung bình luận.",
    "コメントを入力してください。",
    "请输入评论内容。",
    "Escriba el comentario.",
    "Digite o comentário.",
    "Saisissez le commentaire.",
    "Bitte Kommentar eingeben.",
    "Введите текст комментария.",
  );
}

export function errAnnCommentTooLong(bl: string) {
  return pickUiText(
    bl,
    "댓글은 8000자 이하로 입력하세요.",
    "Comments must be 8000 characters or fewer.",
    "Bình luận tối đa 8000 ký tự.",
    "コメントは8000文字以内にしてください。",
    "评论不超过 8000 字。",
    "Máximo 8000 caracteres.",
    "No máximo 8000 caracteres.",
    "8000 caractères maximum.",
    "Höchstens 8000 Zeichen.",
    "Не более 8000 символов.",
  );
}

export function errAnnCommentNotFound(bl: string) {
  return pickUiText(
    bl,
    "댓글을 찾을 수 없습니다.",
    "Comment was not found.",
    "Không tìm thấy bình luận.",
    "コメントが見つかりません。",
    "未找到评论。",
    "No se encontró el comentario.",
    "Comentário não encontrado.",
    "Commentaire introuvable.",
    "Kommentar nicht gefunden.",
    "Комментарий не найден.",
  );
}

export function errAnnCommentDeleteForbidden(bl: string) {
  return pickUiText(
    bl,
    "댓글을 삭제할 권한이 없습니다.",
    "You don’t have permission to delete this comment.",
    "Không có quyền xóa bình luận này.",
    "このコメントを削除する権限がありません。",
    "无权删除此评论。",
    "Sin permiso para eliminar este comentario.",
    "Sem permissão para excluir este comentário.",
    "Pas d’autorisation pour supprimer ce commentaire.",
    "Keine Berechtigung zum Löschen dieses Kommentars.",
    "Нет прав на удаление этого комментария.",
  );
}

export function errAnnBranchAccountOnly(bl: string) {
  return pickUiText(
    bl,
    "지점(매장) 계정에서만 공지를 확인할 수 있습니다.",
    "Only branch (store) accounts can confirm announcements.",
    "Chỉ tài khoản chi nhánh (cửa hàng) mới có thể xác nhận thông báo.",
    "店舗アカウントのみお知らせを確認できます。",
    "仅门店账号可确认公告。",
    "Solo cuentas de sucursal pueden confirmar.",
    "Somente contas de filial podem confirmar.",
    "Seules les succursales peuvent confirmer.",
    "Nur Filialkonten können bestätigen.",
    "Подтверждать могут только аккаунты филиалов.",
  );
}

export function errAnnTenantOrgIdMissing(bl: string) {
  return pickUiText(
    bl,
    "이 매장(tenants)에 organization_id가 없습니다. Supabase에서 해당 지점을 본사 조직에 연결한 뒤 다시 시도해 주세요.",
    "This store (tenants) has no organization_id. Link the branch to the HQ organization in Supabase and try again.",
    "Cửa hàng này không có organization_id. Liên kết chi nhánh với tổ chức HQ trong Supabase rồi thử lại.",
    "この店舗に organization_id がありません。Supabase で本部組織に紐づけてから再試行してください。",
    "该门店缺少 organization_id。请在 Supabase 中将门店关联到总部组织后重试。",
    "Esta tienda no tiene organization_id. Vincule la sucursal a la organización en Supabase.",
    "Esta loja não tem organization_id. Vincule a filial à organização no Supabase.",
    "Ce magasin n’a pas d’organization_id. Liez la succursale à l’organisation dans Supabase.",
    "Dieser Store hat keine organization_id. Verknüpfen Sie die Filiale in Supabase.",
    "У магазина нет organization_id. Свяжите филиал с организацией в Supabase.",
  );
}

export function errAnnBulletinNotFound(bl: string) {
  return pickUiText(
    bl,
    "공지를 찾을 수 없습니다.",
    "Announcement was not found.",
    "Không tìm thấy thông báo.",
    "お知らせが見つかりません。",
    "未找到公告。",
    "No se encontró el anuncio.",
    "Aviso não encontrado.",
    "Annonce introuvable.",
    "Ankündigung nicht gefunden.",
    "Объявление не найдено.",
  );
}

export function errAnnOrgMismatch(bl: string) {
  return pickUiText(
    bl,
    "이 공지의 조직과 로그인한 매장의 조직이 다릅니다. 본사에서 공지 등록 시 조직을 확인하거나, 지점 tenants.organization_id 연결을 맞춰 주세요.",
    "This announcement’s organization does not match your store’s organization. Check the org when posting, or align tenants.organization_id.",
    "Tổ chức của thông báo không khớp với cửa hàng đăng nhập. Kiểm tra tổ chức khi đăng hoặc chỉnh tenants.organization_id.",
    "このお知らせの組織とログイン中の店舗の組織が一致しません。投稿時の組織または tenants.organization_id を確認してください。",
    "公告所属组织与当前门店不一致。请核对发布组织或调整 tenants.organization_id。",
    "La organización del anuncio no coincide con la tienda. Revise al publicar o alinee tenants.organization_id.",
    "A organização do aviso não coincide com a loja. Verifique ao publicar ou alinhe tenants.organization_id.",
    "L’organisation de l’annonce ne correspond pas au magasin. Vérifiez ou alignez tenants.organization_id.",
    "Organisation der Ankündigung und Filiale stimmen nicht überein. Prüfen Sie tenants.organization_id.",
    "Организация объявления не совпадает с магазином. Проверьте tenants.organization_id.",
  );
}

export function errAnnExpired(bl: string) {
  return pickUiText(
    bl,
    "만료된 공지입니다.",
    "This announcement has expired.",
    "Thông báo đã hết hạn.",
    "このお知らせは期限切れです。",
    "公告已过期。",
    "El anuncio ha caducado.",
    "O aviso expirou.",
    "L’annonce a expiré.",
    "Die Ankündigung ist abgelaufen.",
    "Объявление истекло.",
  );
}

export function errAnnReadsTableMissing(bl: string) {
  return pickUiText(
    bl,
    "확인 기록 테이블이 없습니다. Supabase에서 organization_announcement_reads_schema.sql을 실행하세요.",
    "The read-receipt table is missing. Run organization_announcement_reads_schema.sql in Supabase.",
    "Thiếu bảng xác nhận đã đọc. Chạy organization_announcement_reads_schema.sql trong Supabase.",
    "確認記録テーブルがありません。Supabase で organization_announcement_reads_schema.sql を実行してください。",
    "缺少已读记录表。请在 Supabase 中执行 organization_announcement_reads_schema.sql。",
    "Falta la tabla de lecturas. Ejecute organization_announcement_reads_schema.sql.",
    "Falta a tabela de leituras. Execute organization_announcement_reads_schema.sql.",
    "Table des lectures manquante. Exécutez organization_announcement_reads_schema.sql.",
    "Lesebestätigungstabelle fehlt. Führen Sie organization_announcement_reads_schema.sql aus.",
    "Нет таблицы прочтений. Выполните organization_announcement_reads_schema.sql.",
  );
}

export function errAnnUploadOrgFileRequired(bl: string) {
  return pickUiText(
    bl,
    "organizationId와 file이 필요합니다.",
    "organizationId and file are required.",
    "Cần organizationId và file.",
    "organizationId と file が必要です。",
    "需要 organizationId 与 file。",
    "Se requiere organizationId y archivo.",
    "organizationId e arquivo são obrigatórios.",
    "organizationId et fichier sont requis.",
    "organizationId und Datei sind erforderlich.",
    "Нужны organizationId и файл.",
  );
}

export function errAnnUploadMax10mb(bl: string) {
  return pickUiText(
    bl,
    "파일은 10MB 이하만 업로드할 수 있습니다.",
    "Files must be 10MB or smaller.",
    "Chỉ có thể tải lên tệp tối đa 10MB.",
    "ファイルは10MB以下のみアップロードできます。",
    "文件大小不能超过 10MB。",
    "El archivo debe ser de 10 MB o menos.",
    "O arquivo deve ter no máximo 10 MB.",
    "Le fichier doit faire 10 Mo maximum.",
    "Dateien dürfen höchstens 10 MB groß sein.",
    "Размер файла не более 10 МБ.",
  );
}

export function errAnnUploadImagesOnly(bl: string) {
  return pickUiText(
    bl,
    "이미지 파일만 업로드할 수 있습니다.",
    "Only image files can be uploaded.",
    "Chỉ có thể tải lên ảnh.",
    "画像ファイルのみアップロードできます。",
    "仅可上传图片。",
    "Solo se pueden subir imágenes.",
    "Somente imagens podem ser enviadas.",
    "Seules les images sont autorisées.",
    "Nur Bilder können hochgeladen werden.",
    "Можно загружать только изображения.",
  );
}

export function errAnnUploadDefaultFailed(bl: string) {
  return pickUiText(
    bl,
    "업로드 실패",
    "Upload failed",
    "Tải lên thất bại",
    "アップロードに失敗しました",
    "上传失败",
    "Error al subir",
    "Falha no upload",
    "Échec du téléversement",
    "Upload fehlgeschlagen",
    "Не удалось загрузить",
  );
}

export function errAnnUploadHintBucket(bl: string) {
  return pickUiText(
    bl,
    " Supabase SQL 편집기에서 supabase/storage_buckets.sql을 실행해 org_announcements 버킷·정책을 적용하세요.",
    " Run supabase/storage_buckets.sql in the Supabase SQL editor to create the org_announcements bucket and policies.",
    " Chạy supabase/storage_buckets.sql trong SQL editor của Supabase để tạo bucket org_announcements và chính sách.",
    " Supabase の SQL エディタで supabase/storage_buckets.sql を実行し、org_announcements バケットとポリシーを設定してください。",
    " 请在 Supabase SQL 编辑器中执行 supabase/storage_buckets.sql，以创建 org_announcements 存储桶和策略。",
    " Ejecute supabase/storage_buckets.sql en el editor SQL de Supabase para el bucket org_announcements.",
    " Execute supabase/storage_buckets.sql no SQL do Supabase para o bucket org_announcements.",
    " Exécutez supabase/storage_buckets.sql dans Supabase pour le bucket org_announcements.",
    " Führen Sie supabase/storage_buckets.sql in Supabase aus (Bucket org_announcements).",
    " Выполните supabase/storage_buckets.sql в Supabase для бакета org_announcements.",
  );
}

export function errAnnUploadHintRls(bl: string) {
  return pickUiText(
    bl,
    " storage_buckets.sql의 storage_org_announcements_hq_upload 정책이 적용됐는지 확인하세요.",
    " Check that the storage_org_announcements_hq_upload policy from storage_buckets.sql is applied.",
    " Kiểm tra đã áp dụng policy storage_org_announcements_hq_upload trong storage_buckets.sql.",
    " storage_buckets.sql の storage_org_announcements_hq_upload ポリシーが適用されているか確認してください。",
    " 请确认已应用 storage_buckets.sql 中的 storage_org_announcements_hq_upload 策略。",
    " Compruebe la política storage_org_announcements_hq_upload de storage_buckets.sql.",
    " Verifique a política storage_org_announcements_hq_upload em storage_buckets.sql.",
    " Vérifiez la politique storage_org_announcements_hq_upload dans storage_buckets.sql.",
    " Prüfen Sie die Richtlinie storage_org_announcements_hq_upload in storage_buckets.sql.",
    " Убедитесь, что применена политика storage_org_announcements_hq_upload из storage_buckets.sql.",
  );
}
