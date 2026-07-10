import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Linkedin, Search, Target, Briefcase, Dices, Loader2, ArrowRight } from "lucide-react";
import { NaukriIcon, IndeedIcon } from "./PlatformIcon";
import { CustomSelect } from "@/components/ui/CustomSelect";
import toast from "react-hot-toast";

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaigns: any[];
  resumes: any[];
  onLaunch: (params: {
    platform: string;
    keywords: string;
    location: string;
    maxResults: number;
    campaignId: number;
    useAiMatching: boolean;
    freshness?: string;
    companySize?: string;
  }) => Promise<void>;
  isStartingScrape: boolean;
}

const PLATFORMS = [
  { value: "linkedin", label: "LinkedIn", ramp: "pine", icon: Linkedin },
  { value: "naukri", label: "Naukri", ramp: "gold", icon: NaukriIcon },
  { value: "indeed", label: "Indeed", ramp: "rose", icon: IndeedIcon },
  { value: "web", label: "Web", ramp: "iris", icon: Search },
  { value: "glassdoor", label: "Glassdoor", ramp: "love", icon: Target },
  { value: "wellfound", label: "Wellfound", ramp: "foam", icon: Zap },
  { value: "foundit", label: "Foundit", ramp: "pine", icon: Briefcase },
  { value: "dice", label: "Dice", ramp: "gold", icon: Dices },
];

