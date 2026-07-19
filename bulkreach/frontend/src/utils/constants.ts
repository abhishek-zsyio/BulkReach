export const API_BASE_URL = (() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  const isDesktop = typeof window !== "undefined" && (!!window.electronAPI || "__TAURI_IPC__" in window || window.location.protocol === "file:");

  if (envUrl && envUrl.trim() !== "") {
    if (isDesktop && envUrl.startsWith("/")) {
      return `http://127.0.0.1:8000${envUrl}`;
    }
    return envUrl;
  }
  const hostname = typeof window !== "undefined" ? window.location.hostname : "127.0.0.1";
  const targetHost = hostname === "localhost" || hostname === "" ? "127.0.0.1" : hostname;
  return `http://${targetHost}:8000/api`;
})();

export const TOKEN_KEY = "bulkreach_access";
export const REFRESH_TOKEN_KEY = "bulkreach_refresh";

export const CAMPAIGN_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  queued: "Queued",
  running: "Running",
  paused: "Paused",
  done: "Done",
  failed: "Failed",
  cancelled: "Cancelled",
};

export const LOG_POLL_INTERVAL_MS = 3000; // 3 seconds for campaign detail polling

export const MAX_RESUME_SIZE_MB = 5;
export const MAX_SPREADSHEET_SIZE_MB = 10;

export const SCRAPER_PLATFORMS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "naukri", label: "Naukri" },
  { value: "indeed", label: "Indeed" },
  { value: "web", label: "Web Search (DuckDuckGo)" },
  { value: "glassdoor", label: "Glassdoor" },
  { value: "wellfound", label: "Wellfound" },
  { value: "foundit", label: "Foundit (Monster)" },
  { value: "dice", label: "Dice" },
];
