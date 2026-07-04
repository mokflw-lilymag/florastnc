import { NextResponse } from "next/server";
import { requireAuthenticated } from "@/lib/auth-api-guards";
import { createAdminClient } from "@/utils/supabase/admin";
import { SUPPORT_TICKET_CATEGORIES } from "@/lib/support-tickets/categories";

export async function GET(req: Request) {
  const gate = await requireAuthenticated(req);
  if (!gate.ok) return gate.response;

  const sp = new URL(req.url).searchParams;
  const category = sp.get("category");
  const q = sp.get("q")?.trim().toLowerCase();

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ faqs: [], categories: SUPPORT_TICKET_CATEGORIES });
  }

  let query = admin
    .from("support_faq")
    .select("*")
    .eq("is_active", true)
    .order("category_order")
    .order("question_order");

  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) {
    console.error("[support/faq GET]", error);
    return NextResponse.json({ faqs: [], categories: SUPPORT_TICKET_CATEGORIES });
  }

  let faqs = data ?? [];
  if (q) {
    faqs = faqs.filter(
      (f) =>
        (f.question as string).toLowerCase().includes(q) ||
        (f.answer as string).toLowerCase().includes(q),
    );
  }

  return NextResponse.json({ faqs, categories: SUPPORT_TICKET_CATEGORIES });
}
