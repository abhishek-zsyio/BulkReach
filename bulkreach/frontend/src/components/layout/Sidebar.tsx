import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Send,
  Mail,
  ScanSearch,
  Zap,
  Activity,
  FileText,
  ChevronLeft,
  ChevronRight,
  Settings,
  Kanban,
  X,
} from "lucide-react";
import { cn } from "@/utils/helpers";

interface NavItem {
  to: string;
  icon: any;
  label: string;
}

const navItems: NavItem[] = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/campaigns", icon: Send, label: "Campaigns" },
  { to: "/templates", icon: Mail, label: "Templates" },
  { to: "/resumes", icon: FileText, label: "Resumes" },
  { to: "/scraper", icon: ScanSearch, label: "Research Hub" },
  { to: "/tracker", icon: Kanban, label: "Tracker" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  onToggleCollapse: () => void;
  onMobileClose: () => void;
}

export function Sidebar({ isCollapsed, isMobileOpen, onToggleCollapse, onMobileClose }: SidebarProps) {
  const location = useLocation();

  // Close mobile drawer on navigation
  useEffect(() => {
    onMobileClose();
  }, [location.pathname]);

  const getIconAnimation = (label: string) => {
    switch (label) {
      case "Dashboard":       return "group-hover:rotate-12 group-hover:scale-110";
      case "Campaigns":       return "group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:scale-110";
      case "Templates":       return "group-hover:scale-110 group-hover:-rotate-3";
      case "Resumes":         return "group-hover:rotate-6 group-hover:scale-110";
      case "Job Scraper":     return "group-hover:scale-110 group-hover:rotate-12";
      case "Company Research":return "group-hover:scale-110 group-hover:-rotate-6";
      case "Profile Research":return "group-hover:scale-110 group-hover:rotate-6";
      case "Research Hub":    return "group-hover:scale-110 group-hover:rotate-6";
      case "Tracker":         return "group-hover:scale-110 group-hover:rotate-6";
      case "Settings":        return "group-hover:rotate-45 group-hover:scale-110";
      default:                return "group-hover:scale-110";
    }
  };

  const sidebarContent = (
    <aside
      className={cn(
        "flex-shrink-0 flex flex-col bg-rose-surface border-r-2 border-rose-border transition-all duration-300 relative z-20 h-full",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className={cn("p-5 flex items-center border-b-2 border-rose-border", isCollapsed ? "justify-center" : "gap-3")}>
        <div
          className="w-10 h-10 rounded-none flex items-center justify-center flex-shrink-0 border-2 border-rose-border transition-all duration-300 hover:rotate-6 hover:scale-105 cursor-pointer shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[1px] hover:-translate-y-[1px]"
          style={{ background: "linear-gradient(135deg, var(--color-pine) 0%, var(--color-iris) 100%)" }}
        >
          <Zap size={18} className="text-white fill-white" />
        </div>
        {!isCollapsed && (
          <div className="animate-fade-in flex-1 min-w-0">
            <span className="font-black text-rose-text text-base tracking-tight uppercase">Bulk<span className="text-rose-pine">Reach</span></span>
            <p className="text-[9px] text-rose-iris font-black uppercase tracking-widest mt-0.5">Outreach Platform</p>
          </div>
        )}
        {/* Mobile close button */}
        <button
          onClick={onMobileClose}
          className="md:hidden ml-auto text-rose-muted hover:text-rose-text p-1 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-2 mt-3 overflow-y-auto">
        {!isCollapsed && (
          <p className="text-[10px] font-extrabold text-rose-muted uppercase tracking-widest px-3.5 mb-3.5">
            Navigation
          </p>
        )}
        {navItems.map((item) => {
          const Icon = item.icon;
          const label = item.label;

          const isItemActive = item.to === "/scraper"
            ? (location.pathname === "/scraper" || location.pathname === "/company-research" || location.pathname === "/profile-research")
            : (location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to + "/")));

          return (
            <NavLink
              key={item.to}
              to={item.to}
              title={isCollapsed ? label : undefined}
              className={
                cn(
                  "relative flex items-center px-3.5 py-3 rounded-none text-sm font-bold transition-all duration-300 group border-2 overflow-hidden",
                  isCollapsed ? "justify-center" : "gap-3",
                  isItemActive
                    ? "text-rose-pine border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                    : "text-rose-muted border-transparent hover:text-rose-text hover:bg-rose-hl-low hover:border-rose-border hover:shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] active:translate-x-0 active:translate-y-0"
                )
              }
            >
              {() => (
                <>
                  {isItemActive && (
                    <span
                      className="absolute inset-0 opacity-[0.08] pointer-events-none"
                      style={{ background: "linear-gradient(135deg, var(--color-pine) 0%, var(--color-iris) 100%)" }}
                    />
                  )}
                  {isItemActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-to-b from-rose-pine to-rose-iris" />
                  )}
                  <Icon
                    size={16}
                    className={cn(
                      "flex-shrink-0 transition-all duration-300 stroke-[2.5]",
                      isItemActive ? "text-rose-pine" : "text-rose-muted group-hover:text-rose-text",
                      getIconAnimation(label)
                    )}
                  />
                  {!isCollapsed && <span>{label}</span>}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom toggle */}
      <div className="p-4 border-t-2 border-rose-border flex flex-col gap-3">
        {!isCollapsed && (
          <div className="px-4 py-3 flex items-center gap-2.5 bg-rose-hl-low border-2 border-rose-border font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-foam opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-foam" />
            </span>
            <span className="text-[10px] text-rose-text font-extrabold uppercase tracking-wide">Live · Phase 3</span>
            <Activity size={12} className="ml-auto text-rose-muted" />
          </div>
        )}
        <button
          onClick={onToggleCollapse}
          className="hidden md:flex w-full py-2 items-center justify-center text-rose-text bg-rose-surface border-2 border-rose-border shadow-[2px_2px_0px_0px_var(--color-shadow)] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] hover:-translate-x-[2px] hover:-translate-y-[2px] hover:bg-rose-hl-low transition-all duration-150 group/toggle"
          title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight size={16} className="transition-transform duration-300 group-hover/toggle:translate-x-0.5" />
          ) : (
            <ChevronLeft size={16} className="transition-transform duration-300 group-hover/toggle:-translate-x-0.5" />
          )}
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden md:flex h-full">
        {sidebarContent}
      </div>

      {/* Mobile drawer overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 md:hidden"
          onClick={onMobileClose}
          style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
        />
      )}

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed top-0 left-0 bottom-0 z-50 md:hidden flex flex-col transition-transform duration-300",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ width: "280px" }}
      >
        <aside className="flex flex-col bg-rose-surface border-r-2 border-rose-border h-full w-full">
          {/* Mobile logo + close */}
          <div className="p-5 flex items-center gap-3 border-b-2 border-rose-border">
            <div
              className="w-10 h-10 flex items-center justify-center border-2 border-rose-border"
              style={{ background: "linear-gradient(135deg, var(--color-pine) 0%, var(--color-iris) 100%)" }}
            >
              <Zap size={18} className="text-white fill-white" />
            </div>
            <div className="flex-1">
              <span className="font-black text-rose-text text-base tracking-tight uppercase">Bulk<span className="text-rose-pine">Reach</span></span>
              <p className="text-[9px] text-rose-iris font-black uppercase tracking-widest mt-0.5">Outreach Platform</p>
            </div>
            <button onClick={onMobileClose} className="text-rose-muted hover:text-rose-text p-1 transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Mobile nav */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <p className="text-[10px] font-extrabold text-rose-muted uppercase tracking-widest px-3.5 mb-3.5">
              Navigation
            </p>
            {navItems.map((item) => {
              const Icon = item.icon;
              const label = item.label;

              const isItemActive = item.to === "/scraper"
                ? (location.pathname === "/scraper" || location.pathname === "/company-research" || location.pathname === "/profile-research")
                : (location.pathname === item.to || (item.to !== "/" && location.pathname.startsWith(item.to + "/")));

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={
                    cn(
                      "relative flex items-center gap-3 px-4 py-3.5 rounded-none text-sm font-bold transition-all duration-200 border-2 overflow-hidden",
                      isItemActive
                        ? "text-rose-pine border-rose-border bg-rose-hl-low shadow-[2px_2px_0px_0px_var(--color-shadow)]"
                        : "text-rose-muted border-transparent active:bg-rose-hl-low"
                    )
                  }
                >
                  {() => (
                    <>
                      {isItemActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-gradient-to-b from-rose-pine to-rose-iris" />
                      )}
                      <Icon
                        size={18}
                        className={cn(
                          "flex-shrink-0 stroke-[2.5]",
                          isItemActive ? "text-rose-pine" : "text-rose-muted",
                          getIconAnimation(label)
                        )}
                      />
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Mobile bottom */}
          <div className="p-4 border-t-2 border-rose-border">
            <div className="px-4 py-3 flex items-center gap-2.5 bg-rose-hl-low border-2 border-rose-border font-bold">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-foam opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-foam" />
              </span>
              <span className="text-[10px] text-rose-text font-extrabold uppercase tracking-wide">Live · Phase 3</span>
              <Activity size={12} className="ml-auto text-rose-muted" />
            </div>
          </div>
        </aside>
      </div>
    </>
  );
}
