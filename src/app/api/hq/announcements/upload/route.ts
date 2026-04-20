import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

const MAX_BYTES = 10 * 1024 * 1024;

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const organizationId = form?.get("organizationId") as string | null;
  const file = form?.get("file") as File | null;
  if (!organizationId?.trim() || !file?.size) {
    return NextResponse.json({ error: "organizationId, file 필요" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "파일은 10MB 이하만 업로드할 수 있습니다." }, { status: 400 });
  }

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const isSuper = profile?.role === "super_admin";

  if (!isSuper) {
    const { data: mem } = await supabase
      .from("organization_members")
      .select("role")
      .eq("user_id", user.id)
      .eq("organization_id", organizationId.trim())
      .maybeSingle();
    if (!mem || mem.role !== "org_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
  }

  const path = `${organizationId.trim()}/${crypto.randomUUID()}.jpg`;
  const buf = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage.from("org_announcements").upload(path, buf, {
    contentType: "image/jpeg",
    upsert: false,
  });

  if (error) {
    console.error("[hq/announcements/upload]", error);
    const msg = String(error.message ?? "업로드 실패");
    const hint =
      /bucket not found|not found/i.test(msg) || msg.includes("404")
        ? " Supabase SQL 편집기에서 supabase/storage_buckets.sql 을 실행해 org_announcements 버킷·정책을 적용하세요."
        : /row-level security|rls|policy/i.test(msg)
          ? " storage_buckets.sql 의 storage_org_announcements_hq_upload 정책이 적용됐는지 확인하세요."
          : "";
    return NextResponse.json({ error: msg + hint }, { status: 500 });
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("org_announcements").getPublicUrl(path);

  return NextResponse.json({ url: publicUrl });
}
