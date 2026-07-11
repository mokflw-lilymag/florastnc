export function getDefaultMessageTemplate(locale: string): string {
  if (locale.startsWith("ko")) {
    return "안녕하세요 {고객명}님의 주문이 {상태}되었습니다. 감사합니다.";
  }
  if (locale.startsWith("ja")) {
    return "こんにちは、{고객명}様。ご注文が{상태}されました。ありがとうございます。";
  }
  if (locale.startsWith("vi")) {
    return "Xin chào {고객명}, Đơn hàng của bạn đã {상태}. Cảm ơn bạn.";
  }
  return "Hello {고객명}, your order is {상태}. Thank you.";
}

export function getDefaultKakaoTemplates(locale: string) {
  if (locale.startsWith("ko")) {
    return {
      productionComplete: "안녕하세요 {고객명}님, {회사명}입니다. \\n주문하신 상품이 예쁘게 제작 완료되었습니다! \\n\\n{사진링크}{할인안내}",
      deliveryComplete: "안녕하세요 {고객명}님, {회사명}입니다. \\n주문하신 상품이 배송 완료되었습니다.\\n이용해 주셔서 감사합니다! \\n\\n{사진링크}{할인안내}",
      marketingDayOf: "안녕하세요 {고객명}님, \\n오늘 {기념일명}을 진심으로 축하드립니다.\\n행복하고 특별한 하루 보내시길 바랍니다! \\n\\n- {회사명} 올림{할인안내}",
      marketingDaysBefore7: "안녕하세요 {고객명}님, \\n다음 주 다가오는 {기념일명}을 위해 아름다운 꽃을 선물해보는 건 어떨까요?\\n{회사명}에서 정성을 다해 준비해 드릴게요! \\n\\n{할인안내}",
      marketingFirstPurchase: "안녕하세요 {고객명}님, {회사명}입니다. \\n첫 구매에 진심으로 감사드립니다!\\n앞으로도 정성을 다하는 {회사명}이 되겠습니다. \\n\\n{할인안내}",
    };
  }
  
  if (locale.startsWith("ja")) {
    return {
      productionComplete: "こんにちは、{고객명}様。{회사명}です。\\nご注文の商品が綺麗に仕上がりました！\\n\\n{사진링크}{할인안내}",
      deliveryComplete: "こんにちは、{고객명}様。{회사명}です。\\nご注文の商品の配達が完了いたしました。\\nご利用ありがとうございました！\\n\\n{사진링크}{할인안내}",
      marketingDayOf: "こんにちは、{고객명}様。\\n本日の{기념일명}、心よりお祝い申し上げます。\\n幸せで特別な一日をお過ごしください！\\n\\n- {회사명}より{할인안내}",
      marketingDaysBefore7: "こんにちは、{고객명}様。\\n来週の{기념일명}に向けて、美しいお花をプレゼントしてみてはいかがでしょうか？\\n{회사명}が心を込めてご準備いたします！\\n\\n{할인안내}",
      marketingFirstPurchase: "こんにちは、{고객명}様。{회사명}です。\\n初めてのご購入、誠にありがとうございます！\\nこれからも心を込めたサービスを提供してまいります。\\n\\n{할인안내}",
    };
  }

  if (locale.startsWith("vi")) {
    return {
      productionComplete: "Xin chào {고객명}, đây là {회사명}.\\nĐơn hàng của bạn đã được hoàn thành đẹp mắt!\\n\\n{사진링크}{할인안내}",
      deliveryComplete: "Xin chào {고객명}, đây là {회사명}.\\nĐơn hàng của bạn đã được giao thành công.\\nCảm ơn bạn đã sử dụng dịch vụ của chúng tôi!\\n\\n{사진링크}{할인안내}",
      marketingDayOf: "Xin chào {고객명},\\nChúc mừng {기념일명} của bạn hôm nay.\\nChúc bạn một ngày hạnh phúc và đặc biệt!\\n\\n- Từ {회사명}{할인안내}",
      marketingDaysBefore7: "Xin chào {고객명},\\nBạn nghĩ sao về việc tặng một bó hoa xinh đẹp cho {기념일명} sắp tới vào tuần sau?\\n{회사명} sẽ chuẩn bị cẩn thận cho bạn!\\n\\n{할인안내}",
      marketingFirstPurchase: "Xin chào {고객명}, đây là {회사명}.\\nCảm ơn bạn rất nhiều vì đơn hàng đầu tiên!\\nChúng tôi sẽ tiếp tục cung cấp dịch vụ tận tâm nhất.\\n\\n{할인안내}",
    };
  }

  return {
    productionComplete: "Hello {고객명}, this is {회사명}. \\nYour order has been beautifully prepared! \\n\\n{사진링크}{할인안내}",
    deliveryComplete: "Hello {고객명}, this is {회사명}. \\nYour order has been successfully delivered.\\nThank you for choosing us! \\n\\n{사진링크}{할인안내}",
    marketingDayOf: "Hello {고객명}, \\nCongratulations on your {기념일명} today.\\nWe hope you have a happy and special day! \\n\\n- From {회사명}{할인안내}",
    marketingDaysBefore7: "Hello {고객명}, \\nHow about gifting some beautiful flowers for the upcoming {기념일명} next week?\\n{회사명} will prepare them with care! \\n\\n{할인안내}",
    marketingFirstPurchase: "Hello {고객명}, this is {회사명}. \\nThank you so much for your first purchase!\\nWe will continue to serve you with our best. \\n\\n{할인안내}",
  };
}

