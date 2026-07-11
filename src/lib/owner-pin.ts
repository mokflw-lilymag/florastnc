import { createAdminClient } from "@/utils/supabase/admin";

function settingsRowId(tenantId: string) {
  return `settings_${tenantId}`;
}

export async function readOwnerPinCode(
  tenantId: string,
  ownerUserId: string,
): Promise<string | null> {
  const adminClient = createAdminClient();
  if (!adminClient) return null;

  const { data: settingsRow } = await adminClient
    .from("system_settings")
    .select("data")
    .eq("id", settingsRowId(tenantId))
    .maybeSingle();

  const fromSettings =
    settingsRow?.data &&
    typeof settingsRow.data === "object" &&
    "ownerPinCode" in settingsRow.data
      ? String((settingsRow.data as Record<string, unknown>).ownerPinCode ?? "")
      : "";

  if (fromSettings.length === 4) return fromSettings;

  const { data: profile } = await adminClient
    .from("profiles")
    .select("pin_code")
    .eq("id", ownerUserId)
    .maybeSingle();

  const fromProfile = profile?.pin_code ? String(profile.pin_code) : "";
  return fromProfile.length === 4 ? fromProfile : null;
}

export async function writeOwnerPinCode(
  tenantId: string,
  ownerUserId: string,
  newPin: string,
): Promise<void> {
  const adminClient = createAdminClient();
  if (!adminClient) throw new Error("Admin client not configured");

  const { data: settingsRow } = await adminClient
    .from("system_settings")
    .select("data")
    .eq("id", settingsRowId(tenantId))
    .maybeSingle();

  const existingData =
    settingsRow?.data && typeof settingsRow.data === "object"
      ? (settingsRow.data as Record<string, unknown>)
      : {};

  const { error: settingsError } = await adminClient.from("system_settings").upsert(
    {
      id: settingsRowId(tenantId),
      tenant_id: tenantId,
      data: { ...existingData, ownerPinCode: newPin },
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" },
  );

  if (settingsError) {
    throw new Error(settingsError.message);
  }

  const { error: profileError } = await adminClient
    .from("profiles")
    .update({ pin_code: newPin })
    .eq("id", ownerUserId);

  if (profileError && !profileError.message.includes("pin_code")) {
    throw new Error(profileError.message);
  }
}
