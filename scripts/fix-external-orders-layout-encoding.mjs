import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const target = path.join(root, "src/app/dashboard/external-orders/layout.tsx");

const content = `import Link from "next/link";
import { Share2 } from "lucide-react";
import { getPartnerOrdersEnabled } from "@/lib/platform-config-server";
import { createClient } from "@/utils/supabase/server";
import { effectiveIsSuperAdmin } from "@/lib/auth-api-guards";
import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, toBaseLocale } from "@/i18n/config";
import { pickUiText } from "@/i18n/pick-ui-text";

export default async function ExternalOrdersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const enabled = await getPartnerOrdersEnabled();
  if (enabled) return <>{children}</>;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let isSuperAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    isSuperAdmin = effectiveIsSuperAdmin(profile, user.email ?? undefined);
  }
  if (isSuperAdmin) return <>{children}</>;

  const localeCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
  const base = toBaseLocale(resolveLocale(localeCookie));

  const title = pickUiText(
    base,
    "\uD611\uB825\uC0AC \uC218\uBC1C\uC8FC \u2014 \uC900\uBE44 \uC911",
    "Partner orders \u2014 coming soon",
    "\u0110\u01A1n \u0111\u1ED1i t\u00E1c \u2014 s\u1EAFp ra m\u1EAFt",
    "\u53D6\u5F15\u5148\u767A\u6CE8 \u2014 \u6E96\u5099\u4E2D",
    "\u5408\u4F5C\u8BA2\u5355 \u2014 \u5373\u5C06\u5F00\u653E",
    "Pedidos de socios \u2014 pr\u00F3ximamente",
    "Pedidos de parceiros \u2014 em breve",
    "Commandes partenaires \u2014 bient\u00F4t",
    "Partnerbestellungen \u2014 demn\u00E4chst",
    "\u0417\u0430\u043A\u0430\u0437\u044B \u043F\u0430\u0440\u0442\u043D\u0451\u0440\u043E\u0432 \u2014 \u0441\u043A\u043E\u0440\u043E",
  );
  const body = pickUiText(
    base,
    "\uC774 \uAE30\uB2A5\uC740 \uC544\uC9C1 \uC77C\uBC18 \uB9E4\uC7A5\uC5D0 \uACF5\uAC1C\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4. FloXync \uC288\uD37C\uAD00\uB9AC\uC790\uAC00 \uC804\uC5ED \uC124\uC815\uC5D0\uC11C \uAE30\uB2A5\uC744 \uCF1C\uBA74 \uBA54\uB274\uAC00 \uD45C\uC2DC\uB429\uB2C8\uB2E4.",
    "This feature is not open to all stores yet. A super admin can enable it in global settings.",
    "T\u00EDnh n\u0103ng ch\u01B0a m\u1EDF cho m\u1ECDi c\u1EEDa h\u00E0ng. Super admin b\u1EADt trong c\u00E0i \u0111\u1EB7t to\u00E0n c\u1EE5c.",
    "\u4E00\u822C\u5E97\u8217\u306B\u306F\u307E\u3060\u516C\u958B\u3055\u308C\u3066\u3044\u307E\u305B\u3093\u3002\u30B9\u30FC\u30D1\u30FC\u7BA1\u7406\u8005\u304C\u5168\u4F53\u8A2D\u5B9A\u3067\u6709\u52B9\u306B\u3067\u304D\u307E\u3059\u3002",
    "\u8BE5\u529F\u80FD\u5C1A\u672A\u5BF9\u6240\u6709\u95E8\u5E97\u5F00\u653E\u3002\u8D85\u7EA7\u7BA1\u7406\u5458\u53EF\u5728\u5168\u5C40\u8BBE\u7F6E\u4E2D\u5F00\u542F\u3002",
    "A\u00FAn no est\u00E1 abierto para todas las tiendas. El super admin puede activarlo en ajustes globales.",
    "Ainda n\u00E3o est\u00E1 aberto para todas as lojas. O super admin pode ativar nas configura\u00E7\u00F5es globais.",
    "Pas encore ouvert \u00E0 toutes les boutiques. Le super admin peut l\u2019activer dans les param\u00E8tres globaux.",
    "Noch nicht f\u00FCr alle Shops freigegeben. Super-Admin kann es in den globalen Einstellungen aktivieren.",
    "\u0424\u0443\u043D\u043A\u0446\u0438\u044F \u0435\u0449\u0451 \u043D\u0435 \u043E\u0442\u043A\u0440\u044B\u0442\u0430 \u0434\u043B\u044F \u0432\u0441\u0435\u0445 \u043C\u0430\u0433\u0430\u0437\u0438\u043D\u043E\u0432. \u0421\u0443\u043F\u0435\u0440-\u0430\u0434\u043C\u0438\u043D \u0432\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u0432 \u0433\u043B\u043E\u0431\u0430\u043B\u044C\u043D\u044B\u0445 \u043D\u0430\u0441\u0442\u0440\u043E\u0439\u043A\u0430\u0445.",
  );
  const back = pickUiText(
    base,
    "\uB300\uC2DC\uBCF4\uB4DC\uB85C",
    "Back to dashboard",
    "V\u1EC1 b\u1EA3ng \u0111i\u1EC1u khi\u1EC3n",
    "\u30C0\u30C3\u30B7\u30E5\u30DC\u30FC\u30C9\u3078",
    "\u8FD4\u56DE\u4EEA\u8868\u76D8",
    "Al panel",
    "Ao painel",
    "Tableau de bord",
    "Zum Dashboard",
    "\u041D\u0430 \u043F\u0430\u043D\u0435\u043B\u044C",
  );

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-600">
        <Share2 className="h-7 w-7" />
      </div>
      <h1 className="text-xl font-bold text-slate-900">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">{body}</p>
      <Link
        href="/dashboard"
        className="mt-8 inline-flex rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        {back}
      </Link>
    </motionless>
  );
}
`.replace(/<\/?motionless/g, (tag) => tag.replace("motionless", "div"));

fs.writeFileSync(target, content, "utf8");
console.log("fixed:", target);
