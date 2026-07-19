import { ReactNode, useEffect, useState } from "react";
import { API_BASE_URL } from "@/utils/constants";

interface BackendInitializerProps {
  children: ReactNode;
}

export function BackendInitializer({ children }: BackendInitializerProps) {
  const [isReady, setIsReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [progress, setProgress] = useState(0);
  const [, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isReady) return;

    // 1. Increment elapsed timer
    const timer = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [isReady]);

  useEffect(() => {
    if (isReady) return;

    // 2. Simulated progress bar (climbing to 95%, only hits 100% on success)
    const progressTimer = setInterval(() => {
      setProgress((prev) => {
        if (prev < 40) return prev + 8; // fast start
        if (prev < 70) return prev + 3; // medium slowing
        if (prev < 95) return prev + 1; // very slow crawl
        return prev;
      });
    }, 500);

    return () => clearInterval(progressTimer);
  }, [isReady]);

  useEffect(() => {
    if (isReady) return;

    let active = true;
    let pollInterval: NodeJS.Timeout;

    const checkHealth = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/health/`, {
          method: "GET",
          headers: { "Accept": "application/json" },
        });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "ok") {
            if (active) {
              setProgress(100);
              // Wait slightly for animation to complete
              setTimeout(() => {
                setIsReady(true);
              }, 400);
            }
            return true;
          }
        }
      } catch (err) {
        if (active) {
          setErrorMsg(err instanceof Error ? err.message : "Connection failed");
        }
      }
      return false;
    };

    // Run first check immediately
    checkHealth().then((success) => {
      if (!success && active) {
        // Start polling if first check fails
        pollInterval = setInterval(checkHealth, 2000);
      }
    });

    return () => {
      active = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isReady]);

  if (isReady) {
    return <>{children}</>;
  }

  // Determine message based on elapsed time
  let statusMessage = "Establishing connection with TalentStream engine...";
  if (elapsed >= 3 && elapsed < 8) {
    statusMessage = "Configuring local SQLite database...";
  } else if (elapsed >= 8 && elapsed < 15) {
    statusMessage = "Applying database migrations & starting services...";
  } else if (elapsed >= 15) {
    statusMessage = "Still waiting for migrations to complete. Checking services...";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-base p-6 select-none font-sans">
      <div className="w-full max-w-md bg-rose-surface border-2 border-rose-border shadow-[6px_6px_0px_0px_var(--color-shadow)] relative flex flex-col rounded-none overflow-hidden animate-slide-up">
        {/* Header Bar */}
        <div className="h-10 bg-rose-hl-low border-b-2 border-rose-border px-4 flex items-center justify-between select-none">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5 mr-2">
              <span className="w-2.5 h-2.5 border border-rose-border bg-rose-love rounded-full flex-shrink-0 animate-pulse" />
              <span className="w-2.5 h-2.5 border border-rose-border bg-rose-gold rounded-full flex-shrink-0" />
              <span className="w-2.5 h-2.5 border border-rose-border bg-rose-foam rounded-full flex-shrink-0" />
            </div>
            <span className="font-display font-extrabold text-xs uppercase tracking-wider text-rose-text">
              System Initialization
            </span>
          </div>
          <span className="font-mono text-[9px] font-bold bg-rose-surface border border-rose-border px-2 py-0.5 uppercase tracking-widest text-rose-pine">
            Desktop v1.0
          </span>
        </div>

        {/* Content */}
        <div className="p-8 flex flex-col items-center text-center">
          {/* Logo / Pulsing Circle */}
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-none border-2 border-rose-border flex items-center justify-center bg-rose-hl-low shadow-[3px_3px_0px_0px_var(--color-shadow)] animate-pulse-slow">
              <span className="font-display font-extrabold text-xl text-rose-pine">BR</span>
            </div>
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-rose-border bg-rose-love animate-ping" />
            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border border-rose-border bg-rose-love" />
          </div>

          <h2 className="font-display font-extrabold text-base uppercase text-rose-text tracking-wide mb-2">
            Initializing TalentStream
          </h2>
          <p className="text-xs text-rose-subtle font-medium mb-6 min-h-[32px] flex items-center justify-center max-w-[280px]">
            {statusMessage}
          </p>

          {/* Progress Bar Container */}
          <div className="w-full bg-rose-hl-low border-2 border-rose-border p-1 mb-4 h-9 flex items-center">
            <div
              className="bg-rose-pine h-full transition-all duration-300 border-r border-rose-border"
              style={{ width: `${progress}%` }}
            />
            {progress === 0 && <div className="text-[10px] font-mono text-rose-muted pl-2">WAITING...</div>}
          </div>

          {/* Progress text */}
          <div className="w-full flex justify-between items-center text-[10px] font-mono font-bold text-rose-muted uppercase tracking-wider mb-6">
            <span>Progress: {progress}%</span>
            <span>Elapsed: {elapsed}s</span>
          </div>

          {/* Troubleshoot / Alert Box if took too long */}
          {elapsed >= 12 && (
            <div className="w-full border-2 border-rose-border border-dashed p-4 bg-rose-hl-low/40 text-left text-xs mb-4 animate-fade-in">
              <p className="font-display font-extrabold text-rose-love uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span>⚠️</span> Startup is taking longer than expected
              </p>
              <ul className="list-disc pl-4 space-y-1.5 text-[11px] text-rose-subtle font-medium">
                <li>
                  The backend is initialising — database migrations may still be running. Please wait a moment.
                </li>
                <li>
                  Try <strong>quitting and reopening</strong> TalentStream if this persists.
                </li>
                <li>
                  Ensure port <code className="bg-rose-surface border border-rose-border px-1 py-0.2 rounded font-mono text-[10px]">8000</code> is not used by another application.
                </li>
              </ul>
            </div>
          )}

          {/* Manual check trigger / Status Indicator */}
          <button
            onClick={() => {
              setProgress(0);
              fetch(`${API_BASE_URL}/health/`)
                .then((r) => r.json())
                .then((d) => {
                  if (d.status === "ok") {
                    setProgress(100);
                    setTimeout(() => setIsReady(true), 400);
                  }
                })
                .catch(() => {
                  setProgress(20);
                });
            }}
            className="w-full h-10 border-2 border-rose-border bg-rose-surface hover:bg-rose-hl-low font-display font-bold text-xs uppercase tracking-widest text-rose-text shadow-[3px_3px_0px_0px_var(--color-shadow)] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    </div>
  );
}
