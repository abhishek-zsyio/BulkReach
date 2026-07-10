import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft, Save, Sparkles, X, Mail, Clock, Users, Link, DollarSign,
  CheckCircle, XCircle, Target, FileText, Calendar, ThumbsUp, Zap,
  Flame, Monitor, Gift, Megaphone, Lock, Ticket, Rocket, Shield
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useGenerateTemplateMutation,
} from "@/api/campaignApi";
import { useGetResumesQuery } from "@/api/resumeApi";
import { RichTemplateEditor } from "@/components/template/RichTemplateEditor";
import { STARTER_TEMPLATES } from "@/components/template/starterTemplates";
import { SpamChecker } from "@/components/template/SpamChecker";
import { useAuth } from "@/hooks/useAuth";
import { CustomSelect } from "@/components/ui/CustomSelect";
import toast from "react-hot-toast";

function getStarterTemplateIcon(iconName: string) {
  const props = { size: 20, className: "text-rose-text transition-colors" };
  switch (iconName) {
    case "mail": return <Mail {...props} />;
    case "clock": return <Clock {...props} />;
    case "users": return <Users {...props} />;
    case "link": return <Link {...props} />;
    case "sparkles": return <Sparkles {...props} />;
    case "dollar-sign": return <DollarSign {...props} />;
    case "check-circle": return <CheckCircle {...props} />;
    case "x-circle": return <XCircle {...props} />;
    case "target": return <Target {...props} />;
    case "file-text": return <FileText {...props} />;
    case "calendar": return <Calendar {...props} />;
    case "thumbs-up": return <ThumbsUp {...props} />;
    case "zap": return <Zap {...props} />;
    case "flame": return <Flame {...props} />;
    case "monitor": return <Monitor {...props} />;
    case "gift": return <Gift {...props} />;
    case "megaphone": return <Megaphone {...props} />;
    case "lock": return <Lock {...props} />;
    case "ticket": return <Ticket {...props} />;
    case "rocket": return <Rocket {...props} />;
    default: return <FileText {...props} />;
  }
}

