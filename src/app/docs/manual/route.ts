import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * Serves docs/floxync-manual.html at /docs/manual (no login).
 * Rewrites manual-screenshots/* to /docs/manual-files/* so images load from the app origin.
 */
export async function GET(request: NextRequest) {
  try {
    const filePath = path.join(process.cwd(), "docs", "floxync-manual.html");
    let html = await readFile(filePath, "utf-8");
    const origin = request.nextUrl.origin;
    const prefix = `${origin}/docs/manual-files/manual-screenshots/`;
    html = html.replace(/src="manual-screenshots\//g, `src="${prefix}`);
    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=3600",
      },
    });
  } catch {
    return new NextResponse("Manual not found.", { status: 404 });
  }
}
