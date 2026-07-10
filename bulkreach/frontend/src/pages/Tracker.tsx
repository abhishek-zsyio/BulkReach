import { useState } from "react";
import { 
  Briefcase, Calendar, User, Plus, Trash2, 
  Loader2, Clock, X, ExternalLink
} from "lucide-react";
import { 
  useGetJobApplicationsQuery, 
  useCreateJobApplicationMutation, 
  useUpdateJobApplicationMutation, 
  useDeleteJobApplicationMutation,
  useBulkDeleteJobApplicationsMutation
} from "@/api/applicationApi";
import { useGetCampaignsQuery } from "@/api/campaignApi";
import { useConfirm } from "@/components/ui/dialogs";
import { formatDate } from "@/utils/helpers";
import toast from "react-hot-toast";
import { CustomSelect } from "@/components/ui/CustomSelect";

interface ApplicationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationId: number | null;
}

const STAGES = [
  { id: "saved", label: "Saved", color: "rose-gold", bg: "bg-rose-gold/10", border: "border-rose-gold/30", text: "text-rose-gold" },
  { id: "applied", label: "Applied", color: "rose-iris", bg: "bg-rose-iris/10", border: "border-rose-iris/30", text: "text-rose-iris" },
  { id: "interview", label: "Interview", color: "rose-rose", bg: "bg-rose-rose/10", border: "border-rose-rose/30", text: "text-rose-rose" },
  { id: "offer", label: "Offer", color: "rose-pine", bg: "bg-rose-pine/10", border: "border-rose-pine/30", text: "text-rose-pine" },
  { id: "rejected", label: "Rejected", color: "rose-love", bg: "bg-rose-love/10", border: "border-rose-love/30", text: "text-rose-love" }
] as const;

