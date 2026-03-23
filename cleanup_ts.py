import os
import re

def fix_file(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # Clean up duplicate imports
    content = re.sub(r"import \{ Order, OrderData \} from '@\/types\/order';;\s*import \{ Order, OrderData \} from \"@\/types\/order\";", r"import { Order, OrderData } from '@/types/order';", content)
    content = re.sub(r"import \{ Product \} from '@\/types\/product';;\s*import \{ Product \} from \"@\/types\/product\";", r"import { Product } from '@/types/product';", content)
    content = re.sub(r"import \{ Customer \} from '@\/types\/customer';;\s*import \{ Customer \} from \"@\/types\/customer\";", r"import { Customer } from '@/types/customer';", content)
    
    # Textarea typo / export issue
    content = re.sub(r"import \{ Textarea \} from \"@/components/ui/textarea\"", r"import { Textarea } from '@/components/ui/textarea'", content)

    # Some remaining 'Branch' usages as type
    content = re.sub(r"branch:\s*Branch", r"branch: any", content)
    content = re.sub(r"b:\s*Branch", r"b: any", content)
    content = re.sub(r"Branch\s*\|", r"any |", content)
    content = re.sub(r"\|\s*Branch", r"| any", content)
    content = re.sub(r"\(branch:\s*any\)", r"(branch: any)", content)
    content = re.sub(r"\(b:\s*any\)", r"(b: any)", content)
    content = re.sub(r"Branch\[\]", r"any[]", content)

    # Duplicate Order, OrderData imports in page.tsx
    lines = content.split('\n')
    unique_lines = []
    seen_imports = set()
    for line in lines:
        if line.startswith('import ') and ('@/types/' in line or '@/hooks/' in line):
            if line not in seen_imports:
                seen_imports.add(line)
                unique_lines.append(line)
        else:
            unique_lines.append(line)
    content = '\n'.join(unique_lines)
    
    # Fix 'Tenant_name' / 'tenant_id' in Order where it doesn't exist? (it does in SaaS)
    
    with open(filepath, "w", encoding="utf-8") as f:
        f.write(content)

base_dir = r"d:\mapp\florasync-saas\src\app\dashboard\orders\new"
for root, _, files in os.walk(base_dir):
    for file in files:
        if file.endswith('.tsx') or file.endswith('.ts'):
            fix_file(os.path.join(root, file))

print("Cleanup done")
