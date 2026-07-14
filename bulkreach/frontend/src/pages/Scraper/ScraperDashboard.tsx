import { useState, useEffect } from "react";
import {
  Search,
  Zap,
  Clock,
  Download,
  FileSpreadsheet,
  X,
  Loader2,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Target,
  Plus,
  Settings,
  Briefcase,
  Edit,
  SlidersHorizontal,
  User,
  Trash,
  Linkedin,
  MapPin,
  Users,
  DollarSign,
  Sparkles,
  Mail,
} from "lucide-react";
import { API_BASE_URL } from "@/utils/constants";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { formatDate } from "@/utils/helpers";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { useConfirm } from "@/components/ui/dialogs";

import {
  useGetScrapeJobsQuery,
  useCreateScrapeJobMutation,
  useGetScrapeJobResultsQuery,
  useImportScrapedContactsMutation,
  useCancelScrapeJobMutation,
  useRetryScrapeJobMutation,
  useDeleteScrapeJobMutation,
  useClearScrapeJobsMutation,
  useUpdateScrapedContactMutation,
  useExtractRecruiterDetailsMutation,
  useBulkDeleteScrapedContactsMutation,
  useGetCompanyEnrichmentsQuery,
} from "@/api/scraperApi";
import { useGetCampaignsQuery } from "@/api/campaignApi";
import { useGetResumesQuery } from "@/api/resumeApi";
import { useCreateJobApplicationMutation, useGetJobApplicationsQuery } from "@/api/applicationApi";
import { useAuth } from "@/hooks/useAuth";
import { PlatformIcon } from "@/components/scraper/PlatformIcon";
import { SearchModal } from "@/components/scraper/SearchModal";
import { SettingsModal } from "@/components/scraper/SettingsModal";
import { ImportModal } from "@/components/scraper/ImportModal";
import { FallbackConfirmationModal } from "@/components/scraper/FallbackConfirmationModal";
import { ResearchTabs } from "@/components/scraper/ResearchTabs";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 16 } }
};



const PLATFORM_CONFIGS: Record<string, { label: string, color: string, bgClass: string, textClass: string, borderClass: string }> = {
  linkedin: { label: "LinkedIn", color: "bg-rose-pine", bgClass: "bg-rose-pine/10", textClass: "text-rose-pine", borderClass: "border-rose-pine/35" },
  naukri: { label: "Naukri", color: "bg-rose-gold", bgClass: "bg-rose-gold/10", textClass: "text-rose-gold", borderClass: "border-rose-gold/35" },
  indeed: { label: "Indeed", color: "bg-rose-rose", bgClass: "bg-rose-rose/10", textClass: "text-rose-rose", borderClass: "border-rose-rose/35" },
  web: { label: "Web Search", color: "bg-rose-iris", bgClass: "bg-rose-iris/10", textClass: "text-rose-iris", borderClass: "border-rose-iris/35" },
  glassdoor: { label: "Glassdoor", color: "bg-rose-love", bgClass: "bg-rose-love/10", textClass: "text-rose-love", borderClass: "border-rose-love/35" },
  wellfound: { label: "Wellfound", color: "bg-rose-foam", bgClass: "bg-rose-foam/10", textClass: "text-rose-foam", borderClass: "border-rose-foam/35" },
  foundit: { label: "Foundit", color: "bg-rose-pine", bgClass: "bg-rose-pine/10", textClass: "text-rose-pine", borderClass: "border-rose-pine/35" },
  dice: { label: "Dice", color: "bg-rose-gold", bgClass: "bg-rose-gold/10", textClass: "text-rose-gold", borderClass: "border-rose-gold/35" },
};

function getPlatformConfig(platform: string) {
  const key = (platform || "").toLowerCase();
  return PLATFORM_CONFIGS[key] || {
    label: platform,
    color: "bg-rose-rose",
    bgClass: "bg-rose-rose/10",
    textClass: "text-rose-rose",
    borderClass: "border-rose-rose/35",
  };
}

function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined) return "";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `${minutes}m`;
  return `${minutes}m ${remainingSeconds}s`;
}

