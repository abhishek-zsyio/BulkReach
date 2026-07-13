import { motion } from "framer-motion";
import { X, Eye, Loader2, ArrowRight } from "lucide-react";
import { useGetTemplateQuery } from "@/api/campaignApi";
import { useAuth } from "@/hooks/useAuth";

interface PreviewModalProps {
  templateId: number;
  templateName: string;
  onClose: () => void;
}

export function PreviewModal({ templateId, templateName, onClose }: PreviewModalProps) {
  const { data: template, isLoading } = useGetTemplateQuery(templateId);
  const { user } = useAuth();

  const sample: Record<string, string> = {
    recipient_name: "Jane Smith",
    company_name: "TechCorp Inc.",
    job_title: "Software Engineer",
    sender_name: user?.first_name || user?.username || "Alex Johnson",
    sender_email: user?.sender_email || "you@example.com",
  };

  let renderedHtml = template?.html_body || "";
  for (const [key, val] of Object.entries(sample)) {
    renderedHtml = renderedHtml.replaceAll(`{{ ${key} }}`, val).replaceAll(`{{${key}}}`, val);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-rose-base/70"
      style={{
        backgroundImage:
          "repeating-linear-gradient(45deg, color-mix(in srgb, var(--color-rose-border) 12%, transparent) 0px, color-mix(in srgb, var(--color-rose-border) 12%, transparent) 1px, transparent 1px, transparent 14px)",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="w-full max-w-4xl h-[80vh] min-h-[500px] max-h-[90vh] flex border-2 border-rose-border bg-rose-surface shadow-[8px_8px_0px_0px_var(--color-shadow)]"
      >
        {/* ── Left rail: identity + step markers ── */}
        <div className="hidden sm:flex flex-col w-[92px] shrink-0 border-r-2 border-rose-border bg-rose-text">
          <div className="p-3 border-b-2 border-rose-border flex items-center justify-center">
            <div className="w-9 h-9 border-2 border-rose-surface bg-rose-pine flex items-center justify-center">
              <Eye size={16} className="text-white" />
            </div>
          </div>
          <div className="flex-1 flex flex-col">
            {["Preview"].map((label, i) => (
              <div
                key={label}
                className="flex-1 flex flex-col items-center justify-center gap-1.5 border-b-2 border-rose-border last:border-b-0"
              >
                <span className="text-rose-surface font-black text-lg leading-none">{i + 1}</span>
                <span
                  className="text-rose-surface/60 text-[9px] font-black uppercase tracking-widest"
                  style={{ writingMode: "vertical-rl" }}
                >
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col flex-1 min-w-0">
          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b-2 border-rose-border shrink-0">
            <div>
              <h3 className="text-lg font-black text-rose-text uppercase tracking-tight leading-none">
                Template Preview
              </h3>
              <p className="text-[12px] text-rose-muted font-bold mt-1.5 truncate max-w-[400px]">
                Previewing: {templateName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 shrink-0 flex items-center justify-center text-rose-text bg-rose-surface border-2 border-rose-border hover:bg-rose-love hover:text-white hover:border-rose-love active:scale-95 transition-all"
            >
              <X size={16} className="stroke-[3]" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-hidden bg-rose-base relative border-b-2 border-rose-border">
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                <Loader2 className="animate-spin text-rose-pine h-8 w-8" />
                <p className="text-xs font-extrabold text-rose-text uppercase tracking-widest animate-pulse">Loading preview...</p>
              </div>
            ) : (
              <iframe
                title="Template Preview"
                sandbox="allow-same-origin"
                srcDoc={renderedHtml}
                className="absolute inset-0 w-full h-full border-none bg-white"
              />
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 shrink-0 bg-rose-overlay/20">
            <button
              type="button"
              onClick={onClose}
              className="text-[11px] font-black uppercase tracking-widest text-rose-muted hover:text-rose-text transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              className="flex items-center gap-2 bg-rose-text text-rose-surface text-xs font-black uppercase tracking-widest py-3 px-6 border-2 border-rose-text shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
            >
              Done
              <ArrowRight size={14} className="stroke-[3]" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
