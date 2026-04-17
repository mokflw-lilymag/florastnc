import { 
    IDeliveryProvider, 
    DeliveryEstimateRequest, 
    DeliveryEstimateResponse, 
    DeliveryRequestParams, 
    DeliveryResponse, 
    DeliveryStatus 
} from '../ProviderInterface';

export class KakaoTProvider implements IDeliveryProvider {
    
    async estimateFee(params: DeliveryEstimateRequest): Promise<DeliveryEstimateResponse> {
        // TODO: 실제 카카오T B2B / 파트너스 API 연동 (현재는 Mocking 상태)
        console.log('[KakaoT] Estimating fee for:', params);
        
        // 꽃 상품의 경우 파손 위험을 줄이기 위해 '차량 퀵'을 기본으로 산정한다고 가정
        return {
            fee: 15000, 
            estimatedTimeMin: 45,
            provider: 'kakao_t',
            isVehicleAllowed: true, // 차량 배송 지원 여부
        };
    }

    async requestDelivery(params: DeliveryRequestParams): Promise<DeliveryResponse> {
        // TODO: 실제 카카오 API 배송 요청 로직 연동
        // 목표: 매장(storeId)의 카카오T API Token(매장 개별 셋업)을 DB에서 조회하여 인증 헤더에 사용
        console.log('[KakaoT] Requesting delivery:', params);

        return {
            success: true,
            trackingId: `KAKAO_REQ_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
            provider: 'kakao_t',
            status: 'pending', // 막 요청을 보낸 시점의 상태
            fee: 15000 // 테스트용 15,000원 자동 과금
        };
    }

    async cancelDelivery(trackingId: string, storeId: string): Promise<boolean> {
        // TODO: 실제 카카오 API 배차 취소 엔드포인트 연동
        console.log(`[KakaoT] Cancelling delivery: ${trackingId} for store: ${storeId}`);
        return true;
    }

    async trackStatus(trackingId: string): Promise<DeliveryStatus> {
        // TODO: 상태 조회 API 연동 (상태를 리투아웃)
        console.log(`[KakaoT] Tracking status: ${trackingId}`);
        // 임시로 assigned 상태 리턴
        return 'assigned'; 
    }
}
