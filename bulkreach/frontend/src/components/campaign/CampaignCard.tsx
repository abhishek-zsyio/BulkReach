import { useNavigate } from "react-router-dom";
import { Users, Calendar, ArrowRight, Trash2, Mailbox } from "lucide-react";
import type { Campaign } from "@/types/campaign";
import { StatusBadge } from "./StatusBadge";
import { formatDate } from "@/utils/helpers";
import { useDeleteCampaignMutation } from "@/api/campaignApi";
import toast from "react-hot-toast";
import { useConfirm } from "@/components/ui/dialogs";

interface CampaignCardProps {
  campaign: Campaign;
}

export function CampaignCard({ campaign }: CampaignCardProps) {
  const navigate = useNavigate();
  const progress = campaign.progress_percent;
  const [deleteCampaign, { isLoading: isDeleting }] = useDeleteCampaignMutation();
  const { confirm, modal } = useConfirm();

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Delete Campaign",
      message: `Are you sure you want to delete "${campaign.name}"? This action cannot be undone.`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteCampaign(campaign.id).unwrap();
      toast.success("Campaign deleted successfully.");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete campaign.");
    }
  };

  const isRunning = campaign.status === "running";

  return (
    <div
      className="group relative card card-interactive overflow-hidden flex flex-col justify-between min-h-[185px] p-5"
      onClick={() => navigate(`/campaigns/${campaign.id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/campaigns/${campaign.id}`)}
    >
      {isRunning && (
        <div
          className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-brand"
        />
      )}

      {/* Header section */}
      <div className="flex items-start justify-between mb-4 relative z-10">
        <div className="flex gap-3.5 items-center min-w-0 flex-1 mr-3">
          {/* Icon Container */}
          <div className="w-12 h-12 rounded-none flex items-center justify-center bg-rose-surface border-2 border-rose-border flex-shrink-0 transition-all duration-150">
            <Mailbox size={20} className="text-rose-pine stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-extrabold text-lg text-rose-text truncate group-hover:text-rose-pine transition-colors">{campaign.name}</h3>
            <p className="text-xs text-rose-muted mt-0.5 truncate font-extrabold">{campaign.subject_template || "No subject set"}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusBadge status={campaign.status} />
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-7 h-7 rounded-none flex items-center justify-center text-rose-muted border border-transparent hover:text-rose-love hover:border-rose-love transition-colors shrink-0"
            title="Delete Campaign"
          >
            {isDeleting ? (
              <span className="animate-spin rounded-none h-3.5 w-3.5 border-2 border-rose-hl-med border-t-rose-love inline-block" />
            ) : (
              <Trash2 size={13} />
            )}
          </button>
        </div>
      </div>

      {/* Footer / Stats section */}
      <div className="mt-auto space-y-4 relative z-10">
        {/* Progress bar */}
        {campaign.total_recipients > 0 && (
          <div>
            <div className="flex justify-between items-end mb-1.5">
              <span className="text-[10px] font-extrabold text-rose-muted uppercase tracking-wider">{campaign.sent_count} / {campaign.total_recipients} Sent</span>
              <span className="text-sm font-black text-rose-text">{progress}%</span>
            </div>
            <div className="h-2 rounded-none overflow-hidden bg-rose-overlay border-2 border-rose-border">
              <div
                className="h-full rounded-none transition-all duration-1000 ease-out"
                style={{
                  width: `${progress}%`,
                  background: campaign.status === "failed"
                    ? "var(--color-love)"
                    : campaign.status === "done"
                    ? "var(--color-foam)"
                    : "var(--color-pine)",
                }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-rose-hl-med pt-4">
          <div className="flex items-center gap-4 text-xs font-bold text-rose-muted">
            <span className="flex items-center gap-1.5 hover:text-rose-text transition-colors">
              <Users size={14} className="text-rose-pine stroke-[2.5]" />
              {campaign.total_recipients} Targets
            </span>
          </div>
          
          <div className="flex items-center gap-1.5 text-xs font-bold text-rose-muted group-hover:text-rose-text transition-colors">
            <Calendar size={13} />
            {formatDate(campaign.created_at)}
            <ArrowRight size={14} className="ml-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all text-rose-pine duration-150" />
          </div>
        </div>
      </div>
      {modal}
    </div>
  );
}
