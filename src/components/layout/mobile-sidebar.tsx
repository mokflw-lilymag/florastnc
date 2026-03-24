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
  logoUrl?: string;
  storeName?: string;
}

export function MobileSidebar({ isSuperAdmin, plan, logoUrl, storeName }: MobileSidebarProps) {
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
            <Sidebar isSuperAdmin={isSuperAdmin} plan={plan} logoUrl={logoUrl} storeName={storeName} />
         </div>
      </SheetContent>
    </Sheet>
  );
}
