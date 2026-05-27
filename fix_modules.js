const fs = require('fs');

// 1. Fix use-simple-expenses.ts
let expPath = 'D:\\mapp\\floxync.com\\src\\hooks\\use-simple-expenses.ts';
let expContent = fs.readFileSync(expPath, 'utf8');

// Replace import
expContent = expContent.replace(
  'import { useToast } from "@/components/ui/use-toast";',
  'import { toast } from "sonner";'
);
// Remove destructured useToast
expContent = expContent.replace(/  const \{ toast \} = useToast\(\);\r?\n/, '');

// Fix toast calls
expContent = expContent.replace(/toast\(\{\s*variant:\s*"destructive",\s*title:\s*"[^"]*",\s*description:\s*"([^"]*)"\s*\}\)/g, 'toast.error("$1")');
expContent = expContent.replace(/toast\(\{\s*title:\s*"[^"]*",\s*description:\s*"([^"]*)"\s*\}\)/g, 'toast.success("$1")');

// Wait! Some toasts might use variables like description: `${payloads.length}개 지출 등록됨`
expContent = expContent.replace(/toast\(\{\s*title:\s*"[^"]*",\s*description:\s*([^}]*)\s*\}\)/g, 'toast.success($1)');


fs.writeFileSync(expPath, expContent);


// 2. Fix order-detail-dialog.tsx
let dialogPath = 'D:\\mapp\\floxync.com\\src\\app\\dashboard\\pickup-delivery\\components\\order-detail-dialog.tsx';
let dialogContent = fs.readFileSync(dialogPath, 'utf8');

dialogContent = dialogContent.replace(/import \{ useBranches \} from "@\/hooks\/use-branches";\r?\n/, '');
dialogContent = dialogContent.replace(
  'import { useToast } from "@/hooks/use-toast";',
  'import { toast } from "sonner";'
);
dialogContent = dialogContent.replace(/  const \{ toast \} = useToast\(\);\r?\n/, '');
dialogContent = dialogContent.replace(/  const \{ branches \} = useBranches\(\);\r?\n/, '');

// Replace branchId with tenantId logic
dialogContent = dialogContent.replace(
  '  const { user } = useAuth();',
  '  const { user, tenantId } = useAuth();'
);
dialogContent = dialogContent.replace(
  "const branchId = branches.find(b => b.name === tenantName)?.id || branches[0]?.id || '';",
  "const branchId = tenantId || '';"
);

// Fix specific toast
dialogContent = dialogContent.replace(
  /toast\(\{\s*variant:\s*'destructive',\s*title:\s*'정정 저장 오류',\s*description:\s*(.*?)\s*\}\);/gs,
  'toast.error($1);'
);

fs.writeFileSync(dialogPath, dialogContent);

console.log("Modules fixed");
