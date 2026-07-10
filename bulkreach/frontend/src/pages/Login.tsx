import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Zap, ArrowRight, Mail, Lock, ShieldCheck, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/utils/constants";
import toast from "react-hot-toast";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.05
    }
  }
};

const itemVariants = {
  hidden: { y: 15, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 100, damping: 16 }
  }
};

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ username: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const data = await login(form.username, form.password);
      toast.success("Welcome back!");
      // Route based on onboarding status — avoids flash-redirect from AuthGuard
      navigate(data.user?.is_onboarded ? "/dashboard" : "/onboarding");
    } catch (err: unknown) {
      const error = err as Error;
      toast.error(error.message || "Invalid credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/google/login-url/`);
      if (!response.ok) throw new Error("Failed to get Google login URL");
      const data = await response.json();
      if (data.auth_url) {
        window.location.href = data.auth_url;
      }
    } catch {
      toast.error("Failed to initiate Google sign in.");
    }
  };

  return (
    <div className="min-h-screen flex bg-rose-base font-sans">
      {/* ── Left Branding Panel ── */}
      <motion.div 
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: "spring", stiffness: 70, damping: 16 }}
        className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden bg-rose-surface border-r-2 border-rose-border"
      >
        <div className="grid-bg absolute inset-0 opacity-15 pointer-events-none" />

        {/* Logo */}
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 15 }}
              className="w-10 h-10 rounded-none flex items-center justify-center bg-gradient-brand border-2 border-rose-border cursor-pointer"
            >
              <Zap size={20} className="text-white fill-white" />
            </motion.div>
            <span className="font-black text-rose-text text-xl tracking-tight uppercase">
              Bulk<span className="text-rose-pine">Reach</span>
            </span>
          </div>
          <span className="badge bg-rose-surface text-rose-text text-[9px] font-black tracking-widest px-2 py-0.5 border-2 border-rose-border select-none">
            v2.1
          </span>
        </div>

        {/* Hero */}
        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="relative z-10 my-auto space-y-6"
        >
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-none text-xs font-black bg-rose-love/15 border-2 border-rose-border text-rose-love uppercase tracking-wider select-none"
          >
            <Sparkles size={12} className="text-rose-love fill-rose-love animate-pulse-slow" />
            AI-Powered Outreach Engine
          </motion.div>
          
          <motion.h1 
            variants={itemVariants}
            className="text-5xl font-black text-rose-text leading-tight tracking-tight uppercase"
          >
            Reach thousands,<br />
            <span className="bg-gradient-to-r from-rose-pine to-rose-iris bg-clip-text text-transparent font-black px-1 border-b-4 border-rose-pine/40">personally.</span>
          </motion.h1>
          
          <motion.p 
            variants={itemVariants}
            className="text-rose-muted text-sm leading-relaxed max-w-md font-bold"
          >
            AI-powered bulk email outreach that feels one-to-one. Upload your
            contacts, personalize your message using Gemini, and let BulkReach do the rest.
          </motion.p>

          {/* Mock Live Send Card */}
          <motion.div 
            variants={itemVariants}
            className="card bg-rose-surface relative overflow-hidden border-2 border-rose-border shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:shadow-[6px_6px_0px_0px_var(--color-iris)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all duration-300 max-w-md"
          >
            <div className="flex items-center justify-between border-b-2 border-rose-border pb-3 mb-4 select-none">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-foam opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-foam" />
                </span>
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-text">Outreach status</span>
              </div>
              <span className="badge-running py-0.5 px-2 text-[9px] font-bold">SENDING</span>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold select-none">
                <span className="text-rose-muted">Progress</span>
                <span className="text-rose-text font-extrabold">87%</span>
              </div>
              <div className="w-full h-3 border-2 border-rose-border bg-rose-base relative overflow-hidden">
                <motion.div 
                  className="h-full bg-gradient-brand border-r-2 border-rose-border animate-pulse-slow"
                  initial={{ width: 0 }}
                  animate={{ width: "87%" }}
                  transition={{ duration: 1.8, delay: 0.3, ease: "easeOut" }}
                />
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="flex gap-4">
                  <div>
                    <div className="text-[9px] text-rose-muted font-bold uppercase tracking-wider">Sent</div>
                    <div className="text-xs font-black text-rose-text">348 / 400</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-rose-muted font-bold uppercase tracking-wider">Opens</div>
                    <div className="text-xs font-black text-rose-foam">182 (52%)</div>
                  </div>
                </div>
                <div className="text-right select-none">
                  <span className="text-[9px] font-mono font-bold text-rose-muted">Speed: 2s delay</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Stats */}
          <motion.div 
            variants={itemVariants}
            className="grid grid-cols-3 gap-4 max-w-sm pt-4"
          >
            {[
              { label: "Emails Sent", value: "2M+", color: "text-rose-pine" },
              { label: "Open Rate", value: "54%", color: "text-rose-foam" },
              { label: "Success Rate", value: "99.8%", color: "text-rose-love" },
            ].map(({ label, value, color }) => (
              <motion.div
                key={label}
                whileHover={{ y: -3, x: -3, boxShadow: "5px 5px 0px 0px var(--color-text)" }}
                className="rounded-none p-3 text-center bg-rose-surface border-2 border-rose-border transition-all duration-150 cursor-pointer"
              >
                <div className={`text-xl font-black ${color}`}>{value}</div>
                <div className="text-[9px] text-rose-muted mt-1 font-bold uppercase tracking-wider">{label}</div>
              </motion.div>
            ))}
          </motion.div>
        </motion.div>

        <p className="text-rose-muted text-xs relative z-10 font-bold uppercase tracking-wider select-none">
          © {new Date().getFullYear()} BulkReach. Production-ready outreach platform.
        </p>
      </motion.div>

      {/* ── Right Login Panel ── */}
      <div className="flex-1 flex items-center justify-center p-8 relative bg-rose-base grid-bg noise-bg">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 90, damping: 16 }}
          className="w-full max-w-md bg-rose-surface border-2 border-rose-border p-8 shadow-[8px_8px_0px_0px_var(--color-shadow)] hover:shadow-[10px_10px_0px_0px_var(--color-iris)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all duration-300 relative"
        >
          {/* Security stamp badge */}
          <div className="absolute -top-4 right-6 bg-rose-base text-rose-foam border-2 border-rose-border px-3 py-1 font-bold text-[9px] uppercase tracking-wider flex items-center gap-1 shadow-[2px_2px_0px_0px_var(--color-shadow)] select-none">
            <ShieldCheck size={12} className="stroke-[3]" /> SECURE SESSION
          </div>

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8">
            <div className="w-8 h-8 rounded-none flex items-center justify-center text-white bg-gradient-brand border-2 border-rose-border animate-pulse-slow">
              <Zap size={16} className="fill-white" />
            </div>
            <span className="font-extrabold text-rose-text text-lg uppercase tracking-tight">Bulk<span className="text-rose-pine">Reach</span></span>
          </div>

          <h2 className="text-3xl font-black text-rose-text mb-2 tracking-tight uppercase select-none">Sign in</h2>
          <p className="text-rose-muted mb-6 text-sm font-semibold select-none">Enter your credentials to access your outreach dashboard.</p>

          <form id="login-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="username" className="label select-none">Username</label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="peer input pl-10 font-semibold text-sm"
                  placeholder="your_username"
                />
                <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-subtle peer-focus:text-rose-pine transition-colors duration-150" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label select-none">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="peer input pl-10 pr-10 font-semibold text-sm"
                  placeholder="••••••••"
                />
                <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-rose-subtle peer-focus:text-rose-pine transition-colors duration-150" />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-rose-subtle hover:text-rose-text transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="btn-primary w-full justify-center py-3.5 text-xs font-extrabold uppercase tracking-widest mt-2 shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:shadow-[5px_5px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-0 active:translate-y-0 active:shadow-[3px_3px_0px_0px_var(--color-shadow)] transition-all duration-300 group/btn"
            >
              {isLoading ? (
                <span className="animate-spin rounded-none h-4 w-4 border-2 border-white/30 border-t-white inline-block" />
              ) : (
                <>Sign in <ArrowRight size={14} className="stroke-[3] transition-transform duration-300 group-hover/btn:translate-x-0.5" /></>
              )}
            </button>
          </form>

          <div className="relative flex py-6 items-center select-none">
            <div className="flex-grow border-t-2 border-rose-border" />
            <span className="flex-shrink mx-4 text-rose-muted text-xs font-black uppercase tracking-wider">or</span>
            <div className="flex-grow border-t-2 border-rose-border" />
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="btn-secondary w-full justify-center py-3 text-xs flex items-center gap-2 font-extrabold uppercase tracking-wider shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:shadow-[5px_5px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-0 active:translate-y-0 active:shadow-[3px_3px_0px_0px_var(--color-shadow)] transition-all duration-300 group/google-btn"
          >
            <svg className="w-4 h-4 text-rose-text transition-transform duration-300 group-hover/google-btn:scale-110" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            Sign in with Google
          </button>

          <p className="text-center text-rose-muted text-xs mt-6 font-semibold uppercase tracking-wider select-none">
            Don&apos;t have an account?{" "}
            <a href="#" className="text-rose-iris font-bold hover:text-rose-pine transition-colors underline">
              Contact admin
            </a>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
