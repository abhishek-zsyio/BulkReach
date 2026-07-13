import { NavLink } from "react-router-dom";
import { ScanSearch, Building2, UserCheck } from "lucide-react";
import { cn } from "@/utils/helpers";

export function ResearchTabs() {
  const tabs = [
    { to: "/scraper", icon: ScanSearch, label: "Job Scraper" },
    { to: "/company-research", icon: Building2, label: "Company Research" },
    { to: "/profile-research", icon: UserCheck, label: "Profile Research" },
  ];

  return (
    <div className="flex flex-wrap gap-2 border-b-2 border-rose-border pb-4 mb-6 shrink-0">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 px-5 py-3 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-2 rounded-none cursor-pointer shadow-[2px_2px_0px_0px_var(--color-shadow)]",
              isActive
                ? "text-rose-pine border-rose-border bg-rose-hl-low hover:translate-x-0 hover:translate-y-0 active:translate-x-0 active:translate-y-0"
                : "text-rose-muted border-rose-border/40 bg-rose-surface hover:text-rose-text hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0px_0px_var(--color-shadow)] active:translate-x-0 active:translate-y-0"
            )
          }
        >
          <tab.icon size={16} className="stroke-[2.5]" />
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
