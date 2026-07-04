import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

function readBridgeVersion(): string {
  try {
    const content = fs.readFileSync(
      path.join(process.cwd(), "bridge-app", "index.js"),
      "utf8",
    );
    const match = content.match(/const BRIDGE_VERSION\s*=\s*['"]([^'"]+)['"]/);
    return match?.[1] ?? "latest";
  } catch {
    return "latest";
  }
}

/** 웹에서 PP 브릿지 ZIP — Vercel에서 60MB 실시간 압축 대신 정적 파일 제공 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const version = readBridgeVersion();

  const staticZip = path.join(process.cwd(), "public", "downloads", "Floxync-Bridge-Setup.zip");
  if (fs.existsSync(staticZip)) {
    const redirect = new URL(`/downloads/Floxync-Bridge-Setup.zip`, url.origin);
    redirect.searchParams.set("v", version);
    return NextResponse.redirect(redirect.toString(), 302);
  }

  const bridgeExe = path.join(process.cwd(), "bridge-app", "ppbridge.exe");
  if (!fs.existsSync(bridgeExe)) {
    return NextResponse.json(
      { error: "PP Bridge 설치 파일이 서버에 없습니다. 관리자에게 문의해 주세요." },
      { status: 404 },
    );
  }

  return NextResponse.json(
    {
      error:
        "브릿지 ZIP이 아직 준비되지 않았습니다. npm run build:bridge 를 실행한 뒤 다시 배포해 주세요.",
    },
    { status: 503 },
  );
}
