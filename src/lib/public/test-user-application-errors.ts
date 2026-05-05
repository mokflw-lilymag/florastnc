import { pickUiText } from "@/i18n/pick-ui-text";

export function errTestApplyBadJson(bl: string) {
  return pickUiText(
    bl,
    "잘못된 요청입니다.",
    "Invalid request.",
    "Yêu cầu không hợp lệ.",
    "無効なリクエストです。",
    "请求无效。",
    "Solicitud no válida.",
    "Solicitação inválida.",
    "Requête invalide.",
    "Ungültige Anfrage.",
    "Некорректный запрос.",
  );
}

export function errTestApplyRequired(bl: string) {
  return pickUiText(
    bl,
    "필수 항목을 모두 입력해 주세요.",
    "Please fill in all required fields.",
    "Vui lòng điền đầy đủ các mục bắt buộc.",
    "必須項目をすべて入力してください。",
    "请填写所有必填项。",
    "Complete todos los campos obligatorios.",
    "Preencha todos os campos obrigatórios.",
    "Remplissez tous les champs obligatoires.",
    "Bitte alle Pflichtfelder ausfüllen.",
    "Заполните все обязательные поля.",
  );
}

export function errTestApplyEmail(bl: string) {
  return pickUiText(
    bl,
    "이메일 형식을 확인해 주세요.",
    "Please check the email format.",
    "Vui lòng kiểm tra định dạng email.",
    "メール形式を確認してください。",
    "请检查邮箱格式。",
    "Revise el formato del correo.",
    "Verifique o formato do e-mail.",
    "Vérifiez le format de l’e-mail.",
    "Bitte prüfen Sie das E-Mail-Format.",
    "Проверьте формат email.",
  );
}

export function msgTestApplyNoDb(bl: string) {
  return pickUiText(
    bl,
    "서버 저장 설정이 되어 있지 않습니다.",
    "Server storage is not configured.",
    "Máy chủ chưa được cấu hình lưu trữ.",
    "サーバー側の保存設定がありません。",
    "服务器未配置存储。",
    "El almacenamiento del servidor no está configurado.",
    "O armazenamento no servidor não está configurado.",
    "Le stockage serveur n’est pas configuré.",
    "Serverspeicher ist nicht konfiguriert.",
    "Хранилище на сервере не настроено.",
  );
}

export function errTestApplySave(bl: string) {
  return pickUiText(
    bl,
    "저장 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 이메일로 문의해 주세요.",
    "Something went wrong while saving. Try again shortly or contact us by email.",
    "Lưu thất bại. Thử lại sau hoặc liên hệ qua email.",
    "保存中にエラーが発生しました。しばらくしてから再試行するか、メールでお問い合わせください。",
    "保存时出错。请稍后重试或通过邮件联系我们。",
    "Error al guardar. Inténtelo de nuevo o escríbanos por correo.",
    "Erro ao salvar. Tente novamente ou envie um e-mail.",
    "Erreur d’enregistrement. Réessayez ou contactez-nous par e-mail.",
    "Fehler beim Speichern. Bitte später erneut versuchen oder per E-Mail melden.",
    "Ошибка сохранения. Повторите позже или напишите на email.",
  );
}
