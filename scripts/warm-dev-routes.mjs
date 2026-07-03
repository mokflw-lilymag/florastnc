/**
 * dev 서버 기동 후 주요 라우트를 미리 컴파일합니다.
 * 사용: npm run dev  →  다른 터미널에서  npm run warm:dev
 */
const base = process.env.WARM_BASE_URL || "http://127.0.0.1:3000";
const guestCookie = "florasync_guest_browse=1";

const routes = [
  "/ko/login",
  "/auth/waiting?next=%2Fdashboard",
  "/dashboard",
];

async function warm(path) {
  const url = `${base}${path}`;
  const useGuest = path.startsWith("/dashboard");
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: useGuest ? { Cookie: guestCookie } : undefined,
      redirect: "follow",
    });
    const ms = Date.now() - started;
    console.log(`[warm] ${res.status} ${path} (${(ms / 1000).toFixed(1)}s)`);
  } catch (err) {
    console.warn(`[warm] failed ${path}:`, err?.message || err);
  }
}

console.log(`[warm] base=${base}`);
for (const path of routes) {
  await warm(path);
}
console.log("[warm] done — 로그인·대시보드 첫 로딩이 빨라집니다.");
