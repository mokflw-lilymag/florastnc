import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Android/WebView loads the deployed Next.js app when CAP_SERVER_URL is set at sync time.
 * Example (PowerShell): `$env:CAP_SERVER_URL="https://your-domain.com"; npx cap sync android`
 * See [docs/android_app_addition_plan.md](docs/android_app_addition_plan.md).
 */
const serverUrl = process.env.CAP_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.floxync.partner",
  appName: "Floxync",
  webDir: "capacitor-assets",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          androidScheme: "https",
        },
      }
    : {}),
};

export default config;
