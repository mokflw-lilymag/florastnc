/** FloXync Windows desktop app (Electron) — GitHub Releases */
export const WINDOWS_APP_GITHUB_REPO = "mokflw-lilymag/floxync-releases";

export const WINDOWS_APP_DOWNLOAD_PATH = "/api/downloads/windows-app";

export const WINDOWS_APP_GITHUB_LATEST_URL =
  "https://github.com/mokflw-lilymag/floxync-releases/releases/latest";

export function pickWindowsInstallerAsset(
  assets: { name: string; browser_download_url: string }[],
): { name: string; browser_download_url: string } | null {
  const exes = assets.filter((a) => /\.exe$/i.test(a.name));
  if (!exes.length) return null;
  return (
    exes.find((a) => /setup/i.test(a.name) && /floxync/i.test(a.name)) ||
    exes.find((a) => /floxync/i.test(a.name)) ||
    exes.find((a) => /setup/i.test(a.name)) ||
    exes[0]
  );
}
