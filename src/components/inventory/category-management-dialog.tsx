"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Plus, 
  Trash2, 
  GripVertical, 
  Settings2, 
  ChevronRight,
  FolderOpen,
  FolderTree
} from 'lucide-react';
import { CategoryData, useSettings, DEFAULT_MATERIAL_CATEGORIES } from '@/hooks/use-settings';
import { CategoryManagerCard } from '@/components/settings/category-manager-card';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import Link from 'next/link';

interface CategoryManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CategoryManagementDialog({ open, onOpenChange }: CategoryManagementDialogProps) {
  const { materialCategories, updateMaterialCategories, loading } = useSettings();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/20 rounded-2xl text-primary border border-primary/20 backdrop-blur-sm">
                <FolderTree className="w-6 h-6" />
              </div>
              <DialogHeader className="p-0">
                <DialogTitle className="text-2xl font-black text-white tracking-tight">
                  자재 카테고리 설정
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium">
                  시스템 전반에서 사용되는 자재 분류 체계를 관리합니다.
                </DialogDescription>
              </DialogHeader>
            </div>
            <Link href="/dashboard/settings/categories">
              <Button variant="outline" size="sm" className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white rounded-xl transition-all">
                상세 설정 페이지 <ChevronRight className="ml-1 h-3 w-3" />
              </Button>
            </Link>
          </div>
        </div>

        <div className="p-8 bg-white">
          <CategoryManagerCard
            title="자재 분류 관리"
            description="재고 및 매뉴얼에서 공통으로 사용되는 자재 카테고리입니다."
            icon={FolderOpen}
            initialData={materialCategories}
            defaultData={DEFAULT_MATERIAL_CATEGORIES}
            onSave={async (data) => {
              await updateMaterialCategories(data);
              onOpenChange(false);
            }}
            colorScheme="blue"
            isLoading={loading}
          />
        </div>

        <div className="px-8 py-4 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
          <p className="text-[11px] text-slate-400 font-medium">
            * 여기서 변경한 사항은 환경설정 및 매입 등록 시스템에 즉시 반영됩니다.
          </p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => onOpenChange(false)}
            className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg text-xs"
          >
            대화상자 닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Helper Badge component since it might not be exported from ui/badge in the same way
function Badge({ children, className, variant }: { children: React.ReactNode, className?: string, variant?: 'outline' | 'default' }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
      variant === 'outline' ? 'border border-slate-200 text-slate-950' : 'bg-slate-900 text-slate-50 hover:bg-slate-900/80'
    } ${className}`}>
      {children}
    </span>
  );
}
