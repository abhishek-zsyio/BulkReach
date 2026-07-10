export type RecipientStatus = "pending" | "sent" | "failed" | "skipped";

export interface Recipient {
  id: number;
  campaign: number;
  email: string;
  name: string;
  raw_data: Record<string, string>;
  status: RecipientStatus;
  error_message: string;
  sent_at: string | null;
  created_at: string;
}
