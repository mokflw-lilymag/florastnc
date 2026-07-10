/** 제작·배송완료 이메일 기본 HTML 템플릿 ({회사명}, {{shop_logo}} 등은 발송 시 치환) */

export const DEFAULT_EMAIL_TEMPLATE_PRODUCTION_COMPLETE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>제작 완료 알림</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf7f7; font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(186, 120, 120, 0.08); border: 1px solid #f5ebeb;">
    <div style="background: linear-gradient(135deg, #fdf2f2 0%, #fce7f3 100%); padding: 40px 24px; text-align: center; border-bottom: 1px solid #fae8e8;">
      {{shop_logo}}
      <h1 style="margin: 0; font-size: 28px; color: #be185d; font-weight: 800; letter-spacing: -0.5px;">{회사명}</h1>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #db2777; font-weight: 600; letter-spacing: 1px;">제작 완료 안내</p>
    </div>
    <div style="padding: 40px 32px; text-align: center;">
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #2d2525; font-weight: bold; line-height: 1.5;">
        안녕하세요, {고객명}님!<br>
        주문하신 꽃이 아름답게 제작되었습니다.
      </h2>
      <p style="margin: 0 0 32px 0; font-size: 14px; color: #665b5b; line-height: 1.8;">
        정성을 다해 어레인지먼트를 완료하였습니다.<br>
        배송 출발 전, 완성된 실제 사진을 아래에서 미리 확인해 주세요.
      </p>
      {{delivery_image}}
      <div style="background-color: #fff9f9; border-radius: 16px; padding: 24px; margin-top: 32px; border: 1px solid #fceef0;">
        <h3 style="margin: 0 0 16px 0; font-size: 13px; color: #9c8485; font-weight: bold;">제작 완료 상세 정보</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #fce8ea;">
            <td style="padding: 12px 0; color: #9c8485; width: 30%;">주문번호</td>
            <td style="padding: 12px 0; color: #4a3739; font-weight: 600; font-family: monospace;">{주문번호}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #9c8485;">담당</td>
            <td style="padding: 12px 0; color: #db2777; font-weight: 600;">{회사명}</td>
          </tr>
        </table>
      </div>
      {포인트안내}
      <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f5ebeb; padding-top: 24px;">
        <p style="margin: 0; font-size: 11px; color: #b5a6a6; line-height: 1.6;">본 메일은 발신전용입니다. 문의는 매장으로 연락해 주세요.</p>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #9c8485; font-weight: bold;">© {회사명}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

export const DEFAULT_EMAIL_TEMPLATE_DELIVERY_COMPLETE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>배송 완료 알림</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf7f7; font-family: 'Noto Sans KR', 'Malgun Gothic', sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(186, 120, 120, 0.08); border: 1px solid #f5ebeb;">
    <div style="background: linear-gradient(135deg, #fdf2f2 0%, #fce7f3 100%); padding: 40px 24px; text-align: center; border-bottom: 1px solid #fae8e8;">
      {{shop_logo}}
      <h1 style="margin: 0; font-size: 28px; color: #be185d; font-weight: 800; letter-spacing: -0.5px;">{회사명}</h1>
      <p style="margin: 8px 0 0 0; font-size: 13px; color: #db2777; font-weight: 600; letter-spacing: 1px;">배송 완료 안내</p>
    </div>
    <div style="padding: 40px 32px; text-align: center;">
      <h2 style="margin: 0 0 20px 0; font-size: 20px; color: #2d2525; font-weight: bold; line-height: 1.5;">
        안녕하세요, {고객명}님!<br>
        소중한 마음을 담은 꽃이 배송되었습니다.
      </h2>
      <p style="margin: 0 0 32px 0; font-size: 14px; color: #665b5b; line-height: 1.8;">
        이용해 주셔서 진심으로 감사드립니다.<br>
        배송 완료 사진은 아래에서 확인하실 수 있습니다.
      </p>
      {{delivery_image}}
      <div style="background-color: #fff9f9; border-radius: 16px; padding: 24px; margin-top: 32px; border: 1px solid #fceef0;">
        <h3 style="margin: 0 0 16px 0; font-size: 13px; color: #9c8485; font-weight: bold;">배송 완료 상세 정보</h3>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr style="border-bottom: 1px solid #fce8ea;">
            <td style="padding: 12px 0; color: #9c8485; width: 30%;">주문번호</td>
            <td style="padding: 12px 0; color: #4a3739; font-weight: 600; font-family: monospace;">{주문번호}</td>
          </tr>
          <tr style="border-bottom: 1px solid #fce8ea;">
            <td style="padding: 12px 0; color: #9c8485;">배송완료일</td>
            <td style="padding: 12px 0; color: #4a3739; font-weight: 600;">{배송일}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #9c8485;">수령인</td>
            <td style="padding: 12px 0; color: #4a3739; font-weight: 600;">{수령인}</td>
          </tr>
        </table>
      </div>
      {포인트안내}
      <div style="margin-top: 40px; text-align: center; border-top: 1px solid #f5ebeb; padding-top: 24px;">
        <p style="margin: 0; font-size: 11px; color: #b5a6a6; line-height: 1.6;">본 메일은 발신전용입니다. 문의는 매장으로 연락해 주세요.</p>
        <p style="margin: 6px 0 0 0; font-size: 12px; color: #9c8485; font-weight: bold;">© {회사명}</p>
      </div>
    </div>
  </div>
