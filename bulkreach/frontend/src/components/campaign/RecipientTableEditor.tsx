import { useState, useEffect, useRef } from "react";
import { Plus, Trash2, Save, RefreshCw, AlertCircle, AlertTriangle, RotateCcw, Filter, X } from "lucide-react";
import {
  useGetRecipientsQuery,
  useBulkUpdateRecipientsMutation,
  useResendRecipientEmailMutation,
  useRetryAllFailedMutation,
} from "@/api/recipientApi";
import { useGetTemplateQuery } from "@/api/campaignApi";
import { StatusBadge } from "./StatusBadge";
import { formatDate } from "@/utils/helpers";
import toast from "react-hot-toast";

interface RecipientTableEditorProps {
  campaignId: number;
  templateId: number | null;
  onSaveSuccess?: () => void;
  isLive?: boolean;
  failedCount?: number;
}

// ── Pre-send validation modal ─────────────────────────────────────────────────

interface InvalidEmailModalProps {
  invalidEmails: { row: number; email: string }[];
  onClose: () => void;
}

function InvalidEmailModal({ invalidEmails, onClose }: InvalidEmailModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
    return () => dialogRef.current?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="bg-rose-base border-2 border-rose-love p-0 max-w-md w-full"
      style={{ boxShadow: "6px 6px 0px 0px var(--color-text)" }}
    >
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-none bg-rose-love/10 border-2 border-rose-border flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-rose-love" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-rose-text">Invalid Email Addresses</h2>
            <p className="text-xs text-rose-subtle mt-0.5 font-medium">
              Fix these {invalidEmails.length} address{invalidEmails.length !== 1 ? "es" : ""} before starting the campaign.
            </p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 border border-transparent hover:border-rose-border text-rose-muted hover:text-rose-text transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Invalid list */}
        <div className="max-h-60 overflow-y-auto space-y-1.5 border-2 border-rose-border bg-rose-overlay p-3">
          {invalidEmails.map(({ row, email }) => (
            <div key={row} className="flex items-center gap-3 text-sm">
              <span className="text-rose-muted font-bold w-8 text-right flex-shrink-0">#{row}</span>
              <span className="text-rose-love font-mono truncate">{email || <em className="not-italic text-rose-muted">empty</em>}</span>
            </div>
          ))}
        </div>

        <p className="text-xs text-rose-muted font-medium">
          Go back to the recipient table, fix the highlighted rows, then save before starting.
        </p>

        <button onClick={onClose} className="btn-primary w-full justify-center">
          Got it, I'll fix them
        </button>
      </div>
    </dialog>
  );
}

// ── Failed recipients banner ───────────────────────────────────────────────────

interface FailedBannerProps {
  campaignId: number;
  failedCount: number;
  isLive: boolean;
  onRetried: () => void;
  onFilterFailed: () => void;
}

