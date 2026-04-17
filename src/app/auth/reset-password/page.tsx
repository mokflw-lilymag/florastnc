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

export default function ResetPasswordPage() {
  const supabase = createClient();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let mounted = true;

    const init = async () => {
      // 링크 유효성 확인: 복구 링크로 들어오면 세션이 잡혀 있어야 함.
      const { data, error } = await supabase.auth.getSession();
      if (!mounted) return;

      if (error) {
        setSessionError("재설정 링크 확인에 실패했습니다. 새 링크를 다시 요청해 주세요.");
        return;
      }

      if (!data.session) {
        setSessionError("재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해 주세요.");
        return;
      }

      setReady(true);
    };

    init();

    return () => {
      mounted = false;
    };
  }, [supabase.auth]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!password || !confirmPassword) {
      toast.error("비밀번호를 모두 입력해 주세요.");
      return;
    }
    if (password.length < 6) {
      toast.error("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("비밀번호가 일치하지 않습니다.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success("비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.");
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "비밀번호 변경 중 오류가 발생했습니다.";
      toast.error("변경 실패", { description: message });
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
            비밀번호 재설정
          </CardTitle>
          <CardDescription>
            새 비밀번호를 입력한 뒤 변경 버튼을 눌러주세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {sessionError ? (
            <div className="space-y-4">
              <p className="text-sm text-red-600">{sessionError}</p>
              <Button className="w-full" onClick={() => router.push("/login")}>
                로그인으로 이동
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">새 비밀번호</Label>
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
                <Label htmlFor="confirmPassword">새 비밀번호 확인</Label>
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
                    변경 중...
                  </>
                ) : (
                  "비밀번호 변경"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
