// TypeScript types for Campaign domain
export type CampaignStatus =
  | "draft"
  | "queued"
  | "running"
  | "paused"
  | "done"
  | "failed"
  | "cancelled";

export interface EmailTemplate {
  id: number;
  name: string;
  subject: string;
  html_body: string;
  available_variables: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: number;
  name: string;
  subject_template: string;
  status: CampaignStatus;
  status_display: string;
  template: number | null;
  template_name: string | null;
  spreadsheet_file: string | null;
  google_sheet_id: string | null;
  google_sheet_sync_enabled: boolean;
  column_mapping: Record<string, string>;
  resume_attachment: string | null;
  resume: number | null;
  resume_name: string | null;
  send_delay_seconds: number;
  open_tracking_enabled: boolean;
  plain_text_mode: boolean;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  opened_count: number;
  progress_percent: number;
  celery_task_id: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface CampaignStats {
  total: number;
  sent: number;
  failed: number;
  pending: number;
  progress_percent: number;
  status: CampaignStatus;
}

export interface SpreadsheetPreview {
  columns: string[];
  preview: Record<string, string>[];
  total_rows: number;
}
