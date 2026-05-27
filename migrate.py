import os
import re

SOURCE_DIR = r"D:\lilymagerp-v4_supa\src\app\dashboard"
TARGET_DIR = r"D:\mapp\floxync.com\src\app\dashboard"

FILES = [
    r"orders\new-mobile\page.tsx",
    r"pickup-delivery\page.tsx",
    r"pos\quick\page.tsx"
]

def migrate_file(rel_path):
    src = os.path.join(SOURCE_DIR, rel_path)
    dst = os.path.join(TARGET_DIR, rel_path)
    
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    
    with open(src, "r", encoding="utf-8") as f:
        content = f.read()
        
    # Replacements
    # 1. Supabase import
    content = content.replace('import { supabase } from "@/lib/supabase";', "import { createClient } from '@/utils/supabase/client';")
    content = content.replace('import { supabase } from "@/lib/supabase"', "import { createClient } from '@/utils/supabase/client'")
    
    # Replace global 'supabase' instances with 'const supabase = createClient();' if needed, 
    # but we will just add it at the top of the component later manually if it's missing.
    # Actually, let's inject it right after the component declaration if we can, or just replace `supabase` with `createClient()` inline?
    # No, we will replace `supabase.` with `supabase.` and ensure we declare it.
    
    # 2. branch_id to tenant_id
    content = content.replace("'branch_id'", "'tenant_id'")
    content = content.replace("branch_id:", "tenant_id:")
    
    # 3. useBranches to tenant flow
    # We will let TS errors guide the precise logic, but we can do simple ones:
    content = content.replace("branch_name", "tenant_name")
    
    with open(dst, "w", encoding="utf-8") as f:
        f.write(content)
        
    print(f"Migrated {rel_path}")

for f in FILES:
    migrate_file(f)
