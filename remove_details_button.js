const fs = require('fs');

let pagePath = 'D:\\mapp\\floxync.com\\src\\app\\dashboard\\mobile\\pickup\\page.tsx';
let content = fs.readFileSync(pagePath, 'utf8');

// 1. Remove handleUpdateDeliveryCost
content = content.replace(
  /  const handleUpdateDeliveryCost = async \(orderId: string, cardCost: number, cashCost: number\) => \{\r?\n    const ok = await updateOrder\(orderId, \{\r?\n      actual_delivery_cost: cardCost,\r?\n      actual_delivery_cost_cash: cashCost,\r?\n    \} as Partial<Order>\);\r?\n    if \(ok\) toast\.success\("배송비가 저장되었습니다\."\);\r?\n    else toast\.error\("배송비 저장에 실패했습니다\."\);\r?\n  \};\r?\n/g,
  ''
);

// 2. Remove onUpdateDeliveryCost from PickupOrderCard invocation
content = content.replace(/              onUpdateDeliveryCost=\{handleUpdateDeliveryCost\}\r?\n/g, '');

// 3. Remove onUpdateDeliveryCost from PickupOrderCard props
content = content.replace(/  onUpdateDeliveryCost,\r?\n/g, '');
content = content.replace(/  onUpdateDeliveryCost: \(id: string, cardCost: number, cashCost: number\) => void;\r?\n/g, '');

// 4. Remove state variables and useMemo
content = content.replace(/  const \[expanded, setExpanded\] = useState\(false\);\r?\n/g, '');
content = content.replace(/  const \[cardCost, setCardCost\] = useState\(order\.actualDeliveryCost \|\| 0\);\r?\n/g, '');
content = content.replace(/  const \[cashCost, setCashCost\] = useState\(order\.actualDeliveryCostCash \|\| 0\);\r?\n/g, '');
content = content.replace(/  \/\/ Sync state if order changes externally\r?\n  useMemo\(\(\) => \{\r?\n    setCardCost\(order\.actualDeliveryCost \|\| 0\);\r?\n    setCashCost\(order\.actualDeliveryCostCash \|\| 0\);\r?\n  \}, \[order\.actualDeliveryCost, order\.actualDeliveryCostCash\]\);\r?\n/g, '');

// 5. Remove 상세보기 button block
const buttonRegex = /\s*<button\r?\n\s*onClick=\{\(\) => setExpanded\(!expanded\)\}\r?\n\s*className="text-\[10px\] font-bold text-emerald-600 underline"\r?\n\s*>\r?\n\s*\{expanded \? "접기" : "상세보기"\}\r?\n\s*<\/button>\r?\n/g;
content = content.replace(buttonRegex, '\n');

// 6. Remove expanded section completely
// We can use a regex or string matching to remove the whole section from {/* Expanded Details */} to the end of the component.
// The component ends with:
//         </div>
//       )}
//     </div>
//   );
// }

const expandedDetailsRegex = /\s*\{\/\* Expanded Details \*\/\}\r?\n\s*\{expanded && \([\s\S]*?\r?\n\s*\}\)\r?\n\s*<\/div>\r?\n\s*\);\r?\n\s*\}/g;

content = content.replace(expandedDetailsRegex, '\n    </div>\n  );\n}');

fs.writeFileSync(pagePath, content);
console.log("Details button and expanded view removed.");
