import { baseApi } from "./baseApi";

export interface JobApplication {
  id: number;
  company_name: string;
  job_title: string;
  stage: "saved" | "applied" | "interview" | "offer" | "rejected";
  stage_display: string;
  notes: string;
  contact_name: string;
  contact_email: string;
  interview_date: string | null;
  campaign: number | null;
  campaign_name: string | null;
  linkedin_url?: string;
  job_url?: string;
  created_at: string;
  updated_at: string;
}

export const applicationApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getJobApplications: builder.query<JobApplication[], void>({
      query: () => "/campaigns/applications/",
      providesTags: ["JobApplication"],
    }),
    createJobApplication: builder.mutation<JobApplication, Partial<JobApplication>>({
      query: (data) => ({
        url: "/campaigns/applications/",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["JobApplication"],
    }),
    updateJobApplication: builder.mutation<JobApplication, { id: number; data: Partial<JobApplication> }>({
      query: ({ id, data }) => ({
        url: `/campaigns/applications/${id}/`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["JobApplication"],
    }),
    deleteJobApplication: builder.mutation<void, number>({
      query: (id) => ({
        url: `/campaigns/applications/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["JobApplication"],
    }),
    bulkDeleteJobApplications: builder.mutation<{ success: boolean; message: string; deleted_count: number }, { ids?: number[]; stage?: string }>({
      query: (body) => ({
        url: "/campaigns/applications/bulk-delete/",
        method: "POST",
        body,
      }),
      invalidatesTags: ["JobApplication"],
    }),
  }),
});

export const {
  useGetJobApplicationsQuery,
  useCreateJobApplicationMutation,
  useUpdateJobApplicationMutation,
  useDeleteJobApplicationMutation,
  useBulkDeleteJobApplicationsMutation,
} = applicationApi;
