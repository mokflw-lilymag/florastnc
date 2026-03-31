"use client";

import { useState, useEffect } from "react";
import { Menu, User, LogOut, Settings, Bell, BookOpen, Monitor, ShieldCheck, Wifi, WifiOff } from "lucide-react";
import { MobileSidebar } from "./mobile-sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  plan: string;
  logoUrl?: string;
  storeName?: string;
}

export function Header({ userEmail, isSuperAdmin, plan, logoUrl, storeName }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();
  const [isBridgeOnline, setIsBridgeOnline] = useState(false);

  useEffect(() => {
    const checkBridge = async () => {
      try {
        const res = await fetch('http://localhost:8000/api/printers', { signal: AbortSignal.timeout(2000) });
        const data = await res.json();
        setIsBridgeOnline(data.status === 'success');
      } catch (err) {
        setIsBridgeOnline(false);
      }
    };
    checkBridge();
    const timer = setInterval(checkBridge, 5000);
    return () => clearInterval(timer);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("안전하게 로그아웃 되었습니다.");
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Mobile Sidebar Toggle */}
        <MobileSidebar isSuperAdmin={isSuperAdmin} plan={plan} logoUrl={logoUrl} storeName={storeName} />
        {storeName && !isSuperAdmin && (
          <div className="flex items-center gap-2 md:gap-3">
            <span className="h-4 w-[1px] bg-slate-200 dark:bg-slate-700 mx-1 block"></span>
            {logoUrl && (
              <img src={logoUrl} alt="Logo" className="h-6 md:h-7 w-auto object-contain" />
            )}
            <h1 className="text-xs md:text-sm font-bold text-slate-800 dark:text-slate-100 max-w-[120px] md:max-w-none truncate">
              {storeName}
            </h1>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* Bridge Status Indicator (v25.0) */}
        <div 
          onClick={() => router.push('/dashboard/printer')}
          className={cn(
            "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800",
            isBridgeOnline 
              ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400" 
              : "bg-slate-100 border-slate-200 text-slate-500 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-500"
          )}
        >
          <div className={cn(
            "w-2 h-2 rounded-full",
            isBridgeOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-slate-400"
          )} />
          <span className="text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5">
            {isBridgeOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
            Live Agent v25.0
          </span>
          <span className="h-3 w-[1px] bg-slate-300 dark:bg-slate-700 mx-1"></span>
          <span className="text-[10px] font-medium opacity-80">
            {isSuperAdmin ? 'HQ ADMIN' : plan.toUpperCase()}
          </span>
        </div>

        {/* HQ Manual Button - Only for Super Admins */}
        {isSuperAdmin && (
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            onClick={() => router.push("/dashboard/admin/manual")}
            title="본사 직무 매뉴얼"
          >
            <BookOpen className="h-5 w-5" />
          </Button>
        )}

        {/* Notification Bell */}
        <Button variant="ghost" size="icon" className="relative text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">
          <Bell className="h-5 w-5" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500"></span>
        </Button>

        {/* User Dropdown Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-2 ring-slate-100 dark:ring-slate-800 transition-all focus:ring-blue-500 outline-none hover:bg-slate-100 dark:hover:bg-slate-800">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 text-white font-normal text-xs ring-1 ring-white dark:ring-slate-900">
                {userEmail.substring(0,2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 mt-2">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-normal leading-none text-slate-900 dark:text-white">{isSuperAdmin ? '관리자' : '구독 파트너'}</p>
                  <p className="text-xs leading-none text-slate-500 dark:text-slate-400 truncate">
                    {userEmail}
                  </p>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer">
              <User className="mr-2 h-4 w-4 text-slate-400" />
              <span>내 프로필</span>
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="cursor-pointer" 
              onClick={() => router.push("/dashboard/settings")}
            >
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
