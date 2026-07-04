import type { SupportTicketListItem, SupportTicketRow } from "@/lib/support-tickets/types";
import { toListItem } from "@/lib/support-tickets/mask";

export type TenantHealthFlags = {
  tenant_plan: string | null;
  tenant_suspended: boolean;
  tenant_subscription_expired: boolean;
};

export type AdminSupportTicketListItem = SupportTicketListItem & TenantHealthFlags;

type TenantJoin = {
  name?: string;
  plan?: string;
  status?: string;
  subscription_end?: string | null;
};

export function tenantHealthFromJoin(tenant: TenantJoin | null | undefined): TenantHealthFlags {
  if (!tenant) {
    return {
      tenant_plan: null,
      tenant_suspended: false,
      tenant_subscription_expired: false,
    };
  }
  const subEnd = tenant.subscription_end ?? null;
  const expired = !subEnd || new Date(subEnd) < new Date();
  return {
    tenant_plan: (tenant.plan as string) ?? null,
    tenant_suspended: tenant.status === "suspended",
    tenant_subscription_expired: expired,
  };
}

export function toAdminListItem(
  row: SupportTicketRow & { tenants?: TenantJoin | null },
  viewerUserId: string,
): AdminSupportTicketListItem {
  const base = toListItem(row, viewerUserId, true);
  const health = tenantHealthFromJoin(row.tenants ?? null);
  return {
    ...base,
    store_name: row.tenants?.name ?? null,
    ...health,
  };
}
