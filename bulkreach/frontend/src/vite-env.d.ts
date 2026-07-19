/// <reference types="vite/client" />

interface Window {
  electronAPI?: {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
    isMaximized: () => Promise<boolean>;
    openDevTools: () => Promise<void>;
    openExternal: (url: string) => Promise<void>;
    onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
  };
}

