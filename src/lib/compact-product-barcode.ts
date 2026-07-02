/** 주문 직접입력 상품용 10자리 콤팩트 바코드 (P + 9자) */
export function generateCompactProductBarcode(): string {
  const randomPart = Math.random().toString(36).substring(2, 11).toUpperCase().padEnd(9, "X");
  return `P${randomPart}`;
}
