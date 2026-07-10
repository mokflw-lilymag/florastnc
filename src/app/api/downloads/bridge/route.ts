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

export async function GET(request: Request) {
  const url = new URL(request.url);
  const version = readBridgeVersion();

  const staticExe = path.join(process.cwd(), "public", "downloads", "Floxync-Bridge-Setup.exe");
  if (fs.existsSync(staticExe)) {
    const redirect = new URL(`/downloads/Floxync-Bridge-Setup.exe`, url.origin);
    redirect.searchParams.set("v", version);
    redirect.searchParams.set("t", Date.now().toString());
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
        "브릿지 설치 파일이 아직 준비되지 않았습니다. build_standalone.ps1 을 실행한 뒤 다시 배포해 주세요.",
    },
    { status: 503 },
  );
}
