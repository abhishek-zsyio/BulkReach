import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "@/store";
import { store } from "@/store";
import { logout, setCredentials, setUser } from "@/store/slices/authSlice";
import { baseApi } from "@/api/baseApi";
import { REFRESH_TOKEN_KEY, API_BASE_URL } from "@/utils/constants";
import toast from "react-hot-toast";

export function useAuth() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated, accessToken } = useSelector(
    (state: RootState) => state.auth
  );

  const login = async (username: string, password: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/login/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    dispatch(
      setCredentials({ user: data.user, access: data.access, refresh: data.refresh })
    );
    return data;
  };

  const register = async (payload: {
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    password: string;
    password2: string;
  }) => {
    const res = await fetch(`${API_BASE_URL}/auth/register/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Registration failed");
    return data;
  };

  const logoutUser = async () => {
    try {
      const token = accessToken;
      if (token) {
        await fetch(`${API_BASE_URL}/auth/logout/`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      }
    } catch (error) {
      console.error("Failed to revoke Google tokens on logout:", error);
    } finally {
      dispatch(logout());
      // Clear all RTK Query cached data so new login starts fresh
      store.dispatch(baseApi.util.resetApiState());
      navigate("/login");
      toast.success("Logged out successfully.");
    }
  };

  const fetchUserProfile = async (overrideToken?: string) => {
    let token = overrideToken || accessToken;
    if (!token) throw new Error("No access token available.");
    
    let res = await fetch(`${API_BASE_URL}/auth/me/`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 401) {
      const refresh = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refresh) {
        const refreshRes = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh }),
        });
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          token = refreshData.access;
          res = await fetch(`${API_BASE_URL}/auth/me/`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.ok) {
            const data = await res.json();
            dispatch(setCredentials({ user: data, access: token!, refresh: refresh! }));
            return data;
          }
        }
      }
      logoutUser();
      throw new Error("Session expired.");
    }

    if (res.ok) {
      const data = await res.json();
      dispatch(setUser(data));
      return data;
    } else {
      logoutUser();
      throw new Error("Failed to retrieve user profile.");
    }
  };

  const connectGmailConfirm = async (code: string, state: string) => {
    const res = await fetch(`${API_BASE_URL}/auth/gmail/connect/confirm/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ code, state }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Failed to confirm Gmail connection.");
    dispatch(setUser(data));
    return data;
  };

  const deleteAccount = async () => {
    const res = await fetch(`${API_BASE_URL}/auth/me/`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) throw new Error("Failed to delete account");
    dispatch(logout());
    // Clear all RTK Query cached data — critical so re-registration starts fresh
    store.dispatch(baseApi.util.resetApiState());
    navigate("/login");
    toast.success("Your account has been deleted successfully.");
  };

  return { user, isAuthenticated, accessToken, login, register, logoutUser, fetchUserProfile, connectGmailConfirm, deleteAccount };
}
