"use client";

import { Menu, User, LogOut, Settings, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface HeaderProps {
  userEmail: string;
  isSuperAdmin: boolean;
}

export function Header({ userEmail, isSuperAdmin }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("안전하게 로그아웃 되었습니다.");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Toggle Button */}
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">사이드바 메뉴 열기</span>
        </Button>
      </div>

      <div className="flex items-center gap-4">
        {/* Notification Bell */}
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
        </Button>

        {/* User Dropdown Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-slate-100 dark:ring-slate-800 transition-all focus:ring-blue-500 outline-none hover:bg-slate-100 dark:hover:bg-slate-800">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-bold text-xs ring-1 ring-white dark:ring-slate-900">
                {userEmail.substring(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none text-slate-900 dark:text-white">{isSuperAdmin ? '관리자' : '구독 파트너'}</p>
                <p className="text-xs leading-none text-slate-500 dark:text-slate-400 truncate">
                  {userEmail}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4 text-slate-400" />
              <span>내 프로필</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">
              <Settings className="mr-2 h-4 w-4 text-slate-400" />
              <span>환경 설정</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 dark:text-red-400 focus:bg-red-50 dark:focus:bg-red-900/20 focus:text-red-600 dark:focus:text-red-400">
              <LogOut className="mr-2 h-4 w-4" />
              <span>로그아웃</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
