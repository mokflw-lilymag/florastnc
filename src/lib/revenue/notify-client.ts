/** 브라우저 게시 알림 (P1-U11) */
export async function requestPublishNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function notifyCopiedForPublish(channel: "instagram" | "naver", orderNumber?: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const body =
    channel === "instagram"
      ? `${orderNumber ? `[${orderNumber}] ` : ""}인스타그램에 붙여넣고 게시해 주세요 📸`
      : `${orderNumber ? `[${orderNumber}] ` : ""}네이버 블로그에 붙여넣고 발행해 주세요 ✍️`;

  new Notification("Floxync · SNS 초안 복사 완료", { body, tag: `floxync-sns-${channel}` });
}
