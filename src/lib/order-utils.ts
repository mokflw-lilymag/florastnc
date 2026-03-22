/**
 * 주문 상태 및 결제 상태에 대한 통합 판정 유틸리티
 */

export function isSettled(order: any): boolean {
    if (!order) return false;

    const payment = order.payment || {};
    const pStatus = payment.status || '';

    return (
        pStatus === 'paid' ||
        pStatus === 'completed' ||
        pStatus === '결제완료' ||
        pStatus === '입금완료' ||
        pStatus === '완료' ||
        pStatus === '처리완료' ||
        pStatus === '카드결제' ||
        pStatus === '현금결제'
    );
}

export function isCanceled(order: any): boolean {
    if (!order) return false;
    const oStatus = order.status || '';
    return oStatus === 'canceled' || oStatus === 'cancelled' || oStatus === '취소' || oStatus === '주문취소';
}

export function isPendingPayment(order: any): boolean {
    if (!order) return false;
    if (isCanceled(order)) return false;
    if (isSettled(order)) return false;

    const payment = order.payment || {};
    const pStatus = payment.status || '';

    return pStatus === 'pending' || pStatus === '대기' || pStatus === '미결제' || pStatus === '입금대기' || pStatus === '';
}
