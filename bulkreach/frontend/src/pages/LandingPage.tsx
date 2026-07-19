import { useNavigate } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  Zap, Send, FileText, Search, ArrowRight, ShieldCheck,
  Mail, TrendingUp, Clock, Star, CheckCircle,
  Sparkles, Lock, BarChart3, Cpu, ChevronRight,
  Link, DollarSign, Rocket, Kanban, Building2,
  Target, Shield, Monitor, Smartphone, Database,
  UserSearch, BriefcaseBusiness, ScanSearch, Layout
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRef, useEffect, useState } from "react";

/* ── Animation Variants ── */
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};
const fadeLeft = {
  hidden: { opacity: 0, x: -32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};
const fadeRight = {
  hidden: { opacity: 0, x: 32 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};
const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
};

/* ── Animated Counter ── */
function AnimatedCounter({ target, suffix = "", prefix = "" }: { target: number; suffix?: string; prefix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const duration = 1800;
    const step = Math.ceil(target / (duration / 16));
    const timer = setInterval(() => {
      start = Math.min(start + step, target);
      setCount(start);
      if (start >= target) clearInterval(timer);
    }, 16);
    return () => clearInterval(timer);
  }, [inView, target]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ── Feature Card ── */
function FeatureCard({ icon: Icon, color, bg, border, title, badge, desc, pills }: any) {
  return (
    <div className="card card-interactive p-7 flex flex-col items-start group">
      <div className="flex items-start justify-between w-full mb-5">
        <div className={`w-11 h-11 border-2 border-rose-border flex items-center justify-center ${bg} group-hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] transition-shadow`}>
          <Icon size={18} className={`${color} stroke-[2.5]`} />
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 border ${border} ${color}`}>{badge}</span>
      </div>
      <h3 className="text-base font-extrabold text-rose-text mb-2 tracking-tight uppercase">{title}</h3>
      <p className="text-rose-muted font-semibold leading-relaxed text-sm flex-1">{desc}</p>
      {pills && (
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-rose-hl-low w-full">
          {pills.map((p: string) => (
            <span key={p} className="flex items-center gap-1 text-[10px] font-bold text-rose-subtle">
              <CheckCircle size={9} className={color} /> {p}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Main Component ── */
export function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const handleCTA = () => navigate(isAuthenticated ? "/dashboard" : "/login");

  return (
    <div className="min-h-full bg-rose-base font-sans overflow-x-hidden selection:bg-rose-iris selection:text-white">

      {/* ── Navbar ── */}
      <nav className="h-[68px] px-6 md:px-16 flex items-center justify-between border-b-2 border-rose-border sticky top-0 z-50 bg-rose-surface/95 backdrop-blur-sm">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-pine via-rose-iris to-rose-foam z-50" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 flex items-center justify-center bg-rose-pine border-2 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] transition-transform duration-300 hover:rotate-6 hover:scale-105 cursor-pointer">
            <Zap size={16} className="text-white fill-white" />
          </div>
          <span className="font-black text-rose-text text-lg tracking-tight uppercase">Bulk<span className="text-rose-pine">Reach</span></span>
          <span className="hidden sm:inline-flex ml-2 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest border-2 border-rose-foam text-rose-foam bg-rose-foam/10">v2.5</span>
        </div>
        <div className="hidden md:flex items-center gap-7 text-sm font-bold text-rose-muted">
          <button onClick={() => document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-rose-text transition-all duration-200 hover:-translate-y-0.5">Features</button>
          <button onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-rose-text transition-all duration-200 hover:-translate-y-0.5">Modules</button>
          <button onClick={() => document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-rose-text transition-all duration-200 hover:-translate-y-0.5">How It Works</button>
          <button onClick={() => document.getElementById("testimonials")?.scrollIntoView({ behavior: "smooth" })} className="hover:text-rose-text transition-all duration-200 hover:-translate-y-0.5">Reviews</button>
        </div>
        <button onClick={handleCTA} className="btn-primary px-5 py-2 text-sm font-extrabold flex items-center gap-2 shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_var(--color-shadow)] transition-all duration-300 group/nav-btn">
          <span>{isAuthenticated ? "Dashboard" : "Get Started Free"}</span>
          <ArrowRight size={14} className="transition-transform duration-300 group-hover/nav-btn:translate-x-0.5" />
        </button>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-20 pb-0 px-6 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-40 pointer-events-none" />
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-rose-pine/10 blur-[120px] pointer-events-none rounded-full" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-rose-foam/8 blur-[100px] pointer-events-none rounded-full" />

        <motion.div initial="hidden" animate="visible" variants={stagger}
          className="relative max-w-5xl mx-auto flex flex-col items-center text-center pt-16 pb-20">

          <motion.div variants={fadeUp}
            className="inline-flex items-center gap-2 px-4 py-2 border-2 border-rose-border bg-rose-surface mb-10 shadow-[3px_3px_0px_0px_var(--color-shadow)] select-none">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full bg-rose-foam opacity-75 rounded-full" />
              <span className="relative inline-flex h-2 w-2 bg-rose-foam rounded-full" />
            </span>
            <span className="text-xs font-black text-rose-text uppercase tracking-[0.15em]">AI-Powered Job Application Platform</span>
            <ChevronRight size={12} className="text-rose-muted" />
          </motion.div>

          <motion.h1 variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-8xl font-black text-rose-text tracking-tighter leading-[0.95] mb-8 uppercase">
            Land Your<br />
            <span className="relative inline-block">
              <span className="relative z-10 bg-gradient-to-r from-rose-pine to-rose-foam bg-clip-text text-transparent">Dream Job</span>
              <span className="absolute -bottom-2 left-0 right-0 h-4 bg-rose-pine/10 -z-0" />
            </span>{" "}
            <span className="bg-gradient-to-r from-rose-foam via-rose-iris to-rose-pine bg-clip-text text-transparent">Faster</span>
          </motion.h1>

          <motion.p variants={fadeUp} className="text-lg md:text-xl text-rose-muted font-semibold max-w-2xl mb-4 leading-relaxed">
            TalentStream automates your entire job search — scraping listings, finding recruiters with AI, sending personalized Gmail campaigns, and tracking every application in a visual Kanban board.
          </motion.p>
          <motion.p variants={fadeUp} className="text-sm text-rose-muted/70 font-bold max-w-xl mb-12 tracking-wide uppercase">
            Naukri Scraper · AI Recruiter Finder · Company Research · Gmail Native · Application Tracker
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
            <button onClick={handleCTA} className="btn-primary px-10 py-4 text-base font-extrabold flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:shadow-[6px_6px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-0 active:translate-y-0 active:shadow-[4px_4px_0px_0px_var(--color-shadow)] transition-all duration-300 group/hero-primary">
              <Zap size={18} className="fill-white transition-transform duration-300 group-hover/hero-primary:scale-110 group-hover/hero-primary:rotate-12" /> Start For Free
            </button>
            <button onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}
              className="btn-secondary px-10 py-4 text-base font-extrabold flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:shadow-[6px_6px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-0 active:translate-y-0 active:shadow-[4px_4px_0px_0px_var(--color-shadow)] transition-all duration-300">
              <Layout size={16} /> See All Modules
            </button>
          </motion.div>

          <motion.div variants={fadeUp} className="mt-12 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-rose-muted">
            {["✓ Free to start", "✓ Connect Gmail in 30s", "✓ AI template generation", "✓ Kanban application tracker", "✓ No credit card"].map(t => (
              <span key={t}>{t}</span>
            ))}
          </motion.div>
        </motion.div>

        {/* Dashboard Mockup */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, delay: 0.3 }}
          className="max-w-6xl mx-auto relative group/mockup">
          <div className="absolute inset-0 bg-gradient-to-r from-rose-pine/10 to-rose-foam/10 blur-[80px] pointer-events-none -z-10 rounded-3xl" />
          <div className="relative border-2 border-rose-border bg-rose-surface shadow-[8px_8px_0px_0px_var(--color-shadow)] hover:shadow-[12px_12px_0px_0px_var(--color-pine)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all duration-300 overflow-hidden">
            {/* Browser chrome */}
            <div className="h-11 bg-rose-overlay border-b-2 border-rose-border flex items-center px-4 gap-2 select-none">
              <div className="w-3 h-3 border-2 border-rose-border bg-rose-love rounded-full" />
              <div className="w-3 h-3 border-2 border-rose-border bg-rose-gold rounded-full" />
              <div className="w-3 h-3 border-2 border-rose-border bg-rose-foam rounded-full" />
              <div className="ml-6 px-4 py-1 bg-rose-surface border-2 border-rose-border text-[11px] font-mono font-black text-rose-muted flex-1 max-w-xs mx-auto text-center">
                app.bulkreach.io / dashboard
              </div>
            </div>

            <div className="p-5 md:p-7 grid md:grid-cols-5 gap-4">
              {/* Sidebar mockup */}
              <div className="md:col-span-1 space-y-1.5">
                <div className="text-[8px] font-black uppercase tracking-widest text-rose-muted mb-3 select-none">Navigation</div>
                {[
                  { icon: BarChart3, label: "Dashboard", active: true },
                  { icon: Send, label: "Campaigns" },
                  { icon: FileText, label: "Templates" },
                  { icon: Search, label: "Job Scraper" },
                  { icon: Building2, label: "Company Research" },
                  { icon: Kanban, label: "Tracker" },
                  { icon: Target, label: "Resumes" },
                ].map(({ icon: Icon, label, active }) => (
                  <div key={label} className={`flex items-center gap-2 px-3 py-2 text-[10px] font-black border-2 transition-all duration-200 cursor-pointer ${active ? "border-rose-border bg-rose-pine text-white shadow-[2px_2px_0px_0px_var(--color-shadow)]" : "border-transparent text-rose-muted hover:text-rose-text hover:bg-rose-hl-low hover:border-rose-hl-high hover:-translate-x-[1px] hover:-translate-y-[1px]"}`}>
                    <Icon size={11} className="stroke-[2.5]" /> {label}
                  </div>
                ))}
              </div>

              {/* Main content mockup */}
              <div className="md:col-span-4 space-y-3">
                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "Emails Sent", value: "1,248", icon: Send, color: "text-rose-pine" },
                    { label: "Open Rate", value: "34.2%", icon: TrendingUp, color: "text-rose-foam" },
                    { label: "Applications", value: "47", icon: BriefcaseBusiness, color: "text-rose-iris" },
                    { label: "Recruiters Found", value: "31", icon: UserSearch, color: "text-rose-gold" },
                  ].map(({ label, value, icon: Icon, color }) => (
                    <div key={label} className="border-2 border-rose-border bg-rose-overlay p-3 transition-all duration-300 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] cursor-default">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] font-black uppercase tracking-wider text-rose-muted">{label}</span>
                        <Icon size={11} className={`${color} stroke-[2.5]`} />
                      </div>
                      <div className="text-lg font-black text-rose-text">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Two panel layout */}
                <div className="grid grid-cols-5 gap-3">
                  {/* Active campaigns */}
                  <div className="col-span-3 border-2 border-rose-border">
                    <div className="px-4 py-2 bg-rose-overlay border-b-2 border-rose-border flex items-center justify-between">
                      <span className="text-[9px] font-black uppercase tracking-widest text-rose-text">Active Campaigns</span>
                      <span className="text-[8px] font-black text-rose-pine border border-rose-pine px-2 py-0.5">View All</span>
                    </div>
                    {[
                      { name: "Senior SWE @ TechCorp", progress: 72, status: "Running", color: "bg-rose-foam" },
                      { name: "PM Outreach — Naukri Batch", progress: 45, status: "Running", color: "bg-rose-pine" },
                      { name: "Startup Founders Cold Email", progress: 18, status: "Queued", color: "bg-rose-gold" },
                    ].map((c) => (
                      <div key={c.name} className="px-4 py-2.5 flex items-center gap-3 border-b border-rose-border/20 last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <div className="text-[10px] font-extrabold text-rose-text truncate">{c.name}</div>
                          <div className="mt-1 h-1.5 bg-rose-overlay border border-rose-border/30 relative overflow-hidden">
                            <div className={`absolute inset-y-0 left-0 ${c.color}`} style={{ width: `${c.progress}%` }} />
                          </div>
                        </div>
                        <span className={`text-[8px] font-black px-1.5 py-0.5 border uppercase ${c.status === "Running" ? "border-rose-foam text-rose-foam" : "border-rose-gold text-rose-gold"}`}>{c.status}</span>
                      </div>
                    ))}
                  </div>

                  {/* Kanban preview */}
                  <div className="col-span-2 border-2 border-rose-border">
                    <div className="px-3 py-2 bg-rose-overlay border-b-2 border-rose-border">
                      <span className="text-[9px] font-black uppercase tracking-widest text-rose-text flex items-center gap-1.5"><Kanban size={10} /> Application Tracker</span>
                    </div>
                    <div className="p-2 grid grid-cols-3 gap-1.5 text-[8px]">
                      {[
                        { col: "Applied", count: 12, color: "border-rose-pine text-rose-pine" },
                        { col: "Interview", count: 4, color: "border-rose-iris text-rose-iris" },
                        { col: "Offer", count: 1, color: "border-rose-foam text-rose-foam" },
                      ].map(({ col, count, color }) => (
                        <div key={col}>
                          <div className={`font-black uppercase border-b ${color} mb-1.5 pb-1`}>{col} <span className="opacity-60">({count})</span></div>
                          <div className="space-y-1">
                            {[...Array(Math.min(count, 2))].map((_, i) => (
                              <div key={i} className="bg-rose-overlay border border-rose-border p-1 font-bold text-rose-muted leading-none">
                                Role #{i + 1}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── Stats Bar ── */}
      <section className="border-y-2 border-rose-border bg-rose-overlay mt-16">
        <div className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-2 md:grid-cols-5 gap-8 text-center">
          {[
            { label: "Emails Delivered", value: 1200000, suffix: "+" },
            { label: "Jobs Scraped", value: 50000, suffix: "+" },
            { label: "Recruiters Found", value: 8500, suffix: "+" },
            { label: "Avg. Open Rate", value: 34, suffix: "%" },
            { label: "Starter Templates", value: 20, suffix: "+" },
          ].map(({ label, value, suffix }) => (
            <div key={label} className="flex flex-col items-center">
              <div className="text-3xl md:text-4xl font-black text-rose-text tracking-tight">
                <AnimatedCounter target={value} suffix={suffix} />
              </div>
              <div className="text-[10px] font-bold text-rose-muted uppercase tracking-widest mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Core Modules ── */}
      <section id="modules" className="py-28 px-6 bg-rose-overlay border-b-2 border-rose-border">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-20">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-rose-iris text-rose-iris bg-rose-iris/10 text-xs font-black uppercase tracking-widest mb-6">
              <Layout size={12} /> Platform Modules
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-black text-rose-text tracking-tight uppercase leading-tight mb-4">
              8 Powerful Modules,<br /><span className="text-rose-pine">One Platform</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-rose-muted font-semibold text-lg max-w-2xl mx-auto">
              Every tool you need to go from finding a job listing to landing an interview — fully automated, AI-powered, and built for scale.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: Search, color: "text-rose-foam", bg: "bg-rose-foam/15", border: "border-rose-foam",
                title: "Job Scraper", badge: "Naukri",
                desc: "Scrape thousands of live job listings from Naukri with keywords, location, and salary filters. Runs in the background with live progress.",
                pills: ["Background processing", "Auto dedup", "Job URL tracking"]
              },
              {
                icon: UserSearch, color: "text-rose-pine", bg: "bg-rose-pine/15", border: "border-rose-pine",
                title: "AI Recruiter Finder", badge: "Gemini AI",
                desc: "Automatically extracts the hiring manager's name, email, and LinkedIn URL from each job posting. Falls back to company HR if direct recruiter isn't found.",
                pills: ["LinkedIn URL extraction", "HR fallback", "Bulk scan all"]
              },
              {
                icon: Building2, color: "text-rose-iris", bg: "bg-rose-iris/15", border: "border-rose-iris",
                title: "Company Research", badge: "Enrichment",
                desc: "Deep-dive into any company — find all employees, HR contacts, and decision-makers. Powers the recruiter fallback system.",
                pills: ["Employee discovery", "HR contacts", "LinkedIn profiles"]
              },
              {
                icon: Send, color: "text-rose-love", bg: "bg-rose-love/15", border: "border-rose-love",
                title: "Email Campaigns", badge: "Core",
                desc: "Send thousands of hyper-personalized emails with dynamic variables, configurable delays, and real-time send logs.",
                pills: ["Dynamic variables", "Rate limiting", "Live logs"]
              },
              {
                icon: FileText, color: "text-rose-gold", bg: "bg-rose-gold/15", border: "border-rose-gold",
                title: "Template Editor", badge: "WYSIWYG",
                desc: "Rich HTML email editor with AI generation, 20+ starter templates, live preview, email client simulation, and spam score analysis.",
                pills: ["Gmail / Outlook / Apple Mail preview", "Spam checker", "AI writer"]
              },
              {
                icon: Kanban, color: "text-rose-pine", bg: "bg-rose-pine/15", border: "border-rose-pine",
                title: "Application Tracker", badge: "Kanban",
                desc: "Visual drag-and-drop Kanban board to track every application — Applied, Screening, Interview, Offer, Rejected. Auto-populated from campaigns.",
                pills: ["Kanban board", "LinkedIn & Job URL", "Stage automation"]
              },
              {
                icon: Mail, color: "text-rose-foam", bg: "bg-rose-foam/15", border: "border-rose-foam",
                title: "Gmail Integration", badge: "OAuth2",
                desc: "Connect your own Gmail account for maximum deliverability. Emails land in the primary inbox — every time. Your reputation stays intact.",
                pills: ["Official OAuth2", "Open tracking", "No SMTP needed"]
              },
              {
                icon: Shield, color: "text-rose-iris", bg: "bg-rose-iris/15", border: "border-rose-iris",
                title: "Spam Checker", badge: "Anti-Spam",
                desc: "SpamAssassin-style real-time scoring for every template. Warns about trigger words, missing unsubscribe links, ALL CAPS, and too many links.",
                pills: ["Live score badge", "30+ trigger words", "0–10 risk rating"]
              },
            ].map((feature, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }}
                variants={fadeUp} transition={{ delay: (i % 4) * 0.07 }}>
                <FeatureCard {...feature} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features Deep-Dive ── */}
      <section id="features" className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-80px" }} variants={stagger} className="text-center mb-20">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-rose-pine text-rose-pine bg-rose-pine/10 text-xs font-black uppercase tracking-widest mb-6">
              <Sparkles size={12} /> Why TalentStream
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-black text-rose-text tracking-tight uppercase leading-tight mb-4">
              Smarter Than<br /><span className="text-rose-pine">Manual Job Hunting</span>
            </motion.h2>
          </motion.div>

          <div className="space-y-6">
            {[
              {
                icon: ScanSearch, title: "AI Extracts Recruiters Automatically",
                color: "text-rose-foam", bg: "bg-rose-foam/10", accent: "border-rose-foam",
                dir: "left",
                desc: "After scraping a job listing, one click runs AI analysis on the posting page to extract the hiring manager's name, email, and LinkedIn profile. If the direct recruiter isn't found, it automatically falls back to finding other HR employees at the same company from your Company Research database.",
                pills: ["Specific recruiter detection", "Generic email detection (careers@, hr@)", "Company HR fallback list", "LinkedIn URL extraction"]
              },
              {
                icon: Kanban, title: "Visual Application Tracker",
                color: "text-rose-pine", bg: "bg-rose-pine/10", accent: "border-rose-pine",
                dir: "right",
                desc: "A full Kanban board tracks your job applications through every stage — Applied, Screening, Interview, Offer, Rejected, Withdrawn. When you send a campaign, applications are automatically created. Each card stores the job URL, LinkedIn URL, company, recruiter name and email, and application notes.",
                pills: ["Auto-created from campaigns", "Drag & drop stages", "LinkedIn + Job URL per card", "Export to CSV"]
              },
              {
                icon: Monitor, title: "Email Client Preview + Spam Score",
                color: "text-rose-iris", bg: "bg-rose-iris/10", accent: "border-rose-iris",
                dir: "left",
                desc: "Preview your email template exactly as it appears in Gmail, Outlook, and Apple Mail — complete with proper fonts and client chrome. A real-time spam score (0–10) updates as you type, warning about trigger words, missing unsubscribe links, ALL CAPS subject lines, and excessive links.",
                pills: ["Gmail / Outlook / Apple Mail render", "SpamAssassin-style scoring", "Live badge in editor header", "Full details on click"]
              },
              {
                icon: Smartphone, title: "Full Mobile-Responsive UI",
                color: "text-rose-gold", bg: "bg-rose-gold/10", accent: "border-rose-gold",
                dir: "right",
                desc: "Every page works beautifully on mobile with a sliding drawer navigation, touch-friendly Kanban cards, and responsive tables. The sidebar collapses on desktop and transforms into a full-screen drawer on mobile with smooth animations.",
                pills: ["Hamburger menu + drawer", "Touch-friendly cards", "Responsive everywhere", "Smooth animations"]
              },
            ].map((step, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
                variants={step.dir === "left" ? fadeLeft : fadeRight}
                className="flex flex-col md:flex-row items-start gap-8 p-8 border-2 border-rose-border bg-rose-surface shadow-[4px_4px_0px_0px_var(--color-hl-med)]">
                <div className={`flex-shrink-0 w-20 h-20 border-2 border-rose-border flex items-center justify-center ${step.bg} shadow-[3px_3px_0px_0px_var(--color-shadow)]`}>
                  <step.icon size={28} className={`${step.color} stroke-[2]`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-[10px] font-black border-2 ${step.accent} ${step.color} px-2 py-1 uppercase tracking-widest`}>Feature</span>
                    <h3 className="text-xl font-black text-rose-text uppercase tracking-tight">{step.title}</h3>
                  </div>
                  <p className="text-rose-muted font-semibold leading-relaxed mb-4">{step.desc}</p>
                  <div className="flex flex-wrap gap-3">
                    {step.pills.map((d) => (
                      <span key={d} className="flex items-center gap-1 text-xs font-bold text-rose-subtle">
                        <CheckCircle size={11} className={step.color} /> {d}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-28 px-6 bg-rose-overlay border-y-2 border-rose-border">
        <div className="max-w-5xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-20">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-rose-gold text-rose-gold bg-rose-gold/10 text-xs font-black uppercase tracking-widest mb-6">
              <Clock size={12} /> Get Running in Minutes
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-black text-rose-text tracking-tight uppercase leading-tight mb-4">
              From Zero to Sending<br /><span className="text-rose-iris">in 5 Minutes</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-rose-muted font-semibold text-lg max-w-xl mx-auto">
              No engineering degree required. Just connect Gmail, scrape jobs, and launch.
            </motion.p>
          </motion.div>

          <div className="space-y-5">
            {[
              { step: "01", icon: Mail, title: "Connect Your Gmail", color: "text-rose-pine", bg: "bg-rose-pine/10", accent: "border-rose-pine", desc: "One-click Google OAuth. Your emails send from your real Gmail address — no shared IPs, no cold SMTP. Your reputation stays intact.", pills: ["Zero password storage", "Official OAuth2", "Multiple accounts"] },
              { step: "02", icon: Search, title: "Scrape Jobs + Find Recruiters", color: "text-rose-foam", bg: "bg-rose-foam/10", accent: "border-rose-foam", desc: "Run the Naukri scraper to extract hundreds of live job listings. Then hit 'AI Scan' to automatically find each recruiter's name, email, and LinkedIn.", pills: ["Background scraping", "AI recruiter extraction", "LinkedIn URL tracking"] },
              { step: "03", icon: Sparkles, title: "Generate AI Email Templates", color: "text-rose-iris", bg: "bg-rose-iris/10", accent: "border-rose-iris", desc: "Upload your resume, pick a target job role, and let Gemini AI write a beautiful personalized email template. Check the spam score before sending.", pills: ["Resume-aware AI", "Spam score analysis", "20+ starter templates"] },
              { step: "04", icon: Zap, title: "Launch Campaign + Track Applications", color: "text-rose-love", bg: "bg-rose-love/10", accent: "border-rose-love", desc: "Hit Launch. TalentStream sends all emails with rate limiting, tracks opens, and automatically adds each application to your Kanban board.", pills: ["Live progress tracking", "Auto application tracking", "Export send logs"] },
            ].map((step, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }}
                variants={i % 2 === 0 ? fadeLeft : fadeRight}
                className="flex flex-col md:flex-row items-start gap-8 p-8 border-2 border-rose-border bg-rose-surface shadow-[4px_4px_0px_0px_var(--color-hl-med)]">
                <div className={`flex-shrink-0 w-20 h-20 border-2 border-rose-border flex items-center justify-center ${step.bg} shadow-[3px_3px_0px_0px_var(--color-shadow)]`}>
                  <step.icon size={28} className={`${step.color} stroke-[2]`} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-[10px] font-black border-2 ${step.accent} ${step.color} px-2 py-1 uppercase tracking-widest`}>Step {step.step}</span>
                    <h3 className="text-xl font-black text-rose-text uppercase tracking-tight">{step.title}</h3>
                  </div>
                  <p className="text-rose-muted font-semibold leading-relaxed mb-4">{step.desc}</p>
                  <div className="flex flex-wrap gap-2">
                    {step.pills.map((d) => (
                      <span key={d} className="flex items-center gap-1 text-xs font-bold text-rose-subtle">
                        <CheckCircle size={11} className={step.color} /> {d}
                      </span>
                    ))}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Template Showcase ── */}
      <section className="py-28 px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-rose-love text-rose-love bg-rose-love/10 text-xs font-black uppercase tracking-widest mb-6">
              <FileText size={12} /> Template Library
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-black text-rose-text tracking-tight uppercase leading-tight mb-4">
              20+ Premium<br /><span className="text-rose-love">Email Templates</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-rose-muted font-semibold text-lg max-w-xl mx-auto">
              Every template has gradient headers, dynamic variables, and spam-score analysis built in. Preview in Gmail, Outlook, or Apple Mail before you send.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Cold Job Application", icon: Mail, from: "#2d4a3e", to: "#1a7a4a" },
              { name: "Job App Follow-up", icon: Clock, from: "#3d2b4a", to: "#6b3fa0" },
              { name: "Recruiter Outreach", icon: UserSearch, from: "#1a4a6e", to: "#2d7eb5" },
              { name: "Referral Request", icon: Link, from: "#6b4a1a", to: "#c47d1a" },
              { name: "Thank You — Interview", icon: Sparkles, from: "#1e2d3d", to: "#2d4a6b" },
              { name: "Salary Negotiation", icon: DollarSign, from: "#5a3a1a", to: "#a06b2d" },
              { name: "Offer Acceptance", icon: CheckCircle, from: "#1a4a2d", to: "#2d7a4a" },
              { name: "Networking Outreach", icon: Rocket, from: "#3a1a4a", to: "#6b2d9a" },
            ].map((t, i) => {
              const IconComponent = t.icon;
              return (
                <motion.div key={i} initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }} transition={{ delay: i * 0.05 }}
                  className="border-2 border-rose-border overflow-hidden group cursor-pointer hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all duration-200">
                  <div className="h-20 flex items-center justify-center relative"
                    style={{ backgroundImage: `linear-gradient(135deg, ${t.from} 0%, ${t.to} 100%)` }}>
                    <IconComponent size={24} className="text-white" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                  </div>
                  <div className="p-3 bg-rose-surface">
                    <p className="text-[10px] font-black text-rose-text uppercase tracking-tight leading-tight">{t.name}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center mt-10">
            <button onClick={handleCTA} className="btn-secondary px-8 py-3 font-bold text-sm flex items-center gap-2 mx-auto hover:shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all">
              Browse All 20+ Templates <ArrowRight size={16} />
            </button>
          </motion.div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="testimonials" className="py-28 px-6 bg-rose-overlay border-y-2 border-rose-border">
        <div className="max-w-6xl mx-auto">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="text-center mb-16">
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-rose-gold text-rose-gold bg-rose-gold/10 text-xs font-black uppercase tracking-widest mb-6">
              <Star size={12} fill="currentColor" /> Loved by Job Seekers
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-5xl font-black text-rose-text tracking-tight uppercase leading-tight mb-4">
              Real Results,<br /><span className="text-rose-gold">Real Interviews</span>
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Arjun Sharma", role: "Senior SWE @ Razorpay", avatar: "AS", color: "bg-rose-pine", quote: "I landed 3 interviews in my first week using TalentStream. The AI recruiter finder is insane — it found direct hiring manager emails for 80% of Naukri listings I scraped." },
              { name: "Priya Mehta", role: "Product Manager @ Zepto", avatar: "PM", color: "bg-rose-iris", quote: "The Kanban tracker alone is worth it. All my applications auto-populate when campaigns send, and I can track every stage. Went from chaos to complete clarity." },
              { name: "Rahul Verma", role: "DevRel @ Sentry", avatar: "RV", color: "bg-rose-foam", quote: "Best outreach tool I've used. The spam checker saved me — I had 'limited time offer' in my subject line and it flagged it before I sent 200 emails." },
              { name: "Sanya Kapoor", role: "Freelance Designer", avatar: "SK", color: "bg-rose-love", quote: "The Company Research module found me HR contacts at companies that had no public job listings. Got a role that was never even posted on any job board." },
              { name: "Dev Patel", role: "ML Engineer @ Anthropic", avatar: "DP", color: "bg-rose-gold", quote: "Setup is genuinely 5 minutes. Connect Gmail, scrape Naukri, AI scan for recruiters, pick a template, launch. The whole flow just works." },
              { name: "Neha Singh", role: "Startup Founder", avatar: "NS", color: "bg-rose-pine", quote: "We use TalentStream for B2B cold email. The email client preview is brilliant — we caught a broken layout in Outlook before it went to 400 leads." },
            ].map((t, i) => (
              <motion.div key={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-30px" }}
                variants={fadeUp} transition={{ delay: (i % 3) * 0.1 }}
                className="card p-6 flex flex-col gap-5">
                <div className="flex">
                  {[...Array(5)].map((_, j) => <Star key={j} size={13} className="text-rose-gold fill-rose-gold" />)}
                </div>
                <p className="text-rose-muted font-semibold leading-relaxed text-sm flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-4 border-t-2 border-rose-border">
                  <div className={`w-10 h-10 ${t.color} border-2 border-rose-border flex items-center justify-center text-white text-xs font-black`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-black text-rose-text">{t.name}</div>
                    <div className="text-xs font-bold text-rose-muted">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack ── */}
      <section className="py-20 px-6 border-b-2 border-rose-border">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger}>
            <motion.p variants={fadeUp} className="text-xs font-black text-rose-muted uppercase tracking-widest mb-10">
              Built with Industry-Leading Technology
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap items-center justify-center gap-3">
              {[
                { name: "React + TypeScript", icon: <Cpu size={15} className="text-rose-pine" /> },
                { name: "Django REST", icon: <Database size={15} className="text-rose-pine" /> },
                { name: "Gemini AI", icon: <Sparkles size={15} className="text-rose-gold" /> },
                { name: "Gmail API", icon: <Mail size={15} className="text-rose-love" /> },
                { name: "PostgreSQL", icon: <Database size={15} className="text-rose-iris" /> },
                { name: "Celery + Redis", icon: <Zap size={15} className="text-rose-gold" /> },
                { name: "RTK Query", icon: <Rocket size={15} className="text-rose-pine" /> },
                { name: "Framer Motion", icon: <Layout size={15} className="text-rose-love" /> },
              ].map(({ name, icon }) => (
                <div key={name} className="flex items-center gap-2 px-4 py-2.5 border-2 border-rose-border bg-rose-surface text-sm font-bold text-rose-text hover:bg-rose-overlay hover:-translate-y-0.5 transition-all duration-200 cursor-default">
                  {icon} {name}
                </div>
              ))}
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-32 px-6">
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={stagger} className="max-w-4xl mx-auto">
          <div className="relative border-2 border-rose-border bg-rose-surface p-12 md:p-20 text-center shadow-[12px_12px_0px_0px_var(--color-hl-med)] overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-rose-pine/5 border-l-2 border-b-2 border-rose-border/10" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-foam/5 border-r-2 border-t-2 border-rose-border/10" />
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 border-2 border-rose-border bg-rose-overlay text-xs font-black uppercase tracking-widest text-rose-muted mb-8">
              <Zap size={12} className="text-rose-pine" /> Free to Start — No Credit Card
            </motion.div>
            <motion.h2 variants={fadeUp} className="text-4xl md:text-6xl font-black text-rose-text tracking-tight uppercase leading-tight mb-6">
              Ready to Land<br /><span className="text-rose-pine">Your Dream Job?</span>
            </motion.h2>
            <motion.p variants={fadeUp} className="text-rose-muted text-lg font-semibold mb-10 max-w-xl mx-auto leading-relaxed">
              Join professionals automating their job search with TalentStream. Scrape, find recruiters, send personalized emails, and track every application — all in one place.
            </motion.p>
            <motion.div variants={fadeUp}>
              <button onClick={handleCTA} className="btn-primary px-12 py-5 text-lg font-extrabold flex items-center justify-center gap-2 mx-auto shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:shadow-[6px_6px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all duration-300">
                <Zap size={20} className="fill-white" />
                {isAuthenticated ? "Go to Dashboard" : "Start For Free"}
              </button>
            </motion.div>
            <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center justify-center gap-6 text-xs font-bold text-rose-muted">
              {[
                { icon: CheckCircle, text: "Free forever plan" },
                { icon: Lock, text: "No passwords stored" },
                { icon: ShieldCheck, text: "Gmail-safe sending" },
                { icon: Cpu, text: "Gemini AI included" },
                { icon: Database, text: "Your data, your control" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5">
                  <Icon size={12} className="text-rose-foam" /> {text}
                </span>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t-2 border-rose-border bg-rose-surface">
        <div className="max-w-6xl mx-auto px-6 py-16 grid md:grid-cols-4 gap-10">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-rose-pine border-2 border-rose-border flex items-center justify-center shadow-[2px_2px_0px_0px_var(--color-shadow)]">
                <Zap size={14} className="text-white fill-white" />
              </div>
              <span className="font-black text-rose-text text-base uppercase tracking-tight">TalentStream</span>
              <span className="text-[9px] font-black border border-rose-foam text-rose-foam px-1.5 py-0.5">v2.5</span>
            </div>
            <p className="text-rose-muted text-sm font-semibold leading-relaxed max-w-xs">
              The complete AI-powered job application platform. Scrape, research, email, and track — all in one neobrutalist interface.
            </p>
            <div className="flex flex-wrap gap-2 mt-5">
              {["Job Scraper", "AI Recruiter", "Gmail Native", "Kanban Tracker"].map(t => (
                <span key={t} className="text-[10px] font-black text-rose-pine border border-rose-pine/40 px-2 py-0.5 bg-rose-pine/5">{t}</span>
              ))}
            </div>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-rose-text mb-4">Platform</h4>
            <ul className="space-y-2.5">
              {["Job Scraper", "Company Research", "Email Campaigns", "Application Tracker", "Template Editor"].map(l => (
                <li key={l}><button className="text-sm font-semibold text-rose-muted hover:text-rose-text transition-colors">{l}</button></li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-rose-text mb-4">Resources</h4>
            <ul className="space-y-2.5">
              {["Documentation", "Gmail Setup Guide", "Template Library", "Privacy Policy", "Terms of Service"].map(l => (
                <li key={l}><button className="text-sm font-semibold text-rose-muted hover:text-rose-text transition-colors">{l}</button></li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t-2 border-rose-border px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-6xl mx-auto">
          <p className="text-xs font-bold text-rose-muted">© {new Date().getFullYear()} TalentStream. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs font-bold text-rose-muted">
            <span className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full bg-rose-foam opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 bg-rose-foam" />
              </span>
              All systems operational
            </span>
            <span>·</span>
            <span>v2.5.0</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
