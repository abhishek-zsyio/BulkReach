import { useNavigate, useLocation } from "react-router-dom";
import { LogOut, User, Plus, Sun, Moon, Menu } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTheme } from "@/context/ThemeContext";

// Map route paths to display titles
const PAGE_TITLES: Record<string, { label: string; subtitle?: string }> = {
  "/dashboard":        { label: "Dashboard",         subtitle: "Your campaign overview" },
  "/campaigns":        { label: "Campaigns",          subtitle: "Manage your outreach" },
  "/campaigns/new":    { label: "New Campaign",       subtitle: "Create a new campaign" },
  "/templates":        { label: "Templates",          subtitle: "Email & message templates" },
  "/resumes":          { label: "Resumes",            subtitle: "Uploaded resumes" },
  "/scraper":          { label: "Job Scraper",        subtitle: "Discover job listings" },
  "/company-research": { label: "Company Research",  subtitle: "AI-powered employee discovery" },
  "/profile-research": { label: "Profile Research",  subtitle: "AI-powered LinkedIn profile insights" },
  "/settings":         { label: "Settings",           subtitle: "Account & integrations" },
  "/logs":             { label: "Logs",               subtitle: "Activity & email logs" },
  "/tracker":          { label: "Application Tracker",subtitle: "Track your job pipeline" },
};

function getPageInfo(pathname: string) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [path, info] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(path + "/")) return info;
  }
  return { label: "BulkReach", subtitle: "Outreach Platform" };
}

interface NavbarProps {
  onMobileMenuOpen: () => void;
}

export function Navbar({ onMobileMenuOpen }: NavbarProps) {
  const { user, logoutUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const displayName = user?.first_name || (user?.username ? user.username.split("@")[0] : "User");
  const pageInfo = getPageInfo(location.pathname);

  return (
    <header className="h-16 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 bg-rose-surface border-b-2 border-rose-border z-30 relative">
      {/* Top gradient line */}
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-rose-pine via-rose-iris to-rose-foam z-40" />

      {/* Left: hamburger (mobile) + page title */}
      <div className="flex items-center gap-3 min-w-0 overflow-hidden mr-4">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuOpen}
          className="md:hidden flex-shrink-0 w-9 h-9 flex items-center justify-center text-rose-text bg-rose-surface border-2 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:bg-rose-hl-low transition-all"
          aria-label="Open navigation menu"
        >
          <Menu size={16} />
        </button>

        <div className="flex flex-col justify-center min-w-0">
          <span className="text-rose-text text-sm font-extrabold tracking-tight truncate leading-tight">
            {pageInfo.label}
          </span>
          {pageInfo.subtitle && (
            <span className="hidden sm:block text-rose-muted text-[11px] font-semibold tracking-wide mt-0.5 truncate">
              {pageInfo.subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Gmail status — hidden on small mobile */}
        {user && (
          <div
            className={`hidden sm:flex items-center gap-2 text-[10px] px-3.5 py-1.5 font-extrabold border-2 transition-all duration-300 uppercase tracking-wider cursor-pointer shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] ${
              user.gmail_connected
                ? "bg-rose-foam/10 text-rose-foam border-rose-border"
                : "bg-rose-gold/10 text-rose-gold border-rose-border"
            }`}
            title={user.gmail_connected ? "Gmail is connected" : "Connect Gmail to send"}
          >
            <div className="relative flex h-2 w-2">
              {user.gmail_connected && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-foam opacity-75" />}
              <span className={`relative inline-flex rounded-full h-2 w-2 ${user.gmail_connected ? "bg-rose-foam" : "bg-rose-gold"}`} />
            </div>
            {user.gmail_connected ? "Gmail Connected" : "Gmail Offline"}
          </div>
        )}

        {/* New Campaign — icon-only on mobile */}
        <button
          id="new-campaign-btn"
          onClick={() => navigate("/campaigns/new")}
          className="btn-primary text-xs px-2 sm:px-4 py-2 font-extrabold uppercase tracking-wider flex items-center gap-2 group/btn relative overflow-hidden shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all"
        >
          <Plus size={14} className="stroke-[3] transition-transform duration-300 group-hover/btn:rotate-90 flex-shrink-0" />
          <span className="hidden sm:inline">New Campaign</span>
        </button>

        <div className="hidden sm:block w-[2px] h-6 bg-rose-hl-med mx-1" />

        {/* User avatar → settings */}
        <div
          onClick={() => navigate("/settings")}
          className="flex items-center gap-3 cursor-pointer group/nav"
          title={`Signed in as ${displayName} — Open Settings`}
        >
          <div className="hidden sm:flex flex-col items-end justify-center">
            <span className="text-xs text-rose-text font-black tracking-tight truncate max-w-[120px] group-hover/nav:text-rose-pine transition-colors">
              {displayName}
            </span>
            <span className="text-[9px] text-rose-muted font-extrabold uppercase tracking-widest border border-rose-muted/20 px-1.5 py-0.5 bg-rose-hl-low/40">
              Admin
            </span>
          </div>
          <div
            className="w-9 h-9 flex items-center justify-center text-white flex-shrink-0 border-2 border-rose-border transition-all duration-300 group-hover/nav:scale-105 group-hover/nav:rotate-3 shadow-[2px_2px_0px_0px_var(--color-shadow)]"
            style={{ background: "linear-gradient(135deg, var(--color-pine) 0%, var(--color-iris) 100%)" }}
          >
            <User size={15} />
          </div>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-9 h-9 flex items-center justify-center text-rose-text bg-rose-surface border-2 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-rose-hl-low transition-all group/theme"
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          {theme === "light" ? (
            <Moon size={15} className="transition-transform duration-300 group-hover/theme:-rotate-12" />
          ) : (
            <Sun size={15} className="transition-transform duration-500 group-hover/theme:rotate-90" />
          )}
        </button>

        {/* Logout */}
        <button
          id="logout-btn"
          onClick={logoutUser}
          className="w-9 h-9 flex items-center justify-center text-rose-text bg-rose-surface border-2 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-rose-hl-low transition-all group/logout"
          title="Logout"
        >
          <LogOut size={15} className="transition-transform duration-300 group-hover/logout:translate-x-0.5" />
        </button>
      </div>
    </header>
  );
}
