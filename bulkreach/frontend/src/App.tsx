import { useEffect } from "react";
import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./router";
import { BackendInitializer } from "@/components/layout/BackendInitializer";
import { Titlebar } from "@/components/layout/Titlebar";

function App() {
  useEffect(() => {
    const hasElectron = typeof window !== "undefined" && !!window.electronAPI;
    if (!hasElectron) return;

    // Listen for debug keyboard shortcuts (F12, Cmd+Option+I, Ctrl+Shift+I)
    const handleKeyDown = (e: KeyboardEvent) => {
      const isF12 = e.key === "F12";
      const isInspectKey =
        (e.metaKey && e.altKey && (e.key === "i" || e.key === "I")) || // Cmd+Opt+I (macOS)
        (e.ctrlKey && e.shiftKey && (e.key === "i" || e.key === "I")); // Ctrl+Shift+I (Windows/Linux)

      if (isF12 || isInspectKey) {
        e.preventDefault();
        window.electronAPI?.openDevTools().catch((err) => {
          console.error("Failed to open devtools via command:", err);
        });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <BackendInitializer>
      <div className="h-screen flex flex-col overflow-hidden bg-rose-base">
        <Titlebar />
        <div className="flex-1 flex flex-col overflow-hidden min-h-0">
          <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppRouter />
          </BrowserRouter>
        </div>
      </div>
    </BackendInitializer>
  );
}

export default App;

