import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "@/store";
import { logout, setCredentials } from "@/store/slices/authSlice";
import { REFRESH_TOKEN_KEY, API_BASE_URL } from "@/utils/constants";

const baseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.accessToken;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    return headers;
  },
});

/** RTK Query base with automatic JWT refresh on 401 */
const baseQueryWithReauth: typeof baseQuery = async (args, api, extraOptions) => {
  let result = await baseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401) {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      const refreshResult = await baseQuery(
        {
          url: "/auth/token/refresh/",
          method: "POST",
          body: { refresh: refreshToken },
        },
        api,
        extraOptions
      );

      if (refreshResult.data) {
        const data = refreshResult.data as { access: string };
        const state = api.getState() as RootState;
        api.dispatch(
          setCredentials({
            user: state.auth.user!,
            access: data.access,
            refresh: refreshToken,
          })
        );
        result = await baseQuery(args, api, extraOptions);
      } else {
        api.dispatch(logout());
      }
    } else {
      api.dispatch(logout());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "baseApi",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Campaign", "Template", "Recipient", "Log", "ScrapeJob", "Resume", "CompanyEnrichment", "JobApplication", "ProfileResearch", "AIStatus"],
  endpoints: () => ({}),
});
