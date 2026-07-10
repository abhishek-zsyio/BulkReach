import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import {
  ArrowLeft, Play, Pause, XCircle, Activity, FileText, Database,
  RefreshCw, ExternalLink, Plus, Copy, Trash2, Pencil, AlertTriangle, X, AlertCircle,
  Paperclip,
} from "lucide-react";
import {
  useGetCampaignQuery,
  useCreateGoogleSheetMutation,
  useSyncGoogleSheetMutation,
  useDeleteCampaignMutation,
  useUpdateCampaignMutation,
  useGetTemplatesQuery,
  useGetTemplateQuery,
} from "@/api/campaignApi";
import { useGetResumesQuery } from "@/api/resumeApi";
import { useGetRecipientsQuery } from "@/api/recipientApi";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { useCampaign } from "@/hooks/useCampaign";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/helpers";
import { LOG_POLL_INTERVAL_MS } from "@/utils/constants";
import toast from "react-hot-toast";
import { RecipientTableEditor } from "@/components/campaign/RecipientTableEditor";
import { CustomSelect } from "@/components/ui/CustomSelect";

const stripHtml = (html: string): string => {
  let docStr = html
    .replace(/<head[\s\S]*?<\/head>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "");
  
  docStr = docStr
    .replace(/<tr[\s\S]*?>/gi, "")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<td[\s\S]*?>/gi, " ")
    .replace(/<\/td>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[\s\S]*?>/gi, "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<div[\s\S]*?>/gi, "")
    .replace(/<\/div>/gi, "\n");
    
  const tempDiv = document.createElement("div");
  tempDiv.innerHTML = docStr;
  let text = tempDiv.textContent || tempDiv.innerText || "";
  
  text = text.replace(/\n{3,}/g, "\n\n");
  return text.trim();
};

