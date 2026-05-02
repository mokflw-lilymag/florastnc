"use client";
import { getMessages } from "@/i18n/getMessages";

import { ScrollText, Plus, Bell, Eye, Edit, Trash2, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { AccessDenied } from "@/components/access-denied";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

export default function AnnouncementsPage() {
  const { profile, isLoading } = useAuth();
  const locale = usePreferredLocale();
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);  const isSuperAdmin = profile?.role === 'super_admin';

  if (isLoading) return null;

  if (!isSuperAdmin) {
    return <AccessDenied requiredTier="System Admin" />;
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title={tf.f00996} 
        description={tf.f01199} 
        icon={ScrollText}
      >
        <Button className="bg-slate-900 dark:bg-slate-100 dark:text-slate-900">
          <Plus className="h-4 w-4 mr-2" /> {tf.f01372}
        </Button>
      </PageHeader>

      <div className="space-y-4">
        <Card className="hover:border-blue-200 transition-colors">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="bg-orange-500">{tf.f01890}</Badge>
                <span className="text-xs text-slate-500">2024.03.20</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <CardTitle className="text-lg mt-2">{tf.f01484}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {tf.f01398}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{tf.f00525}</Badge>
                <span className="text-xs text-slate-500">2024.03.18</span>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8"><Edit className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500"><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
            <CardTitle className="text-lg mt-2">{tf.f01133}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0">
             <p className="text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
              {tf.f01323}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col items-center justify-center p-20 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border-2 border-dashed gap-4">
         <Megaphone className="h-10 w-10 text-slate-300" />
         <div className="text-center">
            <h3 className="font-semibold text-slate-600">{tf.f01084}</h3>
            <p className="text-sm text-slate-400">{tf.f01113}</p>
         </div>
      </div>
    </div>
  );
}
