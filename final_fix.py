import os
import re

page_path = r"d:\mapp\florasync-saas\src\app\dashboard\orders\new\page.tsx"

with open(page_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Replace sonner
content = re.sub(r'import\s*\{\s*useToast\s*\}\s*from\s*["\']@/components/ui/use-toast["\'];?', '', content)
content = re.sub(r'import\s*\{\s*useToast\s*\}\s*from\s*["\']@/hooks/use-toast["\'];?', '', content)
content = re.sub(r'//\s*import\s*\{\s*useToast\s*\}\s*from\s*["\']@/hooks/use-toast["\'];?', '', content)
if 'import { toast } from "sonner";' not in content:
    content = content.replace('import { Loader2 } from "lucide-react";', 'import { Loader2 } from "lucide-react";\nimport { toast } from "sonner";')
content = re.sub(r'const\s*\{\s*toast\s*\}\s*=\s*useToast\(\);?', '', content)

# Update toast calls
content = re.sub(r'toast\(\{\s*variant:\s*["\']destructive["\'],\s*title:\s*(["\'].*?["\']),\s*description:\s*(["\'].*?["\'`])\s*\}\)', r'toast.error(\1, { description: \2 })', content)
content = re.sub(r'toast\(\{\s*title:\s*(["\'].*?["\']),\s*description:\s*(["\'].*?["\'`])\s*\}\)', r'toast.success(\1, { description: \2 })', content)


# 2. Fix other missing TS imports and types
# The OrderItem interface
content = re.sub(r'interface OrderItem extends Product\s*\{.*?\n\}', 
    'interface OrderItem {\n  id: string;\n  name: string;\n  price: number;\n  stock: number;\n  quantity: number;\n  isCustomProduct?: boolean;\n  main_category?: string;\n  mid_category?: string;\n  supplier?: string;\n}', 
    content, flags=re.DOTALL)

# Fix remaining instances of 'c' parameter any types
content = re.sub(r'\(c\)\s*=>', r'(c: any) =>', content)

# Fix 'df' parameter
content = re.sub(r'\(df\)\s*=>', r'(df: any) =>', content)
content = re.sub(r'df\s*=>', r'(df: any) =>', content)

# Fix e parameter
content = re.sub(r'\(e\)\s*=>', r'(e: any) =>', content)

# Fix branch id and branch name which might be on 'foundOrder' but shouldn't be extracted
content = re.sub(r'foundOrder\.branchId', r'foundOrder.tenant_id', content)
content = re.sub(r'foundOrder\.branchName', r'""', content)
content = re.sub(r'order\.branchId', r'order.tenant_id', content)
content = re.sub(r'order\.branchName', r'""', content)

# Some other missing Order and OrderData properties
content = re.sub(r'isAnonymous,', r'', content)
content = re.sub(r'orderType,\s*// Default store', r'', content)
content = re.sub(r'request:\s*specialRequest', r'memo: specialRequest', content)

# Remove unused
content = re.sub(r'const\s*useDiscountSettings\s*=\s*\(\)\s*=>\s*(\{.*?\});', r'', content)

# Format the message payload properly
content = re.sub(r'as\s*any,\s*memo:\s*specialRequest,', r'as any,\n      memo: specialRequest,', content)

with open(page_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
