const fs = require('fs');
const path = 'd:/mapp/florasync-saas/src/app/dashboard/orders/new/page.tsx';

let content = fs.readFileSync(path, 'utf8');

// 1. Clean up duplicate state declarations (from previous failed attempts)
// The states I want: isAnonymous, selectedBranch, showSuccessDialog, lastOrderNumber, lastOrderId, isSubmitting
const states = [
  'const [isAnonymous, setIsAnonymous] = useState(false);',
  'const [selectedBranch, setSelectedBranch] = useState<any | null>(null);',
  'const [showSuccessDialog, setShowSuccessDialog] = useState(false);',
  'const [lastOrderNumber, setLastOrderNumber] = useState<string | null>(null);',
  'const [lastOrderId, setLastOrderId] = useState<string | null>(null);',
  'const [isSubmitting, setIsSubmitting] = useState(false);'
];

// First, remove ALL occurrences of these lines to start clean.
states.forEach(state => {
  const esc = state.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^\\s*${esc}\\s*$`, 'gm');
  content = content.replace(re, '');
});

// Now insert them once after // --- STATE ---
const stateAnchor = '// --- STATE ---';
const newStateBlock = `  // --- STATE ---
${states.map(s => '  ' + s).join('\n')}`;

content = content.replace(stateAnchor, newStateBlock);

// 2. Fix handleCompleteOrder logic using a robust regex
// We want to replace the try/catch/finally block inside handleCompleteOrder
const handleCompleteOrderStart = 'const handleCompleteOrder = async () => {';
const tryStart = 'try {';
const finallyEnd = 'setIsSubmitting(false);\\s*}\\s*};'; // End of finally and function

const handleCompleteOrderRegex = /const handleCompleteOrder = async \(\) => \{[\s\S]*?try \{[\s\S]*?\} finally \{[\s\S]*?setIsSubmitting\(false\);[\s\S]*?\}[\s\S]*?\};/;

const newHandleCompleteOrder = `const handleCompleteOrder = async () => {
    setIsSubmitting(true);
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
    }
  };`;

if (handleCompleteOrderRegex.test(content)) {
    content = content.replace(handleCompleteOrderRegex, newHandleCompleteOrder);
} else {
    // Fallback search if regex fails
    console.log('Regex failed, trying fallback replace');
    content = content.replace(/router\.push\('\/dashboard\/orders'\);/, 'setShowSuccessDialog(true);');
}

// 3. Fix FulfillmentSection prop
content = content.replace(/receipt_type={receipt_type}/g, 'receiptType={receipt_type}');

// 4. Fix corrupted characters (common ones from PS Set-Content mistakes)
content = content.replace(/\?/g, '수'); // 주문 ?정 -> 주문 수정 (Actually it's usually 2 chars for 1 Korean char)
// Let's just fix the specific lines I saw.
content = content.replace(/title=\{existingOrder \? "주문 \?정" : "주문 \?수"\}/, 'title={existingOrder ? "주문 수정" : "주문 접수"}');
content = content.replace(/description=\{existingOrder \? "기존 주문\?\?\?정\?니\?\?" : "\?로\?\?주문\?\?\?록\?니\?\?"\}/, 'description={existingOrder ? "기존 주문을 수정합니다." : "새로운 주문을 등록합니다."}');
content = content.replace(/if \(tab === '경조\?환' \|\| tab === 'wreath'\)/, 'if (tab === \'경조화환\' || tab === \'wreath\')');

// 5. Add Dialog if not present
if (!content.includes('showSuccessDialog} onOpenChange={setShowSuccessDialog}')) {
    const dialogJSX = `
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
                   const win = window.open(\`/dashboard/printer?message=\${encodeURIComponent(messageContent)}&sender=\${encodeURIComponent(ordererName)}\`, '_blank');
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
    content = content.replace(/<\/div>\s*<\/div>\s*<\/div>\s*$/, (match) => match.replace(/<\/div>\s*$/, dialogJSX + '</div>'));
}

fs.writeFileSync(path, content, 'utf8');
console.log('Final fix applied');
