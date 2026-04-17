export type DeliveryProviderType = 'kakao_t' | 'vroong' | 'barogo' | 'manual';
export type DeliveryStatus = 'pending' | 'assigned' | 'picked_up' | 'delivered' | 'failed' | 'cancelled';

export interface DeliveryEstimateRequest {
    storeId: string;
    pickupAddress: string;
    deliveryAddress: string;
    weightInfo?: string;
}

export interface DeliveryEstimateResponse {
    fee: number;
    estimatedTimeMin: number;
    provider: DeliveryProviderType;
    isVehicleAllowed: boolean;
}

export interface DeliveryRequestParams {
    orderId: string;
    storeId: string;
    pickupAddress: string;
    deliveryAddress: string;
    customerName: string;
    customerPhone: string;
    itemDescription: string;
    requiresVehicle: boolean; // 꽃 배달 등 차량 퀵이 필수인지 여부
}

export interface DeliveryResponse {
    success: boolean;
    trackingId?: string;
    errorMessage?: string;
    provider: DeliveryProviderType;
    status: DeliveryStatus;
    fee?: number; // 배송 완료 시 청구될 확정(또는 예상) 비용
}

export interface IDeliveryProvider {
    /** 예상 요금 및 가능 여부 조회 */
    estimateFee(params: DeliveryEstimateRequest): Promise<DeliveryEstimateResponse>;
    /** 실제 배차 요청 */
    requestDelivery(params: DeliveryRequestParams): Promise<DeliveryResponse>;
    /** 배차 취소 */
    cancelDelivery(trackingId: string, storeId: string): Promise<boolean>;
    /** 상태 폴링 또는 동기화 요청 (웹훅 실패 시 백업용) */
    trackStatus(trackingId: string): Promise<DeliveryStatus>;
}
