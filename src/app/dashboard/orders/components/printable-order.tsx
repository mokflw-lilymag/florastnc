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
                <div className="flex flex-col items-center mb-6">
                    {data.logoUrl && (
                        <img src={data.logoUrl} alt="Store Logo" className="h-12 w-auto mb-2 object-contain" />
                    )}
                    <h1 className="text-2xl font-bold">
                        {data.shopInfo.name} {title}
                    </h1>
                </div>
                <table className="w-full border-collapse border border-black text-sm">
                    <tbody>
                        <tr>
                            <td className="border border-black p-1 font-bold w-[12%] text-center">주문일</td>
                            <td className="border border-black p-1 w-[20%]" style={{ fontSize: '12px' }}>{data.orderDate}</td>
                            <td className="border border-black p-1 font-bold w-[8%] text-center">주문자</td>
                            <td className="border border-black p-1 w-[28%]">
                                {(() => {
                                    if (data.isAnonymous && isReceipt) return '';
                                    return data.ordererCompany ? `${data.ordererCompany} / ${data.ordererName}` : data.ordererName;
                                })()}
                            </td>
                            <td className="border border-black p-1 font-bold w-[8%] text-center">연락처</td>
                            <td className="border border-black p-1 w-[24%]">{data.isAnonymous && isReceipt ? '' : data.ordererContact}</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-1 font-bold align-top h-12 text-center">항목/수량</td>
                            <td className="border border-black p-1 align-top whitespace-pre-wrap" colSpan={5}>{data.items}</td>
                        </tr>
                        {!isReceipt && (
                            <tr>
                                <td className="border border-black p-1 font-bold text-center">결제정보</td>
                                <td className="border border-black p-1" colSpan={5}>
                                    <div className="flex items-center justify-between">
                                        <span>금액: ₩{data.totalAmount.toLocaleString()}</span>
                                        <span>배송비: ₩{data.deliveryFee.toLocaleString()}</span>
                                        <div className="flex items-center gap-2">
                                            <span>결제수단: {paymentMethodText}</span>
                                            <div className="flex items-center gap-2 pr-2">
                                                <div className="flex items-center"><Checkbox checked={data.paymentStatus === '미결'} /><span>미결</span></div>
                                                <div className="flex items-center"><Checkbox checked={data.paymentStatus === '완결'} /><span>완결</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        )}
                        <tr>
                            <td className="border border-black p-1 font-bold text-center">배송일/시간</td>
                            <td className="border border-black p-1">{data.deliveryDate}</td>
                            <td className="border border-black p-1 font-bold text-center">받는 분</td>
                            <td className="border border-black p-1">{data.recipientName}</td>
                            <td className="border border-black p-1 font-bold text-center">연락처</td>
                            <td className="border border-black p-1">{data.recipientContact}</td>
                        </tr>
                        <tr>
                            <td className={`border border-black p-1 font-bold align-top ${isReceipt ? 'h-20' : 'h-16'} text-center`}>배송지주소</td>
                            <td colSpan={5} className="border border-black p-1 align-top">{data.deliveryAddress}</td>
                        </tr>
                        {!isReceipt && (
                            <tr>
                                <td className="border border-black p-1 font-bold align-top h-16 text-center">
                                    전달메세지<br />
                                    <div className="flex items-center gap-2 mt-1">
                                        <div className="flex items-center"><Checkbox checked={data.messageType === 'card'} /><span>카드</span></div>
                                        <div className="flex items-center"><Checkbox checked={data.messageType === 'ribbon'} /><span>리본</span></div>
                                    </div>
                                </td>
                                <td colSpan={5} className="border border-black p-1 align-top">
                                    {data.message}
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
            </div>
        );

        return (
            <div className="p-4 bg-white text-black font-sans px-[15mm]">
                {renderSection('주문서', false)}
                <div className="border-t-2 border-dashed border-gray-400 my-8"></div>
                {renderSection('인수증', true)}
                <div className="mt-8 text-xs border-t border-black pt-3">
                    <div className="grid grid-cols-3 gap-4">
                        <div className="flex flex-col">
                            <span className="font-bold text-[10px] text-gray-500 uppercase">상호명</span>
                            <span className="text-sm">{data.shopInfo.name}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-[10px] text-gray-500 uppercase">연락처</span>
                            <span className="text-sm">{data.shopInfo.contact || "연락처 미등록"}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="font-bold text-[10px] text-gray-500 uppercase">주소</span>
                            <span className="text-sm leading-tight">{data.shopInfo.address || "주소 미등록"}</span>
                        </div>
                    </div>
                    {data.shopInfo.account && (
                        <div className="mt-2 text-right">
                            <span className="font-bold text-[10px] text-gray-500 uppercase mr-2">입금계좌:</span>
                            <span className="text-sm font-medium">{data.shopInfo.account}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }
}
