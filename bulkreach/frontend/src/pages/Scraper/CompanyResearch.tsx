import { useState, useEffect } from "react";
import {
  Building2,
  Plus,
  Trash,
  Loader2,
  Globe,
  MapPin,
  Briefcase,
  Linkedin,
  Users,
  Search,
  Upload,
  CheckSquare,
  Square,
  ExternalLink,
  AlertCircle,
  Clock,
  Mail,
  ChevronDown,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  useGetCompanyEnrichmentsQuery,
  useGetCompanyEnrichmentQuery,
  useCreateCompanyEnrichmentMutation,
  useDeleteCompanyEnrichmentMutation,
  useImportCompanyEmployeesMutation,
} from "@/api/scraperApi";
import { useGetCampaignsQuery } from "@/api/campaignApi";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/utils/helpers";
import type { CompanyEmployee } from "@/types/scraper";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { useConfirm } from "@/components/ui/dialogs";
import { ResearchModal } from "@/components/scraper/ResearchModal";
import { ResearchImportModal } from "@/components/scraper/ResearchImportModal";

// ── Animation variants ──────────────────────────────────────────────────────
const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 16 } },
};

// ── Default job titles ───────────────────────────────────────────────────────
const DEFAULT_JOB_TITLES = [
  "HR",
  "Recruiter",
  "Talent Acquisition",
  "Engineering Manager",
  "Hiring Manager",
  "HR Manager",
];

// ── Company logo with fallback ───────────────────────────────────────────────
function CompanyLogo({ name, logoUrl, size = "md" }: { name: string; logoUrl?: string; size?: "sm" | "md" | "lg" }) {
  const [imgError, setImgError] = useState(false);
  const sizeMap = { sm: "w-8 h-8", md: "w-14 h-14", lg: "w-20 h-20" };
  const textSizeMap = { sm: "text-sm", md: "text-xl", lg: "text-3xl" };
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={`${name} logo`}
        className={`${sizeMap[size]} object-contain border-2 border-rose-border bg-white p-1`}
        onError={() => setImgError(true)}
      />
    );
  }
  return (
    <div
      className={`${sizeMap[size]} flex items-center justify-center border-2 border-rose-border font-black ${textSizeMap[size]} text-rose-text`}
      style={{ background: "linear-gradient(135deg, var(--color-pine) 0%, var(--color-iris) 100%)", color: "#fff" }}
    >
      {initials}
    </div>
  );
}



function formatErrorMessage(errorStr: string | null | undefined): string {
  if (!errorStr) return "An unexpected error occurred.";

  // Try to parse Gemini API format: "429 RESOURCE_EXHAUSTED. {'error': {'code': 429, 'message': '...', 'status': '...'}}"
  const messageRegex = /['"]message['"]:\s*(['"])(.*?)\1/s;
  const match = errorStr.match(messageRegex);
  if (match && match[2]) {
    // Clean up any escaped characters like \n
    return match[2].replace(/\\n/g, "\n");
  }

  // Fallback: If it's a standard JSON string
  try {
    const parsed = JSON.parse(errorStr);
    if (parsed.error && parsed.error.message) {
      return parsed.error.message;
    }
  } catch (e) {
    // Ignore JSON parse error
  }

  // Clean up any raw "429 RESOURCE_EXHAUSTED. " prefix if it was not matched by regex
  return errorStr.replace(/^429 RESOURCE_EXHAUSTED\.\s*/i, "");
}

