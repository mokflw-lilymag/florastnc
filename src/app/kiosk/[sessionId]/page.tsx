"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useKioskSession } from "@/hooks/use-kiosk-session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import Textarea from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, CheckCircle2, MapPin, Truck, Store } from "lucide-react";
import { usePreferredLocale } from "@/hooks/use-preferred-locale";
import { toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";
import { kioskAnonymousCustomerName } from "@/i18n/kiosk-placeholders";

export default function KioskPage() {
  const locale = usePreferredLocale();
  const baseLocale = toBaseLocale(locale);
  const L = (
    ko: string,
    en: string,
    vi?: string,
    ja?: string,
    zh?: string,
    es?: string,
    pt?: string,
    fr?: string,
    de?: string,
    ru?: string,
  ) => pickUiText(baseLocale, ko, en, vi, ja, zh, es, pt, fr, de, ru);

  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;

  // Pre-filled existing info if passed via URL
  const existingName = searchParams.get("name") || "";
  const existingPhone = searchParams.get("phone") || "";
  const basePrice = parseInt(searchParams.get("price") || "0", 10);
  const existingPoints = parseInt(searchParams.get("points") || "0", 10);
  const pointRate = parseFloat(searchParams.get("pointRate") || "0");
  const minPointUsage = parseInt(searchParams.get("minPoint") || "0", 10);

  const { connected, sendKioskSubmit } = useKioskSession(sessionId, false);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const [customerName, setCustomerName] = useState(existingName);
  const [customerPhone, setCustomerPhone] = useState(existingPhone);
  const [customerEmail, setCustomerEmail] = useState("");
  const [saveCustomer, setSaveCustomer] = useState(!existingName); // Default save for new
  const [isAnonymous, setIsAnonymous] = useState(false);

  const [receiptType, setReceiptType] = useState<"delivery_reservation" | "store_pickup" | "pickup_reservation">("delivery_reservation");
  const [date, setDate] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [time, setTime] = useState(() => {
    const now = new Date();
    const h = Math.max(7, Math.min(22, now.getHours()));
    const m = now.getMinutes() < 30 ? "00" : "30";
    return `${String(h).padStart(2, '0')}:${m}`;
  });
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [address, setAddress] = useState("");

  const [messageType, setMessageType] = useState<"none" | "card" | "ribbon">("none");
  const [messageContent, setMessageContent] = useState("");
  const [messageSender, setMessageSender] = useState("");

  // Simplified Delivery Fee mock
  const [deliveryFee, setDeliveryFee] = useState(receiptType === "delivery_reservation" ? 5000 : 0);

  useEffect(() => {
    setDeliveryFee(receiptType === "delivery_reservation" ? 5000 : 0);
  }, [receiptType]);

  // Load Daum Postcode script
  useEffect(() => {
    const script = document.createElement('script');
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.body.appendChild(script);
    return () => { document.body.removeChild(script); };
  }, []);

  const openAddressSearch = () => {
    if ((window as any).daum?.Postcode) {
      new (window as any).daum.Postcode({
        oncomplete: (data: any) => {
          setAddress(data.address);
        }
      }).open();
    } else {
      toast.error(
        L(
          "주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.",
          "Address search is still loading. Please try again shortly.",
          "Dịch vụ tìm địa chỉ đang tải. Vui lòng thử lại sau.",
          "住所検索サービスを読み込み中です。しばらくしてから再度お試しください。",
          "地址搜索仍在加载，请稍后再试。",
          "La búsqueda de direcciones aún se está cargando. Inténtelo de nuevo en breve.",
          "A busca de endereço ainda está carregando. Tente novamente em instantes.",
          "La recherche d’adresse est encore en chargement. Réessayez dans un instant.",
          "Adresssuche lädt noch. Bitte versuchen Sie es in Kürze erneut.",
          "Поиск адреса всё ещё загружается. Повторите попытку чуть позже.",
        ),
      );
    }
  };

  const handleSubmit = async () => {
    if (!customerName && !isAnonymous) {
      toast.error(
        L(
          "이름을 입력해주시거나 익명으로 진행해주세요.",
          "Please enter your name or continue anonymously.",
          "Vui lòng nhập tên hoặc tiếp tục ẩn danh.",
          "お名前を入力するか、匿名で続行してください。",
          "请输入姓名或选择匿名继续。",
          "Introduzca su nombre o continúe de forma anónima.",
          "Digite seu nome ou continue anonimamente.",
          "Saisissez votre nom ou continuez anonymement.",
          "Geben Sie Ihren Namen ein oder fahren Sie anonym fort.",
          "Введите имя или продолжите анонимно.",
        ),
      );
      return;
    }
    
    setLoading(true);
    const payload = {
      customerName: isAnonymous ? kioskAnonymousCustomerName(baseLocale) : customerName,
      customerPhone: isAnonymous ? "" : customerPhone,
      customerEmail: isAnonymous ? "" : customerEmail,
      saveCustomer: isAnonymous ? false : saveCustomer,
      receiptType,
      date,
      time,
      recipientName,
      recipientPhone,
      address,
      messageType,
      messageContent,
      messageSender
    };

    const res = await sendKioskSubmit(payload);
    setLoading(false);
    
    if (res !== null) {
      setSubmitted(true);
    } else {
      toast.error(
        L(
          "직원 앱과 연결이 원활하지 않습니다. 직원에게 문의해주세요.",
          "Could not reach the staff app. Please ask a team member.",
          "Không kết nối được ứng dụng nhân viên. Vui lòng hỏi nhân viên.",
          "スタッフアプリに接続できません。スタッフにお声がけください。",
          "无法连接到员工端，请咨询店员。",
          "No se pudo conectar con la app del personal. Pida ayuda al equipo.",
          "Não foi possível conectar ao app da equipe. Peça ajuda a um atendente.",
          "Impossible d’atteindre l’app du personnel. Demandez à un collègue.",
          "Mitarbeiter-App nicht erreichbar. Bitte wenden Sie sich an das Team.",
          "Не удалось связаться с приложением персонала. Обратитесь к сотруднику.",
        ),
      );
    }
  };

  if (submitted) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50 p-6">
        <Card className="w-full max-w-md text-center border-none shadow-xl">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle2 className="w-16 h-16 text-emerald-500" />
            </div>
            <CardTitle className="text-2xl">
              {L(
                "입력이 완료되었습니다",
                "Submission complete",
                "Đã hoàn tất nhập liệu",
                "入力が完了しました",
                "提交完成",
                "Envío completado",
                "Envio concluído",
                "Saisie terminée",
                "Eingabe abgeschlossen",
                "Ввод завершён",
              )}
            </CardTitle>
            <CardDescription className="text-lg mt-2">
              {L(
                "감사합니다. 화면을 직원에게 다시 전달해주세요.",
                "Thank you. Please hand the screen back to a staff member.",
                "Cảm ơn bạn. Vui lòng trả màn hình cho nhân viên.",
                "ありがとうございます。画面をスタッフにお戻しください。",
                "谢谢。请将设备交还给店员。",
                "Gracias. Devuelva la pantalla a un miembro del personal.",
                "Obrigado. Devolva a tela a um funcionário.",
                "Merci. Remettez l’écran à un membre du personnel.",
                "Danke. Geben Sie das Gerät an das Personal zurück.",
                "Спасибо. Верните устройство сотруднику.",
              )}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full bg-slate-50 flex flex-col overflow-hidden">
      <Card className="w-full max-w-2xl mx-auto shadow-none border-none flex flex-col flex-1 overflow-hidden rounded-none">
        
        {/* Connection Status Header */}
        <div className={`h-2 w-full rounded-t-xl shrink-0 ${connected ? 'bg-emerald-500' : 'bg-amber-400'}`} />
        
        <CardHeader className="text-center pb-2 shrink-0">
          {!connected && (
            <div className="text-xs text-amber-600 mb-2 flex items-center justify-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" />{" "}
              {L(
                "직원 기기와 연결 중...",
                "Connecting to staff device...",
                "Đang kết nối thiết bị nhân viên...",
                "スタッフ端末に接続中…",
                "正在连接员工设备…",
                "Conectando con el dispositivo del personal…",
                "Conectando ao dispositivo da equipe…",
                "Connexion à l’appareil du personnel…",
                "Verbindung mit dem Mitarbeitergerät…",
                "Подключение к устройству персонала…",
              )}
            </div>
          )}
          <CardTitle className="text-2xl font-bold">
            {L(
              "주문 정보 입력",
              "Order details",
              "Nhập thông tin đơn hàng",
              "注文情報の入力",
              "填写订单信息",
              "Datos del pedido",
              "Dados do pedido",
              "Détails de la commande",
              "Bestelldaten",
              "Данные заказа",
            )}
          </CardTitle>
          <CardDescription className="text-base">
            {L(
              "예쁜 상품을 준비하기 위해 구매자/수령자 정보를 입력해주세요.",
              "Please enter buyer and recipient details so we can prepare your order.",
              "Vui lòng nhập thông tin người mua và người nhận để chuẩn bị đơn hàng.",
              "素敵な商品をご用意するため、購入者・受取人の情報を入力してください。",
              "为备好商品，请填写购买人与收件人信息。",
              "Introduzca datos del comprador y del destinatario para preparar su pedido.",
              "Informe comprador e destinatário para prepararmos seu pedido.",
              "Saisissez les infos acheteur et destinataire pour préparer la commande.",
              "Bitte Käufer- und Empfängerdaten eingeben, damit wir die Bestellung vorbereiten können.",
              "Укажите данные покупателя и получателя, чтобы мы подготовили заказ.",
            )}
          </CardDescription>
        </CardHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-8 scrollbar-hide">
          
          {/* 0. Existing Customer Points Banner (only if store uses points) */}
          {existingName && pointRate > 0 && (
            <section className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💎</span>
                  <span className="font-semibold text-emerald-800">
                    {existingName}
                    {L(
                      "님의 포인트",
                      "'s points",
                      " — điểm thưởng",
                      "様のポイント",
                      "的积分",
                      " — puntos",
                      " — pontos",
                      " — points",
                      " — Punkte",
                      " — баллы",
                    )}
                  </span>
                </div>
                <span className="text-2xl font-bold text-emerald-700">{existingPoints.toLocaleString()}<span className="text-sm font-normal ml-0.5">P</span></span>
              </div>
              {minPointUsage > 0 && existingPoints >= minPointUsage ? (
                <div className="bg-white/70 rounded-lg px-3 py-2 flex items-center gap-2">
                  <span className="text-sm">✨</span>
                  <p className="text-xs text-emerald-800 font-medium">
                    {L(
                      `보유 포인트가 ${minPointUsage.toLocaleString()}P 이상이므로 현금처럼 사용 가능합니다! 직원에게 말씀해주세요.`,
                      `You have at least ${minPointUsage.toLocaleString()}P and can spend them like cash—please tell staff.`,
                      `Bạn có ít nhất ${minPointUsage.toLocaleString()}P và có thể dùng như tiền mặt—báo nhân viên nhé.`,
                      `保有ポイントが ${minPointUsage.toLocaleString()}P 以上のため、現金のようにご利用いただけます。スタッフにお声がけください。`,
                      `您至少有 ${minPointUsage.toLocaleString()}P 积分，可像现金一样使用，请告知店员。`,
                      `Tiene al menos ${minPointUsage.toLocaleString()}P y puede usarlos como efectivo—avise al personal.`,
                      `Você tem pelo menos ${minPointUsage.toLocaleString()}P e pode usar como dinheiro—fale com a equipe.`,
                      `Vous avez au moins ${minPointUsage.toLocaleString()}P, utilisables comme du liquide — informez le personnel.`,
                      `Sie haben mindestens ${minPointUsage.toLocaleString()}P und können sie wie Bargeld einlösen — bitte Personal informieren.`,
                      `У вас не менее ${minPointUsage.toLocaleString()}P — можно тратить как наличные; сообщите сотруднику.`,
                    )}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-emerald-600">
                  {minPointUsage > 0
                    ? L(
                        `${minPointUsage.toLocaleString()}P 이상 적립 시 현금과 동일하게 사용하실 수 있습니다.`,
                        `Earn at least ${minPointUsage.toLocaleString()}P to use points like cash.`,
                        `Tích ít nhất ${minPointUsage.toLocaleString()}P để dùng như tiền mặt.`,
                        `${minPointUsage.toLocaleString()}P 以上貯めると現金同様にご利用いただけます。`,
                        `累积满 ${minPointUsage.toLocaleString()}P 后可当现金使用。`,
                        `Acumule al menos ${minPointUsage.toLocaleString()}P para usarlos como efectivo.`,
                        `Ganhe pelo menos ${minPointUsage.toLocaleString()}P para usar como dinheiro.`,
                        `Gagnez au moins ${minPointUsage.toLocaleString()}P pour les utiliser comme du cash.`,
                        `Sammeln Sie mindestens ${minPointUsage.toLocaleString()}P für die Nutzung wie Bargeld.`,
                        `Накопите не менее ${minPointUsage.toLocaleString()}P, чтобы тратить как наличные.`,
                      )
                    : ""}{" "}
                  {L(
                    `(매 구매 시 ${pointRate}% 적립)`,
                    `(${pointRate}% back on each purchase)`,
                    `(${pointRate}% mỗi lần mua)`,
                    `（お買い上げごとに ${pointRate}% 付与）`,
                    `（每笔消费返 ${pointRate}%）`,
                    `(${pointRate}% de reembolso por compra)`,
                    `(${pointRate}% por compra)`,
                    `(${pointRate}% par achat)`,
                    `(${pointRate}% pro Einkauf)`,
                    `(${pointRate}% с каждой покупки)`,
                  )}
                </p>
              )}
            </section>
          )}

          {/* 1. Customer Info (Only show fully if not pre-filled existing customer) */}
          {!existingName && (
            <section className="space-y-4">
              <h3 className="font-semibold text-lg border-b pb-2">
                {L(
                  "구매자 정보",
                  "Buyer details",
                  "Thông tin người mua",
                  "購入者情報",
                  "购买人信息",
                  "Datos del comprador",
                  "Dados do comprador",
                  "Infos acheteur",
                  "Käuferdaten",
                  "Данные покупателя",
                )}
              </h3>
              
              <div className="flex items-center space-x-2 bg-slate-100 p-3 rounded-md">
                <Checkbox 
                  id="anonymous" 
                  checked={isAnonymous} 
                  onCheckedChange={(c) => setIsAnonymous(c as boolean)} 
                />
                <label htmlFor="anonymous" className="text-sm font-medium leading-none cursor-pointer">
                  {L(
                    "개인정보를 입력하지 않고 익명으로 구매할게요",
                    "I’ll purchase anonymously without personal details",
                    "Tôi sẽ mua ẩn danh, không nhập thông tin cá nhân",
                    "個人情報を入力せず匿名で購入します",
                    "不填写个人信息，匿名购买",
                    "Compraré de forma anónima sin datos personales",
                    "Comprarei anonimamente sem dados pessoais",
                    "J’achète anonymement sans données personnelles",
                    "Ich kaufe anonym ohne persönliche Angaben",
                    "Покупаю анонимно без персональных данных",
                  )}
                </label>
              </div>

              {!isAnonymous && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {L(
                        "이름 (필수)",
                        "Name (required)",
                        "Tên (bắt buộc)",
                        "お名前（必須）",
                        "姓名（必填）",
                        "Nombre (obligatorio)",
                        "Nome (obrigatório)",
                        "Nom (obligatoire)",
                        "Name (Pflichtfeld)",
                        "Имя (обязательно)",
                      )}
                    </Label>
                    <Input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder={L(
                        "홍길동",
                        "John Doe",
                        "Nguyễn Văn A",
                        "山田太郎",
                        "张三",
                        "María López",
                        "Maria Silva",
                        "Marie Dupont",
                        "Max Mustermann",
                        "Иван Иванов",
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {L(
                        "연락처 (필수)",
                        "Phone (required)",
                        "SĐT (bắt buộc)",
                        "連絡先（必須）",
                        "电话（必填）",
                        "Teléfono (obligatorio)",
                        "Telefone (obrigatório)",
                        "Téléphone (obligatoire)",
                        "Telefon (Pflichtfeld)",
                        "Телефон (обязательно)",
                      )}
                    </Label>
                    <Input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder={L(
                        "010-0000-0000",
                        "+1 234 567 8900",
                        "0901 234 567",
                        "090-1234-5678",
                        "138-0000-0000",
                        "+34 600 000 000",
                        "+55 11 90000-0000",
                        "+33 6 12 34 56 78",
                        "+49 170 0000000",
                        "+7 900 000-00-00",
                      )}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>
                      {L(
                        "이메일 (선택)",
                        "Email (optional)",
                        "Email (tùy chọn)",
                        "メール（任意）",
                        "邮箱（可选）",
                        "Correo (opcional)",
                        "E-mail (opcional)",
                        "E-mail (facultatif)",
                        "E-Mail (optional)",
                        "Email (необязательно)",
                      )}
                    </Label>
                    <Input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder={L(
                        "hong@example.com",
                        "name@example.com",
                        "ten@email.com",
                        "you@example.com",
                        "you@example.com",
                        "tu@ejemplo.com",
                        "voce@exemplo.com",
                        "vous@exemple.com",
                        "sie@beispiel.de",
                        "vy@primer.ru",
                      )}
                    />
                  </div>
                  <div className="sm:col-span-2 flex items-start space-x-2 mt-2">
                    <Checkbox 
                      id="save-info" 
                      checked={saveCustomer} 
                      onCheckedChange={(c) => setSaveCustomer(c as boolean)} 
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label htmlFor="save-info" className="text-sm font-medium cursor-pointer">
                        {L(
                          "입력한 정보를 매장 고객 정보로 저장하는 데 동의합니다.",
                          "I agree to save this information as my store customer profile.",
                          "Tôi đồng ý lưu thông tin này làm hồ sơ khách tại cửa hàng.",
                          "入力内容を店舗の顧客情報として保存することに同意します。",
                          "同意将所填信息保存为门店客户资料。",
                          "Acepto guardar esta información como perfil de cliente de la tienda.",
                          "Concordo em salvar estas informações como perfil de cliente da loja.",
                          "J’accepte d’enregistrer ces informations comme profil client du magasin.",
                          "Ich stimme zu, diese Daten als Ladenkundenprofil zu speichern.",
                          "Согласен сохранить эти данные как профиль клиента магазина.",
                        )}
                      </label>
                      <p className="text-xs text-slate-500">
                        {L(
                          "저장 시 다음 번 주문할 때 더욱 빠르게 진행할 수 있습니다.",
                          "Saved details make your next order faster.",
                          "Lưu lại giúp lần sau đặt nhanh hơn.",
                          "保存すると次回のご注文がよりスムーズになります。",
                          "保存后下次下单更快。",
                          "Los datos guardados agilizan el próximo pedido.",
                          "Dados salvos deixam o próximo pedido mais rápido.",
                          "Les données enregistrées accélèrent la prochaine commande.",
                          "Gespeicherte Daten beschleunigen die nächste Bestellung.",
                          "Сохранённые данные ускорят следующий заказ.",
                        )}
                      </p>
                      {pointRate > 0 && (
                        <div className="mt-1.5 flex items-start gap-1.5 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                          <span className="text-emerald-600 text-sm mt-0.5">🎁</span>
                          <p className="text-xs text-emerald-700 leading-relaxed">
                            {L(
                              `정보 등록 시 포인트 멤버로 자동 가입되며, 매 구매 금액의 ${pointRate}%가 포인트로 적립됩니다!`,
                              `Saving enrolls you in points—${pointRate}% of each purchase is credited as points!`,
                              `Lưu thông tin sẽ ghi danh điểm thưởng—${pointRate}% mỗi đơn được cộng điểm!`,
                              `保存でポイント会員に自動登録され、お買い上げ金額の ${pointRate}% がポイントとして付与されます！`,
                              `保存即自动加入积分会员，每笔消费金额的 ${pointRate}% 将累积为积分！`,
                              `Al guardar, entras en puntos: ¡${pointRate}% de cada compra se acredita como puntos!`,
                              `Ao salvar, você entra no programa de pontos — ${pointRate}% de cada compra viram pontos!`,
                              `En enregistrant, vous rejoignez les points — ${pointRate}% de chaque achat sont crédités !`,
                              `Beim Speichern nehmen Sie am Punkteprogramm teil — ${pointRate}% pro Einkauf werden gutgeschrieben!`,
                              `При сохранении вы вступаете в программу — ${pointRate}% с каждой покупки начисляются баллами!`,
                            )}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* 2. Receipt Info */}
          <section className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">
              {L(
                "수령 방법",
                "Pickup / delivery",
                "Cách nhận hàng",
                "受け取り方法",
                "取货方式",
                "Recogida / entrega",
                "Retirada / entrega",
                "Retrait / livraison",
                "Abholung / Lieferung",
                "Самовывоз / доставка",
              )}
            </h3>
            <RadioGroup value={receiptType} onValueChange={(val: any) => setReceiptType(val)} className="grid grid-cols-2 gap-4">
              <Label
                htmlFor="delivery"
                className={`flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 cursor-pointer [&:has([data-state=checked])]:border-emerald-600 [&:has([data-state=checked])]:bg-emerald-50`}
              >
                <RadioGroupItem value="delivery_reservation" id="delivery" className="sr-only" />
                <Truck className="mb-3 h-6 w-6 text-slate-700" />
                {L("배송", "Delivery", "Giao hàng", "配達", "配送", "Entrega", "Entrega", "Livraison", "Lieferung", "Доставка")}
              </Label>
              <Label
                htmlFor="pickup"
                className={`flex flex-col items-center justify-between rounded-md border-2 border-slate-200 bg-white p-4 hover:bg-slate-50 cursor-pointer [&:has([data-state=checked])]:border-emerald-600 [&:has([data-state=checked])]:bg-emerald-50`}
              >
                <RadioGroupItem value="store_pickup" id="pickup" className="sr-only" />
                <Store className="mb-3 h-6 w-6 text-slate-700" />
                {L(
                  "매장 픽업",
                  "Store pickup",
                  "Lấy tại cửa hàng",
                  "店頭受取",
                  "到店自取",
                  "Recogida en tienda",
                  "Retirada na loja",
                  "Retrait en magasin",
                  "Abholung im Laden",
                  "Самовывоз из магазина",
                )}
              </Label>
            </RadioGroup>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="space-y-2">
                <Label>
                  {L(
                    "희망 날짜",
                    "Preferred date",
                    "Ngày mong muốn",
                    "希望日",
                    "希望日期",
                    "Fecha preferida",
                    "Data preferida",
                    "Date souhaitée",
                    "Wunschdatum",
                    "Желаемая дата",
                  )}
                </Label>
                <Input type="date" value={date} onChange={e => setDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>
                  {L(
                    "희망 시간",
                    "Preferred time",
                    "Giờ mong muốn",
                    "希望時間",
                    "希望时间",
                    "Hora preferida",
                    "Horário preferido",
                    "Heure souhaitée",
                    "Wunschzeit",
                    "Желаемое время",
                  )}
                </Label>
                <select
                  value={time}
                  onChange={e => setTime(e.target.value)}
                  className="flex h-10 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  {Array.from({ length: 31 }, (_, i) => {
                    const hour = Math.floor(i / 2) + 7;
                    const min = i % 2 === 0 ? "00" : "30";
                    const val = `${String(hour).padStart(2, '0')}:${min}`;
                    return <option key={val} value={val}>{val}</option>;
                  })}
                </select>
              </div>
            </div>

            {receiptType === "delivery_reservation" && (
              <div className="bg-slate-50 p-4 rounded-xl border space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      {L(
                        "받는 분 성함",
                        "Recipient name",
                        "Tên người nhận",
                        "受取人のお名前",
                        "收件人姓名",
                        "Nombre del destinatario",
                        "Nome do destinatário",
                        "Nom du destinataire",
                        "Name des Empfängers",
                        "Имя получателя",
                      )}
                    </Label>
                    <Input
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder={L(
                        "김철수",
                        "Jane Doe",
                        "Trần Thị B",
                        "山田花子",
                        "李四",
                        "María García",
                        "Maria Souza",
                        "Marie Dupont",
                        "Anna Schmidt",
                        "Елена Петрова",
                      )}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>
                      {L(
                        "받는 분 연락처",
                        "Recipient phone",
                        "SĐT người nhận",
                        "受取人の電話",
                        "收件人电话",
                        "Teléfono del destinatario",
                        "Telefone do destinatário",
                        "Téléphone du destinataire",
                        "Telefon des Empfängers",
                        "Телефон получателя",
                      )}
                    </Label>
                    <Input
                      type="tel"
                      value={recipientPhone}
                      onChange={(e) => setRecipientPhone(e.target.value)}
                      placeholder={L(
                        "010-0000-0000",
                        "+1 234 567 8900",
                        "0901 234 567",
                        "090-1234-5678",
                        "138-0000-0000",
                        "+34 600 000 000",
                        "+55 11 90000-0000",
                        "+33 6 12 34 56 78",
                        "+49 170 0000000",
                        "+7 900 000-00-00",
                      )}
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2 relative">
                    <Label>
                      {L(
                        "배송지 주소",
                        "Delivery address",
                        "Địa chỉ giao hàng",
                        "配送先住所",
                        "配送地址",
                        "Dirección de entrega",
                        "Endereço de entrega",
                        "Adresse de livraison",
                        "Lieferadresse",
                        "Адрес доставки",
                      )}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder={L(
                          "주소 검색 버튼을 눌러주세요",
                          "Tap search to find address",
                          "Chạm tìm kiếm để nhập địa chỉ",
                          "住所検索ボタンを押してください",
                          "请点击地址搜索",
                          "Pulse búsqueda para la dirección",
                          "Toque em buscar para o endereço",
                          "Appuyez sur recherche pour l’adresse",
                          "Tippen Sie auf Suche für die Adresse",
                          "Нажмите «Поиск» для адреса",
                        )}
                        readOnly
                        onClick={openAddressSearch}
                        className="cursor-pointer"
                      />
                      <Button variant="outline" type="button" className="shrink-0 gap-1 flex" onClick={openAddressSearch}>
                        <MapPin className="w-4 h-4" />{" "}
                        {L(
                          "주소 검색",
                          "Address search",
                          "Tìm địa chỉ",
                          "住所検索",
                          "搜索地址",
                          "Buscar dirección",
                          "Buscar endereço",
                          "Rechercher l’adresse",
                          "Adresse suchen",
                          "Поиск адреса",
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* 3. Message Info */}
          <section className="space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">
              {L(
                "메시지 (리본/카드)",
                "Message (ribbon / card)",
                "Lời nhắn (ruy băng / thiệp)",
                "メッセージ（リボン／カード）",
                "留言（丝带／卡片）",
                "Mensaje (cinta / tarjeta)",
                "Mensagem (fita / cartão)",
                "Message (ruban / carte)",
                "Nachricht (Band / Karte)",
                "Сообщение (лента / открытка)",
              )}
            </h3>
            <RadioGroup value={messageType} onValueChange={(val: any) => setMessageType(val)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="none" id="msg-none" />
                <Label htmlFor="msg-none">
                  {L("없음", "None", "Không", "なし", "无", "Ninguno", "Nenhum", "Aucun", "Keine", "Нет")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ribbon" id="msg-ribbon" />
                <Label htmlFor="msg-ribbon">
                  {L("리본", "Ribbon", "Ruy băng", "リボン", "丝带", "Cinta", "Fita", "Ruban", "Band", "Лента")}
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="card" id="msg-card" />
                <Label htmlFor="msg-card">
                  {L("카드", "Card", "Thiệp", "カード", "卡片", "Tarjeta", "Cartão", "Carte", "Karte", "Открытка")}
                </Label>
              </div>
            </RadioGroup>

            {messageType !== "none" && (
              <div className="space-y-4 pt-2">
                {messageType === "ribbon" && (
                  <div className="bg-amber-50 p-4 rounded-xl text-sm text-amber-800 border border-amber-100 flex flex-col gap-2">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <Label className="text-amber-900 font-bold">
                          {L(
                            "경조사어 (오른쪽 리본)",
                            "Occasion text (right ribbon)",
                            "Lời chúc (ruy băng phải)",
                            "祝辞（右リボン）",
                            "祝词（右侧丝带）",
                            "Texto ocasión (cinta derecha)",
                            "Texto ocasião (fita direita)",
                            "Texte occasion (ruban droit)",
                            "Anlass-Text (rechtes Band)",
                            "Текст поздравления (правая лента)",
                          )}
                        </Label>
                        <Input
                          value={messageContent}
                          onChange={(e) => setMessageContent(e.target.value)}
                          placeholder={L(
                            "축 발전",
                            "e.g. Congratulations",
                            "vd: Chúc mừng",
                            "例: 御祝",
                            "例如：祝贺",
                            "p. ej. Felicidades",
                            "ex.: Parabéns",
                            "ex. : Félicitations",
                            "z. B. Glückwunsch",
                            "напр.: Поздравляем",
                          )}
                          className="bg-white"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <Label className="text-amber-900 font-bold">
                          {L(
                            "보내는 분 (왼쪽 리본)",
                            "Sender (left ribbon)",
                            "Người gửi (ruy băng trái)",
                            "贈り主（左リボン）",
                            "赠送人（左侧丝带）",
                            "Remitente (cinta izquierda)",
                            "Remetente (fita esquerda)",
                            "Expéditeur (ruban gauche)",
                            "Absender (linkes Band)",
                            "От кого (левая лента)",
                          )}
                        </Label>
                        <Input
                          value={messageSender}
                          onChange={(e) => setMessageSender(e.target.value)}
                          placeholder={L(
                            "홍길동 올림",
                            "From: Jane",
                            "Từ: Nguyễn A",
                            "山田より",
                            "张三敬上",
                            "De: María",
                            "De: Maria",
                            "De : Marie",
                            "Von: Max",
                            "От: Иван",
                          )}
                          className="bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
                
                {messageType === "card" && (
                  <div className="space-y-2">
                    <Label>
                      {L(
                        "카드 내용",
                        "Card message",
                        "Nội dung thiệp",
                        "カード文面",
                        "卡片留言",
                        "Mensaje de la tarjeta",
                        "Mensagem do cartão",
                        "Texte de la carte",
                        "Kartentext",
                        "Текст открытки",
                      )}
                    </Label>
                    <Textarea
                      value={messageContent}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageContent(e.target.value)}
                      placeholder={L(
                        "카드에 적을 메시지를 자유롭게 작성해주세요",
                        "Write your card message here",
                        "Viết lời nhắn trên thiệp tại đây",
                        "カードに印刷するメッセージを自由に入力してください",
                        "请在此填写要印在卡片上的留言",
                        "Escriba aquí el mensaje para la tarjeta",
                        "Escreva aqui a mensagem do cartão",
                        "Saisissez ici le message pour la carte",
                        "Nachricht für die Karte hier eingeben",
                        "Введите текст для открытки",
                      )}
                      className="resize-none h-24 bg-white"
                    />
                  </div>
                )}
              </div>
            )}
          </section>

          {/* 4. Price Summary */}
          <section className="bg-slate-50 rounded-xl border p-4 space-y-2">
            <h3 className="font-semibold text-lg border-b pb-2">
              {L(
                "결제 내역",
                "Payment summary",
                "Thanh toán",
                "お支払い内容",
                "费用明细",
                "Resumen de pago",
                "Resumo do pagamento",
                "Récapitulatif du paiement",
                "Zahlungsübersicht",
                "Сводка по оплате",
              )}
            </h3>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">
                {L(
                  "상품 합계",
                  "Subtotal",
                  "Tạm tính",
                  "商品小計",
                  "商品小计",
                  "Subtotal",
                  "Subtotal",
                  "Sous-total",
                  "Zwischensumme",
                  "Промежуточный итог",
                )}
              </span>
              <span className="font-medium">
                {basePrice.toLocaleString()}
                {L("원", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW")}
              </span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-slate-600">
                  {L(
                    "예상 배송비",
                    "Est. delivery fee",
                    "Phí giao hàng dự kiến",
                    "予想配送料",
                    "预计运费",
                    "Gastos de envío est.",
                    "Taxa de entrega est.",
                    "Frais de livraison est.",
                    "Vorauss. Liefergebühr",
                    "Ориентир. доставка",
                  )}
                </span>
                <span className="font-medium">
                  {deliveryFee.toLocaleString()}
                  {L("원", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW")}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center border-t pt-2 mt-1">
              <span className="font-bold text-emerald-800">
                {L(
                  "총 결제 금액",
                  "Total",
                  "Tổng cộng",
                  "お支払い合計",
                  "应付总额",
                  "Total a pagar",
                  "Total a pagar",
                  "Total à payer",
                  "Gesamtbetrag",
                  "Итого к оплате",
                )}
              </span>
              <span className="font-bold text-xl text-emerald-600">
                {(basePrice + deliveryFee).toLocaleString()}
                {L("원", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW")}
              </span>
            </div>
          </section>

        </div>

        {/* Footer - Compact fixed bottom */}
        <div className="shrink-0 border-t bg-white px-4 py-3 safe-area-pb">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <p className="text-xs text-slate-500">
                {L(
                  "총 결제 금액",
                  "Total",
                  "Tổng cộng",
                  "お支払い合計",
                  "应付总额",
                  "Total a pagar",
                  "Total a pagar",
                  "Total à payer",
                  "Gesamtbetrag",
                  "Итого к оплате",
                )}
              </p>
              <p className="text-xl font-bold text-emerald-700">
                {(basePrice + deliveryFee).toLocaleString()}
                {L("원", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW", " KRW")}
              </p>
            </div>
            <Button 
              className="flex-1 h-12 text-base font-bold bg-emerald-600 hover:bg-emerald-700" 
              onClick={handleSubmit}
              disabled={!connected || loading}
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                L(
                  "입력 완료 ✅",
                  "Submit ✅",
                  "Hoàn tất ✅",
                  "入力完了 ✅",
                  "完成提交 ✅",
                  "Enviar ✅",
                  "Enviar ✅",
                  "Envoyer ✅",
                  "Absenden ✅",
                  "Отправить ✅",
                )
              )}
            </Button>
          </div>
          {!connected && (
            <p className="text-xs text-amber-600 mt-1 text-center">
              {L(
                "인터넷 연결 상태를 확인해주세요.",
                "Please check your internet connection.",
                "Vui lòng kiểm tra kết nối mạng.",
                "インターネット接続を確認してください。",
                "请检查网络连接。",
                "Compruebe su conexión a Internet.",
                "Verifique sua conexão com a Internet.",
                "Vérifiez votre connexion Internet.",
                "Bitte prüfen Sie Ihre Internetverbindung.",
                "Проверьте подключение к интернету.",
              )}
            </p>
          )}
        </div>

      </Card>
    </div>
  );
}