export function ScraperDashboard() {
  const { confirm, modal } = useConfirm();
  const [selectedJobId, setSelectedJobId] = useState<number | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Replaced refs with state for framer-motion modals
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // New results filtering state variables
  const [hasEmailFilter, setHasEmailFilter] = useState(false);
  const [hasRecruiterFilter, setHasRecruiterFilter] = useState(false);
  const [locationFilter, setLocationFilter] = useState("");
  const [salaryFilter, setSalaryFilter] = useState("");
  const [sortBy, setSortBy] = useState("-id");
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  const { data: resumes = [] } = useGetResumesQuery();
  const { user } = useAuth();

  const [scrapeJobsPollingInterval, setScrapeJobsPollingInterval] = useState(0);
  const { data: jobs = [] } = useGetScrapeJobsQuery(undefined, {
    pollingInterval: scrapeJobsPollingInterval,
  });

  useEffect(() => {
    const hasActiveJob = jobs.some(
      (j) => j.status === "pending" || j.status === "running"
    );
    setScrapeJobsPollingInterval(hasActiveJob ? 3000 : 0);
  }, [jobs]);

  const selectedJob = jobs.find((j) => j.id === selectedJobId);
  const isSelectedJobRunning =
    selectedJob?.status === "pending" || selectedJob?.status === "running";

  // Poll results table live while the selected job is running
  const { data: resultsData, isFetching: isResultsLoading, refetch: refetchResults } = useGetScrapeJobResultsQuery(
    {
      id: selectedJobId!,
      page: currentPage,
      page_size: pageSize,
      search: debouncedSearchQuery,
      has_email: hasEmailFilter || undefined,
      has_recruiter: hasRecruiterFilter || undefined,
      location: locationFilter.trim() || undefined,
      salary: salaryFilter.trim() || undefined,
      ordering: sortBy || undefined,
    },
    {
      skip: !selectedJobId,
      pollingInterval: isSelectedJobRunning ? 3000 : 0,
    }
  );

  // Guarantee final results are fetched immediately when a job finishes
  useEffect(() => {
    if (selectedJob?.status === "done" || selectedJob?.status === "failed") {
      const timer = setTimeout(() => {
        refetchResults();
      }, 500); // Small delay to ensure backend has completely committed results
      return () => clearTimeout(timer);
    }
  }, [selectedJob?.status, refetchResults]);

  const [createScrapeJob, { isLoading: isStartingScrape }] = useCreateScrapeJobMutation();
  const [importContacts, { isLoading: isImporting }] = useImportScrapedContactsMutation();
  const [cancelScrapeJob, { isLoading: isCanceling }] = useCancelScrapeJobMutation();
  const [retryScrapeJob, { isLoading: isRetrying }] = useRetryScrapeJobMutation();
  const [deleteScrapeJob] = useDeleteScrapeJobMutation();
  const [clearScrapeJobs] = useClearScrapeJobsMutation();
  const [updateScrapedContact] = useUpdateScrapedContactMutation();
  const [extractRecruiterDetails] = useExtractRecruiterDetailsMutation();

  const { data: jobApplications = [] } = useGetJobApplicationsQuery();
  const [createJobApplication] = useCreateJobApplicationMutation();
  const [isTrackingId, setIsTrackingId] = useState<number | null>(null);
  const [bulkDeleteScrapedContacts, { isLoading: isDeletingContacts }] = useBulkDeleteScrapedContactsMutation();
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);

  // Company Research employees — used as fallback HR contacts when recruiter not found
  const { data: companyEnrichments = [] } = useGetCompanyEnrichmentsQuery();



  const handleTrackJob = async (c: any) => {
    setIsTrackingId(c.id);
    try {
      await createJobApplication({
        company_name: c.company || "Unknown",
        job_title: c.job_title || "Position",
        stage: "saved",
        contact_name: c.name || "Hiring Manager",
        contact_email: c.email || "",
        job_url: c.source_url || "",
        linkedin_url: c.linkedin_url || "",
      }).unwrap();
      toast.success(`Added ${c.company || "job"} to tracker!`);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to add job to tracker.");
    } finally {
      setIsTrackingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedContactIds.length === 0) return;
    const ok = await confirm({
      title: "Delete Selected Postings",
      message: `Are you sure you want to delete the ${selectedContactIds.length} selected job postings?`,
      confirmLabel: "Delete",
    });
    if (!ok) return;

    try {
      await bulkDeleteScrapedContacts(selectedContactIds).unwrap();
      toast.success("Selected items deleted.");
      setSelectedContactIds([]);
    } catch (err: any) {
      console.error(err);
      toast.error(err?.data?.message || "Failed to delete selected items.");
    }
  };

  const [activeTab, setActiveTab] = useState<"contacts" | "recruiter">("contacts");
  const [editingContactId, setEditingContactId] = useState<number | null>(null);
  const [editContactName, setEditContactName] = useState("");
  const [editContactEmail, setEditContactEmail] = useState("");
  const [editContactLinkedin, setEditContactLinkedin] = useState("");
  const [extractingContactId, setExtractingContactId] = useState<number | null>(null);
  const [fallbackConfirmation, setFallbackConfirmation] = useState<{ id: number; companyName: string } | null>(null);
  const [isBulkExtracting, setIsBulkExtracting] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);

  useEffect(() => {
    setSelectedContactIds([]);
    setHasEmailFilter(false);
    setHasRecruiterFilter(false);
    setLocationFilter("");
    setSalaryFilter("");
  }, [selectedJobId, activeTab]);

  const handleSaveContact = async (contactId: number) => {
    if (!editContactName.trim()) {
      toast.error("Name is required.");
      return;
    }
    try {
      await updateScrapedContact({
        id: contactId,
        name: editContactName.trim(),
        email: editContactEmail.trim(),
        linkedin_url: editContactLinkedin.trim(),
      }).unwrap();
      toast.success("Contact updated!");
      setEditingContactId(null);
      refetchResults();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to update contact.");
    }
  };

  const handleExtractRecruiter = async (contactId: number, isFallback = false) => {
    setExtractingContactId(contactId);
    try {
      const res = await extractRecruiterDetails({ id: contactId, fallback: isFallback }).unwrap();

      if (res.found) {
        toast.success(`Recruiter details extracted: ${res.name}`);
      } else if (res.requires_fallback) {
        const contactObj = resultsData?.contacts.find(c => c.id === contactId);
        const companyName = contactObj?.company || "the company";

        setFallbackConfirmation({ id: contactId, companyName });
      } else {
        if (res.used_fallback) {
          toast.error("No recruiter or HR details could be found on LinkedIn for this company.");
        } else {
          toast.error("AI scan complete, but no specific recruiter details were found in the job description.");
        }
      }
      refetchResults();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.data?.error || err?.message || "Failed to run AI scan.");
    } finally {
      setExtractingContactId(null);
    }
  };

  const handleBulkExtractRecruiters = async () => {
    if (!resultsData || resultsData.contacts.length === 0) return;

    // Filter contacts that need extraction
    const targets = resultsData.contacts.filter(c => !c.name || c.name === "Hiring Manager" || !c.email);
    if (targets.length === 0) {
      toast.success("All postings already have recruiter details extracted!");
      return;
    }

    setIsBulkExtracting(true);
    setBulkProgress(0);

    let successCount = 0;
    let rateLimited = false;

    for (let i = 0; i < targets.length; i++) {
      const contact = targets[i];
      setBulkProgress(i + 1);

      // Delay to prevent hitting Gemini API 15 RPM limit
      if (i > 0) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      try {
        const res = await extractRecruiterDetails({ id: contact.id }).unwrap();
        if (res.found) {
          successCount++;
        } else if (res.requires_fallback) {
          // Auto-run LinkedIn fallback search in bulk mode
          await new Promise(resolve => setTimeout(resolve, 1500));
          const fallbackRes = await extractRecruiterDetails({ id: contact.id, fallback: true }).unwrap();
          if (fallbackRes.found) {
            successCount++;
          }
        }
      } catch (err: any) {
        console.error(`Failed to extract recruiter for contact ${contact.id}:`, err);
        const errMsg = err?.data?.error || err?.data?.message || err?.message || "Unknown error";

        // Check for rate limit / invalid key error status codes
        if (err?.status === 429 || errMsg.toLowerCase().includes("quota") || errMsg.toLowerCase().includes("exhausted") || errMsg.toLowerCase().includes("rate limit")) {
          toast.error(`Rate limit reached: ${errMsg}. Stopping scan.`);
          rateLimited = true;
          break;
        } else if (err?.status === 400 || errMsg.toLowerCase().includes("api key") || errMsg.toLowerCase().includes("invalid")) {
          toast.error(`API key error: ${errMsg}. Stopping scan.`);
          rateLimited = true;
          break;
        } else {
          toast.error(`Error scanning posting ${i + 1}: ${errMsg}`);
        }
      }
    }

    if (!rateLimited) {
      toast.success(`AI scan complete! Extracted details for ${successCount} out of ${targets.length} postings.`);
    }
    setIsBulkExtracting(false);
    setBulkProgress(0);
  };

  const { data: campaigns = [] } = useGetCampaignsQuery();

  const handleScrape = async (params: {
    platform: string;
    keywords: string;
    location: string;
    maxResults: number;
    campaignId: number;
    useAiMatching: boolean;
    freshness?: string;
    companySize?: string;
  }) => {
    try {
      const res = await createScrapeJob({
        platform: params.platform,
        keywords: params.keywords,
        location: params.location,
        max_results: params.maxResults,
        campaign_id: params.campaignId,
        use_ai_matching: params.useAiMatching,
        freshness: params.freshness,
        company_size: params.companySize,
      }).unwrap();
      toast.success("Scrape job started! Progress will be polled automatically.");
      setSelectedJobId(res.id);
      setCurrentPage(1);
      setIsSearchModalOpen(false);
    } catch (err: any) {
      const errMsg = err?.data?.message || err?.message || "Failed to start scrape job.";
      toast.error(errMsg);
      throw err;
    }
  };

  const handleCancelScrape = async (jobId: number) => {
    try {
      await cancelScrapeJob(jobId).unwrap();
      toast.success("Scrape job stopped.");
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to stop scrape job.");
    }
  };

  const handleRetryScrape = async (jobId: number) => {
    try {
      await retryScrapeJob(jobId).unwrap();
      toast.success("Scrape job restarted successfully.");
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to retry scrape job.");
    }
  };

  const handleDeleteJob = async (jobId: number) => {
    const ok = await confirm({
      title: "Delete Search Job",
      message: "Are you sure you want to delete this scrape job? This will delete all its scraped contacts. This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteScrapeJob(jobId).unwrap();
      toast.success("Scrape job deleted.");
      if (selectedJobId === jobId) {
        setSelectedJobId(null);
      }
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to delete scrape job.");
    }
  };

  const handleClearHistory = async () => {
    const ok = await confirm({
      title: "Clear Search History",
      message: "Are you sure you want to clear all scrape jobs? This will permanently delete all search history and contacts.",
      confirmLabel: "Clear All",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await clearScrapeJobs().unwrap();
      toast.success("Scraper search history cleared.");
      setSelectedJobId(null);
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to clear search history.");
    }
  };

  const handleExportCSV = async (jobId: number, jobPlatform: string) => {
    try {
      const token = localStorage.getItem("bulkreach_access");
      const res = await fetch(`${API_BASE_URL}/scraper/jobs/${jobId}/export/`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Failed to export CSV");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `bulkreach_scrape_${jobId}_${jobPlatform}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      toast.success("CSV export downloaded successfully.");
    } catch (error) {
      toast.error("Failed to export CSV.");
    }
  };

  const handleImportClick = () => {
    if (campaigns.length === 0) {
      toast.error("Please create a campaign first before importing.");
      return;
    }
    setSelectedCampaignId(campaigns[0].id.toString());
    setIsImportModalOpen(true);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId || !selectedCampaignId) return;

    try {
      const res = await importContacts({
        id: selectedJobId,
        campaign_id: Number(selectedCampaignId),
      }).unwrap();
      toast.success(res.message || "Contacts imported successfully!");
      setIsImportModalOpen(false);
    } catch (err: any) {
      const errMsg = err?.data?.message || err?.message || "Failed to import contacts.";
      toast.error(errMsg);
    }
  };

  const totalPages = resultsData ? Math.ceil(resultsData.count / pageSize) : 0;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 pb-12"
    >
      <ResearchTabs />
      {/* Header */}
      <motion.div variants={itemVariants} className="card relative overflow-hidden grid-bg border-2 border-rose-border p-6 shadow-[4px_4px_0px_0px_var(--color-shadow)]">
        <span className="absolute top-0 left-0 bottom-0 w-[5px] bg-gradient-to-b from-rose-pine via-rose-iris to-rose-foam" />
        <div className="absolute inset-0 bg-gradient-to-r from-rose-surface via-rose-surface/97 to-rose-surface/85 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 pl-3">
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <h1 className="text-3xl font-black text-rose-text tracking-tight uppercase flex items-center gap-2">
                <Target size={26} className="text-rose-love stroke-[2.5]" />
                Job Scraper
              </h1>
              <span className="inline-flex items-center justify-center px-2.5 py-1 text-[10px] font-black tracking-widest uppercase bg-rose-love/15 text-rose-love border-2 border-rose-border rounded-none shadow-[2px_2px_0px_0px_var(--color-shadow)]">
                Beta
              </span>
            </div>
            <p className="text-rose-muted text-xs font-bold leading-relaxed max-w-xl">
              Auto-discover job listings from LinkedIn, Naukri &amp; more · Run AI scans to extract recruiter contacts · Push directly to outreach campaigns.
            </p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0">
            <span className="inline-flex items-center gap-2 px-3.5 py-2 text-[10px] font-black uppercase tracking-wider bg-rose-foam/10 text-rose-foam border-2 border-rose-foam/40 shadow-[2px_2px_0px_0px_var(--color-shadow)]">
              <span className="w-2 h-2 bg-rose-foam animate-pulse" />
              AI Engine Active
            </span>
            <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-rose-muted">
              <span className="text-rose-text font-black">{jobs.length}</span> searches
              <span className="text-rose-hl-med">·</span>
              <span className="text-rose-text font-black">{jobs.reduce((a, j) => a + j.result_count, 0)}</span> profiles found
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6 items-start">
        {/* Left Column: History Sidebar */}
        <motion.div variants={itemVariants} className="flex flex-col gap-4">
          <div className="flex gap-2.5">
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="btn-primary flex-1 justify-center py-3.5 shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150 group text-xs uppercase tracking-wider font-black"
            >
              <Plus size={16} className="group-hover:rotate-90 transition-transform duration-200" />
              New Search
            </button>
            <button
              onClick={() => setIsSettingsModalOpen(true)}
              className="btn-secondary py-3.5 px-4 relative group shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150"
              title="AI & Resume Settings"
            >
              <Settings size={18} className="text-rose-muted group-hover:text-rose-text group-hover:rotate-45 transition-transform duration-200" />
              {(!user?.has_gemini_api_key || resumes.length === 0) && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-love border-2 border-rose-border" />
              )}
            </button>
          </div>

          {/* Jobs list */}
          <div className="card p-0 overflow-hidden flex flex-col max-h-[calc(100vh-250px)] min-h-[500px] shadow-[4px_4px_0px_0px_var(--color-shadow)]">
            <div className="px-4 py-3 flex items-center justify-between bg-rose-overlay border-b-2 border-rose-border shrink-0">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-rose-pine stroke-[2.5]" />
                <h2 className="text-[11px] font-black text-rose-text uppercase tracking-wider">Search History</h2>
              </div>
              {jobs.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  className="text-[10px] font-black text-rose-muted hover:text-rose-love uppercase tracking-wider transition-colors flex items-center gap-1"
                  title="Clear all search history"
                >
                  <Trash size={12} className="stroke-[2]" />
                  Clear All
                </button>
              )}
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-thin bg-rose-base/20"
            >
              {jobs.length === 0 ? (
                <div className="py-16 px-4 text-center">
                  <div
                    className="w-12 h-12 rounded-none mx-auto flex items-center justify-center mb-4 border-2 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] bg-rose-overlay"
                  >
                    <Search size={18} className="text-rose-pine stroke-[2.5]" />
                  </div>
                  <p className="text-rose-text text-xs font-black uppercase tracking-wider">No history yet</p>
                  <p className="text-rose-muted text-[11px] mt-2 font-bold leading-relaxed max-w-[180px] mx-auto">Click "New Search" above to discover your first batch of candidates.</p>
                </div>
              ) : (
                jobs.map((job) => {
                  const isSelected = selectedJobId === job.id;
                  return (
                    <motion.div
                      layout
                      variants={itemVariants}
                      key={job.id}
                      className={`group flex flex-col gap-2 p-3.5 cursor-pointer border-2 transition-all duration-150 relative overflow-hidden ${
                        isSelected
                          ? "bg-rose-surface border-rose-border shadow-[3px_3px_0px_0px_var(--color-shadow)] -translate-x-[2px] -translate-y-[2px]"
                          : "bg-rose-surface/80 border-rose-hl-med hover:border-rose-border hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px]"
                      }`}
                      onClick={() => {
                        setSelectedJobId(job.id);
                        setCurrentPage(1);
                      }}
                    >
                      {/* Top colored border representing platform */}
                      <span className={`absolute top-0 left-0 right-0 h-[3px] ${getPlatformConfig(job.platform).color}`} />

                      {/* Top Header Row inside Card */}
                      <div className="flex items-center justify-between border-b border-rose-hl-low pb-2 mb-1 mt-0.5">
                        <span className={`inline-flex items-center gap-1 text-[8px] font-black px-1.5 py-0.5 border uppercase tracking-wider ${
                          (() => {
                            const cfg = getPlatformConfig(job.platform);
                            return `${cfg.bgClass} ${cfg.textClass} ${cfg.borderClass}`;
                          })()
                        }`}>
                          <PlatformIcon platform={job.platform} className="w-3 h-3 stroke-[2.5]" />
                          {job.platform}
                        </span>

                        <div className="flex items-center gap-1">
                          <StatusBadge status={job.status} />
                          {/* Hover trash button inside group */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteJob(job.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-rose-surface border border-rose-hl-high hover:border-rose-love text-rose-muted hover:text-rose-love p-1 shadow-[1px_1px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none"
                            title="Delete Search"
                          >
                            <Trash size={10} className="stroke-[2.5]" />
                          </button>
                        </div>
                      </div>

                      {/* Main card info */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-black text-rose-text tracking-tight truncate leading-snug" title={job.keywords}>
                          {job.keywords || "Profile Match Search"}
                        </h4>

                        <div className="flex flex-wrap items-center gap-1.5 text-[9px] font-bold text-rose-muted">
                          {job.location && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} className="stroke-[2.5]" /> {job.location}
                            </span>
                          )}
                          {job.use_ai_matching && (
                            <span className="text-rose-love font-black uppercase tracking-wider text-[8px] flex items-center gap-1 bg-rose-love/5 px-1 border border-rose-love/15">
                              <Sparkles size={8} className="stroke-[2.5]" /> AI filter
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Footer Row inside Card */}
                      <div className="flex items-center justify-between text-[10px] text-rose-muted font-bold pt-2 border-t border-rose-hl-low mt-1.5">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-none ${job.result_count > 0 ? "bg-rose-foam animate-pulse" : "bg-rose-hl-med"}`} />
                          <span className="text-rose-text font-black">{job.result_count}</span> profiles
                        </span>
                        <div className="flex flex-col items-end gap-0.5 text-right font-bold text-[9px] uppercase tracking-wide text-rose-muted/80 leading-normal">
                          <span>{formatDate(job.created_at)}</span>
                          {job.duration !== undefined && job.duration !== null && (
                            <span className="text-rose-pine/80 font-mono tracking-tight lowercase flex items-center gap-0.5 justify-end">
                              <Clock size={9} className="stroke-[2.5]" /> {formatDuration(job.duration)}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          </div>
        </motion.div>

        {/* Right Column: Results view */}
        <div className="flex flex-col space-y-6">
          <AnimatePresence mode="wait">
            {!selectedJobId ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center justify-center p-12 text-center h-[calc(100vh-250px)] min-h-[500px] card bg-rose-surface grid-bg noise-bg relative overflow-hidden shadow-[4px_4px_0px_0px_var(--color-shadow)]"
              >
                <div className="absolute inset-0 bg-gradient-to-tr from-rose-surface via-rose-surface/80 to-transparent" />
                <div className="relative z-10 max-w-sm flex flex-col items-center">
                  <div
                    className="w-16 h-16 rounded-none flex items-center justify-center mb-6 border-2 border-rose-border bg-rose-base shadow-[4px_4px_0px_0px_var(--color-shadow)] rotate-3 hover:rotate-0 transition-transform duration-300"
                  >
                    <Target size={28} className="text-rose-pine stroke-[2.5]" />
                  </div>
                  <h3 className="text-xl font-black text-rose-text uppercase tracking-tight">Ready to Discover</h3>
                  <p className="text-xs text-rose-muted mt-3 font-semibold leading-relaxed">
                    Select a past job search from your history on the left to inspect discovered targets, or launch a new scrape job with AI filtering to extract high-value contacts.
                  </p>
                  <button
                    onClick={() => setIsSearchModalOpen(true)}
                    className="btn-primary mt-6 px-6 py-2.5 text-xs font-black uppercase tracking-wider shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:shadow-[5px_5px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all duration-200"
                  >
                    <Plus size={14} className="stroke-[3]" /> Launch Discovery Search
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={`results-${selectedJobId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* Live Scrape Status Banner */}
                <AnimatePresence>
                  {isSelectedJobRunning && (
                    <motion.div
                      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                      animate={{ opacity: 1, height: "auto", marginBottom: 16 }}
                      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                      className="rounded-none p-5 border-2 border-rose-border bg-rose-surface flex items-center justify-between overflow-hidden relative shadow-[4px_4px_0px_0px_var(--color-shadow)]"
                    >
                      <div className="absolute top-0 left-0 w-[4px] h-full bg-rose-pine animate-pulse" />
                      <div className="flex items-center gap-4 pl-2">
                        <div className="w-10 h-10 rounded-none bg-rose-overlay border-2 border-rose-border flex items-center justify-center animate-pulse">
                          <Loader2 className="animate-spin text-rose-pine" size={18} />
                        </div>
                        <div>
                          <p className="text-sm font-extrabold text-rose-text tracking-tight uppercase">Scraping in progress...</p>
                          <p className="text-xs text-rose-muted mt-1 font-semibold">
                            Discovering profiles from{" "}
                            <span className="text-rose-love font-extrabold capitalize">
                              {selectedJob?.platform}
                            </span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-right">
                        <div>
                          <p className="text-[10px] text-rose-muted font-bold uppercase tracking-wider mb-0.5">Found so far</p>
                          <span className="text-lg font-mono font-extrabold text-rose-pine animate-pulse">
                            {resultsData?.count || 0}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCancelScrape(selectedJobId!)}
                          disabled={isCanceling}
                          className="btn-secondary border-rose-love text-rose-love hover:bg-rose-love/15 py-1.5 px-3 text-xs flex items-center gap-1 transition-colors"
                        >
                          {isCanceling ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
                          Stop
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Selected Job Header actions */}
                <div className="card p-5 relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[4px_4px_0px_0px_var(--color-shadow)]">
                  <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-pine via-rose-iris to-rose-foam" />
                  <div>
                    <h2 className="text-lg font-black text-rose-text uppercase flex items-center gap-2.5 tracking-tight pl-1.5">
                      <span className={`inline-flex items-center justify-center shrink-0 p-1.5 border border-rose-border ${
                        (() => {
                          const cfg = getPlatformConfig(selectedJob?.platform || "");
                          return `${cfg.bgClass} ${cfg.textClass}`;
                        })()
                      }`}>
                        {selectedJob?.platform ? (
                          <PlatformIcon platform={selectedJob.platform} className="w-4 h-4" />
                        ) : (
                          <Briefcase className="w-4 h-4" />
                        )}
                      </span>
                      <span>{selectedJob?.platform || "Platform"} Search Results</span>
                      <span className="text-[9px] font-mono font-black bg-rose-overlay px-2 py-0.5 rounded-none text-rose-muted border border-rose-hl-med">
                        ID: #{selectedJobId}
                      </span>
                    </h2>
                    
                    <div className="flex flex-wrap items-center gap-2 mt-3 pl-1.5">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 bg-rose-overlay border border-rose-hl-med text-rose-text uppercase tracking-wide">
                        <Search size={10} className="stroke-[2.5]" /> Query: {selectedJob?.keywords || "Auto Matching"}
                      </span>
                      {selectedJob?.location && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 bg-rose-overlay border border-rose-hl-med text-rose-text uppercase tracking-wide">
                          <MapPin size={10} className="stroke-[2.5]" /> Loc: {selectedJob.location}
                        </span>
                      )}
                      {selectedJob?.use_ai_matching !== undefined && (
                        <span className={`inline-flex items-center text-[9px] font-black px-2 py-1 border uppercase tracking-wide ${
                          selectedJob.use_ai_matching 
                            ? 'bg-rose-love/10 text-rose-love border-rose-love/30' 
                            : 'bg-rose-overlay text-rose-muted border-rose-hl-low'
                        }`}>
                          AI Filter: {selectedJob.use_ai_matching ? 'Active' : 'Off'}
                        </span>
                      )}
                      {selectedJob?.freshness && selectedJob.freshness !== "any" && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 bg-rose-overlay border border-rose-hl-med text-rose-text uppercase tracking-wide">
                          <Clock size={10} className="stroke-[2.5]" /> {selectedJob.freshness.replace('past_', 'Past ').replace('24h', '24 Hours')}
                        </span>
                      )}
                      {selectedJob?.duration !== undefined && selectedJob.duration !== null && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 bg-rose-overlay border border-rose-hl-med text-rose-text uppercase tracking-wide">
                          <Clock size={10} className="stroke-[2.5]" /> Duration: {formatDuration(selectedJob.duration)}
                        </span>
                      )}
                      {selectedJob?.company_size && selectedJob.company_size !== "any" && (
                        <span className="inline-flex items-center gap-1 text-[9px] font-black px-2 py-1 bg-rose-overlay border border-rose-hl-med text-rose-text uppercase tracking-wide">
                          <Users size={10} className="stroke-[2.5]" /> {selectedJob.company_size} emp
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    <button
                      id="export-csv-btn"
                      onClick={() => handleExportCSV(selectedJobId, selectedJob?.platform || "contacts")}
                      disabled={!resultsData || resultsData.count === 0}
                      className="btn-secondary text-xs py-2.5 px-4 shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none"
                    >
                      <Download size={14} className="stroke-[2.5]" /> Export CSV
                    </button>
                    <button
                      id="import-campaign-btn"
                      onClick={handleImportClick}
                      disabled={!resultsData || resultsData.count === 0 || isImporting}
                      className="btn-primary text-xs py-2.5 px-4 border border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none"
                    >
                      {isImporting ? (
                        <Loader2 className="animate-spin h-3.5 w-3.5" />
                      ) : (
                        <FileSpreadsheet size={14} className="stroke-[2.5]" />
                      )}
                      Add to Campaign
                    </button>
                  </div>
                </div>

                {/* Dashboard Stats Row */}
                {resultsData && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border-2 border-rose-border bg-rose-surface p-4 relative overflow-hidden shadow-[3px_3px_0px_0px_var(--color-shadow)] group hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all duration-150">
                      <span className="absolute top-0 left-0 bottom-0 w-[3px] bg-rose-iris" />
                      <Search size={16} className="absolute top-2.5 right-3 text-rose-iris opacity-15 group-hover:opacity-35 transition-opacity select-none" />
                      <div className="text-[8px] font-black uppercase text-rose-muted tracking-wider pl-1">Discovered</div>
                      <div className="text-3xl font-black text-rose-iris mt-0.5 font-mono pl-1">{resultsData.count}</div>
                      <div className="text-[8px] text-rose-muted font-bold pl-1 mt-0.5 uppercase tracking-wide">job postings</div>
                    </div>
                    <div className="border-2 border-rose-border bg-rose-surface p-4 relative overflow-hidden shadow-[3px_3px_0px_0px_var(--color-shadow)] group hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all duration-150">
                      <span className="absolute top-0 left-0 bottom-0 w-[3px] bg-rose-pine" />
                      <User size={16} className="absolute top-2.5 right-3 text-rose-pine opacity-15 group-hover:opacity-35 transition-opacity select-none" />
                      <div className="text-[8px] font-black uppercase text-rose-muted tracking-wider pl-1">Recruiters</div>
                      <div className="text-3xl font-black text-rose-pine mt-0.5 font-mono pl-1">
                         {resultsData.contacts.filter(c => c.name && c.name !== "Hiring Manager").length}
                      </div>
                      <div className="text-[8px] text-rose-muted font-bold pl-1 mt-0.5 uppercase tracking-wide">with direct contacts</div>
                    </div>
                    <div className="border-2 border-rose-border bg-rose-surface p-4 relative overflow-hidden shadow-[3px_3px_0px_0px_var(--color-shadow)] group hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all duration-150">
                      <span className="absolute top-0 left-0 bottom-0 w-[3px] bg-rose-foam" />
                      <Mail size={16} className="absolute top-2.5 right-3 text-rose-foam opacity-15 group-hover:opacity-35 transition-opacity select-none" />
                      <div className="text-[8px] font-black uppercase text-rose-muted tracking-wider pl-1">Emails</div>
                      <div className="text-3xl font-black text-rose-foam mt-0.5 font-mono pl-1">
                        {resultsData.contacts.filter(c => c.email && !c.email.startsWith("careers@") && !c.email.startsWith("hr@")).length}
                      </div>
                      <div className="text-[8px] text-rose-muted font-bold pl-1 mt-0.5 uppercase tracking-wide">direct addresses</div>
                    </div>
                    <div className="border-2 border-rose-border bg-rose-surface p-4 relative overflow-hidden shadow-[3px_3px_0px_0px_var(--color-shadow)] group hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] transition-all duration-150">
                      <span className="absolute top-0 left-0 bottom-0 w-[3px] bg-rose-gold" />
                      <Target size={16} className="absolute top-2.5 right-3 text-rose-gold opacity-15 group-hover:opacity-35 transition-opacity select-none" />
                      <div className="text-[8px] font-black uppercase text-rose-muted tracking-wider pl-1">Campaign</div>
                      <div className="text-sm font-black text-rose-gold mt-1.5 truncate pl-1" title={campaigns.find(c => c.id === selectedJob?.campaign_id)?.name || "Default Outbox"}>
                        {campaigns.find(c => c.id === selectedJob?.campaign_id)?.name || "Default Outbox"}
                      </div>
                      <div className="text-[8px] text-rose-muted font-bold pl-1 mt-0.5 uppercase tracking-wide">target campaign</div>
                    </div>
                  </div>
                )}

                {selectedJob?.error_message && (
                  <div className={`rounded-none p-4 border-2 text-xs font-semibold text-rose-text flex items-start justify-between gap-3 shadow-[3px_3px_0px_0px_var(--color-shadow)] ${selectedJob.status === "failed" ? "border-rose-love/50 bg-rose-love/15" : "border-rose-iris/50 bg-rose-iris/15"}`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-none flex items-center justify-center shrink-0 border-2 border-rose-border ${selectedJob.status === "failed" ? "bg-rose-surface text-rose-love font-extrabold" : "bg-rose-surface text-rose-iris font-extrabold"}`}>
                        {selectedJob.status === "failed" ? <X size={14} /> : <Zap size={14} />}
                      </div>
                      <div>
                        <p className="font-extrabold text-rose-text uppercase tracking-wider text-[10px]">
                          {selectedJob.status === "failed" ? "Scraping failed or returned no matches" : "Search fallback notice"}
                        </p>
                        <p className="text-rose-muted mt-1 font-semibold leading-relaxed">
                          {selectedJob.error_message}
                        </p>
                      </div>
                    </div>
                    {selectedJob.status === "failed" && (
                      <button
                        onClick={() => handleRetryScrape(selectedJob.id)}
                        disabled={isRetrying}
                        className="btn-primary text-[10px] py-1.5 px-3 flex items-center gap-1.5 uppercase tracking-wider border border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50 shrink-0 self-center"
                      >
                        {isRetrying ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <RefreshCw size={12} />
                        )}
                        Retry
                      </button>
                    )}
                  </div>
                )}

                <div className="flex gap-2 border-b-2 border-rose-border pb-0">
                  <button
                    onClick={() => setActiveTab("contacts")}
                    className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-wider border-2 border-b-0 relative z-10 translate-y-[2px] transition-all duration-150 flex items-center gap-2 ${
                      activeTab === "contacts"
                        ? "bg-rose-surface text-rose-pine border-rose-border shadow-[2px_-2px_0px_0px_var(--color-shadow)] font-black"
                        : "bg-rose-overlay/20 text-rose-muted border-transparent hover:text-rose-text hover:bg-rose-overlay/40"
                    }`}
                  >
                    <User size={13} className="stroke-[2.5]" />
                    Contacts List
                  </button>
                  <button
                    onClick={() => setActiveTab("recruiter")}
                    className={`px-5 py-2.5 text-[11px] font-black uppercase tracking-wider border-2 border-b-0 relative z-10 translate-y-[2px] transition-all duration-150 flex items-center gap-2 ${
                      activeTab === "recruiter"
                        ? "bg-rose-surface text-rose-pine border-rose-border shadow-[2px_-2px_0px_0px_var(--color-shadow)] font-black"
                        : "bg-rose-overlay/20 text-rose-muted border-transparent hover:text-rose-text hover:bg-rose-overlay/40"
                    }`}
                  >
                    <Briefcase size={13} className="stroke-[2.5]" />
                    Recruiter Job Posting
                  </button>
                </div>

                {/* Results Card */}
                <div className="card p-0 overflow-hidden flex flex-col shadow-[4px_4px_0px_0px_var(--color-shadow)]">
                  <div className="p-4 border-b-2 border-rose-border bg-rose-overlay/30 flex flex-col gap-3 justify-between">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
                      <div className="flex flex-1 items-center gap-2.5 max-w-xl">
                        <div className="relative flex-1">
                          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-muted stroke-[2.5]" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                              setSearchQuery(e.target.value);
                              setCurrentPage(1);
                            }}
                            placeholder={activeTab === "contacts" ? "Search candidates by name, company, or role..." : "Search job postings by title or company..."}
                            className="input pl-9 text-xs py-2.5 font-semibold bg-rose-surface"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                          className={`btn-secondary text-xs py-2.5 px-4 flex items-center gap-2 border-2 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none ${
                            isFilterPanelOpen || hasEmailFilter || hasRecruiterFilter || locationFilter || salaryFilter || sortBy !== "-id"
                              ? "bg-rose-overlay text-rose-text"
                              : ""
                          }`}
                          title="Toggle Filters Panel"
                        >
                          <SlidersHorizontal size={14} />
                          Filters
                          {(hasEmailFilter || hasRecruiterFilter || locationFilter || salaryFilter || sortBy !== "-id") && (
                            <span className="w-2 h-2 bg-rose-love border border-rose-border animate-pulse" />
                          )}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {selectedContactIds.length > 0 && (
                          <button
                            onClick={handleBulkDelete}
                            disabled={isDeletingContacts}
                            className="btn-danger text-xs py-2 px-3.5 flex items-center gap-1.5 uppercase tracking-wider shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50"
                          >
                            {isDeletingContacts ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Trash size={14} className="stroke-[2.5]" />
                            )}
                            Delete ({selectedContactIds.length})
                          </button>
                        )}

                        {activeTab === "recruiter" && resultsData && resultsData.contacts.length > 0 && (
                          <button
                            onClick={handleBulkExtractRecruiters}
                            disabled={isBulkExtracting}
                            className="btn-primary text-xs py-2 px-4 flex items-center gap-1.5 uppercase tracking-wider border border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none disabled:opacity-50"
                          >
                            {isBulkExtracting ? (
                              <>
                                <Loader2 className="animate-spin" size={14} />
                                Scanning {bulkProgress} / {resultsData.contacts.length}...
                              </>
                            ) : (
                              <>
                                <Zap size={14} className="fill-white" />
                                AI Scan All
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Active Filter Chips */}
                    {(hasEmailFilter || hasRecruiterFilter || locationFilter || salaryFilter || sortBy !== "-id") && (
                      <div className="flex flex-wrap items-center gap-2 pt-2.5 border-t border-rose-hl-low">
                        <span className="text-[10px] font-black uppercase text-rose-muted tracking-wider mr-1">Active Filters:</span>
                        {hasEmailFilter && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-pine/15 text-rose-pine border border-rose-pine/35 px-2 py-0.5 rounded-none shadow-[1px_1px_0px_0px_var(--color-shadow)]">
                            <Mail size={10} className="stroke-[2.5]" /> Has Email
                            <button onClick={() => { setHasEmailFilter(false); setCurrentPage(1); }} className="hover:text-rose-love ml-0.5 transition-colors">
                              <X size={10} className="stroke-[3]" />
                            </button>
                          </span>
                        )}
                        {hasRecruiterFilter && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-iris/15 text-rose-iris border border-rose-iris/35 px-2 py-0.5 rounded-none shadow-[1px_1px_0px_0px_var(--color-shadow)]">
                            <Briefcase size={10} className="stroke-[2.5]" /> Has Recruiter
                            <button onClick={() => { setHasRecruiterFilter(false); setCurrentPage(1); }} className="hover:text-rose-love ml-0.5 transition-colors">
                              <X size={10} className="stroke-[3]" />
                            </button>
                          </span>
                        )}
                        {locationFilter && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-gold/15 text-rose-gold border border-rose-gold/35 px-2 py-0.5 rounded-none shadow-[1px_1px_0px_0px_var(--color-shadow)]">
                            <MapPin size={10} className="stroke-[2.5]" /> Loc: {locationFilter}
                            <button onClick={() => { setLocationFilter(""); setCurrentPage(1); }} className="hover:text-rose-love ml-0.5 transition-colors">
                              <X size={10} className="stroke-[3]" />
                            </button>
                          </span>
                        )}
                        {salaryFilter && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-rose/15 text-rose-rose border border-rose-rose/35 px-2 py-0.5 rounded-none shadow-[1px_1px_0px_0px_var(--color-shadow)]">
                            <DollarSign size={10} className="stroke-[2.5]" /> Salary: {salaryFilter}
                            <button onClick={() => { setSalaryFilter(""); setCurrentPage(1); }} className="hover:text-rose-love ml-0.5 transition-colors">
                              <X size={10} className="stroke-[3]" />
                            </button>
                          </span>
                        )}
                        {sortBy !== "-id" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-foam/15 text-rose-pine border border-rose-pine/35 px-2 py-0.5 rounded-none shadow-[1px_1px_0px_0px_var(--color-shadow)]">
                            Sort: {
                              sortBy === "id" ? "Scraped Date (Oldest)" :
                              sortBy === "-posted_date" ? "Date Posted (Newest)" :
                              sortBy === "posted_date" ? "Date Posted (Oldest)" :
                              sortBy === "name" ? "Name (A-Z)" :
                              sortBy === "-name" ? "Name (Z-A)" : "Custom"
                            }
                            <button onClick={() => { setSortBy("-id"); setCurrentPage(1); }} className="hover:text-rose-love ml-0.5 transition-colors">
                              <X size={10} className="stroke-[3]" />
                            </button>
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Expandable Filter Panel */}
                  <AnimatePresence>
                    {isFilterPanelOpen && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden border-b-2 border-rose-border bg-rose-surface"
                      >
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end border-t border-rose-hl-low">
                          {/* Has Email Filter */}
                          <div className="flex flex-col gap-1.5 w-full">
                            <span className="text-[10px] font-black uppercase text-rose-muted tracking-wider">
                              Email Status
                            </span>
                            <div className="flex items-center gap-2.5 h-[38px] px-3.5 bg-rose-base/15 border-2 border-rose-border rounded-none shadow-[2px_2px_0px_0px_var(--color-shadow)] w-full">
                              <input
                                id="filter-has-email"
                                type="checkbox"
                                checked={hasEmailFilter}
                                onChange={(e) => {
                                  setHasEmailFilter(e.target.checked);
                                  setCurrentPage(1);
                                }}
                                className="rounded-none border-2 border-rose-border text-rose-pine focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                              />
                              <label htmlFor="filter-has-email" className="text-xs font-black text-rose-text cursor-pointer select-none">
                                Has Email
                              </label>
                            </div>
                          </div>

                          {/* Has Recruiter Filter */}
                          <div className="flex flex-col gap-1.5 w-full">
                            <span className="text-[10px] font-black uppercase text-rose-muted tracking-wider">
                              Recruiter Status
                            </span>
                            <div className="flex items-center gap-2.5 h-[38px] px-3.5 bg-rose-base/15 border-2 border-rose-border rounded-none shadow-[2px_2px_0px_0px_var(--color-shadow)] w-full">
                              <input
                                id="filter-has-recruiter"
                                type="checkbox"
                                checked={hasRecruiterFilter}
                                onChange={(e) => {
                                  setHasRecruiterFilter(e.target.checked);
                                  setCurrentPage(1);
                                }}
                                className="rounded-none border-2 border-rose-border text-rose-pine focus:ring-0 focus:ring-offset-0 w-4 h-4 cursor-pointer"
                              />
                              <label htmlFor="filter-has-recruiter" className="text-xs font-black text-rose-text cursor-pointer select-none">
                                Has Recruiter Details
                              </label>
                            </div>
                          </div>

                          {/* Location Filter */}
                          <div className="flex flex-col gap-1.5 w-full">
                            <label htmlFor="filter-location" className="text-[10px] font-black uppercase text-rose-muted tracking-wider">
                              Filter Location
                            </label>
                            <input
                              id="filter-location"
                              type="text"
                              value={locationFilter}
                              onChange={(e) => {
                                setLocationFilter(e.target.value);
                                setCurrentPage(1);
                              }}
                              placeholder="e.g. Remote, Bangalore"
                              className="input text-xs py-2.5 px-3 font-semibold bg-rose-surface"
                            />
                          </div>

                          {/* Salary Filter */}
                          <div className="flex flex-col gap-1.5 w-full">
                            <label htmlFor="filter-salary" className="text-[10px] font-black uppercase text-rose-muted tracking-wider">
                              Filter Salary
                            </label>
                            <input
                              id="filter-salary"
                              type="text"
                              value={salaryFilter}
                              onChange={(e) => {
                                setSalaryFilter(e.target.value);
                                setCurrentPage(1);
                              }}
                              placeholder="e.g. 50k, 12 LPA"
                              className="input text-xs py-2.5 px-3 font-semibold bg-rose-surface"
                            />
                          </div>

                          {/* Sort By Filter */}
                          <div className="flex flex-col gap-1.5 w-full">
                            <label htmlFor="filter-sort-by" className="text-[10px] font-black uppercase text-rose-muted tracking-wider">
                              Sort Results By
                            </label>
                            <select
                              id="filter-sort-by"
                              value={sortBy}
                              onChange={(e) => {
                                setSortBy(e.target.value);
                                setCurrentPage(1);
                              }}
                              className="select text-xs py-2.5 px-3 font-semibold bg-rose-surface cursor-pointer border-2 border-rose-border focus:outline-none focus:border-rose-pine"
                            >
                              <option value="-id">Scraped Date (Newest)</option>
                              <option value="id">Scraped Date (Oldest)</option>
                              <option value="-posted_date">Date Posted (Newest)</option>
                              <option value="posted_date">Date Posted (Oldest)</option>
                              <option value="name">Candidate Name (A-Z)</option>
                              <option value="-name">Candidate Name (Z-A)</option>
                            </select>
                          </div>

                          {/* Reset Button */}
                          {(hasEmailFilter || hasRecruiterFilter || locationFilter || salaryFilter || sortBy !== "-id") && (
                            <div className="sm:col-span-2 md:col-span-5 flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setHasEmailFilter(false);
                                  setHasRecruiterFilter(false);
                                  setLocationFilter("");
                                  setSalaryFilter("");
                                  setSortBy("-id");
                                  setCurrentPage(1);
                                }}
                                className="text-xs font-black text-rose-love hover:underline uppercase tracking-wider transition-colors"
                              >
                                Clear All Filters & Sorting
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <AnimatePresence mode="wait">
                    {activeTab === "contacts" ? (
                      <motion.div
                        key="contacts-tab"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="overflow-x-auto min-h-[400px] relative"
                      >
                      {isResultsLoading && !resultsData && (
                        <div className="absolute inset-0 bg-rose-surface/50 backdrop-blur-none z-10 flex items-center justify-center">
                          <div className="bg-rose-surface p-4 rounded-none border-2 border-rose-border flex items-center gap-3 shadow-[4px_4px_0px_0px_var(--color-shadow)]">
                            <Loader2 className="animate-spin text-rose-pine" size={20} />
                            <span className="text-sm font-bold text-rose-text">Loading results...</span>
                          </div>
                        </div>
                      )}

                      {resultsData && resultsData.contacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 text-center">
                          <div className="w-12 h-12 rounded-none bg-rose-overlay border-2 border-rose-border flex items-center justify-center mb-4 text-rose-text">
                            <Target size={20} />
                          </div>
                          <p className="text-xs font-black text-rose-text uppercase tracking-wider">No matches found</p>
                          <p className="text-xs text-rose-muted font-bold mt-1.5">
                            {searchQuery ? "Try adjusting your search query or filters." : "Wait for the scraper to discover candidates."}
                          </p>
                        </div>
                      ) : (
                        resultsData && (
                          <table className="table">
                            <thead>
                              <tr className="bg-rose-overlay/40 border-b border-rose-border">
                                <th className="pl-6 w-12">
                                  <input
                                    type="checkbox"
                                    checked={
                                      resultsData.contacts.length > 0 &&
                                      resultsData.contacts.every((c) => selectedContactIds.includes(c.id))
                                    }
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        const allIds = resultsData.contacts.map((c) => c.id);
                                        setSelectedContactIds((prev) => Array.from(new Set([...prev, ...allIds])));
                                      } else {
                                        const pageIds = resultsData.contacts.map((c) => c.id);
                                        setSelectedContactIds((prev) => prev.filter((id) => !pageIds.includes(id)));
                                      }
                                    }}
                                  />
                                </th>
                                <th className="text-[10px] font-black uppercase text-rose-text tracking-wider">Candidate</th>
                                <th className="text-[10px] font-black uppercase text-rose-text tracking-wider">Company</th>
                                <th className="text-[10px] font-black uppercase text-rose-text tracking-wider">Role</th>
                                <th className="text-[10px] font-black uppercase text-rose-text tracking-wider">Posted</th>
                                <th className="text-right pr-6 text-[10px] font-black uppercase text-rose-text tracking-wider">Source</th>
                              </tr>
                            </thead>
                            <tbody>
                              {resultsData.contacts.map((c) => {
                                const isSelected = selectedContactIds.includes(c.id);
                                return (
                                  <tr key={c.id} className={`group border-b border-rose-hl-med transition-colors ${isSelected ? "bg-rose-overlay/40" : "hover:bg-rose-overlay/20"}`}>
                                    <td className="pl-6 py-4 w-12">
                                      <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={(e) => {
                                          if (e.target.checked) {
                                            setSelectedContactIds((prev) => [...prev, c.id]);
                                          } else {
                                            setSelectedContactIds((prev) => prev.filter((id) => id !== c.id));
                                          }
                                        }}
                                      />
                                    </td>
                                    <td className="py-4">
                                      <div className="font-extrabold text-rose-text tracking-tight">{c.name || "Anonymous Candidate"}</div>
                                      <div className="font-mono text-[10px] text-rose-muted mt-1 font-semibold flex items-center gap-1.5">
                                        {c.email ? (
                                          <>
                                            <span className="w-1.5 h-1.5 rounded-none bg-rose-foam animate-pulse" />
                                            {c.email}
                                          </>
                                        ) : (
                                          <>
                                            <span className="w-1.5 h-1.5 rounded-none bg-rose-muted" />
                                            No email
                                          </>
                                        )}
                                      </div>
                                      {/* Recruiter-for badge */}
                                      {c.name && c.name !== "Hiring Manager" && c.email && c.job_title && (
                                        <div className="mt-1.5">
                                          <span className="inline-flex items-center gap-1 text-[8px] font-black uppercase tracking-wider text-rose-pine bg-rose-pine/10 px-1.5 py-0.5 border border-rose-pine/30">
                                            <Target size={10} className="stroke-[2.5]" /> Recruiter for: {c.job_title}
                                          </span>
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-4">
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-none text-[11px] font-bold bg-rose-overlay text-rose-text border border-rose-border">
                                        {c.company || "Unknown"}
                                      </span>
                                      {c.location && (
                                        <div className="text-[10px] text-rose-muted mt-1 font-bold flex items-center gap-0.5">
                                          <MapPin size={10} className="stroke-[2.5]" /> {c.location}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-4">
                                      <div className="text-rose-muted text-xs font-extrabold max-w-[200px] truncate">{c.job_title || "—"}</div>
                                      {c.salary && (
                                        <div className="text-[10px] text-rose-pine font-bold mt-1 flex items-center gap-0.5">
                                          <DollarSign size={10} className="stroke-[2.5]" /> {c.salary}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-4 text-rose-muted text-xs font-bold whitespace-nowrap">{c.posted_date || "Just now"}</td>
                                    <td className="pr-6 py-4 text-right">
                                      {c.source_url ? (
                                        <a
                                          href={c.source_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center w-7 h-7 border-2 border-rose-border text-rose-muted hover:text-rose-pine hover:bg-rose-pine/10 hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 shadow-[1px_1px_0px_0px_var(--color-shadow)] hover:shadow-[2px_2px_0px_0px_var(--color-shadow)] transition-all bg-rose-surface"
                                          title="View Source Profile"
                                        >
                                          <ExternalLink size={12} className="stroke-[2.5]" />
                                        </a>
                                      ) : (
                                        <span className="text-rose-muted text-xs">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )
                      )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="recruiter-tab"
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.15 }}
                        className="p-4 min-h-[400px] relative bg-rose-base/10 overflow-y-auto max-h-[600px]"
                      >
                      {isResultsLoading && !resultsData && (
                        <div className="absolute inset-0 bg-rose-surface/50 backdrop-blur-none z-10 flex items-center justify-center">
                          <div className="bg-rose-surface p-4 rounded-none border-2 border-rose-border flex items-center gap-3 shadow-[4px_4px_0px_0px_var(--color-shadow)]">
                            <Loader2 className="animate-spin text-rose-pine" size={20} />
                            <span className="text-sm font-bold text-rose-text">Loading postings...</span>
                          </div>
                        </div>
                      )}

                      {resultsData && resultsData.contacts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-16 text-center">
                          <div className="w-12 h-12 rounded-none bg-rose-overlay border-2 border-rose-border flex items-center justify-center mb-4 text-rose-text">
                            <Target size={20} />
                          </div>
                          <p className="text-xs font-black text-rose-text uppercase tracking-wider">No postings found</p>
                          <p className="text-xs text-rose-muted font-bold mt-1.5">
                            {searchQuery ? "Try adjusting your search query or filters." : "Wait for the scraper to discover candidates."}
                          </p>
                        </div>
                      ) : (
                        resultsData && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {resultsData.contacts.map((c) => {
                              const isEditing = editingContactId === c.id;
                              const isExtracting = extractingContactId === c.id;
                              const isTracked = jobApplications.some(
                                (app) =>
                                  app.company_name.toLowerCase().trim() === (c.company || "Unknown").toLowerCase().trim() &&
                                  app.job_title.toLowerCase().trim() === (c.job_title || "Position").toLowerCase().trim()
                              );

                              // Is the recruiter unknown/generic?
                              const hasNoRecruiter = !c.name || c.name === "Hiring Manager" || !c.email || c.email.startsWith("careers@") || c.email.startsWith("hr@") || c.email.startsWith("jobs@") || c.email.startsWith("hiring@");

                              // Find other HR contacts from the same company in Company Research
                              const otherCompanyHR: any[] = hasNoRecruiter
                                ? (companyEnrichments
                                  .find(
                                    (e) =>
                                      e.company_name?.toLowerCase().trim() === (c.company || "").toLowerCase().trim()
                                  )
                                  ?.employees ?? [])
                                  .filter(
                                    (emp: any) =>
                                      emp.email &&
                                      emp.email !== c.email &&
                                      emp.name &&
                                      emp.name !== "Hiring Manager"
                                  )
                                  .slice(0, 3)
                                : [];

                              return (
                                <div
                                  key={c.id}
                                  className="bg-rose-surface border-2 border-rose-border p-5 flex flex-col justify-between gap-4 shadow-[3px_3px_0px_0px_var(--color-hl-low)] hover:shadow-[5px_5px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all duration-150 relative overflow-hidden"
                                >
                                  {isTracked && (
                                    <span className="absolute top-0 right-0 w-3 h-3 bg-rose-pine border-b border-l border-rose-border" />
                                  )}
                                  {/* Top Info */}
                                  <div>
                                    <div className="flex items-start justify-between gap-2 border-b border-rose-hl-med pb-3">
                                      <div className="flex items-start gap-2.5 min-w-0">
                                        <input
                                          type="checkbox"
                                          checked={selectedContactIds.includes(c.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedContactIds((prev) => [...prev, c.id]);
                                            } else {
                                              setSelectedContactIds((prev) => prev.filter((id) => id !== c.id));
                                            }
                                          }}
                                          className="mt-1 shrink-0"
                                        />
                                        <div className="min-w-0">
                                          <h4 className="text-xs font-black text-rose-text leading-tight truncate uppercase tracking-wider" title={c.job_title}>
                                            {c.job_title || "Unknown Role"}
                                          </h4>
                                          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                            <span className="inline-block text-[9px] font-black uppercase text-rose-muted bg-rose-overlay px-1.5 py-0.5 border border-rose-hl-med">
                                              {c.company || "Unknown Company"}
                                            </span>
                                            {c.posted_date && (
                                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-muted">
                                                <Clock size={9} className="stroke-[2.5]" /> {c.posted_date}
                                              </span>
                                            )}
                                            {c.location && (
                                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-muted">
                                                <MapPin size={9} className="stroke-[2.5]" /> {c.location}
                                              </span>
                                            )}
                                            {c.salary && (
                                              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-rose-pine bg-rose-pine/5 px-1.5 border border-rose-pine/20">
                                                <DollarSign size={9} className="stroke-[2.5]" /> {c.salary}
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                      {c.source_url && (
                                        <a
                                          href={c.source_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center w-7 h-7 border-2 border-rose-border text-rose-muted hover:text-rose-pine hover:bg-rose-pine/10 hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 shadow-[1px_1px_0px_0px_var(--color-shadow)] hover:shadow-[2px_2px_0px_0px_var(--color-shadow)] transition-all bg-rose-surface shrink-0"
                                          title="Open Job Listing"
                                        >
                                          <ExternalLink size={11} className="stroke-[2.5]" />
                                        </a>
                                      )}
                                    </div>

                                    {/* Fields */}
                                    <div className="mt-3.5 space-y-3 bg-rose-overlay/20 p-3.5 border border-rose-border rounded-none">
                                      <div>
                                        <span className="text-[8px] font-black uppercase tracking-wider text-rose-muted block mb-1">
                                          Recruiter Name
                                        </span>
                                        {isEditing ? (
                                          <input
                                            type="text"
                                            value={editContactName}
                                            onChange={(e) => setEditContactName(e.target.value)}
                                            className="input text-[11px] py-1.5 px-2.5 font-bold bg-rose-surface w-full border-2 border-rose-border focus:ring-0 focus:ring-offset-0 focus:border-rose-pine"
                                            placeholder="Hiring Manager"
                                          />
                                        ) : (
                                          <span className="text-xs font-black text-rose-text block truncate flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-none bg-rose-muted" />
                                            {c.name || "Hiring Manager"}
                                          </span>
                                        )}
                                      </div>

                                      <div>
                                        <span className="text-[8px] font-black uppercase tracking-wider text-rose-muted block mb-1">
                                          Recruiter Email
                                        </span>
                                        {isEditing ? (
                                          <input
                                            type="text"
                                            value={editContactEmail}
                                            onChange={(e) => setEditContactEmail(e.target.value)}
                                            className="input text-[11px] py-1.5 px-2.5 font-mono font-bold bg-rose-surface w-full border-2 border-rose-border focus:ring-0 focus:ring-offset-0 focus:border-rose-pine"
                                            placeholder="careers@company.com"
                                          />
                                        ) : (
                                          <span className="text-xs font-mono font-bold text-rose-text block truncate flex items-center gap-1.5" title={c.email}>
                                            <span className="w-1.5 h-1.5 rounded-none bg-rose-muted" />
                                            {c.email || "No email"}
                                          </span>
                                        )}
                                      </div>

                                      {/* Only show Recruiter LinkedIn if editing or if a link is actually found */}
                                      {(isEditing || c.linkedin_url) && (
                                        <div>
                                          <span className="text-[8px] font-black uppercase tracking-wider text-rose-muted block mb-1">
                                            Recruiter LinkedIn
                                          </span>
                                          {isEditing ? (
                                            <input
                                              type="text"
                                              value={editContactLinkedin}
                                              onChange={(e) => setEditContactLinkedin(e.target.value)}
                                              className="input text-[11px] py-1.5 px-2.5 font-mono font-bold bg-rose-surface w-full border-2 border-rose-border focus:ring-0 focus:ring-offset-0 focus:border-rose-pine"
                                              placeholder="https://linkedin.com/in/username"
                                            />
                                          ) : (
                                            <a
                                              href={c.linkedin_url}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-pine hover:underline"
                                            >
                                              <Linkedin size={11} />
                                              View LinkedIn Link
                                            </a>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {/* Fallback: Other HR from same company */}
                                    {hasNoRecruiter && otherCompanyHR.length > 0 && (
                                      <div className="mt-3.5 border-2 border-rose-border bg-rose-overlay/30 p-3.5 rounded-none">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-rose-gold mb-2.5 flex items-center gap-1">
                                          <span>⚠️</span> Other HR at {c.company || "this company"}
                                        </p>
                                        <div className="space-y-2">
                                          {otherCompanyHR.map((hr: any) => (
                                            <div key={hr.id} className="flex items-start justify-between gap-2 bg-rose-surface border border-rose-hl-med p-2 hover:border-rose-border transition-colors">
                                              <div className="min-w-0">
                                                <p className="text-[10px] font-black text-rose-text truncate">{hr.name}</p>
                                                <p className="text-[9px] font-mono text-rose-muted truncate mt-0.5">{hr.email}</p>
                                                {hr.job_title && (
                                                  <p className="text-[8px] text-rose-subtle truncate mt-0.5 font-bold uppercase tracking-wide">{hr.job_title}</p>
                                                )}
                                              </div>
                                              <div className="flex items-center gap-1 shrink-0">
                                                {hr.linkedin_url && (
                                                  <a href={hr.linkedin_url} target="_blank" rel="noopener noreferrer"
                                                    className="text-rose-muted hover:text-rose-pine p-1 transition-colors hover:bg-rose-overlay" title="LinkedIn">
                                                    <ExternalLink size={10} className="stroke-[2.5]" />
                                                  </a>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center justify-between pt-3 border-t border-rose-hl-low mt-1 gap-2">
                                    <div>
                                      {isTracked ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-rose-pine bg-rose-pine/10 py-1 px-2.5 border border-rose-pine">
                                          ✓ Tracked
                                        </span>
                                      ) : (
                                        <button
                                          onClick={() => handleTrackJob(c)}
                                          disabled={isTrackingId === c.id}
                                          className="text-[9px] font-black uppercase text-rose-muted hover:text-rose-text hover:border-rose-border hover:bg-rose-overlay/50 flex items-center gap-1 py-1.5 px-2.5 border border-rose-hl-low bg-rose-surface disabled:opacity-50 transition-colors shadow-[1px_1px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none"
                                        >
                                          {isTrackingId === c.id ? (
                                            <Loader2 className="animate-spin" size={10} />
                                          ) : (
                                            <Plus size={10} className="stroke-[2.5]" />
                                          )}
                                          Track Job
                                        </button>
                                      )}
                                    </div>

                                    <div className="flex items-center gap-1.5 ml-auto">
                                      {!isEditing && (
                                        <button
                                          onClick={() => handleExtractRecruiter(c.id)}
                                          disabled={isExtracting}
                                          className="text-[9px] font-black uppercase text-rose-muted hover:text-rose-pine hover:border-rose-pine hover:bg-rose-pine/10 flex items-center gap-1 py-1.5 px-2.5 border border-rose-hl-low bg-rose-surface disabled:opacity-50 transition-colors shadow-[1px_1px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px] active:translate-x-0 active:translate-y-0 active:shadow-none"
                                          title="Extract recruiter info for this posting using AI"
                                        >
                                          {isExtracting ? (
                                            <Loader2 className="animate-spin" size={10} />
                                          ) : (
                                            <Zap size={10} className="stroke-[2.5]" />
                                          )}
                                          AI Scan
                                        </button>
                                      )}
                                      {isEditing ? (
                                        <>
                                          <button
                                            onClick={() => setEditingContactId(null)}
                                            className="text-[9px] font-black uppercase text-rose-muted hover:text-rose-text py-1.5 px-2 hover:bg-rose-overlay/50"
                                          >
                                            Cancel
                                          </button>
                                          <button
                                            onClick={() => handleSaveContact(c.id)}
                                            className="btn-primary text-[9px] py-1.5 px-2.5 font-black uppercase border border-rose-border shadow-[1px_1px_0px_0px_var(--color-shadow)] hover:shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px]"
                                          >
                                            Save
                                          </button>
                                        </>
                                      ) : (
                                        <button
                                          onClick={() => {
                                            setEditingContactId(c.id);
                                            setEditContactName(c.name || "Hiring Manager");
                                            setEditContactEmail(c.email || "");
                                            setEditContactLinkedin(c.linkedin_url || "");
                                          }}
                                          className="text-[9px] font-black uppercase text-rose-muted hover:text-rose-text hover:border-rose-border hover:bg-rose-overlay/50 flex items-center gap-1 py-1.5 px-2.5 border border-rose-hl-low bg-rose-surface shadow-[1px_1px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px]"
                                        >
                                          <Edit size={10} />
                                          Edit
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )
                      )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Pagination */}
                  {resultsData && totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t-2 border-rose-border bg-rose-surface">
                      <span className="text-[11px] text-rose-muted font-bold">
                        Showing <span className="text-rose-text">{Math.min((currentPage - 1) * pageSize + 1, resultsData.count)}</span> to <span className="text-rose-text">{Math.min(currentPage * pageSize, resultsData.count)}</span> of <span className="text-rose-text">{resultsData.count}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={currentPage <= 1}
                          onClick={() => setCurrentPage((prev) => prev - 1)}
                          className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50 shadow-[1px_1px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px]"
                        >
                          <ChevronLeft size={14} className="stroke-[2.5]" />
                        </button>
                        <span className="text-[11px] text-rose-text font-black bg-rose-overlay/50 px-3 py-1.5 rounded-none border-2 border-rose-border">
                          {currentPage} / {totalPages}
                        </span>
                        <button
                          disabled={currentPage >= totalPages}
                          onClick={() => setCurrentPage((prev) => prev + 1)}
                          className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50 shadow-[1px_1px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px]"
                        >
                          <ChevronRight size={14} className="stroke-[2.5]" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Search Form Modal ── */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => setIsSearchModalOpen(false)}
        campaigns={campaigns}
        resumes={resumes}
        onLaunch={handleScrape}
        isStartingScrape={isStartingScrape}
        hasGeminiKey={!!user?.has_gemini_api_key}
      />

      {/* ── Import Modal ── */}
      <ImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        campaigns={campaigns}
        selectedCampaignId={selectedCampaignId}
        setSelectedCampaignId={setSelectedCampaignId}
        resultsCount={resultsData?.count || 0}
        isImporting={isImporting}
        onSubmit={handleImportSubmit}
      />

      {/* ── AI Settings Modal ── */}
      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
      />

      {/* ── Recruiter Fallback Confirmation Modal ── */}
      <FallbackConfirmationModal
        fallbackConfirmation={fallbackConfirmation}
        onClose={() => {
          setFallbackConfirmation(null);
          toast("AI scan complete (specific recruiter not found).");
        }}
        onConfirm={(id) => {
          setFallbackConfirmation(null);
          handleExtractRecruiter(id, true);
        }}
      />
      {modal}
    </motion.div>
  );
}
