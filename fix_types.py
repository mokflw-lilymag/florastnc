import os
import re

dir_path = r"d:\mapp\florasync-saas\src\app\dashboard\orders\new"

# Basic string replacements
exact_replacements = {
    "companyName": "company_name",
    "mainCategory": "main_category",
    "midCategory": "mid_category",
    "orderDate": "order_date",
    "receiptType": "receipt_type",
    "pickupInfo": "pickup_info",
    "deliveryInfo": "delivery_info",
    "import Textarea": "import { Textarea }",
    "import { useBranches, Branch } from \"@/hooks/use-branches\";": "",
    "import { useDiscountSettings } from \"@/hooks/use-discount-settings\";": "const useDiscountSettings = () => ({ discountSettings: null, getActiveDiscountRates: () => [] });",
    "import { useOrders, OrderData, Order } from \"@/hooks/use-orders\";": "import { useOrders } from \"@/hooks/use-orders\";\nimport { Order, OrderData } from \"@/types/order\";",
    "import { useProducts, Product } from \"@/hooks/use-products\";": "import { useProducts } from \"@/hooks/use-products\";\nimport { Product } from \"@/types/product\";",
    "import { useCustomers, Customer } from \"@/hooks/use-customers\";": "import { useCustomers } from \"@/hooks/use-customers\";\nimport { Customer } from \"@/types/customer\";",
    "const { branches, loading: branchesLoading } = useBranches();": "const branches: any[] = []; const branchesLoading = false;",
}

for root, _, files in os.walk(dir_path):
    for filename in files:
        if filename.endswith(".tsx") or filename.endswith(".ts"):
            path = os.path.join(root, filename)
            with open(path, "r", encoding="utf-8") as f:
                content = f.read()
            
            for key, val in exact_replacements.items():
                content = content.replace(key, val)
                
            # Regex replacements for hooks imports that might not be exact
            content = re.sub(r'import \{ useCustomers, Customer \} from "@/hooks/use-customers";', r"import { useCustomers } from '@/hooks/use-customers';\nimport { Customer } from '@/types/customer';", content)
            content = re.sub(r'import \{ useProducts, Product \} from "@/hooks/use-products";', r"import { useProducts } from '@/hooks/use-products';\nimport { Product } from '@/types/product';", content)
            
            with open(path, "w", encoding="utf-8") as f:
                f.write(content)

print("Replacement complete.")
