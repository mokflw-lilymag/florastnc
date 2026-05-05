import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { hqApiUiBase } from "@/lib/hq/hq-api-locale";
import {
  errTestApplyBadJson,
  errTestApplyEmail,
  errTestApplyRequired,
  errTestApplySave,
  msgTestApplyNoDb,
} from "@/lib/public/test-user-application-errors";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  fullName?: string;
  businessName?: string;
  contact?: string;
  email?: string;
  applyReason?: string;
  featureNotes?: string;
  uiLocale?: string;
  /** honeypot — must be empty */
  website?: string;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    const bl = await hqApiUiBase(request);
    return NextResponse.json({ error: errTestApplyBadJson(bl) }, { status: 400 });
  }

  const bl = await hqApiUiBase(request, body.uiLocale);

  if (body.website) {
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  const fullName = (body.fullName || "").trim();
  const businessName = (body.businessName || "").trim();
  const contact = (body.contact || "").trim();
  const email = (body.email || "").trim();
  const applyReason = (body.applyReason || "").trim().slice(0, 4000);
  const featureNotes = (body.featureNotes || "").trim().slice(0, 4000) || null;

  if (!fullName || !businessName || !contact || !email || !applyReason) {
    return NextResponse.json({ error: errTestApplyRequired(bl) }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: errTestApplyEmail(bl) }, { status: 400 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, code: "NO_DB", message: msgTestApplyNoDb(bl) },
      { status: 503 },
    );
  }

  const { error } = await admin.from("test_user_applications").insert({
    full_name: fullName,
    business_name: businessName,
    contact,
    email,
    participation_use: false,
    participation_questions: false,
    participation_feedback: false,
    participation_features: false,
    apply_reason: applyReason,
    feature_notes: featureNotes,
    source: "landing",
  });

  if (error) {
    console.error("[test-user-application]", error);
    return NextResponse.json({ error: errTestApplySave(bl) }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
