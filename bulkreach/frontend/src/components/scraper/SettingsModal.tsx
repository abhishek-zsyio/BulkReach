import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Settings, Trash, Loader2, ArrowRight } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useGetResumesQuery, useUploadResumeMutation, useDeleteResumeMutation } from "@/api/resumeApi";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { API_BASE_URL } from "@/utils/constants";
import toast from "react-hot-toast";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const VALID_GEMINI_MODELS = ["gemini-3.5-flash", "gemini-2.5-flash", "gemini-2.5-pro", "gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { user, fetchUserProfile, accessToken } = useAuth();
  const { data: resumes = [] } = useGetResumesQuery();
  const [uploadResume] = useUploadResumeMutation();
  const [deleteResume] = useDeleteResumeMutation();

  const [apiKeyInput, setApiKeyInput] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3.5-flash");
  const [newResumeName, setNewResumeName] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  useEffect(() => {
    if (isOpen && user) {
      setApiKeyInput("");
      const saved = user.gemini_model || "";
      setGeminiModel(VALID_GEMINI_MODELS.includes(saved) ? saved : "gemini-3.5-flash");
    }
  }, [isOpen, user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData();
    if (apiKeyInput.trim()) {
      formData.append("gemini_api_key", apiKeyInput.trim());
    }
    formData.append("gemini_model", geminiModel);

    try {
      setIsUploadingResume(true);
      const res = await fetch(`${API_BASE_URL}/auth/me/`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || "Failed to update profile.");
      }
      toast.success("AI Settings updated successfully!");
      setApiKeyInput("");
      fetchUserProfile();
    } catch (error: any) {
      toast.error(error.message || "An error occurred.");
    } finally {
      setIsUploadingResume(false);
    }

    if (resumeFile && newResumeName.trim()) {
      try {
        setIsUploadingResume(true);
        const resumeForm = new FormData();
        resumeForm.append("name", newResumeName);
        resumeForm.append("file", resumeFile);
        await uploadResume(resumeForm).unwrap();
        toast.success("Resume uploaded successfully!");
        setNewResumeName("");
        setResumeFile(null);
      } catch (err: any) {
        toast.error("Failed to upload resume.");
      } finally {
        setIsUploadingResume(false);
      }
    }
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
                <div className="w-9 h-9 border-2 border-rose-surface bg-rose-iris flex items-center justify-center">
                  <Settings size={16} className="text-white" />
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                {["Token", "Model", "Profile"].map((label, i) => (
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
                    AI &amp; Resume Settings
                  </h3>
                  <p className="text-[12px] text-rose-muted font-bold mt-1.5">
                    Configure Gemini API tokens and load resume matching profiles.
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
                <form id="settings-form" onSubmit={handleSaveSettings} className="space-y-6">
                  {/* API Key Input */}
                  <div>
                    <div className="flex items-baseline justify-between mb-2.5">
                      <span className="text-[10px] font-black uppercase tracking-widest text-rose-muted">
                        01 — Gemini API Credentials
                      </span>
                      {user?.has_gemini_api_key && (
                        <span className="text-[10px] font-black uppercase tracking-widest text-rose-foam">
                          ✓ Configured
                        </span>
                      )}
                    </div>
                    <div className="border-2 border-rose-border p-3.5">
                      <label htmlFor="settings-api-key" className="block text-[10px] font-black uppercase tracking-widest text-rose-muted mb-1.5">
                        API Token
                      </label>
                      <input
                        id="settings-api-key"
                        type="password"
                        value={apiKeyInput}
                        onChange={(e) => setApiKeyInput(e.target.value)}
                        placeholder={user?.has_gemini_api_key ? "•••••••••••••••• (Already Configured)" : "Paste your Gemini API token..."}
                        className="w-full bg-transparent font-mono text-sm text-rose-text placeholder:text-rose-muted placeholder:font-semibold focus:outline-none"
                      />
                    </div>
                    <p className="text-[10px] text-rose-muted mt-2 font-bold leading-relaxed">
                      Tokens are safely encrypted. Retrieve your Gemini credentials from Google AI Studio.
                    </p>
                  </div>

                  {/* Gemini Model Picker */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-muted mb-2.5 block">
                      02 — Model Selection
                    </span>
                    <div className="border-2 border-rose-border p-3.5">
                      <label htmlFor="settings-model" className="block text-[10px] font-black uppercase tracking-widest text-rose-muted mb-1.5">
                        Gemini AI Model
                      </label>
                      <CustomSelect
                        value={geminiModel}
                        onChange={(val) => setGeminiModel(val.toString())}
                        options={[
                          { value: "gemini-3.5-flash", label: "Gemini 3.5 Flash — Recommended · Fastest" },
                          { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash — Fast & Smart" },
                          { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro — Most Powerful Reasoning" },
                          { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash — Fast & Balanced" },
                          { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash — Legacy · Stable" },
                          { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro — Legacy · High Reasoning" },
                        ]}
                        placeholder="Select Gemini model..."
                      />
                    </div>
                  </div>

                  {/* Resumes List and Upload Form */}
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-muted mb-2.5 block">
                      03 — Manage Matching Profiles
                    </span>
                    <div className="space-y-4">
                      {resumes.length > 0 && (
                        <div className="border-2 border-rose-border divide-y-2 divide-rose-border">
                          {resumes.map((r) => (
                            <div
                              key={r.id}
                              className="flex items-center justify-between p-3.5 bg-rose-overlay/20"
                            >
                              <div>
                                <p className="text-xs font-black text-rose-text">{r.name}</p>
                                <p className="text-[10px] text-rose-muted mt-0.5 font-bold truncate max-w-[280px]">
                                  {r.file ? r.file.split("/").pop() : "Text Profile"}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => deleteResume(r.id)}
                                className="bg-rose-surface border-2 border-rose-border hover:bg-rose-love hover:text-white hover:border-rose-love p-1.5 transition-all rounded-none shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none"
                              >
                                <Trash size={14} className="stroke-[2.5]" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="border-2 border-rose-border">
                        <div className="p-3.5 border-b-2 border-rose-border">
                          <label htmlFor="resume-name" className="block text-[10px] font-black uppercase tracking-widest text-rose-muted mb-1.5">
                            Profile Name
                          </label>
                          <input
                            id="resume-name"
                            type="text"
                            placeholder="e.g. Senior Frontend Resume"
                            value={newResumeName}
                            onChange={(e) => setNewResumeName(e.target.value)}
                            className="w-full bg-transparent font-bold text-sm text-rose-text placeholder:text-rose-muted placeholder:font-semibold focus:outline-none"
                          />
                        </div>
                        <div className="p-3.5">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-rose-muted mb-1.5">
                            Resume File (PDF)
                          </label>
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                            className="w-full text-xs font-bold text-rose-text file:mr-4 file:py-1.5 file:px-3 file:border-2 file:border-rose-border file:bg-rose-surface file:text-rose-text hover:file:bg-rose-hl-low cursor-pointer"
                          />
                        </div>
                      </div>
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
                  form="settings-form"
                  disabled={isUploadingResume}
                  className="flex items-center gap-2 bg-rose-text text-rose-surface text-xs font-black uppercase tracking-widest py-3 px-6 border-2 border-rose-text shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all disabled:opacity-60 disabled:translate-x-0 disabled:translate-y-0"
                >
                  {isUploadingResume ? (
                    <>
                      <Loader2 className="animate-spin h-3.5 w-3.5" />
                      Saving
                    </>
                  ) : (
                    <>
                      Save settings
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
