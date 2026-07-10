import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/utils/constants";
import toast from "react-hot-toast";
import { Settings, Mail, CheckCircle2, AlertTriangle, Eye, EyeOff, Loader2, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { useConfirm } from "@/components/ui/dialogs";

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  show: { y: 0, opacity: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
};

export function SettingsPage() {
  const { user, accessToken, fetchUserProfile, connectGmailConfirm, deleteAccount } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const { confirm, modal } = useConfirm();
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const handleDeleteAccount = async () => {
    const ok = await confirm({
      title: "Delete Account Permanently",
      message: "Are you sure you want to permanently delete your account? This action is irreversible. All of your campaigns, templates, resumes, scraped jobs, and Google settings will be permanently deleted.",
      confirmLabel: "Delete Account",
      variant: "danger",
    });
    if (!ok) return;

    setIsDeletingAccount(true);
    try {
      await deleteAccount();
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete account.");
      setIsDeletingAccount(false);
    }
  };

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
  
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [senderName, setSenderName] = useState("");
  const [geminiApiKey, setGeminiApiKey] = useState("");
  const [geminiModel, setGeminiModel] = useState("gemini-3.5-flash");
  
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGmailDisconnecting, setIsGmailDisconnecting] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || "");
      setLastName(user.last_name || "");
      setSenderName(user.sender_name || "");
      setGeminiModel(user.gemini_model || "gemini-3.5-flash");
    }
  }, [user]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload: Record<string, string> = {
        first_name: firstName,
        last_name: lastName,
        sender_name: senderName,
        gemini_model: geminiModel,
      };
      if (geminiApiKey.trim()) {
        payload.gemini_api_key = geminiApiKey.trim();
      }

      const res = await fetch(`${API_BASE_URL}/auth/me/`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to update profile");
      }

      await fetchUserProfile();
      setGeminiApiKey(""); // clear key field after successful save
      toast.success("Profile settings updated successfully.");
    } catch (err) {
      toast.error("Failed to update profile settings.");
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/auth/gmail/connect/?redirect_to=settings`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      } else {
        toast.error("Failed to retrieve Google authentication link.");
      }
    } catch (err) {
      toast.error("Error connecting to Google.");
      console.error(err);
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
    setIsGmailDisconnecting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/gmail/disconnect/`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      await fetchUserProfile();
      toast.success("Gmail disconnected successfully.");
    } catch (err) {
      toast.error("Failed to disconnect Gmail.");
      console.error(err);
    } finally {
      setIsGmailDisconnecting(false);
    }
  };

  return (
    <motion.div
      initial="hidden"
      animate="show"
      className="space-y-8 animate-fade-in pb-12"
    >
      {/* Page Header */}
      <motion.div variants={itemVariants} className="border-b-2 border-rose-border pb-6">
        <h1 className="text-3xl font-extrabold text-rose-text tracking-tight flex items-center gap-2.5">
          <Settings size={28} className="text-rose-pine stroke-[2.5]" />
          Profile Settings
        </h1>
        <p className="text-rose-subtle mt-1.5 text-sm font-medium">
          View and update your personal details, AI credentials, and mail connection states.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Form Panel: Profile & Gemini Settings (2/3 width) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSave} className="card bg-rose-surface space-y-6 relative overflow-hidden">
            {/* Gradient top accent bar */}
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-pine via-rose-iris to-rose-foam" />
            <div>
              <h3 className="text-lg font-black text-rose-text mb-1 uppercase tracking-tight">Personal Details</h3>
              <p className="text-xs text-rose-muted mb-4">Your login profile and sender identity properties</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="label">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input"
                    placeholder="Abhishek"
                  />
                </div>
                <div>
                  <label className="label">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input"
                    placeholder="Tiwari"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="label">Sender Name (Email Signature)</label>
                <input
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  className="input"
                  placeholder="e.g. Abhishek Tiwari from TechCorp"
                />
                <p className="text-[10px] text-rose-muted mt-1.5 font-bold">
                  This signature name will be populated in all job outreach campaign templates under <code className="bg-rose-hl-low px-1 py-0.5 font-mono">{"{{sender_name}}"}</code>.
                </p>
              </div>
            </div>

            {/* Gradient section divider */}
            <div className="flex items-center gap-3 pt-6">
              <div className="h-[2px] flex-1" style={{ background: "linear-gradient(90deg, var(--color-pine), var(--color-iris))" }} />
              <h3 className="text-xs font-black text-rose-pine uppercase tracking-widest px-2 whitespace-nowrap">AI Settings (Gemini)</h3>
              <div className="h-[2px] flex-1" style={{ background: "linear-gradient(90deg, var(--color-iris), transparent)" }} />
            </div>
            <p className="text-xs text-rose-muted">Add or replace your personal Google Gemini API credentials</p>

              <div>
                <label className="label">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    className="input pr-10"
                    placeholder={user?.has_gemini_api_key ? "•••••••••••••••• (Key Configured. Enter to overwrite)" : "Paste your Gemini API key"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-rose-muted hover:text-rose-text"
                  >
                    {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <p className="text-[10px] text-rose-muted mt-1.5 font-bold">
                  Your Gemini API key is encrypted and stored safely. It is utilized to parse resumes and customize bulk outreach messages automatically.
                </p>
              </div>

              <div className="mt-4">
                <label className="label">Gemini AI Model</label>
                <select
                  value={geminiModel}
                  onChange={(e) => setGeminiModel(e.target.value)}
                  className="input font-bold"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash (Recommended - Fastest)</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (Most Powerful Reasoning)</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Reasoning)</option>
                </select>
                <p className="text-[10px] text-rose-muted mt-1.5 font-bold">
                  Choose the Google Gemini AI model used for resume parsing, outreach customization, and web scraper matching.
                </p>
              </div>

            {/* Gradient section divider before save button */}
            <div className="flex items-center gap-3 pt-4">
              <div className="h-[1px] flex-1 bg-rose-hl-med" />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary min-w-[120px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </form>
        </motion.div>

        {/* Right Info Panel: Email Integration (1/3 width) */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="card bg-rose-surface">
            <h3 className="text-lg font-black text-rose-text mb-1 uppercase tracking-tight">Outreach Mailbox</h3>
            <p className="text-xs text-rose-muted mb-4">Connect and authorize Gmail to dispatch your email campaigns</p>

            {user?.gmail_connected ? (
              <div className="space-y-5">
                <div className="p-4 bg-rose-foam/10 border-2 border-rose-foam/30 flex items-start gap-3">
                  <CheckCircle2 className="text-rose-foam stroke-[2.5] mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="text-xs font-black text-rose-text uppercase tracking-wide">Gmail Connected</p>
                    <p className="text-xs font-bold text-rose-foam mt-0.5 font-mono">{user?.sender_email}</p>
                  </div>
                </div>

                <div className="text-[10px] text-rose-muted font-bold leading-relaxed space-y-1">
                  <p>Authorized sender: <span className="text-rose-text">{user?.sender_email}</span></p>
                  <p>Access token status: <span className="text-rose-foam uppercase">Active & Valid</span></p>
                </div>

                <button
                  type="button"
                  onClick={handleDisconnectGmail}
                  disabled={isGmailDisconnecting}
                  className="btn-danger w-full justify-center text-xs py-2 font-bold"
                >
                  {isGmailDisconnecting ? (
                    <>
                      <Loader2 size={13} className="animate-spin" /> Disconnecting...
                    </>
                  ) : (
                    "Disconnect Gmail"
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="p-4 bg-rose-love/10 border-2 border-rose-love/30 flex items-start gap-3">
                  <AlertTriangle className="text-rose-love stroke-[2.5] mt-0.5 shrink-0" size={18} />
                  <div>
                    <p className="text-xs font-black text-rose-text uppercase tracking-wide">Gmail Disconnected</p>
                    <p className="text-xs text-rose-muted mt-0.5 font-bold">You must connect an account to initiate email outreach.</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleConnectGmail}
                  className="btn-primary w-full justify-center text-xs py-2 font-bold"
                >
                  <Mail size={13} /> Connect Gmail Account
                </button>
              </div>
            )}
          </div>
          
          <div className="card bg-rose-surface relative overflow-hidden">
            {/* Gradient top accent bar */}
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-pine to-rose-iris" />
            <h4 className="text-xs font-extrabold text-rose-text uppercase tracking-wider mb-4 flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-pine rounded-none" />
              Account Overview
            </h4>
            <div className="space-y-0 text-[11px]">
              {[
                { key: "Username", value: user?.username },
                { key: "Email", value: user?.email },
                { key: "Onboarded", value: "Yes" },
                { key: "AI Key", value: user?.has_gemini_api_key ? "Configured ✓" : "Not set" },
              ].map(({ key, value }) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-rose-hl-low last:border-b-0">
                  <span className="font-extrabold text-rose-muted uppercase tracking-wider text-[10px]">{key}</span>
                  <span className={`font-mono font-bold truncate max-w-[160px] text-right ${
                    key === "Onboarded" || (key === "AI Key" && user?.has_gemini_api_key) ? "text-rose-foam" : "text-rose-text"
                  }`}>{value ?? "—"}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card bg-rose-surface relative overflow-hidden border-2 border-rose-love/30">
            {/* Top accent bar */}
            <span className="absolute top-0 left-0 right-0 h-[3px] bg-rose-love" />
            <h4 className="text-xs font-black text-rose-love uppercase tracking-wider mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-love rounded-none" />
              Danger Zone
            </h4>
            <p className="text-xs text-rose-muted mb-4 font-medium leading-relaxed">
              Permanently delete your account and all associated data. This action is irreversible.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={isDeletingAccount}
              className="btn-danger w-full justify-center text-xs py-2 font-bold flex items-center gap-2"
            >
              {isDeletingAccount ? (
                <>
                  <Loader2 size={13} className="animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={13} /> Delete Account
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
      {modal}
    </motion.div>
  );
}
