export type LogEventType = "sent" | "failed" | "bounced";

export interface SendLog {
  id: number;
  campaign: number;
  recipient: number | null;
  recipient_email: string;
  recipient_name: string;
  recipient_is_opened: boolean;
  recipient_opened_at: string | null;
  recipient_opened_count: number;
  timestamp: string;
  event_type: LogEventType;
  gmail_message_id: string;
  error_detail: string;
}
