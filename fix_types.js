const fs = require('fs');
const path = require('path');

const dirPath = "d:\\mapp\\florasync-saas\\src\\app\\dashboard\\orders\\new";

const exactReplacements = {
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
    "useBranches()": "{ branches: [], loading: false }",
};

function walkDir(dir) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            let content = fs.readFileSync(dirPath, 'utf8');
            for (let [key, val] of Object.entries(exactReplacements)) {
                content = content.split(key).join(val);
            }
            content = content.replace(/import\s*\{\s*useCustomers\s*,\s*Customer\s*\}\s*from\s*["']@\/hooks\/use-customers["']/g, "import { useCustomers } from '@/hooks/use-customers';\nimport { Customer } from '@/types/customer';");
            content = content.replace(/import\s*\{\s*useProducts\s*,\s*Product\s*\}\s*from\s*["']@\/hooks\/use-products["']/g, "import { useProducts } from '@/hooks/use-products';\nimport { Product } from '@/types/product';");
            fs.writeFileSync(dirPath, content, 'utf8');
        }
    });
}

walkDir(dirPath);
console.log("Done");
