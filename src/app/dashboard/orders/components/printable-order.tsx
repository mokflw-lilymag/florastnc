"use client";

import React from 'react';
import Image from 'next/image';

export interface OrderPrintData {
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
}

const paymentMethodMap = {
    card: "카드",
    cash: "현금",
    transfer: "계좌이체",
};

export class PrintableOrder extends React.Component<PrintableOrderProps> {
    render() {
        const { data } = this.props;
        if (!data) return null;

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

        const paymentMethodText = paymentMethodMap[data.paymentMethod as keyof typeof paymentMethodMap] || data.paymentMethod;

        const renderSection = (title: string, isReceipt: boolean) => (
            <div className="mb-4">
                <div className="flex flex-col items-center mb-4">
                    {data.logoUrl && (
                        <div className="mb-3 max-h-16 flex items-center justify-center">
                            <img 
                                src={data.logoUrl} 
                                alt="Store Logo" 
                                className="h-14 w-auto object-contain" 
                                onError={(e) => {
                                    // Hide the logo container if image fails to load
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                        </div>
                    )}
                    <h1 className="text-2xl font-black tracking-tight text-slate-900">
                        {data.shopInfo.name} {title}
                    </h1>
                </div>
                <table className="w-full border-collapse border border-black text-sm">
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 font-bold w-[12%] text-center bg-slate-50/50">주문일</td>
                            <td className="border border-black p-1 w-[20%]" style={{ fontSize: '11px' }}>
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis">{data.orderDate}</div>
                            </td>
                            <td className="border border-black p-1 font-bold w-[8%] text-center bg-slate-50/50">주문자</td>
                            <td className="border border-black p-1 w-[28%]">
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[12px]">
                                    {(() => {
                                        if (data.isAnonymous && isReceipt) return '';
                                        return data.ordererCompany ? `${data.ordererCompany} / ${data.ordererName}` : data.ordererName;
                                    })()}
                                </div>
                            </td>
                            <td className="border border-black p-1 font-bold w-[8%] text-center bg-slate-50/50">연락처</td>
                            <td className="border border-black p-1 w-[24%]" style={{ fontSize: '12px' }}>
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis">{data.isAnonymous && isReceipt ? '' : data.ordererContact}</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 font-bold align-middle h-8 text-center bg-slate-50/50">항목/수량</td>
                            <td className="border border-black p-1 align-middle" colSpan={5}>
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[11px] leading-tight">
                                    {data.items}
                                </div>
                            </td>
                        </tr>
                        {!isReceipt && (
                            <tr>
                                <td className="border border-black p-1 font-bold text-center bg-slate-50/50">결제정보</td>
                                <td className="border border-black p-1" colSpan={5}>
                                    <div className="flex items-center justify-between text-[12px]">
                                        <span className="whitespace-nowrap overflow-hidden text-ellipsis">금액: ₩{data.totalAmount.toLocaleString()}</span>
                                        <span className="whitespace-nowrap overflow-hidden text-ellipsis">배송비: ₩{data.deliveryFee.toLocaleString()}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="whitespace-nowrap overflow-hidden text-ellipsis">결제수단: {paymentMethodText}</span>
                                            <div className="flex items-center gap-2 pr-2">
                                                <div className="flex items-center whitespace-nowrap"><Checkbox checked={data.paymentStatus === '미결'} /><span>미결</span></div>
                                                <div className="flex items-center whitespace-nowrap"><Checkbox checked={data.paymentStatus === '완결'} /><span>완결</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        <tr>
                            <td className="border border-black p-1 font-bold text-center bg-slate-50/50">배송일시</td>
                            <td className="border border-black p-1">
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[11px]">{data.deliveryDate}</div>
                            </td>
                            <td className="border border-black p-1 font-bold text-center bg-slate-50/50">받는 분</td>
                            <td className="border border-black p-1">
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[12px]">{data.recipientName}</div>
                            </td>
                            <td className="border border-black p-1 font-bold text-center bg-slate-50/50">연락처</td>
                            <td className="border border-black p-1">
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[12px]">{data.recipientContact}</div>
                            </td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 font-bold align-middle text-center bg-slate-50/50 h-8">배송지주소</td>
                            <td colSpan={5} className="border border-black p-1 align-middle">
                                <div className="whitespace-nowrap overflow-hidden text-ellipsis text-[11px]">
                                    {data.deliveryAddress}
                                </div>
                            </td>
                        </tr>
                        {!isReceipt && (
                            <tr>
                                <td className="border border-black p-1 font-bold align-middle text-center bg-slate-50/50 h-8">
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                        <span>메세지</span>
                                        <div className="flex items-center gap-1 mt-0.5 text-[9px] font-normal">
                                            <div className="flex items-center"><Checkbox checked={data.messageType === 'card'} /><span>카</span></div>
                                            <div className="flex items-center"><Checkbox checked={data.messageType === 'ribbon'} /><span>리</span></div>
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
                        {isReceipt && (
                            <tr>
                                <td className="border border-black p-1 font-bold text-center">인수자성명</td>
                                <td colSpan={5} className="border border-black p-1 h-16"></td>
                            </tr>
                        )}
                    </tbody>
                </table>
                <div className="mt-4 text-xs border-t border-black pt-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                        <div className="flex flex-col">
                            <span className="font-bold text-[10px] text-gray-600 uppercase tracking-tighter">상호명</span>
                            <span className="text-[14px] font-bold">{data.shopInfo.name}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-[10px] text-gray-600 uppercase tracking-tighter">연락처</span>
                            <span className="text-[14px] font-medium">{data.shopInfo.contact || "연락처 미등록"}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-[10px] text-gray-600 uppercase tracking-tighter">이메일</span>
                            <span className="text-[13px]">{data.shopInfo.email || "-"}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-[10px] text-gray-600 uppercase tracking-tighter">웹사이트</span>
                            <span className="text-[13px] truncate">{data.shopInfo.website || "-"}</span>
                        </div>
                    </div>
                    <div className="mt-3 flex items-start justify-between">
                        <div className="flex flex-col flex-1 mr-4">
                            <span className="font-bold text-[10px] text-gray-600 uppercase tracking-tighter">주소</span>
                            <span className="text-[13px] leading-snug">{data.shopInfo.address || "주소 미등록"}</span>
                        </div>
                        {data.shopInfo.account && (
                            <div className="text-right whitespace-nowrap">
                                <span className="font-bold text-[10px] text-gray-600 uppercase mr-2">입금계좌:</span>
                                <span className="text-[13px] font-semibold">{data.shopInfo.account}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );

        return (
            <div className="p-4 bg-white text-black font-sans px-[15mm]">
                {renderSection('주문서', false)}
                <div className="border-t-2 border-dashed border-gray-400 my-8"></div>
                {renderSection('인수증', true)}
            </div>
        );
    }
}
