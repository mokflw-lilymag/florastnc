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

/**
 * 리본 문구를 축하글(왼쪽)과 보내는이(오른쪽)로 스마트하게 분리합니다.
 */
export function smartSplitRibbonMessage(content: string, senderName?: string, ordererName?: string): { left: string; right: string } {
    if (!content) return { left: "", right: senderName || ordererName || "" };
    
    const trimmedContent = content.trim();

    // 1. 이미 '/' 등으로 구분된 경우 처리
    const separators = ['/', '|', ' - '];
    for (const sep of separators) {
        if (trimmedContent.includes(sep)) {
            const parts = trimmedContent.split(sep);
            return {
                left: parts[0].trim(),
                right: parts[1] ? parts[1].trim() : (senderName || ordererName || "")
            };
        }
    }

    // 2. 콜론(:) 처리 (단, 시간이나 URL이 아닐 때만)
    if (trimmedContent.includes(':') && !trimmedContent.match(/\d+:\d+/) && !trimmedContent.startsWith('http')) {
        const parts = trimmedContent.split(':');
        return {
            left: parts[0].trim(),
            right: parts[1].trim() || (senderName || ordererName || "")
        };
    }

    // 3. 흔한 경조사어로 시작하는 경우 (축발전 홍길동 등)
    // 앞 2~4글자가 매칭되는지 확인
    const commonPhrases = [
        '축발전', '祝發展', '축개업', '祝開業', '축승진', '祝昇進', '축영전', 
        '祝榮轉', '근조', '謹弔', '축결혼', '祝結婚', '축화혼', '祝華婚', 
        '축고희', '축칠순', '축팔순'
    ];
    
    for (const phrase of commonPhrases) {
        if (trimmedContent.startsWith(phrase)) {
            const remaining = trimmedContent.slice(phrase.length).trim();
            if (remaining.length > 0) {
                return {
                    left: phrase,
                    right: remaining
                };
            }
        }
    }

    // 4. 보내는 사람이 명시적으로 필드에 있는 경우
    if (senderName && senderName.trim().length > 0) {
        return {
            left: trimmedContent,
            right: senderName.trim()
        };
    }

    // 5. 기본값: 전체를 왼쪽, 주문자명을 오른쪽
    return {
        left: trimmedContent,
        right: ordererName || ""
    };
}
