import { Linkedin, Search, Target, Zap, Briefcase, Dices } from "lucide-react";

export function IndeedIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 8v8M12 4h.01" />
      <path d="M6 20c4-1 8-1 12 0" />
    </svg>
  );
}

export function NaukriIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M7 18V6l10 12V6" />
    </svg>
  );
}

export function PlatformIcon({ platform, className }: { platform: string; className?: string }) {
  const cn = className || "w-4 h-4";
  switch (platform.toLowerCase()) {
    case "linkedin":
      return <Linkedin className={cn} />;
    case "naukri":
      return <NaukriIcon className={cn} />;
    case "indeed":
      return <IndeedIcon className={cn} />;
    case "web":
      return <Search className={cn} />;
    case "glassdoor":
      return <Target className={cn} />;
    case "wellfound":
      return <Zap className={cn} />;
    case "foundit":
      return <Briefcase className={cn} />;
    case "dice":
      return <Dices className={cn} />;
    default:
      return <Briefcase className={cn} />;
  }
}
