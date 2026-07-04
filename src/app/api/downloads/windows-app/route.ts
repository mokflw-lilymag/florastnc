import { NextResponse } from "next/server";
import {
  WINDOWS_APP_GITHUB_REPO,
  pickWindowsInstallerAsset,
} from "@/lib/downloads/windows-app";

export const runtime = "nodejs";
export const revalidate = 0;

type GhRelease = {
  tag_name?: string;
  assets?: { name: string; browser_download_url: string }[];
};

export async function GET() {
  const [owner, repo] = WINDOWS_APP_GITHUB_REPO.split("/");
  if (!owner || !repo) {
    return NextResponse.json({ error: "Invalid release repo config" }, { status: 500 });
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Floxync-Windows-Download",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/releases/latest`,
      { headers, cache: "no-store" },
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Windows 설치 파일을 찾을 수 없습니다. GitHub Releases를 확인해 주세요." },
        { status: 502 },
      );
    }

    const release = (await res.json()) as GhRelease;
    const asset = pickWindowsInstallerAsset(release.assets ?? []);
    if (!asset?.browser_download_url) {
      return NextResponse.json(
        { error: "최신 릴리스에 Windows 설치 파일(.exe)이 없습니다." },
        { status: 404 },
      );
    }

    return NextResponse.redirect(asset.browser_download_url, 302);
  } catch (err) {
    console.error("[windows-app-download]", err);
    return NextResponse.json(
      { error: "다운로드 주소를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
