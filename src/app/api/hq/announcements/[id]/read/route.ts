import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

function isMissingReadsTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  const code = String(error.code ?? "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    msg.includes("does not exist") ||
    msg.includes("organization_announcement_reads") ||
    msg.includes("relation")
  );
}

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const { id: announcementId } = await context.params;
  if (!announcementId) {
    return NextResponse.json({ error: "announcement id 필요" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id, full_name")
    .eq("id", user.id)
    .maybeSingle();

  const tenantId = profile?.tenant_id as string | null | undefined;
  if (!tenantId) {
    return NextResponse.json(
      { error: "지점(매장) 계정에서만 공지를 확인할 수 있습니다." },
      { status: 403 }
    );
  }

  const { data: tenant } = await supabase
    .from("tenants")
    .select("id, name, organization_id")
    .eq("id", tenantId)
    .maybeSingle();

  if (!tenant?.organization_id) {
    return NextResponse.json(
      {
        error:
          "이 매장(tenants)에 organization_id가 없습니다. Supabase에서 해당 지점을 본사 조직에 연결한 뒤 다시 시도해 주세요.",
      },
      { status: 403 }
    );
  }

  const { data: ann } = await supabase
    .from("organization_announcements")
    .select("id, organization_id, expires_at")
    .eq("id", announcementId)
    .maybeSingle();

  if (!ann) {
    return NextResponse.json({ error: "공지를 찾을 수 없습니다." }, { status: 404 });
  }

  if (ann.organization_id !== tenant.organization_id) {
    return NextResponse.json(
      {
        error:
          "이 공지의 조직과 로그인한 매장의 조직이 다릅니다. 본사에서 공지 등록 시 조직을 확인하거나, 지점 tenants.organization_id 연결을 맞춰 주세요.",
      },
      { status: 403 }
    );
  }

  const exp = ann.expires_at ? new Date(ann.expires_at as string) : null;
  if (exp && exp.getTime() <= Date.now()) {
    return NextResponse.json({ error: "만료된 공지입니다." }, { status: 410 });
  }

  const row = {
    announcement_id: announcementId,
    user_id: user.id,
    tenant_id: tenantId,
    user_full_name: profile?.full_name ?? null,
    tenant_name: tenant.name ?? null,
  };

  const { error: insErr } = await supabase.from("organization_announcement_reads").insert(row);

  if (insErr?.code === "23505") {
    const { error: upErr } = await supabase
      .from("organization_announcement_reads")
      .update({
        read_at: new Date().toISOString(),
        user_full_name: profile?.full_name ?? null,
        tenant_name: tenant.name ?? null,
      })
      .eq("announcement_id", announcementId)
      .eq("user_id", user.id);
    if (upErr) {
      if (isMissingReadsTable(upErr)) {
        return NextResponse.json(
          {
            error:
              "확인 기록 테이블이 없습니다. Supabase에서 organization_announcement_reads_schema.sql 을 실행하세요.",
          },
          { status: 503 }
        );
      }
      console.error("[hq/announcements read POST update]", upErr);
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (insErr) {
    if (isMissingReadsTable(insErr)) {
      return NextResponse.json(
        {
          error:
            "확인 기록 테이블이 없습니다. Supabase에서 organization_announcement_reads_schema.sql 을 실행하세요.",
        },
        { status: 503 }
      );
    }
    console.error("[hq/announcements read POST]", insErr);
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
