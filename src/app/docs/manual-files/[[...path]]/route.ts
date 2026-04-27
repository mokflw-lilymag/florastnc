import { readFile, stat } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ROOT = path.join(process.cwd(), "docs", "manual-screenshots");

function contentType(file: string): string {
  const ext = path.extname(file).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  if (ext === ".gif") return "image/gif";
  if (ext === ".svg") return "image/svg+xml";
  if (ext === ".md") return "text/markdown; charset=utf-8";
  return "application/octet-stream";
}

/** Public files under docs/manual-screenshots (for the HTML manual). */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ path?: string[] }> },
) {
  const { path: segments } = await context.params;
  const rel = (segments ?? []).join("/");
  if (!rel || rel.includes("..")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const abs = path.normalize(path.join(ROOT, rel));
  const relToRoot = path.relative(ROOT, abs);
  if (relToRoot.startsWith("..") || path.isAbsolute(relToRoot)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const s = await stat(abs);
    if (!s.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }
    const body = await readFile(abs);
    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType(abs),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
