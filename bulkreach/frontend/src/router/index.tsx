import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

// ── Lazy-loaded page components ───────────────────────────────────────────────
// Each page becomes its own JS chunk, loaded only when first visited.
// This drastically reduces the initial bundle size (FCP/TTI improvement).
const LandingPage    = React.lazy(() => import("@/pages/LandingPage").then(m => ({ default: m.LandingPage })));
const Login          = React.lazy(() => import("@/pages/Login").then(m => ({ default: m.Login })));
const GoogleCallback = React.lazy(() => import("@/pages/GoogleCallback").then(m => ({ default: m.GoogleCallback })));
const Onboarding     = React.lazy(() => import("@/pages/Onboarding").then(m => ({ default: m.Onboarding })));
const Dashboard      = React.lazy(() => import("@/pages/Dashboard").then(m => ({ default: m.Dashboard })));
const CampaignList   = React.lazy(() => import("@/pages/Campaigns/CampaignList").then(m => ({ default: m.CampaignList })));
const CampaignCreate = React.lazy(() => import("@/pages/Campaigns/CampaignCreate").then(m => ({ default: m.CampaignCreate })));
const CampaignDetail = React.lazy(() => import("@/pages/Campaigns/CampaignDetail").then(m => ({ default: m.CampaignDetail })));
const TemplateList   = React.lazy(() => import("@/pages/Templates/TemplateList").then(m => ({ default: m.TemplateList })));
const TemplateEditor = React.lazy(() => import("@/pages/Templates/TemplateEditor").then(m => ({ default: m.TemplateEditor })));
const SendLogs       = React.lazy(() => import("@/pages/Logs/SendLogs").then(m => ({ default: m.SendLogs })));
const ScraperDashboard = React.lazy(() => import("@/pages/Scraper/ScraperDashboard").then(m => ({ default: m.ScraperDashboard })));
const ResumeList     = React.lazy(() => import("@/pages/Resumes/ResumeList").then(m => ({ default: m.ResumeList })));
const SettingsPage   = React.lazy(() => import("@/pages/Settings").then(m => ({ default: m.SettingsPage })));
const CompanyResearch = React.lazy(() => import("@/pages/Scraper/CompanyResearch").then(m => ({ default: m.CompanyResearch })));
const Tracker         = React.lazy(() => import("@/pages/Tracker").then(m => ({ default: m.Tracker })));

// ── Page-level loading fallback ───────────────────────────────────────────────
function PageLoader({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-rose-base">
      <div className="w-10 h-10 rounded-full border-4 border-rose-love border-t-transparent animate-spin mb-4" />
      <p className="text-xs font-bold text-rose-subtle uppercase tracking-widest animate-pulse">
        {message}
      </p>
    </div>
  );
}

// ── Unified auth guard ────────────────────────────────────────────────────────
// Replaces the two near-identical RequireAuth / RequireAuthOnboarding components.
interface AuthGuardProps {
  children: React.ReactNode;
  /** When true, redirect onboarded users to /dashboard and allow non-onboarded through. */
  onboardingRoute?: boolean;
}

function AuthGuard({ children, onboardingRoute = false }: AuthGuardProps) {
  const { user, isAuthenticated, fetchUserProfile } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !user) {
      fetchUserProfile();
    }
  }, [isAuthenticated, user, fetchUserProfile]);

  // Not logged in at all — send to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Logged in but profile not yet loaded — always wait (no routing decision yet)
  // This prevents the flash-to-dashboard bug before is_onboarded is known
  if (!user) {
    return (
      <PageLoader
        message={onboardingRoute ? "Loading Setup Wizard..." : "Loading BulkReach..."}
      />
    );
  }

  if (onboardingRoute) {
    // Onboarding page: redirect already-onboarded users away
    if (user.is_onboarded) {
      return <Navigate to="/dashboard" replace />;
    }
  } else {
    // Protected app pages: redirect non-onboarded users to onboarding
    if (!user.is_onboarded) {
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
}

// ── Router ────────────────────────────────────────────────────────────────────
export function AppRouter() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/google-callback" element={<GoogleCallback />} />

        <Route
          path="/onboarding"
          element={
            <AuthGuard onboardingRoute>
              <Onboarding />
            </AuthGuard>
          }
        />

        <Route
          element={
            <AuthGuard>
              <AppLayout />
            </AuthGuard>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="campaigns" element={<CampaignList />} />
          <Route path="campaigns/new" element={<CampaignCreate />} />
          <Route path="campaigns/:id" element={<CampaignDetail />} />
          <Route path="campaigns/:id/logs" element={<SendLogs />} />
          <Route path="templates" element={<TemplateList />} />
          <Route path="templates/:id/edit" element={<TemplateEditor />} />
          <Route path="resumes" element={<ResumeList />} />
          <Route path="scraper" element={<ScraperDashboard />} />
          <Route path="company-research" element={<CompanyResearch />} />
          <Route path="tracker" element={<Tracker />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
