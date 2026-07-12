"use client";
import { useCurrency } from "@/hooks/use-currency";
import { getMessages } from "@/i18n/getMessages";

import React from 'react';
import Image from 'next/image';

export interface OrderPrintData {
    orderNumber: string;
    orderDate: string;
    ordererName: string;
    ordererCompany?: string;
    ordererContact: string;
    items: string;
    totalAmount: number;
    deliveryFee: number;
    paymentMethod: string;
    paymentStatus: '미결' | '완결' | string;
    deliveryDate: string;
    recipientName: string;
    recipientContact: string;
    deliveryAddress: string;
    message: string;
    messageType: 'card' | 'ribbon';
    memo?: string;
    isAnonymous: boolean;
    shopInfo: {
        name: string;
        address: string;
        contact: string;
        account: string;
        email?: string;
        website?: string;
    };
    logoUrl?: string;
}

interface PrintableOrderProps {
    data: OrderPrintData | null;
    locale?: string;
    maskPersonalInfo?: boolean;
}

class PrintableOrderInner extends React.Component<PrintableOrderProps & {currencySymbol: string}> {
    render() {
        const { data, locale = "ko", maskPersonalInfo = true } = this.props;
        if (!data) return null;

        // 마스킹 함수 — isReceipt && maskPersonalInfo 일 때만 실제 마스킹 적용
        // (renderSection 내에서 shouldMask로 제어)
        const maskName = (name: string, shouldMask: boolean) => {
            if (!shouldMask) return name;
            if (!name) return '';
            return '***';
        };

        const maskPhone = (phone: string, shouldMask: boolean) => {
            if (!shouldMask) return phone;
            if (!phone) return '';
            // 한국 전화번호 정확 매칭: 010/011/016~019, 02, 031~099
            // 010-1234-5678 → 010-****-5678 (3자리 prefix만 노출)
            return phone.replace(
                /(01[016789]|0[2-9]\d{0,2})-?(\d{3,4})-?(\d{4})/,
                (_match, p1, _p2, p3) => `${p1}-****-${p3}`
            );
        };
        const tf = getMessages(locale).tenantFlows;
        const paymentMethodText = (() => {
            const m = data.paymentMethod;
            const map: Record<string, string> = {
                card: tf.f00704,
                cash: tf.f00769,
                transfer: tf.f00057,
                mainpay: tf.f00211,
                shopping_mall: tf.f00368,
                epay: tf.f02604,
                kakao: tf.f02604,
                apple: tf.f02604,
                unknown: "모름",
            };
            return map[m] || m;
        })();
        const Checkbox = ({ checked }: { checked: boolean }) => (
            <span style={{ 
                display: 'inline-block', 
                width: '14px', 
                height: '14px', 
                border: '1px solid black', 
                marginRight: '4px', 
                position: 'relative', 
                verticalAlign: 'middle' 
            }}>
                {checked && <span style={{ position: 'absolute', top: '-3px', left: '2px', fontSize: '14px' }}>✔</span>}
            </span>
        );

        const renderSection = (title: string, isReceipt: boolean) => {
            // 인수증(isReceipt=true)이고 마스킹 설정이 ON일 때만 마스킹 적용
            // 주문서(isReceipt=false)는 항상 원본 표시
            const shouldMask = isReceipt && maskPersonalInfo;

            return (
            <div className="mb-4">
                <div className="flex flex-col items-center mb-3">
                    {data.logoUrl && (
                        <div className="mb-2 max-h-16 flex items-center justify-center">
                            <img 
                                src={data.logoUrl} 
                                alt="Store Logo" 
                                className="h-14 w-auto object-contain" 
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                    {/* 제목: 매장명 제외, 자간 넓게, 좌우 spacer 균형으로 가운데 정렬 */}
                    <div className="flex items-center justify-center gap-4 w-full">
                        {/* 왼쪽 spacer — 항상 동일 너비로 가운데 균형 */}
                        <div style={{width: '90px', flexShrink: 0}} />
                        <h1
                            style={{ letterSpacing: '0.5em', fontWeight: 900, fontSize: '22px' }}
                            className="text-slate-900 flex-1 text-center"
                        >
                            {title}
                        </h1>
                        {/* 주문서에만 제작완료 체크박스, 인수증은 빈 spacer */}
                        {!isReceipt ? (
                            <div
                                className="flex items-center gap-1 text-[11px] font-bold"
                                style={{width: '90px', flexShrink: 0, whiteSpace: 'nowrap'}}
                            >
                                <Checkbox checked={false} />
                                <span>제작완료</span>
                            </div>
                        ) : (
                            <div style={{width: '90px', flexShrink: 0}} />
                        )}
                    </div>
                    {/* 주문번호 표기 */}
                    <div className="text-[11px] text-gray-500 mt-1 font-mono tracking-wide">
                        #{data.orderNumber}
                    </div>
                </div>
                <table className="w-full border-collapse border border-black text-sm">
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 font-bold w-[12%] text-center bg-slate-50/50 whitespace-nowrap">{tf.f00638}</td>
                            <td className="border border-black p-1 w-[20%]" style={{ fontSize: '11px' }}>
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis">{data.orderDate}</div>
                            </td>
                            <td className="border border-black p-1 font-bold w-[8%] text-center bg-slate-50/50 whitespace-nowrap">{tf.f00640}</td>
                            <td className="border border-black p-1 w-[28%]">
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[12px]">
                                    {(() => {
                                        if (data.isAnonymous && isReceipt) return '';
                                        const displayName = maskName(data.ordererName, shouldMask);
                                        return data.ordererCompany ? `${data.ordererCompany} / ${displayName}` : displayName;
                                    })()}
                                </div>
                            </td>
                            <td className="border border-black p-1 font-bold w-[8%] text-center bg-slate-50/50 whitespace-nowrap">{tf.f00444}</td>
                            <td className="border border-black p-1 w-[24%]" style={{ fontSize: '12px' }}>
                                {/* 인수증에서만 주문자 연락처 마스킹 */}
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis">{data.isAnonymous && isReceipt ? '' : maskPhone(data.ordererContact, shouldMask)}</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 font-bold align-middle h-8 text-center bg-slate-50/50 whitespace-nowrap">{tf.f00765}</td>
                            <td className="border border-black p-1 align-middle" colSpan={5}>
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[11px] leading-tight">
                                    {data.items}
                                </div>
                            </td>
                        </tr>
                        {!isReceipt && (
                            <tr>
                                <td className="border border-black p-1 font-bold text-center bg-slate-50/50">{tf.f02588}</td>
                                <td className="border border-black p-1" colSpan={5}>
                                    <div className="flex items-center justify-between text-[12px]">
                                        <span className="whitespace-nowrap overflow-hidden text-ellipsis">{tf.f02589} {(data.totalAmount || 0).toLocaleString()}</span>
                                        <span className="whitespace-nowrap overflow-hidden text-ellipsis">{tf.f02590} {(data.deliveryFee || 0).toLocaleString()}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="whitespace-nowrap overflow-hidden text-ellipsis">{tf.f02591} {paymentMethodText}</span>
                                            <div className="flex items-center gap-2 pr-2">
                                                <div className="flex items-center whitespace-nowrap"><Checkbox checked={data.paymentStatus === '미결' || data.paymentStatus === 'Pending'} /><span>{tf.f00217}</span></div>
                                                <div className="flex items-center whitespace-nowrap"><Checkbox checked={data.paymentStatus === '완결' || data.paymentStatus === 'Paid'} /><span>{tf.f00470}</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        <tr>
                            <td className="border border-black p-1 font-bold text-center bg-slate-50/50 whitespace-nowrap">{tf.f00274}</td>
                            <td className="border border-black p-1">
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[11px]">{data.deliveryDate}</div>
                            </td>
                            <td className="border border-black p-1 font-bold text-center bg-slate-50/50 whitespace-nowrap">{tf.f00228}</td>
                            <td className="border border-black p-1">
                                {/* 받으시는 분 이름 — 마스킹 없음 */}
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[12px]">{data.recipientName}</div>
                            </td>
                            <td className="border border-black p-1 font-bold text-center bg-slate-50/50 whitespace-nowrap">{tf.f00444}</td>
                            <td className="border border-black p-1">
                                {/* 인수증에서만 받는 분 연락처 마스킹 */}
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[12px]">{maskPhone(data.recipientContact, shouldMask)}</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 font-bold align-middle text-center bg-slate-50/50 h-8 whitespace-nowrap">{tf.f00277}</td>
                            <td colSpan={5} className="border border-black p-1 align-middle">
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[11px]">
                                    {data.deliveryAddress}
                                </div>
                            </td>
                        </tr>
                        {!isReceipt && (
                            <tr>
                                <td className="border border-black p-1 font-bold align-middle text-center bg-slate-50/50 h-8 whitespace-nowrap">
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                        <span>{tf.f00198}</span>
                                        <div className="flex items-center gap-1 mt-0.5 text-[9px] font-normal">
                                            <div className="flex items-center"><Checkbox checked={data.messageType === 'card'} /><span>{tf.f00207}</span></div>
                                            <div className="flex items-center"><Checkbox checked={data.messageType === 'ribbon'} /><span>{tf.f00179}</span></div>
                                        </div>
                                    </div>
                                </td>
                                <td colSpan={5} className="border border-black p-1 align-middle">
                                    <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[11px]">
                                        {data.message}
                                    </div>
                                </td>
                            </tr>
                        )}
                        {/* 주문서에만 요청사항 행 추가 */}
                        {!isReceipt && (
                            <tr>
                                <td className="border border-black p-1 font-bold align-middle text-center bg-slate-50/50 h-8 whitespace-nowrap">
                                    요청사항
                                </td>
                                <td colSpan={5} className="border border-black p-1 align-middle">
                                    <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[11px]">
                                        {data.memo || ''}
                                    </div>
                                </td>
                            </tr>
                        )}
                        {isReceipt && (
                            <tr>
                                <td className="border border-black p-1 font-bold text-center">{tf.f02592}</td>
                                <td colSpan={5} className="border border-black p-1 h-16"></td>
                            </tr>
                        )}
                    </tbody>
                </table>
                {isReceipt && (
                    <div className="mt-4 text-xs border-t border-black pt-3">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="flex flex-col">
                                <span className="font-bold text-[10px] text-gray-600 uppercase tracking-tighter">{tf.f01367}</span>
                                <span className="text-[14px] font-bold">{data.shopInfo.name}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="font-bold text-[10px] text-gray-600 uppercase tracking-tighter">{tf.f00444}</span>
                                <span className="text-[14px] font-medium">{data.shopInfo.contact || tf.f02593}</span>
                            </div>
                        </div>
                        <div className="mt-3 flex items-start justify-between">
                            <div className="flex flex-col flex-1 mr-4">
                                <span className="font-bold text-[10px] text-gray-600 uppercase tracking-tighter">{tf.f00650}</span>
                                <span className="text-[13px] leading-snug">{data.shopInfo.address || tf.f02594}</span>
                            </div>
                            {data.shopInfo.account && (
                                <div className="text-right whitespace-nowrap">
                                    <span className="font-bold text-[10px] text-gray-600 uppercase mr-2">{tf.f02595}</span>
                                    <span className="text-[13px] font-semibold">{data.shopInfo.account}</span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
            );
        };
        return (
            <div className="p-4 bg-white text-black font-sans px-[15mm]">
                {/* 주문서 상단 여백 2cm */}
                <div style={{ paddingTop: '2cm' }}>
                    {renderSection(tf.f00628, false)}
                </div>
                <div className="border-t-2 border-dashed border-gray-400 my-8"></div>
                {renderSection(tf.f00521, true)}
            </div>
        );
    }
}

export function PrintableOrder(props: PrintableOrderProps) { const { symbol: currencySymbol } = useCurrency(); return <PrintableOrderInner {...props} currencySymbol={currencySymbol} />; }