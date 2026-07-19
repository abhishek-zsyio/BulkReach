import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Send, XCircle, BarChart3, Plus, Zap, Inbox, Upload, Briefcase, Trash2, FileText, ChevronRight, Check, X, Mail, Search } from "lucide-react";
import { useGetCampaignsQuery, useGetGmailAuthUrlQuery, useDisconnectGmailMutation } from "@/api/campaignApi";
import { CampaignCard } from "@/components/campaign/CampaignCard";
import { useGetResumesQuery, useUploadResumeMutation, useDeleteResumeMutation } from "@/api/resumeApi";
import { useGetAIStatusQuery } from "@/api/aiApi";
import { DropzoneUpload } from "@/components/spreadsheet/DropzoneUpload";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useConfirm } from "@/components/ui/dialogs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { WindowPanel } from "@/components/ui/WindowPanel";

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

export function Dashboard() {
  const { user, fetchUserProfile, connectGmailConfirm } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm, modal } = useConfirm();

  const { data: aiStatus, refetch: refetchAIStatus } = useGetAIStatusQuery(undefined, {
    pollingInterval: 30000,
  });

  // RTK Query hooks for Gmail auth — replaces raw fetch() calls
  const { refetch: fetchGmailAuthUrl } = useGetGmailAuthUrlQuery("dashboard", {
    skip: true, // Only fetch on demand when user clicks Connect
  });
  const [disconnectGmailMutation] = useDisconnectGmailMutation();

  useEffect(() => {
    const code = searchParams.get("gmail_code");
    const state = searchParams.get("gmail_state");
    if (code && state) {
      const confirmGmail = async () => {
        const loadingToast = toast.loading("Finalizing Gmail connection...");
        try {
          await connectGmailConfirm(code, state);
          toast.success("Gmail connected successfully!", { id: loadingToast });
          // Clear query params so we don't reconnect on reload
          searchParams.delete("gmail_code");
          searchParams.delete("gmail_state");
          setSearchParams(searchParams);
          // Refetch user profile details
          await fetchUserProfile();
        } catch (err: any) {
          toast.error(err.message || "Failed to connect Gmail.", { id: loadingToast });
          // Clear query params
          searchParams.delete("gmail_code");
          searchParams.delete("gmail_state");
          setSearchParams(searchParams);
        }
      };
      confirmGmail();
    }
  }, [searchParams, connectGmailConfirm, fetchUserProfile, setSearchParams]);

  const { data: campaigns = [], isLoading } = useGetCampaignsQuery();

  const [resumeName, setResumeName] = useState("");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const { data: resumes = [], refetch: refetchResumes } = useGetResumesQuery();
  const [uploadResume, { isLoading: isUploadingResume }] = useUploadResumeMutation();
  const [deleteResume] = useDeleteResumeMutation();

  const uploadResumeDialogRef = useRef<HTMLDialogElement>(null);

  const handleQuickResumeUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resumeName.trim()) {
      toast.error("Please enter a name for the resume.");
      return;
    }
    if (!resumeFile) {
      toast.error("Please select a PDF resume file.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", resumeName);
      formData.append("file", resumeFile);

      await uploadResume(formData).unwrap();
      toast.success("Resume uploaded successfully!");
      setResumeName("");
      setResumeFile(null);
      uploadResumeDialogRef.current?.close();
      refetchResumes();
      refetchAIStatus?.();
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to upload resume.");
    }
  };

  const handleQuickDelete = async (id: number) => {
    const ok = await confirm({
      title: "Delete Resume",
      message: "Are you sure you want to delete this resume profile?",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await deleteResume(id).unwrap();
      toast.success("Resume deleted.");
      refetchResumes();
    } catch {
      toast.error("Failed to delete resume.");
    }
  };

  const totalSent = useMemo(() => campaigns.reduce((s, c) => s + c.sent_count, 0), [campaigns]);
  const totalFailed = useMemo(() => campaigns.reduce((s, c) => s + c.failed_count, 0), [campaigns]);
  const totalOpened = useMemo(() => campaigns.reduce((s, c) => s + (c.opened_count || 0), 0), [campaigns]);

  const openRate = totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : "—";

  const stats = useMemo(() => [
    {
      label: "Total Campaigns",
      value: campaigns.length,
      icon: BarChart3,
      bgClass: "bg-rose-iris/10 border-rose-iris/20 text-rose-iris",
      accentColor: "var(--color-iris)",
    },
    {
      label: "Emails Sent",
      value: totalSent.toLocaleString(),
      icon: Send,
      bgClass: "bg-rose-foam/10 border-rose-foam/20 text-rose-foam",
      accentColor: "var(--color-foam)",
    },
    {
      label: "Open Rate",
      value: openRate === "—" ? "—" : `${openRate}%`,
      icon: Mail,
      bgClass: "bg-rose-gold/10 border-rose-gold/20 text-rose-gold",
      accentColor: "var(--color-gold)",
    },
    {
      label: "Failed Sends",
      value: totalFailed.toLocaleString(),
      icon: XCircle,
      bgClass: "bg-rose-love/10 border-rose-love/20 text-rose-love",
      accentColor: "var(--color-love)",
    },
  ], [campaigns.length, totalSent, totalOpened, totalFailed, openRate]);

  const recentCampaigns = useMemo(() => [...campaigns].slice(0, 6), [campaigns]);
  const runningCampaigns = useMemo(() => campaigns.filter((c) => c.status === "running"), [campaigns]);

  const chartData = useMemo(() => campaigns
    .slice()
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .map((c) => ({
      name: c.name.length > 15 ? c.name.slice(0, 15) + "..." : c.name,
      Sent: c.sent_count,
      Opened: c.opened_count || 0,
      Failed: c.failed_count,
    })), [campaigns]);

  const handleConnectGmail = async () => {
    try {
      const { data } = await fetchGmailAuthUrl();
      if (data?.auth_url) {
        window.location.href = data.auth_url;
      } else {
        throw new Error("No authorization URL returned from API");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to connect Gmail account.");
    }
  };

  const handleDisconnectGmail = async () => {
    const ok = await confirm({
      title: "Disconnect Gmail",
      message: "Are you sure you want to disconnect your Gmail account? You won't be able to run email campaigns until you reconnect.",
      confirmLabel: "Disconnect",
      variant: "danger",
    });
    if (!ok) return;
    try {
      await disconnectGmailMutation().unwrap();
      toast.success("Gmail disconnected successfully!");
      fetchUserProfile();
    } catch (error) {
      console.error(error);
      toast.error("Failed to disconnect Gmail account.");
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* Welcome Banner Card */}
      <motion.div
        variants={itemVariants}
        className="card relative overflow-hidden bg-gradient-to-r from-rose-surface to-rose-base border-2 border-rose-border p-6 shadow-[4px_4px_0px_0px_var(--color-shadow)]"
      >
        <span className="absolute top-0 left-0 bottom-0 w-[4px] bg-gradient-to-b from-rose-pine via-rose-iris to-rose-foam" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pl-2">
          <div>
            <h1 className="text-2xl font-black text-rose-text tracking-tight uppercase flex items-center gap-2">
              👋 Welcome back, {user?.username || "Outreacher"}
            </h1>
            <p className="text-xs text-rose-muted mt-1.5 font-bold leading-relaxed max-w-xl">
              Monitor your job search matching rates and direct outreach performance. Active campaigns are monitored and dispatched automatically.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider bg-rose-base border-2 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)]">
              <span className="w-2 h-2 rounded-full bg-rose-foam animate-pulse" />
              All Systems Operational
            </span>
          </div>
        </div>
      </motion.div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column - Main Details (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats Grid (2x2) */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.map(({ label, value, icon: Icon, bgClass, accentColor }) => (
              <div
                key={label}
                className="stat-card flex-row items-center gap-4 cursor-pointer relative overflow-hidden"
              >
                {/* Colored top accent bar */}
                <span
                  className="absolute top-0 left-0 right-0 h-[3px]"
                  style={{ background: accentColor }}
                />
                <div className={`w-12 h-12 rounded-none flex items-center justify-center border-2 border-rose-border shrink-0 ${bgClass}`}>
                  <Icon size={20} style={{ color: accentColor }} />
                </div>
                <div>
                  <p className="font-display text-2xl font-black text-rose-text tracking-tight">{value}</p>
                  <p className="font-display text-[10px] text-rose-muted mt-0.5 font-extrabold uppercase tracking-wider">{label}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* Outreach Performance Chart */}
          {chartData.length > 0 && (
            <motion.div variants={itemVariants}>
              <WindowPanel title="Outreach Performance" badge="Analytics">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
                  <div>
                    <h3 className="font-display text-sm font-black text-rose-text uppercase tracking-wider">Campaign Deliverability</h3>
                    <p className="text-[11px] text-rose-muted font-bold">Total emails sent, opened, and failures per campaign</p>
                  </div>
                  <div className="flex items-center gap-4 text-[10px] font-extrabold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5 text-rose-pine">
                      <span className="w-2.5 h-2.5 bg-rose-pine border border-rose-border" /> Sent
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-foam">
                      <span className="w-2.5 h-2.5 bg-rose-foam border border-rose-border" /> Opened
                    </span>
                    <span className="flex items-center gap-1.5 text-rose-love">
                      <span className="w-2.5 h-2.5 bg-rose-love border border-rose-border" /> Failed
                    </span>
                  </div>
                </div>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 15, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="1 5" stroke="var(--color-border)" vertical={false} opacity={0.3} />
                      <XAxis dataKey="name" stroke="var(--color-muted)" fontSize={10} fontWeight={800} tickLine={{ stroke: "var(--color-border)", strokeWidth: 1.5 }} axisLine={{ stroke: "var(--color-border)", strokeWidth: 2 }} />
                      <YAxis stroke="var(--color-muted)" fontSize={10} fontWeight={800} tickLine={{ stroke: "var(--color-border)", strokeWidth: 1.5 }} axisLine={{ stroke: "var(--color-border)", strokeWidth: 2 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "var(--color-surface)",
                          borderColor: "var(--color-border)",
                          borderRadius: "0px",
                          color: "var(--color-text)",
                          fontSize: "11px",
                          fontWeight: 800,
                          borderWidth: "2px",
                          boxShadow: "3px 3px 0px 0px var(--color-shadow)"
                        }}
                        labelClassName="font-display font-extrabold uppercase text-[10px] tracking-wide mb-1"
                      />
                      <Bar dataKey="Sent" fill="var(--color-pine)" stroke="var(--color-border)" strokeWidth={2} radius={0} maxBarSize={25} />
                      <Bar dataKey="Opened" fill="var(--color-foam)" stroke="var(--color-border)" strokeWidth={2} radius={0} maxBarSize={25} />
                      <Bar dataKey="Failed" fill="var(--color-love)" stroke="var(--color-border)" strokeWidth={2} radius={0} maxBarSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </WindowPanel>
            </motion.div>
          )}

          {/* Recent campaigns */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-rose-text flex items-center gap-2">
                Recent Campaigns
                {!isLoading && recentCampaigns.length > 0 && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-rose-hl-low border-2 border-rose-border text-rose-muted">
                    {recentCampaigns.length}
                  </span>
                )}
              </h2>
              <button
                onClick={() => navigate("/campaigns")}
                className="text-sm font-semibold text-rose-iris hover:text-rose-iris/80 transition-colors flex items-center gap-1"
              >
                View all →
              </button>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="card animate-shimmer bg-rose-surface border border-rose-hl-low">
                    <div className="h-4 rounded bg-rose-hl-low mb-3 w-3/4" />
                    <div className="h-3 rounded bg-rose-hl-low mb-4 w-1/2" />
                    <div className="h-1.5 rounded-full mb-3 bg-rose-hl-low" />
                    <div className="h-3 rounded bg-rose-hl-low w-2/3" />
                  </div>
                ))}
              </div>
            ) : recentCampaigns.length === 0 ? (
              <div className="card py-16 text-center bg-rose-surface border-2 border-rose-border">
                {/* Gradient icon box matching CompanyResearch pattern */}
                <div
                  className="w-16 h-16 rounded-none mx-auto flex items-center justify-center mb-4 border-2 border-rose-border shadow-[3px_3px_0px_0px_var(--color-shadow)]"
                  style={{ background: "linear-gradient(135deg, var(--color-pine) 0%, var(--color-iris) 100%)" }}
                >
                  <Inbox size={24} className="text-white" />
                </div>
                <p className="text-rose-text font-extrabold text-lg mb-1">No campaigns yet</p>
                <p className="text-rose-muted text-sm mb-6 max-w-xs mx-auto">Create your first outreach campaign to start connecting with prospects.</p>
                <button onClick={() => navigate("/campaigns/new")} className="btn-primary mx-auto">
                  <Plus size={15} /> Create Campaign
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recentCampaigns.map((c) => (
                  <CampaignCard key={c.id} campaign={c} />
                ))}
              </div>
            )}
          </motion.div>

          {/* Live campaigns */}
          {runningCampaigns.length > 0 && (
            <motion.div variants={itemVariants} className="space-y-4">
              <h2 className="text-base font-extrabold text-rose-text flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-iris opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-iris" />
                </span>
                Live Campaigns
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 bg-rose-iris/10 border-2 border-rose-border text-rose-iris">
                  {runningCampaigns.length} running
                </span>
              </h2>
              {/* Animated ring border on the live campaigns grid container */}
              <div className="rounded-none p-[2px] relative" style={{ background: "linear-gradient(135deg, var(--color-iris), var(--color-pine), var(--color-iris))" }}>
                <div className="bg-rose-base p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {runningCampaigns.map((c) => (
                    <CampaignCard key={c.id} campaign={c} />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Column - Side Panels (1/3 width) */}
        <div className="space-y-6">
          {/* Sender Connection Status Card */}
          <motion.div variants={itemVariants}>
            <WindowPanel title="Outreach Sender" badge="Connection">
              {user?.gmail_connected ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3.5 p-3 bg-rose-overlay/30 border-2 border-rose-border relative overflow-hidden">
                    {/* Small absolute top bar showing active connection status */}
                    <span className="absolute top-0 left-0 right-0 h-[2px] bg-rose-foam" />
                    
                    <div className="w-10 h-10 rounded-none bg-rose-foam/10 border-2 border-rose-foam/30 flex items-center justify-center text-rose-foam font-black text-lg shrink-0">
                      {user?.sender_email ? user.sender_email[0].toUpperCase() : "G"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-rose-text truncate leading-none mb-1.5">{user?.sender_email}</p>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-foam/15 text-rose-foam border border-rose-foam/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-foam animate-pulse" />
                        Active Connection
                      </span>
                    </div>
                  </div>

                  {/* Features checklist to show utility */}
                  <div className="space-y-2 text-[10px] text-rose-muted font-bold pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-foam font-black">✓</span>
                      <span>Automated campaign dispatch enabled</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-foam font-black">✓</span>
                      <span>Smart open & bounce tracking active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-foam font-black">✓</span>
                      <span>Gmail API delivery limits synced</span>
                    </div>
                  </div>

                  <div className="pt-2">
                    <button
                      onClick={handleDisconnectGmail}
                      className="w-full py-2.5 text-[10px] font-black uppercase tracking-wider text-rose-love hover:text-white border-2 border-rose-border hover:border-rose-love hover:bg-rose-love hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all duration-150 rounded-none bg-rose-overlay/40"
                    >
                      Disconnect Gmail Account
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-xs text-rose-muted leading-relaxed font-semibold">
                    Connect your Gmail account to dispatch automated outreach campaigns directly. Setup takes less than 30 seconds.
                  </p>

                  {/* Benefits checklist when not connected */}
                  <div className="space-y-2 text-[10px] text-rose-muted font-bold">
                    <div className="flex items-center gap-2">
                      <span className="text-rose-pine font-black">✦</span>
                      <span>Send up to 500 personalized emails daily</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-pine font-black">✦</span>
                      <span>Automatic delivery delay & throttling</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-rose-pine font-black">✦</span>
                      <span>Dynamic custom field variable insertion</span>
                    </div>
                  </div>

                  <button
                    onClick={handleConnectGmail}
                    className="btn-primary w-full py-2.5 text-xs font-extrabold uppercase tracking-wider flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:shadow-[5px_5px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all duration-200"
                  >
                    <Zap size={13} className="stroke-[3] animate-pulse" /> Connect Gmail Account
                  </button>
                </div>
              )}
            </WindowPanel>
          </motion.div>

          {/* AI Engine Status Card */}
          <motion.div variants={itemVariants}>
            <WindowPanel title="AI Engine Status" badge="Gemini">
              {aiStatus ? (
                <div className="space-y-4">
                  {/* Status Bar */}
                  <div className="flex items-center gap-3.5 p-3 bg-rose-overlay/30 border-2 border-rose-border relative overflow-hidden">
                    <span className={`absolute top-0 left-0 right-0 h-[2px] ${aiStatus.has_key ? 'bg-rose-foam' : 'bg-rose-love'}`} />
                    
                    <div className={`w-10 h-10 rounded-none border-2 flex items-center justify-center font-black text-lg shrink-0 ${aiStatus.has_key ? 'bg-rose-foam/10 border-rose-foam/30 text-rose-foam' : 'bg-rose-love/10 border-rose-love/30 text-rose-love'}`}>
                      🧠
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-rose-text truncate leading-none mb-1.5">{aiStatus.model}</p>
                      {aiStatus.has_key ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-foam/15 text-rose-foam border border-rose-foam/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-foam animate-pulse" />
                          API Key Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider bg-rose-love/15 text-rose-love border border-rose-love/30">
                          <span className="w-1.5 h-1.5 rounded-full bg-rose-love" />
                          API Key Missing
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Quota Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-rose-muted">
                      <span>Daily API Requests</span>
                      <span className="text-rose-text font-mono font-black">{aiStatus.requests_today} / {aiStatus.daily_limit}</span>
                    </div>
                    {/* Styled Neobrutalist Progress Bar */}
                    <div className="w-full h-3 bg-rose-overlay border-2 border-rose-border rounded-none overflow-hidden relative shadow-[1px_1px_0px_0px_var(--color-shadow)]">
                      <motion.div 
                        className="h-full bg-gradient-to-r from-rose-pine to-rose-iris"
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min((aiStatus.requests_today / aiStatus.daily_limit) * 100, 100)}%` }}
                        transition={{ type: "spring", stiffness: 80, damping: 15 }}
                      />
                    </div>
                  </div>

                  {/* Recent AI Activities */}
                  <div className="pt-2 border-t border-rose-hl-med">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-rose-muted mb-2">Recent AI Activity</p>
                    {aiStatus.recent_logs.length === 0 ? (
                      <p className="text-[10px] text-rose-subtle font-medium italic">No AI activity recorded today.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {aiStatus.recent_logs.map((log) => {
                          const dateObj = new Date(log.timestamp);
                          const formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                          return (
                            <div key={log.id} className="flex items-center justify-between text-[10px] text-rose-text font-semibold">
                              <span className="truncate max-w-[140px]">✦ {log.request_type}</span>
                              <span className="text-rose-muted font-mono text-[9px]">{formattedTime}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  
                  {!aiStatus.has_key && (
                    <div className="pt-1">
                      <button
                        onClick={() => navigate("/settings")}
                        className="btn-secondary w-full py-2 text-[10px] font-extrabold uppercase tracking-wider flex items-center justify-center gap-1.5"
                      >
                        Set API Key in Settings
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-6">
                  <div className="w-6 h-6 border-2 border-rose-pine border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </WindowPanel>
          </motion.div>

          {/* Quick Actions Card */}
          <motion.div variants={itemVariants}>
            <WindowPanel title="Quick Actions" badge="Utility">
              <div className="grid grid-cols-1 gap-2 mt-1">
                {/* Primary action gets extra visual emphasis */}
                <button
                  onClick={() => navigate("/campaigns/new")}
                  className="relative overflow-hidden btn-primary py-2.5 justify-start text-xs font-extrabold uppercase tracking-wider w-full group/qa shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:shadow-[5px_5px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all duration-200"
                >
                  <Plus size={14} className="stroke-[3] transition-transform duration-200 group-hover/qa:rotate-90" /> New Outreach Campaign
                  <span className="ml-auto text-[9px] opacity-60 font-mono">→</span>
                </button>
                <button
                  onClick={() => navigate("/templates/new/edit")}
                  className="btn-secondary py-2.5 justify-start text-xs font-extrabold uppercase tracking-wider w-full"
                >
                  <FileText size={14} className="stroke-[2.5]" /> Create Email Template
                </button>
                <button
                  onClick={() => navigate("/scraper")}
                  className="btn-secondary py-2.5 justify-start text-xs font-extrabold uppercase tracking-wider w-full"
                >
                  <Search size={14} className="stroke-[2.5]" /> Launch Job Scraper
                </button>
              </div>
            </WindowPanel>
          </motion.div>

          {/* Quick Resumes Widget */}
          <motion.div variants={itemVariants}>
            <WindowPanel title="My Resumes" badge="Profiles">
              <div className="flex flex-col justify-between h-[280px] max-h-[280px]">
                {resumes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center flex-1 py-4">
                    <div className="w-12 h-12 rounded-none flex items-center justify-center mb-3 bg-rose-overlay border-2 border-rose-border text-rose-text">
                      <Briefcase size={20} />
                    </div>
                    <p className="text-rose-text font-bold text-sm mb-1">No resumes uploaded</p>
                    <p className="text-rose-muted text-[11px] mb-4 max-w-[180px] mx-auto">Upload a resume profile to start AI matching.</p>
                    <button
                      onClick={() => uploadResumeDialogRef.current?.showModal()}
                      className="btn-primary text-xs px-3 py-1.5"
                    >
                      <Plus size={12} /> Upload Resume
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex-grow overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                      {resumes.slice(0, 4).map((r) => (
                        <div
                          key={r.id}
                          className="flex items-center justify-between p-2.5 rounded-none bg-rose-overlay/40 border-2 border-rose-border hover:border-rose-pine transition-colors"
                        >
                          <div className="min-w-0 flex-1 pr-2">
                            <p className="text-xs font-bold text-rose-text truncate">{r.name}</p>
                            {r.file ? (
                              <a
                                href={r.file}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[10px] text-rose-subtle hover:text-rose-iris truncate block underline font-mono font-medium mt-0.5"
                              >
                                {r.file.split("/").pop()}
                              </a>
                            ) : (
                              <span className="text-[10px] text-rose-subtle font-mono font-medium mt-0.5 block">
                                Text-only Profile
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => handleQuickDelete(r.id)}
                            type="button"
                            className="text-rose-love hover:bg-rose-love/15 p-1.5 rounded-none border border-transparent hover:border-rose-border transition-colors flex-shrink-0"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-rose-hl-med pt-3 mt-3 flex justify-between items-center text-xs font-bold text-rose-muted shrink-0">
                      <button
                        onClick={() => uploadResumeDialogRef.current?.showModal()}
                        className="text-rose-pine hover:text-rose-iris transition-colors flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider"
                      >
                        <Plus size={13} className="stroke-[3]" /> Add New
                      </button>
                      <button
                        onClick={() => navigate("/resumes")}
                        className="text-rose-muted hover:text-rose-text transition-colors flex items-center gap-0.5 text-[11px] font-extrabold uppercase tracking-wider"
                      >
                        Manage all <ChevronRight size={13} />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </WindowPanel>
          </motion.div>
        </div>
      </div>

      {/* Upload Resume Dialog Modal */}
      <dialog
        ref={uploadResumeDialogRef}
        closedby="any"
        aria-labelledby="upload-resume-dialog-title"
        className="m-auto rounded-none border-2 bg-rose-surface text-rose-text p-6 w-full max-w-md focus:outline-none border-rose-border shadow-none backdrop:bg-rose-base/80 transition-all open:animate-in open:fade-in open:zoom-in-95"
      >
        <div className="flex items-center justify-between pb-4 border-b-2 border-rose-border mb-5">
          <h3 id="upload-resume-dialog-title" className="text-base font-extrabold text-rose-text flex items-center gap-2">
            <Upload size={16} className="text-rose-pine stroke-[2.5]" />
            Upload New Resume
          </h3>
          <button
            onClick={() => uploadResumeDialogRef.current?.close()}
            className="w-7 h-7 rounded-none flex items-center justify-center text-rose-text bg-rose-surface border-2 border-rose-border hover:bg-rose-hl-low transition-colors"
          >
            <X size={14} className="stroke-[2.5]" />
          </button>
        </div>

        <form onSubmit={handleQuickResumeUpload} className="space-y-4">
          <div>
            <label htmlFor="quick-resume-name" className="label">Resume Profile Name</label>
            <input
              id="quick-resume-name"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              className="input font-semibold"
              placeholder="e.g. Senior Backend Dev"
            />
          </div>

          <div>
            <label className="label">PDF File</label>
            <DropzoneUpload
              onFileAccepted={setResumeFile}
              label="PDF Resume"
              accept={{ "application/pdf": [".pdf"] }}
              maxSizeMb={5}
              isLoading={isUploadingResume}
            />
            {resumeFile && (
              <div className="rounded-none mt-2 px-3 py-1.5 text-xs text-rose-foam font-extrabold flex items-center gap-1.5 bg-rose-foam/15 border-2 border-rose-border">
                <Check size={13} className="stroke-[3]" /> Selected: {resumeFile.name}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => uploadResumeDialogRef.current?.close()}
              className="btn-secondary text-xs font-bold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploadingResume}
              className="btn-primary text-xs"
            >
              {isUploadingResume ? "Uploading..." : "Upload Resume"}
            </button>
          </div>
        </form>
      </dialog>
      {modal}
    </motion.div>
  );
}
