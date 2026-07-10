import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

/** Merge Tailwind classes safely */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format ISO datetime to human-readable */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return format(new Date(iso), "MMM d, yyyy HH:mm");
}

/** Format ISO datetime to relative time (e.g. "3 minutes ago") */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatDistanceToNow(new Date(iso), { addSuffix: true });
}

/** Format bytes to human-readable size */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
}

/** Get status badge class name */
export function getStatusBadgeClass(status: string): string {
  const map: Record<string, string> = {
    draft: "badge-draft",
    queued: "badge-queued",
    running: "badge-running",
    done: "badge-done",
    failed: "badge-failed",
    paused: "badge-paused",
    cancelled: "badge-cancelled",
    sent: "badge-sent",
    pending: "badge-pending",
  };
  return map[status] ?? "badge-draft";
}

/** Truncate a string to maxLen characters */
export function truncate(str: string, maxLen = 40): string {
  return str.length > maxLen ? str.slice(0, maxLen) + "…" : str;
}

/** Download a blob as a file */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
