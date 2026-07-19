/**
 * Securely opens a URL.
 * If running inside Electron desktop shell, opens the link in the user's default system browser.
 * If running in a web browser, falls back to standard window location redirection.
 */
export async function openExternalLink(url: string) {
  console.log("openExternalLink called with URL:", url);
  if (typeof window !== "undefined" && window.electronAPI) {
    try {
      console.log("Electron context detected. Calling openExternal()...");
      await window.electronAPI.openExternal(url);
      console.log("Electron openExternal completed successfully.");
    } catch (e) {
      console.error("Electron shell API failed:", e);
      console.log("Falling back to window.location.href redirect...");
      window.location.href = url;
    }
  } else {
    console.log("Web browser context detected. Redirecting...");
    window.location.href = url;
  }
}
