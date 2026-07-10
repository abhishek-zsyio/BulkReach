import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/slices/authSlice";
import { useAuth } from "@/hooks/useAuth";
import toast from "react-hot-toast";

export function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { fetchUserProfile } = useAuth();

  useEffect(() => {
    const access = searchParams.get("access");
    const refresh = searchParams.get("refresh");

    if (access && refresh) {
      dispatch(
        setCredentials({
          user: {
            id: 0,
            username: "",
            email: "",
            first_name: "",
            last_name: "",
            sender_name: "",
            sender_email: "",
            gmail_connected: true,
            is_onboarded: false,
          },
          access,
          refresh,
        })
      );
      
      // Fetch full user profile details using the newly acquired access token
      fetchUserProfile(access)
        .then((profile) => {
          toast.success("Successfully signed in with Google!");
          // Route based on onboarding status — avoids flash-redirect from AuthGuard
          navigate(profile?.is_onboarded ? "/dashboard" : "/onboarding");
        })
        .catch(() => {
          toast.error("Failed to load user profile.");
          navigate("/login");
        });
    } else {
      toast.error("Google authentication failed.");
      navigate("/login");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-base">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-rose-hl-med border-t-rose-pine" />
        <div>
          <p className="text-rose-text font-bold text-lg">Authenticating with Google...</p>
          <p className="text-rose-subtle text-sm mt-1">Please wait while we set up your session.</p>
        </div>
      </div>
    </div>
  );
}
