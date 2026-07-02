/** 상품명 직접입력 시 기존 상품과의 유사도 비교용 정규화 */
export function normalizeProductNameForMatch(name: string): string {
  return name.replace(/\s+/g, "").toLowerCase().trim();
}

/** 공백 무시 부분 일치(양방향 includes) */
export function isSimilarProductName(a: string, b: string): boolean {
  const left = normalizeProductNameForMatch(a);
  const right = normalizeProductNameForMatch(b);
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
}

type SimilarProductOptions<T> = {
  branchName?: string | null;
  getBranch?: (product: T) => string | undefined;
  limit?: number;
};

/** 직접입력 상품명과 유사한 기존 상품 목록 (최대 limit개) */
export function findSimilarProducts<T extends { name: string }>(
  products: T[],
  inputName: string,
  options?: SimilarProductOptions<T>,
): T[] {
  const normalizedInput = normalizeProductNameForMatch(inputName);
  if (!normalizedInput) return [];

  let scoped = products;
  const branch = options?.branchName?.trim();
  if (branch) {
    scoped = products.filter((product) => {
      const productBranch = options?.getBranch
        ? options.getBranch(product)
        : (product as { branch?: string }).branch;
      return (productBranch || "").trim() === branch;
    });
  }

  return scoped
    .filter((product) => isSimilarProductName(inputName, product.name))
    .slice(0, options?.limit ?? 5);
}