export function getDefaultEmailTemplates(locale: string) {
  const getHtml = (title: string, subtitle: string, greeting: string, message: string, linkHtml: string = "") => `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>\${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf7f7; font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(186, 120, 120, 0.08); border: 1px solid #f5ebeb;">
    <div style="background: linear-gradient(135deg, #fdf2f2 0%, #fce7f3 100%); padding: 40px 24px; text-align: center; border-bottom: 1px solid #fae8e8;">
      {{shop_logo}}
      <h1 style="margin: 0; font-size: 28px; color: #be185d; font-weight: 800; letter-spacing: -0.5px;">{회사명}</h1>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #db2777; font-weight: 600; letter-spacing: 1px;">\${subtitle}</p>
    </div>
    <div style="padding: 40px 32px; text-align: center;">
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #2d2525; font-weight: bold; line-height: 1.5;">
        \${greeting}
      </h2>
      <p style="margin: 0 0 32px 0; font-size: 14px; color: #665b5b; line-height: 1.8;">
        \${message}
      </p>
      {{delivery_image}}
      \${linkHtml}
      {할인안내}
      <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f5ebeb; padding-top: 24px;">
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #9c8485; font-weight: bold;">© {회사명}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  if (locale.startsWith("ko")) {
    return {
      productionComplete: getHtml(
        "제작 완료 알림", "제작 완료 안내", 
        "안녕하세요 {고객명}님<br>주문하신 상품이 정성껏 제작되었습니다.", 
        "이용해 주셔서 진심으로 감사합니다.<br>완성된 사진은 아래에서 확인하실 수 있습니다."
      ),
      deliveryComplete: getHtml(
        "배송 완료 알림", "배송 완료 안내", 
        "안녕하세요 {고객명}님<br>소중한 마음이 담긴 꽃이 배송되었습니다.", 
        "이용해 주셔서 진심으로 감사합니다.<br>배송 완료 사진은 아래에서 확인하실 수 있습니다."
      ),
      marketingDayOf: getHtml(
        "기념일 축하 안내", "기념일 축하 안내", 
        "안녕하세요 {고객명}님", 
        "오늘 <strong>{기념일명}</strong>을 진심으로 축하드립니다.<br>소중한 분들과 행복한 하루 보내시길 바랍니다."
      ),
      marketingDaysBefore7: getHtml(
        "기념일 안내", "기념일 7일 전 안내", 
        "안녕하세요 {고객명}님", 
        "<strong>{기념일명}</strong>({기념일})이 다음 주로 다가왔습니다.<br>소중한 분께 마음을 전할 준비 저희가 도와드릴게요.",
        '<div style="text-align: center; margin: 28px 0;"><a href="{주문링크}" style="display: inline-block; padding: 14px 28px; background: #db2777; color: #fff; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 14px;">1클릭 주문하기</a></div>'
      ),
      marketingFirstPurchase: getHtml(
        "첫 구매 감사 인사", "첫 구매 감사 인사", 
        "안녕하세요 {고객명}님", 
        "처음 {회사명}을 이용해주셔서 진심으로 감사드립니다.<br>앞으로도 정성을 다하는 모습 보여드리겠습니다. 감사합니다."
      ),
    };
  }

  if (locale.startsWith("ja")) {
    return {
      productionComplete: getHtml(
        "製作完了のお知らせ", "製作完了のご案内", 
        "こんにちは、{고객명}様<br>ご注文いただいた商品が丁寧に仕上がりました。", 
        "ご利用いただき誠にありがとうございます。<br>完成したお写真は以下よりご確認いただけます。"
      ),
      deliveryComplete: getHtml(
        "配達完了のお知らせ", "配達完了のご案内", 
        "こんにちは、{고객명}様<br>大切な想いが込められたお花をお届けいたしました。", 
        "ご利用いただき誠にありがとうございます。<br>配達完了のお写真は以下よりご確認いただけます。"
      ),
      marketingDayOf: getHtml(
        "記念日のお祝い", "記念日のお祝い", 
        "こんにちは、{고객명}様", 
        "本日の<strong>{기념일명}</strong>、心よりお祝い申し上げます。<br>大切な方々と幸せな一日をお過ごしください。"
      ),
      marketingDaysBefore7: getHtml(
        "記念日のご案内", "記念日7日前の案内", 
        "こんにちは、{고객명}様", 
        "<strong>{기념일명}</strong>({기념일})が来週に迫ってまいりました。<br>大切な方へ想いを伝えるご準備、私たちがサポートいたします。",
        '<div style="text-align: center; margin: 28px 0;"><a href="{주문링크}" style="display: inline-block; padding: 14px 28px; background: #db2777; color: #fff; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 14px;">1クリックで注文</a></div>'
      ),
      marketingFirstPurchase: getHtml(
        "初回購入のお礼", "初回購入のお礼", 
        "こんにちは、{고객명}様", 
        "初めて{회사명}をご利用いただき誠にありがとうございます。<br>これからも心を込めたサービスを提供してまいります。"
      ),
    };
  }

  if (locale.startsWith("vi")) {
    return {
      productionComplete: getHtml(
        "Thông báo hoàn thành", "Hướng dẫn hoàn thành", 
        "Xin chào {고객명}<br>Đơn hàng của bạn đã được chuẩn bị cẩn thận.", 
        "Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.<br>Bạn có thể xem ảnh hoàn thiện bên dưới."
      ),
      deliveryComplete: getHtml(
        "Thông báo giao hàng", "Hướng dẫn giao hàng", 
        "Xin chào {고객명}<br>Hoa với những tâm tình quý giá đã được giao thành công.", 
        "Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi.<br>Bạn có thể xem ảnh giao hàng bên dưới."
      ),
      marketingDayOf: getHtml(
        "Chúc mừng kỷ niệm", "Thông báo chúc mừng kỷ niệm", 
        "Xin chào {고객명}", 
        "Chúc mừng <strong>{기념일명}</strong> của bạn hôm nay.<br>Chúc bạn một ngày hạnh phúc bên những người thân yêu."
      ),
      marketingDaysBefore7: getHtml(
        "Thông báo kỷ niệm", "Thông báo trước 7 ngày kỷ niệm", 
        "Xin chào {고객명}", 
        "<strong>{기념일명}</strong> ({기념일}) đang đến gần vào tuần sau.<br>Chúng tôi sẽ giúp bạn chuẩn bị gửi gắm tâm tình đến người thân yêu.",
        '<div style="text-align: center; margin: 28px 0;"><a href="{주문링크}" style="display: inline-block; padding: 14px 28px; background: #db2777; color: #fff; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 14px;">Đặt hàng với 1 click</a></div>'
      ),
      marketingFirstPurchase: getHtml(
        "Cảm ơn đơn hàng đầu tiên", "Cảm ơn đơn hàng đầu tiên", 
        "Xin chào {고객명}", 
        "Cảm ơn bạn rất nhiều vì đã lần đầu sử dụng {회사명}.<br>Chúng tôi sẽ tiếp tục cung cấp dịch vụ tận tâm nhất."
      ),
    };
  }

  // Default to English
  return {
    productionComplete: getHtml(
      "Production Complete Notification", "Production Complete Guide", 
      "Hello {고객명}<br>Your ordered item has been carefully prepared.", 
      "Thank you for choosing our service.<br>You can check the completion photos below."
    ),
    deliveryComplete: getHtml(
      "Delivery Complete Notification", "Delivery Complete Guide", 
      "Hello {고객명}<br>The flowers carrying your precious sentiments have been delivered.", 
      "Thank you for choosing our service.<br>You can check the delivery photos below."
    ),
    marketingDayOf: getHtml(
      "Anniversary Celebration Guide", "Anniversary Celebration Guide", 
      "Hello {고객명}", 
      "Congratulations on your <strong>{기념일명}</strong> today.<br>We hope you have a happy day with your loved ones."
    ),
    marketingDaysBefore7: getHtml(
      "Anniversary Guide", "7 Days Before Anniversary", 
      "Hello {고객명}", 
      "Your <strong>{기념일명}</strong> ({기념일}) is approaching next week.<br>We'll help you prepare to convey your feelings to your loved ones.",
      '<div style="text-align: center; margin: 28px 0;"><a href="{주문링크}" style="display: inline-block; padding: 14px 28px; background: #db2777; color: #fff; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 14px;">1-Click Order</a></div>'
    ),
    marketingFirstPurchase: getHtml(
      "Thank You for Your First Purchase", "Thank You for Your First Purchase", 
      "Hello {고객명}", 
      "Thank you so much for using {회사명} for the first time.<br>We will continue to do our best to serve you."
    ),
  };
}
