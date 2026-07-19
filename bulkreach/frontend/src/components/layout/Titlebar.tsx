import { useState, useEffect } from "react";
import { X, Minus, Square, Copy } from "lucide-react";

export function Titlebar() {
  const [isElectron, setIsElectron] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.electronAPI) {
      setIsElectron(false);
      return;
    }

    setIsElectron(true);

    // Fetch initial maximized state
    window.electronAPI.isMaximized().then(setIsMaximized).catch(console.error);

    // Setup listener for maximize change events
    const unsubscribe = window.electronAPI.onMaximizeChange(setIsMaximized);

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Gracefully render nothing in standard web browsers
  if (!isElectron) return null;

  const handleMinimize = async () => {
    try {
      await window.electronAPI?.minimize();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMaximize = async () => {
    try {
      await window.electronAPI?.maximize();
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogoDoubleClick = () => {
    window.electronAPI?.openDevTools().catch((err) =>
      console.error("Failed to open devtools on double click:", err)
    );
  };

  const handleClose = async () => {
    try {
      await window.electronAPI?.close();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div
      className="h-8 flex items-center justify-between bg-rose-surface border-b-2 border-rose-border select-none z-50 relative flex-shrink-0 drag-region"
    >
      {/* Left side: Brand Logo and Text (Double-click to open DevTools) */}
      <div
        onDoubleClick={handleLogoDoubleClick}
        className="flex items-center gap-2 pl-3 cursor-pointer no-drag"
        title="Double-click to open developer tools"
      >
        <svg className="w-3.5 h-3.5 text-rose-pine" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-display font-black text-rose-text text-[10px] uppercase tracking-wider">
          BulkReach
        </span>
      </div>


      {/* Center draggable spacer */}
      <div className="flex-1 h-full cursor-default" />

      {/* Right side: Native-looking Minimize/Maximize/Close buttons */}
      <div className="flex items-center h-full no-drag">
        <button
          onClick={handleMinimize}
          className="w-10 h-full flex items-center justify-center hover:bg-rose-hl-low text-rose-text transition-colors"
          title="Minimize"
        >
          <Minus size={11} className="stroke-[2.5]" />
        </button>
        <button
          onClick={handleMaximize}
          className="w-10 h-full flex items-center justify-center hover:bg-rose-hl-low text-rose-text transition-colors"
          title={isMaximized ? "Restore" : "Maximize"}
        >
          {isMaximized ? (
            <Copy size={9} className="stroke-[2.5]" />
          ) : (
            <Square size={9} className="stroke-[2.5]" />
          )}
        </button>
        <button
          onClick={handleClose}
          className="w-10 h-full flex items-center justify-center hover:bg-red-500 hover:text-white text-rose-text transition-colors"
          title="Close"
        >
          <X size={11} className="stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
