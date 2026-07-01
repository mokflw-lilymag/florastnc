import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/** Electron 등 클라이언트 로그인 후 HTTP-only 세션 쿠키를 서버에 맞춤 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      access_token?: string;
      refresh_token?: string;
    };

    if (!body.access_token || !body.refresh_token) {
      return NextResponse.json({ ok: false, message: "missing_tokens" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.auth.setSession({
      access_token: body.access_token,
      refresh_token: body.refresh_token,
    });

    if (error) {
      return NextResponse.json({ ok: false, message: error.message }, { status: 401 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ ok: false, message: "session_not_persisted" }, { status: 401 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
