/**
 * 근로소득 간이세액표 근사 (부양가족 1명·11세 이하 자녀 0명 기준, 2025~2026 고시 앵커 보간)
 * 실제 원천징수는 국세청 간이세액표·부양가족 수에 따라 달라질 수 있습니다.
 */
const SIMPLE_TAX_ANCHORS: [number, number][] = [
  [0, 0],
  [1_060_000, 0],
  [1_500_000, 0],
  [2_000_000, 21_010],
  [2_500_000, 64_260],
  [3_000_000, 120_000],
  [3_500_000, 185_400],
  [4_000_000, 260_100],
  [4_500_000, 345_000],
  [5_000_000, 430_200],
  [6_000_000, 620_000],
  [7_000_000, 820_000],
  [8_000_000, 1_050_000],
  [10_000_000, 1_580_000],
  [12_000_000, 2_200_000],
];

export function estimateKrSimpleIncomeTax(
  monthlyTaxablePay: number,
  _dependentCount = 1,
): number {
  const pay = Math.max(0, Math.floor(monthlyTaxablePay));
  if (pay <= SIMPLE_TAX_ANCHORS[1][0]) return 0;

  for (let i = 1; i < SIMPLE_TAX_ANCHORS.length; i++) {
    const [highPay, highTax] = SIMPLE_TAX_ANCHORS[i];
    const [lowPay, lowTax] = SIMPLE_TAX_ANCHORS[i - 1];
    if (pay <= highPay) {
      if (highPay === lowPay) return highTax;
      const ratio = (pay - lowPay) / (highPay - lowPay);
      return Math.floor(lowTax + (highTax - lowTax) * ratio);
    }
  }

  const [, lastTax] = SIMPLE_TAX_ANCHORS[SIMPLE_TAX_ANCHORS.length - 1];
  return lastTax;
}
