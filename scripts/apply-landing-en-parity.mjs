/**
 * Replaces landing.* strings that still matched en.json (a11y alts, footer labels, badges).
 * Sparse per locale. Run: node scripts/apply-landing-en-parity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const dir = path.join(root, "src/i18n/messages");

/**
 * @param {Record<string, unknown>} rootJson
 * @param {Record<string, string>} flat dot path from root, e.g. landing.navbar.logoAlt
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
    "landing.navbar.logoAlt": "Logo de Floxync",
    "landing.hero.altBackground": "Fondo: tecnología para operaciones de floristería",
    "landing.hero.altDashboard": "Vista previa del panel de Floxync",
    "landing.features.integratedBadge": "Inteligencia integrada",
    "landing.footer.printBridge": "Puente de impresión",
    "landing.footer.supportLine": "Línea de atención",
    "landing.footer.officialMail": "Correo oficial",
    "landing.footer.architecture": "Arquitectura",
    "landing.footer.ecosystem": "Ecosistema",
    "landing.footer.legal": "Legal y privacidad",
    "landing.footer.coreEngine": "Motor central",
    "landing.footer.aiModules": "Módulos de IA",
    "landing.footer.cloudPrinting": "Impresión en la nube",
    "landing.footer.ribbonSupply": "Suministro de cintas",
    "landing.footer.inkToners": "Tintas y tóners",
    "landing.footer.hardwarePartner": "Socio de hardware",
    "landing.footer.terms": "Términos del servicio",
    "landing.footer.privacy": "Política de privacidad",
    "landing.footer.rights": "Todos los derechos reservados.",
    "landing.footer.securityStatus": "Estado de seguridad",
    "landing.footer.apiStatus": "Estado de la API",
  },
  pt: {
    "landing.navbar.logoAlt": "Logótipo Floxync",
    "landing.hero.altBackground": "Fundo: tecnologia para operações de floricultura",
    "landing.hero.altDashboard": "Pré-visualização do painel Floxync",
    "landing.footer.printBridge": "Ponte de impressão",
  },
  fr: {
    "landing.navbar.solutions": "Solutions métier",
    "landing.navbar.logoAlt": "Logo Floxync",
    "landing.hero.altBackground": "Arrière-plan : technologie pour fleuristes",
    "landing.hero.altDashboard": "Aperçu du tableau de bord Floxync",
    "landing.footer.businessColumn": "Activité",
    "landing.footer.contactLabel": "Coordonnées",
    "landing.footer.printBridge": "Passerelle d’impression",
    "landing.footer.architecture": "Architecture système",
  },
  de: {
    "landing.navbar.logoAlt": "Floxync-Logo",
    "landing.hero.altBackground": "Hintergrund: Technologie für Blumenfachhandel",
    "landing.hero.altDashboard": "Vorschau des Floxync-Dashboards",
    "landing.testApply.name": "Vor- und Nachname",
    "landing.footer.businessColumn": "Unternehmen",
    "landing.footer.printBridge": "Druck-Brücke",
  },
  ru: {
    "landing.navbar.logoAlt": "Логотип Floxync",
    "landing.hero.altBackground": "Фон: технологии для цветочного магазина",
    "landing.hero.altDashboard": "Превью панели Floxync",
    "landing.footer.printBridge": "Мост печати",
  },
  ja: {
    "landing.navbar.logoAlt": "Floxync のロゴ",
    "landing.hero.status": "システム状態：最適化済み",
    "landing.hero.altBackground": "花店向け業務テクノロジーの背景画像",
    "landing.hero.altDashboard": "Floxync ダッシュボードのプレビュー",
    "landing.features.integratedBadge": "統合インテリジェンス",
    "landing.footer.supportLine": "サポート窓口",
    "landing.footer.officialMail": "公式メール",
    "landing.footer.architecture": "アーキテクチャ",
    "landing.footer.ecosystem": "エコシステム",
    "landing.footer.legal": "法務・プライバシー",
    "landing.footer.coreEngine": "コアエンジン",
    "landing.footer.aiModules": "AI モジュール",
    "landing.footer.cloudPrinting": "クラウド印刷",
    "landing.footer.ribbonSupply": "リボン供給",
    "landing.footer.inkToners": "インク・トナー",
    "landing.footer.hardwarePartner": "ハードウェアパートナー",
    "landing.footer.terms": "利用規約",
    "landing.footer.privacy": "プライバシーポリシー",
    "landing.footer.rights": "無断転載を禁じます。",
    "landing.footer.securityStatus": "セキュリティ状況",
    "landing.footer.apiStatus": "API ステータス",
    "landing.featureDetail.capability": "Floxync の機能",
    "landing.featureDetail.comingSoon": "近日公開",
  },
  zh: {
    "landing.navbar.logoAlt": "Floxync 标志",
    "landing.hero.status": "系统状态：已优化",
    "landing.hero.altBackground": "花店运营技术背景图",
    "landing.hero.altDashboard": "Floxync 控制台预览",
    "landing.features.integratedBadge": "整合智能",
    "landing.footer.supportLine": "支持热线",
    "landing.footer.officialMail": "官方邮箱",
    "landing.footer.architecture": "架构",
    "landing.footer.ecosystem": "生态",
    "landing.footer.legal": "法律与隐私",
    "landing.footer.coreEngine": "核心引擎",
    "landing.footer.aiModules": "AI 模块",
    "landing.footer.cloudPrinting": "云打印",
    "landing.footer.ribbonSupply": "丝带耗材",
    "landing.footer.inkToners": "墨水与硒鼓",
    "landing.footer.hardwarePartner": "硬件合作伙伴",
    "landing.footer.terms": "服务条款",
    "landing.footer.privacy": "隐私政策",
    "landing.footer.rights": "保留所有权利。",
    "landing.footer.securityStatus": "安全状态",
    "landing.footer.apiStatus": "API 状态",
    "landing.featureDetail.capability": "Floxync 能力",
  },
  vi: {
    "landing.navbar.logoAlt": "Logo Floxync",
    "landing.hero.altBackground": "Nền công nghệ vận hành cửa hàng hoa",
    "landing.hero.altDashboard": "Xem trước bảng điều khiển Floxync",
    "landing.features.integratedBadge": "Trí tuệ tích hợp",
    "landing.testApply.email": "Địa chỉ email",
    "landing.footer.printBridge": "Cầu in ấn",
    "landing.footer.supportLine": "Đường dây hỗ trợ",
    "landing.footer.officialMail": "Email chính thức",
    "landing.footer.architecture": "Kiến trúc",
    "landing.footer.ecosystem": "Hệ sinh thái",
    "landing.footer.legal": "Pháp lý & quyền riêng tư",
    "landing.footer.coreEngine": "Lõi động cơ",
    "landing.footer.aiModules": "Mô-đun AI",
    "landing.footer.cloudPrinting": "In đám mây",
    "landing.footer.ribbonSupply": "Cung ứng ruy băng",
    "landing.footer.inkToners": "Mực & mực nạp",
    "landing.footer.hardwarePartner": "Đối tác phần cứng",
    "landing.footer.terms": "Điều khoản dịch vụ",
    "landing.footer.privacy": "Chính sách quyền riêng tư",
    "landing.footer.rights": "Bảo lưu mọi quyền.",
    "landing.footer.securityStatus": "Trạng thái bảo mật",
    "landing.footer.apiStatus": "Trạng thái API",
  },
  ko: {
    "landing.hero.status": "시스템 상태: 최적화됨",
    "landing.features.integratedBadge": "통합 인텔리전스",
    "landing.footer.supportLine": "지원 연락처",
    "landing.footer.officialMail": "공식 메일",
    "landing.footer.architecture": "아키텍처",
    "landing.footer.ecosystem": "에코시스템",
    "landing.footer.legal": "법무 및 개인정보",
    "landing.footer.coreEngine": "코어 엔진",
    "landing.footer.aiModules": "AI 모듈",
    "landing.footer.cloudPrinting": "클라우드 인쇄",
    "landing.footer.ribbonSupply": "리본 소모품",
    "landing.footer.inkToners": "잉크·토너",
    "landing.footer.hardwarePartner": "하드웨어 파트너",
    "landing.footer.terms": "이용약관",
    "landing.footer.privacy": "개인정보 처리방침",
    "landing.footer.rights": "모든 권리 보유.",
    "landing.footer.securityStatus": "보안 상태",
    "landing.footer.apiStatus": "API 상태",
    "landing.featureDetail.capability": "Floxync 기능",
    "landing.featureDetail.comingSoon": "곧 제공",
  },
};

for (const [locale, flat] of Object.entries(PATCHES)) {
  const filePath = path.join(dir, `${locale}.json`);
  const j = JSON.parse(fs.readFileSync(filePath, "utf8"));
  applyPaths(j, flat);
  fs.writeFileSync(filePath, `${JSON.stringify(j, null, 2)}\n`, "utf8");
  console.log(`${locale}.json landing patches: ${Object.keys(flat).length}`);
}
