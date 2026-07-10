import { baseApi } from "./baseApi";
import type { Recipient } from "@/types/recipient";

export const recipientApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRecipients: builder.query<
      { results: Recipient[]; count: number },
      { campaignId: number; status?: string; page?: number }
    >({
      query: ({ campaignId, status, page = 1 }) => ({
        url: `/recipients/campaigns/${campaignId}/recipients/`,
        params: { status, page },
      }),
      providesTags: ["Recipient"],
    }),
    bulkUpdateRecipients: builder.mutation<
      { message: string; recipients: Recipient[]; total_recipients: number; sheet_sync_warning?: string | null },
      { campaignId: number; recipients: Record<string, string | number>[]; deleted_ids?: number[] }
    >({
      query: ({ campaignId, recipients, deleted_ids = [] }) => ({
        url: `/recipients/campaigns/${campaignId}/recipients/bulk-update/`,
        method: "POST",
        body: { recipients, deleted_ids },
      }),
      invalidatesTags: ["Recipient", "Campaign"],
    }),
    resendRecipientEmail: builder.mutation<
      { message: string; recipient_id: number; campaign_status: string },
      number
    >({
      query: (recipientId) => ({
        url: `/recipients/${recipientId}/resend/`,
        method: "POST",
      }),
      invalidatesTags: ["Recipient", "Campaign"],
    }),
    /** Retry all failed recipients for a campaign in one shot. */
    retryAllFailed: builder.mutation<
      { message: string; retried: number },
      number // campaignId
    >({
      query: (campaignId) => ({
        url: `/recipients/campaigns/${campaignId}/recipients/retry-failed/`,
        method: "POST",
      }),
      invalidatesTags: ["Recipient", "Campaign"],
    }),
  }),
});

export const {
  useGetRecipientsQuery,
  useBulkUpdateRecipientsMutation,
  useResendRecipientEmailMutation,
  useRetryAllFailedMutation,
} = recipientApi;
