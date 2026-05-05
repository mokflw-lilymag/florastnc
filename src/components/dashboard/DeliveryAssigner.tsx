"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Package } from "lucide-react";
import { Order } from "@/types/order";
import { DeliveryFactory } from "@/services/delivery/DeliveryFactory";
import { DeliveryStatusBadge } from "@/components/ui/DeliveryStatusBadge";
import { useOrders } from "@/hooks/use-orders";
import { useUiText } from "@/hooks/use-ui-text";
import { toast } from "sonner";

export function DeliveryAssigner({ order }: { order: Order }) {
  const [loading, setLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  const { updateOrder } = useOrders(false);
  const { tr } = useUiText();

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
        await updateOrder(order.id, {
          delivery_provider: req.provider,
          delivery_tracking_id: req.trackingId,
          delivery_provider_status: req.status,
        });
        toast.success(
          tr(
            "배차 요청이 접수되었습니다.",
            "Delivery request submitted.",
            "Đã tiếp nhận yêu cầu giao hàng.",
            "配達手配を受け付けました。",
            "配送请求已提交。",
            "Solicitud de entrega enviada.",
            "Pedido de entrega recebido.",
            "Demande de livraison enregistrée.",
            "Lieferanfrage übermittelt.",
            "Запрос доставки принят.",
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
    } catch (e) {
      console.error(e);
      toast.error(
        tr(
          "호출 중 오류가 발생했습니다.",
          "An error occurred while requesting.",
          "Đã xảy ra lỗi khi gọi.",
          "手配中にエラーが発生しました。",
          "请求时出错。",
          "Ocurrió un error al solicitar.",
          "Ocorreu um erro ao solicitar.",
          "Une erreur s’est produite.",
          "Fehler bei der Anfrage.",
          "Произошла ошибка.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCancelDelivery = async () => {
    if (!order.delivery_provider || !order.delivery_tracking_id) return;

    if (
      !confirm(
        tr(
          "정말로 배차를 취소하시겠습니까?\n(이미 픽업이 완료되었거나 기사님이 이동 중일 경우 카카오T 규정에 따라 수수료가 발생할 수 있습니다)",
          "Cancel this dispatch?\n(Fees may apply under Kakao T rules if pickup is done or the driver is en route.)",
          "Hủy điều phối này?\n(Theo quy định Kakao T, có thể phát sinh phí nếu đã lấy hàng hoặc tài xế đang di chuyển.)",
          "配車を取り消しますか？\n（ピックアップ済みやドライバー移動中はKakao Tの規定により手数料がかかる場合があります）",
          "确定取消派单吗？\n（若已完成取货或骑手在途中，依据 Kakao T 规则可能产生费用。）",
          "¿Cancelar este reparto?\n(Pueden aplicarse cargos según Kakao T si ya hubo recogida o el conductor va en camino.)",
          "Cancelar este despacho?\n(Taxas podem se aplicar pelas regras da Kakao T se já houve coleta ou o motorista está a caminho.)",
          "Annuler cette course ?\n(Des frais peuvent s’appliquer selon Kakao T si enlèvement effectué ou livreur en route.)",
          "Zuweisung stornieren?\n(Gebühren nach Kakao T möglich bei Abholung oder Fahrt des Fahrers.)",
          "Отменить назначение?\n(По правилам Kakao T возможна плата при выдаче или если курьер в пути.)",
        ),
      )
    ) {
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
          delivery_tracking_url: null,
        } as any);
        toast.success(
          tr(
            "배차가 정상적으로 취소되었습니다.",
            "Dispatch canceled successfully.",
            "Đã hủy điều phối.",
            "配車を取り消しました。",
            "派单已成功取消。",
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
            "배차 취소에 실패했습니다. (이미 배송이 진행 중이거나 오류)",
            "Could not cancel dispatch (delivery in progress or error).",
            "Không thể hủy điều phối (đang giao hoặc lỗi).",
            "配車を取り消せませんでした（配送中またはエラー）。",
            "取消派单失败（配送进行中或错误）。",
            "No se pudo cancelar (envío en curso o error).",
            "Não foi possível cancelar (entrega em andamento ou erro).",
            "Annulation impossible (livraison en cours ou erreur).",
            "Stornierung nicht möglich (Lieferung läuft oder Fehler).",
            "Не удалось отменить (доставка идёт или ошибка).",
          ),
        );
      }
    } catch (e) {
      console.error(e);
      toast.error(
        tr(
          "취소 중 오류가 발생했습니다.",
          "Error while canceling.",
          "Lỗi khi hủy.",
          "取り消し中にエラーが発生しました。",
          "取消时出错。",
          "Error al cancelar.",
          "Erro ao cancelar.",
          "Erreur lors de l’annulation.",
          "Fehler beim Stornieren.",
          "Ошибка при отмене.",
        ),
      );
    } finally {
      setCancelLoading(false);
    }
  };

  const title = tr(
    "배달 대행 (카카오T)",
    "Delivery proxy (Kakao T)",
    "Giao hàng qua Kakao T",
    "配達代行（Kakao T）",
    "配送代办（Kakao T）",
    "Entrega con Kakao T",
    "Entrega via Kakao T",
    "Livraison via Kakao T",
    "Lieferung (Kakao T)",
    "Доставка (Kakao T)",
  );

  const hintNoTrack = tr(
    "버튼을 눌러 퀵/차량을 수동으로 호출할 수 있습니다.",
    "Tap the button to manually request a vehicle.",
    "Nhấn nút để gọi xe thủ công.",
    "ボタンで車両を手配できます。",
    "点击按钮可手动呼叫车辆。",
    "Pulse el botón para solicitar un vehículo.",
    "Toque no botão para solicitar veículo.",
    "Appuyez pour demander un véhicule.",
    "Tippen Sie, um ein Fahrzeug anzufordern.",
    "Нажмите, чтобы вызвать транспорт.",
  );

  const reservationLabel = tr("예약번호", "Booking no.", "Mã đặt", "予約番号", "预约号", "Reserva", "Reserva", "Réservation", "Buchungsnr.", "Номер брони");
  const driverLabel = tr("기사", "Driver", "Tài xế", "ドライバー", "骑手", "Conductor", "Motorista", "Chauffeur", "Fahrer", "Водитель");
  const trackBtn = tr("실시간 위치보기", "Live tracking", "Theo dõi trực tiếp", "位置を見る", "实时位置", "Seguimiento", "Rastrear", "Suivi", "Live-Tracking", "Трекинг");
  const photoBtn = tr("완료 사진보기", "Completion photo", "Ảnh hoàn tất", "完了写真", "完成照片", "Foto final", "Foto conclusão", "Photo de livraison", "Fertigfoto", "Фото доставки");
  const cancelBtn = tr("배차 취소", "Cancel dispatch", "Hủy điều phối", "配車取消", "取消派单", "Cancelar reparto", "Cancelar", "Annuler la course", "Stornieren", "Отменить");
  const requestBtn = tr("수동 배차 요청", "Request dispatch", "Yêu cầu điều phối", "手動配車", "手动派单", "Solicitar reparto", "Solicitar despacho", "Demander une course", "Zuweisung anfordern", "Запросить доставку");

  return (
    <div className="flex items-center gap-3 bg-indigo-50/50 border border-indigo-100 p-3 rounded-lg">
      <div className="flex-1">
        <div className="text-sm font-bold text-indigo-900 flex items-center gap-2">
          <Package className="w-4 h-4" /> {title}
        </div>
        {!order.delivery_tracking_id ? (
          <div className="text-xs text-indigo-600/70 mt-1">{hintNoTrack}</div>
        ) : (
          <div className="mt-2 flex flex-col gap-1">
            <span className="text-xs text-slate-500 font-mono">
              {reservationLabel}: {order.delivery_tracking_id}
            </span>
            {order.delivery_info?.driverName && (
              <span className="text-sm text-slate-700 font-semibold mt-1">
                👨‍🚀 {driverLabel}: {order.delivery_info.driverName} ({order.delivery_info.driverContact})
              </span>
            )}
            <div className="flex flex-wrap gap-2 mt-1">
              {order.delivery_tracking_url && (
                <a href={order.delivery_tracking_url} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="h-7 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50">
                    📍 {trackBtn}
                  </Button>
                </a>
              )}
              {order.delivery_info?.completionPhotoUrl && (
                <a href={order.delivery_info.completionPhotoUrl} target="_blank" rel="noreferrer">
                  <Button variant="outline" size="sm" className="h-7 text-xs text-indigo-700 border-indigo-200 hover:bg-indigo-50">
                    📸 {photoBtn}
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
            {(order.delivery_provider_status === "assigned" || order.delivery_provider_status === "pending") && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-500 hover:text-red-700 hover:bg-red-50 h-6 px-2"
                onClick={handleCancelDelivery}
                disabled={cancelLoading}
              >
                {cancelLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : null}
                {cancelBtn}
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
            {requestBtn}
          </Button>
        )}
      </div>
    </div>
  );
}
