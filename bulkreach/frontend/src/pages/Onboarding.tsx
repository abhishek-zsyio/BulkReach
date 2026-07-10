import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { 
  User, 
  Key, 
  FileText, 
  Mail, 
  CheckCircle2, 
  ArrowRight, 
  ArrowLeft, 
  Upload, 
  Loader2, 
  Sparkles, 
  Check, 
  LogOut 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { setUser as setReduxUser } from "@/store/slices/authSlice";
import { API_BASE_URL } from "@/utils/constants";
import { useUploadResumeMutation } from "@/api/resumeApi";
import { useCreateTemplateMutation } from "@/api/campaignApi";
import toast from "react-hot-toast";

export function Onboarding() {
  const { user, accessToken, logoutUser, fetchUserProfile, connectGmailConfirm } = useAuth();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [uploadResume, { isLoading: isUploadingResume }] = useUploadResumeMutation();

  const [step, setStep] = useState(1);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const code = searchParams.get("gmail_code");
    const state = searchParams.get("gmail_state");
    if (code && state) {
      const confirmGmail = async () => {
        const loadingToast = toast.loading("Finalizing Gmail connection...");
        try {
          await connectGmailConfirm(code, state);
          toast.success("Gmail connected successfully!", { id: loadingToast });
          // Clear query params
          searchParams.delete("gmail_code");
          searchParams.delete("gmail_state");
          setSearchParams(searchParams);
          // Refetch user profile
          await fetchUserProfile();
          // Advance to Ready step
          setStep(6);
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
  const [isUpdating, setIsUpdating] = useState(false);

  // Form states
  const [profile, setProfile] = useState({
    firstName: user?.first_name || "",
    lastName: user?.last_name || "",
    senderName: user?.sender_name || (user?.first_name ? `${user.first_name} ${user.last_name}` : ""),
  });
  const [geminiKey, setGeminiKey] = useState("");
  const [uploadedResumeFile, setUploadedResumeFile] = useState<File | null>(null);
  const [resumeParsedText, setResumeParsedText] = useState("");
  const [selectedTemplateIdx, setSelectedTemplateIdx] = useState(0);
  const [createTemplate, { isLoading: isSavingTemplate }] = useCreateTemplateMutation();

  const stepsList = [
    { num: 1, title: "Profile Info", icon: User },
    { num: 2, title: "AI Intelligence", icon: Key },
    { num: 3, title: "Default Resume", icon: FileText },
    { num: 4, title: "Email Template", icon: Sparkles },
    { num: 5, title: "Gmail Link", icon: Mail },
    { num: 6, title: "Ready!", icon: CheckCircle2 },
  ];

  const ONBOARDING_TEMPLATES = [
    {
      name: "Simple Cold Application",
      subject: "Job Application: {{ job_title }} at {{ company_name }}",
      html_body: `<p>Hi {{ recipient_name }},</p>\n<p>I hope you're doing well.</p>\n<p>I am writing to express my interest in the {{ job_title }} role at {{ company_name }}. With my background, I believe I would be a great fit for your team.</p>\n<p>I have attached my resume for your review. I look forward to hearing from you.</p>\n<p>Best regards,<br>{{ sender_name }}</p>`,
    },
    {
      name: "Referral Request",
      subject: "Inquiry: {{ job_title }} role at {{ company_name }}",
      html_body: `<p>Hi {{ recipient_name }},</p>\n<p>I hope you're having a great week.</p>\n<p>I noticed the {{ job_title }} role open at {{ company_name }} and wanted to reach out. I've been following your company's work and admire your culture.</p>\n<p>Would you be open to a quick chat or referring me to the hiring manager if my profile aligns?</p>\n<p>Thank you for your time,<br>{{ sender_name }}</p>`,
    },
    {
      name: "Product Focus / Casual",
      subject: "Quick question about {{ company_name }}",
      html_body: `<p>Hey {{ recipient_name }},</p>\n<p>I came across {{ company_name }}'s product and loved how you guys solved the industry problem.</p>\n<p>I'm a developer and would love to help you build out new features for the {{ job_title }} position. Are you currently hiring?</p>\n<p>Thanks,<br>{{ sender_name }}</p>`,
    }
  ];

  const handleUpdateProfile = async () => {
    if (!profile.firstName.trim() || !profile.lastName.trim() || !profile.senderName.trim()) {
      toast.error("Please fill in all profile fields.");
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          first_name: profile.firstName,
          last_name: profile.lastName,
          sender_name: profile.senderName,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile.");
      dispatch(setReduxUser(data));
      setStep(2);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!geminiKey.trim()) {
      toast.error("Please enter a valid Gemini API Key.");
      return;
    }
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          gemini_api_key: geminiKey,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to save Gemini key.");
      dispatch(setReduxUser(data));
      setStep(3);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file.");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", `${profile.firstName || "User"}'s Resume`);
      formData.append("file", file);
      formData.append("is_default", "true");

      const result = await uploadResume(formData).unwrap();

      setUploadedResumeFile(file);
      setResumeParsedText(result.parsed_text || "");
      toast.success("Resume uploaded and parsed successfully!");
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to upload resume.");
    }
  };

  const handleGmailConnect = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/gmail/connect/?redirect_to=onboarding`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        toast.error("Failed to retrieve Google connection link.");
      }
    } catch (err) {
      toast.error("Error connecting to Google.");
      console.error(err);
    }
  };

  const handleFinishOnboarding = async () => {
    setIsUpdating(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/me/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          is_onboarded: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to finalize setup.");
      dispatch(setReduxUser(data));
      navigate("/dashboard");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSaveTemplate = async () => {
    const tpl = ONBOARDING_TEMPLATES[selectedTemplateIdx];
    try {
      await createTemplate({
        name: tpl.name,
        subject: tpl.subject,
        html_body: tpl.html_body,
        is_default: true,
      }).unwrap();
      toast.success("Default email template configured!");
      setStep(5);
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to save template selection.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-rose-base relative overflow-hidden font-sans p-6 grid-bg noise-bg">
      {/* Header */}
      <header className="relative z-10 flex items-center justify-between max-w-4xl w-full mx-auto py-4 border-b-2 border-rose-border">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-none flex items-center justify-center text-white bg-rose-pine border-2 border-rose-border">
            <Sparkles size={16} className="fill-white" />
          </div>
          <span className="font-extrabold text-rose-text text-lg tracking-tight uppercase">BulkReach Setup</span>
        </div>
        <button
          onClick={logoutUser}
          className="flex items-center gap-2 text-xs font-bold text-rose-text bg-rose-surface border-2 border-rose-border px-3 py-1.5 rounded-none hover:bg-rose-hl-low active:translate-y-[2px] transition-all"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </header>

      {/* Onboarding Wizard Core */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center max-w-2xl w-full mx-auto my-12">
        
        {/* Step Indicator */}
        <div className="flex justify-between w-full mb-10 px-4 relative">
          <div className="absolute top-[18px] left-4 right-4 h-[4px] bg-rose-hl-med border-t border-b border-rose-border z-0" />
          <div 
            className="absolute top-[18px] left-4 h-[4px] bg-rose-love border-t border-b border-rose-border transition-all duration-300 z-0" 
            style={{ width: `${((step - 1) / (stepsList.length - 1)) * 96}%` }}
          />
          
          {stepsList.map((s) => {
            const Icon = s.icon;
            const isCompleted = step > s.num;
            const isActive = step === s.num;
            return (
              <div key={s.num} className="flex flex-col items-center z-10 relative">
                <button
                  disabled={s.num > step}
                  onClick={() => setStep(s.num)}
                  className={`w-10 h-10 rounded-none flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 ${
                    isCompleted
                      ? "bg-rose-love border-rose-border text-white"
                      : isActive
                      ? "bg-rose-surface border-rose-iris text-rose-iris scale-110 shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                      : "bg-rose-surface border-rose-hl-high text-rose-muted cursor-not-allowed"
                  }`}
                >
                  {isCompleted ? <Check size={16} /> : <Icon size={16} />}
                </button>
                <span className={`text-[10px] font-black mt-2 uppercase tracking-wider ${
                  isActive ? "text-rose-iris" : isCompleted ? "text-rose-love" : "text-rose-muted"
                }`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Form Container */}
        <div className="card w-full p-8 min-h-[400px] flex flex-col justify-between shadow-[8px_8px_0px_0px_var(--color-hl-med)]">
          <div className="flex-1 flex flex-col">
            {/* Step 1: Profile details */}
            {step === 1 && (
              <div>
                <h2 className="text-2xl font-extrabold text-rose-text tracking-tight mb-2 uppercase">Tell us about yourself</h2>
                <p className="text-sm text-rose-muted font-semibold mb-6">These details will be used to personalize your cold email campaigns.</p>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">First Name</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Jane"
                        value={profile.firstName}
                        onChange={(e) => {
                          const newProfile = { ...profile, firstName: e.target.value };
                          if (!profile.senderName || profile.senderName === `${profile.firstName} ${profile.lastName}`) {
                            newProfile.senderName = `${e.target.value} ${profile.lastName}`;
                          }
                          setProfile(newProfile);
                        }}
                      />
                    </div>
                    <div>
                      <label className="label">Last Name</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="Doe"
                        value={profile.lastName}
                        onChange={(e) => {
                          const newProfile = { ...profile, lastName: e.target.value };
                          if (!profile.senderName || profile.senderName === `${profile.firstName} ${profile.lastName}`) {
                            newProfile.senderName = `${profile.firstName} ${e.target.value}`;
                          }
                          setProfile(newProfile);
                        }}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="label">Sender Name (Shown in outreach emails)</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="Jane Doe from Acme Corp"
                      value={profile.senderName}
                      onChange={(e) => setProfile({ ...profile, senderName: e.target.value })}
                    />
                    <p className="text-[10px] text-rose-muted mt-1 font-semibold">Example: "Jane Doe" or "Jane Doe | Founder at Acme Corp"</p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Gemini API Key */}
            {step === 2 && (
              <div>
                <h2 className="text-2xl font-extrabold text-rose-text tracking-tight mb-2 uppercase">Connect Gemini AI</h2>
                <p className="text-sm text-rose-muted font-semibold mb-6">
                  BulkReach uses **Gemini 1.5 Flash** to extract template variables and matching candidates from job listings. Input your API key to activate AI features.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="label">Gemini API Key</label>
                    <input
                      type="password"
                      className="input font-mono"
                      placeholder="AIzaSy..."
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                    />
                    <p className="text-xs text-rose-muted mt-2 font-semibold">
                      Don't have an API key? You can get one for free at{" "}
                      <a 
                        href="https://aistudio.google.com/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-rose-love font-bold hover:underline"
                      >
                        Google AI Studio
                      </a>.
                    </p>
                  </div>

                  <div className="p-3.5 rounded-none border-2 border-rose-border bg-rose-overlay/40 text-xs text-rose-muted leading-relaxed font-semibold">
                    💡 Your key is securely encrypted at rest and is never sent back to any frontend request.
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Resume PDF Upload */}
            {step === 3 && (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-rose-text tracking-tight mb-2 uppercase">Upload your resume</h2>
                  <p className="text-sm text-rose-muted font-semibold mb-6">
                    We'll parse your resume so that the AI matching scraper can extract precise search keywords and evaluate relevant candidates.
                  </p>
                  
                  {!uploadedResumeFile ? (
                    <div className="relative border-2 border-dashed border-rose-border bg-rose-surface hover:bg-rose-overlay/40 rounded-none p-8 text-center cursor-pointer transition-colors">
                      <input
                        type="file"
                        accept="application/pdf"
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        onChange={handleResumeUpload}
                      />
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-none bg-rose-overlay flex items-center justify-center border-2 border-rose-border">
                          <Upload className="text-rose-love stroke-[2.5]" size={20} />
                        </div>
                        <p className="text-sm text-rose-text font-black uppercase">Upload a PDF Resume</p>
                        <p className="text-xs text-rose-muted font-semibold">PDF files only (max 5MB)</p>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-none border-2 border-rose-border bg-rose-surface p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-none bg-rose-overlay flex items-center justify-center border-2 border-rose-border text-rose-love flex-shrink-0">
                          <FileText size={20} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black text-rose-text truncate">{uploadedResumeFile.name}</p>
                          <p className="text-xs text-rose-muted font-semibold">Parsed successfully</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setUploadedResumeFile(null);
                          setResumeParsedText("");
                        }}
                        className="text-xs font-black text-rose-love hover:underline uppercase"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {isUploadingResume && (
                    <div className="mt-4 flex items-center gap-2 justify-center text-xs text-rose-iris font-black uppercase">
                      <Loader2 className="animate-spin" size={16} />
                      Uploading and parsing PDF with Gemini...
                    </div>
                  )}

                  {resumeParsedText && (
                    <div className="mt-4 p-3.5 rounded-none border-2 border-rose-border bg-rose-overlay/40 text-[11px] font-mono text-rose-muted max-h-32 overflow-y-auto">
                      <p className="font-black text-rose-text mb-1 uppercase">Parsed Extract Summary:</p>
                      {resumeParsedText.substring(0, 300)}...
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Outreach Template selection */}
            {step === 4 && (
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-rose-text tracking-tight mb-2 uppercase">Select Outreach Template</h2>
                  <p className="text-sm text-rose-muted font-semibold mb-6">
                    Pick a baseline email layout. You can customize the placeholder values later.
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
                    {ONBOARDING_TEMPLATES.map((t, idx) => (
                      <div
                        key={idx}
                        onClick={() => setSelectedTemplateIdx(idx)}
                        className={`cursor-pointer p-4 border-2 transition-all ${
                          selectedTemplateIdx === idx
                            ? "bg-rose-love/10 border-rose-love text-rose-love"
                            : "bg-rose-surface border-rose-border text-rose-subtle hover:border-rose-pine"
                        }`}
                      >
                        <p className="font-bold text-xs uppercase tracking-wider">{t.name}</p>
                      </div>
                    ))}
                  </div>

                  <div className="border-2 border-rose-border bg-rose-overlay/30 p-4 space-y-3">
                    <div>
                      <span className="text-[10px] font-black text-rose-muted uppercase tracking-wider block">Subject Template</span>
                      <p className="text-sm font-bold text-rose-text">{ONBOARDING_TEMPLATES[selectedTemplateIdx].subject}</p>
                    </div>
                    <hr className="border-rose-border" />
                    <div>
                      <span className="text-[10px] font-black text-rose-muted uppercase tracking-wider block">Body Preview</span>
                      <div 
                        className="text-xs text-rose-subtle mt-1 font-medium space-y-1.5 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: ONBOARDING_TEMPLATES[selectedTemplateIdx].html_body }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Gmail OAuth */}
            {step === 5 && (
              <div>
                <h2 className="text-2xl font-extrabold text-rose-text tracking-tight mb-2 uppercase">Connect Gmail Account</h2>
                <p className="text-sm text-rose-muted font-semibold mb-6">
                  Connect your Google workspace or personal Gmail account to permit BulkReach to send personalized outreach drafts directly from your mailbox.
                </p>
                
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="w-16 h-16 rounded-none bg-rose-overlay flex items-center justify-center border-2 border-rose-border text-rose-love mb-4">
                    <Mail size={32} />
                  </div>
                  {user?.gmail_connected ? (
                    <div className="rounded-none bg-rose-foam/15 border-2 border-rose-border px-4 py-1.5 text-xs text-rose-foam font-black flex items-center gap-1.5 uppercase">
                      <Check size={14} />
                      Gmail Account Linked! ({user.sender_email})
                    </div>
                  ) : (
                    <button
                      onClick={handleGmailConnect}
                      className="btn-primary flex items-center gap-2"
                    >
                      Connect Google Account
                    </button>
                  )}
                  <p className="text-xs text-rose-muted mt-4 max-w-sm font-semibold">
                    You can skip this step and connect later under settings if you wish to run search and scraper tasks first.
                  </p>
                </div>
              </div>
            )}

            {/* Step 6: Success completion */}
            {step === 6 && (
              <div className="text-center py-6 flex flex-col items-center">
                <div className="relative w-20 h-20 rounded-none bg-rose-pine border-2 border-rose-border flex items-center justify-center text-white mb-6">
                  <Sparkles size={36} />
                </div>
                
                <h2 className="text-3xl font-extrabold text-rose-text tracking-tight mb-3 uppercase">You're all set!</h2>
                <p className="text-sm text-rose-muted font-semibold max-w-md mx-auto mb-8 leading-relaxed">
                  BulkReach is successfully configured. You are now ready to set up candidate templates, scrape matching roles, and launch outreach campaigns.
                </p>
                
                <div className="w-full max-w-xs space-y-2 border-2 border-rose-border rounded-none p-4 bg-rose-overlay/40 text-left text-xs text-rose-muted">
                  <div className="flex justify-between font-black uppercase">
                    <span>API Key:</span>
                    <span className="text-rose-love">{user?.has_gemini_api_key ? "Connected" : "Not Set"}</span>
                  </div>
                  <div className="flex justify-between font-black uppercase">
                    <span>Resume Parsed:</span>
                    <span className="text-rose-love">{user?.resume_text ? "Success" : "Not Uploaded"}</span>
                  </div>
                  <div className="flex justify-between font-black uppercase">
                    <span>Gmail Sender:</span>
                    <span className="text-rose-love">{user?.gmail_connected ? user.sender_email : "Not Connected"}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Footer Buttons */}
          <div className="mt-8 pt-6 border-t-2 border-rose-border flex items-center justify-between">
            {step > 1 && step < 6 ? (
              <button
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1.5 text-xs font-black text-rose-muted hover:text-rose-text transition-colors uppercase"
              >
                <ArrowLeft size={16} />
                Back
              </button>
            ) : (
              <div />
            )}

            {step === 1 && (
              <button
                disabled={isUpdating}
                onClick={handleUpdateProfile}
                className="btn-primary flex items-center gap-1.5"
              >
                {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <span className="flex items-center gap-1.5">Save Profile <ArrowRight size={16} /></span>}
              </button>
            )}

            {step === 2 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(3)}
                  className="text-xs font-black text-rose-muted hover:text-rose-text transition-colors uppercase"
                >
                  Configure Later
                </button>
                <button
                  disabled={isUpdating}
                  onClick={handleSaveGeminiKey}
                  className="btn-primary flex items-center gap-1.5"
                >
                  {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <span className="flex items-center gap-1.5">Next <ArrowRight size={16} /></span>}
                </button>
              </div>
            )}

            {step === 3 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(4)}
                  className="text-xs font-black text-rose-muted hover:text-rose-text transition-colors uppercase"
                >
                  Skip
                </button>
                <button
                  disabled={!uploadedResumeFile || isUploadingResume}
                  onClick={() => setStep(4)}
                  className="btn-primary flex items-center gap-1.5"
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            )}

            {step === 4 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(5)}
                  className="text-xs font-black text-rose-muted hover:text-rose-text transition-colors uppercase"
                >
                  Skip
                </button>
                <button
                  disabled={isSavingTemplate}
                  onClick={handleSaveTemplate}
                  className="btn-primary flex items-center gap-1.5"
                >
                  {isSavingTemplate ? <Loader2 className="animate-spin" size={16} /> : <span className="flex items-center gap-1.5">Next <ArrowRight size={16} /></span>}
                </button>
              </div>
            )}

            {step === 5 && (
              <div className="flex gap-3">
                <button
                  onClick={() => setStep(6)}
                  className="text-xs font-black text-rose-muted hover:text-rose-text transition-colors uppercase"
                >
                  Skip for Now
                </button>
                <button
                  onClick={() => setStep(6)}
                  className="btn-primary flex items-center gap-1.5"
                >
                  Next <ArrowRight size={16} />
                </button>
              </div>
            )}

            {step === 6 && (
              <button
                disabled={isUpdating}
                onClick={handleFinishOnboarding}
                className="btn-primary py-3 px-6 flex items-center gap-2 mx-auto"
              >
                {isUpdating ? <Loader2 className="animate-spin" size={16} /> : <span className="flex items-center gap-2">Launch Dashboard <CheckCircle2 size={18} /></span>}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 border-t-2 border-rose-border text-xs text-rose-muted font-bold uppercase tracking-wider bg-rose-surface">
        © 2026 BulkReach. All configurations are securely hosted on sandbox.
      </footer>
    </div>
  );
}
