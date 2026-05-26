import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
import { runTenantMasterSeedBulk } from "./src/lib/tenant-master-seed/run-seed";
import { TENANT_MASTER_SEED_V2026_05_21_YEOUIDO } from "./src/lib/tenant-master-seed/seeds/v2026-05-21-yeouido.generated";
import { TENANT_MASTER_SEED_DELIVERY_GWANGHWAMUN } from "./src/lib/tenant-master-seed/seeds/delivery-gwanghwamun";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE credentials");
  process.exit(1);
}

const admin = createClient(supabaseUrl, supabaseKey);

const eastpoleSeedWithDelivery = {
  ...TENANT_MASTER_SEED_V2026_05_21_YEOUIDO,
  delivery: { ...TENANT_MASTER_SEED_DELIVERY_GWANGHWAMUN },
};

async function main() {
  console.log("Fetching tenants...");
  const { data: tenants, error } = await admin.from("tenants").select("id, name");
  if (error) {
    console.error("Failed to fetch tenants:", error);
    process.exit(1);
  }

  if (!tenants || tenants.length === 0) {
    console.log("No tenants found.");
    return;
  }

  const tenantIds = tenants.map((t) => t.id);
  console.log(`Applying Eastpole seed to ${tenantIds.length} tenants...`);

  try {
    const result = await runTenantMasterSeedBulk(admin, tenantIds, eastpoleSeedWithDelivery, { dryRun: false });
    console.log("Done!", result);
  } catch (err) {
    console.error("Error during bulk apply:", err);
  }
}

main();
