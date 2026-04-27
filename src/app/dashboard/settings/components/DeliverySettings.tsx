"use client";

import { MapPin, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

interface DeliverySettingsProps {
  settings: any;
  saveSettings: (settings: any) => void;
  regionFees: any[];
  addFee: (region_name: string, fee: number) => void;
  deleteFee: (id: string) => void;
  updateFee: (id: string, fee: number) => void;
  importFees: (fees: any[]) => void;
}

export function DeliverySettings({
  settings,
  saveSettings,
  regionFees,
  addFee,
  deleteFee,
  updateFee,
  importFees
}: DeliverySettingsProps) {
  const locale = usePreferredLocale();
  const isKo = toBaseLocale(locale) === "ko";
  const tr = (ko: string, en: string) => (isKo ? ko : en);
  const [newRegion, setNewRegion] = useState("");
  const [newFee, setNewFee] = useState("");

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200">
      <CardHeader>
        <CardTitle>{tr("배송 정책", "Delivery Policy")}</CardTitle>
        <CardDescription>{tr("화원 위치와 거리에 따른 배송비 규칙을 정합니다.", "Configure delivery fee rules by location and distance.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="default-fee">{tr("기본 배송비", "Default Delivery Fee")}</Label>
            <div className="flex items-center gap-3">
              <Input 
                id="default-fee" 
                type="number"
                value={settings.defaultDeliveryFee} 
                onChange={(e) => saveSettings({ ...settings, defaultDeliveryFee: parseInt(e.target.value) || 0 })}
              />
              <span className="font-medium text-slate-400">₩</span>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="free-thresh">{tr("무료 배송 임계값", "Free Delivery Threshold")}</Label>
            <div className="flex items-center gap-3">
              <Input 
                id="free-thresh" 
                type="number"
                value={settings.freeDeliveryThreshold}
                onChange={(e) => saveSettings({...settings, freeDeliveryThreshold: parseInt(e.target.value) || 0})}
              />
              <span className="font-medium text-slate-400">₩</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
             <div className="space-y-1">
                <Label className="text-sm font-bold">{tr("지역별 추가 배송비", "Additional Fee by Region")}</Label>
                <p className="text-xs text-slate-400">{tr("구역별로 다른 비용이 발생할 시 설정하세요.", "Set this when delivery fee varies by region.")}</p>
             </div>
             {regionFees.length === 0 && settings.districtDeliveryFees && settings.districtDeliveryFees.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  onClick={() => importFees(settings.districtDeliveryFees)}
                >
                  {tr("광화문점 기준 배송비 자동 적용하기", "Apply sample fees preset")}
                </Button>
             )}
          </div>
          <div className="border rounded-xl text-sm bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b p-4 space-y-3 sticky top-0 z-20">
              <div className="flex items-end gap-3">
                <div className="grid gap-1.5 flex-1">
                  <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{tr("새 지역 등록", "Add Region")}</Label>
                  <Input 
                    placeholder={tr("지역명 (예: 강남구, 서초동)", "Region name (e.g. Downtown, West District)")} 
                    value={newRegion} 
                    onChange={e => setNewRegion(e.target.value)}
                    className="h-9 bg-white"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRegion && newFee) {
                        addFee(newRegion, parseInt(newFee));
                        setNewRegion("");
                        setNewFee("");
                      }
                    }}
                  />
                </div>
                <div className="grid gap-1.5 w-32">
                  <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{tr("배송비", "Delivery Fee")}</Label>
                  <Input 
                    type="number" 
                    placeholder="10000" 
                    value={newFee}
                    onChange={e => setNewFee(e.target.value)}
                    className="h-9 bg-white"
                  />
                </div>
                <Button 
                  size="sm"
                  onClick={() => {
                    if (!newRegion || !newFee) return;
                    addFee(newRegion, parseInt(newFee));
                    setNewRegion("");
                    setNewFee("");
                  }} 
                  className="h-9 bg-slate-900 text-slate-50 px-4"
                >
                  <Plus className="h-4 w-4 mr-1" /> {tr("추가", "Add")}
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2">
                 <div className="text-[11px] text-slate-400 font-medium">
                   {tr("등록된 지역", "Registered regions")}: <span className="text-slate-900 font-bold">{regionFees.length}</span>{tr("개", "")}
                 </div>
                 <div className="flex items-center gap-4 text-slate-500 font-semibold flex-1 justify-end">
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px', width: '100%', maxWidth: '400px' }}>
                     <div className="px-4 text-[10px] uppercase font-bold text-slate-400">{tr("지역/구역", "Region")}</div>
                     <div className="text-right text-[10px] uppercase font-bold text-slate-400 pr-8">{tr("배송비", "Fee")}</div>
                     <div className="text-center text-[10px] uppercase font-bold text-slate-400">{tr("관리", "Action")}</div>
                   </div>
                 </div>
              </div>
            </div>
            <div className="max-h-[500px] overflow-y-auto no-scrollbar">
              <table className="w-full text-left border-collapse table-fixed">
                <tbody className="divide-y divide-slate-100">
                  {regionFees.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-20 text-center text-slate-400 bg-slate-50/20">
                        <MapPin className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p>{tr("등록된 지역별 배송비가 없습니다.", "No region-specific delivery fees yet.")}</p>
                      </td>
                    </tr>
                  ) : regionFees.map(fee => (
                    <tr key={fee.id} className="hover:bg-blue-50/30 transition-colors group" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px' }}>
                      <td className="px-4 py-2 flex items-center font-medium text-slate-600 truncate">{fee.region_name}</td>
                      <td className="px-4 py-2 text-right">
                        <div className="relative inline-block w-full">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 text-xs">₩</span>
                          <Input 
                            type="number" 
                            defaultValue={fee.fee}
                            className="h-8 py-1 pl-6 pr-2 text-right font-semibold border-transparent group-hover:border-slate-200 focus:border-indigo-500 bg-transparent group-hover:bg-white transition-all tabular-nums"
                            onBlur={(e) => {
                               const newVal = parseInt(e.target.value);
                               if (newVal !== fee.fee) {
                                  updateFee(fee.id, newVal);
                               }
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-2 flex items-center justify-center">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-40 group-hover:opacity-100 transition-opacity" onClick={() => deleteFee(fee.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