export function TemplateEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const isNew = id === "new";
  const templateId = isNew ? 0 : Number(id);

  const { data: existing, isLoading: isLoadingExisting } = useGetTemplateQuery(templateId, { skip: isNew });
  const [createTemplate, { isLoading: creating }] = useCreateTemplateMutation();
  const [updateTemplate, { isLoading: updating }] = useUpdateTemplateMutation();

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState(
    "<p>Dear {{ recipient_name }},</p><p></p><p>Best regards,<br/>{{ sender_name }}</p>"
  );
  
  const [showStarterModal, setShowStarterModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiJobRole, setAiJobRole] = useState("");
  const [aiSelectedResumeId, setAiSelectedResumeId] = useState<string>("");
  const [aiPreviewData, setAiPreviewData] = useState<{ subject: string; html_body: string } | null>(null);

  const { data: resumes = [] } = useGetResumesQuery();
  const [generateTemplate, { isLoading: isGenerating }] = useGenerateTemplateMutation();

  const [helperTab, setHelperTab] = useState<"variables" | "tips">("variables");
  const [rightTab, setRightTab] = useState<"preview" | "spam">("preview");
  const [clientTab, setClientTab] = useState<"gmail" | "outlook" | "apple">("gmail");
  const [showSpamModal, setShowSpamModal] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Set default resume if available
  useEffect(() => {
    if (resumes.length > 0 && !aiSelectedResumeId) {
      const def = resumes.find(r => r.is_default);
      if (def) setAiSelectedResumeId(String(def.id));
      else setAiSelectedResumeId(String(resumes[0].id));
    }
  }, [resumes, aiSelectedResumeId]);

  const handleAiGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiJobRole.trim()) {
      toast.error("Please enter a target job role.");
      return;
    }
    try {
      const payload: { job_role: string; resume_id?: number } = {
        job_role: aiJobRole,
      };
      if (aiSelectedResumeId) payload.resume_id = Number(aiSelectedResumeId);
      
      const res = await generateTemplate(payload).unwrap();
      setAiPreviewData(res);
      toast.success("AI generated your template details!");
    } catch (err: any) {
      const msg = err?.data?.message || "Failed to generate AI template.";
      toast.error(msg);
      console.error(err);
    }
  };

  const handleApplyAiTemplate = () => {
    if (aiPreviewData) {
      setHtmlBody(aiPreviewData.html_body);
      setName(aiJobRole ? `${aiJobRole} Outreach Template` : "AI Generated Template");
      setSubject(aiPreviewData.subject);
      setAiPreviewData(null);
      setShowAiModal(false);
      toast.success("AI template loaded into editor!");
    }
  };

  useEffect(() => {
    if (existing && !isNew) {
      setName(existing.name);
      setSubject(existing.subject || "");
      setHtmlBody(existing.html_body);
      setIsInitialized(true);
    } else if (isNew) {
      setIsInitialized(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, isNew]);

  // Extract variables locally
  const variables = Array.from(
    new Set(
      (htmlBody.match(/\{\{\s*(\w+)\s*\}\}/g) ?? []).map((v) =>
        v.replace(/[{}]/g, "").trim()
      )
    )
  );

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Template name is required."); return; }
    if (!htmlBody.trim()) { toast.error("Template body is required."); return; }
    
    try {
      if (isNew) {
        const t = await createTemplate({ name, subject, html_body: htmlBody }).unwrap();
        toast.success("Template created!");
        navigate(`/templates/${t.id}/edit`, { replace: true });
      } else {
        await updateTemplate({ id: templateId, data: { name, subject, html_body: htmlBody } }).unwrap();
        toast.success("Template saved!");
      }
    } catch {
      toast.error("Failed to save template.");
    }
  };

  const loadStarterTemplate = (templateHtml: string, templateName?: string, templateSubject?: string) => {
    setHtmlBody(templateHtml);
    if (templateName) setName(templateName);
    if (templateSubject) setSubject(templateSubject);
    setShowStarterModal(false);
    toast.success("Template loaded! You can now edit and customize it.");
  };

  const isSaving = creating || updating;

  // Render a live preview by replacing variables with sample data
  const sample: Record<string, string> = {
    recipient_name: "Jane Smith",
    company_name: "TechCorp Inc.",
    job_title: "Software Engineer",
    sender_name: user?.first_name || user?.username || "Alex Johnson",
    sender_email: user?.sender_email || "you@example.com",
  };

  let renderedHtml = htmlBody;
  for (const [key, val] of Object.entries(sample)) {
    renderedHtml = renderedHtml.replaceAll(`{{ ${key} }}`, val).replaceAll(`{{${key}}}`, val);
  }

  // Live spam score (updates on every subject/body change)
  const spamResult = useMemo(() => {
    // inline mini-score using same logic as SpamChecker
    const textContent = htmlBody.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const spamWords = ["free","guaranteed","winner","prize","cash","earn money","make money","credit card","casino","click here","unlimited","no cost","100%","risk free","act now","limited time","special offer","exclusive deal","buy now","order now","congratulations","urgent","pre-approved","opportunity","million","profit","investment","income","work from home"];
    let score = 0;
    const lc = textContent.toLowerCase();
    const ls = subject.toLowerCase();
    const capsWords = subject.trim().split(/\s+/).filter(w => w.length > 2 && w === w.toUpperCase() && /[A-Z]/.test(w));
    if (capsWords.length >= 2) score += 2.0;
    const excl = (subject.match(/!/g) || []).length;
    if (excl >= 2) score += 1.5;
    const subjectHits = spamWords.filter(w => ls.includes(w)).length;
    score += subjectHits * 0.8;
    const bodyHits = spamWords.filter(w => lc.includes(w)).length;
    score += Math.min(bodyHits * 0.3, 2.5);
    const linkCount = (htmlBody.match(/<a\s[^>]*href/gi) || []).length;
    if (linkCount > 5) score += Math.min((linkCount - 5) * 0.4, 2.0);
    if (!lc.includes("unsubscribe") && !lc.includes("opt out")) score += 0.8;
    const totalScore = Math.min(score, 10);
    if (totalScore <= 1.5) return { score: totalScore, grade: "excellent", color: "text-rose-foam", bg: "bg-rose-foam/15", border: "border-rose-foam/40", label: "Excellent" };
    if (totalScore <= 3.5) return { score: totalScore, grade: "good", color: "text-rose-pine", bg: "bg-rose-pine/15", border: "border-rose-pine/40", label: "Good" };
    if (totalScore <= 6)   return { score: totalScore, grade: "caution", color: "text-rose-gold", bg: "bg-rose-gold/15", border: "border-rose-gold/40", label: "Caution" };
    return { score: totalScore, grade: "danger", color: "text-rose-love", bg: "bg-rose-love/15", border: "border-rose-love/40", label: "High Risk" };
  }, [subject, htmlBody]);

  if (!isInitialized || (!isNew && isLoadingExisting)) {
    return (
      <div className="flex flex-col h-64 items-center justify-center gap-4 text-rose-subtle animate-pulse">
        <div className="w-8 h-8 rounded-none border-2 border-rose-pine border-t-transparent animate-spin" />
        <p className="text-xs font-extrabold text-rose-text uppercase tracking-widest">Loading template...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 animate-fade-in pb-12">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate("/templates")} className="btn-secondary p-2">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="text-3xl font-extrabold text-rose-text tracking-tight">
              {isNew ? "New Template" : "Edit Template"}
            </h1>
            <p className="text-rose-subtle mt-1 text-sm font-medium">
              Create and manage your email content layout.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Live spam score badge — always visible */}
          <button
            type="button"
            onClick={() => {
              setShowSpamModal(true);
              setRightTab("spam");
            }}
            className={`flex items-center gap-2 px-3 py-2 border-2 ${spamResult.border} ${spamResult.bg} transition-all hover:scale-[1.02] active:scale-100`}
            title="View Spam Analysis"
          >
            <Shield size={13} className={spamResult.color} />
            <span className={`text-xs font-extrabold tabular-nums ${spamResult.color}`}>
              {spamResult.score.toFixed(1)}/10
            </span>
            <span className={`text-[10px] font-extrabold uppercase tracking-wider hidden sm:inline ${spamResult.color}`}>
              {spamResult.label}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowAiModal(true)}
            className="btn-primary text-sm flex items-center gap-2 font-bold"
          >
            <Sparkles size={14} className="text-white fill-white" />
            AI Writer
          </button>

          <button
            type="button"
            onClick={() => setShowStarterModal(true)}
            className="btn-secondary text-sm flex items-center gap-2 font-bold bg-rose-surface"
          >
            <Sparkles size={14} className="text-rose-pine stroke-[2.5]" />
            Template Library
          </button>
          
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn-primary text-sm font-bold flex items-center gap-2 min-w-[120px] justify-center"
          >
            {isSaving ? (
              <span className="animate-spin rounded-none h-4 w-4 border-2 border-white/30 border-t-white" />
            ) : (
              <><Save size={15} /> Save Template</>
            )}
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="grid grid-cols-1 md:grid-cols-2 gap-4"
      >
        <div className="card bg-rose-surface">
          <label className="label">Template Name <span className="text-rose-love font-black">*</span></label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input text-lg font-bold"
            placeholder="e.g. Cold Job Application"
            required
          />
          <p className="text-xs text-rose-muted mt-2 font-semibold">
            Internal name for identifying this template in the dashboard.
          </p>
        </div>
        <div className="card bg-rose-surface">
          <label className="label">Default Subject Line <span className="text-rose-love font-black">*</span></label>
          <input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="input text-lg font-bold"
            placeholder="e.g. Application: {{ job_title }} at {{ company_name }}"
            required
          />
          <p className="text-xs text-rose-muted mt-2 font-semibold">
            Default subject line template. You can use {"{{ variable }}"} placeholders here.
          </p>
        </div>
      </motion.div>

      {/* ── Main Workspace ── */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: "easeOut" }}
        className="flex flex-col lg:flex-row gap-6"
      >
        
        {/* Left Panel: Editor & Helpers */}
        <div className="w-full lg:w-1/2 flex flex-col space-y-6">
          <div className="flex flex-col gap-2">
            <RichTemplateEditor
              value={htmlBody}
              onChange={setHtmlBody}
              variables={variables.length > 0 ? variables : ["recipient_name", "company_name", "job_title", "sender_name"]}
            />
          </div>

          {/* Variables and Tips Panel */}
          <div className="card !p-0 bg-rose-surface overflow-hidden shrink-0">
            <div className="flex border-b-2 border-rose-border bg-rose-overlay/40 px-3 py-2 gap-2">
              <button
                type="button"
                onClick={() => setHelperTab("variables")}
                className={`px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-none border-2 transition-all ${
                  helperTab === "variables"
                    ? "bg-rose-surface text-rose-pine border-rose-border"
                    : "text-rose-muted border-transparent hover:text-rose-text"
                }`}
              >
                Variables ({variables.length})
              </button>
              <button
                type="button"
                onClick={() => setHelperTab("tips")}
                className={`px-3 py-1.5 text-xs font-extrabold uppercase tracking-wider rounded-none border-2 transition-all ${
                  helperTab === "tips"
                    ? "bg-rose-surface text-rose-pine border-rose-border"
                    : "text-rose-muted border-transparent hover:text-rose-text"
                }`}
              >
                Tips & Help
              </button>
            </div>

            <div className="p-4 bg-rose-surface">
              <AnimatePresence mode="wait">
                <motion.div
                  key={helperTab}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.15 }}
                >
                  {helperTab === "variables" ? (
                    <div>
                      {variables.length === 0 ? (
                        <p className="text-rose-muted text-xs font-semibold">
                          No variables detected. Use{" "}
                          <code className="text-rose-love bg-rose-love/15 px-1.5 py-0.5 border border-rose-border font-mono">
                            {"{{ variable_name }}"}
                          </code>
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <AnimatePresence>
                            {variables.map((v) => (
                               <motion.span
                                 layout
                                 initial={{ opacity: 0, scale: 0.8 }}
                                 animate={{ opacity: 1, scale: 1 }}
                                 exit={{ opacity: 0, scale: 0.8 }}
                                 transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                 key={v}
                                 className="text-xs font-mono font-extrabold px-2 py-1 rounded-none bg-rose-overlay border-2 border-rose-border text-rose-love"
                               >
                                 {`{{${v}}}`}
                               </motion.span>
                            ))}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  ) : (
                    <ul className="text-xs text-rose-muted font-bold space-y-2">
                      <li className="flex gap-2 items-start"><span className="text-rose-love font-extrabold">•</span> Use HTML mode to paste full email designs.</li>
                      <li className="flex gap-2 items-start"><span className="text-rose-love font-extrabold">•</span> Variables match column headers in your spreadsheet exactly.</li>
                    </ul>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Panel: Preview & Spam Checker */}
        <div className="hidden lg:flex w-1/2 flex-col bg-rose-surface border-2 border-rose-border overflow-hidden">
          {/* Right panel tab bar */}
          <div className="flex items-center border-b-2 border-rose-border bg-rose-hl-low shrink-0">
            <button
              onClick={() => setRightTab("preview")}
              className={`px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider border-r-2 border-rose-border transition-all ${
                rightTab === "preview"
                  ? "text-rose-pine bg-rose-surface"
                  : "text-rose-muted hover:text-rose-text hover:bg-rose-hl-low"
              }`}
            >
              📧 Live Preview
            </button>
            <button
              onClick={() => setRightTab("spam")}
              className={`px-5 py-3 text-[10px] font-extrabold uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                rightTab === "spam"
                  ? "text-rose-pine bg-rose-surface"
                  : "text-rose-muted hover:text-rose-text hover:bg-rose-hl-low"
              }`}
            >
              🛡️ Spam Check
            </button>
          </div>

          {rightTab === "preview" && (
            <>
              {/* Email client tabs */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-rose-hl-med bg-rose-overlay/30 shrink-0">
                <span className="text-[9px] font-extrabold uppercase tracking-wider text-rose-muted mr-2">Client:</span>
                {(["gmail", "outlook", "apple"] as const).map(c => (
                  <button
                    key={c}
                    onClick={() => setClientTab(c)}
                    className={`px-3 py-1 text-[9px] font-extrabold uppercase tracking-wider border transition-all ${
                      clientTab === c
                        ? "border-rose-border bg-rose-surface text-rose-pine"
                        : "border-transparent text-rose-muted hover:text-rose-text"
                    }`}
                  >
                    {c === "gmail" ? "Gmail" : c === "outlook" ? "Outlook" : "Apple Mail"}
                  </button>
                ))}
              </div>

              {/* From/To/Subject headers */}
              <div className="px-6 py-3 border-b border-rose-hl-med bg-rose-surface space-y-1.5 shrink-0" style={{
                fontFamily: clientTab === "outlook" ? "'Calibri', sans-serif" : clientTab === "apple" ? "'SF Pro', -apple-system, sans-serif" : "'Google Sans', Roboto, sans-serif"
              }}>
                <div className="flex gap-3 items-baseline">
                  <span className="w-14 text-[10px] font-extrabold text-rose-muted uppercase tracking-wider">From</span>
                  <span className="text-sm font-semibold text-rose-text">{sample.sender_email}</span>
                </div>
                <div className="flex gap-3 items-baseline">
                  <span className="w-14 text-[10px] font-extrabold text-rose-muted uppercase tracking-wider">To</span>
                  <span className="text-sm font-semibold text-rose-text">{sample.recipient_name} &lt;jane@example.com&gt;</span>
                </div>
                <div className="flex gap-3 items-baseline">
                  <span className="w-14 text-[10px] font-extrabold text-rose-muted uppercase tracking-wider">Subject</span>
                  <span className="text-sm font-bold text-rose-text">
                    {subject ? subject.replace(/\{\{\s*job_title\s*\}\}/g, "Software Engineer").replace(/\{\{\s*company_name\s*\}\}/g, "TechCorp Inc.") : "(Untitled)"}
                  </span>
                </div>
              </div>

              {/* Simulated client chrome */}
              <div className="flex-1 overflow-hidden relative">
                {clientTab === "gmail" && (
                  <div className="h-full flex flex-col">
                    <div className="px-4 py-1.5 bg-[#f6f6f6] border-b border-[#e0e0e0] flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-[#444]" style={{fontFamily:"'Google Sans',Roboto,sans-serif"}}>Gmail</span>
                      <span className="ml-auto text-[9px] text-[#666]" style={{fontFamily:"Roboto,sans-serif"}}>Inbox</span>
                    </div>
                    <iframe title="Gmail Preview" sandbox="allow-same-origin" srcDoc={renderedHtml} className="w-full flex-1 border-none bg-white" />
                  </div>
                )}
                {clientTab === "outlook" && (
                  <div className="h-full flex flex-col">
                    <div className="px-4 py-1.5 bg-[#0078d4] flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-bold text-white" style={{fontFamily:"'Calibri',sans-serif"}}>Outlook</span>
                      <span className="ml-auto text-[9px] text-blue-100">Inbox</span>
                    </div>
                    <iframe title="Outlook Preview" sandbox="allow-same-origin" srcDoc={`<style>body{font-family:'Calibri',sans-serif;font-size:11pt;line-height:1.5;margin:16px;color:#1f1f1f;background:#fff}</style>${renderedHtml}`} className="w-full flex-1 border-none bg-white" />
                  </div>
                )}
                {clientTab === "apple" && (
                  <div className="h-full flex flex-col">
                    <div className="px-4 py-1.5 bg-[#1c1c1e] flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-semibold text-white" style={{fontFamily:"-apple-system,BlinkMacSystemFont,sans-serif"}}>Mail</span>
                      <span className="ml-auto text-[9px] text-gray-400">Inbox</span>
                    </div>
                    <iframe title="Apple Mail Preview" sandbox="allow-same-origin" srcDoc={`<style>body{font-family:-apple-system,BlinkMacSystemFont,'SF Pro Text',sans-serif;font-size:13px;line-height:1.6;margin:20px;color:#1c1c1e;background:#fff}</style>${renderedHtml}`} className="w-full flex-1 border-none bg-white" />
                  </div>
                )}
              </div>
            </>
          )}

          {rightTab === "spam" && (
            <div className="flex-1 overflow-y-auto p-4">
              <SpamChecker subject={subject} htmlBody={htmlBody} />
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Spam Check Modal (mobile / on-demand) ── */}
      {createPortal(
        <AnimatePresence>
          {showSpamModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-6"
              style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
              onClick={() => setShowSpamModal(false)}
            >
              <motion.div
                initial={{ opacity: 0, y: 60 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 60 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                onClick={(e) => e.stopPropagation()}
                className="w-full sm:max-w-lg max-h-[85vh] flex flex-col bg-rose-surface border-2 border-rose-border"
              >
                {/* Modal header */}
                <div className="flex items-center justify-between px-5 py-4 border-b-2 border-rose-border bg-rose-hl-low shrink-0">
                  <div className="flex items-center gap-3">
                    <Shield size={16} className={spamResult.color} />
                    <div>
                      <h3 className="text-sm font-black text-rose-text uppercase tracking-wider">Spam Analysis</h3>
                      <p className="text-[10px] text-rose-muted font-semibold mt-0.5">Real-time SpamAssassin-style scoring</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 border-2 ${spamResult.border} ${spamResult.bg}`}>
                      <span className={`text-base font-black tabular-nums ${spamResult.color}`}>{spamResult.score.toFixed(1)}</span>
                      <span className="text-[10px] text-rose-muted font-bold">/10</span>
                      <span className={`text-[10px] font-extrabold uppercase tracking-wider ${spamResult.color}`}>{spamResult.label}</span>
                    </div>
                    <button
                      onClick={() => setShowSpamModal(false)}
                      className="w-8 h-8 flex items-center justify-center text-rose-muted hover:text-rose-text border-2 border-rose-border hover:bg-rose-hl-low transition-all"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>

                {/* Scrollable spam check content */}
                <div className="flex-1 overflow-y-auto p-5">
                  <SpamChecker subject={subject} htmlBody={htmlBody} />
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── Starter Templates Modal ── */}
      {createPortal(
        <AnimatePresence>
          {showStarterModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-rose-text/40"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-col rounded-none overflow-hidden w-full max-w-5xl max-h-[85vh] bg-rose-surface border-2 border-rose-border"
              >
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-brand" />
                
                <div className="flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b-2 border-rose-border bg-rose-surface shrink-0 mt-0.5 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-none bg-rose-love/15 flex items-center justify-center border-2 border-rose-border">
                       <Sparkles size={22} className="text-rose-love animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-rose-text tracking-tight">Template Library</h2>
                      <p className="text-sm text-rose-subtle font-medium mt-1">Select a professionally designed base template.</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowStarterModal(false)}
                    className="w-9 h-9 rounded-none flex items-center justify-center text-rose-text bg-rose-surface border-2 border-rose-border hover:bg-rose-hl-low active:translate-y-[2px]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-rose-base border-t-2 border-rose-border">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {STARTER_TEMPLATES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => loadStarterTemplate(t.html, t.name, t.subject)}
                        className="text-left rounded-none p-6 transition-all duration-150 border-2 bg-rose-surface border-rose-border hover:border-rose-pine hover:-translate-y-[3px] group flex flex-col justify-between min-h-[180px] relative overflow-hidden"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-rose-love/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                        <div className="relative z-10">
                          <div className="w-12 h-12 rounded-none flex items-center justify-center mb-4 bg-rose-overlay border-2 border-rose-border group-hover:bg-rose-hl-low transition-all duration-150">
                            {getStarterTemplateIcon(t.icon)}
                          </div>
                          <p className="text-base font-extrabold text-rose-text mb-2 group-hover:text-rose-pine transition-colors flex items-center gap-1.5 tracking-tight">
                            {t.name}
                            <span className="text-[12px] opacity-0 group-hover:opacity-100 translate-x-[-8px] group-hover:translate-x-0 transition-all duration-300 text-rose-pine">→</span>
                          </p>
                          <p className="text-xs text-rose-subtle font-medium leading-relaxed">{t.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* ── AI Writer Modal ── */}
      {createPortal(
        <AnimatePresence>
          {showAiModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-rose-text/40 backdrop-blur-[2px]"
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="flex flex-col rounded-none overflow-hidden w-full max-w-lg bg-rose-surface border-2 border-rose-border shadow-offset"
              >
                <div className="absolute top-0 left-0 right-0 h-[4px] bg-gradient-brand" />
                
                <div className="flex items-center justify-between px-6 py-5 border-b-2 border-rose-border bg-rose-surface shrink-0 mt-0.5 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-none bg-rose-pine/15 flex items-center justify-center border-2 border-rose-border">
                       <Sparkles size={18} className="text-rose-pine animate-pulse" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-rose-text uppercase tracking-tight">AI Template Writer</h2>
                      <p className="text-xs text-rose-muted font-bold mt-0.5">Generate a custom template based on role and resume</p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setShowAiModal(false);
                      setAiPreviewData(null);
                    }}
                    className="w-9 h-9 rounded-none flex items-center justify-center text-rose-text bg-rose-surface border-2 border-rose-border hover:bg-rose-hl-low active:translate-y-[2px]"
                  >
                    <X size={16} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-rose-base border-t-2 border-rose-border space-y-5">
                  {!user?.has_gemini_api_key ? (
                    <div className="p-4 bg-rose-love/10 border-2 border-rose-border text-rose-text space-y-3">
                      <p className="text-xs font-bold leading-relaxed">
                        ⚠️ <strong>Gemini Key Missing:</strong> You must configure your Google Gemini API key before using the AI template generator.
                      </p>
                      <button
                        onClick={() => {
                          setShowAiModal(false);
                          navigate("/settings");
                        }}
                        className="btn-primary py-1.5 px-3 text-xs font-bold"
                      >
                        Go to Settings
                      </button>
                    </div>
                  ) : aiPreviewData ? (
                    /* AI Generation Preview Mode */
                    <div className="space-y-4">
                      <div className="p-4 bg-rose-foam/10 border-2 border-rose-border">
                        <p className="text-[10px] font-extrabold text-rose-muted uppercase tracking-wider">Generated Subject Line</p>
                        <p className="text-sm font-black text-rose-text mt-1">{aiPreviewData.subject}</p>
                      </div>

                      <div className="border-2 border-rose-border rounded-none overflow-hidden bg-rose-surface">
                        <div className="bg-rose-hl-low px-4 py-2 border-b-2 border-rose-border text-[10px] font-extrabold uppercase tracking-wider text-rose-text">
                          HTML Body Preview
                        </div>
                        <div className="p-4 max-h-[250px] overflow-y-auto bg-white border-none">
                          <iframe
                            title="AI Preview"
                            sandbox="allow-same-origin"
                            srcDoc={aiPreviewData.html_body}
                            className="w-full h-[220px] border-none"
                          />
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setAiPreviewData(null)}
                          className="btn-secondary flex-1 py-2 text-xs font-bold"
                        >
                          Redraft
                        </button>
                        <button
                          type="button"
                          onClick={handleApplyAiTemplate}
                          className="btn-primary flex-1 py-2 text-xs font-bold"
                        >
                          Load into Editor
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* AI Parameter Input Mode */
                    <form onSubmit={handleAiGenerate} className="space-y-4">
                      <div>
                        <label className="label">Target Job Role / Title</label>
                        <input
                          type="text"
                          required
                          value={aiJobRole}
                          onChange={(e) => setAiJobRole(e.target.value)}
                          className="input"
                          placeholder="e.g. Senior Frontend Engineer"
                        />
                      </div>

                      <div>
                        <label className="label">Select Reference Resume</label>
                        {resumes.length === 0 ? (
                          <div className="p-3 bg-rose-overlay border border-rose-hl-high text-[11px] text-rose-muted font-bold leading-relaxed">
                            No resumes found in your profile. The AI will write a generic template based on the job role. 
                            You can upload a resume PDF in the <span className="text-rose-pine cursor-pointer underline" onClick={() => { setShowAiModal(false); navigate("/resumes"); }}>Resumes page</span> first.
                          </div>
                        ) : (
                          <CustomSelect
                            value={aiSelectedResumeId}
                            onChange={(val) => setAiSelectedResumeId(val.toString())}
                            options={[
                              { value: "", label: "-- Don't use a resume (Generic) --" },
                              ...resumes.map((r) => ({
                                value: r.id.toString(),
                                label: `${r.name}${r.is_default ? " (Default)" : ""}`,
                              })),
                            ]}
                            placeholder="Select a resume..."
                          />
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isGenerating}
                        className="btn-primary w-full justify-center text-xs py-2.5 font-bold mt-4"
                      >
                        {isGenerating ? "Analyzing & Generating..." : "Generate AI Template"}
                      </button>
                    </form>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
