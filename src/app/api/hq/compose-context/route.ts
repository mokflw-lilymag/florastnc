import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * 본사 게시판 작성 다이얼로그용: 조직 목록 + 작성 권한 (가벼운 응답)
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profileRow } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  const isSuper = profileRow?.role === "super_admin";

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id, role")
    .eq("user_id", user.id);

  const orgIds = [...new Set((memberships ?? []).map((m) => m.organization_id))];
  const canManageAnnouncements =
    isSuper || (memberships ?? []).some((m) => m.role === "org_admin");

  if (isSuper) {
    const { data: allOrgs, error } = await supabase
      .from("organizations")
      .select("id,name")
      .order("name");
    if (error) {
      console.error("[hq/compose-context]", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({
      organizations: allOrgs ?? [],
      canManageAnnouncements: true,
    });
  }

  if (orgIds.length === 0) {
    return NextResponse.json({ organizations: [], canManageAnnouncements: false });
  }

  const { data: orgs, error } = await supabase
    .from("organizations")
    .select("id,name")
    .in("id", orgIds)
    .order("name");

  if (error) {
    console.error("[hq/compose-context]", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    organizations: orgs ?? [],
    canManageAnnouncements,
  });
}