export function Tracker() {
  const { data: applications = [], isLoading, refetch } = useGetJobApplicationsQuery();
  const [updateApplication] = useUpdateJobApplicationMutation();
  const [deleteApplication] = useDeleteJobApplicationMutation();
  const [bulkDeleteJobApplications] = useBulkDeleteJobApplicationsMutation();
  const { confirm, modal: confirmModal } = useConfirm();

  const handleClearStage = async (stageId: string, stageLabel: string) => {
    const ok = await confirm({
      title: `Clear all ${stageLabel} jobs`,
      message: `Are you sure you want to delete all job applications currently in the "${stageLabel}" stage?`,
      confirmLabel: "Clear Stage",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await bulkDeleteJobApplications({ stage: stageId }).unwrap();
      toast.success(`Cleared all ${stageLabel} applications.`);
      refetch();
    } catch {
      toast.error("Failed to clear stage.");
    }
  };

  const [activeDetailsId, setActiveDetailsId] = useState<number | null>(null);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [draggedOverColumn, setDraggedOverColumn] = useState<string | null>(null);

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: number) => {
    e.dataTransfer.setData("applicationId", id.toString());
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    setDraggedOverColumn(stageId);
  };

  const handleDragLeave = () => {
    setDraggedOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetStage: "saved" | "applied" | "interview" | "offer" | "rejected") => {
    e.preventDefault();
    setDraggedOverColumn(null);
    const idStr = e.dataTransfer.getData("applicationId");
    if (!idStr) return;
    const id = parseInt(idStr, 10);

    const app = applications.find(a => a.id === id);
    if (!app || app.stage === targetStage) return;

    try {
      await updateApplication({ id, data: { stage: targetStage } }).unwrap();
      toast.success(`Moved to ${targetStage.charAt(0).toUpperCase() + targetStage.slice(1)}`);
      refetch();
    } catch {
      toast.error("Failed to move application.");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: number, company: string, title: string) => {
    e.stopPropagation();
    const ok = await confirm({
      title: "Delete Application",
      message: `Are you sure you want to delete the tracker card for ${title} at ${company}?`,
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await deleteApplication(id).unwrap();
      toast.success("Application deleted.");
      refetch();
    } catch {
      toast.error("Failed to delete application.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b-2 border-rose-border pb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-rose-text tracking-tight flex items-center gap-2.5">
            <Briefcase size={28} className="text-rose-pine stroke-[2.5]" />
            Application Tracker
          </h1>
          <p className="text-rose-subtle mt-1.5 text-sm font-medium">
            Manage your job application pipeline. Drag and drop cards to update status stages.
          </p>
        </div>
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="btn-primary flex items-center justify-center gap-2 self-start sm:self-auto py-3 px-5 shadow-[4px_4px_0px_0px_var(--color-shadow)]"
        >
          <Plus size={16} /> Add Application
        </button>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="animate-spin text-rose-pine mb-4" size={32} />
          <p className="text-sm font-bold text-rose-subtle uppercase tracking-widest">Loading Pipeline...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
          {STAGES.map((col) => {
            const colApps = applications.filter((app) => app.stage === col.id);
            const isOver = draggedOverColumn === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col bg-rose-surface border-2 rounded-none transition-all duration-200 min-h-[500px] ${
                  isOver 
                    ? "border-rose-pine border-dashed bg-rose-pine/5 scale-[0.99]" 
                    : "border-rose-border"
                }`}
              >
                {/* Column Header */}
                <div className={`p-4 border-b-2 border-rose-border flex items-center justify-between ${col.bg}`}>
                  <span className={`text-xs font-black uppercase tracking-wider ${col.text}`}>
                    {col.label}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {colApps.length > 0 && (
                      <button
                        onClick={() => handleClearStage(col.id, col.label)}
                        className="text-rose-muted hover:text-rose-love p-0.5 transition-colors"
                        title={`Clear all ${col.label} applications`}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                    <span className="bg-rose-border text-white text-[10px] font-black px-2 py-0.5 font-mono">
                      {colApps.length}
                    </span>
                  </div>
                </div>

                {/* Column Body / Cards */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto max-h-[600px] min-h-[400px]">
                  {colApps.length === 0 ? (
                    <div className="h-32 flex items-center justify-center border-2 border-dashed border-rose-hl-med text-[11px] text-rose-muted font-bold text-center p-4">
                      Drag cards here or click Add
                    </div>
                  ) : (
                    colApps.map((app) => (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        onClick={() => setActiveDetailsId(app.id)}
                        className="group relative bg-rose-surface border-2 border-rose-border p-3.5 cursor-grab active:cursor-grabbing hover:border-rose-pine hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all duration-150 shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)]"
                      >
                        {/* Remove accent bar */}
                        <span className={`absolute top-0 left-0 bottom-0 w-[4px] bg-rose-${col.color}`} />
                        
                        <div className="pl-2 space-y-2">
                          <div className="pr-6">
                            <h4 className="font-extrabold text-sm text-rose-text group-hover:text-rose-pine leading-snug line-clamp-2">
                              {app.job_title}
                            </h4>
                            <p className="text-[11px] font-bold text-rose-muted uppercase tracking-wider mt-0.5">
                              {app.company_name}
                            </p>
                          </div>

                          {/* Contact Info */}
                          {app.contact_name && (
                            <div className="flex items-center gap-1.5 text-[10px] text-rose-subtle font-medium">
                              <User size={11} className="text-rose-muted" />
                              <span className="truncate">{app.contact_name}</span>
                            </div>
                          )}

                          {/* Interview Date */}
                          {app.interview_date && (
                            <div className="flex items-center gap-1.5 text-[10px] text-rose-rose font-bold bg-rose-rose/10 border border-rose-rose/30 px-2 py-0.5 w-fit">
                              <Calendar size={11} />
                              <span>{formatDate(app.interview_date)}</span>
                            </div>
                          )}

                          {/* Linked Campaign */}
                          {app.campaign_name && (
                            <div className="flex items-center gap-1 text-[9px] text-rose-iris font-bold bg-rose-iris/10 border border-rose-iris/30 px-1.5 py-0.5 w-fit uppercase tracking-wider">
                              <Clock size={10} /> Auto-Linked
                            </div>
                          )}
                        </div>

                        {/* Card URL actions */}
                        <div className="absolute right-2.5 top-2.5 flex items-center gap-1">
                          {(app as any).linkedin_url && (
                            <a
                              href={(app as any).linkedin_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-rose-muted hover:text-rose-iris p-1 transition-all"
                              title="Open LinkedIn Profile"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                          {(app as any).job_url && (
                            <a
                              href={(app as any).job_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-rose-muted hover:text-rose-pine p-1 transition-all"
                              title="Open Job Listing"
                            >
                              <ExternalLink size={12} />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={(e) => handleDelete(e, app.id, app.company_name, app.job_title)}
                            className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-rose-muted hover:text-rose-love p-1 transition-opacity duration-150"
                            title="Delete card"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail / Edit Modal */}
      <ApplicationDetailsModal
        isOpen={activeDetailsId !== null}
        onClose={() => setActiveDetailsId(null)}
        applicationId={activeDetailsId}
      />

      {/* New Application Modal */}
      <NewApplicationModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        refetch={refetch}
      />

      {confirmModal}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// NewApplicationModal Component
// ─────────────────────────────────────────────────────────────────
interface NewApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  refetch: () => void;
}

function NewApplicationModal({ isOpen, onClose, refetch }: NewApplicationModalProps) {
  const [createApplication, { isLoading }] = useCreateJobApplicationMutation();
  const { data: campaigns = [] } = useGetCampaignsQuery();

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [stage, setStage] = useState<typeof STAGES[number]["id"]>("saved");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [campaignId, setCampaignId] = useState<string>("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim() || !jobTitle.trim()) {
      toast.error("Company name and job title are required.");
      return;
    }

    try {
      await createApplication({
        company_name: companyName.trim(),
        job_title: jobTitle.trim(),
        stage,
        contact_name: contactName.trim(),
        contact_email: contactEmail.trim(),
        interview_date: interviewDate ? new Date(interviewDate).toISOString() : null,
        notes: notes.trim(),
        campaign: campaignId ? parseInt(campaignId, 10) : null
      }).unwrap();

      toast.success("Application added successfully!");
      refetch();
      
      // Reset state and close
      setCompanyName("");
      setJobTitle("");
      setStage("saved");
      setContactName("");
      setContactEmail("");
      setInterviewDate("");
      setNotes("");
      setCampaignId("");
      onClose();
    } catch {
      toast.error("Failed to add application.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg bg-rose-surface border-2 border-rose-border shadow-[6px_6px_0px_0px_var(--color-shadow)] p-6 space-y-5 relative">
        <span className="absolute top-0 left-0 right-0 h-[3px] bg-rose-pine" />
        
        <div className="flex items-center justify-between border-b border-rose-hl-med pb-3">
          <h3 className="text-lg font-black text-rose-text uppercase tracking-wider">New Job Application</h3>
          <button onClick={onClose} className="text-rose-muted hover:text-rose-text">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name *</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="input"
                placeholder="e.g. Google"
              />
            </div>
            <div>
              <label className="label">Job Title *</label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="input"
                placeholder="e.g. Frontend Developer"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Pipeline Stage</label>
              <CustomSelect
                value={stage}
                onChange={(val) => setStage(val as any)}
                options={STAGES.map((s) => ({
                  value: s.id,
                  label: s.label,
                }))}
                placeholder="Select stage..."
              />
            </div>

            <div>
              <label className="label">Interview Date</label>
              <input
                type="datetime-local"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="input"
                placeholder="e.g. John recruiter"
              />
            </div>
            <div>
              <label className="label">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input"
                placeholder="recruiter@company.com"
              />
            </div>
          </div>

          <div>
            <label className="label">Linked Campaign (Optional)</label>
            <CustomSelect
              value={campaignId}
              onChange={(val) => setCampaignId(val.toString())}
              options={[
                { value: "", label: "— Not linked —" },
                ...campaigns.map((c) => ({
                  value: c.id.toString(),
                  label: c.name,
                })),
              ]}
              placeholder="Select a campaign..."
            />
          </div>

          <div>
            <label className="label">Internal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="textarea"
              placeholder="Paste job details, salaries, links, etc."
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-rose-hl-med">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={isLoading} className="btn-primary min-w-[120px]">
              {isLoading ? <Loader2 className="animate-spin text-white" size={14} /> : "Save Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// ApplicationDetailsModal Component
// ─────────────────────────────────────────────────────────────────
function ApplicationDetailsModal({ isOpen, onClose, applicationId }: ApplicationDetailsModalProps) {
  const { data: applications = [], refetch } = useGetJobApplicationsQuery();
  const { data: campaigns = [] } = useGetCampaignsQuery();
  const [updateApplication, { isLoading: isUpdating }] = useUpdateJobApplicationMutation();
  
  const app = applications.find((a) => a.id === applicationId);

  const [companyName, setCompanyName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [stage, setStage] = useState<typeof STAGES[number]["id"]>("saved");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [interviewDate, setInterviewDate] = useState("");
  const [notes, setNotes] = useState("");
  const [campaignId, setCampaignId] = useState<string>("");

  // Sync edits state when active application changes
  useState(() => {
    if (app) {
      setCompanyName(app.company_name || "");
      setJobTitle(app.job_title || "");
      setStage(app.stage || "saved");
      setContactName(app.contact_name || "");
      setContactEmail(app.contact_email || "");
      
      // format datetime-local string
      if (app.interview_date) {
        const d = new Date(app.interview_date);
        // Offset conversion for local input string
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60 * 1000);
        setInterviewDate(local.toISOString().slice(0, 16));
      } else {
        setInterviewDate("");
      }
      
      setNotes(app.notes || "");
      setCampaignId(app.campaign ? app.campaign.toString() : "");
    }
  });

  // Re-sync on changes
  useState(() => {
    if (app) {
      setCompanyName(app.company_name || "");
      setJobTitle(app.job_title || "");
      setStage(app.stage || "saved");
      setContactName(app.contact_name || "");
      setContactEmail(app.contact_email || "");
      if (app.interview_date) {
        const d = new Date(app.interview_date);
        const offset = d.getTimezoneOffset();
        const local = new Date(d.getTime() - offset * 60 * 1000);
        setInterviewDate(local.toISOString().slice(0, 16));
      } else {
        setInterviewDate("");
      }
      setNotes(app.notes || "");
      setCampaignId(app.campaign ? app.campaign.toString() : "");
    }
  });

  // Since we want standard React render-sync on prop change:
  const activeAppRefId = app?.id ?? null;
  const [prevId, setPrevId] = useState<number | null>(null);

  if (activeAppRefId !== prevId && app) {
    setPrevId(activeAppRefId);
    setCompanyName(app.company_name || "");
    setJobTitle(app.job_title || "");
    setStage(app.stage || "saved");
    setContactName(app.contact_name || "");
    setContactEmail(app.contact_email || "");
    setLinkedinUrl((app as any).linkedin_url || "");
    setJobUrl((app as any).job_url || "");
    if (app.interview_date) {
      const d = new Date(app.interview_date);
      const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
      setInterviewDate(local.toISOString().slice(0, 16));
    } else {
      setInterviewDate("");
    }
    setNotes(app.notes || "");
    setCampaignId(app.campaign ? app.campaign.toString() : "");
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId) return;

    try {
      await updateApplication({
        id: applicationId,
        data: {
          company_name: companyName.trim(),
          job_title: jobTitle.trim(),
          stage,
          contact_name: contactName.trim(),
          contact_email: contactEmail.trim(),
          linkedin_url: linkedinUrl.trim(),
          job_url: jobUrl.trim(),
          interview_date: interviewDate ? new Date(interviewDate).toISOString() : null,
          notes: notes.trim(),
          campaign: campaignId ? parseInt(campaignId, 10) : null
        }
      }).unwrap();

      toast.success("Application details updated!");
      refetch();
      onClose();
    } catch {
      toast.error("Failed to update details.");
    }
  };

  if (!isOpen || !app) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-lg bg-rose-surface border-2 border-rose-border shadow-[6px_6px_0px_0px_var(--color-shadow)] p-6 space-y-5 relative">
        <span className={`absolute top-0 left-0 right-0 h-[3px] bg-rose-${STAGES.find(s => s.id === stage)?.color || "pine"}`} />
        
        <div className="flex items-center justify-between border-b border-rose-hl-med pb-3">
          <div>
            <h3 className="text-lg font-black text-rose-text uppercase tracking-wider">Application Details</h3>
            <p className="text-[10px] text-rose-muted font-bold mt-0.5">EDIT DETAILS OR ADD PIPELINE INFORMATION</p>
          </div>
          <button onClick={onClose} className="text-rose-muted hover:text-rose-text">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Company Name</label>
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Job Title</label>
              <input
                type="text"
                required
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Pipeline Stage</label>
              <CustomSelect
                value={stage}
                onChange={(val) => setStage(val as any)}
                options={STAGES.map((s) => ({
                  value: s.id,
                  label: s.label,
                }))}
                placeholder="Select stage..."
              />
            </div>

            <div>
              <label className="label">Interview Date</label>
              <input
                type="datetime-local"
                value={interviewDate}
                onChange={(e) => setInterviewDate(e.target.value)}
                className="input text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Contact Name</label>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="input"
              />
            </div>
            <div>
              <label className="label">Contact Email</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="input"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">LinkedIn URL</label>
              <div className="relative">
                <input
                  type="url"
                  value={linkedinUrl}
                  onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="input pr-8"
                  placeholder="https://linkedin.com/in/..."
                />
                {linkedinUrl && (
                  <a
                    href={linkedinUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-muted hover:text-rose-pine transition-colors"
                    title="Open LinkedIn"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
            <div>
              <label className="label">Job Listing URL</label>
              <div className="relative">
                <input
                  type="url"
                  value={jobUrl}
                  onChange={(e) => setJobUrl(e.target.value)}
                  className="input pr-8"
                  placeholder="https://company.com/jobs/..."
                />
                {jobUrl && (
                  <a
                    href={jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-rose-muted hover:text-rose-pine transition-colors"
                    title="Open Job Listing"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink size={12} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className="label">Linked Campaign</label>
            <CustomSelect
              value={campaignId}
              onChange={(val) => setCampaignId(val.toString())}
              options={[
                { value: "", label: "— Not linked —" },
                ...campaigns.map((c) => ({
                  value: c.id.toString(),
                  label: c.name,
                })),
              ]}
              placeholder="Select a campaign..."
            />
          </div>

          <div>
            <label className="label">Internal Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="textarea"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-rose-hl-med">
            <button type="button" onClick={onClose} className="btn-secondary">
              Close
            </button>
            <button type="submit" disabled={isUpdating} className="btn-primary min-w-[120px]">
              {isUpdating ? <Loader2 className="animate-spin text-white" size={14} /> : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
