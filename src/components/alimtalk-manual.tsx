"use client";

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { HelpCircle, ExternalLink, Key, Layout, MessageSquare, CheckCircle2 } from "lucide-react";

export function AlimtalkManual() {
    return (
        <Dialog>
            <DialogTrigger render={<Button variant="outline" size="sm" className="h-8 gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200" />}>
                    <HelpCircle className="w-4 h-4" />
                    연동 매뉴얼 확인
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                        <MessageSquare className="w-6 h-6 text-yellow-500" />
                        카카오 알림톡 자동 발송 연동 가이드
                    </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-8 py-4">
                    {/* 1단계: 솔라피 가입 */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">1</span>
                            솔라피(Solapi) 가입 및 로그인
                        </div>
                        <div className="pl-8 space-y-2">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                알림톡 발송 대행 서비스인 <a href="https://solapi.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline font-medium inline-flex items-center gap-0.5">솔라피(Solapi)<ExternalLink className="w-3 h-3" /></a>에 접속하여 회원가입 후 로그인해 주세요.
                            </p>
                        </div>
                    </section>

                    {/* 2단계: 카카오 채널 등록 */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">2</span>
                            카카오 비즈니스 채널 연동 (PFID 발급)
                        </div>
                        <div className="pl-8 space-y-2">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                [발송번호 관리] &gt; [카카오 알림톡] 메뉴에서 운영 중이신 카카오톡 비즈니스 채널을 등록합니다.
                            </p>
                            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-xs text-amber-800">
                                <strong>중요:</strong> 연동 후 발급되는 <strong>발신 프로필 ID (PFID)</strong>를 복사하여 ERP 설정의 [발신 프로필 ID] 칸에 입력하세요. (PF_로 시작함)
                            </div>
                        </div>
                    </section>

                    {/* 3단계: API Key 발급 */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">3</span>
                            API Key 발급 및 복사
                        </div>
                        <div className="pl-8 space-y-2 text-sm text-slate-600">
                            <p>[설정] &gt; [API Key 관리]에서 새 API Key를 생성합니다.</p>
                            <div className="grid grid-cols-1 gap-2 mt-2">
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                                    <Key className="w-4 h-4 text-slate-400" />
                                    <span className="font-semibold text-slate-700">API Key:</span>
                                    <span className="text-slate-500">ERP의 [API 키] 필드에 입력</span>
                                </div>
                                <div className="flex items-center gap-2 bg-slate-50 p-2 rounded border border-slate-200">
                                    <Key className="w-4 h-4 text-slate-400" />
                                    <span className="font-semibold text-slate-700 text-xs">API Secret:</span>
                                    <span className="text-slate-500">ERP의 [API 시크릿] 필드에 입력</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* 4단계: 템플릿 등록 */}
                    <section className="space-y-3">
                        <div className="flex items-center gap-2 text-lg font-bold text-slate-800">
                            <span className="bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-sm">4</span>
                            알림톡 템플릿 등록 및 승인
                        </div>
                        <div className="pl-8 space-y-3">
                            <p className="text-sm text-slate-600 leading-relaxed">
                                [템플릿 관리]에서 아래 <strong>변수</strong>가 포함된 템플릿을 신청하고 카카오의 최종 승인을 받으세요.
                            </p>
                            <div className="bg-slate-900 rounded-lg p-5 font-mono text-[13px] leading-relaxed text-slate-200 border-l-4 border-blue-500 shadow-md">
                                <p className="mb-3 text-slate-400 font-sans font-bold text-[11px] uppercase tracking-wider">[템플릿 등록 예시]</p>
                                <p className="text-white">안녕하세요 <span className="text-blue-400">{"#{customerName}"}</span>님!</p>
                                <p className="mt-2 text-white">주문하신 상품의 배송이 완료되었습니다. 플라워싱크를 이용해 주셔서 감사합니다.</p>
                                <p className="mt-4 text-slate-400 text-xs">■ 배송지: <span className="text-white">{"#{address}"}</span></p>
                                <p className="mt-4 text-white">아래 링크를 클릭하시면 배송 완료 사진과 기사님 정보를 확인하실 수 있습니다.</p>
                                <p className="mt-2 text-blue-400 font-bold decoration-blue-400/30 underline underline-offset-4">{"#{statusUrl}"}</p>
                            </div>
                            <div className="flex items-start gap-2 py-3 px-4 bg-green-50 border border-green-100 rounded-lg text-[13px] font-medium text-green-700">
                                <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 shrink-0" />
                                <span>템플릿 승인 완료 후 발급되는 <strong>[템플릿 ID]</strong>를 ERP에 등록하면 연동이 즉시 완료됩니다!</span>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="flex justify-end pt-4 border-t sticky bottom-0 bg-white pb-2 mt-4">
                    <Button onClick={() => document.querySelector('button[aria-label="Close"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }))}>
                        확인 완료
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
