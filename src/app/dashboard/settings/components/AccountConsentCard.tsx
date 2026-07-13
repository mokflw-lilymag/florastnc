"use client";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

export function AccountConsentCard() {
  const { user } = useAuth();
  const supabase = createClient();
  const [marketingAgreed, setMarketingAgreed] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (user?.user_metadata) {
      setMarketingAgreed(user.user_metadata.marketing_agreed !== false);
    }
  }, [user]);

  const handleToggle = async (checked: boolean) => {
    setMarketingAgreed(checked);
    setIsUpdating(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { marketing_agreed: checked },
      });
      if (error) throw error;
      toast.success(checked ? "마케팅 수신에 동의하셨습니다." : "마케팅 수신이 거부되었습니다.");
    } catch (err: any) {
      setMarketingAgreed(!checked);
      toast.error("업데이트 실패: " + err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200 mt-6">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-lg font-bold">계정 및 개인정보 관리</CardTitle>
        <CardDescription>
          본 계정에 대한 개인정보 활용 및 알림 수신 동의를 관리합니다.
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label className="text-base font-semibold">마케팅 및 프로모션 알림 수신 동의</Label>
            <p className="text-sm text-slate-500">
              플로싱크에서 제공하는 이벤트, 혜택, 유용한 소식을 이메일 등으로 받아보실 수 있습니다.
            </p>
          </div>
          <Switch 
            checked={marketingAgreed} 
            onCheckedChange={handleToggle} 
            disabled={isUpdating}
          />
        </div>
      </CardContent>
    </Card>
  );
}