// ── Main Component ───────────────────────────────────────────────────────────
export function CompanyResearch() {
  const { user } = useAuth();

  // ── State ──────────────────────────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isResearchModalOpen, setIsResearchModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  // Research modal
  const [companyName, setCompanyName] = useState("");
  const [jobTitles, setJobTitles] = useState<string[]>([...DEFAULT_JOB_TITLES]);

  // Import modal
  const [selectedCampaignId, setSelectedCampaignId] = useState("");
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<Set<number>>(new Set());
  const [expandedRowIds, setExpandedRowIds] = useState<Set<number>>(new Set());
  const { confirm, modal } = useConfirm();

  const handleToggleRowExpand = (id: number) => {
    const next = new Set(expandedRowIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedRowIds(next);
  };

  // Polling
  const [pollInterval, setPollInterval] = useState(0);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: enrichments = [] } = useGetCompanyEnrichmentsQuery(undefined, {
    pollingInterval: pollInterval,
  });

  const { data: selected, error: selectedError, refetch: refetchSelected } = useGetCompanyEnrichmentQuery(selectedId!, {
    skip: !selectedId,
    pollingInterval: (() => {
      const e = enrichments.find((e) => e.id === selectedId);
      return e?.status === "pending" || e?.status === "running" ? 3000 : 0;
    })(),
  });

  const selectedEnrichment = enrichments.find((e) => e.id === selectedId);

  useEffect(() => {
    if (selectedId && selectedEnrichment && (selectedEnrichment.status === "done" || selectedEnrichment.status === "failed")) {
      refetchSelected();
    }
  }, [selectedId, selectedEnrichment?.status, refetchSelected]);

  const { data: campaigns = [] } = useGetCampaignsQuery();
  const [createEnrichment, { isLoading: isCreating }] = useCreateCompanyEnrichmentMutation();
  const [deleteEnrichment] = useDeleteCompanyEnrichmentMutation();
  const [importEmployees, { isLoading: isImporting }] = useImportCompanyEmployeesMutation();

  // ── Polling control ────────────────────────────────────────────────────────
  useEffect(() => {
    const hasActive = enrichments.some((e) => e.status === "pending" || e.status === "running");
    setPollInterval(hasActive ? 3000 : 0);
  }, [enrichments]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleResearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error("Please enter a company name.");
      return;
    }
    if (!user?.has_gemini_api_key) {
      toast.error("A Gemini API key is required. Please set it in Settings.");
      return;
    }
    try {
      const res = await createEnrichment({ company_name: companyName.trim(), job_titles: jobTitles }).unwrap();
      toast.success(`Research started for "${res.company_name}"!`);
      setSelectedId(res.id);
      setIsResearchModalOpen(false);
      setCompanyName("");
      setJobTitles([...DEFAULT_JOB_TITLES]);
    } catch (err: any) {
      const msg = err?.data?.error || err?.data?.company_name?.[0] || err?.message || "Failed to start research.";
      toast.error(msg);
    }
  };

  const handleDelete = async (id: number) => {
    const ok = await confirm({
      title: "Delete Company Research",
      message: "Delete this company research? All discovered employees will be removed. This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteEnrichment(id).unwrap();
      toast.success("Deleted successfully.");
      if (selectedId === id) setSelectedId(null);
    } catch {
      toast.error("Failed to delete.");
    }
  };

  const handleToggleEmployee = (id: number) => {
    setSelectedEmployeeIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleToggleAll = (employees: CompanyEmployee[]) => {
    if (selectedEmployeeIds.size === employees.length) {
      setSelectedEmployeeIds(new Set());
    } else {
      setSelectedEmployeeIds(new Set(employees.map((e: CompanyEmployee) => e.id)));
    }
  };

  const handleOpenImport = () => {
    if (campaigns.length === 0) {
      toast.error("Please create a campaign first.");
      return;
    }
    if (!selected?.employees?.length) {
      toast.error("No employees found to import.");
      return;
    }
    setSelectedCampaignId(campaigns[0].id.toString());
    if (selectedEmployeeIds.size === 0) {
      setSelectedEmployeeIds(new Set(selected.employees.map((e: CompanyEmployee) => e.id)));
    }
    setIsImportModalOpen(true);
  };

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId || !selectedCampaignId) return;
    try {
      const res = await importEmployees({
        id: selectedId,
        campaign_id: Number(selectedCampaignId),
        employee_ids: selectedEmployeeIds.size > 0 ? Array.from(selectedEmployeeIds) : undefined,
      }).unwrap();
      toast.success(res.message || "Employees imported successfully!");
      setIsImportModalOpen(false);
      setSelectedEmployeeIds(new Set());
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to import.");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────────
  const isRunning = selectedEnrichment?.status === "pending" || selectedEnrichment?.status === "running";
  const filteredEnrichments = historySearch.trim()
    ? enrichments.filter((e) =>
        e.company_name.toLowerCase().includes(historySearch.trim().toLowerCase())
      )
    : enrichments;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      {/* ── Header ── */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-rose-text tracking-tight flex items-center gap-3">
            <Building2 size={28} className="text-rose-pine stroke-[2.5]" />
            Company Research
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black tracking-wider uppercase bg-rose-iris/15 text-rose-iris border border-rose-border rounded-sm leading-none select-none">
              AI
            </span>
          </h1>
          <p className="text-rose-subtle mt-1 text-sm font-medium">
            Enter a company name to auto-discover its profile and fetch HR / recruiter contacts with LinkedIn.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
        {/* ── Left: History Panel ── */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4">
          <button
            onClick={() => setIsResearchModalOpen(true)}
            className="btn-primary w-full justify-center py-3.5 group"
          >
            <Plus size={16} className="group-hover:rotate-90 transition-transform duration-150" />
            Research Company
          </button>

          <div className="card p-0 overflow-hidden flex flex-col max-h-[calc(100vh-250px)] min-h-[500px]">
            <div className="px-4 py-3 flex items-center gap-2 bg-rose-overlay/40 border-b-2 border-rose-border shrink-0">
              <Clock size={14} className="text-rose-pine stroke-[2.5]" />
              <h2 className="text-xs font-extrabold text-rose-text uppercase tracking-wider flex-1">
                Research History
              </h2>
              <span className="text-[10px] font-extrabold text-rose-muted">
                {enrichments.length} {enrichments.length === 1 ? "company" : "companies"}
              </span>
            </div>

            {/* Search bar */}
            {enrichments.length > 0 && (
              <div className="px-3 py-2 border-b-2 border-rose-hl-low bg-rose-surface shrink-0">
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-rose-muted pointer-events-none" />
                  <input
                    type="text"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    placeholder="Filter companies…"
                    className="input w-full pl-7 py-1.5 text-xs"
                  />
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin bg-rose-surface">
              {filteredEnrichments.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-none bg-rose-overlay mx-auto flex items-center justify-center mb-3 border-2 border-rose-border">
                    <Building2 size={20} className="text-rose-text" />
                  </div>
                  {enrichments.length === 0 ? (
                    <>
                      <p className="text-rose-text text-sm font-extrabold">No companies yet</p>
                      <p className="text-rose-muted text-xs mt-1 font-bold leading-relaxed">
                        Click "Research Company" to discover employees at any company.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-rose-text text-sm font-extrabold">No match</p>
                      <p className="text-rose-muted text-xs mt-1 font-bold leading-relaxed">
                        No companies match "{historySearch}".
                      </p>
                    </>
                  )}
                </div>
              ) : (
                filteredEnrichments.map((enrichment) => (
                  <div
                    key={enrichment.id}
                    className={`flex items-center gap-3 p-3 rounded-none cursor-pointer border-2 transition-all duration-150 relative group ${
                      selectedId === enrichment.id
                        ? "bg-rose-overlay/40 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                        : "bg-rose-surface border-rose-hl-med hover:border-rose-border hover:shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                    }`}
                    onClick={() => setSelectedId(enrichment.id)}
                  >
                    {/* Selected indicator */}
                    {selectedId === enrichment.id && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-gradient-to-b from-rose-pine to-rose-iris" />
                    )}
                    <CompanyLogo
                      name={enrichment.company_name}
                      logoUrl={enrichment.logo_url}
                      size="sm"
                    />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-extrabold text-rose-text truncate">{enrichment.company_name}</p>
                        <StatusBadge status={enrichment.status} />
                      </div>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[10px] text-rose-muted font-semibold">
                          {enrichment.employees.length} employees
                        </span>
                        <div className="flex items-center min-h-[16px]">
                          <span className="text-[10px] text-rose-muted font-semibold group-hover:hidden">
                            {formatDate(enrichment.created_at)}
                          </span>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(enrichment.id); }}
                            className="hidden group-hover:flex items-center gap-1 text-rose-muted hover:text-rose-love transition-colors py-0.5 px-1.5 border border-rose-hl-med hover:border-rose-love rounded-none bg-rose-surface text-[9px] font-black uppercase"
                          >
                            <Trash size={9} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </motion.div>

        {/* ── Right: Detail Panel ── */}
        <AnimatePresence mode="wait">
          {!selectedId ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center justify-center p-12 text-center min-h-[500px] h-[calc(100vh-250px)]"
            >
              <div
                className="w-20 h-20 rounded-none flex items-center justify-center mb-6 border-2 border-rose-border"
                style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--color-pine) 12%, transparent) 0%, color-mix(in srgb, var(--color-iris) 12%, transparent) 100%)" }}
              >
                <Building2 size={32} className="text-rose-pine stroke-[1.5]" />
              </div>
              <h3 className="text-2xl font-extrabold text-rose-text tracking-tight">Select a company</h3>
              <p className="text-sm text-rose-muted max-w-sm mt-3 font-semibold leading-relaxed">
                Pick a company from your history, or start a new AI-powered search to discover employees.
              </p>
              <button
                onClick={() => setIsResearchModalOpen(true)}
                className="btn-primary mt-6 px-6 py-3 group"
              >
                <Plus size={15} className="group-hover:rotate-90 transition-transform duration-150" />
                Research Company
              </button>
            </motion.div>
          ) : (
            <motion.div
              key={`detail-${selectedId}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* API/Network Error */}
              {selectedError && (
                <div className="card p-6 border-2 border-rose-love bg-rose-love/5 flex items-start gap-2.5">
                  <AlertCircle size={18} className="text-rose-love mt-0.5 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-rose-text text-sm">Error Loading Company</h4>
                    <p className="text-xs text-rose-muted font-semibold mt-1">
                      {selectedError && "status" in selectedError
                        ? (selectedError.data as any)?.error || "Failed to load company details."
                        : "A network or connection error occurred."}
                    </p>
                  </div>
                </div>
              )}
              {/* ── Running Banner ── */}
              <AnimatePresence>
                {isRunning && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="card p-4 flex items-center gap-4 relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-[4px] h-full bg-rose-iris animate-pulse" />
                    <div className="pl-2 flex items-center gap-3 flex-1">
                      <Loader2 size={18} className="text-rose-iris animate-spin shrink-0" />
                      <div>
                        <p className="text-sm font-extrabold text-rose-text">
                          Researching{" "}
                          <span className="text-rose-iris">
                            {selectedEnrichment?.company_name}
                          </span>
                          …
                        </p>
                        <p className="text-xs text-rose-muted font-semibold mt-0.5">
                          AI is searching company details and finding employees. This may take 30–60 seconds.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Company Card ── */}
              {selected && (
                <div className="card p-6 space-y-4">
                  {/* Company Header */}
                  <div className="flex items-start gap-5">
                    <CompanyLogo
                      name={selected.company_name}
                      logoUrl={selected.logo_url}
                      size="lg"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h2 className="text-2xl font-extrabold text-rose-text tracking-tight">
                          {selected.company_name}
                        </h2>
                        <StatusBadge status={selected.status} />
                      </div>

                      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
                        {selected.industry && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-muted font-semibold">
                            <Briefcase size={12} className="text-rose-iris shrink-0" />
                            <span>{selected.industry}</span>
                          </div>
                        )}
                        {selected.location && (
                          <div className="flex items-center gap-1.5 text-xs text-rose-muted font-semibold">
                            <MapPin size={12} className="text-rose-love shrink-0" />
                            <span>{selected.location}</span>
                          </div>
                        )}
                        {selected.website && (
                          <a
                            href={selected.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-rose-pine font-bold hover:underline"
                          >
                            <Globe size={12} className="shrink-0" />
                            <span>{selected.domain || selected.website}</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>

                      {selected.description && (
                        <p className="mt-3 text-sm text-rose-subtle font-medium leading-relaxed max-w-2xl">
                          {selected.description}
                        </p>
                      )}

                      {selected.status === "failed" && selected.error_message && (
                        <div className="mt-3 p-3 border-2 border-rose-love bg-rose-love/5 flex items-start gap-2">
                          <AlertCircle size={14} className="text-rose-love mt-0.5 shrink-0" />
                          <p className="text-xs text-rose-love font-semibold whitespace-pre-wrap">{formatErrorMessage(selected.error_message)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Employees Table ── */}
              {selected && (
                <div className={`card p-0 overflow-hidden transition-all duration-500 ${
                  isRunning ? "[animation:borderPulse_2s_ease-in-out_infinite]" : ""
                }`}>
                  {/* Table Header */}
                  <div className="px-5 py-3.5 flex items-center justify-between bg-rose-overlay/30 border-b-2 border-rose-border">
                    <div className="flex items-center gap-2.5">
                      <Users size={14} className="text-rose-pine stroke-[2.5]" />
                      <h3 className="text-xs font-extrabold text-rose-text uppercase tracking-wider">
                        Employees Found
                      </h3>
                      {selected.employees.length > 0 && (
                        <span className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-extrabold bg-rose-pine text-white border-2 border-rose-border">
                          {selected.employees.length}
                        </span>
                      )}
                    </div>

                    {selected.employees.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-rose-muted font-bold">
                          {selectedEmployeeIds.size} selected
                        </span>
                        <button
                          onClick={handleOpenImport}
                          className="btn-primary py-1.5 px-3 text-xs"
                        >
                          <Upload size={12} />
                          Import to Campaign
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Loading skeleton */}
                  {isRunning && selected.employees.length === 0 && (
                    <div className="divide-y-2 divide-rose-hl-low">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                          <div className="w-4 h-4 animate-shimmer" />
                          <div className="w-8 h-8 animate-shimmer" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 w-32 animate-shimmer" />
                            <div className="h-2.5 w-48 animate-shimmer opacity-70" />
                          </div>
                          <div className="h-3 w-24 animate-shimmer" />
                          <div className="h-3 w-20 animate-shimmer opacity-70" />
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Empty state (done but no employees) */}
                  {!isRunning && selected.employees.length === 0 && selected.status === "done" && (
                    <div className="py-14 text-center">
                      <div className="w-12 h-12 bg-rose-hl-low border-2 border-rose-border flex items-center justify-center mx-auto mb-3">
                        <Search size={18} className="text-rose-muted" />
                      </div>
                      <p className="text-sm font-extrabold text-rose-text">No employees found</p>
                      <p className="text-xs text-rose-muted font-semibold mt-1 max-w-xs mx-auto leading-relaxed">
                        The AI could not find employees matching the target job titles for this company.
                      </p>
                    </div>
                  )}

                  {/* Failed state */}
                  {!isRunning && selected.status === "failed" && selected.employees.length === 0 && (
                    <div className="py-14 text-center px-4">
                      <div className="w-12 h-12 bg-rose-love/15 border-2 border-rose-border flex items-center justify-center mx-auto mb-3 text-rose-love">
                        <AlertCircle size={18} />
                      </div>
                      <p className="text-sm font-extrabold text-rose-text">Research Failed</p>
                      <p className="text-xs text-rose-muted font-semibold mt-1 max-w-md mx-auto leading-relaxed whitespace-pre-wrap">
                        {formatErrorMessage(selected.error_message)}
                      </p>
                    </div>
                  )}

                  {/* Employee rows */}
                  {selected.employees.length > 0 && (
                    <>
                      {/* Select-all row */}
                      <div className="grid grid-cols-[20px_32px_1fr_64px] md:grid-cols-[20px_32px_1fr_144px_64px] lg:grid-cols-[20px_32px_1fr_144px_160px_64px] items-center gap-4 px-5 py-2.5 bg-rose-overlay/20 border-b-2 border-rose-hl-low">
                        <button
                          onClick={() => handleToggleAll(selected.employees)}
                          className="flex items-center text-rose-muted hover:text-rose-text transition-colors"
                          title={selectedEmployeeIds.size === selected.employees.length ? "Deselect All" : "Select All"}
                        >
                          {selectedEmployeeIds.size === selected.employees.length ? (
                            <CheckSquare size={14} className="text-rose-pine" />
                          ) : (
                            <Square size={14} />
                          )}
                        </button>
                        <div /> {/* Space for Avatar */}
                        <span className="text-[10px] text-rose-muted font-bold uppercase tracking-wider">Name</span>
                        <span className="text-[10px] text-rose-muted font-bold uppercase tracking-wider hidden md:block">Title</span>
                        <span className="text-[10px] text-rose-muted font-bold uppercase tracking-wider hidden lg:block">Email</span>
                        <span className="text-[10px] text-rose-muted font-bold uppercase tracking-wider text-right">Actions</span>
                      </div>

                      <div className="divide-y-2 divide-rose-hl-low">
                        {selected.employees.map((emp: CompanyEmployee) => (
                          <motion.div
                            key={emp.id}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className={`relative grid grid-cols-[20px_32px_1fr_64px] md:grid-cols-[20px_32px_1fr_144px_64px] lg:grid-cols-[20px_32px_1fr_144px_160px_64px] items-center gap-4 px-5 py-3.5 transition-colors duration-100 ${
                              selectedEmployeeIds.has(emp.id)
                                ? "bg-rose-pine/5"
                                : "hover:bg-rose-hl-low/30"
                            }`}
                          >
                            {/* Selected accent bar */}
                            {selectedEmployeeIds.has(emp.id) && (
                              <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 bg-gradient-to-b from-rose-pine to-rose-iris" />
                            )}
                            {/* Checkbox */}
                            <button
                              onClick={() => handleToggleEmployee(emp.id)}
                              className="flex-shrink-0"
                            >
                              {selectedEmployeeIds.has(emp.id) ? (
                                <CheckSquare size={15} className="text-rose-pine" />
                              ) : (
                                <Square size={15} className="text-rose-muted" />
                              )}
                            </button>

                            {/* Avatar */}
                            <div className="w-8 h-8 flex-shrink-0 flex items-center justify-center border-2 border-rose-border bg-rose-overlay font-extrabold text-xs text-rose-text">
                              {emp.name.split(" ").map((w: string) => w[0]).join("").slice(0, 2).toUpperCase()}
                            </div>

                            {/* Name */}
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-rose-text truncate">{emp.name}</p>
                            </div>

                            {/* Job Title */}
                            <div className="hidden md:block min-w-0">
                              {emp.job_title ? (
                                <span className="inline-block text-[10px] font-bold text-rose-iris border border-rose-iris/30 bg-rose-iris/8 px-1.5 py-0.5 truncate max-w-full">
                                  {emp.job_title}
                                </span>
                              ) : (
                                <span className="text-[10px] text-rose-muted">—</span>
                              )}
                            </div>

                            {/* Email */}
                            <div className="hidden lg:block min-w-0">
                              {emp.email ? (
                                <a
                                  href={`mailto:${emp.email}`}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-rose-muted hover:text-rose-pine transition-colors truncate"
                                  title={emp.email}
                                >
                                  <Mail size={10} className="shrink-0" />
                                  <span className="truncate">{emp.email}</span>
                                </a>
                              ) : (
                                <span className="text-[10px] text-rose-muted">—</span>
                              )}
                            </div>

                            {/* Actions (LinkedIn + Chevron Down) */}
                            <div className="flex items-center justify-end gap-1.5">
                              {emp.linkedin_url ? (
                                <a
                                  href={emp.linkedin_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-7 h-7 flex items-center justify-center border-2 border-rose-border bg-rose-surface text-rose-muted hover:text-rose-pine hover:border-rose-pine hover:shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all duration-150"
                                  title="View LinkedIn Profile"
                                >
                                  <Linkedin size={11} />
                                </a>
                              ) : (
                                <span className="text-[10px] text-rose-hl-med">—</span>
                              )}
                              
                              <button
                                onClick={() => handleToggleRowExpand(emp.id)}
                                className="w-7 h-7 flex items-center justify-center border-2 border-rose-border bg-rose-surface text-rose-muted hover:text-rose-pine hover:border-rose-pine active:scale-95 transition-all"
                                title="Show details & insights"
                              >
                                <ChevronDown 
                                  size={13} 
                                  className={`transition-transform duration-200 ${expandedRowIds.has(emp.id) ? "rotate-180" : ""}`} 
                                />
                              </button>
                            </div>

                            {/* Collapsible detail drawer */}
                            <AnimatePresence>
                              {expandedRowIds.has(emp.id) && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: "auto", opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="col-span-full border-t border-dashed border-rose-border pt-3.5 pb-2.5 mt-2 space-y-3.5 text-xs text-rose-text"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {/* Role Description */}
                                    <div className="border-2 border-rose-border bg-rose-surface p-3.5 shadow-[4px_4px_0px_0px_var(--color-shadow)]">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-rose-love mb-1.5">
                                        Role &amp; Scope
                                      </p>
                                      <p className="font-semibold text-rose-muted leading-relaxed">
                                        {emp.role_description || "No specific role details extracted for this contact."}
                                      </p>
                                    </div>

                                    {/* Profile Insights */}
                                    <div className="border-2 border-rose-border bg-rose-surface p-3.5 shadow-[4px_4px_0px_0px_var(--color-shadow)]">
                                      <p className="text-[9px] font-black uppercase tracking-widest text-rose-pine mb-1.5">
                                        Outreach Insights &amp; Hooks
                                      </p>
                                      <p className="font-semibold text-rose-muted leading-relaxed">
                                        {emp.profile_insights || "No personalized outreach insights generated for this role."}
                                      </p>
                                      {emp.profile_insights && (
                                        <button
                                          onClick={() => {
                                            navigator.clipboard.writeText(emp.profile_insights || "");
                                            toast.success("Outreach hook copied to clipboard!");
                                          }}
                                          className="mt-2.5 flex items-center gap-1 text-[10px] font-black text-rose-pine hover:underline uppercase tracking-wider"
                                        >
                                          Copy Hook
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Research Modal ── */}
      <ResearchModal
        isOpen={isResearchModalOpen}
        onClose={() => setIsResearchModalOpen(false)}
        companyName={companyName}
        setCompanyName={setCompanyName}
        jobTitles={jobTitles}
        setJobTitles={setJobTitles}
        user={user}
        isCreating={isCreating}
        onSubmit={handleResearch}
      />

      {/* ── Import Modal ── */}
      <ResearchImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        selectedCount={selectedEmployeeIds.size}
        totalCount={selected?.employees.length ?? 0}
        companyName={selected?.company_name || ""}
        campaigns={campaigns}
        selectedCampaignId={selectedCampaignId}
        setSelectedCampaignId={setSelectedCampaignId}
        isImporting={isImporting}
        onSubmit={handleImport}
      />
      {modal}
    </motion.div>
  );
}
