import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Package } from "lucide-react";
import { Order } from "@/types/order";
import { DeliveryFactory } from "@/services/delivery/DeliveryFactory";
import { DeliveryStatusBadge } from "@/components/ui/DeliveryStatusBadge";
import { useOrders } from "@/hooks/use-orders";

export function DeliveryAssigner({ order }: { order: Order }) {
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { updateOrder } = useOrders(false);

  const handleRequestDelivery = async () => {
    setLoading(true);
    try {
      // 팩토리를 통해 카카오T 서비스 불러오기
      const provider = DeliveryFactory.getProvider('kakao_t');
      
      const req = await provider.requestDelivery({
        orderId: order.id,
        storeId: order.tenant_id,
        pickupAddress: 'Store Address', // 실제로는 store settings에서 조회
        deliveryAddress: order.delivery_info?.address || '',
        customerName: order.delivery_info?.recipientName || order.orderer.name,
        customerPhone: order.delivery_info?.recipientContact || order.orderer.contact,
        itemDescription: '꽃배달 상품',
        requiresVehicle: true // 꽃 배달 기본
      });

      if (req.success && req.trackingId) {
        // 예약 성공 시 주문 데이터에 배차 정보 즉시 업데이트
        await updateOrder(order.id, {
          delivery_provider: req.provider,
          delivery_tracking_id: req.trackingId,
          delivery_provider_status: req.status
        });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelivery = async () => {
    if (!order.delivery_provider || !order.delivery_tracking_id) return;
    
    if (!confirm('정말로 배차를 취소하시겠습니까?\n(이미 픽업이 완료되었거나 기사님이 이동 중일 경우 카카오T 규정에 따라 수수료가 발생할 수 있습니다)')) {
      return;
    }

    setCancelLoading(true);
    try {
      const provider = DeliveryFactory.getProvider(order.delivery_provider as any);
      const isCancelled = await provider.cancelDelivery(order.delivery_tracking_id, order.tenant_id);

      if (isCancelled) {
        await updateOrder(order.id, {
          delivery_provider_status: null,
          delivery_tracking_id: null,
          delivery_provider: null,
          delivery_tracking_url: null
        } as any);
        alert('배차가 정상적으로 취소되었습니다.');
      } else {
        alert('배차 취소에 실패했습니다. (이미 배송이 진행 중이거나 오류)');
      }
    } catch (e) {
      console.error(e);
      alert('취소 중 오류가 발생했습니다.');
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3 bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg">
      <div className="flex-1">
        <div className="text-sm font-bold text-indigo-900 flex items-center gap-2">
          <Package className="w-4 h-4" /> 배달 대행 (카카오T)
        </div>
        {!order.delivery_tracking_id ? (
          <div className="text-xs text-indigo-600/70 mt-1">버튼을 눌러 퀵/차량을 수동으로 호출할 수 있습니다.</div>
        ) : (
          <div className="mt-2 flex flex-col gap-1">
            <span className="text-xs text-slate-500 font-mono">예약번호: {order.delivery_tracking_id}</span>
            {order.delivery_info?.driverName && (
              <span className="text-sm text-slate-700 font-semibold mt-1">
                👨‍🚀 기사: {order.delivery_info.driverName} ({order.delivery_info.driverContact})
              </span>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              {order.delivery_tracking_url && (
                <a href={order.delivery_tracking_url} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="h-7 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50">
                    📍 실시간 위치보기
                  </Button>
                </a>
              )}
              {order.delivery_info?.completionPhotoUrl && (
                <a href={order.delivery_info.completionPhotoUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="h-7 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50">
                    📸 완료 사진보기
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        {order.delivery_provider_status ? (
          <>
            <DeliveryStatusBadge status={order.delivery_provider_status} provider={order.delivery_provider} />
            {/* 배차 완료(assigned) 또는 대기 상태일 때만 취소 버튼 노출 */}
            {(order.delivery_provider_status === 'assigned' || order.delivery_provider_status === 'pending') && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-6 px-2"
                onClick={handleCancelDelivery}
                disabled={cancelLoading}
              >
                {cancelLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                배차 취소
              </Button>
            )}
          </>
        ) : (
          <Button 
            size="sm" 
            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm" 
            onClick={handleRequestDelivery} 
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            수동 배차 요청
          </Button>
        )}
      </div>
    </div>
  );
}
