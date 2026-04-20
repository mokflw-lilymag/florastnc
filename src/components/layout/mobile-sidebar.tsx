"use client";
import React from 'react';
import { Sidebar } from './sidebar';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button, buttonVariants } from '@/components/ui/button';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileSidebarProps {
  isSuperAdmin: boolean;
  plan: string;
  isExpired?: boolean;
  isSuspended?: boolean;
  logoUrl?: string;
  storeName?: string;
  isOrgUser?: boolean;
  isOrgOnly?: boolean;
  hqMenuOnly?: boolean;
  showOrgBoardLink?: boolean;
  showBranchMaterialRequestLink?: boolean;
}

export function MobileSidebar({
  isSuperAdmin,
  plan,
  isExpired,
  isSuspended,
  logoUrl,
  storeName,
  isOrgUser = false,
  isOrgOnly = false,
  hqMenuOnly,
  showOrgBoardLink = false,
  showBranchMaterialRequestLink = false,
}: MobileSidebarProps) {
  return (
    <Sheet>
      <SheetTrigger className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "lg:hidden text-slate-500 hover:text-slate-900 border border-slate-200 shadow-sm rounded-xl"
        )}>
          <Menu className="h-5 w-5" />
          <span className="sr-only">메뉴 열기</span>
      </SheetTrigger>
      <SheetContent side="left" className="p-0 w-64 border-r-0">
         <SheetHeader className="sr-only">
           <SheetTitle>메뉴</SheetTitle>
         </SheetHeader>
         <div className="h-full">
            {/* We can directly render the Sidebar component here, 
                it already has the full menu logic */}
            <Sidebar 
              isSuperAdmin={isSuperAdmin} 
              plan={plan} 
              isExpired={isExpired}
              isSuspended={isSuspended}
              logoUrl={logoUrl} 
              storeName={storeName}
              isOrgUser={isOrgUser}
              isOrgOnly={isOrgOnly}
              hqMenuOnly={hqMenuOnly}
              showOrgBoardLink={showOrgBoardLink}
              showBranchMaterialRequestLink={showBranchMaterialRequestLink}
            />
         </div>
      </SheetContent>
    </Sheet>
  );
}
