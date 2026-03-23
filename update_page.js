const fs = require('fs');
const path = 'd:/mapp/florasync-saas/src/app/dashboard/orders/new/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add States
const stateTarget = '// --- STATE ---';
const newState = `  // --- STATE ---
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);`;

if (content.includes('const [isAnonymous, setIsAnonymous] = useState(false);')) {
    content = content.replace(/  \/\/ --- STATE ---\n  const \[isAnonymous, setIsAnonymous\] = useState\(false\);\n  const \[selectedBranch, setSelectedBranch\] = useState<any \| null>\(null\);/, newState);
}

// 2. Update handleCompleteOrder
const oldTry = `    try {
      if (existingOrder) {
        await updateOrder(existingOrder.id, orderPayload);
      } else {
        await addOrder(orderPayload);
      }
      router.push('/dashboard/orders');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }`;

const newTry = `    setIsSubmitting(true);
    try {
      let savedId = null;
      if (existingOrder) {
          const success = await updateOrder(existingOrder.id, orderPayload);
          if (success) savedId = existingOrder.id;
      } else {
          savedId = await addOrder(orderPayload);
      }

      if (savedId) {
        setLastOrderId(savedId);
        setLastOrderNumber(orderPayload.order_number);
        setShowSuccessDialog(true);
        toast.success("주문이 정상적으로 등록되었습니다.");
      } else {
        toast.error("주문 등록에 실패했습니다.");
      }
    } catch (error) {
      console.error(error);
      toast.error("주문 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }`;

if (content.includes('router.push(\'/dashboard/orders\');')) {
    const startIdx = content.indexOf('try {');
    const endIdx = content.indexOf('setIsSubmitting(false);', startIdx) + 'setIsSubmitting(false);'.length + 3; // +3 for closing brace and more
    // We need more precise replace.
    content = content.replace(oldTry, newTry);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Update completed');
