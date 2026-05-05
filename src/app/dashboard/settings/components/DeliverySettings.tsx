"use client";
import { getMessages } from "@/i18n/getMessages";

import { MapPin, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

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
  const tf = getMessages(locale).tenantFlows;
  const baseLocale = toBaseLocale(locale);
  const phRegionFee = pickUiText(
    baseLocale,
    "예: 10000",
    "e.g. 10000",
    "VD: 10000",
    "例: 10000",
    "例如：10000",
    "Ej.: 10000",
    "Ex.: 10000",
    "Ex. : 10000",
    "z. B. 10000",
    "Напр.: 10000",
  );
  const [newRegion, setNewRegion] = useState("");
  const [newFee, setNewFee] = useState("");

  return (
    <Card className="border-0 shadow-sm ring-1 ring-slate-200">
      <CardHeader>
        <CardTitle>{tf.f01236}</CardTitle>
        <CardDescription>{tf.f02209}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="default-fee">{tf.f01006}</Label>
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
            <Label htmlFor="free-thresh">{tf.f01207}</Label>
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
                <Label className="text-sm font-bold">{tf.f01905}</Label>
                <p className="text-xs text-slate-400">{tf.f00990}</p>
             </div>
             {regionFees.length === 0 && settings.districtDeliveryFees && settings.districtDeliveryFees.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                  onClick={() => importFees(settings.districtDeliveryFees)}
                >
                  {tf.f00969}
                </Button>
             )}
          </div>
          <div className="border rounded-xl text-sm bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-50 border-b p-4 space-y-3 sticky top-0 z-20">
              <div className="flex items-end gap-3">
                <div className="grid gap-1.5 flex-1">
                  <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{tf.f01380}</Label>
                  <Input 
                    placeholder={tf.f01904} 
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
                  <Label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{tf.f00259}</Label>
                  <Input 
                    type="number" 
                    placeholder={phRegionFee}
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
                  <Plus className="h-4 w-4 mr-1" /> {tf.f00697}
                </Button>
              </div>

              <div className="flex items-center justify-between pt-2">
                 <div className="text-[11px] text-slate-400 font-medium">
                   {tf.f01118}: <span className="text-slate-900 font-bold">{regionFees.length}</span>{tf.f00025}
                 </div>
                 <div className="flex items-center gap-4 text-slate-500 font-semibold flex-1 justify-end">
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 80px', width: '100%', maxWidth: '400px' }}>
                     <div className="px-4 text-[10px] uppercase font-bold text-slate-400">{tf.f01903}</div>
                     <div className="text-right text-[10px] uppercase font-bold text-slate-400 pr-8">{tf.f00259}</div>
                     <div className="text-center text-[10px] uppercase font-bold text-slate-400">{tf.f00087}</div>
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
                        <p>{tf.f01119}</p>
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
