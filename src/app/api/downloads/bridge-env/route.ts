import { NextResponse } from "next/server";
import { bundledSupabaseEnvLines } from "@/lib/downloads/bridge-env-template";

/** PP 브릿지 ZIP 풀기 전 같은 폴더에 저장 → install.bat 실행 시 매장 자동 페어링 */
export async function GET(request: Request) {
  const tenantId = new URL(request.url).searchParams.get("tenantId")?.trim() || "";
  const lines = bundledSupabaseEnvLines(tenantId);
  const body = lines.join("\n") + "\n";

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": 'attachment; filename="floxync-bridge.env"',
    },
  });
}
