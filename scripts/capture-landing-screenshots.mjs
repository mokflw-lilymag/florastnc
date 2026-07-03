/**
 * Guest trial (/try) 화면 캡처 → public/images/landing/
 * 실행: node scripts/capture-landing-screenshots.mjs
 * 사전: npm run dev (localhost:3000)
 */
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "images", "landing");
const BASE = process.env.CAPTURE_BASE_URL ?? "http://localhost:3000";

const DESKTOP = { width: 1440, height: 900 };
const MOBILE = { width: 390, height: 844 };

/** @type {{ name: string; path: string; viewport?: typeof DESKTOP; waitMs?: number; clipSelector?: string }[]} */
const SHOTS = [
  { name: "dashboard-hero", path: "/dashboard", waitMs: 4000 },
  { name: "orders-list", path: "/dashboard/orders", waitMs: 3000 },
  { name: "order-new-pc", path: "/dashboard/orders/new", waitMs: 3500 },
  { name: "products", path: "/dashboard/products", waitMs: 3000 },
  { name: "inventory", path: "/dashboard/inventory", waitMs: 3000 },
  { name: "expenses", path: "/dashboard/expenses", waitMs: 3000 },
  { name: "reports", path: "/dashboard/reports", waitMs: 3000 },
  {
    name: "ribbon-print",
    path: "/dashboard/orders/print-ribbon",
    waitMs: 4000,
  },
  {
    name: "mobile-order-new",
    path: "/dashboard/orders/new-mobile",
    viewport: MOBILE,
    waitMs: 3500,
  },
  {
    name: "mobile-dashboard",
    path: "/dashboard",
    viewport: MOBILE,
    waitMs: 3500,
  },
];

async function bootstrapGuest(context, page) {
  const cookieUrl = new URL(BASE);
  await context.addCookies([
    {
      name: "florasync_guest_browse",
      value: "1",
      domain: cookieUrl.hostname,
      path: "/",
    },
  ]);
  await page.goto(`${BASE}/dashboard`, { timeout: 120000, waitUntil: "commit" });
  await page.waitForTimeout(4000);
  const current = page.url();
  if (!current.includes("/dashboard")) {
    throw new Error(`guest bootstrap failed — at ${current} (login required?)`);
  }
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 2,
    locale: "ko-KR",
  });
  const page = await context.newPage();

  console.log("[capture] guest trial bootstrap…");
  await bootstrapGuest(context, page);

  for (const shot of SHOTS) {
    const vp = shot.viewport ?? DESKTOP;
    await page.setViewportSize(vp);
    const url = `${BASE}${shot.path}`;
    console.log(`[capture] ${shot.name} ← ${url}`);
    try {
      await page.goto(url, { timeout: 120000, waitUntil: "commit" });
      await page.waitForTimeout(shot.waitMs ?? 2500);
      const out = path.join(OUT_DIR, `${shot.name}.png`);
      if (shot.clipSelector) {
        const el = page.locator(shot.clipSelector).first();
        await el.waitFor({ state: "visible", timeout: 15000 });
        await el.screenshot({ path: out });
      } else {
        await page.screenshot({ path: out, fullPage: false });
      }
      console.log(`  ✓ ${out}`);
    } catch (err) {
      console.warn(`  ✗ ${shot.name}:`, err instanceof Error ? err.message : err);
    }
  }

  await browser.close();
  console.log("[capture] done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
