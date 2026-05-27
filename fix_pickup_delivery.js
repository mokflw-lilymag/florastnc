const fs = require('fs');
const path = require('path');

const dir = 'D:\\mapp\\floxync.com\\src\\app\\dashboard\\pickup-delivery';

function processDir(directory) {
  const files = fs.readdirSync(directory);
  for (const file of files) {
    const fullPath = path.join(directory, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      
      // Fix Order import
      content = content.replace(/import\s+\{\s*([^}]*?)\bOrder\b([^}]*?)\s*\}\s+from\s+["']@\/hooks\/use-orders["']/g, (match, p1, p2) => {
          const others = [p1, p2].map(s => s.replace(/,/g, '').trim()).filter(s => s);
          let replacement = `import { Order } from "@/types/order";`;
          if (others.length > 0) {
              replacement += `\nimport { ${others.join(', ')} } from "@/hooks/use-orders";`;
          }
          return replacement;
      });

      // Remove local Order interface declarations or imports from other files if they are wrong
      content = content.replace(/import type \{ Order \} from ["']@\/hooks\/use-orders["']/g, 'import { Order } from "@/types/order"');
      content = content.replace(/import \{ Order \} from ["']\.\.\/page["']/g, 'import { Order } from "@/types/order"');

      // Add Textarea import if missing in page.tsx
      if (file === 'page.tsx') {
          // Fix completeDelivery and fetchOrdersBySchedule
          content = content.replace(/fetchOrdersBySchedule/g, 'fetchOrdersByRange');
          content = content.replace(/const { orders, loading, updateOrderStatus, updateOrder, completeDelivery, fetchOrdersByRange, fetchOrdersByRange } = useOrders\(false\);/g, 
              'const { orders, loading, updateOrderStatus, updateOrder, fetchOrdersByRange } = useOrders(false);');
          content = content.replace(/const { orders, loading, updateOrderStatus, updateOrder, completeDelivery, fetchOrdersByRange } = useOrders\(false\);/g, 
              'const { orders, loading, updateOrderStatus, updateOrder, fetchOrdersByRange } = useOrders(false);');

          // Add completeDelivery inline
          if (!content.includes('const completeDelivery = async')) {
              const inlineFunc = `
  const completeDelivery = async (id: string, completionPhotoUrl?: string, completedBy?: string) => {
    try {
      const order = orders.find(o => o.id === id);
      if (!order) return;
      const newDeliveryInfo = {
        ...(order.delivery_info || {}),
        completionPhotoUrl,
        completedAt: new Date().toISOString(),
        completedBy
      };
      await updateOrder(id, {
        status: 'completed',
        delivery_info: newDeliveryInfo as any
      });
      try {
        const { sendDeliveryCompletionAlimtalk } = await import('@/lib/alimtalk-service');
        await sendDeliveryCompletionAlimtalk(order);
      } catch (err) {
        console.log("Alimtalk not connected or failed:", err);
      }
      toast({ title: '배송 완료 처리 및 알림톡 발송 (설정된 경우) 완료.' });
    } catch (e) {
      toast({ variant: 'destructive', title: '배송 완료 처리 실패' });
    }
  };
`;
              content = content.replace('const [searchTerm, setSearchTerm] = useState(\'\');', 'const [searchTerm, setSearchTerm] = useState(\'\');\n' + inlineFunc);
          }

          // Remove transferInfo
          content = content.replace(/&& order\.transferInfo\?\.processBranchName !== userBranch/g, '');
          content = content.replace(/&& order\.transferInfo\?\.processBranchName !== selectedBranch/g, '');
          
          // Remove tenantName check
          content = content.replace(/&& order\.tenantName !== userBranch/g, '');
          content = content.replace(/&& order\.tenantName !== selectedBranch/g, '');
      }

      fs.writeFileSync(fullPath, content);
    }
  }
}

processDir(dir);
console.log("Done fixing pickup-delivery");