export function SearchModal({
  isOpen,
  onClose,
  campaigns,
  resumes,
  onLaunch,
  isStartingScrape,
}: SearchModalProps) {
  const [platform, setPlatform] = useState("linkedin");
  const [keywords, setKeywords] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(50);
  const [selectedCampaignForSearch, setSelectedCampaignForSearch] = useState("");
  const [useAiMatching, setUseAiMatching] = useState(true);
  const [freshness, setFreshness] = useState("");
  const [companySize, setCompanySize] = useState("");

  const handleScrapeClick = async () => {
    if (!keywords.trim() && resumes.length === 0) {
      toast.error("Please provide Keywords or upload your resume in AI Settings.");
      return;
    }
    if (!selectedCampaignForSearch) {
      toast.error("Target Campaign is required.");
      return;
    }
    if (!useAiMatching && !keywords.trim()) {
      toast.error("Keywords are required when AI matching is disabled.");
      return;
    }

    try {
      await onLaunch({
        platform,
        keywords,
        location,
        maxResults,
        campaignId: Number(selectedCampaignForSearch),
        useAiMatching,
        freshness: freshness || undefined,
        companySize: companySize || undefined,
      });
      onClose();
    } catch (err) {
      // Parent component handles showing error toast if needed
    }
  };

  const activePlatform = PLATFORMS.find((p) => p.value === platform)!;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-rose-base/70"
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
            className="w-full max-w-3xl max-h-[95vh] flex border-[3px] border-rose-border bg-rose-surface shadow-[12px_12px_0px_0px_var(--color-shadow)]"
          >
            {/* ── Left rail: identity + step markers ── */}
            <div className="hidden sm:flex flex-col w-[92px] shrink-0 border-r-[3px] border-rose-border bg-rose-text">
              <div className="p-3 border-b-[3px] border-rose-border flex items-center justify-center">
                <div className="w-9 h-9 border-[3px] border-rose-surface bg-rose-pine flex items-center justify-center">
                  <Zap size={16} className="fill-white text-white" />
                </div>
              </div>
              <div className="flex-1 flex flex-col">
                {["Target", "Route", "Filter"].map((label, i) => (
                  <div
                    key={label}
                    className="flex-1 flex flex-col items-center justify-center gap-1.5 border-b-[3px] border-rose-border last:border-b-0"
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
              <div className="flex items-start justify-between gap-3 px-5 sm:px-6 pt-5 pb-4 border-b-[3px] border-rose-border shrink-0">
                <div>
                  <h3 className="text-lg font-black text-rose-text uppercase tracking-tight leading-none">
                    Discovery search
                  </h3>
                  <p className="text-[12px] text-rose-muted font-bold mt-1.5">
                    Find recruiters and hiring managers, anywhere they post.
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 shrink-0 flex items-center justify-center text-rose-text bg-rose-surface border-[3px] border-rose-border hover:bg-rose-love hover:text-white hover:border-rose-love active:scale-95 transition-all"
                >
                  <X size={16} className="stroke-[3]" />
                </button>
              </div>

              {/* ── Body ── */}
              <div className="p-5 sm:p-6 overflow-y-auto scrollbar-thin flex-1 space-y-6">
                {/* Platform picker: horizontal chip strip, not a grid */}
                <div>
                  <div className="flex items-baseline justify-between mb-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-muted">
                      01 — Platform
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-pine">
                      {activePlatform.label} selected
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PLATFORMS.map((p) => {
                      const active = platform === p.value;
                      return (
                        <button
                          key={p.value}
                          type="button"
                          onClick={() => setPlatform(p.value)}
                          className={`flex items-center gap-2 pl-2.5 pr-3.5 py-2 border-[3px] font-black text-[11px] uppercase tracking-wide transition-all ${active
                              ? "bg-rose-text text-rose-surface border-rose-text -translate-y-[2px] shadow-[4px_4px_0px_0px_var(--color-shadow)]"
                              : "bg-rose-surface text-rose-muted border-rose-hl-med hover:border-rose-text hover:text-rose-text"
                            }`}
                        >
                          <p.icon className="w-4 h-4 stroke-[2]" />
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Keywords / results / location — single dense block */}
                <div className="border-[3px] border-rose-border">
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_110px] divide-y-[3px] sm:divide-y-0 sm:divide-x-[3px] divide-rose-border">
                    <div className="p-3.5">
                      <label htmlFor="scrape-keywords" className="block text-[10px] font-black uppercase tracking-widest text-rose-muted mb-1.5">
                        Keywords
                      </label>
                      <input
                        id="scrape-keywords"
                        type="text"
                        value={keywords}
                        onChange={(e) => setKeywords(e.target.value)}
                        placeholder={resumes.length > 0 ? "Defaults to AI profile matches" : "e.g. Software Engineer"}
                        className="w-full bg-transparent font-bold text-sm text-rose-text placeholder:text-rose-muted placeholder:font-semibold focus:outline-none"
                      />
                    </div>
                    <div className="p-3.5">
                      <label htmlFor="max-results" className="block text-[10px] font-black uppercase tracking-widest text-rose-muted mb-1.5">
                        Max results
                      </label>
                      <input
                        id="max-results"
                        type="number"
                        value={maxResults}
                        min={1}
                        onChange={(e) => setMaxResults(Number(e.target.value))}
                        className="w-full bg-transparent font-bold text-sm text-rose-text focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="p-3.5 border-t-[3px] border-rose-border">
                    <label htmlFor="scrape-location" className="block text-[10px] font-black uppercase tracking-widest text-rose-muted mb-1.5">
                      Location
                    </label>
                    <input
                      id="scrape-location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      className="w-full bg-transparent font-semibold text-sm text-rose-text placeholder:text-rose-muted placeholder:font-semibold focus:outline-none"
                      placeholder="e.g. Bangalore, Remote"
                    />
                  </div>
                </div>

                {/* Campaign + AI matching switch */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-muted mb-2.5 block">
                    02 — Route to campaign
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                    <div className="border-[3px] border-rose-border p-3.5">
                      <label htmlFor="target-campaign" className="block text-[10px] font-black uppercase tracking-widest text-rose-love mb-1.5">
                        Campaign — required
                      </label>
                      <CustomSelect
                        value={selectedCampaignForSearch}
                        onChange={(val) => setSelectedCampaignForSearch(val.toString())}
                        options={campaigns.map((camp) => ({
                          value: camp.id.toString(),
                          label: camp.name,
                        }))}
                        placeholder="Select campaign target..."
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setUseAiMatching(!useAiMatching)}
                      className={`flex sm:flex-col items-center justify-between sm:justify-center gap-2 sm:gap-1.5 px-4 py-3 border-[3px] transition-all min-w-[120px] ${useAiMatching
                          ? "bg-rose-pine border-rose-pine text-white"
                          : "bg-rose-surface border-rose-border text-rose-muted"
                        }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-widest">AI match</span>
                      <span className="text-xs font-black uppercase">{useAiMatching ? "On" : "Off"}</span>
                    </button>
                  </div>
                </div>

                {/* Advanced filters */}
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-rose-muted mb-2.5 block">
                    03 — Refine
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="border-[3px] border-rose-border p-3.5">
                      <label htmlFor="scrape-freshness" className="block text-[10px] font-black uppercase tracking-widest text-rose-muted mb-1.5">
                        Freshness
                      </label>
                      <CustomSelect
                        value={freshness}
                        onChange={(val) => setFreshness(val.toString())}
                        options={[
                          { value: "", label: "Any time" },
                          { value: "past_24h", label: "Past 24 hours" },
                          { value: "past_week", label: "Past week" },
                          { value: "past_month", label: "Past month" },
                        ]}
                        placeholder="Select freshness limit..."
                      />
                    </div>
                    <div className="border-[3px] border-rose-border p-3.5">
                      <label htmlFor="scrape-company-size" className="block text-[10px] font-black uppercase tracking-widest text-rose-muted mb-1.5">
                        Company size
                      </label>
                      <CustomSelect
                        value={companySize}
                        onChange={(val) => setCompanySize(val.toString())}
                        options={[
                          { value: "", label: "Any size" },
                          { value: "1-10", label: "1-10 employees" },
                          { value: "11-50", label: "11-50 employees" },
                          { value: "51-200", label: "51-200 employees" },
                          { value: "201-500", label: "201-500 employees" },
                          { value: "501-1000", label: "501-1000 employees" },
                          { value: "1000+", label: "1000+ employees" },
                        ]}
                        placeholder="Select headcount size..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── Footer ── */}
              <div className="flex items-center justify-between gap-3 px-5 sm:px-6 py-4 border-t-[3px] border-rose-border shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="text-[11px] font-black uppercase tracking-widest text-rose-muted hover:text-rose-text transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleScrapeClick}
                  disabled={isStartingScrape}
                  className="flex items-center gap-2 bg-rose-text text-rose-surface text-xs font-black uppercase tracking-widest py-3 px-6 border-[3px] border-rose-text shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all disabled:opacity-60 disabled:translate-x-0 disabled:translate-y-0"
                >
                  {isStartingScrape ? (
                    <>
                      <Loader2 className="animate-spin h-3.5 w-3.5" />
                      Launching
                    </>
                  ) : (
                    <>
                      Launch scraper
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