function FailedBanner({ campaignId, failedCount, isLive, onRetried, onFilterFailed }: FailedBannerProps) {
  const [retryAllFailed, { isLoading: isRetrying }] = useRetryAllFailedMutation();

  const handleRetryAll = async () => {
    try {
      const res = await retryAllFailed(campaignId).unwrap();
      toast.success(res.message);
      onRetried();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to retry emails.");
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 border-2 border-rose-love bg-rose-love/10 animate-fade-in">
      <AlertTriangle size={16} className="text-rose-love flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-extrabold text-rose-love">
          {failedCount} email{failedCount !== 1 ? "s" : ""} failed to send
        </p>
        <p className="text-xs text-rose-muted font-medium mt-0.5">
          Check the error column — wrong addresses, full mailboxes, or SMTP rejections.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={onFilterFailed}
          className="btn-secondary text-xs py-1.5 px-3 gap-1.5"
        >
          <Filter size={12} /> View Failed
        </button>
        {!isLive && (
          <button
            onClick={handleRetryAll}
            disabled={isRetrying}
            className="btn-danger text-xs py-1.5 px-3 gap-1.5"
          >
            {isRetrying ? (
              <RefreshCw size={12} className="animate-spin" />
            ) : (
              <RotateCcw size={12} />
            )}
            Retry All
          </button>
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function RecipientTableEditor({
  campaignId,
  templateId,
  onSaveSuccess,
  isLive = false,
  failedCount = 0,
}: RecipientTableEditorProps) {
  // Tab state: "all" | "failed"
  const [activeTab, setActiveTab] = useState<"all" | "failed">("all");
  const [page, setPage] = useState(1);
  const [invalidModal, setInvalidModal] = useState<{ row: number; email: string }[] | null>(null);

  // Reset page when tab changes
  useEffect(() => { setPage(1); }, [activeTab]);

  // Queries & Mutations
  const statusFilter = activeTab === "failed" ? "failed" : undefined;
  const { data: recipientsData, isLoading: isLoadingRecipients, refetch } = useGetRecipientsQuery(
    { campaignId, status: statusFilter, page },
    { pollingInterval: isLive ? 3000 : 0 }
  );
  const { data: templateData } = useGetTemplateQuery(templateId ?? 0, { skip: !templateId });
  const [bulkUpdateRecipients, { isLoading: isSaving }] = useBulkUpdateRecipientsMutation();
  const [resendEmail, { isLoading: isResending }] = useResendRecipientEmailMutation();

  // Local state for editable rows
  const [rows, setRows] = useState<Record<string, any>[]>([]);
  const [deletedIds, setDeletedIds] = useState<number[]>([]);

  // Get custom template variables
  const variables = templateData?.available_variables ?? [];
  const customCols = variables.filter(
    (v) => !["email", "name", "recipient_email", "recipient_name"].includes(v.toLowerCase())
  );

  // Initialize rows from query data
  useEffect(() => {
    if (recipientsData?.results) {
      if (recipientsData.results.length > 0) {
        const initialRows = recipientsData.results.map((r) => {
          const rowObj: Record<string, any> = {
            id: r.id,
            email: r.email,
            name: r.name,
            status: r.status,
            error_message: r.error_message,
            sent_at: r.sent_at,
          };
          if (r.raw_data) {
            Object.entries(r.raw_data).forEach(([k, v]) => {
              const kLower = k.toLowerCase();
              if (kLower !== "email" && kLower !== "name" && kLower !== "recipient_email" && kLower !== "recipient_name") {
                rowObj[k] = v;
              }
            });
          }
          return rowObj;
        });
        setRows(initialRows);
      } else {
        setRows(activeTab === "all" ? [{ email: "", name: "" }] : []);
      }
      setDeletedIds([]);
    }
  }, [recipientsData, activeTab]);

  const handleAddRow = () => {
    const newRow: Record<string, any> = { email: "", name: "" };
    customCols.forEach((col) => { newRow[col] = ""; });
    setRows([...rows, newRow]);
  };

  const handleDeleteRow = (index: number) => {
    const rowToDelete = rows[index];
    if (rowToDelete.id) {
      setDeletedIds([...deletedIds, Number(rowToDelete.id)]);
    }
    const newRows = [...rows];
    newRows.splice(index, 1);
    setRows(newRows.length > 0 ? newRows : [{ email: "", name: "" }]);
  };

  const handleCellChange = (index: number, key: string, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [key]: value };
    setRows(newRows);
  };

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleResend = async (id: number) => {
    try {
      await resendEmail(id).unwrap();
      toast.success("Resend triggered!");
      refetch();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to trigger resend.");
    }
  };


  const handleSave = async () => {
    const sanitizedRows = rows.map((r) => {
      const { status, error_message, sent_at, ...rest } = r;
      const cleanRow: Record<string, any> = {
        ...rest,
        email: r.email.trim(),
        name: (r.name || "").trim(),
      };
      if (r.id) { cleanRow.id = r.id; }
      return cleanRow;
    });

    const activeRows = sanitizedRows.filter((r) => r.email || r.name);

    if (activeRows.length === 0 && deletedIds.length === 0) {
      toast.error("Please add at least one recipient or delete existing ones to save changes.");
      return;
    }

    const emailsSeen = new Set<string>();
    const invalid: { row: number; email: string }[] = [];
    let hasDuplicate = false;

    for (let i = 0; i < activeRows.length; i++) {
      const r = activeRows[i];
      if (!r.email) {
        toast.error("All active recipient rows must have an email.");
        return;
      }
      if (!isValidEmail(r.email)) {
        invalid.push({ row: i + 1, email: r.email });
      }
      if (emailsSeen.has(r.email.toLowerCase())) {
        hasDuplicate = true;
      }
      emailsSeen.add(r.email.toLowerCase());
    }

    if (invalid.length > 0) {
      setInvalidModal(invalid);
      return;
    }
    if (hasDuplicate) {
      toast.error("Duplicate emails are not allowed in the recipient list.");
      return;
    }

    try {
      const res = await bulkUpdateRecipients({
        campaignId,
        recipients: activeRows,
        deleted_ids: deletedIds,
      }).unwrap();

      if (res.sheet_sync_warning) {
        toast.success("Recipients updated locally!");
        toast.error(res.sheet_sync_warning, { duration: 6000 });
      } else {
        toast.success(res.message || "Recipients updated successfully!");
      }
      refetch();
      if (onSaveSuccess) onSaveSuccess();
    } catch (err: any) {
      toast.error(err?.data?.message || "Failed to update recipients.");
    }
  };

  const totalPages = recipientsData ? Math.ceil(recipientsData.count / 50) : 1;
  const totalCount = recipientsData?.count ?? 0;

  if (isLoadingRecipients) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <RefreshCw size={24} className="animate-spin text-rose-muted" />
        <p className="text-sm text-rose-subtle">Loading editor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Failed banner ── */}
      {failedCount > 0 && (
        <FailedBanner
          campaignId={campaignId}
          failedCount={failedCount}
          isLive={isLive}
          onRetried={() => { refetch(); setActiveTab("failed"); }}
          onFilterFailed={() => setActiveTab("failed")}
        />
      )}

      {/* ── Tab bar ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-rose-overlay border-2 border-rose-border p-1">
          <button
            onClick={() => setActiveTab("all")}
            className={`text-xs font-bold px-3 py-1.5 rounded-none border-2 transition-all ${
              activeTab === "all"
                ? "bg-rose-surface border-rose-border text-rose-text shadow-[2px_2px_0px_0px_var(--color-shadow)] -translate-x-[1px] -translate-y-[1px]"
                : "border-transparent text-rose-muted hover:text-rose-text"
            }`}
          >
            All Recipients
          </button>
          <button
            onClick={() => setActiveTab("failed")}
            className={`text-xs font-bold px-3 py-1.5 rounded-none border-2 transition-all flex items-center gap-1.5 ${
              activeTab === "failed"
                ? "bg-rose-surface border-rose-border text-rose-love shadow-[2px_2px_0px_0px_var(--color-shadow)] -translate-x-[1px] -translate-y-[1px]"
                : "border-transparent text-rose-muted hover:text-rose-love"
            }`}
          >
            <AlertCircle size={12} />
            Failed
            {failedCount > 0 && (
              <span className={`ml-0.5 px-1.5 py-0.5 rounded-none text-[10px] font-extrabold border-2 ${
                activeTab === "failed" ? "bg-rose-love/15 border-rose-border text-rose-love" : "bg-rose-love/5 border-rose-border/30 text-rose-love"
              }`}>
                {failedCount}
              </span>
            )}
          </button>
        </div>

        {/* Editor Controls */}
        <div className="flex items-center gap-2">
          {activeTab === "all" && (
            <>
              <button
                type="button"
                onClick={handleAddRow}
                disabled={isLive}
                className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={14} /> Add Row
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || isLive}
                className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
                Save Changes
              </button>
            </>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-xs text-rose-subtle font-medium -mt-1">
        {activeTab === "failed"
          ? `Showing ${totalCount} failed recipient${totalCount !== 1 ? "s" : ""}. Check the error column for the reason.`
          : "Edit list inline. Rows that have already been sent are locked from editing."}
      </p>

      {/* ── Editor Table ── */}
      <div className="w-full border-2 border-rose-border bg-rose-surface overflow-hidden">
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left border-collapse table-auto">
            <thead>
              <tr className="border-b border-rose-hl-low bg-rose-overlay text-xs font-bold text-rose-subtle uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4 min-w-[200px]">Email <span className="text-rose-love">*</span></th>
                <th className="py-3 px-4 min-w-[180px]">Name</th>
                {customCols.map((col) => (
                  <th key={col} className="py-3 px-4 min-w-[150px] capitalize">
                    {col.replace(/_/g, " ")}
                  </th>
                ))}
                <th className="py-3 px-4 min-w-[120px]">Status</th>
                <th className="py-3 px-4 min-w-[220px]">
                  {activeTab === "failed" ? "Failure Reason" : "Sent At / Info"}
                </th>
                <th className="py-3 px-4 w-28 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-hl-low">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + customCols.length}
                    className="py-12 text-center text-sm text-rose-muted font-semibold"
                  >
                    {activeTab === "failed" ? "🎉 No failed recipients!" : "No recipients yet. Add a row."}
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const emailError = row.email && !isValidEmail(row.email);
                  const isSent = row.status === "sent";
                  const isFailed = row.status === "failed";
                  const rowNum = (page - 1) * 50 + idx + 1;

                  return (
                    <tr
                      key={idx}
                      className={`group transition-colors ${
                        isFailed
                          ? "bg-rose-love/5 hover:bg-rose-love/10"
                          : "hover:bg-rose-overlay/30"
                      }`}
                    >
                      <td className="py-2.5 px-4 text-center text-xs text-rose-muted font-bold">
                        {rowNum}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="relative flex items-center">
                          <input
                            type="email"
                            value={row.email}
                            disabled={isSent || isLive}
                            onChange={(e) => handleCellChange(idx, "email", e.target.value)}
                            placeholder="recipient@example.com"
                            className={`w-full bg-rose-surface text-sm rounded-none border-2 px-3 py-1.5 text-rose-text placeholder-rose-muted focus:outline-none transition-all ${
                              isSent || isLive
                                ? "opacity-60 cursor-not-allowed border-transparent bg-transparent"
                                : emailError
                                ? "border-rose-love bg-rose-love/5 text-rose-love focus:shadow-[2px_2px_0px_0px_var(--color-love)]"
                                : "border-rose-hl-low focus:border-rose-border focus:shadow-[2px_2px_0px_0px_var(--color-iris)]"
                            }`}
                          />
                          {emailError && !isSent && (
                            <div className="absolute right-3 text-rose-love" title="Invalid email format">
                              <AlertCircle size={14} />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-4">
                        <input
                          type="text"
                          value={row.name}
                          disabled={isSent || isLive}
                          onChange={(e) => handleCellChange(idx, "name", e.target.value)}
                          placeholder="John Doe"
                          className={`w-full bg-rose-surface text-sm rounded-none border-2 px-3 py-1.5 text-rose-text placeholder-rose-muted focus:outline-none transition-all ${
                            isSent || isLive
                              ? "opacity-60 cursor-not-allowed border-transparent bg-transparent"
                              : "border-rose-hl-low focus:border-rose-border focus:shadow-[2px_2px_0px_0px_var(--color-iris)]"
                          }`}
                        />
                      </td>
                      {customCols.map((col) => (
                        <td key={col} className="py-2.5 px-4">
                          <input
                            type="text"
                            value={row[col] ?? ""}
                            disabled={isSent || isLive}
                            onChange={(e) => handleCellChange(idx, col, e.target.value)}
                            placeholder={`Value for ${col.replace(/_/g, " ")}`}
                            className={`w-full bg-rose-surface text-sm rounded-none border-2 px-3 py-1.5 text-rose-text placeholder-rose-muted focus:outline-none transition-all ${
                              isSent || isLive
                                ? "opacity-60 cursor-not-allowed border-transparent bg-transparent"
                                : "border-rose-hl-low focus:border-rose-border focus:shadow-[2px_2px_0px_0px_var(--color-iris)]"
                            }`}
                          />
                        </td>
                      ))}
                      <td className="py-2.5 px-4">
                        {row.status ? (
                          <StatusBadge status={row.status} />
                        ) : (
                          <span className="text-xs text-rose-muted font-medium">Draft</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs">
                        {row.error_message ? (
                          <div className="flex items-start gap-1.5">
                            <AlertCircle size={12} className="text-rose-love flex-shrink-0 mt-0.5" />
                            <span
                              className="text-rose-love font-semibold leading-snug"
                              title={row.error_message}
                            >
                              {row.error_message.length > 80
                                ? row.error_message.slice(0, 80) + "…"
                                : row.error_message}
                            </span>
                          </div>
                        ) : row.sent_at ? (
                          <span className="text-rose-subtle">Sent at {formatDate(row.sent_at)}</span>
                        ) : (
                          <span className="text-rose-muted">—</span>
                        )}
                      </td>
                      <td className="py-2.5 px-4">
                        <div className="flex items-center justify-center gap-2">
                          {row.id && (
                            <button
                              type="button"
                              disabled={isResending || isLive || row.status === "pending"}
                              onClick={() => handleResend(row.id)}
                              className="btn-secondary text-[11px] py-1 px-2.5 disabled:opacity-50 disabled:cursor-not-allowed font-bold"
                              title={
                                isLive
                                  ? "Cannot resend while campaign is active"
                                  : row.status === "pending"
                                  ? "Email is already pending"
                                  : "Resend Email"
                              }
                            >
                              Resend
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteRow(idx)}
                            disabled={isSent || isLive}
                            className="p-1.5 text-rose-muted hover:text-rose-love hover:bg-rose-love/10 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-rose-border"
                            title={isSent ? "Cannot delete sent recipient" : "Delete Row"}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 bg-rose-surface/50 border-2 border-rose-border">
          <span className="text-[11px] text-rose-subtle font-bold">
            Showing page <span className="text-rose-text">{page}</span> of{" "}
            <span className="text-rose-text">{totalPages}</span>
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-50"
            >
              Prev
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="btn-secondary py-1 px-2.5 text-xs disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Invalid Email Modal */}
      {invalidModal && (
        <InvalidEmailModal
          invalidEmails={invalidModal}
          onClose={() => setInvalidModal(null)}
        />
      )}
    </div>
  );
}
