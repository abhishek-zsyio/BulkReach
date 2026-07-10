import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import campaignReducer from "./slices/campaignSlice";
import { baseApi } from "@/api/baseApi";
import "@/api/resumeApi"; // Import to ensure endpoints are injected

export const store = configureStore({
  reducer: {
    auth: authReducer,
    campaign: campaignReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
