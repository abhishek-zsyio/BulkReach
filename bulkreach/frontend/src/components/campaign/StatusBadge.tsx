import { getStatusBadgeClass } from "@/utils/helpers";
import type { CampaignStatus } from "@/types/campaign";

interface StatusBadgeProps {
  status: CampaignStatus | string;
}

const statusDots: Record<string, string> = {
  running: "bg-rose-iris animate-pulse",
  queued: "bg-rose-gold animate-pulse",
  done: "bg-rose-foam",
  failed: "bg-rose-love",
  paused: "bg-rose-rose",
  draft: "bg-rose-subtle",
  cancelled: "bg-rose-muted",
  sent: "bg-rose-foam",
  pending: "bg-rose-subtle",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const dot = statusDots[status] ?? "bg-rose-muted";
  return (
    <span className={getStatusBadgeClass(status)}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${dot}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
