const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Add import if not exists
  if (!content.includes('useCurrency')) {
    if (content.includes('usePreferredLocale')) {
      content = content.replace('import { usePreferredLocale } from "@/hooks/use-preferred-locale";', 'import { usePreferredLocale } from "@/hooks/use-preferred-locale";\nimport { useCurrency } from "@/hooks/use-currency";');
    } else {
      content = content.replace('import React', 'import { useCurrency } from "@/hooks/use-currency";\nimport React');
    }
  }

  // Inject useCurrency hook call into component if needed
  if (!content.includes('const { format: formatCurrency } = useCurrency();')) {
    if (content.includes('const locale = usePreferredLocale();')) {
      content = content.replace(/const locale = usePreferredLocale\(\);/, 'const locale = usePreferredLocale();\n    const { format: formatCurrency } = useCurrency();');
    } else if (content.includes('const router = useRouter();')) {
      content = content.replace(/const router = useRouter\(\);/, 'const router = useRouter();\n  const { format: formatCurrency } = useCurrency();');
    } else {
      // For CardPaymentConfirmDialog
      content = content.replace(/export function CardPaymentConfirmDialog\(\{[^}]+\}: CardPaymentConfirmDialogProps\) \{/m, (match) => {
        return match + '\n  const { format: formatCurrency } = useCurrency();\n';
      });
    }
  }

  // Replace {someVar.toLocaleString()}{tf.f00487} with {formatCurrency(someVar)}
  content = content.replace(/\{([^}]+?)\.toLocaleString\(\)\}\{tf\.f00487\}/g, '{formatCurrency($1)}');
  // Handle orderSummary.total - firstPaymentAmount case
  content = content.replace(/\{\(([^}]+?)\)\.toLocaleString\(\)\}\{tf\.f00487\}/g, '{formatCurrency($1)}');
  
  // Handle literal 원 cases
  content = content.replace(/\{([^}]+?)\.toLocaleString\(\)\}원/g, '{formatCurrency($1)}');
  content = content.replace(/\{\(([^}]+?)\)\.toLocaleString\(\)\}원/g, '{formatCurrency($1)}');
  
  // Handle `${orderSummary.total.toLocaleString()}${tf.f00488}` -> `${formatCurrency(orderSummary.total)} 결제`
  content = content.replace(/\`\$\{([^}]+?)\.toLocaleString\(\)\}\$\{tf\.f0048[89]\}\`/g, '`${formatCurrency($1)} 결제`');

  fs.writeFileSync(file, content, 'utf8');
}

fixFile('src/app/dashboard/orders/new/components/OrderSummarySide.tsx');
fixFile('src/app/dashboard/orders/new/page.tsx');
fixFile('src/app/dashboard/orders/new/components/CardPaymentConfirmDialog.tsx');
fixFile('src/app/dashboard/orders/new/components/ProductSection.tsx');
