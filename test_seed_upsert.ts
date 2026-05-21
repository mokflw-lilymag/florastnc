import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
admin.from("tenants").select("id").limit(1).then((r) => {
  const tenantId = r.data![0].id;
  admin
    .from("system_settings")
    .upsert({
      id: "product_categories",
      tenant_id: tenantId,
      data: {},
    })
    .then(console.log);
});
