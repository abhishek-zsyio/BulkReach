import { baseApi } from "./baseApi";
import type { Campaign, EmailTemplate, SpreadsheetPreview } from "@/types/campaign";

export const campaignApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // ── Campaigns ───────────────────────────────────────
    getCampaigns: builder.query<Campaign[], void>({
      query: () => "/campaigns/",
      providesTags: ["Campaign"],
    }),
    getCampaign: builder.query<Campaign, number>({
      query: (id) => `/campaigns/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Campaign", id }],
    }),
    createCampaign: builder.mutation<Campaign, Partial<Campaign>>({
      query: (body) => ({ url: "/campaigns/", method: "POST", body }),
      invalidatesTags: ["Campaign"],
    }),
    updateCampaign: builder.mutation<Campaign, { id: number; data: Partial<Campaign> }>({
      query: ({ id, data }) => ({ url: `/campaigns/${id}/`, method: "PATCH", body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Campaign", id }, "Campaign"],
    }),
    deleteCampaign: builder.mutation<void, number>({
      query: (id) => ({ url: `/campaigns/${id}/`, method: "DELETE" }),
      invalidatesTags: ["Campaign"],
    }),
    startCampaign: builder.mutation<{ message: string; task_id: string }, number>({
      query: (id) => ({ url: `/campaigns/${id}/start/`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Campaign", id }],
    }),
    pauseCampaign: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/campaigns/${id}/pause/`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Campaign", id }],
    }),
    cancelCampaign: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/campaigns/${id}/cancel/`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Campaign", id }],
    }),
    uploadSpreadsheet: builder.mutation<SpreadsheetPreview, { id: number; file: File }>({
      query: ({ id, file }) => {
        const form = new FormData();
        form.append("file", file);
        return { url: `/campaigns/${id}/upload-spreadsheet/`, method: "POST", body: form };
      },
    }),
    mapColumns: builder.mutation<{ message: string }, { id: number; mapping: Record<string, string> }>({
      query: ({ id, mapping }) => ({
        url: `/campaigns/${id}/map-columns/`,
        method: "POST",
        body: { mapping },
      }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Campaign", id }],
    }),
    importRecipients: builder.mutation<{ created: number; skipped: number }, number>({
      query: (id) => ({ url: `/recipients/campaigns/${id}/recipients/import/`, method: "POST" }),
      invalidatesTags: ["Recipient"],
    }),
    createGoogleSheet: builder.mutation<{ message: string; google_sheet_id: string; spreadsheet_url: string; column_mapping: Record<string, string> }, number>({
      query: (id) => ({ url: `/campaigns/${id}/google-sheet/create/`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Campaign", id }, "Campaign"],
    }),
    syncGoogleSheet: builder.mutation<{ message: string; created: number; skipped: number }, number>({
      query: (id) => ({ url: `/campaigns/${id}/google-sheet/sync/`, method: "POST" }),
      invalidatesTags: (_r, _e, id) => [{ type: "Campaign", id }, "Campaign", "Recipient"],
    }),

    // ── Gmail OAuth ──────────────────────────────────────
    /** Returns the Google OAuth redirect URL. Lazy-fetched by the Dashboard when user clicks Connect. */
    getGmailAuthUrl: builder.query<{ auth_url: string }, string>({
      query: (redirectTo) => `/auth/gmail/connect/?redirect_to=${redirectTo}`,
    }),
    /** Disconnect the currently linked Gmail account. */
    disconnectGmail: builder.mutation<{ message: string }, void>({
      query: () => ({ url: "/auth/gmail/disconnect/", method: "POST" }),
    }),

    // ── Templates ───────────────────────────────────────
    getTemplates: builder.query<EmailTemplate[], void>({
      query: () => "/templates/",
      providesTags: ["Template"],
    }),
    getTemplate: builder.query<EmailTemplate, number>({
      query: (id) => `/templates/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "Template", id }],
    }),
    createTemplate: builder.mutation<EmailTemplate, Partial<EmailTemplate>>({
      query: (body) => ({ url: "/templates/", method: "POST", body }),
      invalidatesTags: ["Template"],
    }),
    updateTemplate: builder.mutation<EmailTemplate, { id: number; data: Partial<EmailTemplate> }>({
      query: ({ id, data }) => ({ url: `/templates/${id}/`, method: "PUT", body: data }),
      invalidatesTags: (_r, _e, { id }) => [{ type: "Template", id }, "Template"],
    }),
    deleteTemplate: builder.mutation<void, number>({
      query: (id) => ({ url: `/templates/${id}/`, method: "DELETE" }),
      invalidatesTags: ["Template"],
    }),
    previewTemplate: builder.mutation<{ html: string; subject: string }, { id: number; sample_data: Record<string, string>; subject?: string }>({
      query: ({ id, ...body }) => ({
        url: `/templates/${id}/preview/`,
        method: "POST",
        body,
      }),
    }),
    generateTemplate: builder.mutation<{ subject: string; html_body: string }, { job_role: string; company_name?: string; resume_id?: number }>({
      query: (body) => ({
        url: "/templates/generate/",
        method: "POST",
        body,
      }),
    }),
  }),
});

export const {
  useGetCampaignsQuery,
  useGetCampaignQuery,
  useCreateCampaignMutation,
  useUpdateCampaignMutation,
  useDeleteCampaignMutation,
  useStartCampaignMutation,
  usePauseCampaignMutation,
  useCancelCampaignMutation,
  useUploadSpreadsheetMutation,
  useMapColumnsMutation,
  useImportRecipientsMutation,
  useCreateGoogleSheetMutation,
  useSyncGoogleSheetMutation,
  useGetGmailAuthUrlQuery,
  useDisconnectGmailMutation,
  useGetTemplatesQuery,
  useGetTemplateQuery,
  useCreateTemplateMutation,
  useUpdateTemplateMutation,
  useDeleteTemplateMutation,
  usePreviewTemplateMutation,
  useGenerateTemplateMutation,
} = campaignApi;
