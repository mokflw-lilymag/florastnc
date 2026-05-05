"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Truck, Navigation, Camera, AlertCircle } from "lucide-react";
import { Order } from "@/types/order";
import { DeliveryFactory } from "@/services/delivery/DeliveryFactory";
import { DeliveryStatusBadge } from "@/components/ui/DeliveryStatusBadge";
import { useOrders } from "@/hooks/use-orders";
import { useUiText } from "@/hooks/use-ui-text";
import { toast } from "sonner";

export function DeliveryTableAssigner({ order }: { order: Order }) {
  const [localOrder, setLocalOrder] = useState<Order>(order);
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { updateOrder } = useOrders(false);
  const { tr } = useUiText();

  const kakaoTAffiliation = tr(
    "카카오T 배송",
    "Kakao T Delivery",
    "Giao hàng Kakao T",
    "Kakao T配送",
    "Kakao T 配送",
    "Entrega Kakao T",
    "Entrega Kakao T",
    "Livraison Kakao T",
    "Kakao T Zustellung",
    "Доставка Kakao T",
  );

  const flowerItemDescription = tr(
    "꽃배달 상품",
    "Flower delivery order",
    "Đơn giao hoa",
    "花宅配の商品",
    "鲜花配送订单",
    "Pedido de flores a domicilio",
    "Pedido de entrega de flores",
    "Commande livraison de fleurs",
    "Blumenlieferung",
    "Доставка цветов",
  );

  useEffect(() => {
    setLocalOrder(order);
  }, [order]);

  const handleRequestDelivery = async () => {
    setLoading(true);
    try {
      const provider = DeliveryFactory.getProvider("kakao_t");

      const req = await provider.requestDelivery({
        orderId: order.id,
        storeId: order.tenant_id,
        pickupAddress: "Store Address",
        deliveryAddress: order.delivery_info?.address || "",
        customerName: order.delivery_info?.recipientName || order.orderer.name,
        customerPhone: order.delivery_info?.recipientContact || order.orderer.contact,
        itemDescription: flowerItemDescription,
        requiresVehicle: true,
      });

      if (req.success && req.trackingId) {
        setLocalOrder((prev) => ({
          ...prev,
          delivery_provider: req.provider,
          delivery_tracking_id: req.trackingId,
          delivery_provider_status: req.status,
          actual_delivery_cost: req.fee || prev.actual_delivery_cost,
          delivery_info: {
            ...((prev.delivery_info as any) || {}),
            driverAffiliation: kakaoTAffiliation,
          },
        }));

        await updateOrder(localOrder.id, {
          delivery_provider: req.provider,
          delivery_tracking_id: req.trackingId,
          delivery_provider_status: req.status,
          actual_delivery_cost: req.fee || localOrder.actual_delivery_cost,
          delivery_info: {
            ...((localOrder.delivery_info as any) || {}),
            driverAffiliation: kakaoTAffiliation,
          },
        });
        toast.success(
          tr(
            "카카오T 배달 호출이 완료되었습니다.",
            "Kakao T delivery request completed.",
            "Đã gọi giao hàng Kakao T.",
            "Kakao Tの配達を手配しました。",
            "Kakao T 配送呼叫已完成。",
            "Solicitud de entrega Kakao T completada.",
            "Chamada de entrega Kakao T concluída.",
            "Demande de livraison Kakao T envoyée.",
            "Kakao T Lieferung angefordert.",
            "Запрос доставки Kakao T выполнен.",
          ),
        );
      } else {
        const unknown = tr(
          "알 수 없는 오류",
          "Unknown error",
          "Lỗi không xác định",
          "不明なエラー",
          "未知错误",
          "Error desconocido",
          "Erro desconhecido",
          "Erreur inconnue",
          "Unbekannter Fehler",
          "Неизвестная ошибка",
        );
        toast.error(
          `${tr(
            "배달 호출 실패",
            "Delivery request failed",
            "Gọi giao hàng thất bại",
            "配達手配に失敗",
            "呼叫配送失败",
            "Error en la solicitud de entrega",
            "Falha na solicitação de entrega",
            "Échec de la demande de livraison",
            "Lieferanfrage fehlgeschlagen",
            "Ошибка запроса доставки",
          )}: ${req.status || unknown}`,
        );
      }
    } catch (e: unknown) {
      console.error(e);
      toast.error(
        tr(
          "호출 중 오류 발생",
          "Error while requesting delivery",
          "Lỗi khi gọi giao hàng",
          "手配中にエラーが発生しました",
          "请求配送时出错",
          "Error al solicitar la entrega",
          "Erro ao solicitar entrega",
          "Erreur lors de la demande",
          "Fehler bei der Anfrage",
          "Ошибка при запросе доставки",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelivery = async () => {
    if (!localOrder.delivery_provider || !localOrder.delivery_tracking_id) return;

    if (
      !confirm(
        tr(
          "정말로 배차를 취소하시겠습니까?\n이동 중인 경우 수수료가 청구될 수 있습니다.",
          "Cancel this dispatch?\nA fee may apply if the driver is already en route.",
          "Hủy điều phối này?\nCó thể phát sinh phí nếu tài xế đang di chuyển.",
          "配車を取り消しますか？\n移動中の場合、手数料がかかることがあります。",
          "确定取消此次派单吗？\n若骑手已在途中，可能会产生费用。",
          "¿Cancelar este reparto?\nPuede haber cargo si el conductor ya va en camino.",
          "Cancelar este despacho?\nPode haver taxa se o motorista já estiver a caminho.",
          "Annuler cette course ?\nDes frais peuvent s’appliquer si le livreur est en route.",
          "Diese Zuweisung stornieren?\nGebühren können anfallen, wenn der Fahrer unterwegs ist.",
          "Отменить назначение?\nМожет взиматься плата, если курьер уже в пути.",
        ),
      )
    ) {
      return;
    }

    setCancelLoading(true);
    try {
      const provider = DeliveryFactory.getProvider(localOrder.delivery_provider as any);
      const isCancelled = await provider.cancelDelivery(localOrder.delivery_tracking_id, localOrder.tenant_id);

      if (isCancelled) {
        setLocalOrder(
          (prev) =>
            ({
              ...prev,
              delivery_provider_status: null,
              delivery_tracking_id: null,
              delivery_provider: null,
              delivery_tracking_url: null,
              actual_delivery_cost: null,
            }) as any,
        );

        await updateOrder(localOrder.id, {
          delivery_provider_status: null,
          delivery_tracking_id: null,
          delivery_provider: null,
          delivery_tracking_url: null,
          actual_delivery_cost: null,
        } as any);
        toast.success(
          tr(
            "정상적으로 배차가 취소되었습니다.",
            "Dispatch canceled.",
            "Đã hủy điều phối.",
            "配車を取り消しました。",
            "派单已取消。",
            "Reparto cancelado.",
            "Despacho cancelado.",
            "Course annulée.",
            "Zuweisung storniert.",
            "Назначение отменено.",
          ),
        );
      } else {
        toast.error(
          tr(
            "취소에 실패했습니다. (이미 픽업됨 등)",
            "Could not cancel (e.g. already picked up).",
            "Không thể hủy (ví dụ đã lấy hàng).",
            "取り消せませんでした（ピックアップ済みなど）。",
            "取消失败（例如已取货）。",
            "No se pudo cancelar (p. ej. ya recogido).",
            "Não foi possível cancelar (ex.: já coletado).",
            "Annulation impossible (ex. déjà pris en charge).",
            "Stornierung nicht möglich (z. B. bereits abgeholt).",
            "Не удалось отменить (например, уже забрали).",
          ),
        );
      }
    } catch (e) {
      console.error(e);
      toast.error(
        tr(
          "취소 중 오류 발생",
          "Error while canceling",
          "Lỗi khi hủy",
          "取り消し中にエラー",
          "取消时出错",
          "Error al cancelar",
          "Erro ao cancelar",
          "Erreur lors de l’annulation",
          "Fehler beim Stornieren",
          "Ошибка при отмене",
        ),
      );
    } finally {
      setCancelLoading(false);
    }
  };

  if (
    !localOrder.delivery_tracking_id ||
    localOrder.delivery_provider_status === "cancelled" ||
    localOrder.delivery_provider_status === "failed"
  ) {
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
          {tr(
            "카카오T 호출",
            "Request Kakao T",
            "Gọi Kakao T",
            "Kakao Tを手配",
            "呼叫 Kakao T",
            "Solicitar Kakao T",
            "Chamar Kakao T",
            "Demander Kakao T",
            "Kakao T anfordern",
            "Вызвать Kakao T",
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5 items-start">
      <div className="flex items-center justify-between w-full">
        <DeliveryStatusBadge status={localOrder.delivery_provider_status} provider={localOrder.delivery_provider} />

        {(localOrder.delivery_provider_status === "assigned" || localOrder.delivery_provider_status === "pending") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-50 -mr-1"
            onClick={handleCancelDelivery}
            disabled={cancelLoading}
          >
            {cancelLoading ? <Loader2 className="w-2.5 h-2.5 animate-spin mr-1" /> : <AlertCircle className="w-2.5 h-2.5 mr-1" />}
            {tr("취소", "Cancel", "Hủy", "キャンセル", "取消", "Cancelar", "Cancelar", "Annuler", "Abbrechen", "Отмена")}
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
          <a href={localOrder.delivery_tracking_url} target="_blank" rel="noreferrer" className="flex-1">
            <Button variant="outline" size="sm" className="h-6 w-full text-[10px] px-1 bg-white">
              <Navigation className="w-3 h-3 mr-1 text-blue-500" />
              {tr("위치", "Track", "Vị trí", "位置", "位置", "Ubicación", "Local", "Suivi", "Karte", "Маршрут")}
            </Button>
          </a>
        )}
        {localOrder.delivery_info?.completionPhotoUrl && (
          <a href={localOrder.delivery_info.completionPhotoUrl} target="_blank" rel="noreferrer" className="flex-1">
            <Button variant="outline" size="sm" className="h-6 w-full text-[10px] px-1 bg-white">
              <Camera className="w-3 h-3 mr-1 text-emerald-500" />
              {tr("사진", "Photo", "Ảnh", "写真", "照片", "Foto", "Foto", "Photo", "Foto", "Фото")}
            </Button>
          </a>
        )}
      </div>
    </div>
  );
}
