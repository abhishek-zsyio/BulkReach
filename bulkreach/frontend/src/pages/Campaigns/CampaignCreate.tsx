import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ChevronRight, ChevronLeft, Rocket, ExternalLink, Copy } from "lucide-react";
import {
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useGetCampaignQuery,
  useCreateGoogleSheetMutation,
  useSyncGoogleSheetMutation,
  useGetTemplatesQuery,
  useCreateTemplateMutation,
} from "@/api/campaignApi";
import { useGetResumesQuery, useUploadResumeMutation } from "@/api/resumeApi";
import { DropzoneUpload } from "@/components/spreadsheet/DropzoneUpload";
import { RichTemplateEditor } from "@/components/template/RichTemplateEditor";
import { RecipientTableEditor } from "@/components/campaign/RecipientTableEditor";
import toast from "react-hot-toast";
import { cn } from "@/utils/helpers";
import { CustomSelect } from "@/components/ui/CustomSelect";

const STEPS = [
  { id: 1, label: "Details",    subtitle: "Name, subject & delivery settings" },
  { id: 2, label: "Template",   subtitle: "Compose or pick an email template" },
  { id: 3, label: "Recipients", subtitle: "Link Google Sheet & add recipients" },
  { id: 4, label: "Attachment", subtitle: "Attach your resume (optional)" },
  { id: 5, label: "Launch",     subtitle: "Review and send your campaign" },
];

