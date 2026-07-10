import { useState } from "react";
import { Download, Search } from "lucide-react";
import type { SendLog } from "@/types/log";
import { StatusBadge } from "@/components/campaign/StatusBadge";
import { formatDate } from "@/utils/helpers";
import { useAuth } from "@/hooks/useAuth";
import { API_BASE_URL } from "@/utils/constants";
import toast from "react-hot-toast";

interface LogTableProps {
  logs: SendLog[];
  isLoading?: boolean;
  onFilterChange?: (filter: string) => void;
  currentFilter?: string;
  campaignId?: number;
}

export function LogTable({
  logs,
  isLoading,
  onFilterChange,
  currentFilter = "",
  campaignId,
}: LogTableProps) {
  const [search, setSearch] = useState("");
  const { accessToken } = useAuth();

  const filtered = logs.filter(
    (l) =>
      l.recipient_email.toLowerCase().includes(search.toLowerCase()) ||
      l.recipient_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleExport = async () => {
    if (!campaignId) return;
    try {
      const response = await fetch(`${API_BASE_URL}/recipients/campaigns/${campaignId}/recipients/export/`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });
      if (!response.ok) {
        throw new Error("Failed to export recipients CSV");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `campaign_${campaignId}_recipients.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      toast.error("Failed to export CSV.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-rose-subtle" />
          <input
            id="log-search"
            type="text"
            placeholder="Search email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input pl-9 py-2 text-sm font-semibold"
          />
        </div>

        {onFilterChange && (
          <div className="flex rounded-none p-1 bg-rose-overlay border-2 border-rose-border gap-1 shadow-[2px_2px_0px_0px_var(--color-hl-low)]">
            {["", "sent", "failed"].map((f) => (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                className={`px-3.5 py-1 text-xs font-bold transition-all rounded-none border-2 ${
                  currentFilter === f
                    ? "bg-rose-surface border-rose-border text-rose-text shadow-[2px_2px_0px_0px_var(--color-shadow)] -translate-x-[1px] -translate-y-[1px]"
                    : "border-transparent text-rose-subtle hover:text-rose-text hover:bg-rose-overlay/40"
                }`}
              >
                {f === "" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}

        {campaignId && (
          <button onClick={handleExport} className="btn-secondary ml-auto font-bold">
            <Download size={14} />
            Export CSV
          </button>
        )}
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="table">
          <thead>
            <tr>
              <th>Recipient</th>
              <th>Email</th>
              <th>Status</th>
              <th>Opened</th>
              <th>Timestamp</th>
              <th>Error</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-rose-muted font-semibold">
                  Loading logs…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-rose-muted font-semibold">
                  No logs found.
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id}>
                  <td className="font-bold text-rose-text">{log.recipient_name || "—"}</td>
                  <td className="font-mono text-xs text-rose-subtle font-medium">{log.recipient_email}</td>
                  <td>
                    <StatusBadge status={log.event_type} />
                  </td>
                  <td>
                    {log.recipient_is_opened ? (
                      <span
                        className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-rose-iris bg-rose-iris/10 border-2 border-rose-border px-2 py-0.5 rounded-none"
                        title={log.recipient_opened_at ? `Opened at: ${formatDate(log.recipient_opened_at)} (Total opens: ${log.recipient_opened_count})` : `Total opens: ${log.recipient_opened_count}`}
                      >
                        Opened ({log.recipient_opened_count})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide text-rose-muted bg-rose-overlay border-2 border-rose-border px-2 py-0.5 rounded-none">
                        Unread
                      </span>
                    )}
                  </td>
                  <td className="text-rose-subtle font-medium">{formatDate(log.timestamp)}</td>
                  <td className="max-w-xs">
                    {log.error_detail ? (
                      <span className="text-rose-love text-xs font-semibold">{log.error_detail.slice(0, 80)}</span>
                    ) : (
                      <span className="text-rose-muted">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
