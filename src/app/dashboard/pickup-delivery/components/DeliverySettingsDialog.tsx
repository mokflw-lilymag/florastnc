"use client";

import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Edit2, Check, X, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Branch } from "@/hooks/use-branches";
import { AlimtalkManual } from "@/components/alimtalk-manual";

interface DeliverySettingsDialogProps {
    branch: Branch | null;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (branchId: string, updatedBranch: Partial<Branch>) => Promise<void>;
}

export function DeliverySettingsDialog({ branch, isOpen, onOpenChange, onSave }: DeliverySettingsDialogProps) {
      const [editingFees, setEditingFees] = useState<Array<{ district: string, fee: number }>>([]);
    const [surcharges, setSurcharges] = useState<{ mediumItem: number, largeItem: number, express: number }>({ mediumItem: 0, largeItem: 0, express: 0 });
    const [alimtalkConfig, setAlimtalkConfig] = useState({
        apiKey: '',
        apiSecret: '',
        pfid: '',
        templateId: ''
    });

    const [newDistrict, setNewDistrict] = useState('');
    const [newFee, setNewFee] = useState('');

    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingDistrict, setEditingDistrict] = useState('');
    const [editingFee, setEditingFee] = useState('');

    useEffect(() => {
        if (branch) {
            setEditingFees(branch.deliveryFees || []);
            setSurcharges({
                mediumItem: branch.surcharges?.mediumItem || 0,
                largeItem: branch.surcharges?.largeItem || 0,
                express: branch.surcharges?.express || 0
            });
            setAlimtalkConfig(branch.alimtalkConfig || {
                apiKey: '',
                apiSecret: '',
                pfid: '',
                templateId: ''
            });
        }
    }, [branch]);

    const handleAddFee = () => {
        if (!newDistrict.trim() || !newFee.trim()) return;
        const fee = parseInt(newFee);
        if (isNaN(fee)) return;
        setEditingFees(prev => [...prev, { district: newDistrict.trim(), fee }]);
        setNewDistrict('');
        setNewFee('');
    };

    const handleRemoveFee = (index: number) => {
        setEditingFees(prev => prev.filter((_, i) => i !== index));
    };

    const handleStartEdit = (index: number, district: string, fee: number) => {
        setEditingIndex(index);
        setEditingDistrict(district);
        setEditingFee(fee.toString());
    };

    const handleSaveEdit = () => {
        if (editingIndex === null || !editingDistrict.trim() || !editingFee.trim()) return;
        const fee = parseInt(editingFee);
        if (isNaN(fee)) return;

        setEditingFees(prev => prev.map((item, index) =>
            index === editingIndex ? { district: editingDistrict.trim(), fee } : item
        ));
        setEditingIndex(null);
    };

    const handleSaveAll = async () => {
        if (!branch) return;
        try {
            await onSave(branch.id, {
                deliveryFees: editingFees,
                surcharges: surcharges,
                alimtalkConfig: alimtalkConfig
            });
            onOpenChange(false);
        } catch (error) {
            toast.error('설정 저장 중 오류가 발생했습니다.');
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{branch?.name} 지점 설정</DialogTitle>
                    <DialogDescription>배송 요금과 카카오 알림톡 발송 설정을 관리합니다.</DialogDescription>
                </DialogHeader>

                <div className="space-y-8 py-4">
                    {/* 카카오 알림톡 설정 */}
                    <div className="space-y-4 pb-6 border-b">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold flex items-center gap-2 text-slate-800">
                                <MessageSquare className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                                카카오 알림톡 자동 발송 설정
                            </h3>
                            <AlimtalkManual />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 ml-1">Solapi API Key</Label>
                                <Input 
                                    placeholder="발급받은 API Key" 
                                    className="bg-slate-50 border-slate-200"
                                    value={alimtalkConfig.apiKey} 
                                    onChange={(e) => setAlimtalkConfig({...alimtalkConfig, apiKey: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 ml-1">Solapi API Secret</Label>
                                <Input 
                                    type="password"
                                    placeholder="발급받은 API Secret" 
                                    className="bg-slate-50 border-slate-200 font-mono"
                                    value={alimtalkConfig.apiSecret} 
                                    onChange={(e) => setAlimtalkConfig({...alimtalkConfig, apiSecret: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 ml-1">발신 프로필 ID (PFID)</Label>
                                <Input 
                                    placeholder="PF_로 시작하는 고유 ID" 
                                    className="bg-slate-50 border-slate-200"
                                    value={alimtalkConfig.pfid} 
                                    onChange={(e) => setAlimtalkConfig({...alimtalkConfig, pfid: e.target.value})}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs text-slate-500 ml-1">승인된 템플릿 ID</Label>
                                <Input 
                                    placeholder="승인받은 알림톡 템플릿 코드" 
                                    className="bg-slate-50 border-slate-200"
                                    value={alimtalkConfig.templateId} 
                                    onChange={(e) => setAlimtalkConfig({...alimtalkConfig, templateId: e.target.value})}
                                />
                            </div>
                        </div>
                        <p className="text-[11px] text-slate-400 bg-slate-50 p-2 rounded leading-relaxed border border-dashed border-slate-200">
                            * 지점별로 각자 솔라피(Solapi) 계정을 발급받아 연동해 주세요. 연결 시 배송 전송 정보를 설정한 템플릿에 맞게 자동 발급합니다.
                        </p>
                    </div>

                    {/* 품목별 추가 요금 */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold border-b pb-2">기본 품목/환경 옵션 추가 요금</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>중품 추가 요금</Label>
                                <Input
                                    type="number"
                                    value={surcharges.mediumItem}
                                    onChange={(e) => setSurcharges({ ...surcharges, mediumItem: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>대품 추가 요금</Label>
                                <Input
                                    type="number"
                                    value={surcharges.largeItem}
                                    onChange={(e) => setSurcharges({ ...surcharges, largeItem: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>급행 추가 요금</Label>
                                <Input
                                    type="number"
                                    value={surcharges.express}
                                    onChange={(e) => setSurcharges({ ...surcharges, express: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 지역별 배송비 */}
                    <div className="space-y-4">
                        <h3 className="text-sm font-semibold border-b pb-2">기본 배송비 (지역구/동 별)</h3>

                        <div className="flex gap-2">
                            <Input
                                placeholder="지역명 (예: 강남구)"
                                value={newDistrict}
                                onChange={(e) => setNewDistrict(e.target.value)}
                                className="flex-1"
                            />
                            <Input
                                type="number"
                                placeholder="금액"
                                value={newFee}
                                onChange={(e) => setNewFee(e.target.value)}
                                className="w-32"
                            />
                            <Button onClick={handleAddFee} size="icon"><Plus className="w-4 h-4" /></Button>
                        </div>

                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>지역구/동</TableHead>
                                        <TableHead>배송비</TableHead>
                                        <TableHead className="w-[100px] text-right">관리</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {editingFees.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={3} className="text-center text-muted-foreground py-4">등록된 지역이 없습니다.</TableCell>
                                        </TableRow>
                                    ) : (
                                        editingFees.map((item, index) => (
                                            <TableRow key={index}>
                                                <TableCell>
                                                    {editingIndex === index ? (
                                                        <Input value={editingDistrict} onChange={(e) => setEditingDistrict(e.target.value)} />
                                                    ) : (
                                                        item.district
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {editingIndex === index ? (
                                                        <Input type="number" value={editingFee} onChange={(e) => setEditingFee(e.target.value)} />
                                                    ) : (
                                                        `₩${item.fee.toLocaleString()}`
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {editingIndex === index ? (
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" onClick={handleSaveEdit}><Check className="w-4 h-4 text-green-600" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => setEditingIndex(null)}><X className="w-4 h-4 text-red-600" /></Button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-end gap-1">
                                                            <Button variant="ghost" size="icon" onClick={() => handleStartEdit(index, item.district, item.fee)}><Edit2 className="w-4 h-4" /></Button>
                                                            <Button variant="ghost" size="icon" onClick={() => handleRemoveFee(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </div>

                <DialogFooter className="sticky bottom-0 bg-white pt-4 border-t mt-4 pb-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
                    <Button onClick={handleSaveAll} className="bg-blue-600 hover:bg-blue-700">설정 저장</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
