import { ReactNode } from "react";
import { cn } from "@/utils/helpers";

interface WindowPanelProps {
  title: string;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  badge?: string;
}

export function WindowPanel({ title, children, className, headerClassName, badge }: WindowPanelProps) {
  return (
    <div className={cn("bg-rose-surface border-2 border-rose-border shadow-[4px_4px_0px_0px_var(--color-shadow)] relative flex flex-col rounded-none", className)}>
      {/* OS Bar */}
      <div className={cn("h-10 bg-rose-hl-low border-b-2 border-rose-border px-4 flex items-center justify-between select-none rounded-none", headerClassName)}>
        <div className="flex items-center gap-2">
          {/* Mock Mac/OS Dots */}
          <div className="flex gap-1.5 mr-2">
            <span className="w-2.5 h-2.5 border border-rose-border bg-rose-love rounded-full flex-shrink-0" />
            <span className="w-2.5 h-2.5 border border-rose-border bg-rose-gold rounded-full flex-shrink-0" />
            <span className="w-2.5 h-2.5 border border-rose-border bg-rose-foam rounded-full flex-shrink-0" />
          </div>
          <span className="font-display font-extrabold text-xs uppercase tracking-wider text-rose-text truncate">
            {title}
          </span>
        </div>
        
        {badge && (
          <span className="font-mono text-[9px] font-bold bg-rose-surface border border-rose-border px-2 py-0.5 uppercase tracking-widest text-rose-pine rounded-none">
            {badge}
          </span>
        )}
      </div>
      
      {/* Content Face */}
      <div className="p-6 flex-1 bg-rose-surface rounded-none">
        {children}
      </div>
    </div>
  );
}
