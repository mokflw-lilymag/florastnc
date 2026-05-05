import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errAnnAnnouncementIdRequired,
  errAnnCommentBodyRequired,
  errAnnCommentTooLong,
  errAnnCommentsTableMissing,
  errAnnPostNotFound,
} from "@/lib/hq/hq-announcements-api-errors";
import { errAdminOperationFailed } from "@/lib/admin/admin-api-errors";

function isMissingCommentsTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const msg = String(error.message ?? "").toLowerCase();
  const code = String(error.code ?? "");
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    (msg.includes("organization_announcement_comments") && (msg.includes("does not exist") || msg.includes("relation")))
  );
}

export async function GET(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: announcementId } = await context.params;
  const bl = await hqApiUiBase(req, new URL(req.url).searchParams.get("uiLocale"));
  if (!announcementId) {
    return NextResponse.json({ error: errAnnAnnouncementIdRequired(bl) }, { status: 400 });
  }

  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { supabase } = gate;

  const { data: ann } = await supabase
    .from("organization_announcements")
    .select("id")
    .eq("id", announcementId)
    .maybeSingle();
  if (!ann) {
    return NextResponse.json({ error: errAnnPostNotFound(bl) }, { status: 404 });
  }

  const { data: rows, error } = await supabase
    .from("organization_announcement_comments")
    .select("id, body, created_at, created_by")
    .eq("announcement_id", announcementId)
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingCommentsTable(error)) {
      return NextResponse.json({ error: errAnnCommentsTableMissing(bl), comments: [] }, { status: 503 });
    }
    console.error("[hq/announcements comments GET]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  const authorIds = [...new Set((rows ?? []).map((r) => r.created_by).filter(Boolean))] as string[];
  const nameById: Record<string, string | null> = {};
  if (authorIds.length > 0) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", authorIds);
    for (const p of profs ?? []) {
      nameById[p.id as string] = (p.full_name as string) ?? null;
    }
  }

  const comments = (rows ?? []).map((r) => ({
    id: r.id,
    body: r.body,
    created_at: r.created_at,
    created_by: r.created_by,
    author_name: nameById[r.created_by as string] ?? null,
  }));

  return NextResponse.json({ comments });
}

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const { id: announcementId } = await context.params;
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;
  const { supabase, userId } = gate;

  const json = await req.json().catch(() => null);
  const bl = await hqApiUiBase(req, json?.uiLocale as string | undefined);
  if (!announcementId) {
    return NextResponse.json({ error: errAnnAnnouncementIdRequired(bl) }, { status: 400 });
  }

  const body = String(json?.body ?? "").trim();
  if (!body) {
    return NextResponse.json({ error: errAnnCommentBodyRequired(bl) }, { status: 400 });
  }
  if (body.length > 8000) {
    return NextResponse.json({ error: errAnnCommentTooLong(bl) }, { status: 400 });
  }

  const { data: ann } = await supabase
    .from("organization_announcements")
    .select("id")
    .eq("id", announcementId)
    .maybeSingle();
  if (!ann) {
    return NextResponse.json({ error: errAnnPostNotFound(bl) }, { status: 404 });
  }

  const { data: inserted, error } = await supabase
    .from("organization_announcement_comments")
    .insert({
      announcement_id: announcementId,
      body,
      created_by: userId,
    })
    .select("id, body, created_at, created_by")
    .single();

  if (error) {
    if (isMissingCommentsTable(error)) {
      return NextResponse.json({ error: errAnnCommentsTableMissing(bl) }, { status: 503 });
    }
    console.error("[hq/announcements comments POST]", error);
    return NextResponse.json({ error: errAdminOperationFailed(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true, comment: inserted });
}
