import { useNavigate } from "react-router-dom";
import { Plus, Search, Inbox } from "lucide-react";
import { useState } from "react";
import { useGetCampaignsQuery } from "@/api/campaignApi";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { motion, AnimatePresence } from "framer-motion";

const STATUSES = ["draft", "queued", "running", "paused", "done", "failed"];

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
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 120, damping: 16 } }
};

export function CampaignList() {
  const navigate = useNavigate();
  const { data: campaigns = [], isLoading } = useGetCampaignsQuery();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filtered = campaigns.filter((c) => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? c.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={containerVariants}
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-rose-text tracking-tight">Campaigns</h1>
          <p className="text-rose-subtle mt-1 text-sm font-medium">{campaigns.length} total campaigns</p>
        </div>
        <button id="create-campaign-btn" onClick={() => navigate("/campaigns/new")} className="btn-primary self-start sm:self-auto">
          <Plus size={15} /> New Campaign
        </button>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-muted stroke-[2.5]" />
          <input
            id="campaign-search"
            type="text"
            placeholder="Search campaigns…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-10 text-sm"
          />
        </div>

        {/* Status pills */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setStatusFilter("")}
            className={`px-3 py-1.5 rounded-none text-[10px] font-extrabold uppercase tracking-wider transition-all duration-150 border-2 ${
              !statusFilter
                ? "text-white bg-rose-pine border-rose-border"
                : "text-rose-muted hover:text-rose-text bg-rose-surface border-rose-hl-med"
            }`}
          >
            All
          </button>
          {STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s === statusFilter ? "" : s)}
              className={`px-3 py-1.5 rounded-none text-[10px] font-extrabold uppercase tracking-wider transition-all duration-150 border-2 ${
                statusFilter === s
                  ? "text-white bg-rose-pine border-rose-border"
                  : "text-rose-muted hover:text-rose-text bg-rose-surface border-rose-hl-med"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Content */}
      {isLoading ? (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-none h-40 bg-rose-surface border-2 border-rose-border"
            />
          ))}
        </motion.div>
      ) : filtered.length === 0 ? (
        <motion.div
          variants={itemVariants}
          className="card py-20 text-center bg-rose-surface"
        >
          <div className="w-16 h-16 rounded-none mx-auto flex items-center justify-center mb-4 bg-rose-overlay border-2 border-rose-border">
            <Inbox size={24} className="text-rose-text" />
          </div>
          <p className="text-rose-text font-extrabold text-lg mb-1">No campaigns found</p>
          <p className="text-rose-muted text-sm mb-6 max-w-xs mx-auto">
            {search || statusFilter ? "Try adjusting your filters." : "Create your first campaign to get started."}
          </p>
          {!search && !statusFilter && (
            <button onClick={() => navigate("/campaigns/new")} className="btn-primary mx-auto">
              <Plus size={15} /> Create Campaign
            </button>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        >
          <AnimatePresence mode="popLayout">
            {filtered.map((c) => (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <CampaignCard campaign={c} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
}
