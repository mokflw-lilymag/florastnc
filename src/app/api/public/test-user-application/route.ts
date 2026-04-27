import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/utils/supabase/admin";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Body = {
  fullName?: string;
  businessName?: string;
  contact?: string;
  email?: string;
  applyReason?: string;
  featureNotes?: string;
  /** honeypot — must be empty */
  website?: string;
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

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
    return NextResponse.json({ error: "필수 항목을 모두 입력해 주세요." }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "이메일 형식을 확인해 주세요." }, { status: 400 });
  }
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { ok: false, code: "NO_DB", message: "서버 저장 설정이 되어 있지 않습니다." },
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
    return NextResponse.json(
      { error: "저장 중 오류가 발생했습니다. 잠시 후 다시 시도하거나 이메일로 문의해 주세요." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
