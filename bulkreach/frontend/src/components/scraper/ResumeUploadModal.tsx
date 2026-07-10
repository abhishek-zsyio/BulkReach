import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Download, Plus, Loader2, ArrowRight } from "lucide-react";

interface ResumeUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  newResumeName: string;
  setNewResumeName: (name: string) => void;
  selectedFile: File | null;
  setSelectedFile: (file: File | null) => void;
  isManualCreate: boolean;
  setIsManualCreate: (val: boolean) => void;
  isCreating: boolean;
  isUploadingFile: boolean;
  onSubmit: (e: React.FormEvent) => void;
}

export function ResumeUploadModal({
  isOpen,
  onClose,
  newResumeName,
  setNewResumeName,
  selectedFile,
  setSelectedFile,
  isManualCreate,
  setIsManualCreate,
  isCreating,
  isUploadingFile,
  onSubmit,
}: ResumeUploadModalProps) {
  const handleCancel = () => {
    onClose();
    setNewResumeName("");
    setSelectedFile(null);
    setIsManualCreate(false);
  };

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
                  <FileText size={16} className="text-white" />
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                {["Config"].map((label, i) => (
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
                    Configure Resume Profile
                  </h3>
                  <p className="text-[12px] text-rose-muted font-bold mt-1.5">
                    Provide a name and choose how you want to initialize your resume credentials.
                  </p>
                </div>
                <button
                  onClick={handleCancel}
                  className="w-8 h-8 shrink-0 flex items-center justify-center text-rose-text bg-rose-surface border-2 border-rose-border hover:bg-rose-love hover:text-white hover:border-rose-love active:scale-95 transition-all"
                >
                  <X size={16} className="stroke-[3]" />
                </button>
              </div>

              {/* ── Body ── */}
              <div className="p-5 sm:p-6 overflow-y-auto scrollbar-thin flex-1 space-y-6">
                <form id="resume-upload-form" onSubmit={onSubmit} className="space-y-6">
                  {/* Name field */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-muted mb-2.5 block">
                      01 — Profile Name
                    </span>
                    <div className="border-2 border-rose-border p-3.5 bg-rose-surface">
                      <label htmlFor="modal-resume-name" className="block text-[10px] font-black uppercase tracking-widest text-rose-love mb-1.5">
                        Resume Profile Name — required
                      </label>
                      <input
                        id="modal-resume-name"
                        type="text"
                        required
                        value={newResumeName}
                        onChange={(e) => setNewResumeName(e.target.value)}
                        placeholder="e.g. My Default Resume"
                        className="w-full bg-transparent font-bold text-sm text-rose-text placeholder:text-rose-muted placeholder:font-semibold focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Mode selector */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-muted mb-2.5 block">
                      02 — Initialization Mode
                    </span>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setIsManualCreate(false)}
                        className={`py-3.5 border-2 font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all ${
                          !isManualCreate
                            ? "bg-rose-text text-rose-surface border-rose-text shadow-[4px_4px_0px_0px_var(--color-shadow)] -translate-x-[2px] -translate-y-[2px]"
                            : "bg-rose-surface border-rose-border text-rose-muted hover:border-rose-text hover:text-rose-text"
                        }`}
                      >
                        <Download size={16} />
                        Upload PDF File
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualCreate(true);
                          setSelectedFile(null);
                        }}
                        className={`py-3.5 border-2 font-black text-xs uppercase tracking-wider flex flex-col items-center justify-center gap-1.5 transition-all ${
                          isManualCreate
                            ? "bg-rose-text text-rose-surface border-rose-text shadow-[4px_4px_0px_0px_var(--color-shadow)] -translate-x-[2px] -translate-y-[2px]"
                            : "bg-rose-surface border-rose-border text-rose-muted hover:border-rose-text hover:text-rose-text"
                        }`}
                      >
                        <Plus size={16} />
                        Fill Manually
                      </button>
                    </div>
                  </div>

                  {/* Mode details */}
                  <div>
                    {!isManualCreate ? (
                      <div className="border-2 border-rose-border p-4 bg-rose-surface">
                        <label className="block text-[10px] font-black uppercase tracking-widest text-rose-muted mb-2">
                          Select PDF Resume File
                        </label>
                        <div className="border-2 border-dashed border-rose-hl-med hover:border-rose-text p-6 text-center bg-rose-overlay/10 cursor-pointer transition-colors relative">
                          <input
                            type="file"
                            accept=".pdf"
                            required={!isManualCreate}
                            onChange={(e) => {
                              if (e.target.files && e.target.files[0]) {
                                setSelectedFile(e.target.files[0]);
                                if (!newResumeName.trim()) {
                                  const nameWithoutExt = e.target.files[0].name.replace(/\.[^/.]+$/, "");
                                  setNewResumeName(nameWithoutExt);
                                }
                              }
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div className="flex flex-col items-center justify-center gap-2">
                            <Plus className="text-rose-muted" size={24} />
                            <p className="text-xs font-bold text-rose-text">
                              {selectedFile ? selectedFile.name : "Drag & drop or click to select PDF file"}
                            </p>
                            <p className="text-[10px] text-rose-muted font-bold">Only PDF files are supported</p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-rose-overlay/20 border-2 border-rose-border text-xs text-rose-muted leading-relaxed font-bold shadow-[3px_3px_0px_0px_var(--color-shadow)]">
                        Initialize an empty resume profile template, and fill in your details (experience, skills, projects) step-by-step using our interactive dashboard editor.
                      </div>
                    )}
                  </div>
                </form>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t-2 border-rose-border shrink-0">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="text-[11px] font-black uppercase tracking-widest text-rose-muted hover:text-rose-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  form="resume-upload-form"
                  disabled={isCreating || isUploadingFile}
                  className="flex items-center gap-2 bg-rose-text text-rose-surface text-xs font-black uppercase tracking-widest py-3 px-6 border-2 border-rose-text shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all disabled:opacity-60 disabled:translate-x-0 disabled:translate-y-0"
                >
                  {isCreating || isUploadingFile ? (
                    <>
                      <Loader2 className="animate-spin h-3.5 w-3.5" />
                      Creating
                    </>
                  ) : (
                    <>
                      Create Profile
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