</body>
</html>`;

export const DEFAULT_EMAIL_TEMPLATE_ANNIVERSARY_D7 = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>기념일 안내</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf7f7; font-family: 'Noto Sans KR', sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #f5ebeb;">
    <div style="background: linear-gradient(135deg, #fdf2f2 0%, #fce7f3 100%); padding: 32px 24px; text-align: center;">
      {{shop_logo}}
      <h1 style="margin: 0; font-size: 24px; color: #be185d;">{회사명}</h1>
      <p style="margin: 8px 0 0; font-size: 13px; color: #db2777;">기념일 7일 전 안내</p>
    </div>
    <div style="padding: 32px 28px; text-align: center;">
      <h2 style="margin: 0 0 16px; font-size: 18px; color: #2d2525;">안녕하세요, {고객명}님!</h2>
      <p style="margin: 0 0 24px; font-size: 14px; color: #665b5b; line-height: 1.8;">
        <strong>{기념일명}</strong>({기념일})이 일주일 앞으로 다가왔습니다.<br>
        소중한 분께 마음을 전할 준비, 저희가 도와드릴게요.
      </p>
      <div style="text-align: center; margin: 28px 0;">
        <a href="{주문링크}" style="display: inline-block; padding: 14px 28px; background: #db2777; color: #fff; text-decoration: none; border-radius: 999px; font-weight: bold; font-size: 14px;">1클릭 주문하기</a>
      </div>
      {포인트안내}
      <div style="margin-top: 32px; text-align: center; border-top: 1px solid #f5ebeb; padding-top: 24px;">
        <p style="margin: 0; font-size: 11px; color: #b5a6a6;">본 메일은 발신전용입니다.</p>
    </div>
  </div>
</body>
</html>`;

export const DEFAULT_EMAIL_TEMPLATE_ANNIVERSARY_DAY_OF = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>기념일 축하 안내</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf7f7; font-family: 'Noto Sans KR', sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #f5ebeb;">
    <div style="background: linear-gradient(135deg, #fdf2f2 0%, #fce7f3 100%); padding: 32px 24px; text-align: center;">
      {{shop_logo}}
      <h1 style="margin: 0; font-size: 24px; color: #be185d;">{회사명}</h1>
      <p style="margin: 8px 0 0; font-size: 13px; color: #db2777;">기념일 축하 안내</p>
    </div>
    <div style="padding: 32px 28px; text-align: center;">
      <h2 style="margin: 0 0 16px; font-size: 18px; color: #2d2525;">안녕하세요, {고객명}님!</h2>
      <p style="margin: 0 0 24px; font-size: 14px; color: #665b5b; line-height: 1.8;">
        오늘 <strong>{기념일명}</strong>을 진심으로 축하드립니다.<br>
        소중한 분들과 행복한 하루 보내시길 바랍니다.
      </p>
      {포인트안내}
      <div style="margin-top: 32px; text-align: center; border-top: 1px solid #f5ebeb; padding-top: 24px;">
        <p style="margin: 0; font-size: 11px; color: #b5a6a6;">본 메일은 발신전용입니다.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

export const DEFAULT_EMAIL_TEMPLATE_FIRST_PURCHASE = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>첫 구매 감사 인사</title>
</head>
<body style="margin: 0; padding: 0; background-color: #faf7f7; font-family: 'Noto Sans KR', sans-serif;">
  <div style="max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #f5ebeb;">
    <div style="background: linear-gradient(135deg, #fdf2f2 0%, #fce7f3 100%); padding: 32px 24px; text-align: center;">
      {{shop_logo}}
      <h1 style="margin: 0; font-size: 24px; color: #be185d;">{회사명}</h1>
      <p style="margin: 8px 0 0; font-size: 13px; color: #db2777;">첫 구매 감사 인사</p>
    </div>
    <div style="padding: 32px 28px; text-align: center;">
      <h2 style="margin: 0 0 16px; font-size: 18px; color: #2d2525;">안녕하세요, {고객명}님!</h2>
      <p style="margin: 0 0 24px; font-size: 14px; color: #665b5b; line-height: 1.8;">
        저희 {회사명}을 이용해주셔서 진심으로 감사드립니다.<br>
        앞으로도 정성을 다하는 모습 보여드리겠습니다. 감사합니다!
      </p>
      {포인트안내}
      <div style="margin-top: 32px; text-align: center; border-top: 1px solid #f5ebeb; padding-top: 24px;">
        <p style="margin: 0; font-size: 11px; color: #b5a6a6;">본 메일은 발신전용입니다.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

