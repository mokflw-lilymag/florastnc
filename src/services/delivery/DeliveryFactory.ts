import { IDeliveryProvider, DeliveryProviderType } from './ProviderInterface';
import { KakaoTProvider } from './providers/KakaoTProvider';

export class DeliveryFactory {
    static getProvider(providerType: DeliveryProviderType): IDeliveryProvider {
        switch (providerType) {
            case 'kakao_t':
                return new KakaoTProvider();
            // TODO: 추후 부릉(vroong), 바로고(barogo) 등 추가 연동 시 여기에 분기 등록
            case 'vroong':
            case 'barogo':
                throw new Error(`Provider ${providerType} is not fully integrated yet.`);
            case 'manual':
                throw new Error(`Manual provider does not support API calls.`);
            default:
                throw new Error(`Unsupported delivery provider: ${providerType}`);
        }
    }
}
