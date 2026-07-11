"use client";

import { useAuth } from "@/hooks/use-auth";
import { StaffSubNav } from "./components/staff-sub-nav";
import { OwnerPinSettingsCard } from "@/app/dashboard/settings/components/OwnerPinSettingsCard";
import { PosDeviceSettingsCard } from "@/app/dashboard/settings/components/PosDeviceSettingsCard";
import { StaffPermissionsCard } from "@/app/dashboard/settings/components/StaffPermissionsCard";
import { StaffSettingsCard } from "@/app/dashboard/settings/components/StaffSettingsCard";
import { PayrollSettingsCard } from "@/app/dashboard/staff/components/PayrollSettingsCard";

export default function StaffHrPage() {
  const { canManageStaff, isLoading } = useAuth();

  if (isLoading) {
    return <div className="p-8 text-slate-500">불러오는 중...</div>;
  }

  if (!canManageStaff) {
    return (
      <div className="p-8 text-slate-600">
        접근 권한이 없습니다. 점주 계정으로 로그인했는지 확인해주세요.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50/30">
      <div className="p-6 pb-2">
        <h1 className="text-2xl font-bold">직원 · HR</h1>
        <p className="text-sm text-slate-500 mt-1">
          직원 인사 정보, PIN·권한, 출퇴근 POS를 관리합니다.
        </p>
      </div>

      <div className="p-4 md:p-6 space-y-4 flex-1 overflow-auto">
        <StaffSubNav />
        <PayrollSettingsCard />
        <OwnerPinSettingsCard />
        <PosDeviceSettingsCard />
        <StaffPermissionsCard />
        <StaffSettingsCard />
      </div>
    </div>
  );
}
