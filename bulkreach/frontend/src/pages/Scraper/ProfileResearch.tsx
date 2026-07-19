import { useState, useEffect } from "react";
import {
  User,
  Plus,
  Trash,
  Loader2,
  MapPin,
  Briefcase,
  Linkedin,
  Search,
  ExternalLink,
  Clock,
  Mail,
  Phone,
  Copy,
  Check,
  Target,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import textToast from "react-hot-toast";
import {
  useGetProfileResearchesQuery,
  useCreateProfileResearchMutation,
  useDeleteProfileResearchMutation,
} from "@/api/scraperApi";
import { formatDate } from "@/utils/helpers";
import { useConfirm } from "@/components/ui/dialogs";
import { ResearchTabs } from "@/components/scraper/ResearchTabs";

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}m ${secs}s`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 16 } },
};

export function ProfileResearch() {
  const { data: researches = [], isLoading } = useGetProfileResearchesQuery(undefined, {
    pollingInterval: 5000, // Poll every 5s for running tasks
  });
  const [createProfileResearch, { isLoading: isCreating }] = useCreateProfileResearchMutation();
  const [deleteProfileResearch] = useDeleteProfileResearchMutation();

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [inputUrl, setInputUrl] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [outreachTab, setOutreachTab] = useState<"linkedin" | "email">("linkedin");

  const { confirm, modal: confirmModal } = useConfirm();

  const selectedResearch = researches.find((r) => r.id === selectedId);

  // Set default selection to first item if none selected
  useEffect(() => {
    if (researches.length > 0 && selectedId === null) {
      setSelectedId(researches[0].id);
    }
  }, [researches, selectedId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUrl.trim()) return;

    if (!inputUrl.toLowerCase().includes("linkedin.com/in/")) {
      textToast.error("Please enter a valid LinkedIn profile URL (e.g. linkedin.com/in/username)");
      return;
    }

    try {
      const res = await createProfileResearch({ profile_url: inputUrl.trim() }).unwrap();
      textToast.success("Profile research task started!");
      setInputUrl("");
      setSelectedId(res.id);
    } catch (err: any) {
      textToast.error(err?.data?.error || "Failed to start profile research.");
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "Delete Profile Research",
      message: "Are you sure you want to delete this profile research record?",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;

    try {
      await deleteProfileResearch(id).unwrap();
      textToast.success("Record deleted.");
      if (selectedId === id) {
        setSelectedId(null);
      }
    } catch (err) {
      textToast.error("Failed to delete record.");
    }
  };

  const copyToClipboard = (text: string, type: "linkedin" | "email") => {
    navigator.clipboard.writeText(text);
    if (type === "linkedin") {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } else {
      setCopiedEmail(true);
      setTimeout(() => setCopiedEmail(false), 2000);
    }
    textToast.success("Copied to clipboard!");
  };

  const filteredResearches = researches.filter((r) =>
    r.profile_url.toLowerCase().includes(historySearch.toLowerCase()) ||
    (r.name && r.name.toLowerCase().includes(historySearch.toLowerCase())) ||
    (r.company && r.company.toLowerCase().includes(historySearch.toLowerCase()))
  );

  return (
    <div className="flex flex-col h-[calc(100vh-110px)] max-h-[850px] relative">
      <ResearchTabs />
      {/* Header */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="show"
        className="card relative overflow-hidden grid-bg border-2 border-rose-border p-6 shadow-[4px_4px_0px_0px_var(--color-shadow)] mb-6"
      >
        <span className="absolute top-0 left-0 bottom-0 w-[5px] bg-gradient-to-b from-rose-pine via-rose-iris to-rose-foam" />
        <div className="absolute inset-0 bg-gradient-to-r from-rose-surface via-rose-surface/97 to-rose-surface/85 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 pl-3">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-3xl font-black text-rose-text tracking-tight uppercase flex items-center gap-2">
                <Target size={26} className="text-rose-love stroke-[2.5]" />
                Profile Profiler
              </h1>
              <span className="inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-black tracking-widest uppercase bg-rose-pine/15 text-rose-pine border-2 border-rose-border rounded-none shadow-[2px_2px_0px_0px_var(--color-shadow)]">
                AI Agent
              </span>
            </div>
            <p className="text-rose-muted text-xs font-bold leading-relaxed max-w-xl">
              Research individual LinkedIn profiles. Extract contact info, outline interests, and generate personalized connection requests and outreach templates.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Main Split Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0">
        
        {/* Left: History & Search */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="w-full lg:w-96 card p-0 flex flex-col border-2 border-rose-border shadow-[4px_4px_0px_0px_var(--color-shadow)] overflow-hidden"
        >
          {/* URL Input Form */}
          <div className="p-4 border-b-2 border-rose-border bg-rose-overlay/30">
            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <label className="text-[10px] font-black uppercase text-rose-text tracking-wider pl-0.5 flex items-center gap-1.5">
                <Linkedin size={11} className="text-rose-pine stroke-[2.5]" /> Target Profile Link
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  placeholder="https://www.linkedin.com/in/..."
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  className="input flex-1 text-xs py-2 bg-rose-surface"
                  disabled={isCreating}
                />
                <button
                  type="submit"
                  disabled={isCreating}
                  className="btn btn-primary px-3 shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                >
                  {isCreating ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} className="stroke-[2.5]" />
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* History Search Bar */}
          <div className="p-3 border-b-2 border-rose-border bg-rose-overlay/10 flex items-center gap-2">
            <Search size={12} className="text-rose-muted" />
            <input
              type="text"
              placeholder="Filter researches..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold focus:outline-none text-rose-text"
            />
          </div>

          {/* History List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin bg-rose-surface">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 size={24} className="animate-spin text-rose-love" />
              </div>
            ) : filteredResearches.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 rounded-none bg-rose-overlay mx-auto flex items-center justify-center mb-3 border-2 border-rose-border">
                  <User size={20} className="text-rose-text" />
                </div>
                <p className="text-rose-text text-sm font-extrabold">No profiles analyzed yet</p>
                <p className="text-rose-muted text-xs mt-1 font-bold leading-relaxed">
                  Submit a LinkedIn URL above to profile a candidate.
                </p>
              </div>
            ) : (
              <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="show"
                className="space-y-2"
              >
                {filteredResearches.map((r) => (
                  <motion.div
                    layout
                    variants={itemVariants}
                    key={r.id}
                    className={`flex items-center gap-3 p-3 rounded-none cursor-pointer border-2 transition-all duration-150 relative group ${
                      selectedId === r.id
                        ? "bg-rose-overlay/40 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                        : "bg-rose-surface border-rose-hl-med hover:border-rose-border hover:shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                    }`}
                    onClick={() => setSelectedId(r.id)}
                  >
                    {/* Active line indicator */}
                    {selectedId === r.id && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-gradient-to-b from-rose-pine to-rose-iris" />
                    )}

                    <div className="w-8 h-8 rounded-none border border-rose-border bg-rose-overlay flex items-center justify-center shrink-0">
                      <User size={14} className="text-rose-pine" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-extrabold text-rose-text truncate">
                          {r.name || r.profile_url.split("/in/")[1]?.replace(/\/$/, "") || "Analyzing..."}
                        </p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wider border ${
                          r.status === "done"
                            ? "bg-rose-foam/10 text-rose-foam border-rose-foam/30"
                            : r.status === "failed"
                            ? "bg-rose-love/10 text-rose-love border-rose-love/30"
                            : "bg-rose-gold/10 text-rose-gold border-rose-gold/30 animate-pulse"
                        }`}>
                          {r.status}
                        </span>
                      </div>
                      <p className="text-[10px] text-rose-muted font-bold truncate mt-0.5">
                        {r.job_title ? `${r.job_title} @ ${r.company}` : r.profile_url}
                      </p>
                      
                      <div className="flex items-center justify-between mt-1.5 text-[9px] font-bold text-rose-muted pt-1 border-t border-rose-hl-low/40">
                        <span className="flex items-center gap-0.5">
                          <Clock size={8} /> {formatDate(r.created_at)}
                        </span>
                        <div className="flex items-center min-h-[16px]">
                          {r.duration !== undefined && r.duration !== null && (
                            <span className="text-rose-pine/80 font-mono group-hover:hidden lowercase">
                              ⏱ {formatDuration(r.duration)}
                            </span>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(r.id);
                            }}
                            className="hidden group-hover:flex items-center gap-0.5 text-rose-muted hover:text-rose-love transition-colors py-0.5 px-1 border border-rose-hl-med hover:border-rose-love rounded-none bg-rose-surface text-[8px] font-black uppercase"
                          >
                            <Trash size={8} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Right: Details Panel */}
        <div className="flex-1 flex flex-col min-w-0">
          <AnimatePresence mode="wait">
            {!selectedResearch ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="flex-1 border-2 border-dashed border-rose-border bg-rose-surface flex flex-col items-center justify-center p-12 text-center"
              >
                <div className="w-14 h-14 rounded-none border-2 border-dashed border-rose-border bg-rose-overlay flex items-center justify-center mb-4">
                  <User size={24} className="text-rose-muted" />
                </div>
                <h3 className="text-base font-extrabold text-rose-text uppercase">No Profile Selected</h3>
                <p className="text-rose-muted text-xs mt-2 max-w-sm font-semibold leading-relaxed">
                  Select an analyzed profile from the history rail on the left, or input a new profile URL to begin scanning.
                </p>
              </motion.div>
            ) : selectedResearch.status === "pending" || selectedResearch.status === "running" ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 border-2 border-rose-border bg-rose-surface flex flex-col items-center justify-center p-12 text-center shadow-[4px_4px_0px_0px_var(--color-shadow)]"
              >
                <div className="relative w-16 h-16 mb-4">
                  <div className="absolute inset-0 rounded-none border-4 border-rose-hl-low" />
                  <div className="absolute inset-0 rounded-none border-4 border-t-rose-love animate-spin" />
                </div>
                <h3 className="text-base font-extrabold text-rose-text uppercase animate-pulse">Running AI Profiler...</h3>
                <p className="text-rose-muted text-xs mt-2 max-w-sm font-bold leading-relaxed">
                  TalentStream is gathering search engine insights and scanning the target profile details. This will take about 20–40 seconds.
                </p>
              </motion.div>
            ) : selectedResearch.status === "failed" ? (
              <motion.div
                key="failed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 border-2 border-rose-border bg-rose-surface p-6 shadow-[4px_4px_0px_0px_var(--color-shadow)] space-y-4"
              >
                <div className="flex items-center gap-3 p-4 bg-rose-love/10 border-2 border-rose-love/40 rounded-none">
                  <div className="w-8 h-8 rounded-none border border-rose-love bg-rose-surface flex items-center justify-center text-rose-love font-black shrink-0">
                    !
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase text-rose-love">Profile Research Failed</h4>
                    <p className="text-[10px] font-semibold text-rose-muted mt-1 leading-relaxed">
                      {selectedResearch.error_message || "An unexpected error occurred during research."}
                    </p>
                  </div>
                </div>
                <p className="text-xs font-bold text-rose-muted pl-1">
                  Please check your Gemini API key inside Settings and retry. Keep in mind public LinkedIn profile crawling might fail if the profile slug is completely hidden or private.
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="content"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-y-auto border-2 border-rose-border bg-rose-surface p-6 shadow-[4px_4px_0px_0px_var(--color-shadow)] space-y-6 scrollbar-thin"
              >
                {/* Profile Header */}
                <div className="flex flex-col md:flex-row justify-between items-start gap-4 pb-5 border-b-2 border-rose-border">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-none border-2 border-rose-border bg-rose-overlay flex items-center justify-center shrink-0 shadow-[2px_2px_0px_0px_var(--color-shadow)]">
                      <User size={26} className="text-rose-pine" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h2 className="text-lg font-black text-rose-text uppercase tracking-wide truncate">
                          {selectedResearch.name}
                        </h2>
                        {selectedResearch.profile_url && (
                          <a
                            href={selectedResearch.profile_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center w-5 h-5 border border-rose-border text-rose-muted hover:text-rose-pine hover:bg-rose-pine/10 hover:-translate-x-[0.5px] hover:-translate-y-[0.5px] transition-all bg-rose-surface shrink-0"
                            title="Open LinkedIn Profile"
                          >
                            <ExternalLink size={10} className="stroke-[2.5]" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs font-extrabold text-rose-muted mt-1 leading-snug uppercase tracking-wide">
                        {selectedResearch.job_title || "Unknown Role"} <span className="text-rose-hl-med">@</span> {selectedResearch.company || "Unknown Company"}
                      </p>
                      {selectedResearch.headline && (
                        <p className="text-[11px] font-semibold text-rose-subtle mt-1.5 max-w-lg leading-normal">
                          {selectedResearch.headline}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-3 mt-2.5 text-[10px] text-rose-muted font-bold">
                        {selectedResearch.location && (
                          <span className="flex items-center gap-1">
                            <MapPin size={11} className="stroke-[2.5]" /> {selectedResearch.location}
                          </span>
                        )}
                        {selectedResearch.total_experience && (
                          <span className="flex items-center gap-1">
                            <Briefcase size={11} className="stroke-[2.5]" /> Exp: {selectedResearch.total_experience}
                          </span>
                        )}
                        {selectedResearch.duration !== undefined && selectedResearch.duration !== null && (
                          <span className="flex items-center gap-1 font-mono tracking-wide lowercase">
                            <Clock size={11} className="stroke-[2.5]" /> researched in {formatDuration(selectedResearch.duration)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Grid (Email, Phone) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email Box */}
                  <div className="border-2 border-rose-border bg-rose-overlay/10 p-3 flex items-center gap-3 shadow-[2px_2px_0px_0px_var(--color-shadow)]">
                    <div className="w-8 h-8 border border-rose-border bg-rose-surface flex items-center justify-center text-rose-pine shrink-0">
                      <Mail size={14} className="stroke-[2.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[8px] font-black uppercase tracking-wider text-rose-muted">Professional Email</div>
                      <div className="text-xs font-black text-rose-text mt-0.5 truncate select-all" title={selectedResearch.email}>
                        {selectedResearch.email || "No email generated"}
                      </div>
                    </div>
                  </div>

                  {/* Phone Box */}
                  <div className="border-2 border-rose-border bg-rose-overlay/10 p-3 flex items-center gap-3 shadow-[2px_2px_0px_0px_var(--color-shadow)]">
                    <div className="w-8 h-8 border border-rose-border bg-rose-surface flex items-center justify-center text-rose-love shrink-0">
                      <Phone size={14} className="stroke-[2.5]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[8px] font-black uppercase tracking-wider text-rose-muted">Phone Number</div>
                      <div className="text-xs font-black text-rose-text mt-0.5 truncate select-all">
                        {selectedResearch.phone_number || "Not publicly listed"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Summary Section */}
                {selectedResearch.summary && (
                  <div className="space-y-2">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-muted">Professional Focus Summary</h3>
                    <div className="p-4 border-2 border-rose-border bg-rose-surface font-semibold text-xs leading-relaxed text-rose-text">
                      {selectedResearch.summary}
                    </div>
                  </div>
                )}

                {/* Skills & Interests lists */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {/* Skills */}
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-muted flex items-center gap-1.5">
                      <Briefcase size={12} className="text-rose-pine" /> Extracted Skills
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedResearch.skills && selectedResearch.skills.length > 0 ? (
                        selectedResearch.skills.map((skill, index) => (
                          <span
                            key={index}
                            className="inline-block text-[9px] font-extrabold uppercase bg-rose-overlay border border-rose-hl-med text-rose-text px-2 py-0.5"
                          >
                            {skill}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-rose-muted font-bold">No skills parsed</span>
                      )}
                    </div>
                  </div>

                  {/* Interests */}
                  <div className="space-y-2.5">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-rose-muted flex items-center gap-1.5">
                      <Sparkles size={12} className="text-rose-gold" /> Key Focus Interests
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedResearch.interests && selectedResearch.interests.length > 0 ? (
                        selectedResearch.interests.map((interest, index) => (
                          <span
                            key={index}
                            className="inline-block text-[9px] font-extrabold uppercase bg-rose-gold/10 border border-rose-gold/30 text-rose-gold px-2 py-0.5"
                          >
                            {interest}
                          </span>
                        ))
                      ) : (
                        <span className="text-[10px] text-rose-muted font-bold">No interests parsed</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Outreach Copy-paste Section */}
                <div className="space-y-3 pt-4 border-t-2 border-rose-border">
                  {/* Tab Selector */}
                  <div className="flex gap-2 border-b border-rose-hl-low pb-0">
                    <button
                      onClick={() => setOutreachTab("linkedin")}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 border-b-0 relative z-10 translate-y-[1px] transition-all duration-150 flex items-center gap-1.5 ${
                        outreachTab === "linkedin"
                          ? "bg-rose-surface border-rose-border text-rose-pine shadow-[1px_-1px_0px_0px_var(--color-shadow)]"
                          : "border-transparent text-rose-muted hover:text-rose-text hover:bg-rose-overlay/20"
                      }`}
                    >
                      <Linkedin size={11} className="stroke-[2.5]" />
                      LinkedIn Connect Msg
                    </button>
                    <button
                      onClick={() => setOutreachTab("email")}
                      className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-2 border-b-0 relative z-10 translate-y-[1px] transition-all duration-150 flex items-center gap-1.5 ${
                        outreachTab === "email"
                          ? "bg-rose-surface border-rose-border text-rose-pine shadow-[1px_-1px_0px_0px_var(--color-shadow)]"
                          : "border-transparent text-rose-muted hover:text-rose-text hover:bg-rose-overlay/20"
                      }`}
                    >
                      <Mail size={11} className="stroke-[2.5]" />
                      Outreach Email Hook
                    </button>
                  </div>

                  {/* Tab Contents */}
                  <div className="pt-2">
                    {outreachTab === "linkedin" ? (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[9px] font-black uppercase tracking-wider text-rose-muted">
                            LinkedIn Note Limit: {selectedResearch.connection_message.length}/300 Characters
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(selectedResearch.connection_message, "linkedin")
                            }
                            className="btn btn-secondary text-[9px] font-black uppercase py-1 px-2.5 flex items-center gap-1 shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] transition-all bg-rose-surface border-rose-border"
                          >
                            {copiedLink ? (
                              <>
                                <Check size={10} className="text-rose-foam stroke-[3]" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy size={10} className="stroke-[2.5]" />
                                Copy Message
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-4 border-2 border-rose-border bg-rose-overlay/5 font-mono text-[11px] leading-relaxed text-rose-text select-all whitespace-pre-wrap">
                          {selectedResearch.connection_message || "No message generated"}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-[9px] font-black uppercase tracking-wider text-rose-muted">
                            Full Outreach Email Hook
                          </span>
                          <button
                            onClick={() =>
                              copyToClipboard(selectedResearch.outreach_message, "email")
                            }
                            className="btn btn-secondary text-[9px] font-black uppercase py-1 px-2.5 flex items-center gap-1 shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] transition-all bg-rose-surface border-rose-border"
                          >
                            {copiedEmail ? (
                              <>
                                <Check size={10} className="text-rose-foam stroke-[3]" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy size={10} className="stroke-[2.5]" />
                                Copy Email Body
                              </>
                            )}
                          </button>
                        </div>
                        <div className="p-4 border-2 border-rose-border bg-rose-overlay/5 font-mono text-[11px] leading-relaxed text-rose-text select-all whitespace-pre-wrap">
                          {selectedResearch.outreach_message || "No outreach hook generated"}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>
      {confirmModal}
    </div>
  );
}
