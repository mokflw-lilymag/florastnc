import { Badge } from "@/components/ui/badge";
import type { TenantHealthFlags } from "@/lib/support-tickets/admin-list";
import type { SupportTicketStatus } from "@/lib/support-tickets/types";

type Props = TenantHealthFlags & {
  status: SupportTicketStatus;
  has_admin_reply: boolean;
  compact?: boolean;
};

export function SupportTenantHealthBadges({
  status,
  has_admin_reply,
  tenant_suspended,
  tenant_subscription_expired,
  tenant_plan,
  compact,
}: Props) {
  const badges: Array<{ key: string; label: string; className: string }> = [];

  if (status === "open" && !has_admin_reply) {
    badges.push({
      key: "unanswered",
      label: "미답변",
      className: "bg-red-100 text-red-800 border-red-200",
    });
  }
  if (tenant_suspended) {
    badges.push({
      key: "suspended",
      label: "정지",
      className: "bg-rose-100 text-rose-800 border-rose-200",
    });
  }
  if (tenant_subscription_expired && !tenant_suspended) {
    badges.push({
      key: "expired",
      label: "만료",
      className: "bg-orange-100 text-orange-800 border-orange-200",
    });
  }
  if (tenant_plan && tenant_plan !== "free" && !compact) {
    badges.push({
      key: "plan",
      label: tenant_plan,
      className: "bg-slate-100 text-slate-600 border-slate-200",
    });
  }

  if (badges.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {badges.map((b) => (
        <Badge key={b.key} variant="outline" className={`text-[10px] px-1.5 py-0 h-5 ${b.className}`}>
          {b.label}
        </Badge>
      ))}
    </div>
  );
}
