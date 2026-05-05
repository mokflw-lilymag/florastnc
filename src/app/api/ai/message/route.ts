import { NextResponse } from "next/server";
import {
  errApiAiMessageEngineFallback,
  msgApiAiCardTagline,
  msgApiAiWarmFallback,
} from "@/lib/admin/admin-api-errors";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const bl = await hqApiUiBase(request, typeof body?.uiLocale === "string" ? body.uiLocale : undefined);
    const theme = typeof body.theme === "string" && body.theme.trim() ? body.theme.trim() : "modern";

    return NextResponse.json({
      message: msgApiAiCardTagline(bl, theme),
      status: "success",
    });
  } catch (error: unknown) {
    console.error("AI Message API error:", error);
    const bl = await hqApiUiBase(request);
    return NextResponse.json({
      message: msgApiAiWarmFallback(bl),
      error: errApiAiMessageEngineFallback(bl),
    });
  }
}
