"use client";

import React, { useState, useEffect, useRef } from "react";
import { Printer, RefreshCw, Save, ArrowLeft, MoreHorizontal, Settings, Target } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Order } from "@/types/order";
import { FontSelector } from "../../components/font-selector";
import { Separator } from "@/components/ui/separator";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";

interface RibbonPrintLayoutProps {
    order: Order;
    initialContent?: string;
    initialSender?: string;
}

export function RibbonPrintLayout({ order, initialContent, initialSender }: RibbonPrintLayoutProps) {
    const router = useRouter();
    const locale = usePreferredLocale();
    const isKo = toBaseLocale(locale) === "ko";
    const tr = (koText: string, enText: string) => (isKo ? koText : enText);
    const [content, setContent] = useState(initialContent || "");
    const [sender, setSender] = useState(initialSender || "");
    
    const [fontSize, setFontSize] = useState(60);
    const [fontFamily, setFontFamily] = useState("Noto Sans KR");
    const [ribbonWidth, setRibbonWidth] = useState("70mm"); // 7cm (Standard Garden Ribbon)
    const [isVertical, setIsVertical] = useState(true);
    const [textAlign, setTextAlign] = useState<"center" | "left" | "right">("center");

    // Initialize from order if not provided
    useEffect(() => {
        if (!initialContent && order.message?.content) {
            const fullContent = order.message.content;
            if (fullContent.includes(' / ')) {
                const parts = fullContent.split(' / ');
                setContent(parts[0] || "");
                setSender(parts.slice(1).join(' / ') || "");
            } else {
                setContent(fullContent);
                setSender(order.orderer?.name || "");
            }
        }
    }, [order, initialContent]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
            {/* Control Bar - Hidden when printing */}
            <div className="bg-white border-b p-4 print:hidden shrink-0">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" onClick={() => router.back()} className="rounded-xl">
                            <ArrowLeft className="w-4 h-4 mr-2" /> {tr("돌아가기", "Back")}
                        </Button>
                        <Separator orientation="vertical" className="h-6" />
                        <div>
                            <h1 className="text-lg font-bold text-slate-900">{tr("리본 출력 설정", "Ribbon Print Settings")}</h1>
                            <p className="text-xs text-slate-500 font-light">{tr("주문번호", "Order No")}: {order.order_number}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                         <Button variant="outline" className="rounded-xl font-light h-10 border-gray-200">
                            <Settings className="w-4 h-4 mr-2" /> {tr("상세설정", "Advanced")}
                         </Button>
                         <Button onClick={handlePrint} className="rounded-xl font-bold h-10 px-6 bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100">
                             <Printer className="w-4 h-4 mr-2" /> {tr("바로 인쇄하기", "Print Now")}
                         </Button>
                    </div>
                </div>
            </div>

            {/* Main Workspace */}
            <div className="flex-1 flex overflow-hidden min-h-0">
                {/* Configuration Area */}
                <div className="w-96 bg-white border-r overflow-y-auto p-6 space-y-8 select-none print:hidden">
                    <div className="space-y-4">
                        <Label className="text-sm font-bold text-slate-900 uppercase">{tr("1. 문구 설정", "1. Content")}</Label>
                        <div className="space-y-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-600">{tr("축하/근조 문구 (오른쪽/메인)", "Main text (right)")}</Label>
                                <Input 
                                    value={content} 
                                    onChange={(e) => setContent(e.target.value)} 
                                    translate="no"
                                    className="h-11 rounded-xl bg-white border-none shadow-sm font-medium notranslate"
                                    placeholder={tr("예: 축발전, 삼가 故人의...", "e.g. Congratulations...")}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-600">{tr("보내는 분 (왼쪽/서브)", "Sender (left)")}</Label>
                                <Input 
                                    value={sender} 
                                    onChange={(e) => setSender(e.target.value)} 
                                    translate="no"
                                    className="h-11 rounded-xl bg-white border-none shadow-sm font-medium notranslate"
                                    placeholder={tr("예: (주)릴리맥 임직원 일동", "e.g. Team Floxync")}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-sm font-bold text-slate-900 uppercase">{tr("2. 스타일 설정", "2. Style")}</Label>
                        <div className="grid grid-cols-1 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-slate-600">{tr("폰트 종류", "Font")}</Label>
                                <FontSelector value={fontFamily} onValueChange={setFontFamily} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-600">{tr("폰트 크기", "Font Size")}</Label>
                                    <Input 
                                        type="number" 
                                        value={fontSize} 
                                        onChange={(e) => setFontSize(Number(e.target.value))} 
                                        className="h-11 rounded-xl"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-600">{tr("리본 폭 (width)", "Ribbon Width")}</Label>
                                    <Select value={ribbonWidth} onValueChange={(val) => val && setRibbonWidth(val)}>
                                        <SelectTrigger className="h-11 rounded-xl">
                                            <SelectValue placeholder={tr("폭 선택", "Select width")} />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="38mm">38mm ({tr("소형", "Small")})</SelectItem>
                                            <SelectItem value="70mm">70mm ({tr("중형", "Medium")})</SelectItem>
                                            <SelectItem value="100mm">100mm ({tr("대형", "Large")})</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-sm font-bold text-slate-900 uppercase">{tr("3. 정렬 및 옵션", "3. Alignment")}</Label>
                        <div className="flex gap-2">
                             <Button 
                                variant={textAlign === 'left' ? 'default' : 'outline'} 
                                onClick={() => setTextAlign('left')}
                                className="flex-1 rounded-xl"
                             >{tr("상단", "Top")}</Button>
                             <Button 
                                variant={textAlign === 'center' ? 'default' : 'outline'} 
                                onClick={() => setTextAlign('center')}
                                className="flex-1 rounded-xl"
                             >{tr("중앙", "Center")}</Button>
                             <Button 
                                variant={textAlign === 'right' ? 'default' : 'outline'} 
                                onClick={() => setTextAlign('right')}
                                className="flex-1 rounded-xl"
                             >{tr("하단", "Bottom")}</Button>
                        </div>
                    </div>
                </div>

                {/* Preview Area */}
                <div className="flex-1 p-10 overflow-auto bg-slate-100 flex justify-center items-start print:p-0 print:bg-white print:overflow-visible">
                     <style jsx global>{`
                        @media print {
                            body * {
                                visibility: hidden;
                            }
                            #ribbon-printable, #ribbon-printable * {
                                visibility: visible;
                            }
                            #ribbon-printable {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100%;
                            }
                            @page {
                                size: auto;
                                margin: 0mm;
                            }
                        }
                     `}</style>
                     
                     <div id="ribbon-printable" className="flex gap-8 print:gap-0 print:flex-col">
                        {/* Right Ribbon (Content) */}
                        <div 
                           className="bg-[#f8fafc] shadow-xl ring-1 ring-slate-200/90 print:shadow-none print:ring-0 flex items-center justify-center p-4 min-h-[500px]"
                           style={{ width: ribbonWidth, fontFamily }}
                        >
                            <div 
                                className="writing-vertical-rl text-center font-semibold text-slate-950 tracking-[0.18em] notranslate antialiased [text-shadow:_0_1px_0_rgb(255_255_255_/_0.8)] print:text-black print:[text-shadow:none]"
                                style={{ fontSize: `${fontSize}pt` }}
                                translate="no"
                            >
                                {content}
                            </div>
                        </div>

                        {/* Left Ribbon (Sender) */}
                        <div 
                           className="bg-[#f8fafc] shadow-xl ring-1 ring-slate-200/90 print:shadow-none print:ring-0 flex items-center justify-center p-4 min-h-[500px]"
                           style={{ width: ribbonWidth, fontFamily }}
                        >
                            <div 
                                className="writing-vertical-rl text-center font-semibold text-slate-950 tracking-[0.18em] notranslate antialiased [text-shadow:_0_1px_0_rgb(255_255_255_/_0.8)] print:text-black print:[text-shadow:none]"
                                style={{ fontSize: `${fontSize}pt` }}
                                translate="no"
                            >
                                {sender}
                            </div>
                        </div>
                     </div>
                </div>
            </div>
        </div>
    );
}
