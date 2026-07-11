"use client";

import { useState, useEffect } from "react";
import { usePosSession } from "@/hooks/use-pos-session";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronDown, User, Lock } from "lucide-react";

export function ProfileSwitcher() {
  const { activeProfile, switchedProfile, tenantId, authProfile, setActiveProfile, clearSession } = usePosSession();
  
  const [profiles, setProfiles] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [pinCode, setPinCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (!tenantId) return;
    const fetchProfiles = async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tenant_staff")
        .select("id, full_name:name, role")
        .eq("tenant_id", tenantId)
        .order("role", { ascending: true });
        
      if (!error && data) {
        const staffProfiles = data.map(staff => ({
          id: staff.id,
          full_name: staff.full_name,
          email: "",
          role: staff.role
        }));

        if (authProfile) {
          const adminProfile = {
            id: authProfile.id,
            full_name: authProfile.full_name || "사장님",
            email: authProfile.email || "",
            role: authProfile.role
          };
          setProfiles([adminProfile, ...staffProfiles]);
        } else {
          setProfiles(staffProfiles);
        }
      }
    };
    fetchProfiles();
  }, [tenantId, authProfile]);

  const handleSelectProfile = (id: string) => {
    // 이미 현재 작업자면 무시
    if (activeProfile?.id === id) return;
    
    // 사장님(authProfile) 선택 시
    if (authProfile && id === authProfile.id) {
      // 직원 모드에서 사장님으로 복귀 → 사장님 PIN 필수
      if (switchedProfile) {
        setTargetUserId(id);
        setPinCode("");
        setIsModalOpen(true);
        return;
      }
      clearSession();
      toast.success(`${authProfile.full_name || "사장님"}으로 전환되었습니다.`);
      return;
    }
    
    // 직원 선택 시 → PIN 인증 필요
    setTargetUserId(id);
    setPinCode("");
    setIsModalOpen(true);
  };

  const verifyPinAndSwitch = async () => {
    if (!targetUserId || pinCode.length !== 4) return;
    setIsVerifying(true);
    
    try {
      const res = await fetch("/api/staff/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUserId, pin_code: pinCode })
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        const isOwnerSwitch = authProfile && targetUserId === authProfile.id;
        if (isOwnerSwitch) {
          clearSession();
        } else {
          setActiveProfile(data.profile);
        }
        toast.success(`${data.profile.full_name || "사용자"}님으로 전환되었습니다.`);
        setIsModalOpen(false);
      } else {
        toast.error(data.error || "PIN 번호가 일치하지 않습니다.");
        setPinCode("");
      }
    } catch (e) {
      toast.error("인증 중 오류가 발생했습니다.");
    } finally {
      setIsVerifying(false);
    }
  };

  if (!activeProfile) return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center gap-2 h-9 px-3 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium">
          <User className="w-4 h-4" />
          <span className="font-medium max-w-[100px] truncate">
            {activeProfile.full_name || "사용자"}
          </span>
          <ChevronDown className="w-4 h-4 text-gray-500" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuGroup>
            <DropdownMenuLabel>작업자 전환</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            {profiles.map(p => (
              <DropdownMenuItem 
                key={p.id} 
                onClick={() => handleSelectProfile(p.id)}
                className="flex justify-between items-center cursor-pointer"
              >
                <span>{p.full_name || p.email}</span>
                {activeProfile.id === p.id && (
                  <span className="text-xs text-primary font-semibold">현재</span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-500" />
              PIN 인증
            </DialogTitle>
            <DialogDescription>
              {authProfile && targetUserId === authProfile.id
                ? "사장님 권한으로 전환하려면 사장님 PIN 4자리를 입력하세요."
                : "작업자를 전환하려면 4자리 PIN 번호를 입력하세요."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4 py-4">
            <Input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value)}
              className="text-center text-2xl tracking-widest h-12 w-32"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && pinCode.length === 4) {
                  verifyPinAndSwitch();
                }
              }}
            />
            <Button 
              className="w-full" 
              onClick={verifyPinAndSwitch} 
              disabled={pinCode.length !== 4 || isVerifying}
            >
              {isVerifying ? "인증 중..." : "확인"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
