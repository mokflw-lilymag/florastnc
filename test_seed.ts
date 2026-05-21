import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
admin.from("tenants").select("id").limit(1).then((r) => {
  const tenantId = r.data![0].id;
  console.log("Tenant:", tenantId);
  admin
    .from("products")
    .insert({
      tenant_id: tenantId,
      name: "Test Prod",
      main_category: "A",
      mid_category: null,
      price: 0,
      stock: 0,
      code: "TEST-01",
      status: "active",
      supplier: null,
      supplier_id: null,
      extra_data: { _seed: { version: "1.0", kind: "product", index: 0 } },
      updated_at: new Date().toISOString(),
    })
    .then(console.log);
});
