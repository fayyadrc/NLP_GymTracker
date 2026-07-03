/** Public app URL for OAuth redirects and API links (local vs production). */
export const appUrl = (import.meta.env.VITE_PUBLIC_APP_URL || "").replace(/\/$/, "");
