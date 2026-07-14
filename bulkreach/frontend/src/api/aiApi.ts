import { baseApi } from "./baseApi";

export interface AIStatusLog {
  id: number;
  request_type: string;
  model_name: string;
  timestamp: string;
}

export interface AIStatus {
  has_key: boolean;
  model: string;
  requests_today: number;
  daily_limit: number;
  recent_logs: AIStatusLog[];
}

export const aiApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAIStatus: builder.query<AIStatus, void>({
      query: () => "/auth/ai-status/",
      providesTags: ["AIStatus"],
    }),
  }),
});

export const { useGetAIStatusQuery } = aiApi;
