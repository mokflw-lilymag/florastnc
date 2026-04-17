import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Truck, Navigation, Camera, AlertCircle } from "lucide-react";
import { Order } from "@/types/order";
import { DeliveryFactory } from "@/services/delivery/DeliveryFactory";
import { DeliveryStatusBadge } from "@/components/ui/DeliveryStatusBadge";
import { useOrders } from "@/hooks/use-orders";
import { toast } from 'sonner';

export function DeliveryTableAssigner({ order }: { order: Order }) {
  const [localOrder, setLocalOrder] = useState<Order>(order);
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { updateOrder } = useOrders(false);

  // 상위 컴포넌트(DB/Realtime) 변경 시 로컬 상태 동기화
  useEffect(() => {
    setLocalOrder(order);
  }, [order]);

  const handleRequestDelivery = async () => {
    setLoading(true);
    try {
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
        // Optimistic UI Update
        setLocalOrder(prev => ({
          ...prev,
          delivery_provider: req.provider,
          delivery_tracking_id: req.trackingId,
          delivery_provider_status: req.status,
          actual_delivery_cost: req.fee || prev.actual_delivery_cost,
          delivery_info: {
            ...((prev.delivery_info as any) || {}),
            driverAffiliation: '카카오T 배송'
          }
        }));

        await updateOrder(localOrder.id, {
          delivery_provider: req.provider,
          delivery_tracking_id: req.trackingId,
          delivery_provider_status: req.status,
          actual_delivery_cost: req.fee || localOrder.actual_delivery_cost,
          delivery_info: {
            ...((localOrder.delivery_info as any) || {}),
            driverAffiliation: '카카오T 배송'
          }
        });
        toast.success("카카오T 배달 호출이 완료되었습니다.");
      } else {
        toast.error("배달 호출 실패: " + (req.status || "알 수 없는 오류"));
      }
    } catch (e: any) {
      console.error(e);
      toast.error("호출 중 오류 발생");
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelivery = async () => {
    if (!localOrder.delivery_provider || !localOrder.delivery_tracking_id) return;
    
    if (!confirm('정말로 배차를 취소하시겠습니까?\n이동 중인 경우 수수료가 청구될 수 있습니다.')) {
      return;
    }

    setCancelLoading(true);
    try {
      const provider = DeliveryFactory.getProvider(localOrder.delivery_provider as any);
      const isCancelled = await provider.cancelDelivery(localOrder.delivery_tracking_id, localOrder.tenant_id);

      if (isCancelled) {
        // Optimistic UI Update
        setLocalOrder(prev => ({
          ...prev,
          delivery_provider_status: null,
          delivery_tracking_id: null,
          delivery_provider: null,
          delivery_tracking_url: null,
          actual_delivery_cost: null
        } as any));

        await updateOrder(localOrder.id, {
          delivery_provider_status: null,
          delivery_tracking_id: null,
          delivery_provider: null,
          delivery_tracking_url: null,
          actual_delivery_cost: null
        } as any);
        toast.success('정상적으로 배차가 취소되었습니다.');
      } else {
        toast.error('취소에 실패했습니다. (이미 픽업됨 등)');
      }
    } catch (e) {
      console.error(e);
      toast.error('취소 중 오류 발생');
    } finally {
      setCancelLoading(false);
    }
  };

  // 아직 배회나 호출되지 않은 상태
  if (!localOrder.delivery_tracking_id || localOrder.delivery_provider_status === 'cancelled' || localOrder.delivery_provider_status === 'failed') {
    return (
      <div className="flex flex-col gap-1 items-start">
        {localOrder.delivery_provider_status && (
           <div className="mb-1">
             <DeliveryStatusBadge status={localOrder.delivery_provider_status} provider={localOrder.delivery_provider} />
           </div>
        )}
        <Button 
          size="sm" 
          onClick={handleRequestDelivery} 
          disabled={loading}
          className="h-8 text-xs font-bold bg-[#FFDF00] text-black hover:bg-[#E5C800] border-none shadow-sm gap-1 w-full"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Truck className="w-3.5 h-3.5" />}
          카카오T 호출
        </Button>
      </div>
    );
  }

  // 배차된 상태
  return (
    <div className="flex flex-col gap-1.5 items-start">
      <div className="flex items-center justify-between w-full">
        <DeliveryStatusBadge status={localOrder.delivery_provider_status} provider={localOrder.delivery_provider} />
        
        {(localOrder.delivery_provider_status === 'assigned' || localOrder.delivery_provider_status === 'pending') && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-5 px-1.5 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 -mr-1"
            onClick={handleCancelDelivery}
            disabled={cancelLoading}
          >
            {cancelLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" /> : <AlertCircle className="w-2.5 h-2.5 mr-1" />}
            취소
          </Button>
        )}
      </div>

      {localOrder.delivery_info?.driverName && (
        <span className="text-xs font-medium text-gray-700 bg-gray-50 border border-gray-100 rounded px-1.5 py-0.5 w-full truncate">
          🧑‍🚀 {localOrder.delivery_info.driverName} ({localOrder.delivery_info.driverContact})
        </span>
      )}
      
      <div className="flex gap-1 w-full">
        {localOrder.delivery_tracking_url && (
          <Button variant="outline" size="sm" className="h-6 flex-1 text-[10px] px-1 bg-white" asChild>
            <a href={localOrder.delivery_tracking_url} target="_blank" rel="noreferrer">
              <Navigation className="w-3 h-3 mr-1 text-blue-500" /> 위치
            </a>
          </Button>
        )}
        {localOrder.delivery_info?.completionPhotoUrl && (
          <Button variant="outline" size="sm" className="h-6 flex-1 text-[10px] px-1 bg-white" asChild>
            <a href={localOrder.delivery_info.completionPhotoUrl} target="_blank" rel="noreferrer">
              <Camera className="w-3 h-3 mr-1 text-emerald-500" /> 사진
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
