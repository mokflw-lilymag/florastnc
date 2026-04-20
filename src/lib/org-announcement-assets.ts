const PATH_MARKER = "/object/public/org_announcements/";

export function isAllowedOrgAnnouncementAssetUrl(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  try {
    const u = new URL(url);
    const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (base && url.startsWith(base)) {
      return u.pathname.includes("/org_announcements/");
    }
    return u.pathname.includes("/org_announcements/");
  } catch {
    return url.includes("org_announcements");
  }
}

/** Storage `name` (bucket 내 경로) — 삭제용 */
export function publicUrlToOrgAnnouncementStoragePath(publicUrl: string): string | null {
  const i = publicUrl.indexOf(PATH_MARKER);
  if (i === -1) return null;
  try {
    return decodeURIComponent(publicUrl.slice(i + PATH_MARKER.length).split("?")[0] ?? "");
  } catch {
    return null;
  }
}

export function normalizeAttachmentUrlList(raw: unknown, max = 8): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (!t || !isAllowedOrgAnnouncementAssetUrl(t)) continue;
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}
