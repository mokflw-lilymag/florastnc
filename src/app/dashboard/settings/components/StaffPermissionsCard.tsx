"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Save, Shield } from "lucide-react";

import { DEFAULT_STAFF_MENU_PERMISSIONS, normalizeStaffMenuPermissions, STAFF_MENU_OPTIONS } from "@/lib/staff-menu-permissions";

export function StaffPermissionsCard() {
  const { canManageStaff } = useAuth();
  const { settings, saveSettings, loading } = useSettings();
  const [permissions, setPermissions] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (settings) {
      setPermissions(
        normalizeStaffMenuPermissions(
          settings.staffMenuPermissions || [...DEFAULT_STAFF_MENU_PERMISSIONS],
        ),
      );
    }
  }, [settings]);

  if (!canManageStaff) {
    return (
      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-8 text-center text-slate-500">
          직원 권한 설정은 점주 계정에서만 변경할 수 있습니다.
        </CardContent>
      </Card>
    );
  }

  if (loading) return (
    <Card className="border-slate-200 shadow-sm animate-pulse">
      <CardHeader className="border-b border-slate-100 pb-4">
        <div className="h-5 w-48 bg-slate-200 rounded" />
        <div className="h-4 w-72 bg-slate-100 rounded mt-2" />
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-14 bg-slate-100 rounded-xl" />
          ))}
        </div>
      </CardContent>
    </Card>
  );

  const handleToggle = (menuId: string, checked: boolean) => {
    if (checked) {
      setPermissions(prev => [...prev, menuId]);
    } else {
      setPermissions(prev => prev.filter(p => p !== menuId));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (settings) {
        await saveSettings({ ...settings, staffMenuPermissions: permissions });
        toast.success("직원 권한 설정이 저장되었습니다.");
      }
    } catch (e) {
      toast.error("저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-500" />
          직원 메뉴 권한 설정
        </CardTitle>
        <CardDescription className="mt-1">
          직원이 PIN으로 전환되었을 때 사이드바에 보여질 메뉴를 선택하세요.
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {STAFF_MENU_OPTIONS.map(menu => {
            const isChecked = permissions.includes(menu.id);
            return (
              <div
                key={menu.id}
                className={`flex items-center justify-between p-4 rounded-xl border transition-colors ${
                  isChecked ? "border-primary/30 bg-primary/5" : "border-slate-200 bg-white"
                }`}
              >
                <span className={`font-medium ${isChecked ? "text-primary" : "text-slate-600"}`}>
                  {menu.label}
                </span>
                <Switch
                  checked={isChecked}
                  onCheckedChange={(c) => handleToggle(menu.id, c)}
                />
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-100">
          <Button onClick={handleSave} disabled={isSaving} className="w-full sm:w-auto">
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? "저장 중..." : "설정 저장"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
