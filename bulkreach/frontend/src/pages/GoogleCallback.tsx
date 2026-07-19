import { useEffect, useState } from "react";
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
  const [statusText, setStatusText] = useState("Authenticating with Google...");
  const [subText, setSubText] = useState("Please wait while we set up your session.");
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    const access = searchParams.get("access");
    const refresh = searchParams.get("refresh");
    const state = searchParams.get("state") || "";
    const gmailConnected = searchParams.get("gmail_connected");
    const errorParam = searchParams.get("error");

    const isElectron = typeof window !== "undefined" && !!window.electronAPI;

    // Handle authentication error
    if (errorParam) {
      toast.error(errorParam === "auth_failed" ? "Google authentication failed." : errorParam);
      navigate("/login");
      return;
    }

    // Handle Connect Gmail callback
    if (gmailConnected === "success") {
      let targetPath = "/dashboard";
      if (state && state.includes(":")) {
        const parts = state.split(":");
        if (parts.length > 1 && parts[1]) {
          targetPath = `/${parts[1]}`;
        }
      }
      
      if (isElectron) {
        setIsSuccess(true);
        setStatusText("Gmail Connected!");
        setSubText("You can now close this browser tab and return to the TalentStream app.");
      } else {
        toast.success("Gmail connected successfully!");
        navigate(targetPath);
      }
      return;
    }

    if (access && refresh) {
      // Check if we initiated this login in this browser tab
      const isWebLoginActive = localStorage.getItem("google_login_active") === "true";
      localStorage.removeItem("google_login_active");

      if (!isElectron && !isWebLoginActive) {
        // We are in the external browser. Send the tokens back to the local Django server so the Electron app can fetch them.
        setStatusText("Desktop Auth Sync in progress...");
        setSubText("Sending login credentials back to your TalentStream app.");
        
        fetch("/api/auth/desktop-login/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ state, access, refresh }),
        })
          .then((res) => {
            if (res.ok) {
              setIsSuccess(true);
              setStatusText("Logged in Successfully!");
              setSubText("You can now close this browser tab and return to the TalentStream desktop app.");
              toast.success("Desktop authentication synchronized!");
            } else {
              setStatusText("Sync failed.");
              setSubText("Failed to forward credentials to the desktop app. Please try again.");
            }
          })
          .catch((err) => {
            console.error("Desktop login sync failed:", err);
            setStatusText("Sync failed.");
            setSubText("Could not connect to the local server. Make sure the TalentStream app is open.");
          });
      } else {
        // We are running inside the Electron app window directly, or in the browser directly (web version).
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
        
        fetchUserProfile(access)
          .then((profile) => {
            toast.success("Successfully signed in with Google!");
            navigate(profile?.is_onboarded ? "/dashboard" : "/onboarding");
          })
          .catch(() => {
            toast.error("Failed to load user profile.");
            navigate("/login");
          });
      }
    } else {
      toast.error("Google authentication failed.");
      navigate("/login");
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="h-full flex items-center justify-center bg-rose-base">
      <div className="flex flex-col items-center gap-4 text-center">
        {!isSuccess && (
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-rose-hl-med border-t-rose-pine" />
        )}
        {isSuccess && (
          <div className="w-12 h-12 rounded-full border-2 border-rose-foam bg-rose-foam/10 flex items-center justify-center text-rose-foam mb-2 text-xl font-bold">
            ✓
          </div>
        )}
        <div>
          <p className="text-rose-text font-bold text-lg">{statusText}</p>
          <p className="text-rose-subtle text-sm mt-1">{subText}</p>
        </div>
      </div>
    </div>
  );
}
