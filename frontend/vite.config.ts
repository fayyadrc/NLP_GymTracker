import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

function parseEnvFile(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) return {};

  const values: Record<string, string> = {};
  for (const line of fs.readFileSync(filePath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

function resolveSupabaseEnv() {
  const frontendEnv = parseEnvFile(path.resolve(__dirname, ".env"));
  const frontendLocalEnv = parseEnvFile(path.resolve(__dirname, ".env.local"));
  const backendEnv = parseEnvFile(path.resolve(__dirname, "../backend/.env"));
  const rootLocalEnv = parseEnvFile(path.resolve(__dirname, "../.env.local"));

  return {
    supabaseUrl:
      process.env.VITE_SUPABASE_URL ??
      frontendLocalEnv.VITE_SUPABASE_URL ??
      frontendEnv.VITE_SUPABASE_URL ??
      backendEnv.SUPABASE_URL ??
      "",
    supabaseAnonKey:
      process.env.VITE_SUPABASE_ANON_KEY ??
      frontendLocalEnv.VITE_SUPABASE_ANON_KEY ??
      frontendEnv.VITE_SUPABASE_ANON_KEY ??
      backendEnv.SUPABASE_ANON_KEY ??
      "",
    publicAppUrl:
      process.env.VITE_PUBLIC_APP_URL ??
      frontendLocalEnv.VITE_PUBLIC_APP_URL ??
      frontendEnv.VITE_PUBLIC_APP_URL ??
      rootLocalEnv.PUBLIC_APP_URL ??
      backendEnv.PUBLIC_APP_URL ??
      "",
  };
}

const { supabaseUrl, supabaseAnonKey, publicAppUrl } = resolveSupabaseEnv();

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png", "maskable-icon.png"],
      manifest: {
        name: "RepCount Gym Tracker",
        short_name: "RepCount",
        description: "Workout tracker that converts natural language input into structured data.",
        theme_color: "#6366f1",
        icons: [
          {
            src: "icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "maskable-icon.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify(supabaseUrl),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify(supabaseAnonKey),
    "import.meta.env.VITE_PUBLIC_APP_URL": JSON.stringify(publicAppUrl),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8002",
        changeOrigin: true,
      },
    },
  },
});
