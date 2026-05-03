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
  const L = (ko: string, en: string, vi?: string) => pickUiText(baseLocale, ko, en, vi);

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
      toast.error(L("비밀번호를 모두 입력해 주세요.", "Please enter both password fields.", "Vui lòng nhập cả hai ô mật khẩu."));
      return;
    }
    if (password.length < 6) {
      toast.error(L("비밀번호는 6자 이상이어야 합니다.", "Password must be at least 6 characters.", "Mật khẩu phải có ít nhất 6 ký tự."));
      return;
    }
    if (password !== confirmPassword) {
      toast.error(L("비밀번호가 일치하지 않습니다.", "Passwords do not match.", "Mật khẩu không khớp."));
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
        ),
      );
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error: unknown) {
      const message =
        error instanceof Error
          ? error.message
          : L("비밀번호 변경 중 오류가 발생했습니다.", "Something went wrong while updating your password.", "Đã xảy ra lỗi khi đổi mật khẩu.");
      toast.error(L("변경 실패", "Update failed", "Đổi mật khẩu thất bại"), { description: message });
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
            {L("비밀번호 재설정", "Reset password", "Đặt lại mật khẩu")}
          </CardTitle>
          <CardDescription>
            {L(
              "새 비밀번호를 입력한 뒤 변경 버튼을 눌러주세요.",
              "Enter a new password, then tap Change password.",
              "Nhập mật khẩu mới, sau đó nhấn Đổi mật khẩu.",
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionError ? (
            <div className="space-y-4">
              <p className="text-sm text-red-600">{sessionError}</p>
              <Button className="w-full" onClick={() => router.push("/login")}>
                {L("로그인으로 이동", "Go to sign in", "Đi tới đăng nhập")}
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">{L("새 비밀번호", "New password", "Mật khẩu mới")}</Label>
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
                  {L("새 비밀번호 확인", "Confirm new password", "Xác nhận mật khẩu mới")}
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
                    {L("변경 중...", "Updating...", "Đang cập nhật...")}
                  </>
                ) : (
                  L("비밀번호 변경", "Change password", "Đổi mật khẩu")
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
