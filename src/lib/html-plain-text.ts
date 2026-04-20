/** HTML 본문을 배너·미리보기용 짧은 일반 텍스트로 변환합니다. */
export function htmlToPlainText(html: string): string {
  if (!html) return "";
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isRichTextBodyEmpty(html: string): boolean {
  return htmlToPlainText(html).length === 0;
}
