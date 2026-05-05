"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, Lock } from "lucide-react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const L = (
    ko: string,
    en: string,
    vi: string,
    ja: string,
    zh: string,
    es: string,
    pt: string,
    fr: string,
    de: string,
    ru: string,
  ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let mounted = true;
    const bl = toBaseLocale(locale);

    const init = async () => {
      // Recovery link should establish a session before this page is used.
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        setSessionError(
          pickUiText(
            bl,
            "재설정 링크 확인에 실패했습니다. 새 링크를 다시 요청해 주세요.",
            "Could not verify the reset link. Please request a new one.",
            "Không xác minh được liên kết đặt lại. Vui lòng yêu cầu liên kết mới.",
            "再設定リンクを確認できませんでした。新しいリンクを再発行してください。",
            "无法验证重置链接，请重新申请。",
            "No se pudo verificar el enlace de restablecimiento. Solicita uno nuevo.",
            "Não foi possível verificar o link de redefinição. Solicite um novo.",
            "Impossible de vérifier le lien de réinitialisation. Demandez-en un nouveau.",
            "Der Zurücksetzen-Link konnte nicht bestätigt werden. Bitte neu anfordern.",
            "Не удалось подтвердить ссылку сброса. Запросите новую.",
          ),
        );
        return;
      }

      if (!data.session) {
        setSessionError(
          pickUiText(
            bl,
            "재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요.",
            "This reset link has expired or is invalid. Please request a new one.",
            "Liên kết đặt lại đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu lại.",
            "再設定リンクの有効期限が切れているか無効です。再度リクエストしてください。",
            "重置链接已过期或无效，请重新申请。",
            "El enlace de restablecimiento caducó o no es válido. Solicita uno nuevo.",
            "O link de redefinição expirou ou é inválido. Solicite outro.",
            "Le lien de réinitialisation a expiré ou est invalide. Demandez-en un nouveau.",
            "Der Link ist abgelaufen oder ungültig. Bitte neu anfordern.",
            "Ссылка сброса истекла или недействительна. Запросите новую.",
          ),
        );
        return;
      }

      setSessionError("");
      setReady(true);
    };

    init();

    return () => {
      mounted = false;
    };
  }, [supabase.auth, locale]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error(
        L(
          "비밀번호를 모두 입력해 주세요.",
          "Please enter both password fields.",
          "Vui lòng nhập cả hai ô mật khẩu.",
          "パスワードの両方を入力してください。",
          "请填写两个密码框。",
          "Completa ambos campos de contraseña.",
          "Preencha os dois campos de senha.",
          "Saisissez les deux champs de mot de passe.",
          "Bitte beide Passwortfelder ausfüllen.",
          "Заполните оба поля пароля.",
        ),
      );
      return;
    }
    if (password.length < 6) {
      toast.error(
        L(
          "비밀번호는 6자 이상이어야 합니다.",
          "Password must be at least 6 characters.",
          "Mật khẩu phải có ít nhất 6 ký tự.",
          "パスワードは6文字以上にしてください。",
          "密码至少 6 个字符。",
          "La contraseña debe tener al menos 6 caracteres.",
          "A senha deve ter pelo menos 6 caracteres.",
          "Le mot de passe doit contenir au moins 6 caractères.",
          "Passwort mindestens 6 Zeichen.",
          "Пароль не короче 6 символов.",
        ),
      );
      return;
    }
    if (password !== confirmPassword) {
      toast.error(
        L(
          "비밀번호가 일치하지 않습니다.",
          "Passwords do not match.",
          "Mật khẩu không khớp.",
          "パスワードが一致しません。",
          "两次输入的密码不一致。",
          "Las contraseñas no coinciden.",
          "As senhas não coincidem.",
          "Les mots de passe ne correspondent pas.",
          "Die Passwörter stimmen nicht überein.",
          "Пароли не совпадают.",
        ),
      );
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success(
        L(
          "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.",
          "Password updated. Please sign in with your new password.",
          "Đã đổi mật khẩu. Vui lòng đăng nhập bằng mật khẩu mới.",
          "パスワードを変更しました。新しいパスワードでログインしてください。",
          "密码已更新，请使用新密码登录。",
          "Contraseña actualizada. Inicia sesión con la nueva.",
          "Senha atualizada. Entre com a nova senha.",
          "Mot de passe mis à jour. Connectez-vous avec le nouveau.",
          "Passwort geändert. Bitte mit neuem Passwort anmelden.",
          "Пароль изменён. Войдите с новым паролем.",
        ),
      );
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : L(
              "비밀번호 변경 중 오류가 발생했습니다.",
              "Something went wrong while updating your password.",
              "Đã xảy ra lỗi khi đổi mật khẩu.",
              "パスワードの更新中にエラーが発生しました。",
              "更新密码时出错。",
              "Error al actualizar la contraseña.",
              "Erro ao atualizar a senha.",
              "Erreur lors de la mise à jour du mot de passe.",
              "Fehler beim Aktualisieren des Passworts.",
              "Ошибка при обновлении пароля.",
            );
      toast.error(
        L(
          "변경 실패",
          "Update failed",
          "Đổi mật khẩu thất bại",
          "更新に失敗しました",
          "更新失败",
          "No se pudo actualizar",
          "Falha na atualização",
          "Échec de la mise à jour",
          "Update fehlgeschlagen",
          "Не удалось обновить",
        ),
        { description: message },
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            {L(
              "비밀번호 재설정",
              "Reset password",
              "Đặt lại mật khẩu",
              "パスワードの再設定",
              "重置密码",
              "Restablecer contraseña",
              "Redefinir senha",
              "Réinitialisation du mot de passe",
              "Passwort zurücksetzen",
              "Сброс пароля",
            )}
          </CardTitle>
          <CardDescription>
            {L(
              "새 비밀번호를 입력한 뒤 변경 버튼을 눌러주세요.",
              "Enter a new password, then tap Change password.",
              "Nhập mật khẩu mới, sau đó nhấn Đổi mật khẩu.",
              "新しいパスワードを入力し、「パスワードを変更」を押してください。",
              "输入新密码后点击“更改密码”。",
              "Introduce una nueva contraseña y pulsa Cambiar contraseña.",
              "Digite uma nova senha e toque em Alterar senha.",
              "Saisissez un nouveau mot de passe, puis appuyez sur Changer le mot de passe.",
              "Neues Passwort eingeben, dann Passwort ändern.",
              "Введите новый пароль и нажмите «Сменить пароль».",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionError ? (
            <div className="space-y-4">
              <p className="text-sm text-red-600">{sessionError}</p>
              <Button className="w-full" onClick={() => router.push("/login")}>
                {L(
                  "로그인으로 이동",
                  "Go to sign in",
                  "Đi tới đăng nhập",
                  "ログインへ",
                  "前往登录",
                  "Ir al inicio de sesión",
                  "Ir para o login",
                  "Aller à la connexion",
                  "Zur Anmeldung",
                  "Перейти ко входу",
                )}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  {L(
                    "새 비밀번호",
                    "New password",
                    "Mật khẩu mới",
                    "新しいパスワード",
                    "新密码",
                    "Nueva contraseña",
                    "Nova senha",
                    "Nouveau mot de passe",
                    "Neues Passwort",
                    "Новый пароль",
                  )}
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!ready || loading}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  {L(
                    "새 비밀번호 확인",
                    "Confirm new password",
                    "Xác nhận mật khẩu mới",
                    "新しいパスワード（確認）",
                    "确认新密码",
                    "Confirmar nueva contraseña",
                    "Confirmar nova senha",
                    "Confirmer le nouveau mot de passe",
                    "Passwort bestätigen",
                    "Подтвердите пароль",
                  )}
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!ready || loading}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={!ready || loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {L(
                      "변경 중...",
                      "Updating...",
                      "Đang cập nhật...",
                      "更新中…",
                      "更新中…",
                      "Actualizando…",
                      "Atualizando…",
                      "Mise à jour…",
                      "Wird aktualisiert…",
                      "Обновление…",
                    )}
                  </>
                ) : (
                  L(
                    "비밀번호 변경",
                    "Change password",
                    "Đổi mật khẩu",
                    "パスワードを変更",
                    "更改密码",
                    "Cambiar contraseña",
                    "Alterar senha",
                    "Changer le mot de passe",
                    "Passwort ändern",
                    "Сменить пароль",
                  )
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
