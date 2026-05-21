import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
admin
  .from("system_settings")
  .select("*")
  .limit(3)
  .then((res) => {
    console.log(res.data?.map((r) => ({ id: r.id, tenant_id: r.tenant_id })));
  });