export function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const campaignId = Number(id);
  const navigate = useNavigate();
  const { handleStart, handlePause, handleCancel } = useCampaign();
  const [createGoogleSheet, { isLoading: isCreatingSheet }] = useCreateGoogleSheetMutation();
  const [syncGoogleSheet, { isLoading: isSyncingSheet }] = useSyncGoogleSheetMutation();
  const [deleteCampaign, { isLoading: isDeleting }] = useDeleteCampaignMutation();
  const [updateCampaign, { isLoading: isUpdatingCampaign }] = useUpdateCampaignMutation();
  const { data: templates = [] } = useGetTemplatesQuery();
  const { user } = useAuth();

  // Pre-start email validation
  const [invalidEmailsModal, setInvalidEmailsModal] = useState<{ row: number; email: string }[] | null>(null);
  const [showStartPreviewModal, setShowStartPreviewModal] = useState(false);
  // Inline delete confirm state (avoids jarring browser dialog)
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const { data: allRecipientsData } = useGetRecipientsQuery(
    { campaignId, page: 1 },
    { skip: !campaignId }
  );

  const [editName, setEditName] = useState("");
  const [editSubject, setEditSubject] = useState("");
  const [editDelay, setEditDelay] = useState(1.5);
  const [editTemplateId, setEditTemplateId] = useState<string>("");
  const [editResumeId, setEditResumeId] = useState<string>("");
  const [editOpenTracking, setEditOpenTracking] = useState(true);
  const [editPlainTextMode, setEditPlainTextMode] = useState(false);
  const { data: resumes = [], isLoading: isResumesLoading } = useGetResumesQuery();

  const editDialogRef = useRef<HTMLDialogElement>(null);

  const handleEditClick = () => {
    if (!campaign) return;
    setEditName(campaign.name);
    setEditSubject(campaign.subject_template);
    setEditDelay(campaign.send_delay_seconds);
    setEditTemplateId(campaign.template?.toString() || "");
    setEditResumeId(campaign.resume?.toString() || "");
    setEditOpenTracking(campaign.open_tracking_enabled);
    setEditPlainTextMode(campaign.plain_text_mode);
    editDialogRef.current?.showModal();
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Campaign name is required.");
      return;
    }
    try {
      const templateChanged = campaign?.template !== (editTemplateId ? Number(editTemplateId) : null);
      
      await updateCampaign({
        id: campaignId,
        data: {
          name: editName,
          subject_template: editSubject,
          send_delay_seconds: editDelay,
          template: editTemplateId ? Number(editTemplateId) : null,
          resume: editResumeId ? Number(editResumeId) : null,
          open_tracking_enabled: editOpenTracking,
          plain_text_mode: editPlainTextMode,
        },
      }).unwrap();

      // If Google Sheet sync is enabled and template changed, trigger auto-sync
      if (templateChanged && campaign?.google_sheet_sync_enabled && campaign?.google_sheet_id) {
        try {
          toast.loading("Syncing Google Sheet headers...", { id: "sheet-sync" });
          await syncGoogleSheet(campaignId).unwrap();
          toast.success("Synced Google Sheet with new template variables!", { id: "sheet-sync" });
        } catch (syncErr) {
          console.error(syncErr);
          toast.error("Settings saved, but Google Sheet sync failed.", { id: "sheet-sync" });
        }
      }

      toast.success("Campaign settings updated!");
      editDialogRef.current?.close();
      refetch();
    } catch (err: any) {
      const errMsg = err?.data?.message || err?.message || "Failed to update campaign.";
      toast.error(errMsg);
    }
  };

  useEffect(() => {
    const dialog = editDialogRef.current;
    if (!dialog) return;

    if (!("closedBy" in HTMLDialogElement.prototype)) {
      const handleBackdropClick = (event: MouseEvent) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isDialogContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isDialogContent) {
          dialog.close();
        }
      };
      dialog.addEventListener("click", handleBackdropClick);
      return () => {
        dialog.removeEventListener("click", handleBackdropClick);
      };
    }
  }, []);

  const handleCreateSheet = async () => {
    try {
      const res = await createGoogleSheet(campaignId).unwrap();
      toast.success("Google Sheet created and linked!");
      refetch();
      if (res.spreadsheet_url) window.open(res.spreadsheet_url, "_blank");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to create Google Sheet");
    }
  };

  const handleSyncSheet = async () => {
    try {
      const res = await syncGoogleSheet(campaignId).unwrap();
      toast.success(res.message || "Synced recipients!");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to sync Google Sheet");
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      // Auto-reset after 3s if user doesn't confirm
      setTimeout(() => setDeleteConfirm(false), 3000);
      return;
    }
    setDeleteConfirm(false);
    try {
      await deleteCampaign(campaignId).unwrap();
      toast.success("Campaign deleted.");
      navigate("/campaigns");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to delete campaign.");
    }
  };

  const { data: campaign, refetch } = useGetCampaignQuery(campaignId);
  const { data: templateDetail } = useGetTemplateQuery(campaign?.template ?? 0, {
    skip: !campaign?.template,
  });

  const isLive = campaign?.status === "running" || campaign?.status === "queued";
  useEffect(() => {
    if (!isLive) return;
    const interval = setInterval(() => {
      refetch();
    }, LOG_POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isLive, refetch]);

  const hasSyncedRef = useRef(false);
  useEffect(() => {
    if (campaign?.google_sheet_sync_enabled && campaign?.google_sheet_id && !hasSyncedRef.current) {
      hasSyncedRef.current = true;
      syncGoogleSheet(campaignId).then(() => refetch()).catch(console.error);
    }
  }, [campaign?.google_sheet_id, campaign?.google_sheet_sync_enabled, campaignId, refetch, syncGoogleSheet]);

  if (!campaign) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-rose-hl-med border-t-rose-pine" />
      </div>
    );
  }

  const progress = campaign.progress_percent;

  const openRate = campaign.sent_count > 0 ? ((campaign.opened_count / campaign.sent_count) * 100).toFixed(1) : "0.0";

  const metricCards = [
    { label: "Total", value: campaign.total_recipients, textClass: "text-rose-text", bgClass: "bg-rose-surface border-2 border-rose-border", accentColor: "var(--color-subtle)" },
    { label: "Sent", value: campaign.sent_count, textClass: "text-rose-foam", bgClass: "bg-rose-foam/15 border-2 border-rose-border", accentColor: "var(--color-foam)" },
    { label: "Opened", value: `${campaign.opened_count} (${openRate}%)`, textClass: "text-rose-iris", bgClass: "bg-rose-iris/15 border-2 border-rose-border", accentColor: "var(--color-iris)" },
    { label: "Failed", value: campaign.failed_count, textClass: "text-rose-love", bgClass: "bg-rose-love/15 border-2 border-rose-border", accentColor: "var(--color-love)" },
    {
      label: "Pending",
      value: campaign.total_recipients - campaign.sent_count - campaign.failed_count,
      textClass: "text-rose-gold",
      bgClass: "bg-rose-gold/15 border-2 border-rose-border",
      accentColor: "var(--color-gold)",
    },
  ];

  const firstRecipient = allRecipientsData?.results?.[0];
  const sampleData: Record<string, string> = {
    recipient_name: firstRecipient?.name || "Jane Smith",
    recipient_email: firstRecipient?.email || "jane.smith@example.com",
    ...(firstRecipient?.raw_data || {}),
    sender_name: user?.sender_name || user?.username || "Your Name",
    sender_email: user?.sender_email || "you@example.com",
  };

  let renderedSubject = campaign.subject_template || "";
  for (const [key, val] of Object.entries(sampleData)) {
    renderedSubject = renderedSubject.replaceAll(`{{ ${key} }}`, val).replaceAll(`{{${key}}}`, val);
  }

  let renderedHtml = templateDetail?.html_body || "";
  for (const [key, val] of Object.entries(sampleData)) {
    renderedHtml = renderedHtml.replaceAll(`{{ ${key} }}`, val).replaceAll(`{{${key}}}`, val);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate("/campaigns")}
            className="btn-secondary p-2 mt-1 flex-shrink-0"
          >
            <ArrowLeft size={15} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold text-rose-text tracking-tight">{campaign.name}</h1>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="text-rose-subtle mt-1 text-sm font-semibold truncate">{campaign.subject_template}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
          {(campaign.status === "draft" || campaign.status === "paused" || campaign.status === "cancelled" || campaign.status === "failed") && (
            <button
              id="start-btn"
              onClick={async () => {
                // Validate email format before starting
                const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                const badEmails: { row: number; email: string }[] = [];
                const recipients = allRecipientsData?.results ?? [];
                recipients.forEach((r, idx) => {
                  if (!EMAIL_RE.test(r.email ?? "")) {
                    badEmails.push({ row: idx + 1, email: r.email ?? "" });
                  }
                });
                if (badEmails.length > 0) {
                  setInvalidEmailsModal(badEmails);
                  return;
                }
                setShowStartPreviewModal(true);
              }}
              className="btn-primary"
            >
              {campaign.status === "failed" ? (
                <>
                  <RefreshCw size={14} /> Retry
                </>
              ) : (
                <>
                  <Play size={14} /> Start
                </>
              )}
            </button>
          )}
          {campaign.status === "running" && (
            <button id="pause-btn" onClick={() => handlePause(campaignId)} className="btn-secondary">
              <Pause size={14} /> Pause
            </button>
          )}
          {!["done", "cancelled", "failed"].includes(campaign.status) && (
            <button id="cancel-btn" onClick={() => handleCancel(campaignId)} className="btn-danger">
              <XCircle size={14} /> Cancel
            </button>
          )}
          <button id="edit-btn" onClick={handleEditClick} className="btn-secondary">
            <Pencil size={14} /> Edit
          </button>
          <button onClick={() => navigate(`/campaigns/${campaignId}/logs`)} className="btn-secondary">
            <FileText size={14} /> Logs
          </button>
          <button id="delete-btn" onClick={handleDelete} disabled={isDeleting} className="btn-danger">
            {isDeleting ? (
              <span className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/30 border-t-white" />
            ) : deleteConfirm ? (
              <>
                <AlertTriangle size={14} className="animate-pulse" /> Confirm?
              </>
            ) : (
              <Trash2 size={14} />
            )}
            {!isDeleting && (deleteConfirm ? "Click again" : "Delete")}
          </button>
        </div>
      </div>

      {/* Progress card */}
      <div className="card bg-rose-surface">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-extrabold text-rose-muted uppercase tracking-wider">Send Progress</span>
          <div className="flex items-center gap-3">
            <span className="text-sm text-rose-text font-extrabold">
              {campaign.sent_count + campaign.failed_count} / {campaign.total_recipients}
            </span>
            {isLive && (
              <span className="badge-running">
                <Activity size={11} className="animate-pulse" /> Live
              </span>
            )}
          </div>
        </div>
        <div className="h-4 rounded-none overflow-hidden bg-rose-overlay border-2 border-rose-border">
          <div
            className={`h-full rounded-none transition-all duration-700 ${isLive ? "animate-shimmer" : ""}`}
            style={{
              width: `${progress}%`,
              background:
                campaign.status === "failed"
                  ? "var(--color-love)"
                  : campaign.status === "done"
                  ? "var(--color-foam)"
                  : "var(--color-pine)",
            }}
          />
        </div>
        <p className="text-xs text-rose-muted mt-2.5 font-bold uppercase tracking-wider">{progress}% complete</p>
      </div>

      {/* Live campaign banner */}
      {isLive && (
        <div className="flex items-center gap-3 px-4 py-2.5 border-2 border-rose-iris/40 bg-rose-iris/8 text-rose-iris">
          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-iris opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-iris" />
          </span>
          <span className="text-[11px] font-extrabold uppercase tracking-wider">
            Campaign is Live — Auto-refreshing every 10s
          </span>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {metricCards.map(({ label, value, textClass, bgClass, accentColor }) => (
          <div
            key={label}
            className={`card p-5 text-center transition-all duration-150 relative overflow-hidden ${bgClass}`}
          >
            {/* Colored top stripe per metric */}
            <span
              className="absolute top-0 left-0 right-0 h-[3px]"
              style={{ background: accentColor }}
            />
            <p className={`text-3xl font-extrabold ${textClass}`}>{value}</p>
            <p className="text-xs text-rose-muted mt-1 font-bold uppercase tracking-wider">{label}</p>
          </div>
        ))}
      </div>

      {/* Campaign info + Google Sheets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Campaign Info */}
        <div className="card space-y-4 bg-rose-surface">
          <h3 className="font-extrabold text-rose-text text-sm flex items-center gap-2">
            <FileText size={14} className="text-rose-pine stroke-[2.5]" />
            Campaign Info
          </h3>
          <div className="space-y-3 pt-1">
            {[
              { label: "Template", value: campaign.template_name ?? "—" },
              { label: "Resume", value: campaign.resume_name ?? "—" },
              { label: "Plain Text Mode", value: campaign.plain_text_mode ? "Yes (Recommended)" : "No (HTML)" },
              { label: "Open Tracking", value: campaign.open_tracking_enabled ? "Enabled" : "Disabled" },
              { label: "Send Delay", value: `${campaign.send_delay_seconds}s` },
              { label: "Created", value: formatDate(campaign.created_at) },
              { label: "Started", value: formatDate(campaign.started_at) },
              { label: "Completed", value: formatDate(campaign.completed_at) },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between text-sm items-center border-b border-rose-hl-med pb-2 last:border-b-0 last:pb-0">
                <span className="text-rose-muted font-bold">{label}</span>
                <span className="text-rose-text font-extrabold">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Google Sheets */}
        <div className="card space-y-4 bg-rose-surface">
          <h3 className="font-extrabold text-rose-text text-sm flex items-center gap-2">
            <Database size={14} className="text-rose-pine stroke-[2.5]" />
            Google Sheets Integration
          </h3>

          {!campaign.google_sheet_sync_enabled ? (
            <div className="space-y-3">
              <p className="text-xs text-rose-muted leading-relaxed font-semibold">
                Manage your recipient list dynamically in Google Drive. We will provision a new sheet
                in your Drive matching your template variables.
              </p>
              <button
                onClick={handleCreateSheet}
                disabled={isCreatingSheet}
                className="btn-primary w-full justify-center text-sm py-2.5"
              >
                <Plus size={14} />
                {isCreatingSheet ? "Creating Sheet…" : "Create & Link Google Sheet"}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-none p-3 flex items-center gap-2 bg-rose-foam/15 border-2 border-rose-border">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-foam opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-foam" />
                </span>
                <div>
                  <p className="text-xs font-extrabold text-rose-foam uppercase tracking-wider">Live Sync Enabled</p>
                  <p className="text-[10px] text-rose-muted mt-0.5 font-mono">
                    ID: {campaign.google_sheet_id?.substring(0, 15)}…
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`https://docs.google.com/spreadsheets/d/${campaign.google_sheet_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary text-xs py-2 justify-center font-bold"
                >
                  <ExternalLink size={12} /> Open Sheet
                </a>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `https://docs.google.com/spreadsheets/d/${campaign.google_sheet_id}`
                    );
                    toast.success("Spreadsheet link copied!");
                  }}
                  className="btn-secondary text-xs py-2 justify-center font-bold"
                >
                  <Copy size={12} /> Copy Link
                </button>
              </div>

              <button
                onClick={handleSyncSheet}
                disabled={isSyncingSheet}
                className="btn-primary w-full justify-center text-xs py-2.5"
              >
                <RefreshCw size={12} className={isSyncingSheet ? "animate-spin" : ""} />
                {isSyncingSheet ? "Syncing…" : "Sync Recipients Now"}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recipient Editor */}
      <div className="card space-y-4 bg-rose-surface/85 mt-6">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-rose-iris" />
          <h3 className="font-bold text-rose-text text-sm">Recipient Editor</h3>
        </div>
        {campaign.template ? (
          <RecipientTableEditor
            key={`${campaignId}-${campaign.template}`}
            campaignId={campaignId}
            templateId={campaign.template}
            isLive={isLive}
            failedCount={campaign.failed_count}
            onSaveSuccess={() => refetch()}
          />
        ) : (
          <div className="bg-rose-surface/50 border-2 border-rose-border border-dashed rounded-none p-10 text-center flex flex-col items-center justify-center shadow-[3px_3px_0px_0px_var(--color-hl-low)]">
             <div className="w-12 h-12 bg-rose-overlay border-2 border-rose-border rounded-none flex items-center justify-center mb-4 text-rose-subtle shadow-[2px_2px_0px_0px_var(--color-shadow)]">
                <Database size={20} />
             </div>
             <p className="text-rose-text font-extrabold text-lg tracking-tight mb-2">No Template Selected</p>
             <p className="text-sm text-rose-subtle font-medium max-w-md mx-auto mb-6">
           You need to assign an email template to this campaign before you can add recipients. We need to know which variables (like <code className="bg-rose-overlay px-1.5 py-0.5 rounded-none text-rose-iris">{"{{ company_name }}"}</code>) your template requires!
             </p>
             <button onClick={() => editDialogRef.current?.showModal()} className="btn-primary text-sm font-bold">
                Edit Settings to Add Template
             </button>
          </div>
        )}
      </div>

      {/* ── Native Dialog Modal for Editing Campaign ── */}
      <dialog
        ref={editDialogRef}
        closedby="any"
        aria-labelledby="edit-dialog-title"
        className="m-auto rounded-none border-2 bg-rose-surface text-rose-text p-6 w-full max-w-md focus:outline-none border-rose-border shadow-none backdrop:bg-rose-base/80 transition-all open:animate-in open:fade-in open:zoom-in-95"
      >
        <div className="flex items-center justify-between pb-4 border-b-2 border-rose-border mb-5">
          <h3 id="edit-dialog-title" className="text-base font-extrabold text-rose-text flex items-center gap-2">
            <Pencil size={16} className="text-rose-pine stroke-[2.5]" />
            Edit Campaign Settings
          </h3>
          <button
            onClick={() => editDialogRef.current?.close()}
            className="w-7 h-7 rounded-none flex items-center justify-center text-rose-text bg-rose-surface border-2 border-rose-border hover:bg-rose-hl-low transition-colors"
          >
            <X size={14} className="stroke-[2.5]" />
          </button>
        </div>

        <form onSubmit={handleEditSubmit} className="space-y-5">
          {isLive && (
            <div className="text-xs text-rose-gold bg-rose-gold/15 border-2 border-rose-border p-3.5 rounded-none flex items-start gap-2">
              <AlertTriangle size={15} className="mt-0.5 flex-shrink-0" />
              <span className="font-extrabold">
                <strong className="font-black">Warning:</strong> This campaign is active ({campaign.status}). Changes will apply to all future/remaining email sends.
              </span>
            </div>
          )}

          <div>
            <label htmlFor="edit-campaign-name" className="label">
              Campaign Name <span className="text-rose-love font-black">*</span>
            </label>
            <input
              id="edit-campaign-name"
              required
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="input font-semibold"
              placeholder="e.g. Q3 Software Engineers Outreach"
            />
          </div>

          <div>
            <label htmlFor="edit-campaign-subject" className="label">
              Subject Line Template <span className="text-rose-muted font-bold">(Optional)</span>
            </label>
            <input
              id="edit-campaign-subject"
              type="text"
              value={editSubject}
              onChange={(e) => setEditSubject(e.target.value)}
              className="input font-semibold"
              placeholder="e.g. Exciting Opportunity at {{ company_name }}"
            />
          </div>

          <div>
            <label htmlFor="edit-campaign-template" className="label">Email Template</label>
            <CustomSelect
              value={editTemplateId}
              onChange={(val) => {
                const selectedVal = val.toString();
                setEditTemplateId(selectedVal);
                if (selectedVal) {
                  const selected = templates.find((t) => String(t.id) === String(selectedVal));
                  if (selected) {
                    setEditSubject(selected.subject || selected.name);
                    const isPlainText = selected.name.toLowerCase().includes("plain text") || 
                                        selected.name.toLowerCase().includes("plaintext") ||
                                        selected.name.toLowerCase().includes("plain-text");
                    setEditPlainTextMode(isPlainText);
                    if (isPlainText) {
                      setEditOpenTracking(false);
                    } else {
                      setEditOpenTracking(true);
                    }
                  }
                }
              }}
              options={[
                { value: "", label: "None (Select a Template)" },
                ...templates.map((t) => ({
                  value: t.id.toString(),
                  label: t.name,
                })),
              ]}
              placeholder="Select a Template"
            />
          </div>

          <div>
            <label htmlFor="edit-campaign-resume" className="label">Resume Attachment</label>
            {isResumesLoading ? (
              <div className="h-10 bg-rose-overlay/40 rounded animate-pulse" />
            ) : (
              <CustomSelect
                value={editResumeId}
                onChange={(val) => setEditResumeId(val.toString())}
                options={[
                  { value: "", label: "None (No resume attached)" },
                  ...resumes.map((r) => ({
                    value: r.id.toString(),
                    label: `${r.name} ${r.file ? `(${r.file.split("/").pop()})` : "(Text-only)"}`,
                  })),
                ]}
                placeholder="Select a resume..."
              />
            )}
          </div>

          <div>
            <label htmlFor="edit-campaign-delay" className="label">Send Delay (seconds)</label>
            <input
              id="edit-campaign-delay"
              type="number"
              value={editDelay}
              min={0}
              max={60}
              step={0.1}
              onChange={(e) => setEditDelay(Number(e.target.value))}
              className="input font-bold"
              placeholder="1.5"
            />
            <p className="text-[10px] text-rose-subtle mt-1 font-semibold">
              Time to wait between sending consecutive outreach emails. Helps bypass spam filters.
            </p>
          </div>

          <div className="flex items-start gap-2.5 py-1">
            <input
              id="edit-campaign-plain-text"
              type="checkbox"
              checked={editPlainTextMode}
              onChange={(e) => setEditPlainTextMode(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-rose-pine focus:ring-rose-pine bg-rose-overlay border-rose-border transition-all cursor-pointer"
            />
            <div>
              <label htmlFor="edit-campaign-plain-text" className="text-xs font-bold text-rose-text cursor-pointer">
                Plain Text Only Mode
              </label>
              <p className="text-[10px] text-rose-subtle font-semibold leading-normal mt-0.5">
                Send plain text only. Highly recommended for job applications and cold outreach to bypass Promotions/Spam tab.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 py-1">
            <input
              id="edit-campaign-tracking"
              type="checkbox"
              checked={editOpenTracking}
              disabled={editPlainTextMode}
              onChange={(e) => setEditOpenTracking(e.target.checked)}
              className="w-4 h-4 mt-0.5 rounded text-rose-pine focus:ring-rose-pine bg-rose-overlay border-rose-border transition-all cursor-pointer disabled:opacity-50"
            />
            <div>
              <label htmlFor="edit-campaign-tracking" className="text-xs font-bold text-rose-text cursor-pointer">
                Enable Open Tracking
              </label>
              <p className="text-[10px] text-rose-subtle font-semibold leading-normal mt-0.5">
                {editPlainTextMode 
                  ? "Disabled because Plain Text Mode is active (cannot track opens without HTML pixels)."
                  : "Injects an invisible tracking pixel to track email opens. Turn off to maximize deliverability."}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => editDialogRef.current?.close()}
              className="btn-secondary text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdatingCampaign}
              className="btn-primary text-xs"
            >
              {isUpdatingCampaign ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </dialog>

      {/* ── Pre-start Invalid Email Modal ── */}
      {invalidEmailsModal && (
        <dialog
          open
          className="fixed inset-0 z-50 bg-transparent p-0 border-none shadow-none w-full h-full flex items-center justify-center backdrop:bg-black/60"
          style={{ background: "transparent" }}
        >
          <div className="bg-rose-base border-2 border-rose-border rounded-none p-6 shadow-[8px_8px_0px_0px_var(--color-shadow)] max-w-md w-full mx-4 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-none bg-rose-love/15 border-2 border-rose-love flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={18} className="text-rose-love" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-rose-text">Invalid Email Addresses</h2>
                <p className="text-xs text-rose-subtle mt-0.5 font-medium">
                  Fix these {invalidEmailsModal.length} address{invalidEmailsModal.length !== 1 ? "es" : ""} in the recipient table before starting.
                </p>
              </div>
              <button
                onClick={() => setInvalidEmailsModal(null)}
                className="ml-auto p-1.5 rounded-none border-2 border-transparent hover:border-rose-border hover:bg-rose-overlay text-rose-muted hover:text-rose-text transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-52 overflow-y-auto space-y-1.5 rounded-none border-2 border-rose-border bg-rose-love/5 p-3">
              {invalidEmailsModal.map(({ row, email }) => (
                <div key={row} className="flex items-center gap-3 text-sm">
                  <span className="text-rose-muted font-bold w-8 text-right flex-shrink-0">#{row}</span>
                  <AlertCircle size={12} className="text-rose-love flex-shrink-0" />
                  <span className="text-rose-love font-mono truncate">{email || <em className="not-italic text-rose-muted">empty</em>}</span>
                </div>
              ))}
            </div>

            <p className="text-xs text-rose-muted font-medium">
              Scroll down to the Recipient Editor, fix the highlighted rows, save, then try starting again.
            </p>
            <button
              onClick={() => setInvalidEmailsModal(null)}
              className="btn-primary w-full justify-center"
            >
              Got it, I'll fix them
            </button>
          </div>
        </dialog>
      )}

      {/* ── Start Campaign Confirmation & Preview Modal ── */}
      {showStartPreviewModal && (
        <dialog
          open
          className="fixed inset-0 z-50 bg-transparent p-0 border-none shadow-none w-full h-full flex items-center justify-center backdrop:bg-black/60"
          style={{ background: "transparent" }}
        >
          <div className="bg-rose-base border-2 border-rose-border rounded-none shadow-[8px_8px_0px_0px_var(--color-shadow)] max-w-4xl w-full mx-4 flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 bg-rose-overlay border-b-2 border-rose-border flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-none bg-rose-pine/15 border-2 border-rose-border flex items-center justify-center flex-shrink-0">
                  <Play size={18} className="text-rose-pine" />
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-rose-text">Review Campaign & Send</h2>
                  <p className="text-xs text-rose-subtle mt-0.5 font-bold uppercase tracking-wider">
                    {campaign.name}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowStartPreviewModal(false)}
                className="p-1.5 rounded-none border-2 border-transparent hover:border-rose-border hover:bg-rose-overlay text-rose-muted hover:text-rose-text transition-all"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin">
              {/* Campaign Summary & PDF attachment info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border-2 border-rose-border bg-rose-surface p-3 space-y-2">
                  <span className="text-[10px] font-black uppercase text-rose-subtle tracking-wider">Campaign Details</span>
                  <div className="text-xs space-y-1 font-semibold">
                    <p className="text-rose-text">Recipients: <span className="font-extrabold">{campaign.total_recipients}</span></p>
                    <p className="text-rose-text">Send Delay: <span className="font-extrabold">{campaign.send_delay_seconds}s</span></p>
                    <p className="text-rose-text">Template: <span className="font-extrabold">{campaign.template_name}</span></p>
                    <p className="text-rose-text">Format: <span className="font-extrabold">{campaign.plain_text_mode ? "Plain Text Only" : "HTML (Multipart)"}</span></p>
                  </div>
                </div>
                
                <div className={`border-2 border-rose-border p-3 flex flex-col justify-center gap-1.5 ${
                  campaign.resume || campaign.resume_attachment
                    ? "bg-rose-foam/30 text-rose-text"
                    : "bg-rose-love/15 text-rose-love"
                }`}>
                  <span className="text-[10px] font-black uppercase text-rose-subtle tracking-wider">PDF Resume Attachment</span>
                  {campaign.resume || campaign.resume_attachment ? (
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-pine">
                      <Paperclip size={14} className="flex-shrink-0 text-rose-pine" />
                      <span className="truncate text-rose-text" title={campaign.resume_name || "Resume PDF"}>
                        {campaign.resume_name || "Resume PDF Attached"}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-bold text-rose-love">
                      <AlertTriangle size={14} className="flex-shrink-0" />
                      <span>No Resume PDF Attached</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Email Preview iframe / plain text */}
              <div className="space-y-2">
                <span className="text-[10px] font-black uppercase text-rose-subtle tracking-wider block">
                  Email Preview (Sent to {sampleData.recipient_email})
                </span>
                <div className="border-2 border-rose-border bg-rose-surface p-3 space-y-2 text-sm">
                  <div className="border-b border-rose-hl-med pb-2 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-rose-subtle uppercase mr-2">Subject:</span>
                      <span className="font-extrabold text-rose-text">{renderedSubject || "(No Subject)"}</span>
                    </div>
                    {campaign.plain_text_mode && (
                      <span className="text-[10px] bg-rose-pine/10 text-rose-pine border border-rose-pine px-1.5 py-0.5 font-bold uppercase">
                        Plain Text
                      </span>
                    )}
                  </div>
                  {campaign.plain_text_mode ? (
                    <div className="h-[650px] overflow-y-auto bg-white border border-rose-hl-low p-4 font-mono text-xs whitespace-pre-wrap text-rose-text scrollbar-thin">
                      {stripHtml(renderedHtml)}
                    </div>
                  ) : (
                    <div className="h-[650px] relative bg-white border border-rose-hl-low">
                      <iframe
                        title="Email Preview"
                        sandbox="allow-same-origin"
                        srcDoc={renderedHtml}
                        className="absolute inset-0 w-full h-full border-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer Buttons */}
            <div className="flex items-center gap-3 px-6 py-4 bg-rose-overlay border-t-2 border-rose-border flex-shrink-0">
              <button
                onClick={() => setShowStartPreviewModal(false)}
                className="btn-secondary w-1/3 justify-center text-sm font-bold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  try {
                    await handleStart(campaignId);
                    setShowStartPreviewModal(false);
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="btn-primary flex-1 justify-center text-sm font-bold shadow-[3px_3px_0px_0px_var(--color-shadow)]"
              >
                Approve & Start Sending
              </button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
