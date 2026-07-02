import type { createAdminClient } from "@/utils/supabase/admin";
import { isPlatformSuperEmail } from "@/lib/platform-super-emails";

export const HQ_DELEGATE_SLOT_MAX = 1;

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

export type OrgDelegateMemberRow = {
  userId: string;
  email: string;
  isHqRep: boolean;
  canRemove: boolean;
};

export type OrgDelegateSnapshot = {
  organizationId: string;
  organizationName: string;
  hqRepEmails: string[];
  members: OrgDelegateMemberRow[];
  delegateSlotMax: number;
  delegateSlotUsed: number;
  canAddDelegate: boolean;
};

export async function getHqRepEmailsForOrg(
  admin: AdminClient,
  organizationId: string,
): Promise<string[]> {
  const { data: org } = await admin
    .from("organizations")
    .select("hq_tenant_id")
    .eq("id", organizationId)
    .maybeSingle();

  const hqTenantId = org?.hq_tenant_id as string | null;
  if (!hqTenantId) return [];

  const { data: admins } = await admin
    .from("profiles")
    .select("email")
    .eq("tenant_id", hqTenantId)
    .in("role", ["tenant_admin", "org_admin"]);

  return (admins ?? [])
    .map((a) => (a.email ?? "").trim().toLowerCase())
    .filter((e) => e && !isPlatformSuperEmail(e));
}

export async function resolveOrgAdminOrganizationId(
  admin: AdminClient,
  userId: string,
): Promise<string | null> {
  const { data } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", userId)
    .eq("role", "org_admin")
    .order("created_at", { ascending: true })
    .limit(1);

  return (data?.[0]?.organization_id as string | undefined) ?? null;
}

export async function assertCallerIsOrgAdmin(
  admin: AdminClient,
  userId: string,
  organizationId: string,
): Promise<boolean> {
  const { data } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  return data?.role === "org_admin";
}

export async function loadOrgDelegateSnapshot(
  admin: AdminClient,
  organizationId: string,
): Promise<OrgDelegateSnapshot | null> {
  const [orgRes, hqRepEmails, memsRes] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .maybeSingle(),
    getHqRepEmailsForOrg(admin, organizationId),
    admin
      .from("organization_members")
      .select("user_id")
      .eq("organization_id", organizationId)
      .eq("role", "org_admin")
  ]);

  const org = orgRes.data;
  if (!org) return null;

  const hqRepSet = new Set(hqRepEmails);
  const mems = memsRes.data;

  const userIds = [...new Set((mems ?? []).map((m) => m.user_id as string))];
  let emailByUserId: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profs } = await admin
      .from("profiles")
      .select("id, email")
      .in("id", userIds);
    emailByUserId = Object.fromEntries(
      (profs ?? []).map((p) => [p.id as string, String(p.email ?? "")]),
    );
  }

  const members: OrgDelegateMemberRow[] = userIds
    .map((userId) => {
      const email = (emailByUserId[userId] ?? "").trim();
      const lower = email.toLowerCase();
      if (!lower || isPlatformSuperEmail(lower)) return null;
      const isHqRep = hqRepSet.has(lower);
      return {
        userId,
        email,
        isHqRep,
        canRemove: !isHqRep,
      };
    })
    .filter((m): m is OrgDelegateMemberRow => m !== null);

  const delegateSlotUsed = members.filter((m) => !m.isHqRep).length;

  return {
    organizationId,
    organizationName: String(org.name ?? ""),
    hqRepEmails,
    members,
    delegateSlotMax: HQ_DELEGATE_SLOT_MAX,
    delegateSlotUsed,
    canAddDelegate: delegateSlotUsed < HQ_DELEGATE_SLOT_MAX,
  };
}

export function countDelegates(members: OrgDelegateMemberRow[]): number {
  return members.filter((m) => !m.isHqRep).length;
}
