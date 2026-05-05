/**
 * Patches a few core JSON paths where a locale still matched en (sidebar, login, etc.).
 * Run: node scripts/apply-core-ui-en-parity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "src/i18n/messages");

/**
 * @param {Record<string, unknown>} rootJson
 * @param {Record<string, string>} flat
 */
function applyPaths(rootJson, flat) {
  for (const [dotPath, val] of Object.entries(flat)) {
    const parts = dotPath.split(".");
    let o = rootJson;
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i];
      if (o[p] == null || typeof o[p] !== "object") throw new Error(`${dotPath}: missing object at ${p}`);
      o = /** @type {Record<string, unknown>} */ (o[p]);
    }
    const last = parts[parts.length - 1];
    if (!(last in o)) throw new Error(`${dotPath}: missing leaf`);
    o[last] = val;
  }
}

/** @type {Record<string, Record<string, string>>} */
const PATCHES = {
  es: {
    "dashboardHeader.manualTitle": "Guía",
    "dashboardCommon.sidebar.groups.tenantGrowth": "Mercadotecnia",
  },
  pt: {
    "dashboardHeader.manualTitle": "Guia",
    "dashboardCommon.sidebar.menu": "Menu lateral",
    "dashboardCommon.sidebar.groups.tenantGrowth": "Mercadologia",
  },
  fr: {
    "manualDrawer.triggerShort": "Aide",
    "dashboardCommon.sidebar.menu": "Menu latéral",
    "dashboardCommon.sidebar.groups.tenantGrowth": "Marketing & croissance",
  },
  de: {
    "dashboardCommon.header.partner": "Partnerbereich",
    "dashboardCommon.sidebar.badgePartner": "PARTNER-MODUS",
    "dashboardCommon.sidebar.support": "Hilfe",
    "dashboardCommon.sidebar.groups.adminSystem": "Systembereich",
    "dashboardCommon.sidebar.groups.tenantHome": "Startseite",
    "dashboardCommon.sidebar.groups.tenantGrowth": "Marketing & Wachstum",
  },
  ja: {
    "androidChrome.admin.faqAi": "FAQ・AI",
  },
  zh: {
    "androidChrome.admin.faqAi": "常见问题 · AI",
    "dashboardCommon.sidebar.altBrandLogo": "Floxync 标志",
  },
  vi: {
    "login.email": "Thư điện tử",
    "androidChrome.admin.faqAi": "Hỏi đáp · AI",
    "dashboardCommon.sidebar.menu": "Danh mục",
    "dashboardCommon.sidebar.groups.tenantGrowth": "Tiếp thị",
  },
  ko: {
    "localeNames.en": "영어",
    "dashboardCommon.sidebar.membershipUpgrade": "멤버십 업그레이드",
  },
};

for (const [locale, flat] of Object.entries(PATCHES)) {
  const filePath = path.join(dir, `${locale}.json`);
  const j = JSON.parse(fs.readFileSync(filePath, "utf8"));
  applyPaths(j, flat);
  fs.writeFileSync(filePath, `${JSON.stringify(j, null, 2)}\n`, "utf8");
  console.log(`${locale}.json core UI patches: ${Object.keys(flat).length}`);
}
