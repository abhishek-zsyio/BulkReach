import { baseApi } from "./baseApi";
import type { SendLog } from "@/types/log";
import type { CampaignStats } from "@/types/campaign";

export const logApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getLogs: builder.query<
      { results: SendLog[]; count: number },
      { campaignId: number; event_type?: string; page?: number }
    >({
      query: ({ campaignId, event_type, page = 1 }) => ({
        url: `/logs/campaigns/${campaignId}/logs/`,
        params: { event_type, page },
      }),
      providesTags: ["Log"],
    }),
    getLogStats: builder.query<CampaignStats, number>({
      query: (campaignId) => `/logs/campaigns/${campaignId}/logs/stats/`,
    }),
  }),
});

export const { useGetLogsQuery, useGetLogStatsQuery } = logApi;
