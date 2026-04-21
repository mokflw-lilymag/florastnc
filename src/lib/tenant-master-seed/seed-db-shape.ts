/**
 * 시드 적용 시 DB에 기록되는 상품 코드·자재 메모 규칙.
 * run-seed 와 관리자 UI 미리보기가 동일 값을 쓰도록 공유합니다.
 */
export function resolvedProductCode(version: string, index: number, rowCode?: string) {
  const slug = version.replace(/[^a-zA-Z0-9]/g, "");
  if (rowCode?.trim()) {
    const safe = rowCode.trim().replace(/\s+/g, "-").slice(0, 80);
    return `FS-SEED-${slug}-${safe}`;
  }
  return `FS-SEED-${slug}-P-${String(index + 1).padStart(4, "0")}`;
}

export function resolvedMaterialSeedMemo(version: string, index: number) {
  return `FS-SEED|${version}|M|${String(index + 1).padStart(4, "0")}`;
}
