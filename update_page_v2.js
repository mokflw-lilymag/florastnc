const fs = require('fs');
const path = 'd:/mapp/florasync-saas/src/app/dashboard/orders/new/page.tsx';

// Read file as buffer then string if needed, but normally utf8 is enough.
let content = fs.readFileSync(path, 'utf8');

// 0. Ensure no weird artifacts/corruption
// If there was corruption at line 826, let's fix it.
content = content.replace(/setShowSuccessDialog\(true\);/, "router.push('/dashboard/orders');");

// 1. Add States
if (!content.includes('showSuccessDialog')) {
    const stateAnchor = '// --- STATE ---';
    const newStateStr = `  // --- STATE ---
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);
  const [lastOrderId, setLastOrderId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);`;
    
    // Exact match for the lines:
    const oldStateLines = `  // --- STATE ---
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<any | null>(null);`;
    
    // Use substring match if exact fails due to newline differences
    if (content.includes(oldStateLines)) {
        content = content.replace(oldStateLines, newStateStr);
    } else {
        // Fallback: search for anchor
        content = content.replace(stateAnchor, newStateStr);
    }
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
    content = content.replace(oldTry, newTry);
}

// 3. Fix FulfillmentSection prop
content = content.replace(/receipt_type={receipt_type}/g, 'receiptType={receipt_type}');
// If it was already using receiptType state:
content = content.replace(/receiptType={receiptType}/g, 'receiptType={receipt_type}'); // Wait, looking back at line 141:
// 141:   const [receipt_type, setReceiptType] = useState<ReceiptType>("store_pickup");
// So it uses receipt_type state. Prop is receiptType.

content = content.replace(/receipt_type={receipt_type}/, 'receiptType={receipt_type}');

// 4. Add Dialog Component at the bottom
if (!content.includes('SuccessDialogContent')) {
    const successDialogJSX = `
      {/* 주문 성공 다이얼로그 */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md bg-white border-2 border-primary/20 shadow-2xl">
          <DialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold text-gray-800">주문 접수 완료!</DialogTitle>
            <DialogDescription className="text-center text-gray-500 font-medium">
              주문 번호: <span className="text-primary font-bold">{lastOrderNumber}</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-6">
            <Button 
                variant="outline" 
                className="hover:bg-primary/5 border-primary/30 text-primary font-semibold"
                onClick={() => {
                  setShowSuccessDialog(false);
                  router.push('/dashboard/orders');
                }}
            >
              목록에서 확인
            </Button>
            <Button 
                variant="outline" 
                className="hover:bg-orange-50 border-orange-200 text-orange-700 font-semibold"
                onClick={() => {
                  window.open(\`/dashboard/printer?message=\${encodeURIComponent(messageContent)}&sender=\${encodeURIComponent(ordererName)}\`, '_blank');
                }}
            >
              리본 출력 (새창)
            </Button>
            <Button 
                variant="secondary" 
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold"
                onClick={() => window.location.reload()}
            >
              다음 주문 등록
            </Button>
            <Button 
                className="bg-primary hover:bg-primary/90 text-white font-bold"
                onClick={() => setShowSuccessDialog(false)}
            >
              확인
            </Button>
          </div>

          <DialogFooter className="sm:justify-center border-t pt-4">
            <p className="text-xs text-gray-400">결제 전 단계는 주문 관리에서 확인 가능합니다.</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;
    // Find where the main </div> ends
    const endIdx = content.lastIndexOf('</div>');
    // Place it before the last </div> but after the content
    content = content.substring(0, endIdx) + successDialogJSX + content.substring(endIdx);
}

fs.writeFileSync(path, content, 'utf8');
console.log('Update completed with encoding fix');
