import { NextResponse } from "next/server";
import { requireEmailHubAdmin } from "@/lib/admin/email-hub/guard";
import { getPlatformEmailTemplate } from "@/lib/admin/email-hub/template-store";
import { sendPlatformEmail } from "@/lib/admin/email-hub/send-platform-email";
import { resolveSmtpForHq } from "@/lib/email/smtp-server";

type Recipient = {
  email: string;
  name?: string;
  variables?: Record<string, string>;
  tenantId?: string;
};

export async function POST(req: Request) {
  const auth = await requireEmailHubAdmin(req);
  if (!auth.ok) return auth.response;

  let body: {
    templateSlug?: string;
    subjectOverride?: string;
    bodyOverride?: string;
    recipients?: Recipient[];
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "INVALID_JSON" }, { status: 400 });
  }

  const templateSlug = (body.templateSlug || "").trim();
  const recipients = body.recipients ?? [];

  if (!templateSlug || recipients.length === 0) {
    return NextResponse.json({ error: "TEMPLATE_AND_RECIPIENTS_REQUIRED" }, { status: 400 });
  }

  if (recipients.length > 50) {
    return NextResponse.json({ error: "MAX_50_RECIPIENTS" }, { status: 400 });
  }

  const template = await getPlatformEmailTemplate(auth.admin, templateSlug);
  if (!template) {
    return NextResponse.json({ error: "TEMPLATE_NOT_FOUND" }, { status: 404 });
  }

  // Marketing consent check
  const isMarketing = template.category === "marketing";
  let optedOutEmails = new Set<string>();

  if (isMarketing) {
    const authUsersRes = await auth.admin.auth.admin.listUsers();
    if (authUsersRes.data?.users) {
      for (const u of authUsersRes.data.users) {
        if (u.user_metadata?.marketing_agreed === false) {
          optedOutEmails.add(u.email ?? "");
        }
      }
    }
  }

  const smtp = await resolveSmtpForHq(auth.admin);
  const results: { email: string; status: string; error?: string }[] = [];

  for (const r of recipients) {
    const email = r.email.trim();
    if (!email) continue;

    if (isMarketing && optedOutEmails.has(email)) {
      results.push({ email, status: "skipped_marketing_opt_out" });
      continue;
    }

    const vars: Record<string, string> = {
      이름: r.name || r.variables?.이름 || "사장님",
      상호: r.variables?.상호 || "",
      연락처: r.variables?.연락처 || "",
      이메일: email,
      ...Object.fromEntries(
        Object.entries(r.variables ?? {}).map(([k, v]) => [k, String(v)]),
      ),
    };

    const result = await sendPlatformEmail(auth.admin, {
      templateSlug,
      to: email,
      recipientName: r.name ?? vars.이름,
      variables: vars,
      subjectOverride: body.subjectOverride,
      bodyOverride: body.bodyOverride,
      sentBy: auth.userId,
      tenantId: r.tenantId,
    });

    results.push({
      email,
      status: result.status,
      ...(result.error ? { error: result.error } : {}),
    });
  }

  const sent = results.filter((x) => x.status === "sent").length;
  const simulated = results.filter((x) => x.status === "simulated").length;
  const failed = results.filter((x) => x.status === "failed").length;

  return NextResponse.json({
    ok: failed === 0,
    summary: { sent, simulated, failed, total: results.length },
    results,
    smtpConfigured: !!smtp,
  });
}
