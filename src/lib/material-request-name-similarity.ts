/** 자재 요청 품명 중복·유사 차단용 (공백 제거·소문자 비교) */

export function compactMaterialName(s: string): string {
  return s.trim().replace(/\s+/g, "").toLowerCase();
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m) return n;
  if (!n) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + c
      );
    }
  }
  return dp[m]![n]!;
}

/**
 * 등록 자재·같은 요청의 다른 줄과 비교해 차단할 만한 유사 품명을 반환합니다.
 * - 완전 동일(공백 무시)
 * - 편집 거리가 짧으면 유사로 간주
 */
export function findBlockingSimilarMaterialNames(
  draftName: string,
  materials: { name: string }[],
  siblingLineNames: string[]
): string[] {
  const raw = draftName.trim();
  const d = compactMaterialName(raw);
  if (d.length < 2) return [];

  const hits = new Set<string>();
  const pool: string[] = [...materials.map((m) => m.name), ...siblingLineNames];

  for (const name of pool) {
    const n = compactMaterialName(name);
    if (n.length < 2) continue;
    if (n === d) {
      hits.add(name.trim());
      continue;
    }
    const maxLen = Math.max(d.length, n.length);
    const dist = levenshtein(d, n);
    const maxDist = maxLen <= 4 ? 1 : maxLen <= 10 ? 2 : 3;
    if (dist <= maxDist) hits.add(name.trim());
  }

  return [...hits];
}
