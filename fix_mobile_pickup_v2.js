const fs = require('fs');

const filePath = 'D:\\mapp\\floxync.com\\src\\app\\dashboard\\mobile\\pickup\\page.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add setOrders
content = content.replace(
  'const { orders, loading, isRefreshing, fetchOrders, updateOrder } = useOrders();',
  'const { orders, loading, isRefreshing, fetchOrders, updateOrder, setOrders } = useOrders();'
);

// 2. Add imports for OrderDetailDialog
if (!content.includes('OrderDetailDialog')) {
  content = content.replace(
    'import type { Order } from "@/types/order";',
    'import type { Order } from "@/types/order";\nimport { OrderDetailDialog } from "../../pickup-delivery/components/order-detail-dialog";'
  );
}

// 3. Add optimistic update in handleToggleProduction
content = content.replace(
  /const extra = \{ \.\.\.\(row\.extra_data \|\| \{\}\), production_completed: !current \};\r?\n\s*const ok = await updateOrder/g,
  'const extra = { ...(row.extra_data || {}), production_completed: !current };\n    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, extra_data: extra } : o));\n    const ok = await updateOrder'
);

// 4. Add selectedOrder state
content = content.replace(
  'const [completingId, setCompletingId] = useState<string | null>(null);',
  'const [completingId, setCompletingId] = useState<string | null>(null);\n  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);'
);

// 5. Wrap main return with fragment and add OrderDetailDialog
content = content.replace(
  /return \(\r?\n\s*<div className="flex h-full min-h-0 flex-col">/g,
  'return (\n    <>\n    <div className="flex h-full min-h-0 flex-col">'
);
content = content.replace(
  /<\/div>\r?\n\s*\);\r?\n\}\r?\n\r?\nfunction PickupOrderCard/g,
  '</div>\n      {selectedOrder && (\n        <OrderDetailDialog\n          open={!!selectedOrder}\n          onOpenChange={(open) => !open && setSelectedOrder(null)}\n          order={selectedOrder}\n        />\n      )}\n    </>\n  );\n}\n\nfunction PickupOrderCard'
);

// 6. Pass onOrderClick to PickupOrderCard
content = content.replace(
  /onUpdateDeliveryCost=\{handleUpdateDeliveryCost\}\r?\n\s*\/>/g,
  'onUpdateDeliveryCost={handleUpdateDeliveryCost}\n              onOrderClick={() => setSelectedOrder(order.originalOrder)}\n            />'
);

// 7. Update PickupOrderCard arguments (destructure onOrderClick)
content = content.replace(
  /function PickupOrderCard\(\{\r?\n\s*order,\r?\n\s*completingId,\r?\n\s*onToggleProduction,\r?\n\s*onComplete,\r?\n\s*onUpdateDeliveryCost,\r?\n\}: \{/g,
  'function PickupOrderCard({\n  order,\n  completingId,\n  onToggleProduction,\n  onComplete,\n  onUpdateDeliveryCost,\n  onOrderClick,\n}: {'
);

// 8. Update PickupOrderCard props type
content = content.replace(
  /onUpdateDeliveryCost: \(id: string, cardCost: number, cashCost: number\) => void;\r?\n\}\) \{/g,
  'onUpdateDeliveryCost: (id: string, cardCost: number, cashCost: number) => void;\n  onOrderClick: () => void;\n}) {'
);

// 9. Add onClick to order name
content = content.replace(
  /<h3 className="truncate text-sm font-black text-gray-900">\{order.ordererName\}<\/h3>/g,
  '<h3 onClick={onOrderClick} className="truncate text-sm font-black text-gray-900 cursor-pointer underline hover:text-emerald-600 decoration-emerald-200 underline-offset-4">{order.ordererName}</h3>'
);

fs.writeFileSync(filePath, content);
console.log("Mobile pickup fixed v2");
