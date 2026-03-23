const fs = require('fs');
const pathTxt = 'd:/mapp/florasync-saas/src/app/dashboard/orders/new/page_tmp.txt';
const pathFinal = 'd:/mapp/florasync-saas/src/app/dashboard/orders/new/page.tsx';

let content = fs.readFileSync(pathTxt, 'utf8');

// 1. Clean states
const stateAnchor = '// --- STATE ---';
const statesToAdd = [
  'const [isAnonymous, setIsAnonymous] = useState(false);',
  'const [selectedBranch, setSelectedBranch] = useState<any | null>(null);',
  'const [showSuccessDialog, setShowSuccessDialog] = useState(false);',
  'const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);',
  'const [lastOrderId, setLastOrderId] = useState<string | null>(null);',
  'const [isSubmitting, setIsSubmitting] = useState(false);'
];

// In page_tmp.txt, isAnonymous and selectedBranch might exist already.
// Let's remove them first to avoid duplicates.
content = content.replace(/const \[isAnonymous, setIsAnonymous\] = useState\(false\);/g, '');
content = content.replace(/const \[selectedBranch, setSelectedBranch\] = useState<any \| null>\(null\);/g, '');

content = content.replace(stateAnchor, `  ${stateAnchor}\n${statesToAdd.map(s => '  ' + s).join('\n')}`);

// 2. Wrap existingOrder finding in check
// (It's already there in page_tmp.txt usually)

// 3. Fix handleCompleteOrder
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
          if (success) savedId = (existingOrder as any).id;
      } else {
          savedId = await addOrder(orderPayload);
      }

      if (savedId) {
        setLastOrderId(savedId as string);
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

content = content.replace(oldTry, newTry);

// 4. Fix FulfillmentSection
content = content.replace(/receipt_type={receipt_type}/g, 'receiptType={receipt_type}');

// 5. Success Dialog JSX placement
const dialogJSX = `
      {/* 주문 성공 다이얼로그 */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="sm:max-w-md bg-white border-2 border-primary/20 shadow-2xl">
          <DialogHeader className="space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <DialogTitle className="text-center text-2xl font-bold text-gray-800">주문 접수 완료!</DialogTitle>
            <DialogDescription className="text-center text-gray-500 font-medium font-mono">
              주문 번호: <span className="text-primary font-bold underline underline-offset-4 decoration-primary/30 tracking-wider">[{lastOrderNumber}]</span>
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3 py-6">
            <Button 
                variant="outline" 
                className="hover:bg-primary/5 border-primary/30 text-primary font-semibold transition-all hover:scale-105 active:scale-95"
                onClick={() => {
                  setShowSuccessDialog(false);
                  router.push('/dashboard/orders');
                }}
            >
              목록에서 확인
            </Button>
            <Button 
                variant="outline" 
                className="hover:bg-orange-50 border-orange-200 text-orange-700 font-semibold transition-all hover:scale-105 active:scale-95 flex items-center gap-2 group"
                onClick={() => {
                   window.open(\`/dashboard/printer?message=\${encodeURIComponent(messageContent)}&sender=\${encodeURIComponent(ordererName)}\`, '_blank');
                }}
            >
              리본 출력 <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">(새창)</span>
            </Button>
            <Button 
                variant="secondary" 
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold transition-all active:scale-95"
                onClick={() => window.location.reload()}
            >
              새 주문 등록
            </Button>
            <Button 
                className="bg-primary hover:bg-primary/90 text-white font-bold shadow-lg shadow-primary/20 active:scale-95"
                onClick={() => setShowSuccessDialog(false)}
            >
              확인
            </Button>
          </div>

          <DialogFooter className="sm:justify-center border-t pt-4">
            <p className="text-xs text-gray-400 italic">감사합니다! 주문이 성공적으로 접수되었습니다.</p>
          </DialogFooter>
        </DialogContent>
      </Dialog>
`;

// Insert before the last </div> but actually let's just replace the very last </div> with successDialogJSX + </div>
const lastDivIdx = content.lastIndexOf('</div>');
if (lastDivIdx !== -1) {
    content = content.substring(0, lastDivIdx) + dialogJSX + content.substring(lastDivIdx);
}

fs.writeFileSync(pathFinal, content, 'utf8');
console.log('Rebuild completed');
