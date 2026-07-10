import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Users, Loader2, ArrowRight } from "lucide-react";
import { CustomSelect } from "@/components/ui/CustomSelect";

interface ResearchImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCount: number;
  totalCount: number;
  companyName: string;
  campaigns: any[];
  selectedCampaignId: string;
  setSelectedCampaignId: (id: string) => void;
  isImporting: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ResearchImportModal({
  isOpen,
  onClose,
  selectedCount,
  totalCount,
  companyName,
  campaigns,
  selectedCampaignId,
  setSelectedCampaignId,
  isImporting,
  onSubmit,
}: ResearchImportModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div
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
            className="w-full max-w-3xl max-h-[95vh] flex border-2 border-rose-border bg-rose-surface shadow-[8px_8px_0px_0px_var(--color-shadow)]"
          >
            {/* ── Left rail: identity + step markers ── */}
            <div className="hidden sm:flex flex-col w-[92px] shrink-0 border-r-2 border-rose-border bg-rose-text">
              <div className="p-3 border-b-2 border-rose-border flex items-center justify-center">
                <div className="w-9 h-9 border-2 border-rose-surface bg-rose-pine flex items-center justify-center">
                  <Upload size={16} className="text-white" />
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                {["Target", "Import"].map((label, i) => (
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
                    Import to Campaign
                  </h3>
                  <p className="text-[12px] text-rose-muted font-bold mt-1.5">
                    Queue mapped employees to sequences.
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
              <div className="p-5 sm:p-6 overflow-y-auto scrollbar-thin flex-1 space-y-6">
                <form id="research-import-form" onSubmit={onSubmit} className="space-y-6">
                  {/* Summary info box */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-muted mb-2.5 block">
                      01 — Summary info
                    </span>
                    <div className="text-xs text-rose-text leading-relaxed bg-rose-overlay/40 border-2 border-rose-border p-4 font-bold flex items-start gap-3 shadow-[3px_3px_0px_0px_var(--color-shadow)]">
                      <div className="mt-0.5 text-rose-pine shrink-0"><Users size={16} className="stroke-[2.5]" /></div>
                      <div>
                        Importing <strong className="text-rose-pine font-mono">{selectedCount}</strong> of {totalCount} employees from <strong className="text-rose-text font-black">"{companyName}"</strong>.
                      </div>
                    </div>
                  </div>

                  {/* Campaign dropdown */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-muted mb-2.5 block">
                      02 — Target Campaign
                    </span>
                    <div className="border-2 border-rose-border p-3.5 bg-rose-surface">
                      <label htmlFor="target-campaign" className="block text-[10px] font-black uppercase tracking-widest text-rose-love mb-1.5">
                        Campaign — required
                      </label>
                      <CustomSelect
                        value={selectedCampaignId}
                        onChange={(val) => setSelectedCampaignId(val.toString())}
                        options={campaigns.map((c) => ({
                          value: c.id.toString(),
                          label: c.name,
                        }))}
                        placeholder="Select campaign..."
                      />
                    </div>
                  </div>
                </form>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t-2 border-rose-border shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[11px] font-black uppercase tracking-widest text-rose-muted hover:text-rose-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="research-import-form"
                  disabled={isImporting || !selectedCampaignId}
                  className="flex items-center gap-2 bg-rose-text text-rose-surface text-xs font-black uppercase tracking-widest py-3 px-6 border-2 border-rose-text shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all disabled:opacity-60 disabled:translate-x-0 disabled:translate-y-0"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="animate-spin h-3.5 w-3.5" />
                      Importing
                    </>
                  ) : (
                    <>
                      Import Contacts
                      <ArrowRight size={14} className="stroke-[3]" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
