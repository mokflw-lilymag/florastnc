const fs = require('fs');

function fixFile(file) {
  let content = fs.readFileSync(file, 'utf8');

  // Replace 'const { format } = useCurrency();' with 'const { format: formatCurrency } = useCurrency();'
  content = content.replace(/const \{ format \} = useCurrency\(\);/g, 'const { format: formatCurrency } = useCurrency();');
  
  const targets = [
    'product.price',
    'orderSummary.total',
    'orderSummary.total - firstPaymentAmount',
    'orderSummary.subtotal',
    'orderSummary.discountAmount',
    'orderSummary.deliveryFee',
    'orderSummary.pointsUsed',
    'item.price',
    'amount',
    'Number(product.price)'
  ];
  
  for (const t of targets) {
    const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    content = content.replace(new RegExp('format\\\\(' + escaped + '\\\\)', 'g'), 'formatCurrency(' + t + ')');
  }

  fs.writeFileSync(file, content, 'utf8');
}

fixFile('src/app/dashboard/orders/new/page.tsx');
fixFile('src/app/dashboard/orders/new/components/OrderSummarySide.tsx');
fixFile('src/app/dashboard/orders/new/components/ProductSection.tsx');
fixFile('src/app/dashboard/orders/new/components/CardPaymentConfirmDialog.tsx');
