import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { store } from "./store";
import { ThemeProvider } from "@/context/ThemeContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Provider store={store}>
      <ThemeProvider>
        <App />
        <Toaster
          position="bottom-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: "var(--color-surface)",
              color: "var(--color-text)",
              border: "2px solid var(--color-text)",
              borderRadius: "0px",
              fontSize: "13px",
              fontWeight: 800,
              boxShadow: "3px 3px 0px 0px var(--color-text)",
            },
            success: { iconTheme: { primary: "var(--color-foam)", secondary: "var(--color-surface)" } },
            error: { iconTheme: { primary: "var(--color-love)", secondary: "var(--color-surface)" } },
          }}
        />
      </ThemeProvider>
    </Provider>
  </React.StrictMode>
);
