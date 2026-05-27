const fs = require('fs');
const files = [
  'D:\\mapp\\floxync.com\\src\\app\\dashboard\\orders\\new-mobile\\page.tsx',
  'D:\\mapp\\floxync.com\\src\\app\\dashboard\\pickup-delivery\\components\\DeliverySettingsDialog.tsx',
  'D:\\mapp\\floxync.com\\src\\app\\dashboard\\pickup-delivery\\page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    
    // Replace import
    content = content.replace(
      'import { useToast } from "@/hooks/use-toast";',
      'import { toast } from "sonner";'
    );
    
    // Remove destructured useToast
    content = content.replace(/  const \{ toast \} = useToast\(\);\r?\n/g, '');
    
    // Fix toast calls
    content = content.replace(/toast\(\{\s*variant:\s*"destructive",\s*title:\s*"[^"]*",\s*description:\s*"([^"]*)"\s*\}\)/g, 'toast.error("$1")');
    content = content.replace(/toast\(\{\s*title:\s*"[^"]*",\s*description:\s*"([^"]*)"\s*\}\)/g, 'toast.success("$1")');
    
    // Some toasts have single quotes
    content = content.replace(/toast\(\{\s*variant:\s*'destructive',\s*title:\s*'[^']*',\s*description:\s*'([^']*)'\s*\}\)/g, "toast.error('$1')");
    content = content.replace(/toast\(\{\s*title:\s*'[^']*',\s*description:\s*'([^']*)'\s*\}\)/g, "toast.success('$1')");

    // Dynamic description e.g. description: error.message
    content = content.replace(/toast\(\{\s*variant:\s*['"]destructive['"],\s*title:\s*['"][^'"]*['"],\s*description:\s*([^}]*)\s*\}\)/g, 'toast.error($1)');
    content = content.replace(/toast\(\{\s*title:\s*['"][^'"]*['"],\s*description:\s*([^}]*)\s*\}\)/g, 'toast.success($1)');

    fs.writeFileSync(file, content);
  }
}

console.log("Remaining toasts fixed");
