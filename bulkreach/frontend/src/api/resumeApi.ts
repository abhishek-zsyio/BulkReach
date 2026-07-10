import { baseApi } from "./baseApi";

export interface Resume {
  id: number;
  name: string;
  file?: string;
  parsed_text: string;
  structured_data?: {
    name?: string;
    email?: string;
    phone?: string;
    github?: string;
    linkedin?: string;
    portfolio?: string;
    summary?: string;
    skills?: string[] | Record<string, string[]>;
    experience?: Array<{
      role: string;
      company: string;
      duration: string;
      description: string;
    }>;
    education?: Array<{
      degree: string;
      school: string;
      duration: string;
    }>;
    projects?: Array<{
      name: string;
      technologies?: string;
      link?: string;
      description: string;
    }>;
  };
  is_default: boolean;
  created_at: string;
}

export const resumeApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getResumes: builder.query<Resume[], void>({
      query: () => "/auth/resumes/",
      providesTags: ["Resume"],
    }),
    uploadResume: builder.mutation<Resume, FormData>({
      query: (formData) => ({
        url: "/auth/resumes/",
        method: "POST",
        body: formData,
      }),
      invalidatesTags: ["Resume"],
    }),
    createResume: builder.mutation<Resume, Partial<Resume>>({
      query: (data) => ({
        url: "/auth/resumes/",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Resume"],
    }),
    updateResume: builder.mutation<Resume, { id: number; data: Partial<Resume> }>({
      query: ({ id, data }) => ({
        url: `/auth/resumes/${id}/`,
        method: "PATCH",
        body: data,
      }),
      invalidatesTags: ["Resume"],
    }),
    deleteResume: builder.mutation<void, number>({
      query: (id) => ({
        url: `/auth/resumes/${id}/`,
        method: "DELETE",
      }),
      invalidatesTags: ["Resume"],
    }),
    tailorResume: builder.mutation<{ tailored_data: any }, { id: number; job_description: string }>({
      query: ({ id, job_description }) => ({
        url: `/auth/resumes/${id}/tailor/`,
        method: "POST",
        body: { job_description },
      }),
    }),
    parseResume: builder.mutation<Resume, number>({
      query: (id) => ({
        url: `/auth/resumes/${id}/parse/`,
        method: "POST",
      }),
      invalidatesTags: ["Resume"],
    }),
  }),
});

export const {
  useGetResumesQuery,
  useUploadResumeMutation,
  useCreateResumeMutation,
  useUpdateResumeMutation,
  useDeleteResumeMutation,
  useTailorResumeMutation,
  useParseResumeMutation,
} = resumeApi;
