import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    host: "0.0.0.0",
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"],
    },
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    // Split vendor libraries into separate cached chunks.
    // Users won't re-download unchanged vendor code on app updates.
    rollupOptions: {
      output: {
        manualChunks: {
          // Core React runtime — changes rarely
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          // State management
          "vendor-store": ["@reduxjs/toolkit", "react-redux"],
          // Animation & icons — large libraries, split so app code doesn't bust their cache
          "vendor-ui": ["framer-motion", "lucide-react"],
          // Recharts is heavy (~400 KB minified); isolate it
          "vendor-charts": ["recharts"],
          // Rich text editor — only loaded on /templates routes
          "vendor-editor": [
            "@tiptap/react",
            "@tiptap/starter-kit",
            "@tiptap/extension-placeholder",
            "@tiptap/extension-underline",
            "@tiptap/extension-link",
          ],
          // Spreadsheet/CSV parsing — only needed on campaign upload flows
          "vendor-spreadsheet": ["xlsx", "papaparse"],
        },
      },
    },
    // Warn if any single chunk exceeds 600 KB (default is 500 KB)
    chunkSizeWarningLimit: 600,
  },
});