export function CampaignCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [campaignId, setCampaignId] = useState<number | null>(null);

  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [templateId, setTemplateId] = useState<number | null>(null);
  const [htmlBody, setHtmlBody] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [plainTextMode, setPlainTextMode] = useState(true); // Default to true for cold job outreach!
  const [openTrackingEnabled, setOpenTrackingEnabled] = useState(false); // Default to false for deliverability!
  const [isOneOff, setIsOneOff] = useState(true); // Default to true for simple cover letter/job application!
  
  const [selectedResumeId, setSelectedResumeId] = useState<number | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [newResumeName, setNewResumeName] = useState("");
  const [showNewResumeForm, setShowNewResumeForm] = useState(false);
  const [uploadedResume, setUploadedResume] = useState<{ id: number; name: string } | null>(null);

  const { data: templates = [] } = useGetTemplatesQuery();
  const [createCampaign, { isLoading: creating }] = useCreateCampaignMutation();
  const [updateCampaign, { isLoading: updating }] = useUpdateCampaignMutation();
  const [createTemplate] = useCreateTemplateMutation();
  const [createGoogleSheet, { isLoading: isCreatingSheet }] = useCreateGoogleSheetMutation();
  const [syncGoogleSheet, { isLoading: isSyncingSheet }] = useSyncGoogleSheetMutation();
  const { data: resumes = [], isLoading: isResumesLoading } = useGetResumesQuery();
  const [uploadResume, { isLoading: isUploadingResume }] = useUploadResumeMutation();

  const { data: campaign, refetch: refetchCampaign } = useGetCampaignQuery(campaignId ?? 0, {
    skip: !campaignId,
  });

  const hasSyncedStep3Ref = useRef(false);

  useEffect(() => {
    if (step === 3 && campaign?.google_sheet_sync_enabled && campaign?.google_sheet_id && !hasSyncedStep3Ref.current) {
      hasSyncedStep3Ref.current = true;
      const runAutoSync = async () => {
        try {
          await syncGoogleSheet(campaign.id).unwrap();
          refetchCampaign();
        } catch (err) {
          console.error("Auto-sync in Step 3 failed:", err);
        }
      };
      runAutoSync();
    }
  }, [step, campaign?.google_sheet_id, campaign?.google_sheet_sync_enabled, campaign?.id, refetchCampaign, syncGoogleSheet]);

  useEffect(() => {
    if (step !== 3) {
      hasSyncedStep3Ref.current = false;
    }
  }, [step]);

  useEffect(() => {
    if (campaign) {
      setSelectedResumeId(campaign.resume);
    }
  }, [campaign?.resume]);

  const handleStep1 = async () => {
    if (!name.trim()) {
      toast.error("Campaign name is required.");
      return;
    }
    try {
      if (campaignId) {
        await updateCampaign({
          id: campaignId,
          data: {
            name,
            subject_template: subject,
            plain_text_mode: plainTextMode,
            open_tracking_enabled: openTrackingEnabled,
          }
        }).unwrap();
      } else {
        const campaign = await createCampaign({ 
          name, 
          subject_template: subject,
          plain_text_mode: plainTextMode,
          open_tracking_enabled: openTrackingEnabled,
        }).unwrap();
        setCampaignId(campaign.id);
      }
      setStep(2);
    } catch {
      toast.error("Failed to save campaign details.");
    }
  };

  const handleStep2 = async () => {
    if (!campaignId) return;
    try {
      if (!isOneOff && templateId) {
        await updateCampaign({ id: campaignId, data: { template: templateId } }).unwrap();
      } else {
        const finalTemplateName = isOneOff ? `${name} Cover Letter` : templateName;
        if (!finalTemplateName.trim() || !htmlBody.trim()) {
          toast.error(isOneOff ? "Email body is required." : "Template name and body are required.");
          return;
        }
        const newTemplate = await createTemplate({ name: finalTemplateName, html_body: htmlBody }).unwrap();
        await updateCampaign({ id: campaignId, data: { template: newTemplate.id } }).unwrap();
      }
      setStep(3);
    } catch {
      toast.error("Failed to save template selection.");
    }
  };

  const handleStep3 = async () => {
    if (!campaignId || !campaign) return;
    if (!campaign.google_sheet_sync_enabled) {
      toast.error("Create and link the Google Sheet first.");
      return;
    }
    if (campaign.total_recipients === 0) {
      toast.error("Please add recipients to the Google Sheet and click 'Sync Recipients' first.");
      return;
    }
    setStep(4);
  };

  const handleStep4 = async () => {
    if (!campaignId) return;
    try {
      let finalResumeId = selectedResumeId;
      const isUploadingNew = showNewResumeForm || resumes.length === 0;

      if (isUploadingNew && resumeFile) {
        let uploadName = newResumeName.trim();
        if (!uploadName) {
          uploadName = resumeFile.name.replace(/\.[^/.]+$/, "");
        }
        const form = new FormData();
        form.append("name", uploadName);
        form.append("file", resumeFile);
        const res = await uploadResume(form).unwrap();
        finalResumeId = res.id;
        
        // Save the uploaded resume's info locally and update state
        setUploadedResume({ id: res.id, name: res.name });
        setSelectedResumeId(res.id);
        setShowNewResumeForm(false);
        setResumeFile(null);
        setNewResumeName("");
        
        toast.success("Resume uploaded successfully!");
      }

      await updateCampaign({ id: campaignId, data: { resume: finalResumeId } }).unwrap();
      if (finalResumeId) {
        toast.success("Resume attached to campaign!");
      } else {
        toast.success("Resume removed from campaign!");
      }
      setStep(5);
    } catch (err: any) {
      toast.error(err?.data?.message || err?.message || "Failed to attach resume.");
      return;
    }
  };

  const handleLaunch = async () => {
    if (!campaignId) return;
    navigate(`/campaigns/${campaignId}`);
  };

  const isLoading = creating || updating || isCreatingSheet || isSyncingSheet || isUploadingResume;

  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-rose-text tracking-tight">Create Campaign</h1>
        <p className="text-rose-subtle mt-1 text-sm font-medium">Set up your outreach campaign in 5 steps.</p>
      </div>

      {/* Stepper */}
      <div className="card bg-rose-surface p-5">
        <div className="flex items-start">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                {/* Step circle */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-none flex items-center justify-center text-sm font-black transition-all duration-300 border-2",
                    step > s.id
                      ? "border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] -translate-x-[1px] -translate-y-[1px]"
                      : step === s.id
                      ? "border-rose-border shadow-[3px_3px_0px_0px_var(--color-shadow)] -translate-x-[2px] -translate-y-[2px]"
                      : "border-rose-hl-med"
                  )}
                  style={{
                    background:
                      step > s.id
                        ? "var(--color-foam)"
                        : step === s.id
                        ? "var(--color-pine)"
                        : "var(--color-overlay)",
                    color:
                      step >= s.id ? "#fff" : "var(--color-muted)",
                  }}
                >
                  {step > s.id ? <Check size={15} className="stroke-[3]" /> : s.id}
                </div>
                {/* Step label */}
                <span
                  className={cn(
                    "text-[10px] mt-2 font-extrabold transition-colors whitespace-nowrap uppercase tracking-wider",
                    step === s.id ? "text-rose-pine" : step > s.id ? "text-rose-foam" : "text-rose-muted"
                  )}
                >
                  {s.label}
                </span>
              </div>
              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className="h-0.5 flex-1 mb-6 mx-1 transition-all duration-500"
                  style={{
                    background: step > s.id
                      ? "var(--color-foam)"
                      : "var(--color-hl-med)",
                  }}
                />
              )}
            </div>
          ))}
        </div>
        {/* Step subtitle */}
        <div className="mt-3 pt-3 border-t border-rose-hl-low flex items-center justify-between">
          <p className="text-xs text-rose-muted font-semibold">
            <span className="text-rose-pine font-extrabold">Step {step}:</span> {STEPS[step - 1]?.subtitle}
          </p>
          <span className="text-[10px] font-extrabold text-rose-muted uppercase tracking-wider">
            {step} / {STEPS.length}
          </span>
        </div>
      </div>

      {/* Step content */}
      <div
        key={step}
        className="card p-7 animate-slide-up bg-rose-surface/85 shadow-[6px_6px_0px_0px_var(--color-hl-high)]"
      >
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-rose-text">Campaign Details</h2>
            <div>
              <label htmlFor="campaign-name" className="label">
                Campaign Name <span className="text-rose-love font-black">*</span>
              </label>
              <input
                id="campaign-name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input"
                placeholder="e.g. Q3 2026 Dev Outreach"
              />
            </div>
            <div>
              <label htmlFor="campaign-subject" className="label">
                Email Subject <span className="text-rose-muted font-bold">(Optional)</span>
              </label>
              <input
                id="campaign-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="input"
                placeholder="e.g. Exciting opportunity at {{ company_name }}"
              />
              <p className="text-xs text-rose-subtle mt-1.5 font-medium">
                Use <code className="text-rose-love bg-rose-love/10 px-1.5 py-0.5 rounded-none font-mono">{"{{ variable_name }}"}</code> placeholders for personalization.
              </p>
            </div>

            <div className="pt-4 border-t border-rose-hl-low space-y-4">
              <h3 className="text-sm font-bold text-rose-text uppercase tracking-wider">Deliverability Settings</h3>
              
              <div className="flex items-start gap-2.5">
                <input
                  id="plain-text-mode"
                  type="checkbox"
                  checked={plainTextMode}
                  onChange={(e) => {
                    setPlainTextMode(e.target.checked);
                    if (e.target.checked) {
                      setOpenTrackingEnabled(false);
                    }
                  }}
                  className="w-4 h-4 mt-0.5 rounded text-rose-pine focus:ring-rose-pine bg-rose-overlay border-rose-border cursor-pointer"
                />
                <div>
                  <label htmlFor="plain-text-mode" className="text-xs font-bold text-rose-text cursor-pointer">
                    Plain Text Only Mode (Recommended for Job Applications)
                  </label>
                  <p className="text-[10px] text-rose-subtle font-medium leading-relaxed mt-0.5">
                    Sends simple, high-deliverability plain text emails. Avoids the "Promotions" and "Spam" tabs.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <input
                  id="open-tracking-enabled"
                  type="checkbox"
                  checked={openTrackingEnabled}
                  disabled={plainTextMode}
                  onChange={(e) => setOpenTrackingEnabled(e.target.checked)}
                  className="w-4 h-4 mt-0.5 rounded text-rose-pine focus:ring-rose-pine bg-rose-overlay border-rose-border cursor-pointer disabled:opacity-50"
                />
                <div>
                  <label htmlFor="open-tracking-enabled" className="text-xs font-bold text-rose-text cursor-pointer">
                    Enable Open Tracking
                  </label>
                  <p className="text-[10px] text-rose-subtle font-medium leading-relaxed mt-0.5">
                    {plainTextMode 
                      ? "Disabled because Plain Text Mode is active (cannot track opens without HTML pixels)."
                      : "Injects an invisible tracking pixel to track email opens. Turn off to maximize deliverability."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-rose-text">Email Content</h2>

            {/* Segmented Control / Tabs */}
            <div className="flex border-2 border-rose-border bg-rose-overlay/20 p-1">
              <button
                type="button"
                className={cn(
                  "flex-1 py-2 text-xs font-bold transition-all",
                  isOneOff
                    ? "bg-rose-pine text-white"
                    : "text-rose-muted hover:text-rose-text"
                )}
                onClick={() => {
                  setIsOneOff(true);
                  setTemplateId(null);
                }}
              >
                One-off Cover Letter / Email (Simple)
              </button>
              <button
                type="button"
                className={cn(
                  "flex-1 py-2 text-xs font-bold transition-all",
                  !isOneOff
                    ? "bg-rose-pine text-white"
                    : "text-rose-muted hover:text-rose-text"
                )}
                onClick={() => setIsOneOff(false)}
              >
                Use Reusable Template
              </button>
            </div>

            {/* Mode: One-Off Cover Letter / Simple Email */}
            {isOneOff && (
              <div className="space-y-4">
                <div>
                  <label className="label">
                    Email Body {plainTextMode ? "(Plain Text)" : "(HTML/Rich Text)"}
                  </label>
                  {plainTextMode ? (
                    <textarea
                      value={htmlBody}
                      onChange={(e) => setHtmlBody(e.target.value)}
                      className="input min-h-[250px] font-mono text-sm leading-relaxed whitespace-pre-wrap"
                      placeholder={`Dear {{ recipient_name }},\n\nI hope this email finds you well.\n\nI am writing to apply for the {{ job_title }} role at {{ company_name }}...\n\nBest regards,\n{{ sender_name }}`}
                    />
                  ) : (
                    <div className="border-2 border-rose-hl-med">
                      <RichTemplateEditor
                        value={htmlBody}
                        onChange={setHtmlBody}
                        variables={["recipient_name", "company_name", "job_title", "sender_name"]}
                      />
                    </div>
                  )}
                  <p className="text-xs text-rose-subtle mt-1.5 font-medium leading-relaxed">
                    Available variables you can type or copy: <code className="text-rose-love bg-rose-love/10 px-1.5 py-0.5 rounded-none font-mono">{"{{ recipient_name }}"}</code>, <code className="text-rose-love bg-rose-love/10 px-1.5 py-0.5 rounded-none font-mono">{"{{ company_name }}"}</code>, <code className="text-rose-love bg-rose-love/10 px-1.5 py-0.5 rounded-none font-mono">{"{{ job_title }}"}</code>, <code className="text-rose-love bg-rose-love/10 px-1.5 py-0.5 rounded-none font-mono">{"{{ sender_name }}"}</code>.
                  </p>
                </div>
              </div>
            )}

            {/* Mode: Reusable Template */}
            {!isOneOff && (
              <div className="space-y-4">
                {templates.length > 0 && (
                  <div>
                    <label htmlFor="template-select" className="label">Select Reusable Template</label>
                    <CustomSelect
                      value={templateId ?? ""}
                      onChange={(val) => {
                        const numericVal = val ? Number(val) : null;
                        setTemplateId(numericVal);
                        if (numericVal) {
                          const selected = templates.find((t) => t.id === numericVal);
                          if (selected) {
                            setSubject(selected.subject || selected.name);
                            setHtmlBody(selected.html_body);
                            const isPlainText = selected.name.toLowerCase().includes("plain text") || 
                                                selected.name.toLowerCase().includes("plaintext") ||
                                                selected.name.toLowerCase().includes("plain-text");
                            setPlainTextMode(isPlainText);
                            if (isPlainText) {
                              setOpenTrackingEnabled(false);
                            } else {
                              setOpenTrackingEnabled(true);
                            }
                          }
                        }
                      }}
                      options={[
                        { value: "", label: "None (Select a Template)" },
                        ...templates.map((t) => ({
                          value: t.id,
                          label: t.name,
                        })),
                      ]}
                      placeholder="Select a template..."
                    />
                  </div>
                )}
                
                {!templateId && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="template-name" className="label">New Template Name</label>
                      <input
                        id="template-name"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        className="input"
                        placeholder="e.g. Cover Letter - Developer Roles"
                      />
                    </div>
                    <div>
                      <label className="label">Template Body (HTML/Rich Text)</label>
                      <div className="border-2 border-rose-hl-med">
                        <RichTemplateEditor
                          value={htmlBody}
                          onChange={setHtmlBody}
                          variables={["recipient_name", "company_name", "job_title", "sender_name"]}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-rose-text">Recipients — Google Sheet</h2>

            {campaign && !campaign.google_sheet_sync_enabled ? (
              <div className="space-y-4">
                <p className="text-sm text-rose-subtle leading-relaxed font-medium">
                  Your recipient list is managed dynamically in Google Drive. Click below to provision
                  a new Google Spreadsheet for this campaign.
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    if (!campaignId) return;
                    try {
                      const res = await createGoogleSheet(campaignId).unwrap();
                      toast.success("Google Sheet created and linked!");
                      refetchCampaign();
                      if (res.spreadsheet_url) window.open(res.spreadsheet_url, "_blank");
                    } catch (err: any) {
                      toast.error(err?.data?.message || "Failed to create Google Sheet");
                    }
                  }}
                  disabled={isCreatingSheet}
                  className="btn-primary w-full py-3 justify-center"
                >
                  {isCreatingSheet ? (
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  ) : (
                    "Create & Link Google Sheet"
                  )}
                </button>
              </div>
            ) : campaign ? (
              <div className="space-y-5">
                <div className="p-4 flex items-center gap-3 bg-rose-foam/10 border-2 border-rose-border">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-none bg-rose-foam opacity-75" />
                    <span className="relative inline-flex rounded-none h-2.5 w-2.5 bg-rose-foam" />
                  </span>
                  <div>
                    <p className="text-sm font-bold text-rose-foam">Google Sheet Linked</p>
                    <p className="text-xs text-rose-subtle mt-0.5 font-mono">ID: {campaign.google_sheet_id}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <a
                    href={`https://docs.google.com/spreadsheets/d/${campaign.google_sheet_id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-secondary py-2.5 justify-center text-center font-bold"
                  >
                    <ExternalLink size={14} /> Open Sheet
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `https://docs.google.com/spreadsheets/d/${campaign.google_sheet_id}`
                      );
                      toast.success("Spreadsheet link copied!");
                    }}
                    className="btn-secondary py-2.5 justify-center font-bold"
                  >
                    <Copy size={14} /> Copy Link
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!campaignId) return;
                      try {
                        const res = await syncGoogleSheet(campaignId).unwrap();
                        toast.success(res.message || "Synced recipients!");
                        refetchCampaign();
                      } catch (err: any) {
                        toast.error(err?.data?.message || "Failed to sync");
                      }
                    }}
                    disabled={isSyncingSheet}
                    className="btn-primary py-2.5 justify-center"
                  >
                    {isSyncingSheet ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    ) : (
                      "Sync Recipients"
                    )}
                  </button>
                </div>

                {campaign.total_recipients > 0 && (
                  <div className="px-4 py-3 text-sm text-rose-foam font-bold flex items-center gap-2 bg-rose-foam/10 border-2 border-rose-border">
                    <Check size={15} />
                    {campaign.total_recipients} recipients synced from the Google Sheet!
                  </div>
                )}

                <div className="space-y-3 pt-2">
                  <p className="text-xs text-rose-subtle font-bold uppercase tracking-wider">Edit recipients below</p>
                  <RecipientTableEditor
                    campaignId={campaign.id}
                    templateId={campaign.template}
                    onSaveSuccess={() => refetchCampaign()}
                  />
                </div>
              </div>
            ) : (
              <div className="animate-pulse h-20 bg-rose-overlay/40 border-2 border-rose-border" />
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-rose-text flex items-baseline gap-2">
              Attach Resume
              <span className="text-rose-subtle font-normal text-xs">(optional)</span>
            </h2>
            
            {isResumesLoading ? (
              <div className="space-y-4">
                <div className="h-6 w-1/3 bg-rose-overlay/40 rounded animate-pulse" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="h-20 bg-rose-overlay/40 animate-pulse border border-rose-hl-med" />
                  <div className="h-20 bg-rose-overlay/40 animate-pulse border border-rose-hl-med" />
                </div>
              </div>
            ) : (
              <>
                {resumes.length > 0 && !showNewResumeForm && (
                  <div className="space-y-3">
                    <label className="label">Select Existing Resume</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {resumes.map((r) => (
                        <div
                          key={r.id}
                          onClick={() => setSelectedResumeId((prev) => (prev === r.id ? null : r.id))}
                          className={`cursor-pointer p-3 border-2 transition-all ${
                            selectedResumeId === r.id
                              ? "bg-rose-love/10 border-rose-love text-rose-love"
                              : "bg-rose-surface border-rose-border text-rose-subtle hover:border-rose-pine"
                          }`}
                        >
                          <p className="font-bold text-sm truncate">{r.name}</p>
                          <p className="text-xs opacity-80 truncate">
                            {r.file ? r.file.split('/').pop() : "Text-only profile"}
                          </p>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNewResumeForm(true)}
                      className="text-xs font-bold text-rose-text underline hover:text-rose-pine mt-2"
                    >
                      + Upload a new resume instead
                    </button>
                  </div>
                )}

                {(resumes.length === 0 || showNewResumeForm) && (
                  <div className="space-y-4">
                    {resumes.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewResumeForm(false);
                          setResumeFile(null);
                          setNewResumeName("");
                        }}
                        className="text-xs font-bold text-rose-subtle hover:text-rose-text mb-2 flex items-center gap-1"
                      >
                        <ChevronLeft size={14} /> Back to saved resumes
                      </button>
                    )}
                    <div>
                      <label htmlFor="new-resume-name" className="label">Resume Profile Name</label>
                      <input
                        id="new-resume-name"
                        value={newResumeName}
                        onChange={(e) => setNewResumeName(e.target.value)}
                        className="input"
                        placeholder="e.g. Frontend Developer Profile"
                      />
                    </div>
                    <DropzoneUpload
                      onFileAccepted={setResumeFile}
                      label="PDF resume"
                      accept={{ "application/pdf": [".pdf"] }}
                      maxSizeMb={5}
                    />
                    {resumeFile && (
                      <div className="px-4 py-3 text-sm text-rose-foam font-bold flex items-center gap-2 bg-rose-foam/10 border-2 border-rose-border">
                        <Check size={15} /> Resume selected: {resumeFile.name}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {step === 5 && campaignId && (
          <div className="space-y-6 text-center py-4">
            <div
              className="w-20 h-20 mx-auto flex items-center justify-center bg-rose-overlay border-2 border-rose-border"
            >
              <Rocket size={32} className="text-rose-love animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-rose-text mb-2 tracking-tight">Ready to Launch! 🚀</h2>
              <p className="text-rose-subtle text-sm font-medium">
                Your campaign is fully configured. Click{" "}
                <strong className="text-rose-text font-bold">View Campaign</strong> to review and start sending.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-left max-w-sm mx-auto">
              {[
                { label: "Campaign Name", value: name },
                { label: "Subject", value: subject },
                {
                  label: "Recipients",
                  value: campaign?.google_sheet_sync_enabled
                    ? `${campaign.total_recipients} contacts`
                    : "—",
                },
                {
                  label: "Resume",
                  value: showNewResumeForm && resumeFile 
                    ? resumeFile.name 
                    : (selectedResumeId 
                        ? (resumes.find(r => r.id === selectedResumeId)?.name || (uploadedResume?.id === selectedResumeId ? uploadedResume.name : "")) || "Selected Resume"
                        : "None")
                },
              ].map(({ label, value }) => (
                <div
                  key={label}
                  className="p-3 bg-rose-overlay/20 border-2 border-rose-border"
                >
                  <p className="text-xs text-rose-muted mb-1 font-bold uppercase tracking-wider">{label}</p>
                  <p className="text-sm font-bold text-rose-text truncate">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setStep((s) => s - 1)}
          disabled={step === 1}
          className="btn-secondary disabled:opacity-30 font-bold"
          id="wizard-back-btn"
        >
          <ChevronLeft size={16} /> Back
        </button>

        {step < 5 ? (
          <button
            id="wizard-next-btn"
            onClick={() => {
              if (step === 1) handleStep1();
              else if (step === 2) handleStep2();
              else if (step === 3) handleStep3();
              else if (step === 4) handleStep4();
            }}
            disabled={isLoading}
            className="btn-primary"
          >
            {isLoading ? (
              <span className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
            ) : (
              <>Next <ChevronRight size={16} /></>
            )}
          </button>
        ) : (
          <button id="view-campaign-btn" onClick={handleLaunch} className="btn-primary">
            <Rocket size={16} /> View Campaign
          </button>
        )}
      </div>
    </div>
  );
}
