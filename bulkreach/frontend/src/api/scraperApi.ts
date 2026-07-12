import { baseApi } from "./baseApi";
import type { ScrapeJob, ScrapeJobResults, CompanyEnrichment, ProfileResearch } from "@/types/scraper";

export const scraperApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getScrapeJobs: builder.query<ScrapeJob[], void>({
      query: () => "/scraper/jobs/",
      providesTags: ["ScrapeJob"],
    }),
    getScrapeJob: builder.query<ScrapeJob, number>({
      query: (id) => `/scraper/jobs/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "ScrapeJob", id }],
    }),
    createScrapeJob: builder.mutation<
      { id: number; message: string; task_id: string; job: ScrapeJob },
      { platform: string; keywords: string; location?: string; max_results?: number; campaign_id?: number; use_ai_matching?: boolean; freshness?: string; company_size?: string }
    >({
      query: (body) => ({
        url: "/scraper/jobs/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ScrapeJob"],
    }),
    getScrapeJobResults: builder.query<
      ScrapeJobResults,
      { id: number; page?: number; page_size?: number; search?: string; has_email?: boolean; has_recruiter?: boolean; location?: string; salary?: string }
    >({
      query: ({ id, page = 1, page_size = 100, search = "", has_email, has_recruiter, location, salary }) => {
        const params = new URLSearchParams();
        params.append("page", page.toString());
        params.append("page_size", page_size.toString());
        if (search) {
          params.append("search", search);
        }
        if (has_email) {
          params.append("has_email", "true");
        }
        if (has_recruiter) {
          params.append("has_recruiter", "true");
        }
        if (location) {
          params.append("location", location);
        }
        if (salary) {
          params.append("salary", salary);
        }
        return `/scraper/jobs/${id}/results/?${params.toString()}`;
      },
      providesTags: (_r, _e, { id }) => [{ type: "ScrapeJob", id }],
    }),
    importScrapedContacts: builder.mutation<
      { message: string; count: number; campaign_id: number; campaign_name: string },
      { id: number; campaign_id: number }
    >({
      query: ({ id, campaign_id }) => ({
        url: `/scraper/jobs/${id}/import/`,
        method: "POST",
        body: { campaign_id },
      }),
      invalidatesTags: ["Campaign", "Recipient"],
    }),
    cancelScrapeJob: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/scraper/jobs/${id}/cancel/`,
        method: "POST",
      }),
      invalidatesTags: ["ScrapeJob"],
    }),
    deleteScrapeJob: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/scraper/jobs/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["ScrapeJob"],
    }),
    clearScrapeJobs: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: "/scraper/jobs/",
        method: "DELETE",
      }),
      invalidatesTags: ["ScrapeJob"],
    }),
    updateScrapedContact: builder.mutation<
      { id: number; name: string; email: string; linkedin_url?: string },
      { id: number; name?: string; email?: string; linkedin_url?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/scraper/contacts/${id}/`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["ScrapeJob"],
    }),
    extractRecruiterDetails: builder.mutation<
      { success: boolean; name: string; email: string; linkedin_url: string; updated: boolean; found: boolean; requires_fallback?: boolean; used_fallback?: boolean; error?: string },
      { id: number; fallback?: boolean }
    >({
      query: ({ id, fallback }) => ({
        url: `/scraper/contacts/${id}/extract-recruiter/${fallback ? "?fallback=true" : ""}`,
        method: "POST",
      }),
      invalidatesTags: ["ScrapeJob"],
    }),

    // ── Company Enrichment ────────────────────────────────────────────────────
    getCompanyEnrichments: builder.query<CompanyEnrichment[], void>({
      query: () => "/scraper/companies/",
      providesTags: ["CompanyEnrichment"],
    }),
    getCompanyEnrichment: builder.query<CompanyEnrichment, number>({
      query: (id) => `/scraper/companies/${id}/`,
      providesTags: (_r, _e, id) => [{ type: "CompanyEnrichment", id }],
    }),
    createCompanyEnrichment: builder.mutation<
      CompanyEnrichment,
      { company_name: string; job_titles?: string[] }
    >({
      query: (body) => ({
        url: "/scraper/companies/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["CompanyEnrichment"],
    }),
    deleteCompanyEnrichment: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/scraper/companies/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["CompanyEnrichment"],
    }),
    importCompanyEmployees: builder.mutation<
      { success: boolean; message: string; count: number },
      { id: number; campaign_id: number; employee_ids?: number[] }
    >({
      query: ({ id, ...body }) => ({
        url: `/scraper/companies/${id}/import/`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["Campaign", "Recipient"],
    }),
    bulkDeleteScrapedContacts: builder.mutation<{ success: boolean; message: string; deleted_count: number }, number[]>({
      query: (ids) => ({
        url: "/scraper/contacts/bulk-delete/",
        method: "POST",
        body: { ids },
      }),
      invalidatesTags: ["ScrapeJob"],
    }),
    getProfileResearches: builder.query<ProfileResearch[], void>({
      query: () => "/scraper/profiles/",
      providesTags: ["ProfileResearch"],
    }),
    createProfileResearch: builder.mutation<ProfileResearch, { profile_url: string }>({
      query: (body) => ({
        url: "/scraper/profiles/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["ProfileResearch"],
    }),
    deleteProfileResearch: builder.mutation<{ success: boolean; message: string }, number>({
      query: (id) => ({
        url: `/scraper/profiles/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProfileResearch"],
    }),
  }),
});

export const {
  useGetScrapeJobsQuery,
  useGetScrapeJobQuery,
  useCreateScrapeJobMutation,
  useGetScrapeJobResultsQuery,
  useImportScrapedContactsMutation,
  useCancelScrapeJobMutation,
  useDeleteScrapeJobMutation,
  useClearScrapeJobsMutation,
  useUpdateScrapedContactMutation,
  useExtractRecruiterDetailsMutation,
  useGetCompanyEnrichmentsQuery,
  useGetCompanyEnrichmentQuery,
  useCreateCompanyEnrichmentMutation,
  useDeleteCompanyEnrichmentMutation,
  useImportCompanyEmployeesMutation,
  useBulkDeleteScrapedContactsMutation,
  useGetProfileResearchesQuery,
  useCreateProfileResearchMutation,
  useDeleteProfileResearchMutation,
} = scraperApi;

